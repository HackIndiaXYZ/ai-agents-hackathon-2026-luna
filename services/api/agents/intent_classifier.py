"""
TradeNexus — Intent Classifier Agent.

Classifies multilingual voice/text transcriptions into structured intents
for the AI Copilot orchestration layer. Uses a two-tier approach:
  1. Rule-based fast-path for common Hindi/Hinglish/English patterns (~2ms)
  2. LLM fallback for ambiguous or complex queries (~800ms)

Supported intents:
  - price_check: "What's the price of cotton?"
  - recommendation: "Best mandi for kapas from Nagpur?"
  - route_check: "Route from Nagpur to Akola?"
  - alert_check: "Any alerts for wheat?"
  - compliance: "What permits for rice transport?"
  - opportunity: "Any arbitrage opportunities?"
  - general: Anything else
  - unknown: Unresolvable
"""

import re
import json
import logging
from typing import Optional
from pydantic import BaseModel, Field
from core.llm_provider import LLMProvider

logger = logging.getLogger("intent_classifier")
logger.setLevel(logging.INFO)


class ClassifiedIntent(BaseModel):
    """Structured output from intent classification."""
    intent: str = Field(
        ...,
        description="One of: price_check, recommendation, route_check, alert_check, compliance, opportunity, general, unknown"
    )
    commodity: Optional[str] = Field(None, description="Extracted commodity name if present")
    origin: Optional[str] = Field(None, description="Extracted origin location if present")
    destination: Optional[str] = Field(None, description="Extracted destination if present")
    language_detected: str = Field("en", description="Detected language code: en, hi, hinglish")
    confidence: float = Field(0.0, description="Classification confidence 0-1")
    raw_input: str = Field("", description="Original transcription text")


# --- Rule-based keyword patterns (Hindi, Hinglish, English) ---
PRICE_PATTERNS = [
    r"\b(?:price|bhav|bhaw|daam|dam|rate|mandi\s*(?:price|rate|bhav))\b",
    r"\b(?:kitna|kitne|kya\s*(?:bhav|rate|dam))\b",
    r"\b(?:aaj\s*ka\s*(?:bhav|rate))\b",
]

RECOMMENDATION_PATTERNS = [
    r"\b(?:best|sabse\s*(?:accha|acha)|recommend|suggest|kis\s*mandi|kahan\s*bech|where\s*(?:to\s*)?sell)\b",
    r"\b(?:advice|salah|sujhav|advisor)\b",
    r"\b(?:konsi\s*mandi|kaunsi\s*mandi)\b",
]

ROUTE_PATTERNS = [
    r"\b(?:route|rasta|raasta|distance|kitni\s*dur|safar|travel|dispatch|transport)\b",
    r"\b(?:se\s+.*?\s+tak)\b",
    r"\b(?:from\s+.*?\s+to)\b",
]

ALERT_PATTERNS = [
    r"\b(?:alert|warning|chetavni|khabar|update|koi\s*alert)\b",
    r"\b(?:price\s*(?:drop|spike|surge|crash|girna|badhna))\b",
]

COMPLIANCE_PATTERNS = [
    r"\b(?:permit|license|compliance|apmc|fssai|regulation|niyam)\b",
    r"\b(?:kya\s*(?:chahiye|zaruri|jaruri)|documents?\s*(?:needed|required))\b",
]

OPPORTUNITY_PATTERNS = [
    r"\b(?:opportunity|arbitrage|mauqa|avsar|profit|margin|spread)\b",
    r"\b(?:backhaul|return\s*load|wapsi\s*ka\s*maal)\b",
]

# Common Indian commodity terms for extraction
COMMODITY_TERMS = {
    "cotton": "Cotton", "kapas": "Cotton", "kapaas": "Cotton", "rui": "Cotton",
    "wheat": "Wheat", "gehun": "Wheat", "gehu": "Wheat",
    "rice": "Rice", "chawal": "Rice", "dhan": "Rice", "paddy": "Rice",
    "soybean": "Soybean", "soyabean": "Soybean", "soya": "Soybean",
    "onion": "Onion", "pyaz": "Onion", "pyaaz": "Onion", "kanda": "Onion",
    "tomato": "Tomato", "tamatar": "Tomato",
    "potato": "Potato", "aloo": "Potato", "alu": "Potato", "batata": "Potato",
    "chana": "Chana", "gram": "Chana", "chickpea": "Chana",
    "sugar": "Sugar", "cheeni": "Sugar", "gur": "Jaggery", "jaggery": "Jaggery",
    "turmeric": "Turmeric", "haldi": "Turmeric",
    "maize": "Maize", "makka": "Maize", "corn": "Maize",
    "mustard": "Mustard", "sarson": "Mustard", "rai": "Mustard",
    "groundnut": "Groundnut", "moongfali": "Groundnut", "mungfali": "Groundnut",
    "chilli": "Chilli", "mirch": "Chilli", "mirchi": "Chilli",
    "cumin": "Cumin", "jeera": "Cumin", "zeera": "Cumin",
    "coriander": "Coriander", "dhaniya": "Coriander",
    "banana": "Banana", "kela": "Banana",
    "apple": "Apple", "seb": "Apple",
    "mango": "Mango", "aam": "Mango",
    "bajra": "Bajra", "pearl millet": "Bajra",
    "jowar": "Jowar", "sorghum": "Jowar",
}

# Common Indian city names for location extraction
INDIAN_CITIES = [
    "nagpur", "mumbai", "pune", "delhi", "jaipur", "ahmedabad", "indore",
    "bhopal", "lucknow", "kolkata", "chennai", "hyderabad", "bangalore",
    "bengaluru", "akola", "amravati", "yavatmal", "wardha", "chandrapur",
    "latur", "solapur", "sangli", "satara", "nashik", "aurangabad",
    "kanpur", "varanasi", "agra", "patna", "ranchi", "raipur",
    "rajkot", "surat", "vadodara", "ludhiana", "jalandhar", "amritsar",
    "jodhpur", "udaipur", "kota", "ajmer", "bikaner", "sikar",
    "guntur", "warangal", "vijayawada", "visakhapatnam",
    "mysuru", "hubli", "bellary", "davangere",
    "coimbatore", "madurai", "salem", "tiruchirappalli",
    "thiruvananthapuram", "kochi", "kozhikode",
    "bhubaneswar", "cuttack", "guwahati", "dibrugarh",
    "shimla", "dehradun", "haridwar", "meerut", "noida", "gurgaon",
]


class IntentClassifier:
    """Two-tier intent classification: rule-based fast-path + LLM fallback."""

    def __init__(self, llm_provider: LLMProvider):
        self.llm = llm_provider
        # Pre-compile regex patterns
        self._price_re = [re.compile(p, re.IGNORECASE) for p in PRICE_PATTERNS]
        self._recommendation_re = [re.compile(p, re.IGNORECASE) for p in RECOMMENDATION_PATTERNS]
        self._route_re = [re.compile(p, re.IGNORECASE) for p in ROUTE_PATTERNS]
        self._alert_re = [re.compile(p, re.IGNORECASE) for p in ALERT_PATTERNS]
        self._compliance_re = [re.compile(p, re.IGNORECASE) for p in COMPLIANCE_PATTERNS]
        self._opportunity_re = [re.compile(p, re.IGNORECASE) for p in OPPORTUNITY_PATTERNS]

    def _detect_language(self, text: str) -> str:
        """Simple heuristic language detection."""
        # Check for Devanagari characters
        if re.search(r'[\u0900-\u097F]', text):
            return "hi"
        # Check for common Hindi/Hinglish words in Latin script
        hindi_markers = ["ka", "ke", "ki", "hai", "kya", "mein", "se", "ko",
                         "aur", "nahi", "kahan", "konsi", "kaunsi", "kitna",
                         "sabse", "accha", "bhav", "daam", "wala"]
        text_lower = text.lower()
        hindi_count = sum(1 for w in hindi_markers if re.search(rf'\b{w}\b', text_lower))
        if hindi_count >= 2:
            return "hinglish"
        return "en"

    def _extract_commodity(self, text: str) -> Optional[str]:
        """Extract commodity name from text using known terms."""
        text_lower = text.lower()
        for term, canonical in COMMODITY_TERMS.items():
            if re.search(rf'\b{re.escape(term)}\b', text_lower):
                return canonical
        return None

    def _extract_locations(self, text: str) -> tuple[Optional[str], Optional[str]]:
        """Extract origin and destination cities from text."""
        text_lower = text.lower()
        found_cities = []
        for city in INDIAN_CITIES:
            if re.search(rf'\b{re.escape(city)}\b', text_lower):
                found_cities.append(city.title())

        origin = found_cities[0] if len(found_cities) >= 1 else None
        destination = found_cities[1] if len(found_cities) >= 2 else None

        # Check for "from X to Y" pattern
        from_to = re.search(r'from\s+(\w+)\s+to\s+(\w+)', text_lower)
        if from_to:
            origin = from_to.group(1).title()
            destination = from_to.group(2).title()

        # Check for Hindi "X se Y tak" pattern
        se_tak = re.search(r'(\w+)\s+se\s+(\w+)\s+(?:tak|ko)', text_lower)
        if se_tak:
            origin = se_tak.group(1).title()
            destination = se_tak.group(2).title()

        return origin, destination

    def _match_patterns(self, text: str) -> Optional[tuple[str, float]]:
        """Match text against pre-compiled rule patterns."""
        for regex_list, intent_name in [
            (self._price_re, "price_check"),
            (self._recommendation_re, "recommendation"),
            (self._route_re, "route_check"),
            (self._alert_re, "alert_check"),
            (self._compliance_re, "compliance"),
            (self._opportunity_re, "opportunity"),
        ]:
            for regex in regex_list:
                if regex.search(text):
                    return intent_name, 0.92
        return None

    async def classify(self, text: str) -> ClassifiedIntent:
        """
        Classify transcription text into a structured intent.

        Tier 1: Rule-based pattern matching (~2ms)
        Tier 2: LLM fallback for ambiguous queries (~800ms)
        """
        if not text or not text.strip():
            return ClassifiedIntent(
                intent="unknown",
                confidence=0.0,
                raw_input=text or "",
                language_detected="en"
            )

        text = text.strip()
        language = self._detect_language(text)
        commodity = self._extract_commodity(text)
        origin, destination = self._extract_locations(text)

        # Tier 1: Rule-based fast-path
        match = self._match_patterns(text)
        if match:
            intent_name, confidence = match
            logger.info(f"[IntentClassifier] Rule-based match: {intent_name} (conf={confidence})")
            return ClassifiedIntent(
                intent=intent_name,
                commodity=commodity,
                origin=origin,
                destination=destination,
                language_detected=language,
                confidence=confidence,
                raw_input=text
            )

        # Tier 2: LLM fallback
        logger.info("[IntentClassifier] No rule match — invoking LLM fallback")
        try:
            result = await self._llm_classify(text, language)
            # Merge LLM results with locally extracted entities
            result.commodity = result.commodity or commodity
            result.origin = result.origin or origin
            result.destination = result.destination or destination
            result.language_detected = language
            result.raw_input = text
            return result
        except Exception as exc:
            logger.error(f"[IntentClassifier] LLM fallback failed: {exc}")
            return ClassifiedIntent(
                intent="general",
                commodity=commodity,
                origin=origin,
                destination=destination,
                language_detected=language,
                confidence=0.4,
                raw_input=text
            )

    async def _llm_classify(self, text: str, language: str) -> ClassifiedIntent:
        """Use LLM to classify ambiguous intents."""
        system_prompt = (
            "You are a multilingual intent classifier for TradeNexus, an Indian commodity trading platform. "
            "Classify the user's query into exactly ONE intent and extract entities.\n\n"
            "Valid intents: price_check, recommendation, route_check, alert_check, compliance, opportunity, general\n\n"
            "Respond with ONLY valid JSON:\n"
            '{"intent": "<intent>", "commodity": "<name or null>", "origin": "<city or null>", '
            '"destination": "<city or null>", "confidence": <0.0-1.0>}'
        )

        user_prompt = f"Language: {language}\nQuery: {text}"

        raw = await self.llm.complete(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            expect_json=True,
            max_tokens=120
        )

        # Parse JSON from LLM response
        # Strip markdown code fences if present
        clean = raw.strip()
        if clean.startswith("```"):
            clean = re.sub(r'^```(?:json)?\s*', '', clean)
            clean = re.sub(r'\s*```$', '', clean)

        data = json.loads(clean)

        return ClassifiedIntent(
            intent=data.get("intent", "general"),
            commodity=data.get("commodity"),
            origin=data.get("origin"),
            destination=data.get("destination"),
            language_detected=language,
            confidence=float(data.get("confidence", 0.7)),
            raw_input=text
        )
