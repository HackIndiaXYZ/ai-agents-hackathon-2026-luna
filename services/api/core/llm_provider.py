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


class NvidiaProvider(LLMProvider):
    """Nvidia AI Foundation Endpoints provider using HTTPX."""

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.NVIDIA_API_KEY
        self.model = settings.NVIDIA_MODEL or "qwen/qwen3.5-397b-a17b"
        self.base_url = "https://integrate.api.nvidia.com/v1"

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        expect_json: bool = False,
        max_tokens: int = 500
    ) -> str:
        """Call the Nvidia API to generate responses with exponential backoff retries."""
        # 1. Modify system prompt if expect_json is True
        final_system_prompt = system_prompt
        if expect_json:
            final_system_prompt += "\nRespond with ONLY valid JSON. No markdown, no explanation."

        # 2. Input token estimate (1 token approx 4 characters rule-of-thumb)
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

        # 3. HTTPX request with exponential backoff (max 3 retries)
        retries = 3
        delay = 2.0
        start_time = time.perf_counter()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
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
                    message = choice.get("message", {})
                    content = message.get("content") or message.get("reasoning_content", "")
                    
                    if not content:
                        logger.warning(f"LLM response missing content. Full response: {data}")
                        raise RuntimeError("LLM response missing content field")
                    
                    # Log model, input token estimate, and latency
                    latency = time.perf_counter() - start_time
                    logger.info(
                        f"[LLM] Model: {self.model} | Input Token Est: {token_estimate} | Latency: {latency:.4f}s"
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
    """Mock LLM provider for local development and testing without API key/quota constraints."""

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        expect_json: bool = False,
        max_tokens: int = 500
    ) -> str:
        """Return hardcoded plausible responses based on context."""
        latency = 0.05
        logger.info(f"[LLM-Mock] Input token est: {(len(system_prompt) + len(user_prompt)) // 4} | Latency: {latency:.4f}s")
        
        if expect_json:
            if "intent classifier" in system_prompt.lower():
                return '{"intent": "GREETING", "commodity": null, "quantity": null, "unit": null, "origin": null, "destination": null, "deal_details": null, "language": "en", "confidence": 0.95}'
            if "compliance" in user_prompt.lower() or "compliance" in system_prompt.lower():
                return '{"permits": ["APMC Transit Permit", "FSSAI Food Safety License"], "cess_fee": "1.5% of trade value", "quality_checklist": ["Moisture < 12%", "No discoloration"]}'
            if "synthesis" in system_prompt.lower() or "lucy" in system_prompt.lower():
                return '{"response_text": "Hello! Welcome to **TradeNexus**, your autonomous trade operations copilot. I am **LUCY**, ready to assist you today.\\n\\nHere is a quick snapshot of your current inventory:\\n\\n| Commodity | Quantity (Quintal) |\\n| :--- | :--- |\\n| **Cotton** | 600.0 |\\n| **Onion** | 200.0 |\\n| **Wheat** | 150.0 |\\n| **Soybean** | 120.0 |\\n| **Pigeon Pea** | 80.0 |\\n\\nHow can I assist you today? You can ask me to check market prices, initiate a deal, or analyze trends for any of these commodities.", "voice_response": "Hello! Welcome to TradeNexus. I am LUCY, your autonomous trade operations copilot. Here is your current inventory: Cotton 600 quintal, Onion 200 quintal, Wheat 150 quintal, Soybean 120 quintal, Pigeon Pea 80 quintal. How can I assist you today?"}'
            if "contract parser" in system_prompt.lower() or "contract details" in system_prompt.lower():
                text = user_prompt.lower()
                ctype = "buy"
                if "diya" in text or "sell" in text or "sold" in text:
                    ctype = "sell"
                elif "liya" in text or "buy" in text or "bought" in text or "purchase" in text:
                    ctype = "buy"
                
                commodity = None
                for c in ["cotton", "onion", "wheat", "soybean", "pigeon pea", "paddy"]:
                    if c in text:
                        commodity = c.title()
                        break
                
                counterparty = None
                cp_match = re.search(r'([a-zA-Z]+)\s+se', user_prompt)
                if cp_match:
                    counterparty = cp_match.group(1).strip().title()
                else:
                    cp_match = re.search(r'(?:with|to|from)\s+([a-zA-Z]+)', user_prompt, re.IGNORECASE)
                    if cp_match:
                        counterparty = cp_match.group(1).strip().title()
                
                quantity = None
                unit = "quintal"
                qty_match = re.search(r'(\d+(?:\.\d+)?)\s*(quintal|quintals|q|kg|kgs|ton|tons)?', text)
                if qty_match:
                    quantity = float(qty_match.group(1))
                    if qty_match.group(2):
                        u = qty_match.group(2)
                        if u in ["kg", "kgs"]:
                            unit = "kg"
                        elif u in ["ton", "tons"]:
                            unit = "ton"
                        else:
                            unit = "quintal"
                
                price = None
                price_match = re.search(r'(?:rs\.?|rupaye|rupees|inr|@)\s*(\d+(?:\.\d+)?)', text)
                if not price_match:
                    price_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:rs\.?|rupaye|rupees|inr)', text)
                if price_match:
                    price = float(price_match.group(1))
                
                delivery_date = None
                if "friday" in text:
                    delivery_date = "2026-06-05"
                elif "tomorrow" in text:
                    delivery_date = "2026-06-03"
                elif "monday" in text:
                    delivery_date = "2026-06-08"
                
                res_dict = {
                    "type": ctype,
                    "commodity": commodity,
                    "quantity": quantity,
                    "unit": unit,
                    "price": price,
                    "counterparty": counterparty,
                    "delivery_date": delivery_date,
                    "delivery_location": None,
                    "payment_terms": None
                }
                return json.dumps(res_dict)
            return '{"canonical_name": "Cotton", "confidence": 0.95}'
        
        return (
            "The Cotton market in Maharashtra shows resilient demand, with modal prices at Yavatmal "
            "reaching ₹7,500/Quintal, which is 8% above the 10-day average. Regional traders should consider prioritizing "
            "supply lines to these high-performing hubs where net margins are highly favorable."
        )


def get_llm_provider() -> LLMProvider:
    """Factory to retrieve the active LLM provider based on settings."""
    settings = get_settings()
    
    # Used when ENVIRONMENT=test or LLM_PROVIDER=mock
    if settings.ENVIRONMENT.lower() == "test" or settings.LLM_PROVIDER.lower() == "mock":
        return MockProvider()
        
    return NvidiaProvider()
