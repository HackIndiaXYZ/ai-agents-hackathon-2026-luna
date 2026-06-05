import sys
from pathlib import Path
import os
import json
import asyncio

# Setup python path to import core modules
api_dir = Path(__file__).resolve().parents[1]
sys.path.append(str(api_dir))

from core.database import get_client
from core.embedding_service import get_embedding_service
from core.intent_retriever import IntentRetriever

async def test_rag():
    print("[*] Initializing database and embedding service...")
    supabase = get_client()
    embedding_service = get_embedding_service()
    
    retriever = IntentRetriever(supabase, embedding_service)
    
    # Diverse test queries (multilingual & Hinglish)
    test_queries = [
        "chana bechna hai 10 quintal",
        "cotton ka bhav kya hai",
        "route from Nagpur to Mumbai",
        "any risk alerts today?",
        "predict next week soybean price",
        "hello lucy"
    ]
    
    # Output results to a UTF-8 file to prevent console encoding crashes
    out_file = Path(api_dir) / "scratch" / "test_rag_output.txt"
    with open(out_file, "w", encoding="utf-8") as out:
        for query in test_queries:
            out.write(f"\n==================================================\n")
            out.write(f"QUERY: '{query}'\n")
            out.write(f"==================================================\n")
            res = await retriever.retrieve(query, top_k=3, min_similarity=0.65)
            out.write(f"RAG Used: {res.retrieval_used}\n")
            out.write(f"Confidence: {res.retrieval_confidence:.4f}\n")
            out.write(f"Dominant Intent: {res.dominant_intent}\n")
            out.write(f"Dominant Category: {res.dominant_category}\n")
            
            out.write("\nTop Matches:\n")
            for idx, ex in enumerate(res.examples, 1):
                out.write(f"  {idx}. [{ex.similarity:.2%}] (Lang: {ex.language}, Intent: {ex.intent})\n")
                out.write(f"     Utterance: '{ex.utterance}'\n")
                
            out.write("\nPrompt context block:\n")
            context = retriever.build_rag_context(res, query)
            if context:
                out.write(context + "\n")
            else:
                out.write("[No RAG context injected]\n")
                
    print(f"[*] Done. Results written to {out_file}")

if __name__ == "__main__":
    asyncio.run(test_rag())
