"""
TradeNexus — Seed Intent Dataset Generator.
Generates English seed examples for CTRM intents and saves to JSONL and CSV formats.
"""

import os
import json
import csv
from pathlib import Path

# Taxonomy category and agent mappings
INTENT_METADATA = {
    # Inventory
    "inventory_add": {"category": "Inventory", "agent": "inventory_agent", "short": "inv_add"},
    "inventory_subtract": {"category": "Inventory", "agent": "inventory_agent", "short": "inv_sub"},
    "inventory_set": {"category": "Inventory", "agent": "inventory_agent", "short": "inv_set"},
    "inventory_query": {"category": "Inventory", "agent": "inventory_agent", "short": "inv_qry"},
    "inventory_value_query": {"category": "Inventory", "agent": "inventory_agent", "short": "inv_val"},
    
    # Contracts
    "contract_create_buy": {"category": "Contracts", "agent": "contract_agent", "short": "ctr_buy"},
    "contract_create_sell": {"category": "Contracts", "agent": "contract_agent", "short": "ctr_sell"},
    "contract_status_query": {"category": "Contracts", "agent": "contract_agent", "short": "ctr_stat"},
    "contract_update": {"category": "Contracts", "agent": "contract_agent", "short": "ctr_upd"},
    "contract_cancel": {"category": "Contracts", "agent": "contract_agent", "short": "ctr_cncl"},
    
    # Market
    "market_price_query": {"category": "Market", "agent": "market_agent", "short": "mkt_prc"},
    "market_trend_query": {"category": "Market", "agent": "market_agent", "short": "mkt_trnd"},
    "market_best_mandi_query": {"category": "Market", "agent": "market_agent", "short": "mkt_mnd"},
    "market_forecast_query": {"category": "Market", "agent": "market_agent", "short": "mkt_fcst"},
    
    # Dispatch
    "dispatch_create": {"category": "Dispatch", "agent": "dispatch_agent", "short": "dsp_crt"},
    "dispatch_status_query": {"category": "Dispatch", "agent": "dispatch_agent", "short": "dsp_stat"},
    "dispatch_route_query": {"category": "Dispatch", "agent": "dispatch_agent", "short": "dsp_rte"},
    "dispatch_delay_report": {"category": "Dispatch", "agent": "dispatch_agent", "short": "dsp_dly"},
    
    # Risk
    "risk_portfolio_query": {"category": "Risk", "agent": "risk_agent", "short": "rsk_port"},
    "risk_pnl_query": {"category": "Risk", "agent": "risk_agent", "short": "rsk_pnl"},
    "risk_alert_query": {"category": "Risk", "agent": "risk_agent", "short": "rsk_alrt"},
    "risk_counterparty_query": {"category": "Risk", "agent": "risk_agent", "short": "rsk_cpty"},
    
    # Buyers
    "find_buyers": {"category": "Buyers", "agent": "buyer_discovery_agent", "short": "byr_find"},
    "buyer_profile_query": {"category": "Buyers", "agent": "buyer_discovery_agent", "short": "byr_prof"},
    
    # Compliance
    "compliance_invoice": {"category": "Compliance", "agent": "compliance_agent", "short": "cmp_inv"},
    "compliance_gst_query": {"category": "Compliance", "agent": "compliance_agent", "short": "cmp_gst"},
    
    # Deal
    "deal_evaluate": {"category": "Deal", "agent": "trade_advisor_agent", "short": "dl_eval"},
    "deal_negotiation_range": {"category": "Deal", "agent": "trade_advisor_agent", "short": "dl_nego"},
    
    # Context
    "greeting": {"category": "Context", "agent": "lucy_orchestrator", "short": "ctx_grt"},
    "session_summary_request": {"category": "Context", "agent": "lucy_orchestrator", "short": "ctx_sum"},
    "alias_correction": {"category": "Context", "agent": "commodity_agent", "short": "ctx_alias"}
}

# The hardcoded seed examples
SEED_RAW_DATA = {
    "inventory_add": [
        ("Add 50 quintals of cotton to my inventory", "Cotton", 50.0, None, None),
        ("Put 100 quintals of wheat in stock", "Wheat", 100.0, None, None),
        ("I received 200 quintals of soybean, add it", "Soybean", 200.0, None, None),
        ("Update inventory: 40 quintals groundnut added", "Groundnut", 40.0, None, None),
        ("Stock has increased by 80 quintals of onion", "Onion", 80.0, None, None),
        ("New lot arrived: 150 quintals pigeon pea", "Pigeon Pea", 150.0, None, None),
        ("Record 60 quintals mustard purchase in inventory", "Mustard", 60.0, None, None)
    ],
    "inventory_subtract": [
        ("Remove 20 quintals of wheat from my inventory", "Wheat", 20.0, None, None),
        ("Subtract 50 quintals of cotton from stock", "Cotton", 50.0, None, None),
        ("Deduct 100 quintals of soybean from the warehouse", "Soybean", 100.0, None, None),
        ("Stock adjustment: minus 80 quintals groundnut", "Groundnut", 80.0, None, None),
        ("Drawn 150 quintals pigeon pea from storage", "Pigeon Pea", 150.0, None, None),
        ("Onion stock decreased by 40 quintals", "Onion", 40.0, None, None),
        ("Subtract 60 quintals mustard from my main inventory", "Mustard", 60.0, None, None)
    ],
    "inventory_set": [
        ("Set wheat stock to 200 quintals", "Wheat", 200.0, None, None),
        ("Set my cotton stock to 100 quintals", "Cotton", 100.0, None, None),
        ("Set onion inventory level to 50 quintals", "Onion", 50.0, None, None),
        ("Adjust groundnut stock to exactly 500 quintals", "Groundnut", 500.0, None, None),
        ("Pigeon pea quantity is now 80 quintals", "Pigeon Pea", 80.0, None, None),
        ("Update stock: mustard quantity set to 150 quintals", "Mustard", 150.0, None, None),
        ("Chickpea inventory balance is 60 quintals today", "Chickpea", 60.0, None, None)
    ],
    "inventory_query": [
        ("How much wheat do I have in my inventory?", "Wheat", None, None, None),
        ("Check cotton stock level", "Cotton", None, None, None),
        ("What is my soybean stock?", "Soybean", None, None, None),
        ("Query groundnut inventory", "Groundnut", None, None, None),
        ("Do I have any pigeon pea in stock?", "Pigeon Pea", None, None, None),
        ("Show onion inventory balance", "Onion", None, None, None),
        ("What is the mustard stock?", "Mustard", None, None, None)
    ],
    "inventory_value_query": [
        ("What is the value of my current wheat stock?", "Wheat", None, None, None),
        ("Compute total valuation of cotton inventory", "Cotton", None, None, None),
        ("Show me the value of soybean in storage", "Soybean", None, None, None),
        ("How much is my groundnut stock worth?", "Groundnut", None, None, None),
        ("Valuation of pigeon pea stock", "Pigeon Pea", None, None, None),
        ("What's the net value of my onion inventory?", "Onion", None, None, None),
        ("Calculate value of mustard stock", "Mustard", None, None, None)
    ],
    "contract_create_buy": [
        ("Create a buy contract for 100 quintals of wheat with Ramesh", "Wheat", 100.0, "Ramesh", None),
        ("Buy 200 quintals of soybean from Bharat Agro", "Soybean", 200.0, "Bharat Agro", None),
        ("Draft buy agreement: 50 quintals onion from Akola Traders", "Onion", 50.0, "Akola Traders", None),
        ("Record a purchase: 80 quintals mustard from Suresh Farms", "Mustard", 80.0, "Suresh Farms", None),
        ("Book buy contract for 150 quintals chickpea with Nagpur Mills", "Chickpea", 150.0, "Nagpur Mills", None),
        ("Register purchase of 500 quintals groundnut from Bharat Agro", "Groundnut", 500.0, "Bharat Agro", None),
        ("New buy order: 60 quintals pigeon pea from Ramesh", "Pigeon Pea", 60.0, "Ramesh", None)
    ],
    "contract_create_sell": [
        ("Sell 100 quintals of cotton to Bharat Agro", "Cotton", 100.0, "Bharat Agro", None),
        ("Create a sell contract for 200 quintals wheat with Nagpur Mills", "Wheat", 200.0, "Nagpur Mills", None),
        ("I want to sell 50 quintals soybean to Ramesh", "Soybean", 50.0, "Ramesh", None),
        ("Book a sale: 80 quintals onion to Akola Traders", "Onion", 80.0, "Akola Traders", None),
        ("Sell order for 300 quintals chickpea to Suresh Farms", "Chickpea", 300.0, "Suresh Farms", None),
        ("Register sale of 40 quintals mustard to Suresh Farms", "Mustard", 40.0, "Suresh Farms", None),
        ("Create sell contract: 500 quintals groundnut to Bharat Agro", "Groundnut", 500.0, "Bharat Agro", None)
    ],
    "contract_status_query": [
        ("What is the status of my contract with Ramesh?", None, None, "Ramesh", None),
        ("Check status of contract CTR-2024-001", None, None, None, None),
        ("Is the soybean sell contract with Nagpur Mills confirmed?", "Soybean", None, "Nagpur Mills", None),
        ("Track contract CTR-983", None, None, None, None),
        ("Show contract status for Bharat Agro deal", None, None, "Bharat Agro", None),
        ("Has the mustard contract with Suresh Farms been settled?", "Mustard", None, "Suresh Farms", None),
        ("Find status of contract CTR-049", None, None, None, None)
    ],
    "contract_update": [
        ("Update contract CTR-102: change quantity to 120 quintals", None, 120.0, None, None),
        ("Change price in Ramesh contract to 2300", None, None, "Ramesh", None),
        ("Modify contract CTR-332, delivery date is now June 15", None, None, None, None),
        ("Update sell contract with Nagpur Mills, set price to 5200", None, None, "Nagpur Mills", None),
        ("Revise contract CTR-887 details", None, None, None, None),
        ("Update delivery location to Indore for contract CTR-401", None, None, None, "Indore"),
        ("Edit contract CTR-112: set quantity to 250 quintals", None, 250.0, None, None)
    ],
    "contract_cancel": [
        ("Cancel contract CTR-102", None, None, None, None),
        ("Void the buy contract with Ramesh", None, None, "Ramesh", None),
        ("Terminate contract CTR-994", None, None, None, None),
        ("Please cancel the soybean contract with Bharat Agro", "Soybean", None, "Bharat Agro", None),
        ("Discard contract CTR-502", None, None, None, None),
        ("Cancel the pending contract with Akola Traders", None, None, "Akola Traders", None),
        ("Revoke contract CTR-761", None, None, None, None)
    ],
    "market_price_query": [
        ("What is the cotton price in Nagpur today?", "Cotton", None, None, "Nagpur"),
        ("Check soybean rates in Ahmedabad mandi", "Soybean", None, None, "Ahmedabad"),
        ("Current wheat price in Delhi market", "Wheat", None, None, "Delhi"),
        ("What are onion prices across Maharashtra?", "Onion", None, None, "Maharashtra"),
        ("Show me groundnut rates in Gujarat", "Groundnut", None, None, "Gujarat"),
        ("Latest chickpea prices in Indore", "Chickpea", None, None, "Indore"),
        ("Pigeon pea market rate today", "Pigeon Pea", None, None, None)
    ],
    "market_trend_query": [
        ("What is the price trend for soybean this month?", "Soybean", None, None, None),
        ("Are wheat prices rising or falling?", "Wheat", None, None, None),
        ("Show me the cotton market trend over the last 30 days", "Cotton", None, None, None),
        ("Price trajectory for onion in Latur", "Onion", None, None, "Latur"),
        ("Is there a downward trend in chickpea rates?", "Chickpea", None, None, None),
        ("Market trend analysis for mustard", "Mustard", None, None, None),
        ("Show the trend line for groundnut prices", "Groundnut", None, None, None)
    ],
    "market_best_mandi_query": [
        ("Which mandi has the best price for soybean near me?", "Soybean", None, None, None),
        ("Where can I sell wheat for the highest price today?", "Wheat", None, None, None),
        ("Find the best mandi for cotton in Maharashtra", "Cotton", None, None, "Maharashtra"),
        ("Which market is offering the highest rate for onion?", "Onion", None, None, None),
        ("Best mandi for selling groundnut in Gujarat", "Groundnut", None, None, "Gujarat"),
        ("Where is chickpea fetching the best price?", "Chickpea", None, None, None),
        ("Suggest the best market for pigeon pea", "Pigeon Pea", None, None, None)
    ],
    "market_forecast_query": [
        ("What is the price forecast for cotton next week?", "Cotton", None, None, None),
        ("Predict wheat price for the coming month", "Wheat", None, None, None),
        ("What will the soybean rate be in July?", "Soybean", None, None, None),
        ("Market forecast for chickpea", "Chickpea", None, None, None),
        ("Are groundnut prices expected to go up next month?", "Groundnut", None, None, None),
        ("Give me the price projection for mustard", "Mustard", None, None, None),
        ("Onion price forecast for the next 15 days", "Onion", None, None, None)
    ],
    "dispatch_create": [
        ("Create a dispatch for contract CTR-102", None, None, None, None),
        ("Ship 100 quintals of wheat under contract CTR-202 with vehicle MH-31-AB-5678", "Wheat", 100.0, None, None),
        ("Create a new dispatch: 50 quintals soybean from Latur to Pune", "Soybean", 50.0, None, "Pune"),
        ("Register shipment of 80 quintals onion for Akola Traders", "Onion", 80.0, "Akola Traders", None),
        ("Start a dispatch for groundnut contract CTR-452", "Groundnut", None, None, None),
        ("Book transport for 150 quintals chickpea, truck GJ-01-XY-9876", "Chickpea", 150.0, None, None),
        ("Dispatch 60 quintals mustard for contract CTR-088", "Mustard", 60.0, None, None)
    ],
    "dispatch_status_query": [
        ("Where is the dispatch DSP-451 right now?", None, None, None, None),
        ("Check status of wheat shipment under contract CTR-202", "Wheat", None, None, None),
        ("Has my cotton dispatch reached Ahmedabad?", "Cotton", None, None, "Ahmedabad"),
        ("Track vehicle MH-31-AB-5678", None, None, None, None),
        ("Status of dispatch DSP-992", None, None, None, None),
        ("Is the groundnut delivery delayed?", "Groundnut", None, None, None),
        ("Check shipping progress of dispatch DSP-301", None, None, None, None)
    ],
    "dispatch_route_query": [
        ("What is the best route from Latur to Pune for dispatch?", None, None, None, "Pune"),
        ("Show transit route options from Indore to Nagpur", None, None, None, "Nagpur"),
        ("Check route distance between Amravati and Mumbai", None, None, None, "Mumbai"),
        ("Calculate shortest route for wheat shipment from Delhi to Ahmedabad", "Wheat", None, None, "Ahmedabad"),
        ("Show me route maps for dispatching from Pune to Latur", None, None, None, "Latur"),
        ("What is the typical transit duration for the Nagpur to Mumbai corridor?", None, None, None, "Mumbai"),
        ("Check route details for Latur to Mumbai dispatch", None, None, None, "Mumbai")
    ],
    "dispatch_delay_report": [
        ("Report a 4 hour delay for dispatch DSP-451 due to breakdown", None, None, None, None),
        ("My truck is stuck in traffic, expect 2 hours delay on DSP-102", None, None, None, None),
        ("Log delay of 6 hours for contract CTR-305 dispatch", None, None, None, None),
        ("Vehicle GJ-01-XY-9876 delayed by 3 hours due to heavy rain", None, None, None, None),
        ("Report delay: DSP-882 will arrive 5 hours late", None, None, None, None),
        ("There is a delay of 8 hours on the Latur-Pune shipment", None, None, None, "Pune"),
        ("Update dispatch status: DSP-711 delayed by 12 hours", None, None, None, None)
    ],
    "risk_portfolio_query": [
        ("Show me my trading portfolio risk overview", None, None, None, None),
        ("Analyze risk exposure for my active contracts", None, None, None, None),
        ("What is my total portfolio risk today?", None, None, None, None),
        ("Summarize contract risk profile", None, None, None, None),
        ("Review my risk exposure across commodities", None, None, None, None),
        ("Get risk analysis of wheat and cotton portfolio", "Wheat", None, None, None),
        ("Am I overexposed in soybean contracts?", "Soybean", None, None, None)
    ],
    "risk_pnl_query": [
        ("What is my current PnL for the season?", None, None, None, None),
        ("Show P&L statement for active contracts", None, None, None, None),
        ("Calculate my profit and loss on cotton trades", "Cotton", None, None, None),
        ("What is the mark-to-market PnL for wheat?", "Wheat", None, None, None),
        ("Display PnL breakdown by commodity", None, None, None, None),
        ("Am I in profit or loss on the Nagpur Mills contract?", None, None, "Nagpur Mills", None),
        ("Show recent trade PnL summary", None, None, None, None)
    ],
    "risk_alert_query": [
        ("Are there any risk alerts active for my account?", None, None, None, None),
        ("Show recent price volatility alerts", None, None, None, None),
        ("Check if there are any exposure limit warnings", None, None, None, None),
        ("List risk alerts for soybean", "Soybean", None, None, None),
        ("Do I have any compliance or credit risk alerts?", None, None, None, None),
        ("Show risk notifications", None, None, None, None),
        ("Any margin or contract deviation alerts today?", None, None, None, None)
    ],
    "risk_counterparty_query": [
        ("What is the credit risk for Ramesh?", None, None, "Ramesh", None),
        ("Check payment history score for Bharat Agro", None, None, "Bharat Agro", None),
        ("Is there any outstanding risk with Nagpur Mills?", None, None, "Nagpur Mills", None),
        ("Counterparty risk assessment for Suresh Farms", None, None, "Suresh Farms", None),
        ("Review credit rating for Akola Traders", None, None, "Akola Traders", None),
        ("Show credit limit utilization for Ramesh", None, None, "Ramesh", None),
        ("Any counterparty default warnings for Pune Oils?", None, None, "Pune Oils", None)
    ],
    "find_buyers": [
        ("Find buyers for soybean in Indore", "Soybean", None, None, "Indore"),
        ("Who is buying wheat near Latur?", "Wheat", None, None, "Latur"),
        ("Show cotton buyers in Nagpur", "Cotton", None, None, "Nagpur"),
        ("Are there any onion buyers active in Pune?", "Onion", None, None, "Pune"),
        ("Find potential buyers for groundnut in Gujarat", "Groundnut", None, None, "Gujarat"),
        ("List mustard buyers in Delhi", "Mustard", None, None, "Delhi"),
        ("Search for chickpea buyers near Amravati", "Chickpea", None, None, "Amravati")
    ],
    "buyer_profile_query": [
        ("Show me the buyer profile for Bharat Agro", None, None, "Bharat Agro", None),
        ("What are the requirements for Nagpur Mills?", None, None, "Nagpur Mills", None),
        ("Get details of Akola Traders buyer profile", None, None, "Akola Traders", None),
        ("Show purchasing volumes for Suresh Farms", None, None, "Suresh Farms", None),
        ("Profile details for Ramesh as a buyer", None, None, "Ramesh", None),
        ("What commodities does Bharat Agro typically buy?", None, None, "Bharat Agro", None),
        ("View profile and rating for Pune Oils", None, None, "Pune Oils", None)
    ],
    "compliance_invoice": [
        ("Generate a GST compliant invoice for contract CTR-102", None, None, None, None),
        ("Print invoice for wheat sale to Ramesh", "Wheat", None, "Ramesh", None),
        ("Create tax invoice for soybean contract CTR-202", "Soybean", None, None, None),
        ("Prepare compliance invoice for Bharat Agro dispatch", None, None, "Bharat Agro", None),
        ("Show tax invoice for groundnut CTR-405", "Groundnut", None, None, None),
        ("Generate invoice for Akola Traders", None, None, "Akola Traders", None),
        ("Format invoice for contract CTR-088", None, None, None, None)
    ],
    "compliance_gst_query": [
        ("What is the GST rate for cotton in India?", "Cotton", None, None, "India"),
        ("Do I need an e-way bill for 50 quintals of soybean?", "Soybean", 50.0, None, None),
        ("GST compliance guidelines for wheat interstate trading", "Wheat", None, None, None),
        ("What is the HSN code and GST rate for onion?", "Onion", None, None, None),
        ("Is GST applicable on groundnut sales?", "Groundnut", None, None, None),
        ("Show GST rules for chickpea trading", "Chickpea", None, None, None),
        ("Check compliance tax rates for mustard", "Mustard", None, None, None)
    ],
    "deal_evaluate": [
        ("Evaluate a deal for soybean at 4600 per quintal in Indore", "Soybean", None, None, "Indore"),
        ("Is 2300 a good price to buy wheat in Latur?", "Wheat", None, None, "Latur"),
        ("Assess cotton offer of 7200 in Nagpur", "Cotton", None, None, "Nagpur"),
        ("Analyze onion sale deal at 1800 per quintal", "Onion", None, None, None),
        ("Should I sell groundnut at 6100 in Ahmedabad?", "Groundnut", None, None, "Ahmedabad"),
        ("Evaluate chickpea buy offer at 5200 in Pune", "Chickpea", None, None, "Pune"),
        ("Is the mustard deal at 5400 profitable?", "Mustard", None, None, None)
    ],
    "deal_negotiation_range": [
        ("What is the recommended negotiation range for soybean with Nagpur Mills?", "Soybean", None, "Nagpur Mills", None),
        ("Suggest bargaining price limits for cotton with Bharat Agro", "Cotton", None, "Bharat Agro", None),
        ("Negotiation price range for wheat with Ramesh", "Wheat", None, "Ramesh", None),
        ("What negotiation buffer should I use for onion with Akola Traders?", "Onion", None, "Akola Traders", None),
        ("Provide price negotiation range for chickpea", "Chickpea", None, None, None),
        ("Bargaining spread for mustard with Suresh Farms", "Mustard", None, "Suresh Farms", None),
        ("Negotiation limits for groundnut deal", "Groundnut", None, None, None)
    ],
    "greeting": [
        ("Hello Lucy, how can you help me today?", None, None, None, None),
        ("Hi there", None, None, None, None),
        ("Good morning", None, None, None, None),
        ("Hey", None, None, None, None),
        ("Are you there?", None, None, None, None),
        ("Hello", None, None, None, None),
        ("Greetings", None, None, None, None)
    ],
    "session_summary_request": [
        ("Give me a summary of our chat session", None, None, None, None),
        ("What did we decide today?", None, None, None, None),
        ("Summarize our conversation so far", None, None, None, None),
        ("What were the key takeaways from this session?", None, None, None, None),
        ("Provide a session recap", None, None, None, None),
        ("List the actions we agreed on", None, None, None, None),
        ("Show session summary", None, None, None, None)
    ],
    "alias_correction": [
        ("Chana actually refers to Chickpea, please correct it", "Chickpea", None, None, None),
        ("When I say sarso, I mean Mustard", "Mustard", None, None, None),
        ("Gehun means Wheat, update the mapping", "Wheat", None, None, None),
        ("Update alias: pyaz is Onion", "Onion", None, None, None),
        ("Kapas is Kapas cotton, associate it with Cotton", "Cotton", None, None, None),
        ("Soyabean is Soybean", "Soybean", None, None, None),
        ("Moong should map to Mung Bean", "Mung Bean", None, None, None)
    ]
}

def generate_seeds():
    # Make sure output directory exists
    output_dir = Path(__file__).resolve().parent / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    jsonl_path = output_dir / "intent_seeds_english.jsonl"
    csv_path = output_dir / "intent_seeds_for_adaption.csv"
    
    rows = []
    
    # Process each intent and create the structured records
    for intent, examples in SEED_RAW_DATA.items():
        meta = INTENT_METADATA[intent]
        short = meta["short"]
        category = meta["category"]
        agent = meta["agent"]
        
        for idx, ex_data in enumerate(examples, start=1):
            utterance, comm_canonical, quantity, counterparty, location = ex_data
            
            # Auto-extract raw commodity name from utterance if specified
            comm_raw = None
            if comm_canonical:
                # Find the matched canonical word in the utterance (case-insensitive)
                for word in utterance.split():
                    clean_word = word.strip("?,.:;!").lower()
                    if clean_word == comm_canonical.lower():
                        comm_raw = word.strip("?,.:;!")
                        break
                    # Special check for compound words like "pigeon pea"
                    if "pigeon pea" in utterance.lower():
                        comm_raw = "pigeon pea"
                        break
                if not comm_raw:
                    comm_raw = comm_canonical.lower()
            
            # Simple heuristic for price extraction from the utterance
            price = None
            for word in utterance.split():
                clean_word = word.strip("?,.:;!")
                if clean_word.isdigit() and int(clean_word) > 1000:
                    price = float(clean_word)
                    break
            
            # Simple heuristic for date reference extraction
            date_ref = None
            for key in ["today", "this month", "last 30 days", "next week", "coming month", "july", "next 15 days", "june 15"]:
                if key in utterance.lower():
                    date_ref = key
                    break
            
            # Build id: SEED-inv_add-001
            row_id = f"SEED-{short}-{idx:03d}"
            
            # Difficulty classifications based on complexity
            if "evaluate" in utterance.lower() or "negotiation" in utterance.lower():
                difficulty = "compound"
            elif "or" in utterance.lower() or "check if" in utterance.lower():
                difficulty = "ambiguous"
            else:
                difficulty = "simple"
                
            is_ambiguous = (difficulty == "ambiguous")
            requires_context = (intent in ["contract_status_query", "contract_update", "contract_cancel", "dispatch_status_query", "dispatch_delay_report", "session_summary_request"])
            requires_confirmation = (intent in ["contract_create_buy", "contract_create_sell", "contract_update", "contract_cancel", "dispatch_create", "dispatch_delay_report", "alias_correction"])
            
            # Build entities structure
            entities = {
                "commodity_raw": comm_raw,
                "commodity_canonical": comm_canonical,
                "quantity": quantity,
                "unit": "quintal" if quantity is not None else None,
                "counterparty": counterparty,
                "location": location,
                "price": price,
                "date_reference": date_ref
            }
            
            # Build action structure
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
            
            action = {
                "agent": agent,
                "method": method_map.get(intent, "execute"),
                "params": {k: v for k, v in entities.items() if v is not None}
            }
            
            row = {
                "id": row_id,
                "utterance": utterance,
                "utterance_language": "en",
                "utterance_script": "latin",
                "intent": intent,
                "intent_category": category,
                "entities": entities,
                "action": action,
                "requires_context": requires_context,
                "requires_confirmation": requires_confirmation,
                "is_ambiguous": is_ambiguous,
                "difficulty": difficulty,
                "source": "seed_english",
                "region": "pan_india",
                "trader_type": "general"
            }
            rows.append(row)
            
    # 1. Save to JSONL
    with open(jsonl_path, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
            
    # 2. Save to CSV
    csv_columns = [
        "id", "utterance", "utterance_language", "intent",
        "intent_category", "agent", "commodity_canonical", "quantity",
        "unit", "counterparty", "location", "requires_context",
        "difficulty", "source"
    ]
    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(csv_columns)
        for r in rows:
            writer.writerow([
                r["id"],
                r["utterance"],
                r["utterance_language"],
                r["intent"],
                r["intent_category"],
                r["action"]["agent"],
                r["entities"]["commodity_canonical"],
                r["entities"]["quantity"],
                r["entities"]["unit"],
                r["entities"]["counterparty"],
                r["entities"]["location"],
                str(r["requires_context"]).lower(),
                r["difficulty"],
                r["source"]
            ])
            
    print(f"[+] Successfully saved {len(rows)} seeds to {jsonl_path}")
    print(f"[+] Successfully saved {len(rows)} seeds to {csv_path}")
    print()
    
    # 3. Print summary table
    print(f"{'Intent':<28} | {'Count':<5} | {'Has Entities':<12} | {'Avg Difficulty':<14}")
    print("-" * 69)
    for intent in SEED_RAW_DATA.keys():
        intent_rows = [r for r in rows if r["intent"] == intent]
        count = len(intent_rows)
        # Check if any row has non-null entity values
        has_entities = "no"
        for r in intent_rows:
            ent = r["entities"]
            if any(v is not None for v in [ent["commodity_canonical"], ent["quantity"], ent["counterparty"], ent["location"]]):
                has_entities = "yes"
                break
        
        # Calculate average/dominant difficulty
        difficulties = [r["difficulty"] for r in intent_rows]
        avg_difficulty = max(set(difficulties), key=difficulties.count)
        
        print(f"{intent:<28} | {count:<5} | {has_entities:<12} | {avg_difficulty:<14}")

if __name__ == "__main__":
    generate_seeds()
