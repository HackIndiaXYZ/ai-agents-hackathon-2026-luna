import sys, os, io, json
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path("services/api").resolve()))
load_dotenv(Path(".env").resolve())

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

print("=== Testing intent_examples embedding states ===")

# Test 1: total rows
cr = sb.table("intent_examples").select("id", count="exact").execute()
print(f"Total rows: {cr.count}")

# Test 2: rows with embeddings present (not null)
rn = sb.table("intent_examples").select("id", count="exact").not_.is_("utterance_embedding", "null").execute()
print(f"With embeddings: {rn.count}")

# Test 3: rows whose embedding is exactly NULL
rnull = sb.table("intent_examples").select("id", count="exact").is_("utterance_embedding", "null").execute()
print(f"NULL embeddings: {rnull.count}")

# Test 4: sample rows with NULL embedding (to confirm ids)
if rnull.count:
    sample = sb.table("intent_examples").select("id, utterance, utterance_language, utterance_normalized").is_("utterance_embedding", "null").limit(5).execute()
    for row in (sample.data or []):
        print(f"  NULL row: {row['id']} | {row.get('utterance_language')} | {row.get('utterance','')[:60]}")
        print(f"           normalized={row.get('utterance_normalized','')[:80]!r}")

# Test 5: verify embedding types
print("\n=== Embedding type check ===")
rows = sb.table("intent_examples").select("id, utterance, utterance_embedding").not_.is_("utterance_embedding", "null").limit(5).execute()
for row in (rows.data or []):
    emb = row.get("utterance_embedding")
    print(f"{row['id']}: type={type(emb).__name__} len={len(emb) if emb else 0}")
