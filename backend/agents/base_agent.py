"""
CreatorPilot AI — Base Agent (Abstract).

Every AI agent in the pipeline extends this class.  It provides shared
helpers for prompt loading, JSON extraction, and structured logging.
"""

from __future__ import annotations

import json
import logging
import re
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Optional

from backend.models.schemas import ProjectInput
from backend.services.llm_service import LLMService

logger = logging.getLogger("creatorpilot.agents")

# Resolve the prompts directory once at import time
_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


class BaseAgent(ABC):
    """
    Abstract base class for every CreatorPilot AI agent.

    Subclasses must implement :meth:`execute` which receives the user's
    ``ProjectInput`` and an optional context dict populated by earlier
    agents in the pipeline.
    """

    def __init__(self, llm: LLMService, agent_name: str) -> None:
        """
        Args:
            llm: Shared LLM service instance.
            agent_name: Human-readable agent identifier (used in logs & events).
        """
        self.llm = llm
        self.agent_name = agent_name
        self._logger = logging.getLogger(f"creatorpilot.agents.{agent_name}")

    # ── Abstract ────────────────────────────────────────────────────────

    @abstractmethod
    async def execute(
        self,
        project_input: ProjectInput,
        context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        Run the agent's logic and return a structured dict.

        Args:
            project_input: The user's original project parameters.
            context: Outputs from earlier agents keyed by agent name.

        Returns:
            A dict matching the agent's Pydantic output schema.
        """
        ...

    # ── Prompt Loading ──────────────────────────────────────────────────

    def _load_prompt(self, prompt_file: str) -> str:
        """
        Load a prompt template from the ``prompts/`` directory.

        Args:
            prompt_file: Filename relative to the prompts folder,
                         e.g. ``"research_prompt.txt"``.

        Returns:
            The prompt text as a string.

        Raises:
            FileNotFoundError: If the file does not exist.
        """
        path = _PROMPTS_DIR / prompt_file
        if not path.exists():
            self._logger.error("Prompt file not found: %s", path)
            raise FileNotFoundError(f"Prompt file not found: {path}")
        text = path.read_text(encoding="utf-8")
        self._logger.debug("Loaded prompt from %s (%d chars)", prompt_file, len(text))
        return text

    # ── JSON Extraction ─────────────────────────────────────────────────

    @staticmethod
    def _parse_json_response(response: str) -> dict[str, Any]:
        """
        Extract a JSON object from an LLM response.

        Handles three common patterns:
        1. Raw JSON string
        2. JSON wrapped in markdown code fences (```json ... ```)
        3. JSON embedded in prose — we find the first ``{`` and last ``}``

        Returns:
            Parsed dict.

        Raises:
            ValueError: If no valid JSON can be extracted.
        """
        text = response.strip()

        # Strategy 1: Try the raw string directly
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Strategy 2: Strip markdown code fences
        fence_pattern = re.compile(r"```(?:json)?\s*\n?(.*?)\n?\s*```", re.DOTALL)
        match = fence_pattern.search(text)
        if match:
            try:
                return json.loads(match.group(1).strip())
            except json.JSONDecodeError:
                pass

        # Strategy 3: Find the outermost { ... }
        first_brace = text.find("{")
        last_brace = text.rfind("}")
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            try:
                return json.loads(text[first_brace : last_brace + 1])
            except json.JSONDecodeError:
                pass

        raise ValueError(
            f"Could not extract JSON from LLM response (first 300 chars): {text[:300]}"
        )

    # ── Helpers ─────────────────────────────────────────────────────────

    def _build_context_block(self, context: Optional[dict[str, Any]]) -> str:
        """Serialise prior-agent outputs into a context string for the prompt."""
        if not context:
            return ""
        parts: list[str] = ["\n--- CONTEXT FROM PREVIOUS AGENTS ---"]
        for agent_name, data in context.items():
            serialised = json.dumps(data, indent=2, default=str)
            parts.append(f"\n[{agent_name.upper()}]\n{serialised}")
        parts.append("\n--- END CONTEXT ---\n")
        return "\n".join(parts)
