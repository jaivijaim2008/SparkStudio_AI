from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import io

from backend.models.schemas import ProjectInput
from backend.services.orchestrator import PipelineOrchestrator
from backend.services.llm_service import LLMService
from backend.services.export_service import ExportService
from backend.config import settings

router = APIRouter()

# Simple in-memory store for the hackathon demo
# In production, this would be Supabase
fake_db = {}

@router.post("/generate")
async def generate_project(project_input: ProjectInput, request: Request):
    """
    Start the pipeline. Returns a Server-Sent Events (SSE) stream.
    """
    import uuid
    project_id = str(uuid.uuid4())
    
    # Store initial state
    fake_db[project_id] = {
        "id": project_id,
        "input": project_input.model_dump(),
        "status": "generating"
    }
    
    llm = LLMService(request.app.state.http_client)
    orchestrator = PipelineOrchestrator(llm)
    
    return StreamingResponse(
        orchestrator.run_pipeline(project_id, project_input, demo_mode=settings.DEMO_MODE),
        media_type="text/event-stream"
    )

@router.get("/project/{project_id}")
async def get_project(project_id: str):
    if project_id not in fake_db:
        # Fallback to sample data for demo if not found
        import json
        from pathlib import Path
        sample_path = Path(__file__).parent.parent / "sample_data" / "sample_project.json"
        if sample_path.exists():
            return json.loads(sample_path.read_text())
        raise HTTPException(status_code=404, detail="Project not found")
    return fake_db[project_id]

@router.get("/project/{project_id}/export")
async def export_project(project_id: str):
    # For demo, load sample data
    import json
    from pathlib import Path
    sample_path = Path(__file__).parent.parent / "sample_data" / "sample_project.json"
    project_data = {}
    if sample_path.exists():
        project_data = json.loads(sample_path.read_text())
        
    zip_bytes = ExportService.generate_zip_package(project_data)
    
    return StreamingResponse(
        io.BytesIO(zip_bytes),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=creatorpilot_{project_id}.zip"}
    )
