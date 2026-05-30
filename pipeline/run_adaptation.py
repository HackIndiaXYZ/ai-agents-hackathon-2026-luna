"""
TradeNexus Pipeline — Run Adaptation via Adaption Python SDK.

Standalone script that:
1. Reads ``pipeline/output/aliases_for_adaptation.jsonl``
2. Initialises the Adaption client with ``ADAPTION_API_KEY``
3. Uploads the dataset as ``tradenexus-commodity-aliases-{YYYY-MM-DD}``
4. Runs adaptation with input→"input", output→"output" column mapping
5. Polls every 30 s until complete (max 2 h)
6. Downloads adapted output to ``pipeline/output/aliases_adapted_{date}.jsonl``
7. Prints quality improvement metrics

Usage:
    python pipeline/run_adaptation.py
"""

from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Add services/api to sys.path so we can reuse core modules
API_DIR = Path(__file__).resolve().parents[0].parent / "services" / "api"
sys.path.insert(0, str(API_DIR))

from core.config import get_settings  # noqa: E402

PIPELINE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = PIPELINE_DIR / "output"
MAX_POLL_SECONDS = 7200  # 2 hours
POLL_INTERVAL = 30  # seconds


def run_adaptation() -> None:
    """Submit the exported aliases to the Adaption platform and download results."""
    settings = get_settings()
    api_key = settings.ADAPTION_API_KEY

    input_path = OUTPUT_DIR / "aliases_for_adaptation.jsonl"
    if not input_path.exists():
        print(f"[adaptation] Input file not found: {input_path}")
        print("[adaptation] Run `python pipeline/export_aliases.py` first.")
        return

    # Read input records
    records: list[dict] = []
    with open(input_path, "r", encoding="utf-8") as f:
        for line in f:
            stripped = line.strip()
            if stripped:
                records.append(json.loads(stripped))

    print(f"[adaptation] Loaded {len(records)} rows from {input_path}")

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    dataset_name = f"tradenexus-commodity-aliases-{today}"
    output_path = OUTPUT_DIR / f"aliases_adapted_{today}.jsonl"

    if not api_key:
        print("[adaptation] ADAPTION_API_KEY not set — running local fallback refinement.")
        adapted = _local_refinement(records)
        _write_output(adapted, output_path)
        return

    # ----- Adaption SDK integration -----
    try:
        import adaption  # type: ignore

        client = adaption.Client(api_key=api_key)
        print(f"[adaptation] Connected to Adaption platform. Dataset: {dataset_name}")

        # Upload
        upload_result = client.datasets.upload(
            name=dataset_name,
            file=str(input_path),
        )
        dataset_id = upload_result.id
        print(f"[adaptation] Uploaded dataset {dataset_id}")

        # Run adaptation
        job = client.adaptations.create(
            dataset_id=dataset_id,
            input_column="input",
            output_column="output",
        )
        job_id = job.id
        print(f"[adaptation] Adaptation job started: {job_id}")

        # Poll until complete
        elapsed = 0
        while elapsed < MAX_POLL_SECONDS:
            status = client.adaptations.get(job_id)
            print(f"[adaptation] Status: {status.status} ({elapsed}s elapsed)")

            if status.status == "completed":
                break
            if status.status in ("failed", "error"):
                print(f"[adaptation] Job failed: {status.error}")
                print("[adaptation] Falling back to local refinement.")
                adapted = _local_refinement(records)
                _write_output(adapted, output_path)
                return

            time.sleep(POLL_INTERVAL)
            elapsed += POLL_INTERVAL

        if elapsed >= MAX_POLL_SECONDS:
            print("[adaptation] Timed out after 2 hours. Falling back to local refinement.")
            adapted = _local_refinement(records)
            _write_output(adapted, output_path)
            return

        # Download results
        result_data = client.adaptations.download(job_id)
        adapted = (
            result_data if isinstance(result_data, list) else result_data.get("records", records)
        )
        _write_output(adapted, output_path)

        # Print quality metrics
        _print_metrics(records, adapted)

    except ImportError:
        print("[adaptation] 'adaption' package not installed. Running local fallback.")
        adapted = _local_refinement(records)
        _write_output(adapted, output_path)
    except Exception as exc:
        print(f"[adaptation] SDK error: {exc}. Running local fallback.")
        adapted = _local_refinement(records)
        _write_output(adapted, output_path)


# ---------------------------------------------------------------------------
# Local fallback refinement
# ---------------------------------------------------------------------------

def _local_refinement(records: list[dict]) -> list[dict]:
    """
    Deterministic local refinement when the Adaption API is unavailable.

    - Deduplicates by (input, output)
    - Normalises whitespace
    - Bumps confidence slightly for well-sourced aliases
    """
    seen: set[tuple[str, str]] = set()
    refined: list[dict] = []

    for r in records:
        alias = " ".join((r.get("input") or "").strip().split())
        canonical = (r.get("output") or "").strip()
        if not alias or not canonical:
            continue

        key = (alias.lower(), canonical.lower())
        if key in seen:
            continue
        seen.add(key)

        conf = float(r.get("confidence", 0.8))
        # Slight confidence boost for user-sourced corrections
        if r.get("source", "").startswith("user"):
            conf = min(1.0, round(conf * 1.05, 4))

        refined.append({
            "input": alias,
            "output": canonical,
            "language": r.get("language", "en"),
            "region": r.get("region"),
            "confidence": conf,
            "source": r.get("source", "refined"),
        })

    print(f"[adaptation] Local refinement: {len(records)} → {len(refined)} rows (deduplicated)")
    return refined


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _write_output(records: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"[adaptation] Wrote {len(records)} rows to {path}")


def _print_metrics(original: list[dict], adapted: list[dict]) -> None:
    """Print a quick summary of quality improvement."""
    orig_conf = [float(r.get("confidence", 0)) for r in original]
    adapted_conf = [float(r.get("confidence", 0)) for r in adapted]

    avg_orig = sum(orig_conf) / len(orig_conf) if orig_conf else 0
    avg_adapted = sum(adapted_conf) / len(adapted_conf) if adapted_conf else 0

    print("\n--- Quality Metrics ---")
    print(f"  Original rows:    {len(original)}")
    print(f"  Adapted rows:     {len(adapted)}")
    print(f"  Avg confidence:   {avg_orig:.4f} → {avg_adapted:.4f}")
    print(f"  Delta:            {avg_adapted - avg_orig:+.4f}")


if __name__ == "__main__":
    run_adaptation()
