"""
TradeNexus — Load Intent Seeds into Supabase.
Reads generated intent_seeds_english.jsonl, generates embeddings,
and upserts records into the intent_examples database table.
"""

import os
import sys
import json
import asyncio
from pathlib import Path
from collections import Counter

# Add services/api to python path to resolve core.* imports
sys.path.append(str(Path(__file__).resolve().parents[1]))

from core.database import get_client

async def load_seeds():
    sb = get_client()
    
    # Locate intent seeds JSONL file
    workspace_root = Path(__file__).resolve().parents[3]
    jsonl_path = workspace_root / "pipeline" / "output" / "intent_seeds_english.jsonl"
    
    if not jsonl_path.exists():
        print(f"[-] Error: Seeds file not found at: {jsonl_path}")
        print("[-] Please run 'python pipeline/generate_intent_seeds.py' first.")
        return
        
    print(f"[*] Reading seeds from: {jsonl_path}")
    
    # Read the seed records
    records = []
    with open(jsonl_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                records.append(json.loads(line.strip()))
                
    total_records = len(records)
    print(f"[*] Found {total_records} seed examples in JSONL.")
    
    # Initialize EmbeddingService if available
    embedding_service = None
    try:
        from core.embedding_service import get_embedding_service
        embedding_service = get_embedding_service()
        print("[*] EmbeddingService loaded successfully.")
    except Exception as exc:
        print(f"[!] Warning: Failed to load EmbeddingService ({exc}). Loading seeds without embeddings.")
        
    loaded_count = 0
    category_counts = Counter()
    
    # Process and upsert records
    print("[*] Starting upsert into intent_examples table...")
    
    # Batch process to be fast and efficient
    # We can upsert in chunks of 50 rows
    batch_size = 50
    for i in range(0, total_records, batch_size):
        batch = records[i:i+batch_size]
        
        # Compute embeddings for the batch if embedding service is available
        if embedding_service is not None:
            try:
                utterances = [r["utterance"] for r in batch]
                # Embed batch returning list of np.ndarrays
                vectors = embedding_service.embed_batch(utterances)
                for record, vec in zip(batch, vectors):
                    record["utterance_embedding"] = vec.tolist()
            except Exception as exc:
                print(f"[!] Batch embedding computation failed: {exc}. Inserting batch without embeddings.")
                for record in batch:
                    record["utterance_embedding"] = None
        else:
            for record in batch:
                record["utterance_embedding"] = None
                
        # Perform upsert on the table
        try:
            res = sb.table("intent_examples").upsert(batch, on_conflict="id").execute()
            if res.data:
                loaded_count += len(res.data)
            else:
                loaded_count += len(batch)
                
            for record in batch:
                category_counts[record["intent_category"]] += 1
                
            print(f"[+] Loaded {min(i+batch_size, total_records)}/{total_records} records...")
        except Exception as exc:
            print(f"[-] Batch upsert failed: {exc}. Attempting row-by-row fallback...")
            # Fallback to row-by-row
            for record in batch:
                try:
                    sb.table("intent_examples").upsert(record, on_conflict="id").execute()
                    loaded_count += 1
                    category_counts[record["intent_category"]] += 1
                except Exception as row_exc:
                    print(f"[-] Failed to upsert record {record.get('id')}: {row_exc}")
                    
    print()
    print(f"Loaded {loaded_count} seed examples into intent_examples table")
    print()
    print("Breakdown by intent category:")
    print(f"{'Category':<15} | {'Count':<5}")
    print("-" * 25)
    for category, count in sorted(category_counts.items()):
        print(f"{category:<15} | {count:<5}")

if __name__ == "__main__":
    asyncio.run(load_seeds())
