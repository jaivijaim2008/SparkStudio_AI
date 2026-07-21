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
    LLM_PROVIDER: Literal["ollama", "openai", "gemini", "groq", "openrouter"] = Field(
        default="ollama",
        description="Which LLM backend to use: ollama, openai, gemini, groq, or openrouter",
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
    GROQ_API_KEY: str = Field(default="", description="Groq API key #1")
    GROQ_API_KEY_2: str = Field(default="", description="Groq API key #2 (optional, for key rotation)")
    GROQ_API_KEY_3: str = Field(default="", description="Groq API key #3 (optional, for key rotation)")
    GROQ_API_KEY_4: str = Field(default="", description="Groq API key #4 (optional, for key rotation)")
    GROQ_API_KEY_5: str = Field(default="", description="Groq API key #5 (optional, for key rotation)")
    OPENROUTER_API_KEY: str = Field(
        default="",
        description="OpenRouter API key (required when LLM_PROVIDER=openrouter)",
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

    @property
    def groq_keys(self) -> list[str]:
        """Return all configured Groq API keys (filters out empty strings)."""
        candidates = [
            self.GROQ_API_KEY,
            self.GROQ_API_KEY_2,
            self.GROQ_API_KEY_3,
            self.GROQ_API_KEY_4,
            self.GROQ_API_KEY_5,
        ]
        return [k for k in candidates if k.strip()]

    model_config = {
        "env_file": "backend/.env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }


# Singleton instance used throughout the application
settings = Settings()
