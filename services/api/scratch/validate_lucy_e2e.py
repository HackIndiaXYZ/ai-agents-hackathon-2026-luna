"""
End-to-end Lucy multilingual validation suite.

Exercises the real frontend chat path:
  POST /api/v1/lucy/chat  (orchestration + agent routing)
  POST /api/v1/lucy/retrieve  (RAG layer — parallel observability)

Run from services/api (API server must be running on localhost:8000):
  python scratch/validate_lucy_e2e.py

Optional:
  LUCY_API_BASE=http://localhost:8000 python scratch/validate_lucy_e2e.py
  LUCY_E2E_LIMIT=5 python scratch/validate_lucy_e2e.py   # smoke subset
"""
from __future__ import annotations

import io
import json
import os
import re
import sys
import uuid
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

BASE_URL = os.environ.get("LUCY_API_BASE", "http://localhost:8000").rstrip("/")
CHAT_TIMEOUT = int(os.environ.get("LUCY_CHAT_TIMEOUT", "180"))
RETRIEVE_TIMEOUT = int(os.environ.get("LUCY_RETRIEVE_TIMEOUT", "120"))

# Corpus intent (RAG) → Lucy orchestrator intent
CORPUS_TO_LUCY: Dict[str, str] = {
    "inventory_add": "INVENTORY_ADD",
    "inventory_query": "INVENTORY_CHECK",
    "contract_create_buy": "CONTRACT_CREATE",
    "contract_create_sell": "CONTRACT_CREATE",
    "market_price_query": "MARKET_QUERY",
    "market_forecast_query": "FORECAST_QUERY",
    "market_best_mandi_query": "MARKET_QUERY",
    "risk_counterparty_query": "RISK_QUERY",
    "risk_pnl_query": "PNL_QUERY",
    "dispatch_create": "DISPATCH_CREATE",
    "dispatch_status_query": "CONTRACT_STATUS",
    "find_buyers": "BUYER_SEARCH",
    "buyer_profile_query": "BUYER_SEARCH",
    "compliance_gst_query": "COMPLIANCE_QUERY",
    "deal_evaluate": "DEAL_ANALYSIS",
    "alias_correction": "LEARNING_QUERY",
    "greeting": "GREETING",
}

LUCY_TO_CORPUS: Dict[str, str] = {
    "INVENTORY_ADD": "inventory_add",
    "INVENTORY_CHECK": "inventory_query",
    "INVENTORY_SELL": "contract_create_sell",
    "CONTRACT_CREATE": "contract_create_sell",
    "MARKET_QUERY": "market_price_query",
    "FORECAST_QUERY": "market_forecast_query",
    "RECOMMENDATION": "market_best_mandi_query",
    "RISK_QUERY": "risk_counterparty_query",
    "PNL_QUERY": "risk_pnl_query",
    "DISPATCH_CREATE": "dispatch_create",
    "DISPATCH_QUERY": "dispatch_status_query",
    "CONTRACT_STATUS": "dispatch_status_query",
    "BUYER_SEARCH": "find_buyers",
    "COMPLIANCE_QUERY": "compliance_gst_query",
    "DEAL_ANALYSIS": "deal_evaluate",
    "LEARNING_QUERY": "alias_correction",
    "GREETING": "greeting",
    "UNKNOWN": "unknown",
}

CORPUS_EXPECTED_AGENT: Dict[str, str] = {
    "inventory_add": "inventory_agent",
    "inventory_query": "inventory_agent",
    "contract_create_buy": "contract_agent",
    "contract_create_sell": "contract_agent",
    "market_price_query": "market_agent",
    "market_forecast_query": "market_agent",
    "market_best_mandi_query": "market_agent",
    "risk_counterparty_query": "risk_agent",
    "risk_pnl_query": "risk_agent",
    "dispatch_create": "dispatch_agent",
    "dispatch_status_query": "dispatch_agent",
    "find_buyers": "buyer_discovery_agent",
    "buyer_profile_query": "buyer_discovery_agent",
    "compliance_gst_query": "compliance_agent",
    "deal_evaluate": "trade_advisor_agent",
    "alias_correction": "commodity_agent",
    "greeting": "inventory_agent",
}

LANGUAGE_HINTS: Dict[str, str] = {
    "English": "en",
    "Hindi": "hi",
    "Hinglish": "hinglish",
    "Marathi": "hi",
    "Gujarati": "hi",
    "Punjabi": "hi",
    "Tamil": "hi",
    "Telugu": "hi",
    "Kannada": "hi",
    "Bengali": "hi",
}


@dataclass
class TestCase:
    language: str
    query: str
    expected_intent: str
    tag: str = ""


def _build_test_cases() -> List[TestCase]:
    cases: List[TestCase] = [
        # --- English ---
        TestCase("English", "Add 50 quintal cotton to inventory", "inventory_add"),
        TestCase("English", "What is cotton price today?", "market_price_query"),
        TestCase("English", "Sell 50 quintal cotton to Nagpur Mills", "contract_create_sell"),
        TestCase("English", "Show my current PnL", "risk_pnl_query"),
        TestCase("English", "Who buys soybean regularly?", "find_buyers"),
        # --- Hindi ---
        TestCase("Hindi", "मेरे स्टॉक में 50 क्विंटल कपास जोड़ दो", "inventory_add"),
        TestCase("Hindi", "कपास का भाव क्या है", "market_price_query"),
        TestCase("Hindi", "नागपुर मिल्स को 50 क्विंटल कपास बेचनी है", "contract_create_sell"),
        TestCase("Hindi", "मेरा वर्तमान पीएनएल क्या है", "risk_pnl_query"),
        TestCase("Hindi", "सोयाबीन कौन खरीदता है", "find_buyers"),
        # --- Hinglish ---
        TestCase("Hinglish", "mere stock mein 50 quintal kapas add karo", "inventory_add"),
        TestCase("Hinglish", "kapas ka bhav kya hai", "market_price_query"),
        TestCase("Hinglish", "Nagpur Mills ko 50 quintal kapas bechna hai", "contract_create_sell"),
        TestCase("Hinglish", "mera current pnl batao", "risk_pnl_query"),
        TestCase("Hinglish", "soybean ka buyer kaun hai", "find_buyers"),
        # --- Marathi ---
        TestCase("Marathi", "माझ्या स्टॉकमध्ये 50 क्विंटल कापूस जोडा", "inventory_add"),
        TestCase("Marathi", "कापसाचा भाव काय आहे", "market_price_query"),
        TestCase("Marathi", "50 क्विंटल कापूस नागपूर मिल्सला विकायचा आहे", "contract_create_sell"),
        # --- Gujarati ---
        TestCase("Gujarati", "મારા સ્ટોકમાં 50 ક્વિન્ટલ કપાસ ઉમેરો", "inventory_add"),
        TestCase("Gujarati", "કપાસનો ભાવ શું છે", "market_price_query"),
        # --- Punjabi ---
        TestCase("Punjabi", "ਮੇਰੇ ਸਟਾਕ ਵਿੱਚ 50 ਕੁਇੰਟਲ ਕਪਾਹ ਸ਼ਾਮਲ ਕਰੋ", "inventory_add"),
        TestCase("Punjabi", "ਕਪਾਹ ਦਾ ਭਾਅ ਕੀ ਹੈ", "market_price_query"),
        # --- Tamil ---
        TestCase("Tamil", "என் இருப்பில் 50 குவிண்டால் பருத்தி சேர்க்கவும்", "inventory_add"),
        TestCase("Tamil", "பருத்தி விலை என்ன", "market_price_query"),
        # --- Telugu ---
        TestCase("Telugu", "నా స్టాక్‌లో 50 క్వింటాళ్ల పత్తి జోడించండి", "inventory_add"),
        TestCase("Telugu", "పత్తి ధర ఎంత", "market_price_query"),
        # --- Kannada ---
        TestCase("Kannada", "ನನ್ನ ಸ್ಟಾಕ್‌ಗೆ 50 ಕ್ವಿಂಟಲ್ ಹತ್ತಿ ಸೇರಿಸಿ", "inventory_add"),
        TestCase("Kannada", "ಹತ್ತಿಯ ಬೆಲೆ ಎಷ್ಟು", "market_price_query"),
        # --- Bengali ---
        TestCase("Bengali", "আমার স্টকে 50 কুইন্টাল তুলা যোগ করুন", "inventory_add"),
        TestCase("Bengali", "তুলার দাম কত", "market_price_query"),
        # --- Supplemental English intent coverage (16 intent matrix) ---
        TestCase("English", "What is my cotton inventory?", "inventory_query", tag="intent_coverage"),
        TestCase("English", "Buy 100 quintal wheat from Bharat Agro", "contract_create_buy", tag="intent_coverage"),
        TestCase("English", "What will cotton prices be next week?", "market_forecast_query", tag="intent_coverage"),
        TestCase("English", "Which mandi has the best price for soybean?", "market_best_mandi_query", tag="intent_coverage"),
        TestCase("English", "Any counterparty risk with Nagpur Mills?", "risk_counterparty_query", tag="intent_coverage"),
        TestCase("English", "Schedule dispatch for contract TN-2026-0001", "dispatch_create", tag="intent_coverage"),
        TestCase("English", "Has my cotton dispatch reached Ahmedabad?", "dispatch_status_query", tag="intent_coverage"),
        TestCase("English", "Show buyer profile for Bharat Agro", "buyer_profile_query", tag="intent_coverage"),
        TestCase("English", "What is GST rate on cotton in India?", "compliance_gst_query", tag="intent_coverage"),
        TestCase("English", "Should I sell cotton at 7200 in Nagpur?", "deal_evaluate", tag="intent_coverage"),
        TestCase("English", "Kapas means Cotton", "alias_correction", tag="intent_coverage"),
        TestCase("English", "Hello Lucy", "greeting", tag="intent_coverage"),
    ]
    return cases


def _http_json(
    method: str,
    path: str,
    payload: Optional[dict] = None,
    timeout: int = 60,
) -> Tuple[int, Any]:
    url = f"{BASE_URL}{path}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json; charset=utf-8")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, {"error": raw}


def _parse_lucy_intent(chat: dict) -> Tuple[Optional[str], float]:
    if chat.get("lucy_intent"):
        conf = 0.0
        for step in chat.get("execution_steps") or []:
            if step.get("step_id") == "intent_classification":
                conf_m = re.search(r"Confidence:\s*([\d.]+)", step.get("label") or "")
                if conf_m:
                    conf = float(conf_m.group(1))
                break
        return chat["lucy_intent"], conf
    for step in chat.get("execution_steps") or []:
        label = step.get("label") or ""
        if step.get("step_id") == "intent_classification" or label.startswith("Intent:"):
            m = re.search(r"Intent:\s*([A-Z_]+)", label)
            if m:
                conf_m = re.search(r"Confidence:\s*([\d.]+)", label)
                conf = float(conf_m.group(1)) if conf_m else 0.0
                return m.group(1), conf
    return None, 0.0


def _parse_routed_agent(chat: dict) -> Optional[str]:
    if chat.get("routed_agent"):
        return chat["routed_agent"]
    past_intent = False
    skip = {"session_create", "session_load", "rag_retrieval", "response_synthesis"}
    for step in chat.get("execution_steps") or []:
        sid = step.get("step_id") or ""
        if sid == "intent_classification":
            past_intent = True
            continue
        if past_intent and sid not in skip:
            return sid
    return None


def _corpus_match(actual_corpus: Optional[str], expected: str) -> bool:
    if not actual_corpus:
        return False
    if actual_corpus == expected:
        return True
    # Lucy lumps buy/sell contracts
    if expected in ("contract_create_buy", "contract_create_sell") and actual_corpus in (
        "contract_create_buy", "contract_create_sell"
    ):
        return True
    if expected == "market_best_mandi_query" and actual_corpus == "market_price_query":
        return True
    if expected == "find_buyers" and actual_corpus == "buyer_profile_query":
        return True
    return False


def run_test(case: TestCase) -> dict:
    session_id = str(uuid.uuid4())
    hint = LANGUAGE_HINTS.get(case.language, "en")

    _, retrieve = _http_json(
        "POST",
        "/api/v1/lucy/retrieve",
        {"utterance": case.query, "top_k": 3, "min_similarity": 0.45},
        timeout=RETRIEVE_TIMEOUT,
    )
    retrieved_intent = retrieve.get("dominant_intent") or retrieve.get("dominant_retrieved_intent")
    retrieval_confidence = float(retrieve.get("retrieval_confidence") or 0.0)

    status, chat = _http_json(
        "POST",
        "/api/v1/lucy/chat",
        {
            "message": case.query,
            "session_id": session_id,
            "language_hint": hint,
        },
        timeout=CHAT_TIMEOUT,
    )

    if status == 200:
        retrieved_intent = chat.get("dominant_intent") or chat.get("dominant_retrieved_intent") or retrieved_intent
        retrieval_confidence = float(chat.get("retrieval_confidence") or retrieval_confidence)

    lucy_intent, lucy_conf = _parse_lucy_intent(chat) if status == 200 else (None, 0.0)
    routed_agent = _parse_routed_agent(chat) if status == 200 else None
    lucy_corpus = LUCY_TO_CORPUS.get(lucy_intent or "", None)

    retrieval_pass = _corpus_match(retrieved_intent, case.expected_intent)
    orchestration_pass = _corpus_match(lucy_corpus, case.expected_intent)
    expected_lucy = CORPUS_TO_LUCY.get(case.expected_intent)
    lucy_raw_pass = lucy_intent == expected_lucy or (
        case.expected_intent in ("contract_create_buy", "contract_create_sell")
        and lucy_intent == "CONTRACT_CREATE"
    )

    expected_agent = CORPUS_EXPECTED_AGENT.get(case.expected_intent)
    agent_pass = (
        routed_agent == expected_agent
        or (routed_agent and expected_agent and routed_agent.split("_")[0] in expected_agent)
    )

    overall_pass = orchestration_pass and status == 200

    return {
        "language": case.language,
        "query": case.query,
        "expected_intent": case.expected_intent,
        "expected_lucy": expected_lucy,
        "retrieved_intent": retrieved_intent,
        "retrieval_confidence": retrieval_confidence,
        "retrieval_pass": retrieval_pass,
        "final_lucy_intent": lucy_intent,
        "final_lucy_corpus": lucy_corpus,
        "lucy_confidence": lucy_conf,
        "orchestration_pass": orchestration_pass,
        "lucy_raw_pass": lucy_raw_pass,
        "routed_agent": routed_agent,
        "expected_agent": expected_agent,
        "agent_pass": agent_pass,
        "pass": overall_pass,
        "http_status": status,
        "error": chat.get("detail") if status != 200 else None,
        "tag": case.tag,
        "lucy_confidence": lucy_conf,
        "chat_retrieval_used": chat.get("retrieval_used") if status == 200 else False,
        "response_preview": (chat.get("response_text") or "")[:120] if status == 200 else None,
    }


def print_case_result(r: dict) -> None:
    print("=" * 48)
    print(f"QUERY: {r['query']}")
    print(f"EXPECTED INTENT: {r['expected_intent']}")
    print(f"RETRIEVED INTENT: {r['retrieved_intent']}")
    print(f"RETRIEVAL CONFIDENCE: {r['retrieval_confidence']:.4f}")
    print(f"FINAL LUCY INTENT: {r['final_lucy_intent']} (corpus≈{r['final_lucy_corpus']})")
    print(f"LUCY CONFIDENCE: {r.get('lucy_confidence', 0):.2f}")
    print(f"ROUTED AGENT: {r['routed_agent']} (expected {r['expected_agent']})")
    print(f"RAG IN CHAT: {r.get('chat_retrieval_used', False)}")
    print(f"PASS: {'YES' if r['pass'] else 'NO'}")
    if r.get("error"):
        print(f"ERROR: {r['error']}")
    print("=" * 48)


def print_summary(results: List[dict]) -> None:
    print("\n" + "#" * 60)
    print("SUMMARY")
    print("#" * 60)

    lang_stats: Dict[str, List[bool]] = defaultdict(list)
    intent_stats: Dict[str, List[bool]] = defaultdict(list)
    retrieval_stats: Dict[str, List[bool]] = defaultdict(list)

    for r in results:
        lang_stats[r["language"]].append(r["pass"])
        intent_stats[r["expected_intent"]].append(r["pass"])
        retrieval_stats[r["expected_intent"]].append(r["retrieval_pass"])

    print("\nLanguage Accuracy Table\n")
    print("| Language | Total | Passed | Accuracy | Retrieval Acc |")
    print("| -------- | ----- | ------ | -------- | ------------- |")
    for lang in sorted(lang_stats.keys()):
        vals = lang_stats[lang]
        retr = [r["retrieval_pass"] for r in results if r["language"] == lang]
        total = len(vals)
        passed = sum(vals)
        retr_pass = sum(retr)
        acc = 100 * passed / total if total else 0
        retr_acc = 100 * retr_pass / len(retr) if retr else 0
        print(f"| {lang} | {total} | {passed} | {acc:.0f}% | {retr_acc:.0f}% |")

    print("\nIntent Accuracy Table\n")
    print("| Intent | Total | Passed | Accuracy | Retrieval Acc |")
    print("| ------ | ----- | ------ | -------- | ------------- |")
    for intent in sorted(intent_stats.keys()):
        vals = intent_stats[intent]
        retr = retrieval_stats[intent]
        total = len(vals)
        passed = sum(vals)
        retr_pass = sum(retr)
        acc = 100 * passed / total if total else 0
        retr_acc = 100 * retr_pass / len(retr) if retr else 0
        print(f"| {intent} | {total} | {passed} | {acc:.0f}% | {retr_acc:.0f}% |")

    total = len(results)
    passed = sum(r["pass"] for r in results)
    retr_passed = sum(r["retrieval_pass"] for r in results)
    print(f"\nOverall Orchestration Accuracy: {passed}/{total} ({100*passed/total:.1f}%)")
    print(f"Overall Retrieval Accuracy: {retr_passed}/{total} ({100*retr_passed/total:.1f}%)")

    failures = [r for r in results if not r["pass"]]
    retr_only = [r for r in results if r["retrieval_pass"] and not r["pass"]]
    orch_only = [r for r in results if r["pass"] and not r["retrieval_pass"]]
    low_conf = sorted(
        [r for r in results if r["retrieval_confidence"] < 0.55],
        key=lambda x: x["retrieval_confidence"],
    )[:8]

    print("\nTop Failure Patterns")
    if not failures:
        print("  (none — all tests passed)")
    else:
        patterns = Counter(
            f"{r['language']} | expected={r['expected_intent']} | lucy={r['final_lucy_intent']} | rag={r['retrieved_intent']}"
            for r in failures
        )
        for pattern, count in patterns.most_common(8):
            print(f"  [{count}x] {pattern}")

    print("\nExamples of Wrong Classifications (orchestration)")
    for r in failures[:6]:
        print(
            f"  - [{r['language']}] {r['query'][:60]}…\n"
            f"    expected={r['expected_intent']} | lucy={r['final_lucy_intent']} | rag={r['retrieved_intent']}"
        )

    print("\nRetrieval correct but orchestration wrong")
    for r in retr_only[:5]:
        print(f"  - {r['query'][:70]} → rag={r['retrieved_intent']} lucy={r['final_lucy_intent']}")

    print("\nOrchestration correct but retrieval wrong")
    for r in orch_only[:5]:
        print(f"  - {r['query'][:70]} → rag={r['retrieved_intent']} lucy={r['final_lucy_intent']}")

    print("\nLow Confidence Retrieval (< 0.55)")
    for r in low_conf:
        print(f"  - conf={r['retrieval_confidence']:.3f} | {r['query'][:70]} | rag={r['retrieved_intent']}")


def main() -> int:
    limit = os.environ.get("LUCY_E2E_LIMIT")
    cases = _build_test_cases()
    if limit:
        cases = cases[: int(limit)]

    print(f"Lucy E2E Validation — {len(cases)} tests against {BASE_URL}")
    print(f"Chat timeout={CHAT_TIMEOUT}s  Retrieve timeout={RETRIEVE_TIMEOUT}s\n")

    # Health check
    try:
        status, _ = _http_json("GET", "/api/v1/market/commodities", timeout=15)
        if status != 200:
            print(f"WARNING: API health check returned {status}")
    except Exception as e:
        print(f"ERROR: Cannot reach API at {BASE_URL}: {e}")
        print("Start server: cd services/api && uvicorn main:app --reload")
        return 1

    results = []
    for i, case in enumerate(cases, 1):
        print(f"\n[{i}/{len(cases)}] {case.language} — {case.expected_intent}")
        try:
            r = run_test(case)
        except Exception as e:
            r = {
                "language": case.language,
                "query": case.query,
                "expected_intent": case.expected_intent,
                "retrieved_intent": None,
                "retrieval_confidence": 0.0,
                "final_lucy_intent": None,
                "final_lucy_corpus": None,
                "routed_agent": None,
                "expected_agent": CORPUS_EXPECTED_AGENT.get(case.expected_intent),
                "pass": False,
                "retrieval_pass": False,
                "error": str(e),
            }
        results.append(r)
        print_case_result(r)

    print_summary(results)
    failed = sum(1 for r in results if not r["pass"])
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
