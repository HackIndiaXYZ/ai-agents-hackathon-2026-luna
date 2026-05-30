"""
TradeNexus — Data.gov.in API client.

Fetches commodity market data from the Indian government's open data platform (data.gov.in)
with robust Redis caching, parallel rate-limited fetches, and mock fallback.
"""

import json
import logging
import datetime
import asyncio
import httpx
from core.config import get_settings
from core.redis_client import get_redis_client

logger = logging.getLogger("datagov_client")
logger.setLevel(logging.INFO)

class DataGovClient:
    """Client for fetching commodity market data from data.gov.in."""

    BASE_URL = "https://api.data.gov.in/resource"
    RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"

    # Canonical list of 20 key commodities tracked on the platform
    TRACKED_COMMODITIES = [
        "Cotton", "Wheat", "Rice", "Soybean", "Turmeric",
        "Chilli", "Groundnut", "Sugarcane", "Onion", "Mustard",
        "Chickpea", "Pigeon Pea", "Maize", "Sorghum", "Pearl Millet",
        "Sunflower", "Tomato", "Potato", "Cumin", "Coriander"
    ]

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.DATA_GOV_API_KEY
        self.redis = get_redis_client()

    async def fetch_prices(self, commodity: str, state: str = None, limit: int = 100) -> list[dict]:
        """
        Fetch market prices for a given commodity and state from data.gov.in.
        Caches results in Redis with a 4-hour TTL.
        """
        today = datetime.date.today().isoformat()
        state_str = state if state else ""
        redis_key = f"prices:{commodity}:{state_str}:{today}"

        # 1. Check Redis cache first
        try:
            cached_data = await self.redis.get(redis_key)
            if cached_data:
                logger.info(f"Cache hit for key {redis_key}")
                return json.loads(cached_data)
        except Exception as e:
            logger.warning(f"Failed to fetch from Redis cache: {e}")

        # 2. Call API if cache miss
        params = {
            "api-key": self.api_key,
            "format": "json",
            "limit": limit,
        }
        if state:
            params["filters[state.keyword]"] = state
        if commodity:
            params["filters[commodity]"] = commodity

        url = f"{self.BASE_URL}/{self.RESOURCE_ID}"

        try:
            if not self.api_key:
                logger.warning("DATA_GOV_API_KEY not set. Using mock fallback records.")
                fallback_records = self._generate_mock_records(commodity, state)
                normalized = [self.normalize_record(r) for r in fallback_records]
                return normalized

            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url, params=params)
                
                if response.status_code == 404:
                    logger.warning(f"Resource {self.RESOURCE_ID} returned 404. Using mock fallback records.")
                    fallback_records = self._generate_mock_records(commodity, state)
                    normalized = [self.normalize_record(r) for r in fallback_records]
                    return normalized
                
                response.raise_for_status()
                data = response.json()
                raw_records = data.get("records") or []
                normalized = [self.normalize_record(r) for r in raw_records]

                # 3. Cache in Redis
                try:
                    await self.redis.set(redis_key, json.dumps(normalized), ex=14400)
                except Exception as e:
                    logger.warning(f"Failed to cache to Redis: {e}")

                return normalized

        except Exception as e:
            logger.error(f"Error calling data.gov.in for commodity {commodity}: {e}")
            fallback_records = self._generate_mock_records(commodity, state)
            return [self.normalize_record(r) for r in fallback_records]

    async def fetch_all_tracked(self) -> list[dict]:
        """
        Fetches prices for all 20 canonical commodities in parallel.
        Enforces a rate limit of maximum 5 concurrent requests using asyncio.Semaphore.
        """
        sem = asyncio.Semaphore(5)

        async def fetch_with_semaphore(commodity: str) -> list[dict]:
            async with sem:
                try:
                    return await self.fetch_prices(commodity=commodity)
                except Exception as e:
                    logger.error(f"Failed concurrent fetch for {commodity}: {e}")
                    return []

        tasks = [fetch_with_semaphore(c) for c in self.TRACKED_COMMODITIES]
        results = await asyncio.gather(*tasks)

        # Flatten list of lists
        flat_results = []
        for r in results:
            flat_results.extend(r)
        return flat_results

    def normalize_record(self, raw: dict) -> dict:
        """
        Normalize a raw mandi record from data.gov.in format.
        Maps fields to: mandi_name, state, min_price, max_price, modal_price, unit, data_as_of.
        """
        mandi_name = raw.get("market") or raw.get("mandi_name") or ""
        state = raw.get("state") or ""

        def to_float(val):
            if val is None:
                return 0.0
            try:
                # Remove commas and clean string
                clean_val = str(val).replace(",", "").strip()
                return float(clean_val)
            except (ValueError, TypeError):
                return 0.0

        min_price = to_float(raw.get("min_price"))
        max_price = to_float(raw.get("max_price"))
        modal_price = to_float(raw.get("modal_price"))
        unit = raw.get("unit") or raw.get("grade") or "Quintal"

        # Parse arrival_date or date to standard YYYY-MM-DD string
        arrival_date_str = raw.get("arrival_date") or raw.get("date")
        data_as_of = None

        if arrival_date_str:
            for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%y"):
                try:
                    parsed_dt = datetime.datetime.strptime(arrival_date_str.strip(), fmt)
                    data_as_of = parsed_dt.date()
                    break
                except (ValueError, AttributeError):
                    continue

        data_as_of_str = None
        if data_as_of:
            today = datetime.date.today()
            delta_days = (today - data_as_of).days
            if delta_days > 3:
                logger.warning(
                    f"Outdated mandi price record for commodity '{raw.get('commodity')}' "
                    f"in {mandi_name} ({state}). Data is {delta_days} days old (date: {data_as_of})."
                )
            data_as_of_str = data_as_of.isoformat()
        else:
            data_as_of_str = None

        return {
            "mandi_name": mandi_name,
            "state": state,
            "min_price": min_price,
            "max_price": max_price,
            "modal_price": modal_price,
            "unit": unit,
            "data_as_of": data_as_of_str
        }

    def _generate_mock_records(self, commodity: str, state: str = None) -> list[dict]:
        """Realistic mock generator to prevent failure during local testing."""
        import random
        states = [state] if state else ["Maharashtra", "Madhya Pradesh", "Rajasthan", "Karnataka"]
        mandis = {
            "Maharashtra": ["Yavatmal", "Amravati", "Nagpur"],
            "Madhya Pradesh": ["Indore", "Dhar", "Ujjain"],
            "Rajasthan": ["Jaipur", "Kota", "Alwar"],
            "Karnataka": ["Shimoga", "Davangere", "Haveri"]
        }
        
        base_prices = {
            "cotton": 6800.0,
            "wheat": 2450.0,
            "rice": 3400.0,
            "soybean": 4800.0,
            "turmeric": 7800.0,
            "chilli": 13500.0,
            "groundnut": 6200.0,
            "sugarcane": 330.0,
            "onion": 2100.0,
            "mustard": 5400.0
        }
        
        base_price = base_prices.get(commodity.strip().lower(), 3000.0)
        records = []
        
        selected_states = [random.choice(states)] if state else states[:2]
        
        for sel_state in selected_states:
            mandi_list = mandis.get(sel_state, ["Mandi A", "Mandi B"])
            for sel_mandi in mandi_list[:2]:
                variance = random.uniform(-0.07, 0.07)
                modal = round(base_price * (1 + variance), 2)
                min_p = round(modal * 0.9, 2)
                max_p = round(modal * 1.1, 2)
                
                records.append({
                    "market": sel_mandi,
                    "state": sel_state,
                    "commodity": commodity,
                    "min_price": str(min_p),
                    "max_price": str(max_p),
                    "modal_price": str(modal),
                    "unit": "Quintal",
                    "arrival_date": datetime.date.today().strftime("%d/%m/%Y")
                })
        return records
