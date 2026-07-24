import json
from typing import Any, Optional

from backend.agents.base_agent import BaseAgent
from backend.models.schemas import ProjectInput, ThumbnailOutput


class ThumbnailAgent(BaseAgent):
    """
    Thumbnail Agent: Generates thumbnail concepts and image prompts.
    """

    def __init__(self, llm) -> None:
        super().__init__(llm, agent_name="thumbnail")

    async def execute(
        self,
        project_input: ProjectInput,
        context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        
        self._logger.info("Starting Thumbnail Agent")
        system_prompt = self._load_prompt("thumbnail_prompt.txt")
        
        if project_input.platform.lower() == "linkedin":
            system_prompt += (
                "\n\nSPECIAL LINKEDIN OPTIMIZATION:\n"
                "Instead of a standard video thumbnail, design this as a LinkedIn Carousel Cover Slide or "
                "a professional single-image post graphic. Use professional colors (e.g. deep slate, navy, corporate gold, clean white), "
                "bold and readable typography, and minimalist layouts suitable for a corporate feed."
            )
        
        context_block = self._build_context_block(context)
        
        user_prompt = (
            f"Topic: {project_input.topic}\n"
            f"Platform: {project_input.platform}\n"
            f"Audience: {project_input.audience}\n\n"
            f"Generate a thumbnail concept.\n"
            f"{context_block}"
        )

        response = await self.llm.generate(prompt=user_prompt, system_prompt=system_prompt)
        
        try:
            parsed = self._parse_json_response(response)
            validated = ThumbnailOutput(**parsed)
            self._logger.info("Thumbnail generation completed successfully.")
            return validated.model_dump()
        except Exception as e:
            self._logger.warning("Failed to parse LLM response, returning raw text fallback: %s", e)
            return ThumbnailOutput().model_dump()
