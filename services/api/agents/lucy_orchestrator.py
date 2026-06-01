"""
TradeNexus — Lucy Autonomous Orchestrator.

The core cognitive brain of Lucy. Classifies conversation intent with pronoun
resolution, orchestrates other agents, and synthesizes rich markdown responses
with clean Text-to-Speech audio copy.
"""

import time
import json
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from core.llm_provider import LLMProvider
from core.session_manager import LucySession, SessionManager
from agents.commodity_agent import CommodityAgent
from agents.market_agent import MarketAgent
from agents.dispatch_agent import DispatchAgent
from agents.trade_advisor_agent import TradeAdvisorAgent
from agents.inventory_agent import InventoryAgent
from agents.buyer_discovery_agent import BuyerDiscoveryAgent
from agents.opportunity_agent import OpportunityAgent
from agents.compliance_agent import ComplianceAgent

logger = logging.getLogger("lucy_orchestrator")
logger.setLevel(logging.INFO)


class ExecutionStep(BaseModel):
    step_id: str
    label: str
    status: str = "completed"  # pending, running, completed, error
    duration_ms: int = 0
    detail: Optional[str] = None


class LucyResponse(BaseModel):
    session_id: str
    response_text: str = Field(..., description="Markdown formatted response text")
    voice_response: str = Field(..., description="Clean text for TTS engine")
    voice_language: str = "en"
    execution_steps: List[ExecutionStep] = []
    actions_taken: List[str] = []
    context_update: Dict[str, Any] = {}
    ui_hints: List[str] = []


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


class LucyOrchestrator:
    """Core brain of the LUCY Natural Language Operating System."""

    def __init__(
        self,
        commodity_agent: CommodityAgent,
        market_agent: MarketAgent,
        dispatch_agent: DispatchAgent,
        trade_advisor_agent: TradeAdvisorAgent,
        inventory_agent: InventoryAgent,
        buyer_discovery_agent: BuyerDiscoveryAgent,
        opportunity_agent: OpportunityAgent,
        compliance_agent: ComplianceAgent,
        session_manager: SessionManager,
        llm_provider: LLMProvider
    ):
        self.commodity_agent = commodity_agent
        self.market_agent = market_agent
        self.dispatch_agent = dispatch_agent
        self.trade_advisor_agent = trade_advisor_agent
        self.inventory_agent = inventory_agent
        self.buyer_discovery_agent = buyer_discovery_agent
        self.opportunity_agent = opportunity_agent
        self.compliance_agent = compliance_agent
        self.session_manager = session_manager
        self.llm = llm_provider

    async def process_turn(
        self,
        message: str,
        session_id: str,
        language_hint: Optional[str] = None
    ) -> LucyResponse:
        """
        Process a conversation turn for a user message, maintaining state in Redis.
        """
        t_start = time.perf_counter()
        execution_steps: List[ExecutionStep] = []
        actions_taken: List[str] = []
        ui_hints: List[str] = []

        # 1. Retrieve or create session
        t0 = time.perf_counter()
        session = await self.session_manager.get_session(session_id)
        if not session:
            session = await self.session_manager.create_session(session_id)
            execution_steps.append(ExecutionStep(
                step_id="session_create",
                label="Initializing new session memory",
                duration_ms=int((time.perf_counter() - t0) * 1000)
            ))
        else:
            await self.session_manager.append_message(session, "user", message)
            execution_steps.append(ExecutionStep(
                step_id="session_load",
                label="Restoring conversational memory context",
                duration_ms=int((time.perf_counter() - t0) * 1000)
            ))

        # Refresh inventory snapshot in memory
        await self.session_manager.refresh_inventory_snapshot(session)

        # 2. Intent Classification and Pronoun Resolution
        t0 = time.perf_counter()
        history_summary = []
        for msg in session.messages[-5:-1]:  # Exclude latest message which was just appended
            history_summary.append(f"{msg['role'].upper()}: {msg['content']}")
        history_str = "\n".join(history_summary)

        system_prompt = (
            "You are the intent classifier and dialogue context manager for LUCY, the TradeNexus natural language operating system.\n"
            "Your job is to analyze the user's latest message, the conversation history, the active context, and the user's current inventory snapshot to classify the user's intent and resolve any pronouns.\n\n"
            "Intents MUST be one of the following 12 options:\n"
            "- INVENTORY_ADD: User wants to add, increase, or update commodity stock levels (e.g. 'Add 50 quintal potatoes', 'potatoes add karo 50 quintals')\n"
            "- INVENTORY_CHECK: User wants to check, view, list, or summarize their commodity stock (e.g. 'What is in my inventory?', 'inventory dikhao', 'mere paas kya stock hai')\n"
            "- INVENTORY_SELL: User wants to sell, remove, or subtract commodity stock levels (e.g. 'Sell 100 quintal cotton', 'cotton bechna hai 100 quintal', '100 quintal cotton kam karo')\n"
            "- MARKET_QUERY: User wants to check market prices or trends (e.g. 'What is the price of cotton?', 'cotton ka bhav kya hai?')\n"
            "- DISPATCH_QUERY: User wants to check routes, travel times, transport corridors, or distance (e.g. 'Route from Nagpur to Mumbai', 'Nagpur se Mumbai transport details')\n"
            "- RECOMMENDATION: User wants trade recommendations or arbitrage advisories (e.g. 'Suggest a trade', 'best recommendation for cotton', 'best mandi for kapas from Nagpur')\n"
            "- BUYER_SEARCH: User wants to search for potential buyers or mills (e.g. 'Find cotton buyers near Nagpur', 'Nagpur ke paas mills find karo')\n"
            "- DEAL_ANALYSIS: User wants to analyze a prospective deal, contract, or requirement (e.g. 'Analyze an offer of 100 quintals Cotton at Nagpur', 'kya ye deal acchi hai?')\n"
            "- COMPLIANCE_QUERY: User wants legal or permit/document compliance checks (e.g. 'What permits do I need for cotton to Mumbai?', 'APMC compliance rules for Nagpur to Indore')\n"
            "- LEARNING_QUERY: User wants system activity, training stats, or alias learning info (e.g. 'Show me learning stats', 'system activity check')\n"
            "- GREETING: Simple greetings or polite remarks (e.g. 'Hello', 'Hi Lucy', 'good morning')\n"
            "- UNKNOWN: Fallback if the query matches none of the above.\n\n"
            "PRONOUN RESOLUTION RULE:\n"
            "Identify pronouns or indirect references like 'isko', 'wahan', 'use', 'it', 'there', 'them' and resolve them using the conversation history or active context.\n"
            "For example, if the history talks about 'Cotton' and the user says 'isko kahan bechun', the commodity is 'Cotton' and intent is 'RECOMMENDATION'. If the history talks about 'Nagpur' and user says 'wahan se dispatch', origin is 'Nagpur'.\n\n"
            "Respond ONLY with a JSON object containing exactly these fields:\n"
            "{\n"
            '  "intent": "INVENTORY_ADD"|... (one of the 12 intents),\n'
            '  "commodity": str|null (canonical name of the commodity, e.g. "Cotton"),\n'
            '  "quantity": float|null (quantity of commodity, e.g. 50.0),\n'
            '  "unit": str|null (e.g. "quintal"),\n'
            '  "origin": str|null (e.g. "Nagpur"),\n'
            '  "destination": str|null (e.g. "Mumbai"),\n'
            '  "deal_details": str|null (if the query represents a deal to analyze),\n'
            '  "language": "en"|"hi"|"hinglish",\n'
            '  "confidence": float (0.0 to 1.0)\n'
            "}"
        )

        user_prompt = (
            f"Active Session Context variables:\n{json.dumps(session.context, indent=2)}\n\n"
            f"User Inventory Snapshot:\n{json.dumps(session.context.get('inventory_snapshot', {}), indent=2)}\n\n"
            f"Conversation History (last 4 turns):\n{history_str}\n\n"
            f"User Latest Query:\n'{message}'\n"
        )
        if language_hint:
            user_prompt += f"(User requested language: {language_hint})"

        raw_intent = await self.llm.complete(system_prompt, user_prompt, expect_json=True)
        intent_data = _safe_json_parse(raw_intent) or {}
        
        intent = intent_data.get("intent", "UNKNOWN")
        confidence = intent_data.get("confidence", 0.5)
        language = intent_data.get("language", "en")
        
        # Merge parsed variables into context
        context_update = {}
        for var in ["commodity", "quantity", "unit", "origin", "destination"]:
            val = intent_data.get(var)
            if val is not None:
                context_update[f"active_{var}" if var == "commodity" else var] = val
        
        dur_intent = int((time.perf_counter() - t0) * 1000)
        execution_steps.append(ExecutionStep(
            step_id="intent_classification",
            label=f"Intent: {intent} (Confidence: {confidence:.2f})",
            duration_ms=dur_intent,
            detail=f"Resolved params: {json.dumps({k: v for k, v in intent_data.items() if k not in ['intent', 'confidence', 'language']})}"
        ))

        # Update session active context
        await self.session_manager.update_context(session, context_update)

        # 3. Route to Agents based on Intent
        agent_results = {}
        t_agent_start = time.perf_counter()

        commodity = context_update.get("active_commodity") or session.context.get("active_commodity")
        quantity = context_update.get("quantity") or session.context.get("quantity")
        unit = context_update.get("unit") or session.context.get("unit") or "quintal"
        origin = context_update.get("origin") or session.context.get("origin")
        destination = context_update.get("destination") or session.context.get("destination")

        if intent == "INVENTORY_ADD":
            if not commodity or not quantity:
                agent_results = {"error": "Missing commodity or quantity for adding to inventory."}
            else:
                t_sub = time.perf_counter()
                res = await self.inventory_agent.update_inventory(commodity, float(quantity), "add", unit)
                agent_results = res
                actions_taken.append("INVENTORY_ADD")
                ui_hints.append("inventory_update")
                execution_steps.append(ExecutionStep(
                    step_id="inventory_agent",
                    label=f"Updating inventory: Add {quantity} {unit} of {commodity}",
                    duration_ms=int((time.perf_counter() - t_sub) * 1000),
                    detail=f"New qty: {res.get('new_quantity', 'N/A')}"
                ))

        elif intent == "INVENTORY_SELL":
            if not commodity or not quantity:
                agent_results = {"error": "Missing commodity or quantity for selling from inventory."}
            else:
                t_sub = time.perf_counter()
                res = await self.inventory_agent.update_inventory(commodity, float(quantity), "subtract", unit)
                agent_results = res
                if res.get("status") == "success":
                    actions_taken.append("INVENTORY_SELL")
                    ui_hints.append("inventory_update")
                execution_steps.append(ExecutionStep(
                    step_id="inventory_agent",
                    label=f"Updating inventory: Subtract {quantity} {unit} of {commodity}",
                    duration_ms=int((time.perf_counter() - t_sub) * 1000),
                    detail=f"Status: {res.get('status')}"
                ))

        elif intent == "INVENTORY_CHECK":
            t_sub = time.perf_counter()
            inv = await self.inventory_agent.get_inventory()
            summary = await self.inventory_agent.get_inventory_summary()
            agent_results = {"inventory": inv, "summary": summary}
            ui_hints.append("inventory_check")
            execution_steps.append(ExecutionStep(
                step_id="inventory_agent",
                label="Retrieving user inventory stock",
                duration_ms=int((time.perf_counter() - t_sub) * 1000),
                detail=f"{len(inv)} items in stock"
            ))

        elif intent == "MARKET_QUERY":
            if not commodity:
                agent_results = {"error": "Missing commodity for market price query."}
            else:
                t_sub = time.perf_counter()
                # Resolve via commodity agent first
                res_resolve = await self.commodity_agent.resolve(commodity)
                resolved_comm = res_resolve.canonical_name or commodity
                summary = await self.market_agent.get_market_summary(res_resolve.commodity_id or resolved_comm)
                agent_results = {"market_summary": summary, "resolved_commodity": resolved_comm}
                ui_hints.append("market_query")
                execution_steps.append(ExecutionStep(
                    step_id="market_agent",
                    label=f"Fetching prices for {resolved_comm}",
                    duration_ms=int((time.perf_counter() - t_sub) * 1000),
                    detail=f"Avg modal price: ₹{summary.get('avg_modal_price', 'N/A')}"
                ))

        elif intent == "DISPATCH_QUERY":
            if not origin or not destination:
                agent_results = {"error": "Missing origin or destination for transit query."}
            else:
                t_sub = time.perf_counter()
                plan = await self.dispatch_agent.plan(commodity or "Cotton", origin, destination)
                agent_results = {"dispatch_plan": plan}
                ui_hints.append("dispatch_query")
                execution_steps.append(ExecutionStep(
                    step_id="dispatch_agent",
                    label=f"Routing: {origin} → {destination}",
                    duration_ms=int((time.perf_counter() - t_sub) * 1000),
                    detail=f"Distance: {plan.get('distance_km', 'N/A')} km, Duration: {plan.get('duration_hours', 'N/A')}h"
                ))

        elif intent == "RECOMMENDATION":
            t_sub = time.perf_counter()
            rec = await self.trade_advisor_agent.get_recommendation(
                commodity_input=commodity or "Cotton",
                origin=origin or "Nagpur"
            )
            agent_results = {"recommendation": rec.model_dump()}
            ui_hints.append("recommendation")
            execution_steps.append(ExecutionStep(
                step_id="trade_advisor_agent",
                label=f"Compiling arbitrage advisory for {commodity or 'Cotton'}",
                duration_ms=int((time.perf_counter() - t_sub) * 1000),
                detail=f"Confidence: {rec.confidence_score}"
            ))

        elif intent == "BUYER_SEARCH":
            if not commodity:
                agent_results = {"error": "Please specify which commodity buyers you are searching for."}
            else:
                t_sub = time.perf_counter()
                buyers = await self.buyer_discovery_agent.find_buyers(commodity, origin, origin)
                buyer_summary = self.buyer_discovery_agent.get_buyer_summary(buyers, commodity)
                agent_results = {"buyers": buyers, "summary": buyer_summary}
                ui_hints.append("buyer_discovery")
                execution_steps.append(ExecutionStep(
                    step_id="buyer_discovery_agent",
                    label=f"Searching verified buyer network for {commodity}",
                    duration_ms=int((time.perf_counter() - t_sub) * 1000),
                    detail=f"Found {len(buyers)} prospective buyers"
                ))

        elif intent == "DEAL_ANALYSIS":
            if not commodity or not quantity:
                agent_results = {"error": "Deal analysis requires a specific commodity and quantity."}
            else:
                t_sub = time.perf_counter()
                # Run parallel checks: inventory fulfillment + market pricing
                fulfillment = await self.inventory_agent.check_fulfillment([
                    {"commodity": commodity, "quantity": quantity, "unit": unit}
                ])
                res_resolve = await self.commodity_agent.resolve(commodity)
                mkt_summary = await self.market_agent.get_market_summary(res_resolve.commodity_id or commodity)
                
                agent_results = {
                    "fulfillment": fulfillment,
                    "market_summary": mkt_summary,
                    "deal_commodity": commodity,
                    "deal_quantity": quantity,
                    "deal_unit": unit
                }
                ui_hints.append("deal_analysis")
                execution_steps.append(ExecutionStep(
                    step_id="deal_analysis",
                    label=f"Analyzing deal: {quantity} {unit} of {commodity}",
                    duration_ms=int((time.perf_counter() - t_sub) * 1000),
                    detail=f"Fulfillable: {fulfillment.get('can_fulfill')}"
                ))

        elif intent == "COMPLIANCE_QUERY":
            if not origin or not destination:
                agent_results = {"error": "Compliance check requires both origin and destination mandis."}
            else:
                t_sub = time.perf_counter()
                res = await self.compliance_agent.check(commodity or "Cotton", origin, destination)
                agent_results = {"compliance": res}
                ui_hints.append("compliance")
                execution_steps.append(ExecutionStep(
                    step_id="compliance_agent",
                    label=f"APMC / GST Compliance for {origin} → {destination}",
                    duration_ms=int((time.perf_counter() - t_sub) * 1000),
                    detail=res.get("regulatory_compliance_summary")
                ))

        elif intent == "LEARNING_QUERY":
            t_sub = time.perf_counter()
            stats = await self.commodity_agent.get_resolution_stats()
            agent_results = {"learning_stats": stats}
            ui_hints.append("learning_stats")
            execution_steps.append(ExecutionStep(
                step_id="commodity_agent_learning",
                label="Fetching linguistic adaptive learning stats",
                duration_ms=int((time.perf_counter() - t_sub) * 1000),
                detail=f"Total resolved: {stats.get('total_resolutions', 0)}"
            ))

        elif intent == "GREETING":
            # Simple greeting, pre-populate summary
            t_sub = time.perf_counter()
            summary = await self.inventory_agent.get_inventory_summary()
            agent_results = {"inventory_summary": summary}
            execution_steps.append(ExecutionStep(
                step_id="greeting",
                label="Retrieving greeting details",
                duration_ms=int((time.perf_counter() - t_sub) * 1000)
            ))

        else:
            # Fallback
            agent_results = {"message": "General system dialogue query."}

        # Refresh inventory snapshot again in session in case we changed it
        if "INVENTORY_ADD" in actions_taken or "INVENTORY_SELL" in actions_taken:
            await self.session_manager.refresh_inventory_snapshot(session)

        # 4. Synthesize Final Response using LLM
        t0 = time.perf_counter()
        synthesis_system_prompt = (
            "You are LUCY, the voice-enabled autonomous trade operations copilot for TradeNexus agricultural platform.\n"
            "Your task is to take the user's message, the conversation context, the classified intent, the specific agent results, and synthesize a masterfully premium response.\n\n"
            "Rules:\n"
            "1. Provide 'response_text': Beautifully formatted Markdown with clear lists, tables, bold text, or highlights where needed. Acknowledge and summarize any actions taken. If it's a Hindi/Hinglish query, write a highly natural, helpful Hinglish or Hindi response text based on the query language.\n"
            "2. Provide 'voice_response': A clean, concise 2-3 sentence speech summary. NO Markdown formatting, NO hyperlinks, NO parentheses, NO special symbols. It must be perfectly natural and easy to read aloud by a Text-to-Speech (TTS) engine. E.g. in Hinglish if they asked in Hinglish.\n"
            "3. Provide 'voice_language': either 'en', 'hi', or 'hinglish' depending on the response language.\n\n"
            "Respond ONLY with a JSON object containing exactly these fields:\n"
            "{\n"
            '  "response_text": str (Markdown),\n'
            '  "voice_response": str (clean TTS text),\n'
            '  "voice_language": "en"|"hi"|"hinglish"\n'
            "}"
        )

        synthesis_user_prompt = (
            f"User input message: '{message}'\n\n"
            f"Classified Intent: {intent}\n\n"
            f"Active Session Context variables:\n{json.dumps(session.context, indent=2)}\n\n"
            f"Agent Execution Results:\n{json.dumps(agent_results, indent=2)}\n\n"
            f"User Inventory Snapshot:\n{json.dumps(session.context.get('inventory_snapshot', {}), indent=2)}\n"
        )

        raw_synth = await self.llm.complete(synthesis_system_prompt, synthesis_user_prompt, expect_json=True)
        synth_data = _safe_json_parse(raw_synth) or {}

        response_text = synth_data.get("response_text", f"LUCY executed your query under intent {intent}.")
        voice_response = synth_data.get("voice_response", response_text)
        voice_language = synth_data.get("voice_language", language)

        # Save assistant message to memory
        await self.session_manager.append_message(session, "assistant", response_text)

        dur_synth = int((time.perf_counter() - t0) * 1000)
        execution_steps.append(ExecutionStep(
            step_id="response_synthesis",
            label="Synthesizing response and TTS audio copy",
            duration_ms=dur_synth
        ))

        # Construct final LucyResponse
        lucy_res = LucyResponse(
            session_id=session_id,
            response_text=response_text,
            voice_response=voice_response,
            voice_language=voice_language,
            execution_steps=execution_steps,
            actions_taken=actions_taken,
            context_update=session.context,
            ui_hints=ui_hints
        )

        return lucy_res
