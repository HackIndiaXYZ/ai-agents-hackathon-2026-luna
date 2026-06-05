"""
TradeNexus API — LLM Provider Abstraction Layer.

Defines the base LLMProvider interface and concrete implementations:
- NvidiaProvider: Connects to Nvidia build API endpoints (OpenAI-compatible) using httpx
- MockProvider: Returns pre-configured or deterministic mock responses for testing
"""

import time
import logging
import asyncio
import json
import re
from abc import ABC, abstractmethod
from functools import lru_cache
import httpx
from core.config import get_settings

logger = logging.getLogger("llm_provider")
logger.setLevel(logging.INFO)


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        expect_json: bool = False,
        max_tokens: int = 500
    ) -> str:
        """Generate a text completion using the LLM."""
        pass

    @property
    def provider_name(self) -> str:
        return self.__class__.__name__


class NvidiaProvider(LLMProvider):
    """Nvidia AI Foundation Endpoints provider using HTTPX."""

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.NVIDIA_API_KEY
        if not self.api_key:
            raise RuntimeError("NVIDIA_API_KEY is not set")
        self.model = settings.NVIDIA_MODEL or "qwen/qwen3.5-397b-a17b"
        self.base_url = "https://integrate.api.nvidia.com/v1"

    @property
    def provider_name(self) -> str:
        return "NVIDIA"

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        expect_json: bool = False,
        max_tokens: int = 500
    ) -> str:
        """Call the Nvidia API to generate responses with exponential backoff retries."""
        final_system_prompt = system_prompt
        if expect_json:
            final_system_prompt += "\nRespond with ONLY valid JSON. No markdown, no explanation."

        token_estimate = (len(final_system_prompt) + len(user_prompt)) // 4

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": final_system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": max_tokens,
            "temperature": 0.2
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        retries = 3
        delay = 2.0
        start_time = time.perf_counter()

        async with httpx.AsyncClient(timeout=60.0) as client:
            for attempt in range(retries + 1):
                try:
                    response = await client.post(
                        f"{self.base_url}/chat/completions",
                        json=payload,
                        headers=headers
                    )

                    if response.status_code == 429:
                        if attempt == retries:
                            response.raise_for_status()
                        logger.warning(f"Rate limited (429). Retrying in {delay}s...")
                        await asyncio.sleep(delay)
                        delay *= 2
                        continue

                    response.raise_for_status()
                    data = response.json()
                    choice = data.get("choices", [{}])[0]
                    message = choice.get("message", {}) or {}
                    content = message.get("content") or ""
                    if not content.strip():
                        content = message.get("reasoning_content") or ""
                    if not content.strip() and isinstance(choice.get("text"), str):
                        content = choice["text"]

                    if not content or not str(content).strip():
                        finish = choice.get("finish_reason", "")
                        logger.warning(
                            f"LLM empty content (finish={finish}, attempt={attempt+1}). "
                            f"completion_tokens={data.get('usage', {}).get('completion_tokens')}"
                        )
                        if attempt < retries:
                            payload["max_tokens"] = min(payload["max_tokens"] * 2, 2048)
                            await asyncio.sleep(delay)
                            delay *= 1.5
                            continue
                        raise RuntimeError("LLM response missing content field")

                    latency = time.perf_counter() - start_time
                    logger.info(
                        f"[LLM] NVIDIA model={self.model} | tokens~{token_estimate} | latency={latency:.2f}s"
                    )
                    return content

                except httpx.HTTPStatusError as e:
                    if attempt == retries:
                        raise e
                    logger.warning(f"HTTP error {e.response.status_code}. Retrying in {delay}s...")
                    await asyncio.sleep(delay)
                    delay *= 2
                except (httpx.NetworkError, httpx.TimeoutException) as e:
                    if attempt == retries:
                        raise e
                    logger.warning(f"Network error {str(e)}. Retrying in {delay}s...")
                    await asyncio.sleep(delay)
                    delay *= 2

        raise RuntimeError("LLM request failed after max retries")


class MockProvider(LLMProvider):
    """Mock LLM provider — only when LLM_PROVIDER=mock is explicitly set."""

    @property
    def provider_name(self) -> str:
        return "MOCK"

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        expect_json: bool = False,
        max_tokens: int = 500
    ) -> str:
        latency = 0.05
        logger.info(
            f"[LLM-Mock] tokens~{(len(system_prompt) + len(user_prompt)) // 4} | latency={latency:.2f}s"
        )

        if expect_json:
            if "intent classifier" in system_prompt.lower():
                return '{"intent": "GREETING", "commodity": null, "quantity": null, "unit": null, "origin": null, "destination": null, "deal_details": null, "language": "en", "confidence": 0.95}'
            if "compliance" in user_prompt.lower() or "compliance" in system_prompt.lower():
                return '{"permits": ["APMC Transit Permit", "FSSAI Food Safety License"], "cess_fee": "1.5% of trade value", "quality_checklist": ["Moisture < 12%", "No discoloration"]}'
            if "synthesis" in system_prompt.lower() or "lucy" in system_prompt.lower():
                return '{"response_text": "Hello! I am LUCY, your TradeNexus copilot.", "voice_response": "Hello! I am Lucy, your Trade Nexus copilot.", "voice_language": "en"}'
            if "contract parser" in system_prompt.lower() or "contract details" in system_prompt.lower():
                text = user_prompt.lower()
                ctype = "sell" if any(w in text for w in ("diya", "sell", "sold", "bechna")) else "buy"
                commodity = next((c.title() for c in ["cotton", "onion", "wheat", "soybean"] if c in text), None)
                return json.dumps({
                    "type": ctype, "commodity": commodity, "quantity": 50.0,
                    "unit": "quintal", "price": None, "counterparty": None,
                    "delivery_date": None, "delivery_location": None, "payment_terms": None
                })
            return '{"canonical_name": "Cotton", "confidence": 0.95}'

        return "TradeNexus market intelligence summary (mock)."


def resolve_llm_provider_mode() -> str:
    """
    Resolve which provider to use.
    NVIDIA when API key is present unless LLM_PROVIDER=mock.
    """
    settings = get_settings()
    if settings.LLM_PROVIDER.lower() == "mock":
        return "mock"
    if settings.NVIDIA_API_KEY:
        return "nvidia"
    if settings.ENVIRONMENT.lower() == "test":
        return "mock"
    return "unconfigured"


@lru_cache()
def get_llm_provider() -> LLMProvider:
    """Factory to retrieve the active LLM provider based on settings."""
    settings = get_settings()
    mode = resolve_llm_provider_mode()

    if mode == "mock":
        logger.warning("[LLM] Provider: MOCK (explicit or test env without API key)")
        return MockProvider()

    if mode == "nvidia":
        logger.info(f"[LLM] Provider: NVIDIA | model={settings.NVIDIA_MODEL}")
        return NvidiaProvider()

    raise RuntimeError(
        "NVIDIA_API_KEY is required for Lucy orchestration. "
        "Set NVIDIA_API_KEY in .env or use LLM_PROVIDER=mock for offline tests only."
    )


async def verify_nvidia_connectivity() -> None:
    """
    Startup health check — fails loudly if NVIDIA is configured but unreachable.
  """
    mode = resolve_llm_provider_mode()
    if mode != "nvidia":
        logger.info(f"[LLM] Skipping NVIDIA connectivity check (mode={mode})")
        return

    settings = get_settings()
    provider = NvidiaProvider()
    logger.info(f"[LLM] Verifying NVIDIA connectivity (model={provider.model})...")

    try:
        response = await provider.complete(
            "You are a health check assistant.",
            "Reply with exactly: OK",
            expect_json=False,
            max_tokens=16,
        )
        if not response or not response.strip():
            raise RuntimeError("Empty response from NVIDIA API")
        logger.info(f"[LLM] NVIDIA connected successfully | probe={response.strip()[:40]!r}")
    except Exception as exc:
        logger.error(f"[LLM] NVIDIA connectivity check FAILED: {exc}")
        raise RuntimeError(
            f"NVIDIA API connectivity failed. Lucy cannot orchestrate without a working LLM. Detail: {exc}"
        ) from exc
