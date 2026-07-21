import json
from typing import Any, Optional

from backend.agents.base_agent import BaseAgent
from backend.models.schemas import ProjectInput, VoiceOutput


class VoiceAgent(BaseAgent):
    """
    Voice Agent: Generates voice-over directions.
    """

    def __init__(self, llm) -> None:
        super().__init__(llm, agent_name="voice")

    async def execute(
        self,
        project_input: ProjectInput,
        context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        
        self._logger.info("Starting Voice Agent")
        system_prompt = self._load_prompt("voice_prompt.txt")
        
        context_block = self._build_context_block(context)
        
        user_prompt = (
            f"Topic: {project_input.topic}\n"
            f"Tone: {project_input.tone}\n\n"
            f"Generate voice-over directions.\n"
            f"{context_block}"
        )

        response = await self.llm.generate(prompt=user_prompt, system_prompt=system_prompt)
        
        try:
            parsed = self._parse_json_response(response)
            validated = VoiceOutput(**parsed)
            self._logger.info("Voice generation completed successfully.")
            return validated.model_dump()
        except Exception as e:
            self._logger.warning("Failed to parse LLM response, returning raw text fallback: %s", e)
            return VoiceOutput().model_dump()
