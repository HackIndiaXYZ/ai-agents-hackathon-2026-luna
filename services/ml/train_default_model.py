"""
TradeNexus — XGBoost Default Risk Model Trainer.

Standalone training script. Trains a binary classifier to predict
counterparty delivery default (late vs on-time) using dispatch history.

Usage:
    cd services/api
    python ../ml/train_default_model.py
"""

import json
import os
import sys
import random
import warnings
from datetime import datetime
from pathlib import Path

import numpy as np
import joblib

warnings.filterwarnings("ignore")

# Add services/api to path for Supabase imports
_script_dir = Path(__file__).resolve().parent
_api_dir = _script_dir.parent / "api"
sys.path.insert(0, str(_api_dir))

# --- Configuration ---

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = PROJECT_ROOT / "data" / "ml_models"

MIN_REAL_ROWS = 20
SYNTHETIC_SAMPLES = 200

FEATURE_NAMES = [
    "payment_history_score",
    "corridor_reliability",
    "contract_value",
    "month",
    "is_harvest_season",
    "days_to_delivery",
    "counterparty_total_trades",
]


def generate_synthetic_training_data(n: int = 200) -> tuple[np.ndarray, np.ndarray]:
    """
    Generate synthetic dispatch training data with balanced classes.
    50% on-time (label=0), 50% late (label=1).
    """
    random.seed(42)
    np.random.seed(42)

    X = []
    y = []

    for i in range(n):
        is_late = i >= n // 2  # First half on-time, second half late

        if is_late:
            payment_history = np.random.uniform(0.3, 0.7)
            corridor_reliability = np.random.uniform(0.3, 0.6)
            contract_value = np.random.uniform(50000, 500000)
            month = np.random.choice([7, 8, 9, 1, 2])  # Monsoon/off-season
            is_harvest = 0
            days_to_delivery = np.random.randint(1, 5)
            total_trades = np.random.randint(0, 5)
        else:
            payment_history = np.random.uniform(0.7, 1.0)
            corridor_reliability = np.random.uniform(0.6, 0.95)
            contract_value = np.random.uniform(10000, 300000)
            month = np.random.choice([10, 11, 12, 3, 4, 5])
            is_harvest = 1 if month in [10, 11, 12] else 0
            days_to_delivery = np.random.randint(5, 30)
            total_trades = np.random.randint(5, 50)

        X.append([
            round(payment_history, 4),
            round(corridor_reliability, 4),
            round(contract_value, 2),
            int(month),
            int(is_harvest),
            int(days_to_delivery),
            int(total_trades),
        ])
        y.append(1 if is_late else 0)

    return np.array(X), np.array(y)


def load_real_data_from_supabase() -> tuple[np.ndarray | None, np.ndarray | None, int]:
    """
    Attempt to load real dispatch data from Supabase.
    Returns (X, y, count) or (None, None, 0) if insufficient data.
    """
    try:
        from core.database import get_client
        sb = get_client()

        # Fetch dispatches with contract and counterparty joins
        res = (
            sb.table("dispatches")
            .select(
                "*, contracts(price_per_unit, quantity, counterparty_id, delivery_date, "
                "counterparties(payment_history_score, total_trades)), "
                "trade_corridors(typical_duration_hours, reliability_score)"
            )
            .execute()
        )

        rows = res.data or []
        if len(rows) < MIN_REAL_ROWS:
            return None, None, len(rows)

        X = []
        y = []

        for r in rows:
            contract = r.get("contracts") or {}
            cp = contract.get("counterparties") or {}
            corridor = r.get("trade_corridors") or {}

            payment_score = float(cp.get("payment_history_score") or 0.8)
            corridor_rel = float(corridor.get("reliability_score") or 0.7)

            price = float(contract.get("price_per_unit") or 0)
            qty = float(contract.get("quantity") or 0)
            contract_value = price * qty

            dispatch_date = r.get("dispatch_date") or "2026-01-01"
            month = int(dispatch_date.split("-")[1])
            is_harvest = 1 if month in [10, 11, 12] else 0

            # Days to delivery
            delivery_date_str = contract.get("delivery_date")
            if delivery_date_str and r.get("dispatch_date"):
                from datetime import date as dt_date
                try:
                    dd = dt_date.fromisoformat(delivery_date_str)
                    dp = dt_date.fromisoformat(r["dispatch_date"])
                    days_to_delivery = max((dd - dp).days, 0)
                except Exception:
                    days_to_delivery = 10
            else:
                days_to_delivery = 10

            total_trades = int(cp.get("total_trades") or 0)

            X.append([
                payment_score, corridor_rel, contract_value,
                month, is_harvest, days_to_delivery, total_trades,
            ])

            # Label: was_late
            est = r.get("estimated_arrival")
            act = r.get("actual_arrival")
            if est and act:
                was_late = 1 if act > est else 0
            else:
                was_late = 0

            y.append(was_late)

        return np.array(X), np.array(y), len(rows)

    except Exception as e:
        print(f"  [WARN] Could not load from Supabase: {e}")
        return None, None, 0


def main():
    print("=" * 60)
    print("TradeNexus - XGBoost Default Risk Model Training")
    print("=" * 60)

    # Lazy imports
    from xgboost import XGBClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Try real data first
    X_real, y_real, real_count = load_real_data_from_supabase()

    if X_real is not None and len(X_real) >= MIN_REAL_ROWS:
        print(f"  Using {real_count} real dispatch records from Supabase")
        X, y = X_real, y_real
        data_source = "real"
    else:
        print(f"  Only {real_count} real rows found (need {MIN_REAL_ROWS}). Generating synthetic training data...")
        X, y = generate_synthetic_training_data(SYNTHETIC_SAMPLES)
        data_source = "synthetic"

    print(f"  Dataset: {len(X)} samples, {int(y.sum())} late, {int(len(y) - y.sum())} on-time")

    # 2. Train/test split (stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # 3. Train XGBoost
    model = XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        scale_pos_weight=1,
        random_state=42,
        eval_metric="logloss",
    )
    model.fit(X_train, y_train)

    # 4. Evaluate
    y_pred = model.predict(X_test)
    print("\n  Classification Report:")
    report = classification_report(y_test, y_pred, target_names=["On-Time", "Late"])
    for line in report.split("\n"):
        print(f"    {line}")

    # 5. Feature importances
    importances = model.feature_importances_
    print("\n  Feature Importances:")
    for name, imp in sorted(zip(FEATURE_NAMES, importances), key=lambda x: -x[1]):
        bar = "#" * int(imp * 40)
        print(f"    {name:30s} {imp:.4f}  {bar}")

    # 6. Save model
    model_path = MODELS_DIR / "default_risk_xgb.pkl"
    joblib.dump(model, str(model_path))
    print(f"\n  Model saved to: {model_path}")

    # 7. Save feature names
    features_path = MODELS_DIR / "default_risk_features.json"
    with open(features_path, "w", encoding="utf-8") as f:
        json.dump({
            "feature_names": FEATURE_NAMES,
            "data_source": data_source,
            "samples_used": len(X),
            "trained_at": datetime.now().isoformat(),
        }, f, indent=2)
    print(f"  Features metadata saved to: {features_path}")

    print("\nDone!")


if __name__ == "__main__":
    main()
