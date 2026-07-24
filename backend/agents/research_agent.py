import json
from typing import Any, Optional

from backend.agents.base_agent import BaseAgent
from backend.models.schemas import ProjectInput, ResearchOutput


class ResearchAgent(BaseAgent):
    """
    Research Agent: Analysing the target topic and audience to produce
    trends, viral angles, and pain points.
    """

    def __init__(self, llm) -> None:
        super().__init__(llm, agent_name="research")

    async def execute(
        self,
        project_input: ProjectInput,
        context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        
        self._logger.info("Starting Research Agent for topic: %s", project_input.topic)
        system_prompt = self._load_prompt("research_prompt.txt")
        
        if project_input.platform.lower() == "linkedin":
            system_prompt += (
                "\n\nSPECIAL LINKEDIN OPTIMIZATION:\n"
                "Focus on professional B2B trends, industry leadership, career development, productivity, "
                "entrepreneurship, and B2B pain points. The hook should be professional and thought-provoking."
            )
        
        # Build the user prompt
        user_prompt = (
            f"Topic: {project_input.topic}\n"
            f"Platform: {project_input.platform}\n"
            f"Audience: {project_input.audience}\n"
            f"Tone: {project_input.tone}\n"
            f"Language: {project_input.language}\n"
        )

        response = await self.llm.generate(prompt=user_prompt, system_prompt=system_prompt)
        
        try:
            parsed = self._parse_json_response(response)
            # Validate against schema
            validated = ResearchOutput(**parsed)
            self._logger.info("Research completed successfully.")
            return validated.model_dump()
        except Exception as e:
            self._logger.warning("Failed to parse LLM response, returning raw text fallback: %s", e)
            return ResearchOutput().model_dump()
