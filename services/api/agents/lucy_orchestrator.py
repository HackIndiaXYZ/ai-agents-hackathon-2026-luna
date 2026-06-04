"""
TradeNexus — Lucy Autonomous Orchestrator.

The core cognitive brain of Lucy. Classifies conversation intent with pronoun
resolution, orchestrates other agents, and synthesizes rich markdown responses
with clean Text-to-Speech audio copy.
"""

import time
import json
import logging
from datetime import date
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

        # Lazy-initialized CTRM agents (initialized on first use)
        self._contract_agent = None
        self._risk_agent = None
        self._weather_agent = None
        self._ml_agent = None
        self._counterparty_agent = None

    def _get_contract_agent(self):
        """Lazy-initialize ContractAgent using existing Supabase client."""
        if self._contract_agent is None:
            from agents.contract_agent import ContractAgent
            self._contract_agent = ContractAgent(
                supabase_client=self.commodity_agent.sb,
                commodity_agent=self.commodity_agent,
            )
        return self._contract_agent

    def _get_risk_agent(self):
        """Lazy-initialize RiskAgent."""
        if self._risk_agent is None:
            from agents.risk_agent import RiskAgent
            self._risk_agent = RiskAgent(supabase_client=self.commodity_agent.sb)
        return self._risk_agent

    def _get_weather_agent(self):
        """Lazy-initialize WeatherAgent."""
        if self._weather_agent is None:
            from agents.weather_agent import WeatherAgent
            self._weather_agent = WeatherAgent(supabase_client=self.commodity_agent.sb)
        return self._weather_agent

    def _get_ml_agent(self):
        """Lazy-initialize MLInferenceAgent."""
        if self._ml_agent is None:
            from agents.ml_inference_agent import MLInferenceAgent
            self._ml_agent = MLInferenceAgent(supabase_client=self.commodity_agent.sb)
        return self._ml_agent

    def _get_counterparty_agent(self):
        """Lazy-initialize CounterpartyAgent."""
        if self._counterparty_agent is None:
            from agents.counterparty_agent import CounterpartyAgent
            self._counterparty_agent = CounterpartyAgent(
                supabase_client=self.commodity_agent.sb
            )
        return self._counterparty_agent

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
            "Intents MUST be one of the following 21 options:\n"
            "- INVENTORY_ADD: User wants to add, increase, or update commodity stock levels (e.g. 'Add 50 quintal potatoes', 'potatoes add karo 50 quintals')\n"
            "- INVENTORY_CHECK: User wants to check, view, list, or summarize their commodity stock (e.g. 'What is in my inventory?', 'inventory dikhao', 'mere paas kya stock hai')\n"
            "- INVENTORY_SELL: User wants to sell, remove, or subtract commodity stock levels (e.g. 'Sell 100 quintal cotton', 'cotton bechna hai 100 quintal')\n"
            "- MARKET_QUERY: User wants to check market prices or trends (e.g. 'What is the price of cotton?', 'cotton ka bhav kya hai?')\n"
            "- DISPATCH_QUERY: User wants to check routes, travel times, transport corridors, or distance (e.g. 'Route from Nagpur to Mumbai')\n"
            "- RECOMMENDATION: User wants trade recommendations or arbitrage advisories (e.g. 'Suggest a trade', 'best recommendation for cotton')\n"
            "- BUYER_SEARCH: User wants to search for potential buyers or mills (e.g. 'Find cotton buyers near Nagpur')\n"
            "- DEAL_ANALYSIS: User wants to analyze a prospective deal, contract, or requirement (e.g. 'Analyze an offer of 100 quintals Cotton at Nagpur', 'kya ye deal acchi hai?')\n"
            "- COMPLIANCE_QUERY: User wants legal or permit/document compliance checks (e.g. 'What permits do I need for cotton to Mumbai?')\n"
            "- LEARNING_QUERY: User wants system activity, training stats, or alias learning info (e.g. 'Show me learning stats')\n"
            "- GREETING: Simple greetings or polite remarks (e.g. 'Hello', 'Hi Lucy', 'good morning')\n"
            "- CONTRACT_CREATE: User wants to create a buy or sell contract (e.g. 'Buy 100 quintal cotton from Ramesh Mills', 'sell 200 quintal wheat to Sharma Traders', 'naya contract banao')\n"
            "- CONTRACT_STATUS: User wants to check the status of an existing contract (e.g. 'What is the status of TN-2026-0001?', 'mera contract kahan hai?', 'where is my shipment?')\n"
            "- PNL_QUERY: User wants their P&L or financial performance (e.g. 'What is my P&L?', 'how much am I making?', 'portfolio performance?', 'kya mera profit hai?')\n"
            "- RISK_QUERY: User wants risk alerts or portfolio risk assessment (e.g. 'What are my risks?', 'any risk alerts?', 'portfolio risk check')\n"
            "- DISPATCH_CREATE: User wants to schedule or create a dispatch for a contract (e.g. 'Schedule dispatch for contract TN-2026-0001', 'dispatch lagao contract pe')\n"
            "- WEATHER_QUERY: User wants weather conditions on a trade route or location (e.g. 'How is the weather on Nagpur route?', 'check weather for Vidarbha')\n"
            "- FORECAST_QUERY: User wants an ML price forecast for a commodity (e.g. 'What will cotton prices be next week?', 'cotton ka price forecast kya hai?', 'predict price')\n"
            "- DOCUMENT_PARSE: User wants to parse an invoice, extract data, or analyze a document (e.g. 'parse this invoice', 'extract contract from this document')\n"
            "- UNKNOWN: Fallback if the query matches none of the above.\n\n"
            "PRONOUN RESOLUTION RULE:\n"
            "Identify pronouns or indirect references like 'isko', 'wahan', 'use', 'it', 'there', 'them' and resolve them using the conversation history or active context.\n\n"
            "Respond ONLY with a JSON object containing exactly these fields:\n"
            "{\n"
            '  "intent": "INVENTORY_ADD"|... (one of the 21 intents),\n'
            '  "commodity": str|null (canonical name of the commodity, e.g. "Cotton"),\n'
            '  "quantity": float|null (quantity of commodity, e.g. 50.0),\n'
            '  "unit": str|null (e.g. "quintal"),\n'
            '  "origin": str|null (e.g. "Nagpur"),\n'
            '  "destination": str|null (e.g. "Mumbai"),\n'
            '  "counterparty": str|null (name of buyer or seller),\n'
            '  "price": float|null (price per unit if mentioned),\n'
            '  "contract_ref": str|null (contract number or ID if referenced, e.g. "TN-2026-0001"),\n'
            '  "deal_details": str|null (if the query represents a deal to analyze),\n'
            '  "raw_text": str|null (the full verbatim query for document parsing intents),\n'
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
        counterparty = intent_data.get("counterparty")
        price = intent_data.get("price")
        contract_ref = intent_data.get("contract_ref")

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
                # Run parallel checks: inventory fulfillment + market pricing + ML forecast
                fulfillment = await self.inventory_agent.check_fulfillment([
                    {"commodity": commodity, "quantity": quantity, "unit": unit}
                ])
                res_resolve = await self.commodity_agent.resolve(commodity)
                mkt_summary = await self.market_agent.get_market_summary(res_resolve.commodity_id or commodity)

                # Enrich with ML forecast if available
                forecast_data = None
                try:
                    ml = self._get_ml_agent()
                    forecast_data = await ml.forecast_price(res_resolve.canonical_name or commodity, days=7)
                except Exception as e:
                    logger.warning(f"ML forecast unavailable for deal analysis: {e}")

                # Compute deal margins if price was mentioned
                deal_margin = None
                if price and mkt_summary.get("avg_modal_price"):
                    avg_mkt = float(mkt_summary["avg_modal_price"])
                    deal_price = float(price)
                    deal_margin = {
                        "deal_price": deal_price,
                        "market_price": avg_mkt,
                        "margin_per_unit": round(deal_price - avg_mkt, 2),
                        "total_deal_value": round(deal_price * float(quantity), 2),
                        "market_value": round(avg_mkt * float(quantity), 2),
                        "margin_pct": round(((deal_price - avg_mkt) / avg_mkt) * 100, 2) if avg_mkt > 0 else 0.0
                    }

                agent_results = {
                    "fulfillment": fulfillment,
                    "market_summary": mkt_summary,
                    "deal_commodity": commodity,
                    "deal_quantity": quantity,
                    "deal_unit": unit,
                    "deal_margin": deal_margin,
                    "forecast": forecast_data
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
            t_sub = time.perf_counter()
            summary = await self.inventory_agent.get_inventory_summary()
            agent_results = {"inventory_summary": summary}
            execution_steps.append(ExecutionStep(
                step_id="greeting",
                label="Retrieving greeting details",
                duration_ms=int((time.perf_counter() - t_sub) * 1000)
            ))

        # --- NEW CTRM INTENTS ---

        elif intent == "CONTRACT_CREATE":
            t_sub = time.perf_counter()
            try:
                ca = self._get_contract_agent()
                # Parse contract fields from natural language
                parsed = await ca.parse_from_text(message)

                execution_steps.append(ExecutionStep(
                    step_id="contract_agent_parse",
                    label="Parsing contract details from natural language",
                    duration_ms=int((time.perf_counter() - t_sub) * 1000),
                    detail=f"Commodity: {parsed.get('commodity')}, Qty: {parsed.get('quantity')} {parsed.get('unit')}"
                ))

                # Check if confidence is high enough to auto-create
                parse_confidence = confidence  # Use intent classifier confidence
                has_required = parsed.get("commodity") and parsed.get("quantity") and parsed.get("type")

                if has_required and parse_confidence >= 0.70:
                    # Resolve counterparty if provided
                    counterparty_id = None
                    if parsed.get("counterparty"):
                        t_cp = time.perf_counter()
                        try:
                            cp_agent = self._get_counterparty_agent()
                            cp = await cp_agent.create_or_get(parsed["counterparty"])
                            counterparty_id = cp.get("id")
                            execution_steps.append(ExecutionStep(
                                step_id="counterparty_agent",
                                label=f"Resolved counterparty: {parsed['counterparty']}",
                                duration_ms=int((time.perf_counter() - t_cp) * 1000),
                                detail=f"Counterparty ID: {counterparty_id}"
                            ))
                        except Exception as e:
                            logger.warning(f"Counterparty resolution failed: {e}")

                    # Create the contract
                    t_create = time.perf_counter()
                    contract_data = {
                        "type": parsed.get("type", "buy"),
                        "commodity": parsed.get("commodity"),
                        "quantity": parsed.get("quantity"),
                        "unit": parsed.get("unit", "quintal"),
                        "price_per_unit": parsed.get("price"),
                        "counterparty_id": counterparty_id,
                        "delivery_date": parsed.get("delivery_date"),
                        "delivery_location": parsed.get("delivery_location"),
                        "payment_terms": parsed.get("payment_terms"),
                    }
                    created = await ca.create_contract(contract_data)
                    actions_taken.append("CONTRACT_CREATE")
                    ui_hints.append("contract_created")
                    # Add navigate hint with contract number
                    ui_hints.append(f"navigate:/app/contracts?id={created.get('id', '')}")

                    agent_results = {
                        "contract": created,
                        "parsed_fields": parsed,
                        "action": "created"
                    }
                    execution_steps.append(ExecutionStep(
                        step_id="contract_agent_create",
                        label=f"Contract created: {created.get('contract_number', 'N/A')}",
                        duration_ms=int((time.perf_counter() - t_create) * 1000),
                        detail=f"Value: ₹{created.get('contract_value', 'TBD')}"
                    ))
                else:
                    # Low confidence — return parsed fields for user to confirm
                    agent_results = {
                        "parsed_fields": parsed,
                        "action": "needs_confirmation",
                        "reason": "Low confidence parsing — please confirm or provide more details"
                    }
                    ui_hints.append("contract_draft")

            except Exception as e:
                logger.error(f"CONTRACT_CREATE handler failed: {e}", exc_info=True)
                agent_results = {"error": f"Contract creation failed: {str(e)}"}

        elif intent == "CONTRACT_STATUS":
            t_sub = time.perf_counter()
            try:
                ca = self._get_contract_agent()
                if contract_ref:
                    details = await ca.get_contract_detail(contract_ref)
                    contract = details.get("contract", {})
                    dispatches = details.get("dispatches", [])
                    compliance = details.get("compliance", {})
                    pnl_history = details.get("pnl_history", [])

                    agent_results = {
                        "contract": contract,
                        "dispatches": dispatches,
                        "compliance": compliance,
                        "pnl_history": pnl_history,
                        "contract_ref": contract_ref
                    }
                    ui_hints.append("contract_status")
                    execution_steps.append(ExecutionStep(
                        step_id="contract_agent_status",
                        label=f"Fetching contract details: {contract_ref}",
                        duration_ms=int((time.perf_counter() - t_sub) * 1000),
                        detail=f"Status: {contract.get('status', 'unknown')}, Dispatches: {len(dispatches)}"
                    ))
                else:
                    # List recent contracts
                    contracts = await ca.get_contracts({"status": "confirmed"})
                    agent_results = {
                        "contracts": contracts[:5],
                        "action": "recent_open_contracts"
                    }
                    ui_hints.append("contract_status")
                    execution_steps.append(ExecutionStep(
                        step_id="contract_agent_list",
                        label="Fetching recent open contracts",
                        duration_ms=int((time.perf_counter() - t_sub) * 1000),
                        detail=f"Found {len(contracts)} open contracts"
                    ))
            except Exception as e:
                logger.error(f"CONTRACT_STATUS handler failed: {e}", exc_info=True)
                agent_results = {"error": f"Contract status lookup failed: {str(e)}"}

        elif intent == "PNL_QUERY":
            t_sub = time.perf_counter()
            try:
                risk_agent = self._get_risk_agent()
                portfolio = await risk_agent.get_portfolio_summary()
                execution_steps.append(ExecutionStep(
                    step_id="risk_agent_pnl",
                    label="Computing portfolio Mark-to-Market P&L",
                    duration_ms=int((time.perf_counter() - t_sub) * 1000),
                    detail=f"Total P&L: ₹{portfolio.get('total_unrealized_pnl', 0):,.0f} across {portfolio.get('total_open_contracts', 0)} contracts"
                ))
                agent_results = {
                    "portfolio": portfolio,
                    "total_pnl": portfolio.get("total_unrealized_pnl", 0),
                    "winners": portfolio.get("pnl_positive_count", 0),
                    "losers": portfolio.get("pnl_negative_count", 0),
                    "biggest_winner": portfolio.get("biggest_winner"),
                    "biggest_loser": portfolio.get("biggest_loser"),
                    "commodity_exposure": portfolio.get("commodity_exposure", {}),
                    "concentration_risk": portfolio.get("concentration_risk")
                }
                ui_hints.append("pnl_summary")
            except Exception as e:
                logger.error(f"PNL_QUERY handler failed: {e}", exc_info=True)
                agent_results = {"error": f"P&L computation failed: {str(e)}"}

        elif intent == "RISK_QUERY":
            t_sub = time.perf_counter()
            try:
                risk_agent = self._get_risk_agent()
                # Run portfolio summary + detect alerts
                portfolio = await risk_agent.get_portfolio_summary()
                execution_steps.append(ExecutionStep(
                    step_id="risk_agent_summary",
                    label="Analyzing portfolio risk exposure",
                    duration_ms=int((time.perf_counter() - t_sub) * 1000),
                    detail=f"Concentration risk: {portfolio.get('concentration_risk', 'None detected')}"
                ))

                t_alerts = time.perf_counter()
                alerts = await risk_agent.detect_risk_alerts()
                execution_steps.append(ExecutionStep(
                    step_id="risk_agent_alerts",
                    label="Scanning for active risk violations",
                    duration_ms=int((time.perf_counter() - t_alerts) * 1000),
                    detail=f"Detected {len(alerts)} risk alert(s)"
                ))

                agent_results = {
                    "portfolio": portfolio,
                    "alerts": alerts[:5],  # Top 5 alerts
                    "total_alerts": len(alerts),
                    "concentration_risk": portfolio.get("concentration_risk"),
                    "biggest_loser": portfolio.get("biggest_loser")
                }
                ui_hints.append("risk_alerts")
            except Exception as e:
                logger.error(f"RISK_QUERY handler failed: {e}", exc_info=True)
                agent_results = {"error": f"Risk analysis failed: {str(e)}"}

        elif intent == "DISPATCH_CREATE":
            t_sub = time.perf_counter()
            try:
                if not contract_ref:
                    agent_results = {
                        "error": "Please specify a contract number to create a dispatch for (e.g. TN-2026-0001)."
                    }
                else:
                    ca = self._get_contract_agent()
                    contract_detail = await ca.get_contract_detail(contract_ref)
                    contract = contract_detail.get("contract", {})

                    execution_steps.append(ExecutionStep(
                        step_id="contract_agent_lookup",
                        label=f"Resolving contract: {contract_ref}",
                        duration_ms=int((time.perf_counter() - t_sub) * 1000),
                        detail=f"Status: {contract.get('status')} | Qty: {contract.get('quantity')} {contract.get('unit')}"
                    ))

                    # Check contract is in right state for dispatch
                    contract_status = contract.get("status", "")
                    if contract_status not in ["confirmed", "in_transit"]:
                        agent_results = {
                            "error": f"Cannot create dispatch: contract is in '{contract_status}' state. Only 'confirmed' or 'in_transit' contracts can have dispatches."
                        }
                    else:
                        # Build dispatch row directly via Supabase
                        t_disp = time.perf_counter()
                        sb = self.commodity_agent.sb

                        # Generate dispatch number
                        num_res = sb.rpc("generate_dispatch_number", {}).execute()
                        dispatch_number = (
                            num_res.data if isinstance(num_res.data, str)
                            else f"TND-{date.today().year}-LUCY"
                        )

                        # Get delivery info from contract
                        disp_origin = origin or contract.get("delivery_location") or "Nagpur"
                        disp_destination = destination or contract.get("delivery_location") or "Mumbai"
                        disp_qty = quantity or contract.get("quantity") or 0

                        row = {
                            "dispatch_number": dispatch_number,
                            "contract_id": contract.get("id"),
                            "dispatched_quantity": float(disp_qty),
                            "dispatch_date": date.today().isoformat(),
                            "origin": disp_origin,
                            "destination": disp_destination,
                            "status": "scheduled",
                        }

                        ins = sb.table("dispatches").insert(row).execute()
                        dispatch = ins.data[0] if ins.data else row

                        # Update contract to in_transit if confirmed
                        if contract_status == "confirmed":
                            sb.table("contracts").update({"status": "in_transit"}).eq(
                                "id", contract.get("id")
                            ).execute()

                        actions_taken.append("DISPATCH_CREATE")
                        ui_hints.append("dispatch_created")
                        ui_hints.append(f"navigate:/app/dispatch")

                        agent_results = {
                            "dispatch": dispatch,
                            "contract": contract,
                            "dispatch_number": dispatch_number,
                            "contract_ref": contract_ref
                        }
                        execution_steps.append(ExecutionStep(
                            step_id="dispatch_agent_create",
                            label=f"Dispatch {dispatch_number} scheduled",
                            duration_ms=int((time.perf_counter() - t_disp) * 1000),
                            detail=f"{disp_qty} {unit} | {disp_origin} → {disp_destination}"
                        ))

            except Exception as e:
                logger.error(f"DISPATCH_CREATE handler failed: {e}", exc_info=True)
                agent_results = {"error": f"Dispatch creation failed: {str(e)}"}

        elif intent == "WEATHER_QUERY":
            t_sub = time.perf_counter()
            try:
                region = origin or destination or "Nagpur"
                weather_agent = self._get_weather_agent()
                forecast = await weather_agent.get_forecast(region)
                execution_steps.append(ExecutionStep(
                    step_id="weather_agent",
                    label=f"Fetching 7-day weather forecast for {region}",
                    duration_ms=int((time.perf_counter() - t_sub) * 1000),
                    detail=f"Max risk score: {forecast.get('max_risk_score', 0):.2f} | Risk days: {len(forecast.get('risk_days', []))}"
                ))
                agent_results = {
                    "weather": forecast,
                    "region": region,
                    "max_risk_score": forecast.get("max_risk_score", 0),
                    "risk_days": forecast.get("risk_days", []),
                    "forecast": forecast.get("forecast", [])
                }
                ui_hints.append("weather_forecast")
            except Exception as e:
                logger.error(f"WEATHER_QUERY handler failed: {e}", exc_info=True)
                agent_results = {"error": f"Weather forecast failed: {str(e)}"}

        elif intent == "FORECAST_QUERY":
            t_sub = time.perf_counter()
            try:
                forecast_commodity = commodity or "Cotton"
                ml = self._get_ml_agent()
                execution_steps.append(ExecutionStep(
                    step_id="ml_inference_loading",
                    label=f"Loading ML forecasting model for {forecast_commodity}",
                    duration_ms=int((time.perf_counter() - t_sub) * 1000),
                    detail="LSTM / Prophet / XGBoost ensemble"
                ))

                t_pred = time.perf_counter()
                forecast = await ml.forecast_price(forecast_commodity, days=7)
                if forecast is None:
                    agent_results = {"error": f"No forecast model available for {forecast_commodity}."}
                else:
                    prices = forecast.get("forecasted_prices", [])
                    first_price = prices[0]["price"] if prices else None
                    last_price = prices[-1]["price"] if prices else None
                    trend = "rising" if (last_price and first_price and last_price > first_price) else "falling" if (last_price and first_price and last_price < first_price) else "stable"

                    execution_steps.append(ExecutionStep(
                        step_id="ml_inference_predict",
                        label=f"Price forecast generated for {forecast_commodity}",
                        duration_ms=int((time.perf_counter() - t_pred) * 1000),
                        detail=f"7-day range: ₹{first_price:,.0f} → ₹{last_price:,.0f} ({trend}) | MAPE: {forecast.get('mape', 'N/A')}%"
                    ))

                    agent_results = {
                        "forecast": forecast,
                        "commodity": forecast_commodity,
                        "forecasted_prices": prices,
                        "trend": trend,
                        "model_type": forecast.get("model_type", "LSTM"),
                        "mape": forecast.get("mape"),
                        "price_range": {
                            "start": first_price,
                            "end": last_price,
                            "direction": trend
                        }
                    }
                    ui_hints.append("price_forecast")

            except Exception as e:
                logger.error(f"FORECAST_QUERY handler failed: {e}", exc_info=True)
                agent_results = {"error": f"Price forecast failed: {str(e)}"}

        elif intent == "DOCUMENT_PARSE":
            t_sub = time.perf_counter()
            try:
                from agents.ingestion_agent import IngestionAgent
                ca = self._get_contract_agent()
                ingestion = IngestionAgent(
                    supabase_client=self.commodity_agent.sb,
                    llm_provider=self.llm,
                    contract_agent=ca
                )
                # Parse as field note (text-based, no file upload in Lucy chat)
                raw_note = intent_data.get("raw_text") or message
                parsed_note = await ingestion.parse_field_note(raw_note)

                execution_steps.append(ExecutionStep(
                    step_id="ingestion_agent",
                    label="Parsing trade document / field note",
                    duration_ms=int((time.perf_counter() - t_sub) * 1000),
                    detail=f"Action: {parsed_note.get('action', 'unknown')} | Confidence: {parsed_note.get('confidence', 0):.2f}"
                ))

                agent_results = {
                    "parsed": parsed_note,
                    "action": parsed_note.get("action"),
                    "commodity": parsed_note.get("commodity"),
                    "quantity": parsed_note.get("quantity"),
                    "counterparty": parsed_note.get("counterparty_name")
                }
                ui_hints.append("document_parsed")

            except Exception as e:
                logger.error(f"DOCUMENT_PARSE handler failed: {e}", exc_info=True)
                agent_results = {"error": f"Document parsing failed: {str(e)}"}

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
            "For CONTRACT_CREATE: Confirm the contract was created, state the contract number, commodity, quantity, and counterparty.\n"
            "For PNL_QUERY: Lead with the total P&L figure (green for positive, mention winning vs losing contracts).\n"
            "For RISK_QUERY: Start with the most critical risk, then enumerate alerts in priority order.\n"
            "For FORECAST_QUERY: State the trend direction and 7-day price range clearly. Mention model accuracy (MAPE).\n"
            "For WEATHER_QUERY: State if the route is clear or risky, and list specific risk days.\n"
            "For DISPATCH_CREATE: Confirm the dispatch was scheduled, state dispatch number and route.\n\n"
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
