import json
import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client
import glob
from collections import Counter

load_dotenv()

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_KEY"]
)

# Valid intent strings
VALID_INTENTS = {
    # Inventory
    "inventory_add", "inventory_subtract", "inventory_set", "inventory_query", "inventory_value_query",
    # Contracts
    "contract_create_buy", "contract_create_sell", "contract_status_query", "contract_update", "contract_cancel",
    # Market
    "market_price_query", "market_trend_query", "market_best_mandi_query", "market_forecast_query",
    # Dispatch
    "dispatch_create", "dispatch_status_query", "dispatch_route_query", "dispatch_delay_report",
    # Risk
    "risk_portfolio_query", "risk_pnl_query", "risk_alert_query", "risk_counterparty_query",
    # Buyers
    "find_buyers", "buyer_profile_query",
    # Compliance
    "compliance_invoice", "compliance_gst_query",
    # Deal
    "deal_evaluate", "deal_negotiation_range",
    # Context
    "greeting", "session_summary_request", "alias_correction"
}

def get_category(intent: str) -> str:
    if intent.startswith("inventory_"):
        return "Inventory"
    elif intent.startswith("contract_"):
        return "Contracts"
    elif intent.startswith("market_"):
        return "Market"
    elif intent.startswith("dispatch_"):
        return "Dispatch"
    elif intent.startswith("risk_"):
        return "Risk"
    elif intent in ("find_buyers", "buyer_profile_query"):
        return "Buyers"
    elif intent.startswith("compliance_"):
        return "Compliance"
    elif intent.startswith("deal_"):
        return "Deal"
    elif intent in ("greeting", "session_summary_request", "alias_correction"):
        return "Context"
    return "Unknown"

def build_action(intent: str) -> dict:
    if intent.startswith("inventory_"):
        agent = "inventory_agent"
    elif intent.startswith("contract_"):
        agent = "contract_agent"
    elif intent.startswith("market_"):
        agent = "market_agent"
    elif intent.startswith("dispatch_"):
        agent = "dispatch_agent"
    elif intent.startswith("risk_"):
        agent = "risk_agent"
    elif intent in ("find_buyers", "buyer_profile_query"):
        agent = "buyer_discovery_agent"
    elif intent.startswith("compliance_"):
        agent = "compliance_agent"
    elif intent.startswith("deal_"):
        agent = "trade_advisor_agent"
    elif intent in ("greeting", "session_summary_request"):
        agent = "lucy_orchestrator"
    elif intent == "alias_correction":
        agent = "commodity_agent"
    else:
        agent = "unknown_agent"

    method_map = {
        "inventory_add": "add_stock",
        "inventory_subtract": "subtract_stock",
        "inventory_set": "set_stock",
        "inventory_query": "query_stock",
        "inventory_value_query": "query_value",
        "contract_create_buy": "create_buy",
        "contract_create_sell": "create_sell",
        "contract_status_query": "query_status",
        "contract_update": "update_contract",
        "contract_cancel": "cancel_contract",
        "market_price_query": "query_price",
        "market_trend_query": "query_trend",
        "market_best_mandi_query": "query_best_mandi",
        "market_forecast_query": "query_forecast",
        "dispatch_create": "create_dispatch",
        "dispatch_status_query": "query_status",
        "dispatch_route_query": "query_route",
        "dispatch_delay_report": "report_delay",
        "risk_portfolio_query": "query_portfolio",
        "risk_pnl_query": "query_pnl",
        "risk_alert_query": "query_alerts",
        "risk_counterparty_query": "query_counterparty",
        "find_buyers": "search_buyers",
        "buyer_profile_query": "get_buyer_profile",
        "compliance_invoice": "generate_invoice",
        "compliance_gst_query": "query_gst",
        "deal_evaluate": "evaluate_deal",
        "deal_negotiation_range": "get_negotiation_range",
        "greeting": "respond_greeting",
        "session_summary_request": "get_summary",
        "alias_correction": "correct_alias"
    }

    return {
        "agent": agent,
        "method": method_map.get(intent, "execute"),
        "params": {}
    }

def to_bool(val) -> bool:
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        return val.lower() == 'true'
    return bool(val)

def parse_json_field(val) -> dict:
    if isinstance(val, dict):
        return val
    if isinstance(val, str) and val.strip():
        try:
            return json.loads(val)
        except json.JSONDecodeError:
            pass
    return {}

# Find latest adapted file
files = [Path("pipeline/output/intent_rag_final.jsonl")]
if not files[0].exists():
    raise FileNotFoundError(
        "Run pipeline/prepare_intent_corpus.py first."
    )
if not files:
    raise FileNotFoundError(
        "No adapted intent file found. "
        "Run pipeline/run_intent_adaptation.py first."
    )
adapted_file = files[0]
print(f"Loading: {adapted_file}")

def detect_script(lang):
    mapping = {
        "en": "latin",
        "hi-en": "latin",
        "hi": "devanagari",
        "mr": "devanagari",
        "bn": "bengali",
        "gu": "gujarati",
        "kn": "kannada",
        "ta": "tamil",
        "te": "telugu",
        "pa": "gurmukhi"
    }
    return mapping.get(lang, "unknown")

# Parse and validate rows
rows = []
skipped = 0
with open(adapted_file, encoding="utf-8") as f:
    for line_num, line in enumerate(f, 1):
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            skipped += 1
            continue
        
        # Validate required fields
        if not row.get("utterance") or not row.get("intent"):
            skipped += 1
            continue
        
        # Ensure intent is valid
        if row["intent"] not in VALID_INTENTS:
            skipped += 1
            continue
        
        # Normalize structure
        normalized = {
            "id": row.get("id", f"ADAPTED-{line_num:05d}"),
            "utterance": row["utterance"],
            "utterance_normalized": row.get("utterance_normalized"),
            "utterance_language": row.get("utterance_language", "en"),
            "utterance_script": detect_script(row.get("utterance_language", "en")),
            "intent": row["intent"],
            "intent_category": row.get("intent_category") or get_category(row["intent"]),
            "entities": parse_json_field(row.get("entities")),
            "action": parse_json_field(row.get("action")) or build_action(row["intent"]),
            "requires_context": to_bool(row.get("requires_context", False)),
            "requires_confirmation": to_bool(row.get("requires_confirmation", False)),
            "is_ambiguous": to_bool(row.get("is_ambiguous", False)),
            "difficulty": row.get("difficulty", "simple"),
            "source": "adaption_adapted",
            "region": row.get("region", "pan_india"),
            "trader_type": row.get("trader_type", "general"),
        }
        rows.append(normalized)

print(f"Parsed: {len(rows)} valid rows, {skipped} skipped")

# Upsert in batches of 100
BATCH_SIZE = 100
imported = 0
for i in range(0, len(rows), BATCH_SIZE):
    batch = rows[i:i+BATCH_SIZE]
    result = supabase.table("intent_examples").upsert(
        batch, on_conflict="id"
    ).execute()
    imported += len(batch)
    print(f"  Imported {imported}/{len(rows)} rows...")

# Print breakdown by language
print("\n=== Language Breakdown ===")
try:
    result = supabase.rpc("intent_language_breakdown").execute()
    if result.data:
        for item in result.data:
            print(f"  {item.get('utterance_language')}: {item.get('count')}")
    else:
        raise Exception("RPC returned no data")
except Exception as e:
    # Fallback: manual count
    langs = Counter(r["utterance_language"] for r in rows)
    for lang, count in sorted(langs.items(), key=lambda x: -x[1]):
        print(f"  {lang}: {count}")

print(f"\n[SUCCESS] Import complete: {imported} examples loaded")
print("  Next: run python services/api/scripts/build_intent_embeddings.py")
