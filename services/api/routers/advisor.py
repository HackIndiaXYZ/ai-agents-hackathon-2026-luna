"""
TradeNexus API — Trade Advisor Router.

Exposes the primary LLM advisory synthesis endpoint `/api/v1/advisor/recommend`.
Coordinates between the client and the TradeAdvisorAgent.
"""

from typing import Optional
from fastapi import APIRouter, Query, HTTPException, Depends

from core.database import get_client
from core.llm_provider import get_llm_provider
from core.embedding_service import get_embedding_service
from agents.commodity_agent import CommodityAgent
from agents.market_agent import MarketAgent
from agents.dispatch_agent import DispatchAgent
from agents.trade_advisor_agent import TradeAdvisorAgent, TradeRecommendation

router = APIRouter()

# --- Cached Singletons ---
_commodity_agent: Optional[CommodityAgent] = None
_market_agent: Optional[MarketAgent] = None
_dispatch_agent: Optional[DispatchAgent] = None
_trade_advisor_agent: Optional[TradeAdvisorAgent] = None


def get_commodity_agent() -> CommodityAgent:
    global _commodity_agent
    if _commodity_agent is None:
        _commodity_agent = CommodityAgent(
            embedding_service=get_embedding_service(),
            llm_provider=get_llm_provider(),
            supabase_client=get_client()
        )
    return _commodity_agent


def get_market_agent() -> MarketAgent:
    global _market_agent
    if _market_agent is None:
        from data_ingestion.datagov_client import DataGovClient
        _market_agent = MarketAgent(
            datagov_client=DataGovClient(),
            llm_provider=get_llm_provider(),
            supabase_client=get_client()
        )
    return _market_agent


def get_dispatch_agent() -> DispatchAgent:
    global _dispatch_agent
    if _dispatch_agent is None:
        _dispatch_agent = DispatchAgent(supabase_client=get_client())
    return _dispatch_agent


def get_trade_advisor_agent() -> TradeAdvisorAgent:
    global _trade_advisor_agent
    if _trade_advisor_agent is None:
        _trade_advisor_agent = TradeAdvisorAgent(
            llm_provider=get_llm_provider(),
            commodity_agent=get_commodity_agent(),
            market_agent=get_market_agent(),
            dispatch_agent=get_dispatch_agent()
        )
    return _trade_advisor_agent


@router.get("/recommend", response_model=TradeRecommendation, summary="Generate Trade Advisor Recommendation")
async def recommend(
    commodity: str = Query(..., description="Commodity name or regional alias (e.g. 'Kapas', 'Cotton')"),
    origin: str = Query(..., description="Origin mandi or city name (e.g. 'Nagpur')"),
    quantity: Optional[float] = Query(None, description="Optional trade volume in quintals"),
    advisor: TradeAdvisorAgent = Depends(get_trade_advisor_agent)
):
    """
    Primary endpoint that executes linguistic name resolution, queries latest pricing metrics,
    performs parallel routing utility checks, and synthesizes results using a single-pass LLM advisory.
    """
    if not commodity or not origin:
        raise HTTPException(
            status_code=400,
            detail="Missing required parameters. Both 'commodity' and 'origin' must be supplied."
        )

    try:
        recommendation = await advisor.get_recommendation(
            commodity_input=commodity,
            origin=origin,
            quantity=quantity
        )
        return recommendation
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Internal trade advisor agent reasoning failed: {str(exc)}"
        )
