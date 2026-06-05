import sys, os, io, json
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path("services/api").resolve()))
load_dotenv(Path(".env").resolve())

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

# Check if utterance_normalized is populated
r = sb.table("intent_examples").select("id, utterance, utterance_normalized, utterance_language").limit(10).execute()
print("=== utterance_normalized check (first 10 rows) ===")
for row in (r.data or []):
    norm = row.get("utterance_normalized") or ""
    print(f"  {row['id']} [{row['utterance_language']}]")
    print(f"    utterance: {row['utterance'][:80]}")
    print(f"    normalized ({len(norm)} chars): {norm[:120]!r}")

# Count how many have non-empty normalized
all_rows = sb.table("intent_examples").select("id", count="exact").not_.eq("utterance_normalized", "").execute()
print(f"\nRows with non-empty utterance_normalized: {all_rows.count}")
