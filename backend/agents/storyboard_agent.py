import json
from typing import Any, Optional

from backend.agents.base_agent import BaseAgent
from backend.models.schemas import ProjectInput, StoryboardOutput


class StoryboardAgent(BaseAgent):
    """
    Storyboard Agent: Converts the script into visual scenes.
    """

    def __init__(self, llm) -> None:
        super().__init__(llm, agent_name="storyboard")

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
            self._logger.info("Storyboard completed successfully.")
            return validated.model_dump()
        except Exception as e:
            self._logger.warning("Failed to parse LLM response, returning raw text fallback: %s", e)
            return StoryboardOutput().model_dump()
