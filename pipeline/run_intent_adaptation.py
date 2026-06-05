from adaption import Adaption, DatasetTimeout
import os
import json
from datetime import datetime
from dotenv import load_dotenv
import time
import httpx
from pathlib import Path

load_dotenv()

# Check key
api_key = os.environ.get("ADAPTION_API_KEY")
if not api_key:
    raise ValueError("ADAPTION_API_KEY must be set in your environment or .env file")

client = Adaption(api_key=api_key)
date_str = datetime.now().strftime("%Y-%m-%d")

print("=== TradeNexus Intent Dataset — Adaption Pipeline ===\n")

# STEP 1: Upload
print("[1/6] Uploading seed dataset to Adaption...")
result = client.datasets.upload_file(
    "pipeline/output/intent_seeds_for_adaption.csv",
    name=f"tradenexus-trading-intent-{date_str}"
)
dataset_id = result.dataset_id
print(f"  Dataset ID: {dataset_id}")

# Wait for ingestion
print("[2/6] Waiting for ingestion...")
while True:
    status = client.datasets.get_status(dataset_id)
    if status.row_count is not None:
        print(f"  Ingested {status.row_count} rows")
        break
    time.sleep(3)

# STEP 3: Estimate cost before running
print("[3/6] Estimating adaptation cost...")
estimate = client.datasets.run(
    dataset_id,
    column_mapping={
        "prompt": "utterance",
        "completion": "intent",
    },
    estimate=True
)
print(f"  Estimated credits: {estimate.estimated_credits_consumed}")
print(f"  Estimated time: {estimate.estimated_minutes} minutes")
print("  Proceed? (Ctrl+C to cancel, Enter to continue)")
input()

# STEP 4: Run adaptation
print("[4/6] Starting adaptation run...")
run = client.datasets.run(
    dataset_id,
    column_mapping={
        "prompt": "utterance",
        "completion": "intent",
    }
)
print(f"  Run ID: {run.run_id}")

# STEP 5: Wait for completion
print("[5/6] Waiting for completion (this may take 10-30 minutes)...")
try:
    final = client.datasets.wait_for_completion(
        dataset_id, timeout=3600
    )
    print(f"  Status: {final.status}")
except DatasetTimeout:
    print("  Timed out — check Adaption dashboard and re-run")
    raise

# STEP 6: Get evaluation
print("[6/6] Fetching evaluation metrics...")
try:
    evaluation = client.datasets.get_evaluation(dataset_id)
    eval_data = {
        "dataset_id": dataset_id,
        "run_id": run.run_id,
        "grade_before": evaluation.quality.grade_before 
            if evaluation.quality else "N/A",
        "grade_after": evaluation.quality.grade_after 
            if evaluation.quality else "N/A",
        "improvement_percent": evaluation.quality.improvement_percent 
            if evaluation.quality else None,
    }
    print(f"  Grade before: {eval_data['grade_before']}")
    print(f"  Grade after:  {eval_data['grade_after']}")
    if eval_data["improvement_percent"]:
        print(f"  Improvement:  {eval_data['improvement_percent']:.1f}%")
except Exception as e:
    print(f"  Evaluation unavailable: {e}")
    eval_data = {"dataset_id": dataset_id, "run_id": run.run_id}

# Download adapted output
download_url = client.datasets.download(dataset_id)
output_path = f"pipeline/output/intent_adapted_{date_str}.jsonl"
print(f"\nDownloading adapted corpus to {output_path}...")
response = httpx.get(download_url)
with open(output_path, "wb") as f:
    f.write(response.content)

# Count rows
with open(output_path) as f:
    row_count = sum(1 for line in f if line.strip())
print(f"Downloaded {row_count} rows")

# Save provenance
provenance = {
    "dataset_name": "Indian Commodity Trader Intent Corpus",
    "version": date_str,
    "adaption": {
        "dataset_id": dataset_id,
        "run_id": run.run_id,
        "processed_at": datetime.utcnow().isoformat() + "Z",
        "evaluation": eval_data,
    },
    "seed_rows": 210,
    "adapted_rows": row_count,
    "description": (
        "Multilingual intent classification dataset for Indian "
        "commodity traders. Covers 30 trading intents across "
        "Hindi, Marathi, Gujarati, Telugu, Tamil, Punjabi, "
        "Kannada, Bengali, and English."
    ),
    "intended_use": "RAG retrieval layer for Lucy AI copilot",
    "license": "CC BY 4.0"
}
with open("pipeline/output/intent_provenance.json", "w") as f:
    json.dump(provenance, f, indent=2)

print(f"\n{'='*50}")
print("✓ Intent adaptation complete")
print(f"  Adaption Dataset ID: {dataset_id}")
print(f"  Adapted corpus: {output_path}")
print(f"  Rows: {row_count}")
print(f"  Next: run python pipeline/import_intent_corpus.py")
print(f"{'='*50}")
