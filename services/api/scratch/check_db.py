import json, sys, io, os
import numpy as np
from pathlib import Path
from dotenv import load_dotenv

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Load .env from project root
env_path = Path(__file__).resolve().parents[3] / ".env"
print(f"Loading .env from: {env_path} (exists: {env_path.exists()})")
load_dotenv(env_path)

from supabase import create_client
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

# 1. Count total rows
count_res = sb.table("intent_examples").select("id", count="exact").execute()
print(f"Total rows in intent_examples: {count_res.count}")

# 2. Count rows with embeddings
emb_count = sb.table("intent_examples").select("id", count="exact").not_.is_("utterance_embedding", "null").execute()
print(f"Rows WITH embeddings: {emb_count.count}")

# 3. Count rows WITHOUT embeddings
no_emb = sb.table("intent_examples").select("id", count="exact").is_("utterance_embedding", "null").execute()
print(f"Rows WITHOUT embeddings: {no_emb.count}")

# 4. Check hi-en examples specifically
hi_en_res = sb.table("intent_examples").select("id, utterance, intent, utterance_language, utterance_embedding").eq("utterance_language", "hi-en").limit(5).execute()
print(f"\nHinglish examples in DB (first 5):")
for r in (hi_en_res.data or []):
    has_emb = r.get("utterance_embedding") is not None
    print(f"  [{r['intent']}] has_emb={has_emb} | {r['utterance'][:80]}")

# 5. Try the actual similarity search against "kapas add kar de"
print("\n" + "=" * 60)
print("Testing similarity against 'kapas add kar de'")
print("=" * 60)

from sentence_transformers import SentenceTransformer
model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
q_emb = model.encode("kapas add kar de")
q_norm = np.linalg.norm(q_emb)

# Fetch all with embeddings
all_rows = sb.table("intent_examples").select("id, utterance, utterance_language, intent, utterance_embedding").not_.is_("utterance_embedding", "null").limit(2000).execute()
data = all_rows.data or []
print(f"Fetched {len(data)} rows with embeddings from DB")

scored = []
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
    sim = float(np.dot(q_emb, v) / (q_norm * v_norm))
    scored.append((sim, row["utterance"], row["intent"], row["utterance_language"]))

scored.sort(key=lambda x: x[0], reverse=True)
print(f"\nTOP 15 matches for 'kapas add kar de':")
for i, (sim, utt, intent, lang) in enumerate(scored[:15]):
    above = "PASS" if sim >= 0.65 else "FAIL"
    print(f"  {i+1}. [{above}] sim={sim:.4f} [{lang}] {intent}: {utt[:80]}")
