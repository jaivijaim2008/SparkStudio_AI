"""
CreatorPilot AI — Application Configuration.

Uses pydantic-settings to load configuration from environment variables
with sensible defaults for local development and demo mode.
"""

from typing import Literal
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    All settings have sensible defaults so the app can run in demo mode
    without any .env file or external services.
    """

    # ── LLM Provider Configuration ──────────────────────────────────────
    LLM_PROVIDER: Literal["ollama", "openai", "gemini"] = Field(
        default="ollama",
        description="Which LLM backend to use: ollama, openai, or gemini",
    )
    OLLAMA_BASE_URL: str = Field(
        default="http://localhost:11434",
        description="Base URL for the Ollama API server",
    )
    LLM_MODEL: str = Field(
        default="qwen2.5:7b",
        description="Model name to use for generation (Ollama model tag or OpenAI model ID)",
    )
    OPENAI_API_KEY: str = Field(
        default="",
        description="OpenAI API key (required when LLM_PROVIDER=openai)",
    )
    GEMINI_API_KEY: str = Field(
        default="",
        description="Google Gemini API key (required when LLM_PROVIDER=gemini)",
    )

    # ── Supabase (optional, for future persistence) ─────────────────────
    SUPABASE_URL: str = Field(
        default="",
        description="Supabase project URL",
    )
    SUPABASE_KEY: str = Field(
        default="",
        description="Supabase anon/service-role key",
    )

    # ── Application Behaviour ───────────────────────────────────────────
    DEMO_MODE: bool = Field(
        default=True,
        description="When True, agents return sample data instead of calling LLM",
    )
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:5173,http://localhost:5174",
        description="Comma-separated list of allowed CORS origins",
    )

    # ── Server ──────────────────────────────────────────────────────────
    HOST: str = Field(default="0.0.0.0", description="Bind host")
    PORT: int = Field(default=8000, description="Bind port")

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse the comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }


# Singleton instance used throughout the application
settings = Settings()
