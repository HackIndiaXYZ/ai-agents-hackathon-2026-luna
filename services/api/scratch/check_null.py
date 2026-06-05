import sys, io, os
import json
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path("services/api").resolve()))
load_dotenv(Path(".env").resolve())

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

# Use is('field', 'null') syntax — works reliably
r = sb.table("intent_examples").select("id, utterance, utterance_normalized, utterance_language").is_("utterance_embedding", "null").limit(10).execute()

print("Rows with NULL embeddings (first 10):")
for x in (r.data or []):
    utt = x.get("utterance") or ""
    norm = x.get("utterance_normalized") or ""
    print(f"  {x['id']} lang={x.get('utterance_language')} utt_len={len(utt)} norm_len={len(norm)}")
    print(f"    utterance: {utt[:100]!r}")
    print(f"    normalized: {norm[:100]!r}")

count_null = sb.table("intent_examples").select("id", count="exact").is_("utterance_embedding", "null").execute().count
print(f"\nTotal rows with NULL embeddings: {count_null}")
