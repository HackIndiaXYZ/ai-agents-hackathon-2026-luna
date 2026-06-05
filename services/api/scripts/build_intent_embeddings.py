import sys
from pathlib import Path
import os
from dotenv import load_dotenv

# Add project root and services/api to python path to support different import conventions
api_dir = Path(__file__).resolve().parents[1]
root_dir = Path(__file__).resolve().parents[3]
sys.path.append(str(api_dir))
sys.path.append(str(root_dir))

from core.embedding_service import get_embedding_service
from supabase import create_client

load_dotenv()

# Instantiate Supabase client
supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_KEY"]
)

# Instantiate local embedding service
embedding_service = get_embedding_service()

def normalize_utterance(text: str) -> str:
    if not text:
        return ""
    text = text.strip().lower()
    
    # Simple Devanagari character-to-roman transliteration mapping (basic romanization)
    translit_map = {
        'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
        'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
        'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n',
        'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
        'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
        'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
        'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
        'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
        'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
        'ं': 'n', 'ः': 'h', 'ँ': 'n', '्': '', '।': '.',
        '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
    }
    
    # Common regional words translation mapping
    translation_map = {
        "kapas": "cotton",
        "chana": "chickpea",
        "gehun": "wheat",
        "sarso": "mustard",
        "pyaz": "onion",
        "soyabean": "soybean",
        "moong": "mung bean",
        "bhav": "price",
        "bhaav": "price",
        "daam": "price",
        "rate": "price",
        "mandi": "market",
        "bechna": "sell",
        "kharidna": "buy",
        "kitna": "how much",
        "aaya": "received",
        "stock": "inventory"
    }
    
    # Transliterate Devanagari character-by-character
    transliterated = "".join(translit_map.get(char, char) for char in text)
    
    # Simple word-by-word translation
    words = transliterated.split()
    translated_words = [translation_map.get(w, w) for w in words]
    
    return " ".join(translated_words)

# Fetch all rows with existing embeddings (in case we need to rebuild)
all_rows = []
page_size = 500
offset = 0

while True:
    result = (
        supabase.table("intent_examples")
        .select("id, utterance, utterance_normalized")
        .limit(page_size)
        .range(offset, offset + page_size - 1)
        .execute()
    )

    batch = result.data or []
    all_rows.extend(batch)

    if len(batch) < page_size:
        break

    offset += page_size

print(f"Found {len(all_rows)} intent examples — rebuilding embeddings from source utterance.")

# Embed in batches of 50
BATCH_SIZE = 50
embedded = 0
for i in range(0, len(all_rows), BATCH_SIZE):
    batch = all_rows[i:i+BATCH_SIZE]

    texts = [r["utterance"] for r in batch]

    embeddings = embedding_service.embed_batch(texts)

    updates = []
    for row, embedding in zip(batch, embeddings):
        updates.append({
            "id": row["id"],
            "utterance_embedding": embedding.tolist()
        })

    for update in updates:
        supabase.table("intent_examples").update({
            "utterance_embedding": update["utterance_embedding"]
        }).eq("id", update["id"]).execute()

    embedded += len(batch)
    print(f"  Embedded {embedded}/{len(all_rows)}...")

print(f"\n[SUCCESS] Rebuilt embeddings for {embedded} intent examples")
print(f"  RAG retrieval is now ready")
