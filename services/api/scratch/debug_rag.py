"""
Diagnostic script to debug RAG retrieval for "kapas add kar de".
Tests embedding generation, in-memory cosine similarity, and Supabase RPC.
"""
import sys, os, json
import numpy as np
from dotenv import load_dotenv

# Setup paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from sentence_transformers import SentenceTransformer

# Load model directly
model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

# Test queries
test_queries = [
    "kapas add kar de",
    "Add 50 quintals of cotton",
    "cotton ka price kya hai",
    "inventory dikhao",
    "kapas",
]

# Generate embeddings for test queries
print("=" * 60)
print("STEP 1: Embedding generation test")
print("=" * 60)
for q in test_queries:
    emb = model.encode(q)
    print(f"  Query: '{q}' -> embedding shape: {emb.shape}, norm: {np.linalg.norm(emb):.4f}")

# Cross-similarity between test queries
print("\n" + "=" * 60)
print("STEP 2: Cross-similarity between test queries")
print("=" * 60)
embeddings = [model.encode(q) for q in test_queries]
for i, q1 in enumerate(test_queries):
    for j, q2 in enumerate(test_queries):
        if i < j:
            sim = float(np.dot(embeddings[i], embeddings[j]) / (np.linalg.norm(embeddings[i]) * np.linalg.norm(embeddings[j])))
            print(f"  '{q1}' <-> '{q2}': {sim:.4f}")

# Now test against database
print("\n" + "=" * 60)
print("STEP 3: Database retrieval test")
print("=" * 60)
try:
    from supabase import create_client
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    
    # Check how many rows exist
    count_res = sb.table("intent_examples").select("id", count="exact").execute()
    print(f"  Total rows in intent_examples: {count_res.count}")
    
    # Check how many have embeddings
    emb_res = sb.table("intent_examples").select("id", count="exact").not_.is_("utterance_embedding", "null").execute()
    print(f"  Rows with embeddings: {emb_res.count}")
    
    # Sample some rows
    sample = sb.table("intent_examples").select("id, utterance, utterance_language, intent, intent_category").limit(10).execute()
    print(f"\n  Sample rows:")
    for row in (sample.data or []):
        print(f"    [{row.get('utterance_language')}] {row.get('intent')}: '{row.get('utterance')}'")
    
    # Check for Hindi/Hinglish examples
    hi_res = sb.table("intent_examples").select("id, utterance, intent, utterance_language").in_("utterance_language", ["hi", "hinglish"]).limit(10).execute()
    print(f"\n  Hindi/Hinglish rows (first 10):")
    for row in (hi_res.data or []):
        print(f"    [{row.get('utterance_language')}] {row.get('intent')}: '{row.get('utterance')}'")
    
    # Test retrieval with "kapas add kar de" 
    print("\n" + "=" * 60)
    print("STEP 4: Cosine similarity against database embeddings")
    print("=" * 60)
    
    query = "kapas add kar de"
    q_emb = model.encode(query)
    q_norm = np.linalg.norm(q_emb)
    
    # Fetch all rows with embeddings
    all_rows = sb.table("intent_examples").select("id, utterance, utterance_language, intent, intent_category, utterance_embedding").not_.is_("utterance_embedding", "null").execute()
    data = all_rows.data or []
    print(f"  Fetched {len(data)} rows with embeddings")
    
    scored = []
    parse_errors = 0
    for row in data:
        emb = row.get("utterance_embedding")
        if not emb:
            continue
        if isinstance(emb, str):
            try:
                emb = json.loads(emb)
            except:
                parse_errors += 1
                continue
        v = np.array(emb, dtype=np.float32)
        v_norm = np.linalg.norm(v)
        if v_norm == 0:
            continue
        sim = float(np.dot(q_emb, v) / (q_norm * v_norm))
        scored.append((sim, row.get("utterance"), row.get("intent"), row.get("utterance_language")))
    
    print(f"  Parse errors: {parse_errors}")
    print(f"  Scored {len(scored)} rows")
    
    # Sort and show top 10
    scored.sort(key=lambda x: x[0], reverse=True)
    print(f"\n  TOP 10 matches for '{query}':")
    for i, (sim, utt, intent, lang) in enumerate(scored[:10]):
        above_thresh = "✓" if sim >= 0.65 else "✗"
        print(f"    {i+1}. [{above_thresh}] sim={sim:.4f} [{lang}] {intent}: '{utt}'")
    
    # Also test with "Add 50 quintals of cotton"
    print(f"\n  TOP 10 matches for 'Add 50 quintals of cotton':")
    q_emb2 = model.encode("Add 50 quintals of cotton")
    q_norm2 = np.linalg.norm(q_emb2)
    scored2 = []
    for row in data:
        emb = row.get("utterance_embedding")
        if not emb:
            continue
        if isinstance(emb, str):
            try:
                emb = json.loads(emb)
            except:
                continue
        v = np.array(emb, dtype=np.float32)
        v_norm = np.linalg.norm(v)
        if v_norm == 0:
            continue
        sim = float(np.dot(q_emb2, v) / (q_norm2 * v_norm))
        scored2.append((sim, row.get("utterance"), row.get("intent"), row.get("utterance_language")))
    scored2.sort(key=lambda x: x[0], reverse=True)
    for i, (sim, utt, intent, lang) in enumerate(scored2[:10]):
        above_thresh = "✓" if sim >= 0.65 else "✗"
        print(f"    {i+1}. [{above_thresh}] sim={sim:.4f} [{lang}] {intent}: '{utt}'")

except Exception as e:
    print(f"  Database error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("STEP 5: Embedding service check")
print("=" * 60)
try:
    from core.embedding_service import get_embedding_service
    svc = get_embedding_service()
    test_emb = svc.embed("kapas add kar de")
    if hasattr(test_emb, 'tolist'):
        test_emb = test_emb.tolist()
    print(f"  embedding_service.embed() returns type: {type(test_emb)}, length: {len(test_emb)}")
    print(f"  First 5 values: {test_emb[:5]}")
    
    # Compare with direct model
    direct = model.encode("kapas add kar de").tolist()
    print(f"  Direct model returns length: {len(direct)}")
    print(f"  First 5 values: {direct[:5]}")
    
    # Check if they match
    sim = float(np.dot(np.array(test_emb), np.array(direct)) / (np.linalg.norm(test_emb) * np.linalg.norm(direct)))
    print(f"  Similarity between embedding_service and direct model: {sim:.6f}")
except Exception as e:
    print(f"  Embedding service error: {e}")
    import traceback
    traceback.print_exc()
