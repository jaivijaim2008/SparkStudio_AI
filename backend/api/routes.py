from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
import io
import logging
from typing import Optional
from supabase import create_client, Client

from backend.models.schemas import ProjectInput, CertificateExtractRequest, CertificateExtractResponse
from backend.services.orchestrator import PipelineOrchestrator
from backend.services.llm_service import LLMService
from backend.services.export_service import ExportService
from backend.services.certificate_service import CertificateService
from backend.config import settings

logger = logging.getLogger("creatorpilot.api")
router = APIRouter()

# Initialize Supabase client
supabase: Optional[Client] = None
if settings.SUPABASE_URL and settings.SUPABASE_KEY:
    try:
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        logger.info("Supabase client successfully initialized in API routes.")
    except Exception as e:
        logger.warning(f"Failed to initialize Supabase client in API routes: {e}")

# Simple in-memory store for session caching / fallback
fake_db = {}

@router.post("/projects")
async def create_project(project_input: ProjectInput):
    import uuid
    from datetime import datetime
    project_id = str(uuid.uuid4())
    project_data = {
        "id": project_id,
        "input": project_input.model_dump(),
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }
    fake_db[project_id] = project_data
    
    user_email = project_input.user_email
    if supabase and user_email:
        try:
            supabase.table("projects").upsert({
                "id": project_id,
                "status": "pending",
                "input": project_input.model_dump()
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to insert project into Supabase: {e}")
            
    return {"project_id": project_id}

import asyncio
import json
import collections
import httpx

# Globals to track background tasks and active stream queues
background_tasks = {}
active_queues = collections.defaultdict(list)

async def run_pipeline_in_background(project_id: str, project_input: ProjectInput):
    from backend.services.llm_service import LLMService
    from backend.services.orchestrator import PipelineOrchestrator
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        llm = LLMService(client)
        orchestrator = PipelineOrchestrator(llm, db=fake_db)
        
        if project_id not in fake_db:
            fake_db[project_id] = {
                "id": project_id, 
                "input": project_input.model_dump(),
                "status": "generating"
            }
        
        fake_db[project_id]["events"] = []
        fake_db[project_id]["status"] = "generating"
        
        try:
            async for event_str in orchestrator.run_pipeline(project_id, project_input, demo_mode=settings.DEMO_MODE):
                # Append to cache
                if project_id in fake_db:
                    if "events" not in fake_db[project_id]:
                        fake_db[project_id]["events"] = []
                    fake_db[project_id]["events"].append(event_str)
                
                # Push to all active listener queues
                queues = list(active_queues[project_id])
                for q in queues:
                    await q.put(event_str)
        except Exception as e:
            logger.error(f"Error in background pipeline task for {project_id}: {e}")
            error_event = json.dumps({
                'agent': 'pipeline',
                'status': 'failed',
                'error_message': str(e)
            })
            if project_id in fake_db:
                fake_db[project_id]["status"] = "failed"
                if "events" not in fake_db[project_id]:
                    fake_db[project_id]["events"] = []
                fake_db[project_id]["events"].append(error_event)
            for q in list(active_queues[project_id]):
                await q.put(error_event)
        finally:
            background_tasks.pop(project_id, None)

@router.get("/projects/{project_id}/generate")
async def generate_project(project_id: str, request: Request):
    project_input = None
    
    # 1. Check local session cache first
    if project_id in fake_db:
        project_input = ProjectInput(**fake_db[project_id]["input"])
        # Only set to generating if not already completed
        if fake_db[project_id].get("status") != "completed":
            fake_db[project_id]["status"] = "generating"
    # 2. Query Supabase if not found locally
    elif supabase:
        try:
            res = supabase.table("projects").select("*").eq("id", project_id).execute()
            if res.data:
                db_data = res.data[0]
                if db_data.get("input"):
                    project_input = ProjectInput(**db_data["input"])
                    fake_db[project_id] = db_data
                    if db_data.get("status") != "completed":
                        fake_db[project_id]["status"] = "generating"
        except Exception as e:
            logger.warning(f"Failed to fetch project from Supabase: {e}")

    if not project_input:
        raise HTTPException(status_code=404, detail="Project not found")
            
    # Check if project is already completed
    existing_project = fake_db.get(project_id)
    if existing_project and existing_project.get("status") == "completed":
        logger.info(f"Project {project_id} is already completed. Serving from database.")
        
        async def stream_existing_events():
            yield json.dumps({'agent': 'pipeline', 'status': 'started'})
            await asyncio.sleep(0.05)
            
            # Map agent names to keys in the database payload
            from backend.services.orchestrator import _AGENT_DATA_KEY
            for agent_name, key in _AGENT_DATA_KEY.items():
                if existing_project.get(key) is not None:
                    yield json.dumps({
                        'agent': agent_name,
                        'status': 'completed',
                        'data': existing_project[key]
                    })
                    await asyncio.sleep(0.05)
                    
            yield json.dumps({'agent': 'pipeline', 'status': 'finished', 'project_id': project_id})
            
        return EventSourceResponse(stream_existing_events())
    
    # If the background task is NOT running, launch it!
    if project_id not in background_tasks:
        task = asyncio.create_task(run_pipeline_in_background(project_id, project_input))
        background_tasks[project_id] = task
        
    # Create listener queue
    q = asyncio.Queue()
    active_queues[project_id].append(q)

    async def event_generator():
        try:
            # 1. Stream already generated events from cache
            stored_events = []
            if project_id in fake_db:
                stored_events = list(fake_db[project_id].get("events", []))
            
            for event_str in stored_events:
                yield event_str
                await asyncio.sleep(0.01)

            # 2. Stream new events from the queue
            while True:
                event_str = await q.get()
                yield event_str
                event_data = json.loads(event_str)
                if event_data.get('agent') == 'pipeline' and event_data.get('status') in ['finished', 'failed']:
                    break
        except asyncio.CancelledError:
            logger.info(f"Client disconnected from SSE stream for {project_id}")
        finally:
            if q in active_queues[project_id]:
                active_queues[project_id].remove(q)

    return EventSourceResponse(event_generator())

@router.get("/project/{project_id}")
async def get_project(project_id: str):
    # 1. Try local session cache
    if project_id in fake_db:
        return fake_db[project_id]
        
    # 2. Try Supabase
    if supabase:
        try:
            res = supabase.table("projects").select("*").eq("id", project_id).execute()
            if res.data:
                db_data = res.data[0]
                fake_db[project_id] = db_data
                return db_data
        except Exception as e:
            logger.warning(f"Failed to get project from Supabase: {e}")
            
    # 3. Raise 404 if not found
    raise HTTPException(status_code=404, detail="Project not found")

@router.get("/project/{project_id}/export")
async def export_project(project_id: str):
    project_data = None
    
    if project_id in fake_db:
        project_data = fake_db[project_id]
    elif supabase:
        try:
            res = supabase.table("projects").select("*").eq("id", project_id).execute()
            if res.data:
                project_data = res.data[0]
                fake_db[project_id] = project_data
        except Exception as e:
            logger.warning(f"Failed to get project for export from Supabase: {e}")
            
    if not project_data:
        raise HTTPException(status_code=404, detail="Project not found")
        
    import io
    pdf_bytes = ExportService.generate_pdf_report(project_data)
    
    topic_slug = "".join([c if c.isalnum() else "_" for c in project_data.get("input", {}).get("topic", "sparkstudio")])
    filename = f"sparkstudio_{topic_slug[:30]}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/projects")
async def get_projects(email: Optional[str] = None):
    """
    List all generated projects.
    """
    projects_list = []
    
    if supabase:
        try:
            query = supabase.table("projects").select("id", "status", "input", "created_at")
            if email:
                query = query.eq("input->>user_email", email)
            res = query.execute()
            if res.data:
                for db_data in res.data:
                    input_data = db_data.get("input") or {}
                    projects_list.append({
                        "id": db_data["id"],
                        "topic": input_data.get("topic", "Untitled"),
                        "platform": input_data.get("platform", "YouTube Shorts"),
                        "status": db_data.get("status", "completed"),
                        "created_at": db_data.get("created_at", "")
                    })
                return projects_list
            else:
                if email:
                    return []
        except Exception as e:
            logger.warning(f"Failed to list projects from Supabase: {e}")

    # Fallback to fake_db (optionally filtered by email)
    for pid, data in fake_db.items():
        input_data = data.get("input", {})
        user_email = input_data.get("user_email")
        if email and user_email != email:
            continue
        projects_list.append({
            "id": pid,
            "topic": input_data.get("topic", "Untitled"),
            "platform": input_data.get("platform", "YouTube Shorts"),
            "status": data.get("status", "completed"),
            "created_at": data.get("created_at", "")
        })
    return projects_list

@router.delete("/project/{project_id}")
async def delete_project(project_id: str):
    """
    Delete a project.
    """
    deleted = False
    if project_id in fake_db:
        del fake_db[project_id]
        deleted = True
        
    if supabase:
        try:
            res = supabase.table("projects").delete().eq("id", project_id).execute()
            if res.data:
                deleted = True
        except Exception as e:
            logger.warning(f"Failed to delete project from Supabase: {e}")
            
    if deleted:
        return {"status": "ok", "message": "Project deleted successfully"}
    raise HTTPException(status_code=404, detail="Project not found")


@router.post("/extract-certificate", response_model=CertificateExtractResponse)
async def extract_certificate(payload: CertificateExtractRequest):
    """
    Extract certificate details (title, issuer, date, skills) and generate a LinkedIn post.
    """
    try:
        extracted = CertificateService.extract_certificate_info(
            filename=payload.filename,
            raw_text=payload.extracted_text or "",
            user_notes=payload.user_notes or ""
        )
        linkedin_post = CertificateService.generate_linkedin_post(
            extracted_info=extracted,
            custom_tone=payload.tone or "Professional"
        )
        return CertificateExtractResponse(
            certificate_title=extracted["certificate_title"],
            issuing_organization=extracted["issuing_organization"],
            completion_date=extracted["completion_date"],
            skills=extracted["skills"],
            achievements=extracted["achievements"],
            linkedin_post=linkedin_post
        )
    except Exception as e:
        logger.error(f"Error extracting certificate info: {e}")
        raise HTTPException(status_code=500, detail=f"Certificate processing failed: {str(e)}")


class YouTubeSummarizeRequest(BaseModel):
    url: str


@router.post("/youtube/summarize")
async def summarize_youtube(request_data: YouTubeSummarizeRequest, request: Request):
    """
    Extract transcript from a YouTube video URL and generate an AI summary.
    """
    from backend.services.youtube_service import generate_youtube_summary
    
    if not request_data.url or not request_data.url.strip():
        raise HTTPException(status_code=400, detail="YouTube video URL is required.")
        
    client = getattr(request.app.state, "http_client", None)
    
    try:
        if client:
            result = await generate_youtube_summary(client, request_data.url)
        else:
            async with httpx.AsyncClient(timeout=90.0) as temp_client:
                result = await generate_youtube_summary(temp_client, request_data.url)
        return result
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        logger.error(f"Error summarizing YouTube video: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(exc)}")


from fastapi import UploadFile, File

@router.post("/linkedin/generate-post")
async def generate_linkedin_post(file: UploadFile = File(...)):
    """
    Extract certificate details and generate a professional LinkedIn post using multimodal AI.
    """
    from backend.services.llm_service import LLMService
    # Validate MIME type (with extension-based fallback in case the browser sends application/octet-stream)
    import mimetypes
    mime_type = file.content_type
    if not mime_type or mime_type in ["application/octet-stream", ""]:
        mime_type = mimetypes.guess_type(file.filename or "")[0] or "application/octet-stream"

    # Normalize image/jpg to image/jpeg
    if mime_type == "image/jpg":
        mime_type = "image/jpeg"

    allowed_types = ["application/pdf", "image/png", "image/jpeg"]
    if mime_type not in allowed_types:
        # Final fallback check on extension
        ext = (file.filename or "").split(".")[-1].lower() if "." in (file.filename or "") else ""
        if ext == "pdf":
            mime_type = "application/pdf"
        elif ext == "png":
            mime_type = "image/png"
        elif ext in ["jpg", "jpeg"]:
            mime_type = "image/jpeg"
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type ({mime_type}). Please upload a PDF, JPG, JPEG, or PNG certificate."
            )

    try:
        file_bytes = await file.read()
        
        system_prompt = (
            "You are an expert professional branding consultant, OCR parser, and LinkedIn copywriter. "
            "Your task is to analyze the uploaded certificate document/image and return a JSON object containing "
            "the generated post and key extracted details."
        )
        
        prompt = (
            "Analyze the uploaded certificate and extract key details: the certificate title, "
            "issuing organization, and a list of key skills learned.\n"
            "Using those details, write a compelling LinkedIn post that includes:\n"
            "1. A congratulatory opening expressing excitement.\n"
            "2. A brief, professional description of what the certification is about and its significance.\n"
            "3. Bullet points of key skills learned or concepts covered.\n"
            "4. A note of gratitude to the issuing organization if applicable.\n"
            "5. Appropriate professional hashtags (e.g., #Certification #Learning #ProfessionalDevelopment #AI #DataScience).\n\n"
            "Respond ONLY with a valid JSON object matching the following structure (do not include markdown formatting or backticks around the JSON):\n"
            "{\n"
            "  \"post\": \"<the full generated LinkedIn post text here>\",\n"
            "  \"extracted_details\": {\n"
            "    \"title\": \"<extracted certificate title>\",\n"
            "    \"issuer\": \"<extracted issuing organization>\",\n"
            "    \"skills\": [\"<skill 1>\", \"<skill 2>\", \"<skill 3>\"]\n"
            "  }\n"
            "}"
        )

        async with httpx.AsyncClient(timeout=120.0) as client:
            llm = LLMService(client)
            generated_post = await llm.generate_multimodal(
                prompt=prompt,
                file_bytes=file_bytes,
                mime_type=mime_type,
                system_prompt=system_prompt
            )
            
            # Clean JSON string from potential markdown wrapper
            clean_post = generated_post.strip()
            if clean_post.startswith("```"):
                lines = clean_post.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                clean_post = "\n".join(lines).strip()
            
            try:
                res_data = json.loads(clean_post)
            except Exception:
                res_data = {
                    "post": generated_post,
                    "extracted_details": {
                        "title": "Professional Certification",
                        "issuer": "Recognized Institution",
                        "skills": []
                    }
                }
                
            return res_data
            
    except Exception as e:
        logger.error(f"Failed to generate LinkedIn post from certificate: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process certificate: {str(e)}")

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "supabase_initialized": supabase is not None,
        "demo_mode": settings.DEMO_MODE,
        "llm_provider": settings.LLM_PROVIDER
    }

class PaymentClaimInput(BaseModel):
    user_id: str
    email: str
    plan_name: str
    utr_number: str

class ApproveClaimInput(BaseModel):
    claim_id: str
    user_id: str
    plan_name: str

payment_claims_db = []

@router.get("/payments/config")
async def get_payments_config():
    import os
    return {
        "stripe_pro_link": os.environ.get("STRIPE_PRO_LINK", "https://buy.stripe.com/your-mock-pro-link"),
        "stripe_team_link": os.environ.get("STRIPE_TEAM_LINK", "https://buy.stripe.com/your-mock-team-link"),
        "upi_id": os.environ.get("UPI_ID", "")
    }

@router.post("/payments/claim")
async def create_payment_claim(claim: PaymentClaimInput):
    import uuid
    from datetime import datetime
    claim_id = str(uuid.uuid4())
    claim_data = {
        "id": claim_id,
        "user_id": claim.user_id,
        "email": claim.email,
        "plan_name": claim.plan_name,
        "utr_number": claim.utr_number,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }
    payment_claims_db.append(claim_data)
    
    if supabase:
        try:
            supabase.table("payment_claims").insert(claim_data).execute()
        except Exception as e:
            logger.warning(f"Could not save payment claim to Supabase, falling back to local memory: {e}")
            
    return {"status": "success", "claim_id": claim_id}

@router.get("/payments/claims")
async def get_payment_claims():
    if supabase:
        try:
            res = supabase.table("payment_claims").select("*").execute()
            claims = res.data
            return sorted(claims, key=lambda x: x["created_at"], reverse=True)
        except Exception as e:
            logger.warning(f"Could not load payment claims from Supabase: {e}")
    
    return sorted(payment_claims_db, key=lambda x: x["created_at"], reverse=True)

@router.post("/payments/claims/approve")
async def approve_payment_claim(input_data: ApproveClaimInput):
    # Update status in memory
    for claim in payment_claims_db:
        if claim["id"] == input_data.claim_id:
            claim["status"] = "approved"
            
    if supabase:
        try:
            supabase.table("payment_claims").update({"status": "approved"}).eq("id", input_data.claim_id).execute()
            # Upgrade user plan: standard plans are 'free', 'pro', 'enterprise'
            db_plan = "pro" if "pro" in input_data.plan_name.lower() else "enterprise"
            supabase.table("profiles").update({"plan": db_plan}).eq("id", input_data.user_id).execute()
        except Exception as e:
            logger.error(f"Failed to update profile plan in Supabase: {e}")
            raise HTTPException(status_code=500, detail=str(e))
            
    return {"status": "success"}

@router.post("/payments/claims/reject")
async def reject_payment_claim(claim_id: str):
    # Update status in memory
    for claim in payment_claims_db:
        if claim["id"] == claim_id:
            claim["status"] = "rejected"
            
    if supabase:
        try:
            supabase.table("payment_claims").update({"status": "rejected"}).eq("id", claim_id).execute()
        except Exception as e:
            logger.error(f"Failed to reject claim: {e}")
            raise HTTPException(status_code=500, detail=str(e))
            
    return {"status": "success"}

# ─────────────────────────────────────────────────────────────────
# RAZORPAY AUTO-PAYMENT ENDPOINTS
# ─────────────────────────────────────────────────────────────────

class RazorpayOrderInput(BaseModel):
    plan_name: str   # "pro" or "team"
    user_id: str
    email: str

class RazorpayVerifyInput(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    user_id: str
    plan_name: str

def _get_razorpay_client():
    import os
    import razorpay
    key_id = os.environ.get("RAZORPAY_KEY_ID", "")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
    if not key_id or not key_secret:
        return None, key_id
    return razorpay.Client(auth=(key_id, key_secret)), key_id

@router.get("/payments/razorpay/config")
async def get_razorpay_config():
    """Return Razorpay Key ID for frontend initialization."""
    import os
    key_id = os.environ.get("RAZORPAY_KEY_ID", "")
    return {"key_id": key_id, "enabled": bool(key_id)}

@router.post("/payments/razorpay/create-order")
async def create_razorpay_order(body: RazorpayOrderInput):
    """Create a Razorpay order for the selected plan."""
    import os
    plan_prices = {"pro": 5900, "team": 9900}  # Amount in paise (₹59 = 5900 paise)
    plan_key = body.plan_name.lower().replace("enterprise", "team")
    amount_paise = plan_prices.get(plan_key, 5900)

    client, key_id = _get_razorpay_client()
    if not client:
        raise HTTPException(status_code=503, detail="Razorpay not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment variables.")

    try:
        import uuid
        order = client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": f"sparkstudio_{body.user_id[:8]}_{str(uuid.uuid4())[:8]}",
            "notes": {
                "user_id": body.user_id,
                "email": body.email,
                "plan_name": body.plan_name
            }
        })
        return {
            "order_id": order["id"],
            "amount": amount_paise,
            "currency": "INR",
            "key_id": key_id
        }
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Could not create payment order: {str(e)}")

@router.post("/payments/razorpay/verify")
async def verify_razorpay_payment(body: RazorpayVerifyInput):
    """
    Verify Razorpay payment signature and instantly upgrade user plan.
    Called from frontend after successful payment callback.
    """
    import os, hmac, hashlib
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
    if not key_secret:
        raise HTTPException(status_code=503, detail="Razorpay not configured.")

    # Verify HMAC signature to confirm payment is genuine
    expected = hmac.new(
        key_secret.encode("utf-8"),
        f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature. Payment could not be verified.")

    # Signature valid — upgrade the user plan
    db_plan = "enterprise" if body.plan_name.lower() in ("team", "enterprise") else "pro"
    if supabase:
        try:
            supabase.table("profiles").update({"plan": db_plan}).eq("id", body.user_id).execute()
            logger.info(f"Auto-upgraded user {body.user_id} to plan '{db_plan}' after Razorpay payment {body.razorpay_payment_id}")
        except Exception as e:
            logger.error(f"Failed to upgrade plan after verified payment: {e}")
            raise HTTPException(status_code=500, detail="Payment verified but plan upgrade failed. Contact support.")
    else:
        logger.warning("Supabase not initialized — plan upgrade skipped (demo mode).")

    return {"status": "success", "plan": db_plan, "payment_id": body.razorpay_payment_id}

@router.post("/payments/razorpay/webhook")
async def razorpay_webhook(request: Request):
    """
    Razorpay webhook endpoint (optional server-side backup verification).
    Configure this URL in your Razorpay Dashboard → Webhooks.
    """
    import os, hmac, hashlib, json
    webhook_secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
    body_bytes = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    if webhook_secret and signature:
        expected = hmac.new(webhook_secret.encode(), body_bytes, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    payload = json.loads(body_bytes)
    event = payload.get("event", "")

    if event == "payment.captured":
        payment = payload.get("payload", {}).get("payment", {}).get("entity", {})
        notes = payment.get("notes", {})
        user_id = notes.get("user_id", "")
        plan_name = notes.get("plan_name", "pro")
        db_plan = "enterprise" if plan_name.lower() in ("team", "enterprise") else "pro"

        if supabase and user_id:
            try:
                supabase.table("profiles").update({"plan": db_plan}).eq("id", user_id).execute()
                logger.info(f"Webhook: upgraded user {user_id} to {db_plan}")
            except Exception as e:
                logger.error(f"Webhook plan upgrade failed: {e}")

    return {"status": "ok"}
