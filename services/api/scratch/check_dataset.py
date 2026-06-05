import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

data = [json.loads(l) for l in open('pipeline/output/intent_rag_final.jsonl', 'r', encoding='utf-8') if l.strip()]
print(f"Total rows: {len(data)}")

from collections import Counter
langs = Counter(r["utterance_language"] for r in data)
print("\nLanguage breakdown:")
for lang, ct in sorted(langs.items(), key=lambda x: -x[1]):
    print(f"  {lang}: {ct}")

# Show inventory_add examples - only en and hi-en
inv_add = [r for r in data if r["intent"] == "inventory_add"]
print(f"\ninventory_add examples: {len(inv_add)}")
for r in inv_add:
    if r["utterance_language"] in ("en", "hi-en"):
        utt = r["utterance"][:100]
        print(f"  [{r['utterance_language']}] {utt}")

# Check for "kapas" in any utterance
print("\n--- Utterances containing 'kapas' ---")
kapas_rows = [r for r in data if "kapas" in r["utterance"].lower()]
for r in kapas_rows:
    print(f"  [{r['utterance_language']}] {r['intent']}: {r['utterance'][:120]}")

# Check for Hindi/Hinglish inventory_add
print("\n--- Hinglish inventory_add ---")
hi_inv = [r for r in data if r["intent"] == "inventory_add" and r["utterance_language"] == "hi-en"]
for r in hi_inv:
    print(f"  {r['utterance'][:120]}")

# Check for "add" related Hindi
print("\n--- hi-en examples (any intent) first 20 ---")
hi_en = [r for r in data if r["utterance_language"] == "hi-en"]
for r in hi_en[:20]:
    print(f"  [{r['intent']}] {r['utterance'][:120]}")
