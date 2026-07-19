from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx

from backend.config import settings
from backend.api.routes import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize shared HTTP client
    app.state.http_client = httpx.AsyncClient(timeout=120.0)
    yield
    # Cleanup on shutdown
    await app.state.http_client.aclose()

app = FastAPI(
    title="CreatorPilot AI",
    description="Multi-agent AI content production backend.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS else ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "CreatorPilot AI Backend is running."}
