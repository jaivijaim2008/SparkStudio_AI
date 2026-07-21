import json
from typing import Any, Optional

from backend.agents.base_agent import BaseAgent
from backend.models.schemas import ProjectInput, QualityOutput


class QualityAgent(BaseAgent):
    """
    Quality Agent: Audits all generated content.
    """

    def __init__(self, llm) -> None:
        super().__init__(llm, agent_name="quality")

    async def execute(
        self,
        project_input: ProjectInput,
        context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        
        self._logger.info("Starting Quality Agent")
        system_prompt = self._load_prompt("quality_prompt.txt")
        
        context_block = self._build_context_block(context)
        
        user_prompt = (
            f"Topic: {project_input.topic}\n"
            f"Platform: {project_input.platform}\n\n"
            f"Audit the following content.\n"
            f"{context_block}"
        )

        response = await self.llm.generate(prompt=user_prompt, system_prompt=system_prompt)
        
        try:
            parsed = self._parse_json_response(response)
            validated = QualityOutput(**parsed)
            self._logger.info("Quality audit completed successfully.")
            return validated.model_dump()
        except Exception as e:
            self._logger.warning("Failed to parse LLM response, returning raw text fallback: %s", e)
            return QualityOutput(overall_score=70).model_dump()
