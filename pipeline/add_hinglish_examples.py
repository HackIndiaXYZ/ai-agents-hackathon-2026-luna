"""
pipeline/add_hinglish_examples.py

Adds 90 hand-crafted Hinglish examples (30 intents × 3 each)
to the intent corpus before loading into Supabase.

Hinglish = Latin-script Hindi mixed with English.
Examples: "50 quintal kapas add kar de", "Nagpur ka rate kya hai"

Run AFTER prepare_intent_corpus.py, BEFORE import_intent_corpus.py.
Appends to intent_rag_final.jsonl.
"""

import json
from pathlib import Path

OUTPUT_FILE = "pipeline/output/intent_rag_final.jsonl"

# 3 examples per intent, 30 intents = 90 rows
# These are real trader utterances — not translated, hand-crafted
HINGLISH_EXAMPLES = [

    # ── INVENTORY ────────────────────────────────────────────────
    {
        "id": "HI-EN-inv_add-001", "utterance": "50 quintal kapas add kar de inventory mein",
        "intent": "inventory_add", "intent_category": "Inventory", "agent": "inventory_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": 50.0, "unit": "quintal",
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-inv_add-002", "utterance": "100 quintal gehu stock mein daal do",
        "intent": "inventory_add", "intent_category": "Inventory", "agent": "inventory_agent",
        "entities": {"commodity_canonical": "Wheat", "quantity": 100.0, "unit": "quintal",
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-inv_add-003", "utterance": "naya lot aaya hai, 150 quintal soybean add karo",
        "intent": "inventory_add", "intent_category": "Inventory", "agent": "inventory_agent",
        "entities": {"commodity_canonical": "Soybean", "quantity": 150.0, "unit": "quintal",
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-inv_sub-001", "utterance": "inventory se 30 quintal pyaz nikaal do",
        "intent": "inventory_subtract", "intent_category": "Inventory", "agent": "inventory_agent",
        "entities": {"commodity_canonical": "Onion", "quantity": 30.0, "unit": "quintal",
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-inv_sub-002", "utterance": "50 quintal cotton stock se kam karo",
        "intent": "inventory_subtract", "intent_category": "Inventory", "agent": "inventory_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": 50.0, "unit": "quintal",
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-inv_sub-003", "utterance": "80 quintal sarso warehouse se hat gaya, update karo",
        "intent": "inventory_subtract", "intent_category": "Inventory", "agent": "inventory_agent",
        "entities": {"commodity_canonical": "Mustard", "quantity": 80.0, "unit": "quintal",
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-inv_set-001", "utterance": "kapas ka stock 200 quintal set kar do",
        "intent": "inventory_set", "intent_category": "Inventory", "agent": "inventory_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": 200.0, "unit": "quintal",
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-inv_set-002", "utterance": "gehu inventory abhi 500 quintal hai",
        "intent": "inventory_set", "intent_category": "Inventory", "agent": "inventory_agent",
        "entities": {"commodity_canonical": "Wheat", "quantity": 500.0, "unit": "quintal",
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-inv_set-003", "utterance": "chana stock 60 quintal update kar",
        "intent": "inventory_set", "intent_category": "Inventory", "agent": "inventory_agent",
        "entities": {"commodity_canonical": "Chickpea", "quantity": 60.0, "unit": "quintal",
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-inv_qry-001", "utterance": "mera kapas ka stock kitna hai",
        "intent": "inventory_query", "intent_category": "Inventory", "agent": "inventory_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-inv_qry-002", "utterance": "abhi mere paas kitna gehu hai",
        "intent": "inventory_query", "intent_category": "Inventory", "agent": "inventory_agent",
        "entities": {"commodity_canonical": "Wheat", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-inv_qry-003", "utterance": "soybean stock check karo",
        "intent": "inventory_query", "intent_category": "Inventory", "agent": "inventory_agent",
        "entities": {"commodity_canonical": "Soybean", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-inv_val-001", "utterance": "mera kapas stock kitne ka hai aaj",
        "intent": "inventory_value_query", "intent_category": "Inventory", "agent": "inventory_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-inv_val-002", "utterance": "mere gehu ki total value kya hai",
        "intent": "inventory_value_query", "intent_category": "Inventory", "agent": "inventory_agent",
        "entities": {"commodity_canonical": "Wheat", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-inv_val-003", "utterance": "soybean inventory ka market value batao",
        "intent": "inventory_value_query", "intent_category": "Inventory", "agent": "inventory_agent",
        "entities": {"commodity_canonical": "Soybean", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },

    # ── CONTRACTS ────────────────────────────────────────────────
    {
        "id": "HI-EN-ctr_buy-001", "utterance": "Ramesh se 40 quintal kapas khareedna hai",
        "intent": "contract_create_buy", "intent_category": "Contracts", "agent": "contract_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": 40.0, "unit": "quintal",
                     "counterparty": "Ramesh", "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctr_buy-002", "utterance": "200 quintal gehu buy karna hai Bharat Agro se",
        "intent": "contract_create_buy", "intent_category": "Contracts", "agent": "contract_agent",
        "entities": {"commodity_canonical": "Wheat", "quantity": 200.0, "unit": "quintal",
                     "counterparty": "Bharat Agro", "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctr_buy-003", "utterance": "Suresh Farms se 80 quintal sarso purchase karo",
        "intent": "contract_create_buy", "intent_category": "Contracts", "agent": "contract_agent",
        "entities": {"commodity_canonical": "Mustard", "quantity": 80.0, "unit": "quintal",
                     "counterparty": "Suresh Farms", "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctr_sell-001", "utterance": "Bharat Agro ko 100 quintal gehu bechna hai",
        "intent": "contract_create_sell", "intent_category": "Contracts", "agent": "contract_agent",
        "entities": {"commodity_canonical": "Wheat", "quantity": 100.0, "unit": "quintal",
                     "counterparty": "Bharat Agro", "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctr_sell-002", "utterance": "Nagpur Mills ko 50 quintal kapas sell karo",
        "intent": "contract_create_sell", "intent_category": "Contracts", "agent": "contract_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": 50.0, "unit": "quintal",
                     "counterparty": "Nagpur Mills", "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctr_sell-003", "utterance": "300 quintal chana Akola Traders ko becho",
        "intent": "contract_create_sell", "intent_category": "Contracts", "agent": "contract_agent",
        "entities": {"commodity_canonical": "Chickpea", "quantity": 300.0, "unit": "quintal",
                     "counterparty": "Akola Traders", "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctr_stat-001", "utterance": "Ramesh wala contract kahan tak pahuncha",
        "intent": "contract_status_query", "intent_category": "Contracts", "agent": "contract_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": "Ramesh", "location": None},
        "requires_context": True, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctr_stat-002", "utterance": "mera soybean contract confirm hua ya nahi",
        "intent": "contract_status_query", "intent_category": "Contracts", "agent": "contract_agent",
        "entities": {"commodity_canonical": "Soybean", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": True, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctr_stat-003", "utterance": "Bharat Agro ka deal settle hua kya",
        "intent": "contract_status_query", "intent_category": "Contracts", "agent": "contract_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": "Bharat Agro", "location": None},
        "requires_context": True, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctr_upd-001", "utterance": "Ramesh wale contract mein price 2500 kar do",
        "intent": "contract_update", "intent_category": "Contracts", "agent": "contract_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": "Ramesh", "location": None},
        "requires_context": True, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctr_upd-002", "utterance": "delivery date change karo, ab 20 June hai",
        "intent": "contract_update", "intent_category": "Contracts", "agent": "contract_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": True, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctr_upd-003", "utterance": "quantity update karo — 250 quintal ho gayi",
        "intent": "contract_update", "intent_category": "Contracts", "agent": "contract_agent",
        "entities": {"commodity_canonical": None, "quantity": 250.0, "unit": "quintal",
                     "counterparty": None, "location": None},
        "requires_context": True, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctr_cncl-001", "utterance": "Ramesh wala contract cancel kar do",
        "intent": "contract_cancel", "intent_category": "Contracts", "agent": "contract_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": "Ramesh", "location": None},
        "requires_context": True, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctr_cncl-002", "utterance": "ye soybean deal band karo Bharat Agro ke saath",
        "intent": "contract_cancel", "intent_category": "Contracts", "agent": "contract_agent",
        "entities": {"commodity_canonical": "Soybean", "quantity": None, "unit": None,
                     "counterparty": "Bharat Agro", "location": None},
        "requires_context": True, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctr_cncl-003", "utterance": "pending contract void kar do",
        "intent": "contract_cancel", "intent_category": "Contracts", "agent": "contract_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": True, "difficulty": "simple",
    },

    # ── MARKET ───────────────────────────────────────────────────
    {
        "id": "HI-EN-mkt_prc-001", "utterance": "Nagpur mandi mein kapas ka rate kya hai",
        "intent": "market_price_query", "intent_category": "Market", "agent": "market_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": None, "unit": None,
                     "counterparty": None, "location": "Nagpur"},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-mkt_prc-002", "utterance": "aaj gehu ka bhav kya chal raha hai Delhi mein",
        "intent": "market_price_query", "intent_category": "Market", "agent": "market_agent",
        "entities": {"commodity_canonical": "Wheat", "quantity": None, "unit": None,
                     "counterparty": None, "location": "Delhi"},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-mkt_prc-003", "utterance": "soybean ka current rate batao Indore mein",
        "intent": "market_price_query", "intent_category": "Market", "agent": "market_agent",
        "entities": {"commodity_canonical": "Soybean", "quantity": None, "unit": None,
                     "counterparty": None, "location": "Indore"},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-mkt_trnd-001", "utterance": "kapas market upar ja raha hai ya neeche",
        "intent": "market_trend_query", "intent_category": "Market", "agent": "market_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-mkt_trnd-002", "utterance": "gehu ka trend is mahine kaisa raha",
        "intent": "market_trend_query", "intent_category": "Market", "agent": "market_agent",
        "entities": {"commodity_canonical": "Wheat", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-mkt_trnd-003", "utterance": "market girne wala lag raha hai kya soybean mein",
        "intent": "market_trend_query", "intent_category": "Market", "agent": "market_agent",
        "entities": {"commodity_canonical": "Soybean", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-mkt_mnd-001", "utterance": "kapas ke liye best mandi kaunsi hai aaj",
        "intent": "market_best_mandi_query", "intent_category": "Market", "agent": "market_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-mkt_mnd-002", "utterance": "gehu kahan bechna chahiye sabse achha rate milega",
        "intent": "market_best_mandi_query", "intent_category": "Market", "agent": "market_agent",
        "entities": {"commodity_canonical": "Wheat", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-mkt_mnd-003", "utterance": "Maharashtra mein kapas ki sabse achi mandi batao",
        "intent": "market_best_mandi_query", "intent_category": "Market", "agent": "market_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": None, "unit": None,
                     "counterparty": None, "location": "Maharashtra"},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-mkt_fcst-001", "utterance": "kapas ka rate agle hafte kya hoga",
        "intent": "market_forecast_query", "intent_category": "Market", "agent": "market_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-mkt_fcst-002", "utterance": "soybean price next month badhnewala hai kya",
        "intent": "market_forecast_query", "intent_category": "Market", "agent": "market_agent",
        "entities": {"commodity_canonical": "Soybean", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-mkt_fcst-003", "utterance": "gehu ki price prediction batao agle 15 din ke liye",
        "intent": "market_forecast_query", "intent_category": "Market", "agent": "market_agent",
        "entities": {"commodity_canonical": "Wheat", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },

    # ── DISPATCH ─────────────────────────────────────────────────
    {
        "id": "HI-EN-dsp_crt-001", "utterance": "kal Nagpur ke liye kapas dispatch karo",
        "intent": "dispatch_create", "intent_category": "Dispatch", "agent": "dispatch_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": None, "unit": None,
                     "counterparty": None, "location": "Nagpur"},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-dsp_crt-002", "utterance": "100 quintal gehu Mumbai bhejo contract ke saath",
        "intent": "dispatch_create", "intent_category": "Dispatch", "agent": "dispatch_agent",
        "entities": {"commodity_canonical": "Wheat", "quantity": 100.0, "unit": "quintal",
                     "counterparty": None, "location": "Mumbai"},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-dsp_crt-003", "utterance": "Latur se Pune ke liye 50 quintal soybean transport karo",
        "intent": "dispatch_create", "intent_category": "Dispatch", "agent": "dispatch_agent",
        "entities": {"commodity_canonical": "Soybean", "quantity": 50.0, "unit": "quintal",
                     "counterparty": None, "location": "Pune"},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-dsp_stat-001", "utterance": "maal kahan pahuncha abhi tak",
        "intent": "dispatch_status_query", "intent_category": "Dispatch", "agent": "dispatch_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": True, "difficulty": "simple",
    },
    {
        "id": "HI-EN-dsp_stat-002", "utterance": "kapas ki delivery Ahmedabad pohonchi kya",
        "intent": "dispatch_status_query", "intent_category": "Dispatch", "agent": "dispatch_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": None, "unit": None,
                     "counterparty": None, "location": "Ahmedabad"},
        "requires_context": True, "difficulty": "simple",
    },
    {
        "id": "HI-EN-dsp_stat-003", "utterance": "truck kahan hai, kab pahunchega",
        "intent": "dispatch_status_query", "intent_category": "Dispatch", "agent": "dispatch_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": True, "difficulty": "simple",
    },
    {
        "id": "HI-EN-dsp_rte-001", "utterance": "Nagpur se Mumbai route kaisa hai aaj",
        "intent": "dispatch_route_query", "intent_category": "Dispatch", "agent": "dispatch_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": "Mumbai"},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-dsp_rte-002", "utterance": "Amravati se Pune ka rasta sahi hai kya",
        "intent": "dispatch_route_query", "intent_category": "Dispatch", "agent": "dispatch_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": "Pune"},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-dsp_rte-003", "utterance": "Indore to Nagpur kitna time lagega truck ko",
        "intent": "dispatch_route_query", "intent_category": "Dispatch", "agent": "dispatch_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": "Nagpur"},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-dsp_dly-001", "utterance": "gaadi 4 ghante late hai, jam mein phans gayi",
        "intent": "dispatch_delay_report", "intent_category": "Dispatch", "agent": "dispatch_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": True, "difficulty": "simple",
    },
    {
        "id": "HI-EN-dsp_dly-002", "utterance": "baarish ki wajah se delivery mein 6 ghante ki der hogi",
        "intent": "dispatch_delay_report", "intent_category": "Dispatch", "agent": "dispatch_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": True, "difficulty": "simple",
    },
    {
        "id": "HI-EN-dsp_dly-003", "utterance": "truck breakdown ho gaya, 3 ghante late rahega",
        "intent": "dispatch_delay_report", "intent_category": "Dispatch", "agent": "dispatch_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": True, "difficulty": "simple",
    },

    # ── RISK ─────────────────────────────────────────────────────
    {
        "id": "HI-EN-rsk_port-001", "utterance": "mera overall risk kitna hai aaj",
        "intent": "risk_portfolio_query", "intent_category": "Risk", "agent": "risk_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-rsk_port-002", "utterance": "portfolio risk check karo",
        "intent": "risk_portfolio_query", "intent_category": "Risk", "agent": "risk_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-rsk_port-003", "utterance": "kapas mein zyada exposure ho gayi kya",
        "intent": "risk_portfolio_query", "intent_category": "Risk", "agent": "risk_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-rsk_pnl-001", "utterance": "aaj kitna profit hua mujhe",
        "intent": "risk_pnl_query", "intent_category": "Risk", "agent": "risk_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-rsk_pnl-002", "utterance": "mera P&L kya hai is hafte",
        "intent": "risk_pnl_query", "intent_category": "Risk", "agent": "risk_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-rsk_pnl-003", "utterance": "kapas trades mein fayda hua ya nuksan",
        "intent": "risk_pnl_query", "intent_category": "Risk", "agent": "risk_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-rsk_alrt-001", "utterance": "koi risk alert hai kya abhi",
        "intent": "risk_alert_query", "intent_category": "Risk", "agent": "risk_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-rsk_alrt-002", "utterance": "price warning hai soybean mein kya",
        "intent": "risk_alert_query", "intent_category": "Risk", "agent": "risk_agent",
        "entities": {"commodity_canonical": "Soybean", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-rsk_alrt-003", "utterance": "koi exposure limit breach hua hai kya",
        "intent": "risk_alert_query", "intent_category": "Risk", "agent": "risk_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-rsk_cpty-001", "utterance": "Ramesh ka credit risk kaisa hai",
        "intent": "risk_counterparty_query", "intent_category": "Risk", "agent": "risk_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": "Ramesh", "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-rsk_cpty-002", "utterance": "Bharat Agro reliable hai kya, payment history kya hai",
        "intent": "risk_counterparty_query", "intent_category": "Risk", "agent": "risk_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": "Bharat Agro", "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-rsk_cpty-003", "utterance": "Nagpur Mills ke saath deal safe hai kya",
        "intent": "risk_counterparty_query", "intent_category": "Risk", "agent": "risk_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": "Nagpur Mills", "location": None},
        "requires_context": False, "difficulty": "simple",
    },

    # ── BUYERS ───────────────────────────────────────────────────
    {
        "id": "HI-EN-byr_find-001", "utterance": "kapas ke liye buyer dhundo Nagpur ke paas",
        "intent": "find_buyers", "intent_category": "Buyers", "agent": "buyer_discovery_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": None, "unit": None,
                     "counterparty": None, "location": "Nagpur"},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-byr_find-002", "utterance": "Indore mein soybean koun khareed raha hai",
        "intent": "find_buyers", "intent_category": "Buyers", "agent": "buyer_discovery_agent",
        "entities": {"commodity_canonical": "Soybean", "quantity": None, "unit": None,
                     "counterparty": None, "location": "Indore"},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-byr_find-003", "utterance": "mere gehu ke liye kaun best buyer rahega",
        "intent": "find_buyers", "intent_category": "Buyers", "agent": "buyer_discovery_agent",
        "entities": {"commodity_canonical": "Wheat", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-byr_prof-001", "utterance": "Bharat Agro kya kya khareedta hai",
        "intent": "buyer_profile_query", "intent_category": "Buyers", "agent": "buyer_discovery_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": "Bharat Agro", "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-byr_prof-002", "utterance": "Nagpur Mills ka profile batao, kitna lete hain",
        "intent": "buyer_profile_query", "intent_category": "Buyers", "agent": "buyer_discovery_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": "Nagpur Mills", "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-byr_prof-003", "utterance": "Ramesh buyer hai ya seller, details batao",
        "intent": "buyer_profile_query", "intent_category": "Buyers", "agent": "buyer_discovery_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": "Ramesh", "location": None},
        "requires_context": False, "difficulty": "simple",
    },

    # ── COMPLIANCE ───────────────────────────────────────────────
    {
        "id": "HI-EN-cmp_inv-001", "utterance": "Ramesh wali deal ka invoice banao",
        "intent": "compliance_invoice", "intent_category": "Compliance", "agent": "compliance_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": "Ramesh", "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-cmp_inv-002", "utterance": "GST invoice ready karo kapas ke contract ke liye",
        "intent": "compliance_invoice", "intent_category": "Compliance", "agent": "compliance_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-cmp_inv-003", "utterance": "Bharat Agro ke liye tax invoice generate karo",
        "intent": "compliance_invoice", "intent_category": "Compliance", "agent": "compliance_agent",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": "Bharat Agro", "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-cmp_gst-001", "utterance": "kapas pe kitna GST lagta hai",
        "intent": "compliance_gst_query", "intent_category": "Compliance", "agent": "compliance_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-cmp_gst-002", "utterance": "e-way bill chahiye kya 50 quintal soybean ke liye",
        "intent": "compliance_gst_query", "intent_category": "Compliance", "agent": "compliance_agent",
        "entities": {"commodity_canonical": "Soybean", "quantity": 50.0, "unit": "quintal",
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-cmp_gst-003", "utterance": "interstate gehu trade mein tax compliance kya hoga",
        "intent": "compliance_gst_query", "intent_category": "Compliance", "agent": "compliance_agent",
        "entities": {"commodity_canonical": "Wheat", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },

    # ── DEAL ─────────────────────────────────────────────────────
    {
        "id": "HI-EN-dl_eval-001", "utterance": "Nagpur mein kapas 7200 mein bechna sahi rahega kya",
        "intent": "deal_evaluate", "intent_category": "Deal", "agent": "trade_advisor_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": None, "unit": None,
                     "counterparty": None, "location": "Nagpur"},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-dl_eval-002", "utterance": "2300 mein gehu khareedna profitable hai kya Latur mein",
        "intent": "deal_evaluate", "intent_category": "Deal", "agent": "trade_advisor_agent",
        "entities": {"commodity_canonical": "Wheat", "quantity": None, "unit": None,
                     "counterparty": None, "location": "Latur"},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-dl_eval-003", "utterance": "ye soybean deal 4600 mein theek hai kya",
        "intent": "deal_evaluate", "intent_category": "Deal", "agent": "trade_advisor_agent",
        "entities": {"commodity_canonical": "Soybean", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-dl_nego-001", "utterance": "Bharat Agro se kapas mein kitne tak negotiate kar sakte hain",
        "intent": "deal_negotiation_range", "intent_category": "Deal", "agent": "trade_advisor_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": None, "unit": None,
                     "counterparty": "Bharat Agro", "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-dl_nego-002", "utterance": "gehu price mein kitni bargaining hogi Ramesh ke saath",
        "intent": "deal_negotiation_range", "intent_category": "Deal", "agent": "trade_advisor_agent",
        "entities": {"commodity_canonical": "Wheat", "quantity": None, "unit": None,
                     "counterparty": "Ramesh", "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-dl_nego-003", "utterance": "soybean deal mein price range kya rakhun",
        "intent": "deal_negotiation_range", "intent_category": "Deal", "agent": "trade_advisor_agent",
        "entities": {"commodity_canonical": "Soybean", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },

    # ── CONTEXT ──────────────────────────────────────────────────
    {
        "id": "HI-EN-ctx_grt-001", "utterance": "hello Lucy",
        "intent": "greeting", "intent_category": "Context", "agent": "lucy_orchestrator",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctx_grt-002", "utterance": "hi Lucy, kya haal hai",
        "intent": "greeting", "intent_category": "Context", "agent": "lucy_orchestrator",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctx_grt-003", "utterance": "namaste, kaam shuru karte hain",
        "intent": "greeting", "intent_category": "Context", "agent": "lucy_orchestrator",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctx_sum-001", "utterance": "aaj kya kya kiya humne, summary do",
        "intent": "session_summary_request", "intent_category": "Context", "agent": "lucy_orchestrator",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": True, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctx_sum-002", "utterance": "is session mein kya decide hua batao",
        "intent": "session_summary_request", "intent_category": "Context", "agent": "lucy_orchestrator",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": True, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctx_sum-003", "utterance": "abhi tak ki baat ka summary do",
        "intent": "session_summary_request", "intent_category": "Context", "agent": "lucy_orchestrator",
        "entities": {"commodity_canonical": None, "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": True, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctx_alias-001", "utterance": "kapas ka matlab cotton hai, ye yaad rakh",
        "intent": "alias_correction", "intent_category": "Context", "agent": "commodity_agent",
        "entities": {"commodity_canonical": "Cotton", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctx_alias-002", "utterance": "sarso ko mustard samjha karo system mein",
        "intent": "alias_correction", "intent_category": "Context", "agent": "commodity_agent",
        "entities": {"commodity_canonical": "Mustard", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
    {
        "id": "HI-EN-ctx_alias-003", "utterance": "gehu wheat hai, mapping update karo",
        "intent": "alias_correction", "intent_category": "Context", "agent": "commodity_agent",
        "entities": {"commodity_canonical": "Wheat", "quantity": None, "unit": None,
                     "counterparty": None, "location": None},
        "requires_context": False, "difficulty": "simple",
    },
]

def load_existing_ids(filepath):
    ids = set()
    if not Path(filepath).exists():
        return ids
    with open(filepath, encoding='utf-8') as f:
        for line in f:
            try:
                row = json.loads(line.strip())
                ids.add(row.get('id', ''))
            except Exception:
                pass
    return ids

existing_ids = load_existing_ids(OUTPUT_FILE)
new_rows = [r for r in HINGLISH_EXAMPLES if r['id'] not in existing_ids]

if not new_rows:
    print("All Hinglish examples already present. Nothing to add.")
else:
    with open(OUTPUT_FILE, 'a', encoding='utf-8') as f:
        for row in new_rows:
            row['utterance_language'] = 'hi-en'
            row['source'] = 'hinglish_handcrafted'
            row['utterance_normalized'] = None
            f.write(json.dumps(row, ensure_ascii=False) + '\n')

    print(f"✓ Added {len(new_rows)} Hinglish examples to {OUTPUT_FILE}")
    print(f"  Total rows now: {sum(1 for _ in open(OUTPUT_FILE, encoding='utf-8'))}")
    print(f"\nNext: python pipeline/import_intent_corpus.py")