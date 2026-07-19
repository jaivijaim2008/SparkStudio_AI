import json
import logging
from typing import AsyncGenerator
from datetime import datetime

from backend.models.schemas import ProjectInput, ProjectResult
from backend.services.llm_service import LLMService
from backend.agents import (
    ResearchAgent,
    ScriptAgent,
    StoryboardAgent,
    ThumbnailAgent,
    SEOAgent,
    SubtitleAgent,
    VoiceAgent,
    QualityAgent,
    PublisherAgent,
)

logger = logging.getLogger("creatorpilot.orchestrator")

class PipelineOrchestrator:
    """
    Orchestrates the sequential execution of all agents and yields
    Server-Sent Events (SSE) for real-time progress updates.
    """

    def __init__(self, llm_service: LLMService):
        self.llm = llm_service
        self.agents = [
            ResearchAgent(self.llm),
            ScriptAgent(self.llm),
            StoryboardAgent(self.llm),
            ThumbnailAgent(self.llm),
            SEOAgent(self.llm),
            SubtitleAgent(self.llm),
            VoiceAgent(self.llm),
            QualityAgent(self.llm),
            PublisherAgent(self.llm),
        ]

    async def run_pipeline(self, project_id: str, project_input: ProjectInput, demo_mode: bool = False) -> AsyncGenerator[str, None]:
        """
        Runs the full agent pipeline.
        Yields JSON strings formatted as SSE data.
        """
        context = {}
        
        # In demo mode, we might want to just stream static data, but for now we'll 
        # attempt to run it or simulate it if demo_mode is True.
        if demo_mode:
            logger.info("Running pipeline in DEMO MODE.")
            # For hackathon demo, you could yield predefined JSON blocks here.
            # We'll just yield a single success event for the demo for now, 
            # or we could simulate delays.
            import asyncio
            for agent in self.agents:
                yield f"data: {json.dumps({'agent': agent.agent_name, 'status': 'running'})}\n\n"
                await asyncio.sleep(2)
                yield f"data: {json.dumps({'agent': agent.agent_name, 'status': 'completed', 'data': {}})}\n\n"
            
            yield f"data: {json.dumps({'agent': 'pipeline', 'status': 'finished', 'project_id': project_id})}\n\n"
            return

        logger.info(f"Starting pipeline for project {project_id}")
        yield f"data: {json.dumps({'agent': 'pipeline', 'status': 'started'})}\n\n"

        for agent in self.agents:
            yield f"data: {json.dumps({'agent': agent.agent_name, 'status': 'running'})}\n\n"
            
            try:
                # Execute agent
                result = await agent.execute(project_input=project_input, context=context)
                
                # Store result in context for next agents
                context[agent.agent_name] = result
                
                # Yield completion event with data
                yield f"data: {json.dumps({'agent': agent.agent_name, 'status': 'completed', 'data': result})}\n\n"
                
            except Exception as e:
                logger.error(f"Error in {agent.agent_name}: {str(e)}")
                yield f"data: {json.dumps({'agent': agent.agent_name, 'status': 'error', 'error_message': str(e)})}\n\n"
                # Stop pipeline on error
                return

        # Final event
        yield f"data: {json.dumps({'agent': 'pipeline', 'status': 'finished', 'project_id': project_id})}\n\n"
