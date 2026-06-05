"""
RCA diagnostic: trace Hindi query through retrieval path.
Read-only — does not modify dataset or embeddings.
"""
import asyncio
import io
import json
import os
import re
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import quote, unquote

import numpy as np
from dotenv import load_dotenv

# UTF-8 stdout on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[3]
API_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_DIR))
load_dotenv(API_DIR / ".env")

QUERY = "कपास का भाव क्या है"
CORPUS_PATH = ROOT / "pipeline" / "output" / "intent_rag_final.jsonl"


def trace(label: str, text: str) -> None:
    print(f"\n--- {label} ---")
    print("QUERY:", text)
    print("REPR:", repr(text))
    print("TYPE:", type(text))
    print("LEN:", len(text))
    has_qmarks = "?" in text and not text.endswith("?")
    print("HAS_CORRUPTION_MARKERS:", "????" in text or (has_qmarks and sum(1 for c in text if c == "?") > 2))


def simulate_urlencode_roundtrip(text: str) -> str:
    encoded = quote(text, safe="")
    decoded = unquote(encoded)
    return decoded


def simulate_windows_cp1252_mojibake(text: str) -> str:
    """Simulate what happens if UTF-8 bytes are decoded as cp1252 then re-encoded."""
    try:
        raw = text.encode("utf-8")
        broken = raw.decode("cp1252", errors="replace")
        return broken
    except Exception as e:
        return f"<error: {e}>"


async def phase1_trace_path():
    print("=" * 70)
    print("PHASE 1: QUERY PATH TRACE")
    print("=" * 70)

    trace("1. Source query (Python literal)", QUERY)

    encoded = quote(QUERY, safe="")
    trace("2. After urllib quote (curl --data-urlencode)", encoded)

    decoded = unquote(encoded)
    trace("3. After FastAPI/Starlette query decode", decoded)

    # intent_retriever normalize
    from core.intent_retriever import IntentRetriever

    class _Dummy:
        pass

    retriever = IntentRetriever(_Dummy(), _Dummy())
    normalized = retriever.normalize_utterance(decoded)
    trace("4. After intent_retriever.normalize_utterance", normalized)

    # Embedding input (actual code path uses raw utterance)
    embed_input = decoded
    trace("5. Embedding service input (raw utterance)", embed_input)

    roundtrip = simulate_urlencode_roundtrip(QUERY)
    trace("6. URL encode/decode roundtrip", roundtrip)
    print("ROUNDTRIP_OK:", roundtrip == QUERY)

    mojibake = simulate_windows_cp1252_mojibake(QUERY)
    trace("7. Simulated cp1252 mis-decode of UTF-8", mojibake)


def phase2_encoding_audit():
    print("\n" + "=" * 70)
    print("PHASE 2: ENCODING AUDIT (repository scan summary)")
    print("=" * 70)

    patterns = [
        (r'\.encode\(', "encode() calls"),
        (r'\.decode\(', "decode() calls"),
        (r'ascii', "ascii references"),
        (r'latin-?1', "latin1 references"),
        (r'cp1252', "cp1252 references"),
        (r'errors\s*=\s*["\']ignore["\']', "errors=ignore"),
        (r'errors\s*=\s*["\']replace["\']', "errors=replace"),
    ]

    py_js_files = list(ROOT.rglob("*.py")) + list((ROOT / "apps").rglob("*.js"))
    py_js_files = [f for f in py_js_files if "node_modules" not in str(f) and ".venv" not in str(f)]

    for pat, label in patterns:
        hits = []
        rx = re.compile(pat, re.IGNORECASE)
        for fp in py_js_files:
            try:
                text = fp.read_text(encoding="utf-8", errors="replace")
            except Exception:
                continue
            for i, line in enumerate(text.splitlines(), 1):
                if rx.search(line) and "scratch/rca_" not in str(fp):
                    hits.append((str(fp.relative_to(ROOT)), i, line.strip()[:120]))
        print(f"\n{label}: {len(hits)} hit(s)")
        for path, line_no, snippet in hits[:15]:
            print(f"  {path}:{line_no}: {snippet}")
        if len(hits) > 15:
            print(f"  ... and {len(hits) - 15} more")


def phase3_corpus_integrity():
    print("\n" + "=" * 70)
    print("PHASE 3: CORPUS / DATASET INTEGRITY (intent_rag_final.jsonl)")
    print("=" * 70)

    if not CORPUS_PATH.exists():
        print(f"MISSING: {CORPUS_PATH}")
        return []

    rows = []
    with open(CORPUS_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                rows.append(json.loads(line))

    print(f"Total rows: {len(rows)}")

    lang_counts = Counter(r.get("utterance_language", "?") for r in rows)
    print("\nRows by language:")
    for lang, ct in sorted(lang_counts.items(), key=lambda x: -x[1]):
        print(f"  {lang}: {ct}")

    intent_counts = Counter(r.get("intent", "?") for r in rows)
    print(f"\nUnique intents: {len(intent_counts)}")
    print("Top 15 intents:")
    for intent, ct in intent_counts.most_common(15):
        print(f"  {intent}: {ct}")

    corruption = []
    for r in rows:
        utt = r.get("utterance", "")
        if "????" in utt or "\ufffd" in utt:
            corruption.append(r)

    print(f"\nCorruption markers (???? or U+FFFD): {len(corruption)}")
    for r in corruption[:5]:
        print(f"  [{r.get('utterance_language')}] {r.get('intent')}: {r.get('utterance')[:80]}")

    for lang in ["hi", "ta", "gu", "mr", "te", "kn", "bn", "pa", "hi-en", "en"]:
        samples = [r for r in rows if r.get("utterance_language") == lang][:3]
        if samples:
            print(f"\nSample {lang} ({len([r for r in rows if r.get('utterance_language') == lang])} total):")
            for s in samples:
                print(f"  [{s.get('intent')}] {s.get('utterance')[:100]}")

    mkt_hi = [r for r in rows if r.get("intent") == "market_price_query" and r.get("utterance_language") == "hi"]
    print(f"\nHindi market_price_query examples: {len(mkt_hi)}")
    for r in mkt_hi:
        print(f"  {r.get('utterance')}")

    alias_kapas = [
        r for r in rows
        if r.get("intent") == "alias_correction"
        and ("kapas" in r.get("utterance", "").lower() or "कपास" in r.get("utterance", ""))
    ]
    print(f"\nalias_correction with kapas/कपास: {len(alias_kapas)}")
    for r in alias_kapas[:8]:
        print(f"  [{r.get('utterance_language')}] {r.get('utterance')[:100]}")

    return rows


async def phase4_embedding_input(rows):
    print("\n" + "=" * 70)
    print("PHASE 4: EMBEDDING INPUT VERIFICATION")
    print("=" * 70)

    # From build_intent_embeddings.py: texts = [r["utterance"] for r in batch]
    print("build_intent_embeddings.py embeds: utterance (NOT utterance_normalized)")
    for intent in ["market_price_query", "contract_create_sell", "inventory_add"]:
        ex = next((r for r in rows if r.get("intent") == intent), None)
        if ex:
            print(f"\n  intent={intent}:")
            print(f"    utterance: {ex.get('utterance')[:120]}")
            print(f"    utterance_normalized (NOT embedded): {str(ex.get('utterance_normalized', ''))[:80]}...")

    from core.embedding_service import get_embedding_service

    svc = get_embedding_service()
    trace("Query embedding input", QUERY)
    emb = svc.embed(QUERY)
    print(f"Embedding shape: {emb.shape}, norm: {np.linalg.norm(emb):.4f}")


async def phase5_vector_search(rows):
    print("\n" + "=" * 70)
    print("PHASE 5: VECTOR SEARCH FOR QUERY")
    print("=" * 70)

    from core.embedding_service import get_embedding_service
    from supabase import create_client

    svc = get_embedding_service()
    q_emb = svc.embed(QUERY)
    q_norm = np.linalg.norm(q_emb)

    # Local corpus embedding comparison (if no DB)
    print("\n--- Local corpus top-10 (re-embed utterances on the fly) ---")
    scored_local = []
    for r in rows:
        utt = r.get("utterance", "")
        if not utt:
            continue
        v = svc.embed(utt)
        sim = float(np.dot(q_emb, v) / (q_norm * np.linalg.norm(v)))
        scored_local.append((sim, r))
    scored_local.sort(key=lambda x: x[0], reverse=True)

    print(f"Top 10 (local re-embed of corpus utterances):")
    intent_dist = Counter()
    for i, (sim, r) in enumerate(scored_local[:10], 1):
        intent_dist[r.get("intent")] += 1
        print(
            f"  {i}. sim={sim:.4f} [{r.get('utterance_language')}] "
            f"{r.get('intent')}: {r.get('utterance')[:80]}"
        )
    print("Intent distribution (top 10):", dict(intent_dist))

    # Find rank of best market_price_query Hindi cotton
    target = "आज नागपुर में कपास का भाव क्या है?"
    for rank, (sim, r) in enumerate(scored_local, 1):
        if r.get("utterance") == target:
            print(f"\nExact seed match rank: #{rank}, sim={sim:.4f}")
            break

    # Supabase if available
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        print("\nSupabase credentials missing — skipping DB vector search")
        return

    try:
        sb = create_client(url, key)
        count = sb.table("intent_examples").select("id", count="exact").execute()
        print(f"\nSupabase intent_examples count: {count.count}")

        # Sample Hindi from DB
        hi_sample = (
            sb.table("intent_examples")
            .select("utterance, intent, utterance_language")
            .eq("utterance_language", "hi")
            .limit(5)
            .execute()
        )
        print("\nSupabase Hindi sample:")
        for row in hi_sample.data or []:
            trace(f"DB row [{row.get('intent')}]", row.get("utterance", ""))

        # RPC retrieval
        q_vec = q_emb.tolist()
        res = sb.rpc(
            "match_intent_examples",
            {"query_embedding": q_vec, "match_threshold": 0.0, "match_count": 10},
        ).execute()
        db_results = res.data or []
        print(f"\nSupabase RPC top {len(db_results)}:")
        db_intents = Counter()
        for i, row in enumerate(db_results, 1):
            db_intents[row.get("intent")] += 1
            utt = row.get("utterance", "")
            print(
                f"  {i}. sim={float(row.get('similarity', 0)):.4f} "
                f"[{row.get('utterance_language')}] {row.get('intent')}: {utt[:80]}"
            )
            if "????" in utt:
                print("    *** CORRUPTION IN DB ROW ***")
        print("DB intent distribution:", dict(db_intents))

        # Check DB corruption count (sample)
        all_hi = (
            sb.table("intent_examples")
            .select("utterance, utterance_language, intent")
            .in_("utterance_language", ["hi", "ta", "gu"])
            .limit(200)
            .execute()
        )
        corrupt_db = [r for r in (all_hi.data or []) if "????" in (r.get("utterance") or "")]
        print(f"\nDB corruption in sample of 200 hi/ta/gu rows: {len(corrupt_db)}")

    except Exception as e:
        print(f"\nSupabase error: {e}")
        import traceback
        traceback.print_exc()


def phase6_dataset_quality(rows):
    print("\n" + "=" * 70)
    print("PHASE 6: DATASET QUALITY ANALYSIS")
    print("=" * 70)

    intent_counts = Counter(r.get("intent") for r in rows)
    lang_counts = Counter(r.get("utterance_language") for r in rows)

    alias_ct = intent_counts.get("alias_correction", 0)
    mkt_ct = intent_counts.get("market_price_query", 0)
    hi_en_ct = lang_counts.get("hi-en", 0)

    mkt_hi = [r for r in rows if r.get("intent") == "market_price_query" and r.get("utterance_language") == "hi"]
    mkt_hi_kapas = [r for r in mkt_hi if "कपास" in r.get("utterance", "") or "kapas" in r.get("utterance", "").lower()]

    print(f"alias_correction: {alias_ct} ({100*alias_ct/len(rows):.1f}%)")
    print(f"market_price_query: {mkt_ct} ({100*mkt_ct/len(rows):.1f}%)")
    print(f"hi-en (Hinglish): {hi_en_ct}")
    print(f"Hindi market_price_query: {len(mkt_hi)}")
    print(f"Hindi market_price_query mentioning kapas/कपास: {len(mkt_hi_kapas)}")

    # Intent balance
    min_intent = min(intent_counts.values())
    max_intent = max(intent_counts.values())
    print(f"Intent count range: {min_intent} - {max_intent}")


async def main():
    await phase1_trace_path()
    phase2_encoding_audit()
    rows = phase3_corpus_integrity()
    if rows:
        await phase4_embedding_input(rows)
        await phase5_vector_search(rows)
        phase6_dataset_quality(rows)

    print("\n" + "=" * 70)
    print("RCA SCRIPT COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
