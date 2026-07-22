"""
CreatorPilot AI — Groq API Key Rotator.

Manages a pool of Groq API keys and automatically rotates to the next
available key when one hits a 429 rate limit. With 5 keys you get 5x
the throughput with near-zero waiting.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Optional

logger = logging.getLogger("creatorpilot.key_rotator")


class GroqKeyRotator:
    """
    Round-robin Groq API key pool with automatic cooldown tracking.

    When a key receives a 429, it's marked as 'cooling down' for the
    duration specified in the Retry-After header (or 60s by default).
    The rotator instantly picks the next available key.
    """

    def __init__(self, keys: list[str]) -> None:
        if not keys:
            raise ValueError("At least one Groq API key is required.")
        self._keys = [k.strip() for k in keys if k.strip()]
        self._cooldowns: dict[str, float] = {}  # key -> unix timestamp when it cools down
        self._lock = asyncio.Lock()
        self._index = 0
        logger.info("GroqKeyRotator initialized with %d key(s).", len(self._keys))

    @property
    def key_count(self) -> int:
        return len(self._keys)

    async def get_available_key(self) -> Optional[str]:
        """
        Return the next available (non-rate-limited) key.
        If all keys are cooling down, waits for the soonest one to recover.
        """
        async with self._lock:
            now = time.monotonic()

            # Try each key starting from current index
            for i in range(len(self._keys)):
                idx = (self._index + i) % len(self._keys)
                key = self._keys[idx]
                cooldown_until = self._cooldowns.get(key, 0)

                if now >= cooldown_until:
                    # This key is available — advance index for next call
                    self._index = (idx + 1) % len(self._keys)
                    return key

            # All keys are cooling down — find the one that recovers soonest
            soonest_key = min(self._keys, key=lambda k: self._cooldowns.get(k, 0))
            wait_time = self._cooldowns[soonest_key] - now
            if wait_time > 10.0:
                raise RuntimeError(
                    f"All Groq keys are rate-limited with long cooldowns. Wait time: {wait_time:.1f}s"
                )
            logger.warning(
                "All %d Groq keys are rate-limited. Waiting %.1fs for soonest key to recover.",
                len(self._keys), wait_time,
            )

        # Wait outside the lock
        if wait_time > 0:
            await asyncio.sleep(wait_time + 0.5)  # small buffer

        return await self.get_available_key()

    async def mark_rate_limited(self, key: str, retry_after: float = 60.0) -> None:
        """Mark a key as rate-limited for `retry_after` seconds."""
        async with self._lock:
            self._cooldowns[key] = time.monotonic() + retry_after
            logger.warning(
                "Key ...%s marked as rate-limited for %.1fs.",
                key[-8:], retry_after,
            )

    def status(self) -> list[dict]:
        """Return status of all keys for debugging."""
        now = time.monotonic()
        result = []
        for key in self._keys:
            cooldown_until = self._cooldowns.get(key, 0)
            result.append({
                "key_suffix": key[-8:],
                "available": now >= cooldown_until,
                "cooldown_remaining": max(0, cooldown_until - now),
            })
        return result
