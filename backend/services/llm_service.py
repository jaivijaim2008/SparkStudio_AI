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

logger = logging.getLogger("creatorpilot.llm")


class LLMService:
    """
    Thin abstraction over multiple LLM providers.

    Usage::

        llm = LLMService(client)
        text = await llm.generate("Write a poem about AI")
    """

    # Retry configuration
    MAX_RETRIES: int = 3
    BACKOFF_BASE: float = 1.5  # seconds

    def __init__(self, client: httpx.AsyncClient) -> None:
        """
        Args:
            client: A shared ``httpx.AsyncClient`` (created in app lifespan).
        """
        self._client = client
        self._provider = settings.LLM_PROVIDER
        self._model = settings.LLM_MODEL
        logger.info("LLMService initialised — provider=%s  model=%s", self._provider, self._model)

    # ── Public API ──────────────────────────────────────────────────────

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        """
        Generate a text completion from the configured LLM provider.

        Args:
            prompt: The user / instruction prompt.
            system_prompt: Optional system-level context.

        Returns:
            The generated text as a string.

        Raises:
            RuntimeError: After all retry attempts are exhausted.
        """
        last_error: Optional[Exception] = None

        for attempt in range(1, self.MAX_RETRIES + 1):
            try:
                if self._provider == "ollama":
                    return await self._generate_ollama(prompt, system_prompt)
                elif self._provider == "openai":
                    return await self._generate_openai(prompt, system_prompt)
                elif self._provider == "gemini":
                    return await self._generate_gemini(prompt, system_prompt)
                else:
                    raise ValueError(f"Unsupported LLM provider: {self._provider}")
            except Exception as exc:
                last_error = exc
                wait = self.BACKOFF_BASE ** attempt
                logger.warning(
                    "LLM call attempt %d/%d failed (%s). Retrying in %.1fs …",
                    attempt,
                    self.MAX_RETRIES,
                    str(exc)[:120],
                    wait,
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
