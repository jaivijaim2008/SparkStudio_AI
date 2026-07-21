import json
from typing import Any, Optional

from backend.agents.base_agent import BaseAgent
from backend.models.schemas import ProjectInput, ScriptOutput


class ScriptAgent(BaseAgent):
    """
    Script Agent: Writes the full video script based on the original input
    and the research agent's findings.
    """

    def __init__(self, llm) -> None:
        super().__init__(llm, agent_name="script")

    async def execute(
        self,
        project_input: ProjectInput,
        context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        
        self._logger.info("Starting Script Agent")
        system_prompt = self._load_prompt("script_prompt.txt")
        
        # Build context from previous agents (mainly research)
        context_block = self._build_context_block(context)
        
        user_prompt = (
            f"Topic: {project_input.topic}\n"
            f"Platform: {project_input.platform}\n"
            f"Length: {project_input.video_length} seconds\n"
            f"Tone: {project_input.tone}\n\n"
            f"{context_block}"
        )

        response = await self.llm.generate(prompt=user_prompt, system_prompt=system_prompt)
        
        try:
            parsed = self._parse_json_response(response)
            validated = ScriptOutput(**parsed)
            self._logger.info("Script generation completed successfully.")
            return validated.model_dump()
        except Exception as e:
            self._logger.warning("Failed to parse LLM response, returning raw text fallback: %s", e)
            return ScriptOutput(hook='', full_script=response, sections=[], word_count=len(response.split()), estimated_duration=0).model_dump()
