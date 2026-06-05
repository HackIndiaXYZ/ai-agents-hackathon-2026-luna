"""
pipeline/prepare_intent_corpus.py

Final preparation of the intent corpus for RAG loading.
Run this ONCE before import_intent_corpus.py.

Input:  pipeline/output/intent_adapted_cleaned.csv
Output: pipeline/output/intent_rag_final.jsonl
"""

import pandas as pd
import json
import os
from pathlib import Path

INPUT_FILE = "pipeline/output/intent_adapted_cleaned.csv"
OUTPUT_FILE = "pipeline/output/intent_rag_final.jsonl"

VALID_LANGUAGES = {'en', 'hi', 'mr', 'gu', 'te', 'ta', 'pa', 'bn', 'kn', 'hi-en'}

VALID_INTENTS = {
    'inventory_add', 'inventory_subtract', 'inventory_set',
    'inventory_query', 'inventory_value_query',
    'contract_create_buy', 'contract_create_sell',
    'contract_status_query', 'contract_update', 'contract_cancel',
    'market_price_query', 'market_trend_query',
    'market_best_mandi_query', 'market_forecast_query',
    'dispatch_create', 'dispatch_status_query',
    'dispatch_route_query', 'dispatch_delay_report',
    'risk_portfolio_query', 'risk_pnl_query',
    'risk_alert_query', 'risk_counterparty_query',
    'find_buyers', 'buyer_profile_query',
    'compliance_invoice', 'compliance_gst_query',
    'deal_evaluate', 'deal_negotiation_range',
    'greeting', 'session_summary_request', 'alias_correction'
}

def safe_val(val):
    """Return None for NaN/empty, else the value."""
    if pd.isna(val) or val == '':
        return None
    return val

def build_unique_id(row_id, lang, index):
    """Build a unique ID for each row."""
    base = str(row_id).replace(' ', '_')
    return f"{base}-{lang}-{index:04d}"

print(f"Loading: {INPUT_FILE}")
df = pd.read_csv(INPUT_FILE)
print(f"Raw rows: {len(df)}")


# Step 1: Drop bad language codes
before = len(df)
df = df[df['utterance_language'].isin(VALID_LANGUAGES)]
dropped_lang = before - len(df)
print(f"Dropped {dropped_lang} rows with invalid language codes")

# Step 2: Drop invalid intents
before = len(df)
df = df[df['intent'].isin(VALID_INTENTS)]
dropped_intent = before - len(df)
if dropped_intent > 0:
    print(f"Dropped {dropped_intent} rows with invalid intents")

# Step 3: Drop empty utterances
before = len(df)
df = df[df['utterance'].notna() & (df['utterance'].str.strip() != '')]
print(f"Dropped {before - len(df)} rows with empty utterances")

print(f"\nClean rows: {len(df)}")

# Step 4: Build JSONL records
records = []
for idx, row in df.iterrows():
    record = {
        "id": build_unique_id(row['id'], row['utterance_language'], idx),
        "utterance": str(row['utterance']).strip(),
        "utterance_normalized": str(row['enhanced_prompt']).strip()   # ← keep this
                            if pd.notna(row.get('enhanced_prompt')) else None,
        "utterance_language": row['utterance_language'],
        "intent": row['intent'],
        "intent_category": row['intent_category'],
        "agent": row['agent'],
        "entities": {
            "commodity_canonical": safe_val(row.get('commodity_canonical')),
            "quantity": safe_val(row.get('quantity')),
            "unit": safe_val(row.get('unit')),
            "counterparty": safe_val(row.get('counterparty')),
            "location": safe_val(row.get('location')),
        },
        "requires_context": str(row.get('requires_context', 'false')).lower() == 'true',
        "difficulty": row.get('difficulty', 'simple'),
        "source": "adaption_translated",
    }
    records.append(record)

# Step 5: Write JSONL
Path(OUTPUT_FILE).parent.mkdir(parents=True, exist_ok=True)
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    for r in records:
        f.write(json.dumps(r, ensure_ascii=False) + '\n')

# Step 6: Print summary
print(f"\n{'='*50}")
print(f"✓ Output: {OUTPUT_FILE}")
print(f"  Total records: {len(records)}")
print(f"\nLanguage breakdown:")
lang_counts = df['utterance_language'].value_counts()
for lang, count in lang_counts.items():
    print(f"  {lang}: {count}")
print(f"\nIntent coverage: {df['intent'].nunique()} / {len(VALID_INTENTS)} intents")
missing = VALID_INTENTS - set(df['intent'].unique())
if missing:
    print(f"  Missing intents: {missing}")
else:
    print(f"  All intents present ✓")

print(f"\nNext step: python pipeline/import_intent_corpus.py")