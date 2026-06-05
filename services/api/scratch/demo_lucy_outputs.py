"""Print final Lucy outputs for key demo queries."""
import asyncio
import io
import sys
import uuid

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, ".")

from dotenv import load_dotenv
load_dotenv("../../.env")
load_dotenv(".env")

from core.llm_provider import resolve_llm_provider_mode, get_llm_provider
from routers.lucy import _get_lucy_orchestrator

DEMO_QUERIES = [
    ("Hindi price", "कपास का भाव क्या है", "hi"),
    ("English inventory", "Add 50 quintal cotton to inventory", "en"),
    ("Hinglish sell", "Nagpur Mills ko 50 quintal kapas bechna hai", "hinglish"),
    ("English PnL", "Show my current PnL", "en"),
]


async def main():
    print(f"LLM: {resolve_llm_provider_mode()} | {get_llm_provider().provider_name}\n")
    orch = _get_lucy_orchestrator()
    for label, q, hint in DEMO_QUERIES:
        print("=" * 60)
        print(f"[{label}] QUERY: {q}")
        res = await orch.process_turn(q, str(uuid.uuid4()), language_hint=hint)
        print(f"RAG: {res.dominant_intent} ({res.retrieval_confidence:.2f}) | used={res.retrieval_used}")
        print(f"Lucy: {res.lucy_intent} → {res.routed_agent}")
        print(f"RESPONSE:\n{res.response_text[:500]}")
        print(f"VOICE: {res.voice_response[:200]}")
        print()


asyncio.run(main())
