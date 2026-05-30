"""
TradeNexus Pipeline — Run adaptation.

Runs the adaptive learning process on exported alias data using the
Adaption Labs SDK (or falls back gracefully to a robust local refinement loop).
"""

import sys
import json
from pathlib import Path

# Add services/api to sys.path to reuse configuration
api_path = Path(__file__).resolve().parents[1] / "services" / "api"
sys.path.append(str(api_path))

from core.config import get_settings


def run_adaptation():
    """Submit exported aliases to Adaption Labs SDK or refine locally."""
    settings = get_settings()
    api_key = settings.ADAPTION_API_KEY

    data_dir = Path(__file__).resolve().parents[1] / "data"
    input_file = data_dir / "exported_aliases.jsonl"
    output_file = data_dir / "refined_aliases.jsonl"

    if not input_file.exists():
        print(f"[Adaptation Pipeline] Error: Input file {input_file} does not exist. Run export first.")
        return

    print(f"[Adaptation Pipeline] Reading dataset from {input_file}...")
    records = []
    with open(input_file, mode="r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                records.append(json.loads(line))

    refined_records = []
    if api_key:
        print("[Adaptation Pipeline] API Key found. Connecting to Adaption Labs platform...")
        try:
            import adaption
            # Submit to Adaption client
            client = adaption.Client(api_key=api_key)
            # Submit records for refinement/clustering of Indian dialects
            refined_data = client.refine(
                records=records,
                task="commodity_dialect_alignment",
                languages=["hi", "mr", "gu", "te", "ta"]
            )
            refined_records = refined_data.get("records", records)
            print("[Adaptation Pipeline] Remote refinement complete via Adaption Labs SDK.")
        except Exception as e:
            print(f"[Adaptation Pipeline] SDK error: {e}. Executing local refinement backup...")
            refined_records = local_refinement(records)
    else:
        print("[Adaptation Pipeline] Missing ADAPTION_API_KEY. Executing deterministic local refinement...")
        refined_records = local_refinement(records)

    with open(output_file, mode="w", encoding="utf-8") as f:
        for r in refined_records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"[Adaptation Pipeline] Successfully refined and wrote {len(refined_records)} rows to {output_file}")


def local_refinement(records: list) -> list:
    """
    Local refinement loop to standardize dialect aliases.
    Strips noise, corrects common casing anomalies, and standardizes formats.
    """
    standardized = []
    seen = set()

    for r in records:
        alias = r["alias"].strip()
        # Clean casing anomalies (lower casing regional matching terms for exact search matches)
        alias_clean = alias.lower()
        
        # Avoid duplicate aliases under the same canonical mapping
        key = (r["canonical_name"].lower(), alias_clean)
        if key in seen:
            continue
        seen.add(key)

        # Standard cleanups: replace double spaces, trim punctuation
        alias = " ".join(alias.split())
        
        # Increase confidence slightly on successfully processed aliases
        new_conf = min(1.0, round(float(r.get("confidence", 0.8)) * 1.05, 2))

        standardized.append({
            "canonical_name": r["canonical_name"],
            "alias": alias,
            "language": r["language"],
            "region": r["region"],
            "confidence": new_conf
        })

    return standardized


if __name__ == "__main__":
    run_adaptation()
