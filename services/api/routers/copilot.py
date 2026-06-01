"""
TradeNexus API — Copilot Router.

Provides the `/api/v1/copilot/process` endpoint that receives voice/text
transcriptions, classifies intent, orchestrates relevant agents, and returns
a structured response with execution timeline and AI-synthesized voice output.
"""

import time
import logging
from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from core.llm_provider import get_llm_provider
from core.database import get_client
from core.embedding_service import get_embedding_service
from agents.intent_classifier import IntentClassifier, ClassifiedIntent
from agents.commodity_agent import CommodityAgent
from agents.market_agent import MarketAgent
from agents.dispatch_agent import DispatchAgent
from agents.trade_advisor_agent import TradeAdvisorAgent

logger = logging.getLogger("copilot_router")
logger.setLevel(logging.INFO)

router = APIRouter()


# --- Request / Response Models ---

class CopilotRequest(BaseModel):
    """Incoming copilot request from frontend."""
    transcript: str = Field(..., description="Voice transcription or text input")
    page_context: Optional[str] = Field(None, description="Current page the user is on")
    active_commodity: Optional[str] = Field(None, description="Currently selected commodity in UI")
    language_hint: Optional[str] = Field(None, description="User's preferred language")


class ExecutionStep(BaseModel):
    """Single step in the execution timeline."""
    step_id: str
    label: str
    status: str = "completed"  # pending, running, completed, error
    duration_ms: int = 0
    detail: Optional[str] = None


class CopilotCard(BaseModel):
    """Structured data card for rich UI display."""
    card_type: str  # "price_table", "route_summary", "alert_list", "recommendation", "text"
    title: str
    data: dict = {}


class CopilotResponse(BaseModel):
    """Structured copilot response returned to frontend."""
    intent: ClassifiedIntent
    voice_response: str = Field(..., description="Natural language response for TTS")
    cards: List[CopilotCard] = []
    execution_steps: List[ExecutionStep] = []
    total_duration_ms: int = 0


# --- Singleton Agent Cache ---

_intent_classifier: Optional[IntentClassifier] = None
_commodity_agent: Optional[CommodityAgent] = None
_market_agent: Optional[MarketAgent] = None
_dispatch_agent: Optional[DispatchAgent] = None
_trade_advisor: Optional[TradeAdvisorAgent] = None


def _get_intent_classifier() -> IntentClassifier:
    global _intent_classifier
    if _intent_classifier is None:
        _intent_classifier = IntentClassifier(llm_provider=get_llm_provider())
    return _intent_classifier


def _get_commodity_agent() -> CommodityAgent:
    global _commodity_agent
    if _commodity_agent is None:
        _commodity_agent = CommodityAgent(
            embedding_service=get_embedding_service(),
            llm_provider=get_llm_provider(),
            supabase_client=get_client()
        )
    return _commodity_agent


def _get_market_agent() -> MarketAgent:
    global _market_agent
    if _market_agent is None:
        from data_ingestion.datagov_client import DataGovClient
        _market_agent = MarketAgent(
            datagov_client=DataGovClient(),
            llm_provider=get_llm_provider(),
            supabase_client=get_client()
        )
    return _market_agent


def _get_dispatch_agent() -> DispatchAgent:
    global _dispatch_agent
    if _dispatch_agent is None:
        _dispatch_agent = DispatchAgent(supabase_client=get_client())
    return _dispatch_agent


def _get_trade_advisor() -> TradeAdvisorAgent:
    global _trade_advisor
    if _trade_advisor is None:
        _trade_advisor = TradeAdvisorAgent(
            llm_provider=get_llm_provider(),
            commodity_agent=_get_commodity_agent(),
            market_agent=_get_market_agent(),
            dispatch_agent=_get_dispatch_agent()
        )
    return _trade_advisor


# --- Intent Handlers ---

async def _handle_price_check(intent: ClassifiedIntent, steps: list) -> tuple[str, list]:
    """Handle price_check intent: fetch market prices for the commodity."""
    cards = []
    commodity = intent.commodity or "Cotton"

    # Step: Resolve commodity
    t0 = time.perf_counter()
    commodity_agent = _get_commodity_agent()
    resolution = await commodity_agent.resolve(commodity)
    dur = int((time.perf_counter() - t0) * 1000)
    steps.append(ExecutionStep(
        step_id="resolve",
        label=f"Resolving '{commodity}' → {resolution.canonical_name or commodity}",
        duration_ms=dur,
        detail=f"Tier: {resolution.tier}, Confidence: {resolution.confidence}"
    ))

    canonical = resolution.canonical_name or commodity

    # Step: Fetch prices
    t0 = time.perf_counter()
    market_agent = _get_market_agent()
    summary = await market_agent.get_market_summary(resolution.commodity_id or canonical)
    dur = int((time.perf_counter() - t0) * 1000)
    steps.append(ExecutionStep(
        step_id="market_fetch",
        label=f"Fetching market prices for {canonical}",
        duration_ms=dur,
        detail=f"{len(summary.get('prices', []))} price records found"
    ))

    top_mandis = summary.get("top_mandis", [])[:5]

    # Build price card
    cards.append(CopilotCard(
        card_type="price_table",
        title=f"{canonical} — Top Mandi Prices",
        data={
            "commodity": canonical,
            "mandis": top_mandis,
            "data_as_of": summary.get("data_as_of", "N/A"),
            "avg_price": summary.get("avg_modal_price"),
            "trend_7d": summary.get("price_trend_7d_pct")
        }
    ))

    # Voice response
    if top_mandis:
        best = top_mandis[0]
        voice = (
            f"{canonical} is currently priced at ₹{best['modal_price']} per quintal "
            f"at {best['mandi_name']}, {best['state']}. "
            f"Average across mandis is ₹{summary.get('avg_modal_price', 'N/A')}."
        )
    else:
        voice = f"I couldn't find recent price data for {canonical}. Please try a different commodity."

    return voice, cards


async def _handle_recommendation(intent: ClassifiedIntent, steps: list) -> tuple[str, list]:
    """Handle recommendation intent: full trade advisor pipeline."""
    cards = []
    commodity = intent.commodity or "Cotton"
    origin = intent.origin or "Nagpur"

    # Step: Full advisory pipeline
    t0 = time.perf_counter()
    advisor = _get_trade_advisor()
    rec = await advisor.get_recommendation(
        commodity_input=commodity,
        origin=origin
    )
    dur = int((time.perf_counter() - t0) * 1000)

    steps.append(ExecutionStep(
        step_id="resolve",
        label=f"Resolving '{commodity}'",
        duration_ms=min(dur // 4, 50),
        detail=f"Tier: {rec.resolution_tier}"
    ))
    steps.append(ExecutionStep(
        step_id="market_analysis",
        label="Analyzing market prices",
        duration_ms=dur // 3,
        detail=f"{len(rec.top_markets)} mandis evaluated"
    ))
    steps.append(ExecutionStep(
        step_id="route_check",
        label=f"Checking routes from {origin}",
        duration_ms=dur // 3,
        detail=f"Best route: {rec.best_route.destination if rec.best_route else 'N/A'}"
    ))
    steps.append(ExecutionStep(
        step_id="synthesis",
        label="Synthesizing recommendation",
        duration_ms=dur // 4,
    ))

    # Build recommendation card
    cards.append(CopilotCard(
        card_type="recommendation",
        title=f"Trade Advisory — {rec.commodity}",
        data={
            "commodity": rec.commodity,
            "ai_recommendation": rec.ai_recommendation,
            "confidence_score": rec.confidence_score,
            "data_freshness": rec.data_freshness,
            "top_markets": [m.model_dump() for m in rec.top_markets],
            "best_route": rec.best_route.model_dump() if rec.best_route else None
        }
    ))

    voice = rec.ai_recommendation[:300]
    return voice, cards


async def _handle_route_check(intent: ClassifiedIntent, steps: list) -> tuple[str, list]:
    """Handle route_check intent: score corridor between origin and destination."""
    cards = []
    origin = intent.origin or "Nagpur"
    destination = intent.destination or "Akola"

    t0 = time.perf_counter()
    dispatch = _get_dispatch_agent()
    corridor = await dispatch.score_corridor(origin, destination)
    dur = int((time.perf_counter() - t0) * 1000)

    steps.append(ExecutionStep(
        step_id="route_scoring",
        label=f"Scoring route: {origin} → {destination}",
        duration_ms=dur,
        detail=f"Distance: {corridor.get('distance_km', 'N/A')} km"
    ))

    cards.append(CopilotCard(
        card_type="route_summary",
        title=f"Route: {origin} → {destination}",
        data=corridor
    ))

    voice = (
        f"The route from {origin} to {destination} is {corridor.get('distance_km', 'N/A')} kilometers, "
        f"estimated at {corridor.get('estimated_hours', 'N/A')} hours. "
        f"Delay risk is {corridor.get('delay_risk', 'unknown')}."
    )
    return voice, cards


async def _handle_alert_check(intent: ClassifiedIntent, steps: list) -> tuple[str, list]:
    """Handle alert_check intent: retrieve active alerts for a commodity."""
    cards = []
    commodity = intent.commodity or "Cotton"

    t0 = time.perf_counter()
    market_agent = _get_market_agent()
    commodity_agent = _get_commodity_agent()

    resolution = await commodity_agent.resolve(commodity)
    canonical = resolution.canonical_name or commodity
    summary = await market_agent.get_market_summary(resolution.commodity_id or canonical)
    dur = int((time.perf_counter() - t0) * 1000)

    alerts = summary.get("alerts", [])
    steps.append(ExecutionStep(
        step_id="alert_fetch",
        label=f"Checking alerts for {canonical}",
        duration_ms=dur,
        detail=f"{len(alerts)} active alerts"
    ))

    cards.append(CopilotCard(
        card_type="alert_list",
        title=f"Active Alerts — {canonical}",
        data={"alerts": alerts, "commodity": canonical}
    ))

    if alerts:
        voice = f"There are {len(alerts)} active alerts for {canonical}. "
        for a in alerts[:2]:
            voice += f"{a.get('message', '')}. "
    else:
        voice = f"No active alerts for {canonical} at this time. Markets are stable."

    return voice, cards


async def _handle_general(intent: ClassifiedIntent, steps: list) -> tuple[str, list]:
    """Handle general/unknown intents with LLM free-form response."""
    cards = []

    t0 = time.perf_counter()
    llm = get_llm_provider()
    response = await llm.complete(
        system_prompt=(
            "You are TradeNexus AI, a friendly and knowledgeable assistant for Indian commodity traders. "
            "Answer questions about agricultural commodities, mandi prices, trade regulations, and logistics. "
            "Be concise (under 100 words). Use ₹ for prices and quintals for weights."
        ),
        user_prompt=intent.raw_input,
        max_tokens=200
    )
    dur = int((time.perf_counter() - t0) * 1000)

    steps.append(ExecutionStep(
        step_id="llm_response",
        label="Processing your question",
        duration_ms=dur,
    ))

    cards.append(CopilotCard(
        card_type="text",
        title="TradeNexus AI",
        data={"text": response.strip()}
    ))

    return response.strip()[:300], cards


# --- Main Endpoint ---

@router.post("/process", response_model=CopilotResponse, summary="Process Copilot Voice/Text Input")
async def process_copilot(request: CopilotRequest):
    """
    Main copilot orchestration endpoint.

    1. Classify intent from transcript
    2. Route to appropriate handler
    3. Return structured response with execution timeline
    """
    if not request.transcript or not request.transcript.strip():
        raise HTTPException(status_code=400, detail="Empty transcript")

    total_start = time.perf_counter()
    steps: list[ExecutionStep] = []

    # Step 1: Intent Classification
    t0 = time.perf_counter()
    classifier = _get_intent_classifier()
    intent = await classifier.classify(request.transcript)
    dur = int((time.perf_counter() - t0) * 1000)
    steps.append(ExecutionStep(
        step_id="intent_classify",
        label=f"Intent: {intent.intent} ({intent.language_detected})",
        duration_ms=dur,
        detail=f"Confidence: {intent.confidence:.0%}"
    ))

    # Apply page context overrides
    if request.active_commodity and not intent.commodity:
        intent.commodity = request.active_commodity

    # Step 2: Route to handler
    intent_handlers = {
        "price_check": _handle_price_check,
        "recommendation": _handle_recommendation,
        "route_check": _handle_route_check,
        "alert_check": _handle_alert_check,
        "compliance": _handle_general,  # Falls back to LLM for now
        "opportunity": _handle_general,
        "general": _handle_general,
        "unknown": _handle_general,
    }

    handler = intent_handlers.get(intent.intent, _handle_general)

    try:
        voice_response, cards = await handler(intent, steps)
    except Exception as exc:
        logger.error(f"[Copilot] Handler '{intent.intent}' failed: {exc}")
        voice_response = "I encountered an issue processing your request. Please try again."
        cards = [CopilotCard(
            card_type="text",
            title="Error",
            data={"text": str(exc)}
        )]

    total_ms = int((time.perf_counter() - total_start) * 1000)

    return CopilotResponse(
        intent=intent,
        voice_response=voice_response,
        cards=cards,
        execution_steps=steps,
        total_duration_ms=total_ms
    )
