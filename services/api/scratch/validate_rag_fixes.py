"""
Validate RCA retrieval fixes (Phases 2-4).
Run from services/api: python scratch/validate_rag_fixes.py
"""
import asyncio
import io
import sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
API_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_DIR))

from dotenv import load_dotenv

load_dotenv(API_DIR / ".env")
load_dotenv(API_DIR.parent.parent / ".env")

from core.database import get_client
from core.embedding_service import get_embedding_service
from core.intent_retriever import IntentRetriever

CASES = [
    # (query, expected_intent)
    ("कपास का भाव क्या है", "market_price_query"),
    ("kapas ka bhav kya hai", "market_price_query"),
    ("cotton price today", "market_price_query"),
    ("गेहूं का भाव क्या है", "market_price_query"),
    ("soybean market price", "market_price_query"),
    ("Kapas means Cotton", "alias_correction"),
    ("Nagpur Mills ko 50 quintal kapas bechna hai", "contract_create_sell"),
]

BEFORE_BASELINE = {
    "कपास का भाव क्या है": ("alias_correction", 0.6984),
}


async def main():
    retriever = IntentRetriever(get_client(), get_embedding_service())
    passed = 0
    failed = 0

    print("=" * 70)
    print("RAG FIX VALIDATION")
    print("=" * 70)

    for query, expected in CASES:
        result = await retriever.retrieve(query, top_k=3, min_similarity=0.45)
        ok = result.dominant_intent == expected
        status = "PASS" if ok else "FAIL"
        if ok:
            passed += 1
        else:
            failed += 1

        print(f"\n[{status}] query: {query}")
        print(f"  expected: {expected}")
        print(f"  got:      {result.dominant_intent}")
        print(f"  confidence: {result.retrieval_confidence:.4f}")
        for i, ex in enumerate(result.examples, 1):
            print(f"    {i}. sim={ex.similarity:.4f} [{ex.language}] {ex.intent}: {ex.utterance[:70]}")

        if query in BEFORE_BASELINE:
            old_intent, old_conf = BEFORE_BASELINE[query]
            print(f"  BEFORE: dominant={old_intent}, confidence={old_conf:.4f}")
            print(f"  AFTER:  dominant={result.dominant_intent}, confidence={result.retrieval_confidence:.4f}")

    print("\n" + "=" * 70)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 70)
    return failed == 0


if __name__ == "__main__":
    ok = asyncio.run(main())
    sys.exit(0 if ok else 1)
