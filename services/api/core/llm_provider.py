"""
TradeNexus API — LLM Provider Abstraction Layer.

Defines the base LLMProvider interface and concrete implementations:
- NvidiaProvider: Connects to Nvidia build API endpoints (OpenAI-compatible)
- MockProvider: Returns pre-configured or deterministic mock responses for testing
"""

from abc import ABC, abstractmethod
from openai import AsyncOpenAI
from core.config import get_settings


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    async def generate(self, system_prompt: str, user_prompt: str, temperature: float = 0.2) -> str:
        """Generate a response using the LLM."""
        pass


class NvidiaProvider(LLMProvider):
    """Nvidia AI Foundation Endpoints provider."""

    def __init__(self):
        settings = get_settings()
        self.client = AsyncOpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=settings.NVIDIA_API_KEY
        )
        self.model = settings.NVIDIA_MODEL

    async def generate(self, system_prompt: str, user_prompt: str, temperature: float = 0.2) -> str:
        """Call the Nvidia API to generate responses with qwen3.5."""
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=temperature
        )
        return response.choices[0].message.content


class MockProvider(LLMProvider):
    """Mock LLM provider for local development and testing."""

    async def generate(self, system_prompt: str, user_prompt: str, temperature: float = 0.2) -> str:
        """Return a structured mock synthesis advisory plan."""
        return (
            "--- MOCK ADVISORY PLAN ---\n"
            "Commodity: Resolved Successfully.\n"
            "Market Recommendation: High Profit Spread identified in Ahmedabad Mandi.\n"
            "Dispatch Advice: Dispatch in 24 hours to maximize margins.\n"
            "Compliance: Cleared (Standard APMC & FSSAI permits valid).\n"
            "-------------------------"
        )


def get_llm_provider() -> LLMProvider:
    """Factory to retrieve the active LLM provider based on settings."""
    settings = get_settings()
    provider_type = settings.LLM_PROVIDER.lower()
    if provider_type == "nvidia":
        return NvidiaProvider()
    return MockProvider()
