import json
from typing import Any, Optional

from backend.agents.base_agent import BaseAgent
from backend.models.schemas import ProjectInput, SEOOutput


class SEOAgent(BaseAgent):
    """
    SEO Agent: Generates SEO metadata.
    """

    def __init__(self, llm) -> None:
        super().__init__(llm, agent_name="seo")

    async def execute(
        self,
        project_input: ProjectInput,
        context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        
        self._logger.info("Starting SEO Agent")
        system_prompt = self._load_prompt("seo_prompt.txt")
        
        if project_input.platform.lower() == "linkedin":
            system_prompt += (
                "\n\nSPECIAL LINKEDIN OPTIMIZATION:\n"
                "Focus on professional LinkedIn hashtags (3-5 max), clean search terms, and professional post "
                "formatting tips. Suggest optimal posting times for professional B2B audiences (typically mid-week mornings)."
            )
        
        context_block = self._build_context_block(context)
        
        user_prompt = (
            f"Topic: {project_input.topic}\n"
            f"Platform: {project_input.platform}\n\n"
            f"Generate SEO metadata.\n"
            f"{context_block}"
        )

        response = await self.llm.generate(prompt=user_prompt, system_prompt=system_prompt)
        
        try:
            parsed = self._parse_json_response(response)
            validated = SEOOutput(**parsed)
            # Ensure keywords are copied to tags if tags is empty
            if not validated.tags and validated.keywords:
                validated.tags = validated.keywords
            self._logger.info("SEO generation completed successfully.")
            return validated.model_dump()
        except Exception as e:
            self._logger.warning("Failed to parse LLM response, returning robust fallback: %s", e)
            topic_clean = project_input.topic.title()
            tag_clean = "".join(c for c in project_input.topic if c.isalnum())
            return SEOOutput(
                title=f"The Ultimate Guide to {topic_clean}!",
                description=f"A complete, high-quality walkthrough on {topic_clean}. Learn the core concepts and practical steps to master it.",
                keywords=[project_input.topic.lower(), "learning", "tutorial", "guide"],
                tags=[project_input.topic.lower(), "tutorial", "learning", "guide"],
                hashtags=[f"#{tag_clean}", "#learning", "#tutorial", "#guide"],
                best_upload_time="Tuesday 3:00 PM EST"
            ).model_dump()
