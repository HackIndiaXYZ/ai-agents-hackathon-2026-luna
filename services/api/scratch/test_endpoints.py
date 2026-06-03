"""Quick test script for Prompt 5 endpoints."""
import urllib.request
import json

BASE = "http://localhost:8000"

def test(name, url):
    try:
        res = urllib.request.urlopen(url, timeout=180).read()
        data = json.loads(res)
        print(f"[PASS] {name}")
        # Print a summary
        if isinstance(data, dict):
            for k in list(data.keys())[:5]:
                v = data[k]
                if isinstance(v, str) and len(v) > 80:
                    v = v[:80] + "..."
                print(f"       {k}: {v}")
        return True
    except Exception as e:
        print(f"[FAIL] {name}: {e}")
        return False

print("=" * 60)
print("Prompt 5 — Endpoint Verification")
print("=" * 60)

# 1. Health
test("Health Check", f"{BASE}/health")

# 2. Model Info
test("Model Info (Cotton)", f"{BASE}/api/v1/risk/model-info/Cotton")

# 3. Data Quality
test("Data Quality Report", f"{BASE}/api/v1/risk/data-quality")

# 4. Forecast (may take time on first Chronos load)
print("\n[INFO] Testing forecast endpoint (may take 1-2 min on first Chronos load)...")
test("Price Forecast (Cotton)", f"{BASE}/api/v1/risk/forecast/Cotton")

print("\nDone!")
