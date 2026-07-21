"""
CreatorPilot AI — LLM Service Abstraction Layer.

Provides a unified interface to generate text from any supported LLM
backend (Ollama, OpenAI, Gemini).  Includes automatic retry with
exponential backoff.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Optional

import httpx

from backend.config import settings
from backend.services.key_rotator import GroqKeyRotator

logger = logging.getLogger("creatorpilot.llm")


class LLMService:
    """
    Thin abstraction over multiple LLM providers.

    Usage::

        llm = LLMService(client)
        text = await llm.generate("Write a poem about AI")
    """

    # Retry configuration
    MAX_RETRIES: int = 5
    BACKOFF_BASE: float = 2.0  # seconds

    # Rate-limit: limit concurrent LLM calls
    _semaphore: asyncio.Semaphore = asyncio.Semaphore(5)

    def __init__(self, client: httpx.AsyncClient) -> None:
        """
        Args:
            client: A shared ``httpx.AsyncClient`` (created in app lifespan).
        """
        self._client = client
        self._provider = settings.LLM_PROVIDER
        self._model = settings.LLM_MODEL

        # Initialize Groq key rotator with all configured keys
        groq_keys = settings.groq_keys
        if groq_keys:
            self._groq_rotator = GroqKeyRotator(groq_keys)
            logger.info(
                "LLMService initialised — provider=%s  model=%s  groq_keys=%d",
                self._provider, self._model, len(groq_keys)
            )
        else:
            self._groq_rotator = None
            logger.info("LLMService initialised — provider=%s  model=%s", self._provider, self._model)

    # ── Public API ──────────────────────────────────────────────────────

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        """
        Generate a text completion from the configured LLM provider.
        Uses a semaphore to serialize calls and avoid Groq rate limits.
        """
        async with self._semaphore:
            return await self._generate_with_retry(prompt, system_prompt)

    async def _generate_with_retry(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        """Internal retry loop — runs inside the semaphore."""
        last_error: Optional[Exception] = None

        for attempt in range(1, self.MAX_RETRIES + 1):
            try:
                if self._provider == "ollama":
                    return await self._generate_ollama(prompt, system_prompt)
                elif self._provider == "openai":
                    return await self._generate_openai(prompt, system_prompt)
                elif self._provider == "gemini":
                    return await self._generate_gemini(prompt, system_prompt)
                elif self._provider == "groq":
                    return await self._generate_groq(prompt, system_prompt)
                elif self._provider == "openrouter":
                    return await self._generate_openrouter(prompt, system_prompt)
                else:
                    raise ValueError(f"Unsupported LLM provider: {self._provider}")
            except httpx.HTTPStatusError as exc:
                # Don't retry on auth/config errors — fail immediately
                if exc.response.status_code in (400, 401, 403):
                    error_body = exc.response.text[:300]
                    logger.error(
                        "LLM call failed with %d (non-retryable): %s",
                        exc.response.status_code, error_body,
                    )
                    raise RuntimeError(
                        f"LLM API error {exc.response.status_code}: {error_body}"
                    ) from exc
                # Rate limit (429): use Retry-After header if available
                if exc.response.status_code == 429:
                    retry_after = exc.response.headers.get("retry-after")
                    wait = float(retry_after) if retry_after else min(self.BACKOFF_BASE ** attempt, 30)
                    logger.warning(
                        "Rate limited (429). Waiting %.1fs (attempt %d/%d)…",
                        wait, attempt, self.MAX_RETRIES,
                    )
                else:
                    wait = min(self.BACKOFF_BASE ** attempt, 30)
                    logger.warning(
                        "LLM call attempt %d/%d failed (%d). Retrying in %.1fs…",
                        attempt, self.MAX_RETRIES, exc.response.status_code, wait,
                    )
                last_error = exc
                await asyncio.sleep(wait)
            except Exception as exc:
                last_error = exc
                wait = min(self.BACKOFF_BASE ** attempt, 30)
                logger.warning(
                    "LLM call attempt %d/%d failed (%s). Retrying in %.1fs…",
                    attempt, self.MAX_RETRIES, str(exc)[:120], wait,
                )
                await asyncio.sleep(wait)

        raise RuntimeError(
            f"LLM generation failed after {self.MAX_RETRIES} attempts: {last_error}"
        )

    # ── Ollama ──────────────────────────────────────────────────────────

    async def _generate_ollama(
        self, prompt: str, system_prompt: Optional[str]
    ) -> str:
        """Call the Ollama ``/api/generate`` endpoint."""
        url = f"{settings.OLLAMA_BASE_URL}/api/generate"
        payload: dict = {
            "model": self._model,
            "prompt": prompt,
            "stream": False,
        }
        if system_prompt:
            payload["system"] = system_prompt

        logger.debug("Ollama request → %s  model=%s  prompt_len=%d", url, self._model, len(prompt))
        response = await self._client.post(url, json=payload, timeout=120.0)
        response.raise_for_status()

        data = response.json()
        return data.get("response", "")

    # ── OpenAI ──────────────────────────────────────────────────────────

    async def _generate_openai(
        self, prompt: str, system_prompt: Optional[str]
    ) -> str:
        """Call the OpenAI Chat Completions API."""
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not set but LLM_PROVIDER is 'openai'")

        url = "https://api.openai.com/v1/chat/completions"
        messages: list[dict] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self._model if self._model != "qwen2.5:7b" else "gpt-4o-mini",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 4096,
        }

        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }

        logger.debug("OpenAI request → model=%s  messages=%d", payload["model"], len(messages))
        response = await self._client.post(url, json=payload, headers=headers, timeout=90.0)
        response.raise_for_status()

        data = response.json()
        return data["choices"][0]["message"]["content"]

    # ── Gemini ──────────────────────────────────────────────────────────

    async def _generate_gemini(
        self, prompt: str, system_prompt: Optional[str]
    ) -> str:
        """Call the Google Gemini ``generateContent`` API."""
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set but LLM_PROVIDER is 'gemini'")

        model_id = self._model if self._model != "qwen2.5:7b" else "gemini-2.0-flash"
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}"
            f":generateContent?key={settings.GEMINI_API_KEY}"
        )

        contents: list[dict] = []
        if system_prompt:
            contents.append({"role": "user", "parts": [{"text": f"[System Instructions]\n{system_prompt}"}]})
            contents.append({"role": "model", "parts": [{"text": "Understood. I will follow those instructions."}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 4096,
            },
        }

        logger.debug("Gemini request → model=%s", model_id)
        response = await self._client.post(url, json=payload, timeout=90.0)
        response.raise_for_status()

        data = response.json()
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError) as exc:
            raise RuntimeError(f"Unexpected Gemini response structure: {json.dumps(data)[:300]}") from exc

    # ── Groq ────────────────────────────────────────────────────────────

    async def _generate_groq(
        self, prompt: str, system_prompt: Optional[str]
    ) -> str:
        """Call the Groq API using key rotation — instantly switches keys on 429."""
        if not self._groq_rotator:
            raise ValueError("No GROQ_API_KEY configured. Add at least one key to .env")

        url = "https://api.groq.com/openai/v1/chat/completions"
        messages: list[dict] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        model_name = self._model
        if model_name in ["qwen2.5:7b", "gemini-2.0-flash"]:
            model_name = "llama-3.3-70b-versatile"

        payload = {
            "model": model_name,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 4096,
        }

        # Try every key in the pool before giving up
        for attempt in range(self._groq_rotator.key_count + 1):
            api_key = await self._groq_rotator.get_available_key()
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            logger.debug("Groq request → model=%s key=...%s", model_name, api_key[-8:])
            try:
                response = await self._client.post(url, json=payload, headers=headers, timeout=90.0)
                if response.status_code == 429:
                    retry_after = float(response.headers.get("retry-after", 60))
                    await self._groq_rotator.mark_rate_limited(api_key, retry_after)
                    logger.warning("Key ...%s rate limited, rotating to next key.", api_key[-8:])
                    continue  # immediately try next key
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code == 429:
                    retry_after = float(exc.response.headers.get("retry-after", 60))
                    await self._groq_rotator.mark_rate_limited(api_key, retry_after)
                    continue
                raise

        raise RuntimeError("All Groq API keys are rate-limited. Try again in a minute.")


    # ── OpenRouter ───────────────────────────────────────────────────────

    async def _generate_openrouter(
        self, prompt: str, system_prompt: Optional[str]
    ) -> str:
        """Call OpenRouter (OpenAI-compatible) API — supports hundreds of models."""
        if not settings.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is not set but LLM_PROVIDER is 'openrouter'")

        url = "https://openrouter.ai/api/v1/chat/completions"
        messages: list[dict] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self._model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 4096,
        }

        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://creatorpilot.ai",
            "X-Title": "CreatorPilot AI",
        }

        logger.debug("OpenRouter request → model=%s  messages=%d", self._model, len(messages))
        response = await self._client.post(url, json=payload, headers=headers, timeout=120.0)
        response.raise_for_status()

        data = response.json()
        return data["choices"][0]["message"]["content"]
