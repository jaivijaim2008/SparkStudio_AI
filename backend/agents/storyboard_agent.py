import asyncio
import json
import urllib.parse
import re
from typing import Any, Optional

import httpx

from backend.agents.base_agent import BaseAgent
from backend.models.schemas import ProjectInput, StoryboardOutput


class StoryboardAgent(BaseAgent):
    """
    Storyboard Agent: Converts the script into visual scenes.
    Generates image URLs and initiates background pre-warming 
    without blocking the real-time SSE agent execution pipeline.
    """

    def __init__(self, llm) -> None:
        super().__init__(llm, agent_name="storyboard")

    def _build_image_url(self, prompt: str, scene_number: int) -> str:
        """Build a clean, deterministic Pollinations URL for a given prompt."""
        # Remove B-roll and SFX bracket tags
        clean_prompt = re.sub(r'\[.*?\]', '', prompt)
        sanitized = (
            clean_prompt.replace("\n", " ")
            .replace("\r", " ")
            .replace('"', "")
            .replace("'", "")
            .strip()
        )
        sanitized = "".join(c for c in sanitized if c.isalnum() or c in " .,?-_")
        encoded = urllib.parse.quote(sanitized[:350])
        seed = (scene_number * 1337)
        return (
            f"https://image.pollinations.ai/prompt/{encoded}"
            f"?width=480&height=270&nologo=true&model=turbo&seed={seed}"
        )

    async def _warm_images_background(self, scenes: list) -> None:
        """
        Background task: Warm Pollinations CDN cache non-blockingly.
        Does not delay the main SSE pipeline.
        """
        async with httpx.AsyncClient() as client:
            for scene in scenes:
                if not scene.image_url:
                    continue
                try:
                    await client.get(scene.image_url, timeout=12.0, follow_redirects=True)
                except Exception as e:
                    self._logger.debug("Background pre-warm notice for scene %d: %s", scene.scene_number, e)

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

            # Build URLs for every scene immediately
            for scene in validated.scenes:
                prompt = scene.image_prompt or scene.visual_description
                scene.image_url = self._build_image_url(prompt, scene.scene_number)

            # Launch background warming task without awaiting — returns INSTANTLY!
            asyncio.create_task(self._warm_images_background(validated.scenes))

            self._logger.info("Storyboard agent finished instantly with %d scene URLs.", len(validated.scenes))
            return validated.model_dump()

        except Exception as e:
            self._logger.warning(
                "Failed to parse LLM response, returning raw text fallback: %s", e
            )
            return StoryboardOutput().model_dump()
