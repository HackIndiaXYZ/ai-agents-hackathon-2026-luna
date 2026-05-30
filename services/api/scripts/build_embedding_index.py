"""
TradeNexus — Build Embedding Index Script.

Queries the commodity_aliases table, computes local multilingual embeddings,
and stores them back in Supabase pgvector columns.
"""

import sys
import os

# Append api to path so we can import core modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import get_supabase_client
from core.embedding_service import get_embedding_service


def rebuild_index():
    """Download mappings, compute embeddings locally, and update Supabase vector store."""
    print("[Pipeline] Rebuilding embedding index...")
    supabase = get_supabase_client()
    embedding_service = get_embedding_service()

    # 1. Fetch aliases lacking embeddings
    try:
        response = supabase.table("commodity_aliases").select("id, alias").execute()
        records = response.data
        print(f"[Pipeline] Found {len(records)} commodity aliases to process.")
        
        # 2. Iterate and generate vector embeddings
        for record in records:
            alias_id = record["id"]
            alias_text = record["alias"]
            vector = embedding_service.get_embedding(alias_text)
            
            # 3. Update pgvector column in Supabase
            supabase.table("commodity_aliases").update({
                "embedding": vector
            }).eq("id", alias_id).execute()
            
        print("[Pipeline] Successfully rebuilt embedding index.")
    except Exception as e:
        print(f"[Pipeline] Error building embedding index: {e}")


if __name__ == "__main__":
    rebuild_index()
