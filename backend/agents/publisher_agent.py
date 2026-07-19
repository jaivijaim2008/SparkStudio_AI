from typing import Any, Optional

from backend.agents.base_agent import BaseAgent
from backend.models.schemas import ProjectInput


class PublisherAgent(BaseAgent):
    """
    Publisher Agent: NOT an LLM agent. 
    It just collects all outputs and prepares them for the export service.
    """

    def __init__(self, llm) -> None:
        super().__init__(llm, agent_name="publisher")

    async def execute(
        self,
        project_input: ProjectInput,
        context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        
        self._logger.info("Starting Publisher Agent (Aggregation)")
        
        # In a real scenario, this agent might do some final formatting or
        # structuring of the data before it gets passed to the export service.
        # For our architecture, it just passes the context through as 'completed'.
        
        if not context:
            self._logger.warning("No context provided to Publisher Agent.")
            return {"status": "No data to publish."}
            
        return {"status": "Ready for export", "keys_aggregated": list(context.keys())}
