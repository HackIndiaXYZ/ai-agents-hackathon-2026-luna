"""Quick smoke test: one Hindi price query through /lucy/chat."""
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


async def main():
    print("LLM mode:", resolve_llm_provider_mode())
    print("Provider:", get_llm_provider().provider_name)
    orch = _get_lucy_orchestrator()
    q = "कपास का भाव क्या है"
    res = await orch.process_turn(q, str(uuid.uuid4()), language_hint="hi")
    print("QUERY:", q)
    print("RAG used:", res.retrieval_used)
    print("RAG intent:", res.dominant_intent, f"({res.retrieval_confidence:.2f})")
    print("Lucy intent:", res.lucy_intent)
    print("Routed agent:", res.routed_agent)
    print("Response:", res.response_text[:200])


asyncio.run(main())
