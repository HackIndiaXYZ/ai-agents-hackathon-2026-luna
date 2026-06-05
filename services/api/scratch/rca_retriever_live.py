"""Live IntentRetriever test — mirrors production path."""
import asyncio
import io
import json
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

QUERY = "कपास का भाव क्या है"
CORRUPTED = "???? ?? ??? ???? ??"


def trace(label, text):
    print(f"\n--- {label} ---")
    print("QUERY:", text)
    print("REPR:", repr(text))
    print("TYPE:", type(text))


async def run():
    retriever = IntentRetriever(get_client(), get_embedding_service())

    trace("INPUT", QUERY)
    result = await retriever.retrieve(QUERY, top_k=10, min_similarity=0.45)
    print(f"\nretrieval_used={result.retrieval_used}")
    print(f"dominant_intent={result.dominant_intent}")
    print(f"retrieval_confidence={result.retrieval_confidence:.4f}")
    for i, ex in enumerate(result.examples, 1):
        print(
            f"  {i}. sim={ex.similarity:.4f} [{ex.language}] {ex.intent}: {ex.utterance[:85]}"
        )

    trace("CORRUPTED INPUT", CORRUPTED)
    bad = await retriever.retrieve(CORRUPTED, top_k=3, min_similarity=0.45)
    print(f"dominant_intent={bad.dominant_intent}")
    for i, ex in enumerate(bad.examples, 1):
        print(f"  {i}. sim={ex.similarity:.4f} [{ex.language}] {ex.intent}: {ex.utterance[:85]}")


asyncio.run(run())
