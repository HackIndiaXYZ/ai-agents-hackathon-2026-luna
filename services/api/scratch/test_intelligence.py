"""Test script for Prompt 6 endpoints."""
import urllib.request
import urllib.error
import json

BASE = "http://localhost:8000"

def test(name, url, method="GET", headers=None, data=None):
    try:
        req = urllib.request.Request(url, method=method)
        if headers:
            for k, v in headers.items():
                req.add_header(k, v)
        
        req_data = None
        if data:
            req_data = json.dumps(data).encode("utf-8")
            req.add_header("Content-Type", "application/json")

        res = urllib.request.urlopen(req, data=req_data, timeout=60).read()
        parsed = json.loads(res)
        print(f"[PASS] {name}")
        
        # Display some info
        if name == "GET Weather (Nagpur)":
            print(f"       Region: {parsed.get('region')}")
            print(f"       Forecast Days: {len(parsed.get('forecast', []))}")
            print(f"       Max Risk Score: {parsed.get('max_risk_score')}")
        elif name == "POST Scan Now (Authorized)":
            print(f"       Weather scan results: {parsed.get('weather_scan')}")
            print(f"       Macro analysis results: {parsed.get('macro_analysis')}")
        elif name == "GET Agent Activity Log":
            logs = parsed.get("activity_log", [])
            print(f"       Total logs: {len(logs)}")
            weather_logs = [l for l in logs if l.get("agent_name") == "Weather Agent"]
            macro_logs = [l for l in logs if l.get("agent_name") == "Macro Signal Agent"]
            print(f"       Weather Agent logs: {len(weather_logs)}")
            for wl in weather_logs[:1]:
                print(f"         - {wl.get('summary')}")
            print(f"       Macro Signal Agent logs: {len(macro_logs)}")
            for ml in macro_logs[:1]:
                print(f"         - {ml.get('summary')}")
        
        return True
    except urllib.error.HTTPError as e:
        print(f"[FAIL] {name}: HTTP {e.code} - {e.read().decode('utf-8')}")
        return False
    except Exception as e:
        print(f"[FAIL] {name}: {e}")
        return False

print("=" * 60)
print("Prompt 6 — Verification")
print("=" * 60)

# 1. Weather forecast for region
test("GET Weather (Nagpur)", f"{BASE}/api/v1/risk/weather/Nagpur")

# 2. Trigger Scan now (with key - should pass and stagger calls)
print("\n[INFO] Triggering scan-now (with 2-second stagger delay for macro)...")
test(
    "POST Scan Now (Authorized)",
    f"{BASE}/api/v1/risk/scan-now",
    method="POST",
    headers={"X-Internal-Key": "tradenexus_internal_secret"}
)

# 3. Retrieve agent activity logs
print("\n[INFO] Querying agent activity logs...")
test("GET Agent Activity Log", f"{BASE}/api/v1/risk/activity")

print("\nDone!")
