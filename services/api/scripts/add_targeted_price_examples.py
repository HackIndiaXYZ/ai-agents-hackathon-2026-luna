"""
Incremental upsert of targeted market_price_query examples (RCA Phase 7).
Embeds only the new rows — does not rebuild the full corpus.
"""
import io
import json
import os
import sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from dotenv import load_dotenv

api_dir = Path(__file__).resolve().parents[1]
root_dir = api_dir.parents[1]
sys.path.insert(0, str(api_dir))
load_dotenv(api_dir / ".env")
load_dotenv(root_dir / ".env")

from core.embedding_service import get_embedding_service
from supabase import create_client

PATCH_FILE = root_dir / "pipeline" / "output" / "targeted_price_examples.jsonl"
CORPUS_FILE = root_dir / "pipeline" / "output" / "intent_rag_final.jsonl"


def main():
    if not PATCH_FILE.exists():
        print(f"Missing patch file: {PATCH_FILE}")
        return 1

    rows = []
    with open(PATCH_FILE, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                rows.append(json.loads(line))

    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    embedder = get_embedding_service()

    texts = [r["utterance"] for r in rows]
    vectors = embedder.embed_batch(texts)

    db_columns = {
        "id", "utterance", "utterance_normalized", "utterance_language",
        "utterance_script", "intent", "intent_category", "entities", "action",
        "requires_context", "requires_confirmation", "is_ambiguous", "difficulty",
        "source", "region", "trader_type", "utterance_embedding",
    }

    for row, vec in zip(rows, vectors):
        payload = {k: v for k, v in row.items() if k in db_columns}
        payload["utterance_embedding"] = vec.tolist()
        sb.table("intent_examples").upsert(payload, on_conflict="id").execute()
        print(f"Upserted {row['id']}: {row['utterance']}")

    # Append to local corpus file if not already present
    existing_ids = set()
    if CORPUS_FILE.exists():
        with open(CORPUS_FILE, encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    existing_ids.add(json.loads(line)["id"])

    with open(CORPUS_FILE, "a", encoding="utf-8") as f:
        for row in rows:
            if row["id"] not in existing_ids:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
                print(f"Appended to corpus: {row['id']}")

    print(f"\nDone — {len(rows)} targeted examples added with embeddings.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
