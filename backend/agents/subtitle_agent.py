import json
from typing import Any, Optional

from backend.agents.base_agent import BaseAgent
from backend.models.schemas import ProjectInput, SubtitleOutput


class SubtitleAgent(BaseAgent):
    """
    Subtitle Agent: Generates subtitles from script.
    """

    def __init__(self, llm) -> None:
        super().__init__(llm, agent_name="subtitle")

    async def execute(
        self,
        project_input: ProjectInput,
        context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        
        self._logger.info("Starting Subtitle Agent")
        system_prompt = self._load_prompt("subtitle_prompt.txt")
        
        context_block = self._build_context_block(context)
        
        user_prompt = (
            f"Topic: {project_input.topic}\n"
            f"Tone: {project_input.tone}\n\n"
            f"Generate subtitles.\n"
            f"{context_block}"
        )

        response = await self.llm.generate(prompt=user_prompt, system_prompt=system_prompt)
        
        try:
            parsed = self._parse_json_response(response)
            validated = SubtitleOutput(**parsed)
            self._logger.info("Subtitle generation completed successfully.")
            return validated.model_dump()
        except Exception as e:
            self._logger.error("Failed to parse or validate LLM response: %s", e)
            raise
