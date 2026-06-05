"""Supabase RPC + HTTP endpoint verification for RCA."""
import io
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

API_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_DIR))

from dotenv import load_dotenv

load_dotenv(API_DIR / ".env")
load_dotenv(API_DIR.parent.parent / ".env")

QUERY = "कपास का भाव क्या है"


def supabase_top10():
    from supabase import create_client
    from core.embedding_service import get_embedding_service

    svc = get_embedding_service()
    q_emb = svc.embed(QUERY)
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    res = sb.rpc(
        "match_intent_examples",
        {"query_embedding": q_emb.tolist(), "match_threshold": 0.0, "match_count": 10},
    ).execute()
    print("SUPABASE RPC top 10")
    print("QUERY repr:", repr(QUERY))
    for i, row in enumerate(res.data or [], 1):
        sim = float(row.get("similarity", 0))
        lang = row.get("utterance_language")
        intent = row.get("intent")
        utt = row.get("utterance", "")
        print(f"  {i}. sim={sim:.4f} [{lang}] {intent}: {utt[:90]}")


def http_retrieve():
    url = "http://localhost:8000/api/v1/lucy/retrieve?" + urlencode({"q": QUERY, "top_k": 10})
    print("\nHTTP GET (urllib UTF-8):", url[:80], "...")
    with urlopen(Request(url), timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    print("response utterance repr:", repr(data.get("utterance")))
    print("dominant_intent:", data.get("dominant_intent"))
    print("retrieval_confidence:", data.get("retrieval_confidence"))
    for i, ex in enumerate(data.get("retrieved_examples", [])[:10], 1):
        print(
            f"  {i}. sim={ex.get('similarity', 0):.4f} "
            f"[{ex.get('language')}] {ex.get('intent')}: {ex.get('utterance', '')[:80]}"
        )


def simulate_corrupted_client():
    corrupted = "???? ?? ??? ???? ??"
    url = "http://localhost:8000/api/v1/lucy/retrieve?" + urlencode({"q": corrupted, "top_k": 3})
    print("\nSIMULATE corrupted client query repr:", repr(corrupted))
    print("URL contains %3f:", "%3f" in url)
    try:
        with urlopen(Request(url), timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        print("echoed utterance:", repr(data.get("utterance")))
        if data.get("retrieved_examples"):
            print("top match:", data["retrieved_examples"][0].get("utterance", "")[:80])
    except Exception as e:
        print("request failed:", e)


if __name__ == "__main__":
    supabase_top10()
    try:
        http_retrieve()
    except Exception as e:
        print("HTTP retrieve failed (server may be down):", e)
    try:
        simulate_corrupted_client()
    except Exception:
        pass
