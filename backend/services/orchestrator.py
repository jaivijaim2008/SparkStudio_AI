import json
import logging
import asyncio
from typing import AsyncGenerator, Optional

from backend.models.schemas import ProjectInput
from backend.services.llm_service import LLMService
from backend.config import settings
try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
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

# Agent-name → key used in the project data dict for the export service
_AGENT_DATA_KEY = {
    "research": "research",
    "script": "script",
    "storyboard": "storyboard",
    "thumbnail": "thumbnail",
    "seo": "seo",
    "subtitle": "subtitles",
    "voice": "voice",
    "quality": "quality",
    "publisher": "publisher",
}


class PipelineOrchestrator:
    """
    Orchestrates the sequential execution of all agents and yields
    Server-Sent Events (SSE) for real-time progress updates.
    """

    def __init__(self, llm_service: LLMService, db: Optional[dict] = None):
        self.llm = llm_service
        self._db = db  # reference to the in-memory fake_db
        
        # Initialize Supabase client if configured
        self.supabase: Optional[Client] = None
        if create_client and settings.SUPABASE_URL and settings.SUPABASE_KEY:
            try:
                self.supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                logger.info("Supabase client initialized for cloud backup.")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase: {e}")

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

    def _persist(self, project_id: str, agent_name: str, result: dict) -> None:
        """Save an agent's result back into the in-memory store and optionally to Supabase."""
        key = _AGENT_DATA_KEY.get(agent_name, agent_name)
        
        # Local in-memory backup
        if self._db is not None and project_id in self._db:
            self._db[project_id][key] = result

        # Cloud Supabase backup (upsert)
        if self.supabase:
            try:
                # We store the entire JSON under the project ID
                data_payload = {"id": project_id, key: result}
                self.supabase.table("projects").upsert(data_payload).execute()
            except Exception as e:
                logger.warning(f"Failed to backup to Supabase: {e}")

    async def run_pipeline(
        self,
        project_id: str,
        project_input: ProjectInput,
        demo_mode: bool = False,
    ) -> AsyncGenerator[str, None]:
        """
        Runs the full agent pipeline concurrently where possible.
        Yields JSON strings formatted as SSE data.
        """
        context: dict = {}

        if demo_mode:
            logger.info("Running pipeline in DEMO MODE.")
            for agent in self.agents:
                yield json.dumps({'agent': agent.agent_name, 'status': 'running'})
                await asyncio.sleep(1)
                yield json.dumps({'agent': agent.agent_name, 'status': 'completed', 'data': {}})
            yield json.dumps({'agent': 'pipeline', 'status': 'finished', 'project_id': project_id})
            return

        logger.info(f"Starting FAST pipeline for project {project_id}")
        yield json.dumps({'agent': 'pipeline', 'status': 'started'})

        # Phase 1: Sequential (Research -> Script)
        for agent in self.agents[:2]:
            yield json.dumps({'agent': agent.agent_name, 'status': 'running'})
            try:
                result = await agent.execute(project_input=project_input, context=context)
                context[agent.agent_name] = result
                self._persist(project_id, agent.agent_name, result)
                yield json.dumps({'agent': agent.agent_name, 'status': 'completed', 'data': result})
            except Exception as e:
                logger.error(f"Error in {agent.agent_name}: {str(e)}")
                yield json.dumps({'agent': agent.agent_name, 'status': 'error', 'data': {}, 'error_message': str(e)})

        # Phase 2: Sequential to respect Groq rate limits (Storyboard, Thumbnail, SEO, Subtitle, Voice)
        middle_agents = self.agents[2:7]
        for agent in middle_agents:
            yield json.dumps({'agent': agent.agent_name, 'status': 'running'})
            try:
                result = await agent.execute(project_input=project_input, context=context)
                context[agent.agent_name] = result
                self._persist(project_id, agent.agent_name, result)
                yield json.dumps({'agent': agent.agent_name, 'status': 'completed', 'data': result})
            except Exception as e:
                logger.error(f"Error in {agent.agent_name}: {str(e)}")
                yield json.dumps({'agent': agent.agent_name, 'status': 'error', 'data': {}, 'error_message': str(e)})

        # Phase 3: Sequential (Quality -> Publisher)
        for agent in self.agents[7:]:
            yield json.dumps({'agent': agent.agent_name, 'status': 'running'})
            try:
                result = await agent.execute(project_input=project_input, context=context)
                context[agent.agent_name] = result
                self._persist(project_id, agent.agent_name, result)
                yield json.dumps({'agent': agent.agent_name, 'status': 'completed', 'data': result})
            except Exception as e:
                logger.error(f"Error in {agent.agent_name}: {str(e)}")
                yield json.dumps({'agent': agent.agent_name, 'status': 'error', 'data': {}, 'error_message': str(e)})

        # Mark project as completed in the store
        if self._db is not None and project_id in self._db:
            self._db[project_id]["status"] = "completed"
            
        if self.supabase:
            try:
                self.supabase.table("projects").upsert({"id": project_id, "status": "completed"}).execute()
            except Exception as e:
                logger.warning(f"Failed to mark completed in Supabase: {e}")

        yield json.dumps({'agent': 'pipeline', 'status': 'finished', 'project_id': project_id})
