"""
TradeNexus API — Lucy Router.

Provides the endpoints for interacting with LUCY, including chat interaction,
session creation, and session state retrieval.
"""

import time
import json
import logging
import uuid
from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query

from core.llm_provider import get_llm_provider
from core.database import get_client
from core.embedding_service import get_embedding_service
from core.intent_retriever import IntentRetriever, RetrievedExample
from core.session_manager import get_session_manager, LucySession
from agents.commodity_agent import CommodityAgent
from agents.market_agent import MarketAgent
from agents.dispatch_agent import DispatchAgent
from agents.trade_advisor_agent import TradeAdvisorAgent
from agents.inventory_agent import InventoryAgent
from agents.buyer_discovery_agent import BuyerDiscoveryAgent
from agents.opportunity_agent import OpportunityAgent
from agents.compliance_agent import ComplianceAgent
from agents.lucy_orchestrator import LucyOrchestrator, LucyResponse

logger = logging.getLogger("lucy_router")
logger.setLevel(logging.INFO)

router = APIRouter()


# --- Request / Response Models ---

class LucyChatRequest(BaseModel):
    message: str = Field(..., description="User's natural language input")
    session_id: str = Field(..., description="Unique conversational session ID")
    language_hint: Optional[str] = Field(None, description="Preferred response language")


class LucySessionNewRequest(BaseModel):
    session_id: Optional[str] = Field(None, description="Optional custom session ID")


class LucyRetrieveRequest(BaseModel):
    utterance: str = Field(..., description="Trader query to match against intent_examples")
    top_k: int = Field(3, ge=1, le=10, description="Number of similar examples to return")
    min_similarity: float = Field(0.45, ge=0.0, le=1.0, description="Minimum cosine similarity threshold")


class LucyRetrieveResponse(BaseModel):
    utterance: str
    retrieval_used: bool
    retrieval_confidence: float
    dominant_intent: Optional[str] = None
    dominant_retrieved_intent: Optional[str] = None
    dominant_category: Optional[str] = None
    retrieved_examples: List[RetrievedExample] = []
    retrieval_examples: List[RetrievedExample] = []
    rag_context: str = ""


# --- Singleton Agent Cache ---

_commodity_agent: Optional[CommodityAgent] = None
_market_agent: Optional[MarketAgent] = None
_dispatch_agent: Optional[DispatchAgent] = None
_trade_advisor: Optional[TradeAdvisorAgent] = None
_inventory_agent: Optional[InventoryAgent] = None
_buyer_discovery: Optional[BuyerDiscoveryAgent] = None
_opportunity_agent: Optional[OpportunityAgent] = None
_compliance_agent: Optional[ComplianceAgent] = None
_lucy_orchestrator: Optional[LucyOrchestrator] = None
_intent_retriever: Optional[IntentRetriever] = None


def _get_intent_retriever() -> IntentRetriever:
    global _intent_retriever
    if _intent_retriever is None:
        _intent_retriever = IntentRetriever(
            supabase_client=get_client(),
            embedding_service=get_embedding_service(),
        )
    return _intent_retriever


def _warn_if_client_encoding_issue(text: str) -> None:
    """Log when query likely arrived corrupted (Windows curl without UTF-8)."""
    if IntentRetriever.detect_client_encoding_issue(text):
        logger.warning(
            "Potential client-side encoding issue in retrieve request: %r. "
            "Windows: run chcp 65001; use curl.exe --data-urlencode \"q=<hindi text>\". "
            "Browser POST and Axios JSON bodies are UTF-8 by default.",
            text,
        )


async def _run_intent_retrieval(
    utterance: str,
    top_k: int = 3,
    min_similarity: float = 0.45,
) -> LucyRetrieveResponse:
    text = (utterance or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Query text is required (use q= or utterance=).")

    _warn_if_client_encoding_issue(text)

    retriever = _get_intent_retriever()
    result = await retriever.retrieve(text, top_k=top_k, min_similarity=min_similarity)
    rag_context = retriever.build_rag_context(result, text)

    return LucyRetrieveResponse(
        utterance=text,
        retrieval_used=result.retrieval_used,
        retrieval_confidence=result.retrieval_confidence,
        dominant_intent=result.dominant_intent,
        dominant_retrieved_intent=result.dominant_intent,
        dominant_category=result.dominant_category,
        retrieved_examples=result.examples,
        retrieval_examples=result.examples,
        rag_context=rag_context,
    )


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


def _get_inventory_agent() -> InventoryAgent:
    global _inventory_agent
    if _inventory_agent is None:
        _inventory_agent = InventoryAgent(
            commodity_agent=_get_commodity_agent(),
            supabase_client=get_client()
        )
    return _inventory_agent


def _get_buyer_discovery() -> BuyerDiscoveryAgent:
    global _buyer_discovery
    if _buyer_discovery is None:
        _buyer_discovery = BuyerDiscoveryAgent(
            commodity_agent=_get_commodity_agent(),
            supabase_client=get_client()
        )
    return _buyer_discovery


def _get_opportunity_agent() -> OpportunityAgent:
    global _opportunity_agent
    if _opportunity_agent is None:
        from data_ingestion.datagov_client import DataGovClient
        _opportunity_agent = OpportunityAgent(
            market_agent=_get_market_agent(),
            dispatch_agent=_get_dispatch_agent()
        )
    return _opportunity_agent


def _get_compliance_agent() -> ComplianceAgent:
    global _compliance_agent
    if _compliance_agent is None:
        _compliance_agent = ComplianceAgent()
        # Wire LLM
        _compliance_agent.llm = get_llm_provider()
    return _compliance_agent


def _get_lucy_orchestrator() -> LucyOrchestrator:
    global _lucy_orchestrator
    if _lucy_orchestrator is None:
        _lucy_orchestrator = LucyOrchestrator(
            commodity_agent=_get_commodity_agent(),
            market_agent=_get_market_agent(),
            dispatch_agent=_get_dispatch_agent(),
            trade_advisor_agent=_get_trade_advisor(),
            inventory_agent=_get_inventory_agent(),
            buyer_discovery_agent=_get_buyer_discovery(),
            opportunity_agent=_get_opportunity_agent(),
            compliance_agent=_get_compliance_agent(),
            session_manager=get_session_manager(),
            llm_provider=get_llm_provider(),
            intent_retriever=_get_intent_retriever(),
        )
    return _lucy_orchestrator


# --- Endpoints ---

@router.post("/chat", response_model=LucyResponse)
async def chat(request: LucyChatRequest):
    """
    Primary endpoint for Lucy turns. Receives text, updates session history,
    orchestrates relevant background agents, and synthesizes structured UI/voice response.
    """
    try:
        orchestrator = _get_lucy_orchestrator()
        response = await orchestrator.process_turn(
            message=request.message,
            session_id=request.session_id,
            language_hint=request.language_hint
        )
        return response
    except Exception as e:
        logger.error(f"Error in Lucy chat endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Lucy Chat Error: {str(e)}")


@router.post("/session/new")
async def create_session(request: Optional[LucySessionNewRequest] = None):
    """
    Create a new Lucy conversation session with a preloaded inventory snapshot,
    returning the session ID and a rich natural language greeting.
    """
    try:
        session_id = (request.session_id or str(uuid.uuid4())) if request else str(uuid.uuid4())
        
        manager = get_session_manager()
        session = await manager.create_session(session_id)
        
        # Synthesize a warm custom greeting that includes a snapshot overview of their inventory
        inventory_summary = await _get_inventory_agent().get_inventory_summary()
        
        system_prompt = (
            "You are LUCY, the voice-enabled autonomous trade operations copilot for TradeNexus agricultural platform.\n"
            "Generate a highly professional, welcoming greeting that introduces yourself as the operating system for the platform.\n"
            "Briefly mention their current commodity stock based on the summary provided, showing that you are alive and ready.\n"
            "Keep the response professional yet engaging, and formulate both the markdown text and the clean speech text.\n\n"
            "Respond ONLY with a JSON object containing exactly these fields:\n"
            "{\n"
            '  "response_text": str (Markdown greeting),\n'
            '  "voice_response": str (clean TTS greeting without markdown/special chars)\n'
            "}"
        )
        
        user_prompt = f"User current inventory summary: '{inventory_summary}'"
        
        raw_greeting = await get_llm_provider().complete(system_prompt, user_prompt, expect_json=True)
        greeting_data = _safe_json_parse(raw_greeting) or {}
        
        response_text = greeting_data.get("response_text", "Welcome back! I am LUCY, your TradeNexus copilot. Let me know how I can help you today.")
        voice_response = greeting_data.get("voice_response", "Welcome back! I am Lucy, your Trade Nexus copilot. How can I help you today?")
        
        # Save greeting as initial assistant message
        await manager.append_message(session, "assistant", response_text)
        
        return {
            "session_id": session_id,
            "response_text": response_text,
            "voice_response": voice_response,
            "context": session.context
        }
    except Exception as e:
        logger.error(f"Error creating Lucy session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Lucy Session Create Error: {str(e)}")


@router.get("/retrieve", response_model=LucyRetrieveResponse)
async def retrieve_intent_get(
    q: Optional[str] = Query(None, description="Trader query (e.g. Hindi commodity price question)"),
    utterance: Optional[str] = Query(None, description="Alias for q"),
    top_k: int = Query(3, ge=1, le=10),
    min_similarity: float = Query(0.45, ge=0.0, le=1.0),
):
    """
    RAG retrieval over multilingual intent_examples via GET.

    Example:
        curl -G "http://localhost:8000/api/v1/lucy/retrieve" \\
          --data-urlencode "q=कपास का भाव क्या है"

    Windows UTF-8 (avoid ???? corruption):
        chcp 65001
        curl.exe --get "http://localhost:8000/api/v1/lucy/retrieve" \\
          --data-urlencode "q=कपास का भाव क्या है"

    Browser POST and Axios JSON bodies use UTF-8 by default.
    """
    text = q or utterance
    if not text:
        raise HTTPException(status_code=400, detail="Missing query parameter: q or utterance")
    try:
        return await _run_intent_retrieval(text, top_k=top_k, min_similarity=min_similarity)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lucy retrieve (GET) failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Lucy Retrieve Error: {str(e)}")


@router.post("/retrieve", response_model=LucyRetrieveResponse)
async def retrieve_intent_post(request: LucyRetrieveRequest):
    """RAG retrieval over intent_examples — used by the Lucy UI and API client."""
    try:
        return await _run_intent_retrieval(
            request.utterance,
            top_k=request.top_k,
            min_similarity=request.min_similarity,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lucy retrieve (POST) failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Lucy Retrieve Error: {str(e)}")


@router.get("/session/{session_id}", response_model=LucySession)
async def get_session(session_id: str):
    """
    Restore conversation and context state for a given session ID after page refresh.
    """
    manager = get_session_manager()
    session = await manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
    return session


def _safe_json_parse(text: str) -> Optional[dict]:
    """Parse JSON from LLM response, handling markdown fences."""
    clean = text.strip()
    if clean.startswith("```"):
        parts = clean.split("```")
        for part in parts:
            stripped = part.strip()
            if stripped.startswith("json"):
                stripped = stripped[4:].strip()
            if stripped.startswith("{"):
                clean = stripped
                break
    try:
        return json.loads(clean)
    except Exception:
        return None
