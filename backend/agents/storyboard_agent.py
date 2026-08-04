import asyncio
import json
import urllib.parse
from typing import Any, Optional

import httpx

from backend.agents.base_agent import BaseAgent
from backend.models.schemas import ProjectInput, StoryboardOutput


class StoryboardAgent(BaseAgent):
    """
    Storyboard Agent: Converts the script into visual scenes.
    Also pre-warms Pollinations AI image cache for all scenes
    in parallel so the frontend can display images instantly.
    """

    def __init__(self, llm) -> None:
        super().__init__(llm, agent_name="storyboard")

    def _build_image_url(self, prompt: str, scene_number: int) -> str:
        """Build a deterministic Pollinations URL for a given prompt."""
        sanitized = (
            prompt.replace("\n", " ")
            .replace("\r", " ")
            .replace('"', "")
            .replace("'", "")
            .strip()
        )
        # Keep only safe characters
        sanitized = "".join(c for c in sanitized if c.isalnum() or c in " .,?-_")
        encoded = urllib.parse.quote(sanitized[:450])
        seed = scene_number * 1337
        return (
            f"https://image.pollinations.ai/prompt/{encoded}"
            f"?width=480&height=270&nologo=true&model=turbo&seed={seed}"
        )

    async def _warm_image(self, client: httpx.AsyncClient, url: str) -> str:
        """
        Hit the URL so Pollinations generates & caches the image.
        Returns the same URL (which will now be cached).
        Uses a 20-second timeout — Pollinations can be slow on first gen.
        """
        try:
            # Just a HEAD request is enough to trigger generation on Pollinations
            resp = await client.get(url, timeout=25.0, follow_redirects=True)
            if resp.status_code == 200:
                return url
        except Exception as e:
            self._logger.warning("Image pre-warm failed for scene (will fall back to client-side): %s", e)
        return url  # Return URL anyway — client will retry on its own

    async def execute(
        self,
        project_input: ProjectInput,
        context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:

        self._logger.info("Starting Storyboard Agent")
        system_prompt = self._load_prompt("storyboard_prompt.txt")

        context_block = self._build_context_block(context)

        user_prompt = (
            f"Topic: {project_input.topic}\n"
            f"Platform: {project_input.platform}\n"
            f"Tone: {project_input.tone}\n\n"
            f"Create a storyboard for this video based on the provided script context.\n"
            f"{context_block}"
        )

        response = await self.llm.generate(prompt=user_prompt, system_prompt=system_prompt)

        try:
            parsed = self._parse_json_response(response)
            validated = StoryboardOutput(**parsed)
            self._logger.info("Storyboard LLM step completed. Pre-warming %d images...", len(validated.scenes))

            # ── Pre-warm all images in parallel ──────────────────────────────
            # Build URLs for every scene
            for scene in validated.scenes:
                prompt = scene.image_prompt or scene.visual_description
                scene.image_url = self._build_image_url(prompt, scene.scene_number)

            # Fire all HTTP requests concurrently (no queue needed on backend)
            async with httpx.AsyncClient() as client:
                tasks = [
                    self._warm_image(client, scene.image_url)
                    for scene in validated.scenes
                ]
                warmed_urls = await asyncio.gather(*tasks, return_exceptions=True)

            # Store warmed URLs back into scenes
            for scene, url in zip(validated.scenes, warmed_urls):
                if isinstance(url, str):
                    scene.image_url = url

            self._logger.info("Image pre-warming complete for %d scenes.", len(validated.scenes))
            return validated.model_dump()

        except Exception as e:
            self._logger.warning(
                "Failed to parse LLM response, returning raw text fallback: %s", e
            )
            return StoryboardOutput().model_dump()
