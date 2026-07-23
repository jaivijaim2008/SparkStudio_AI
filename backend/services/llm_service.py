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
        
        # Shared connection timeout watchdog: fail quickly on connection issues (5s connect timeout), 90s response timeout
        self.timeout = httpx.Timeout(90.0, connect=5.0)

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

    async def generate_multimodal(
        self,
        prompt: str,
        file_bytes: bytes,
        mime_type: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        """
        Generate a text completion with an accompanying file/image using Gemini multimodal inputs.
        """
        async with self._semaphore:
            return await self._generate_gemini_multimodal(prompt, file_bytes, mime_type, system_prompt)

    async def _generate_with_retry(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        """Internal retry loop with provider fallback — runs inside the semaphore."""
        # Determine the order of providers to try
        primary_provider = self._provider
        providers_to_try = [primary_provider]
        
        alternatives = ["gemini", "groq", "openai", "openrouter", "ollama"]
        for alt in alternatives:
            if alt not in providers_to_try:
                # Check if the alternative provider has keys/config configured
                if alt == "gemini" and settings.gemini_keys:
                    providers_to_try.append(alt)
                elif alt == "groq" and settings.groq_keys:
                    providers_to_try.append(alt)
                elif alt == "openai" and settings.OPENAI_API_KEY:
                    providers_to_try.append(alt)
                elif alt == "openrouter" and settings.OPENROUTER_API_KEY:
                    providers_to_try.append(alt)
                elif alt == "ollama":
                    providers_to_try.append(alt)

        last_error: Optional[Exception] = None
        
        for provider in providers_to_try:
            logger.info("Attempting generation using LLM provider: %s", provider)
            # Try to generate using the selected provider
            try:
                if provider == "ollama":
                    return await self._generate_ollama(prompt, system_prompt)
                elif provider == "openai":
                    return await self._generate_openai(prompt, system_prompt)
                elif provider == "gemini":
                    return await self._generate_gemini(prompt, system_prompt)
                elif provider == "groq":
                    return await self._generate_groq(prompt, system_prompt)
                elif provider == "openrouter":
                    return await self._generate_openrouter(prompt, system_prompt)
            except Exception as exc:
                logger.warning("LLM provider %s failed: %s", provider, exc)
                last_error = exc
                # Continue to the next provider in the fallback chain

        raise RuntimeError(
            f"LLM generation failed for all attempted providers {providers_to_try}. Last error: {last_error}"
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
        response = await self._client.post(url, json=payload, timeout=self.timeout)
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
        response = await self._client.post(url, json=payload, headers=headers, timeout=self.timeout)
        response.raise_for_status()

        data = response.json()
        return data["choices"][0]["message"]["content"]

    # ── Gemini ──────────────────────────────────────────────────────────

    async def _generate_gemini(
        self, prompt: str, system_prompt: Optional[str]
    ) -> str:
        """Call the Google Gemini ``generateContent`` API with key fallback."""
        keys = settings.gemini_keys
        if not keys:
            raise ValueError("No GEMINI_API_KEY configured. Add at least one key to .env")

        # Map legacy/unsupported models to gemini-flash-latest (resolves to the latest stable Flash model)
        model_id = self._model
        if model_id in ["qwen2.5:7b", "llama-3.3-70b-versatile", "gemini-1.5-flash", "gemini-2.0-flash"]:
            model_id = "gemini-flash-latest"
        
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

        last_error = None
        for idx, api_key in enumerate(keys):
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}"
                f":generateContent?key={api_key}"
            )
            logger.debug("Gemini request → model=%s (using key index %d)", model_id, idx)
            try:
                response = await self._client.post(url, json=payload, timeout=self.timeout)
                response.raise_for_status()
                data = response.json()
                try:
                    return data["candidates"][0]["content"]["parts"][0]["text"]
                except (KeyError, IndexError) as exc:
                    raise RuntimeError(f"Unexpected Gemini response structure: {json.dumps(data)[:300]}") from exc
            except httpx.HTTPStatusError as exc:
                logger.warning(
                    "Gemini call with key index %d failed (%d). Error: %s",
                    idx, exc.response.status_code, exc.response.text[:200]
                )
                last_error = exc
            except Exception as exc:
                logger.warning("Gemini call with key index %d failed: %s", idx, exc)
                last_error = exc

        raise RuntimeError(f"All configured Gemini API keys failed. Last error: {last_error}")

    async def _generate_gemini_multimodal(
        self,
        prompt: str,
        file_bytes: bytes,
        mime_type: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        """Call the Google Gemini API with multimodal input (text prompt + binary file)."""
        keys = settings.gemini_keys
        if not keys:
            raise ValueError("No GEMINI_API_KEY configured. Add at least one key to .env")

        import base64
        file_b64 = base64.b64encode(file_bytes).decode("utf-8")

        model_id = "gemini-flash-latest"

        contents: list[dict] = []
        if system_prompt:
            contents.append({"role": "user", "parts": [{"text": f"[System Instructions]\n{system_prompt}"}]})
            contents.append({"role": "model", "parts": [{"text": "Understood. I will follow those instructions."}]})
        
        contents.append({
            "role": "user",
            "parts": [
                {
                    "inlineData": {
                        "mimeType": mime_type,
                        "data": file_b64
                    }
                },
                {
                    "text": prompt
                }
            ]
        })

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 4096,
            },
        }

        last_error = None
        for idx, api_key in enumerate(keys):
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}"
                f":generateContent?key={api_key}"
            )
            logger.debug("Gemini multimodal request → model=%s (using key index %d)", model_id, idx)
            try:
                response = await self._client.post(url, json=payload, timeout=self.timeout)
                response.raise_for_status()
                data = response.json()
                try:
                    return data["candidates"][0]["content"]["parts"][0]["text"]
                except (KeyError, IndexError) as exc:
                    raise RuntimeError(f"Unexpected Gemini response structure: {json.dumps(data)[:300]}") from exc
            except httpx.HTTPStatusError as exc:
                logger.warning(
                    "Gemini multimodal call with key index %d failed (%d). Error: %s",
                    idx, exc.response.status_code, exc.response.text[:200]
                )
                last_error = exc
            except Exception as exc:
                logger.warning("Gemini multimodal call with key index %d failed: %s", idx, exc)
                last_error = exc

        raise RuntimeError(f"All configured Gemini API keys failed for multimodal call. Last error: {last_error}")

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
                response = await self._client.post(url, json=payload, headers=headers, timeout=self.timeout)
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
        response = await self._client.post(url, json=payload, headers=headers, timeout=self.timeout)
        response.raise_for_status()

        data = response.json()
        return data["choices"][0]["message"]["content"]
