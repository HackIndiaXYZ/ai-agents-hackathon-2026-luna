"""
TradeNexus — LSTM Price Forecasting Model Trainer.

Standalone training script. Run after collect_price_data.py.
Trains per-commodity LSTM models for 7-day price forecasting.

Usage:
    cd services/api
    python ../ml/train_price_models.py
"""

import os
import json
import csv
import sys
import warnings
from datetime import datetime
from pathlib import Path

import numpy as np
import joblib

# Suppress TensorFlow warnings for clean output
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
warnings.filterwarnings("ignore")

# --- Configuration ---

LOOK_BACK = 21       # Input window: 21 days
PREDICT_DAYS = 7     # Output: 7-day forecast
EPOCHS = 30
BATCH_SIZE = 16
TRAIN_SPLIT = 0.8

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
TRAINING_DATA_DIR = PROJECT_ROOT / "data" / "ml_training"
MODELS_DIR = PROJECT_ROOT / "data" / "ml_models"

TARGET_COMMODITIES = [
    "Cotton", "Soybean", "Pigeon Pea", "Chickpea", "Wheat",
    "Onion", "Groundnut", "Mustard", "Maize", "Turmeric",
]


def to_snake(name: str) -> str:
    return name.lower().replace(" ", "_")


def load_csv(csv_path: Path) -> tuple[list[str], list[float], bool]:
    """Load price CSV and return dates, prices, and whether it has synthetic data."""
    dates = []
    prices = []
    has_synthetic = False

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            dates.append(row["date"])
            prices.append(float(row["modal_price"]))
            if row.get("source") == "synthetic":
                has_synthetic = True

    return dates, prices, has_synthetic


def create_sequences(data: np.ndarray, look_back: int, predict_days: int):
    """Create sliding window sequences for LSTM training."""
    X, y = [], []
    for i in range(len(data) - look_back - predict_days + 1):
        X.append(data[i : i + look_back])
        y.append(data[i + look_back : i + look_back + predict_days].flatten())
    return np.array(X), np.array(y)


def calculate_mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Calculate Mean Absolute Percentage Error."""
    mask = y_true != 0
    if not mask.any():
        return 0.0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def train_lstm_for_commodity(commodity: str, csv_path: Path) -> dict | None:
    """Train an LSTM model for a single commodity and save artifacts."""
    # Lazy import TensorFlow (heavy library)
    from sklearn.preprocessing import MinMaxScaler
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout

    dates, prices, has_synthetic = load_csv(csv_path)
    n_rows = len(prices)

    if n_rows < LOOK_BACK + PREDICT_DAYS + 5:
        print(f"  [SKIP] {commodity}: only {n_rows} rows, need at least {LOOK_BACK + PREDICT_DAYS + 5}")
        return None

    # 1. Sort by date (should already be sorted from collection)
    paired = sorted(zip(dates, prices), key=lambda x: x[0])
    prices_sorted = np.array([p for _, p in paired]).reshape(-1, 1)

    # 2. Train/test split (chronological)
    split_idx = int(len(prices_sorted) * TRAIN_SPLIT)

    # 3. Normalize using MinMaxScaler (fit on training set ONLY)
    scaler = MinMaxScaler(feature_range=(0, 1))
    train_data = scaler.fit_transform(prices_sorted[:split_idx])
    test_data_raw = prices_sorted[split_idx:]
    # Transform test data using training scaler
    all_scaled = scaler.transform(prices_sorted)

    # 4. Create sequences from all scaled data, then split
    X, y = create_sequences(all_scaled, LOOK_BACK, PREDICT_DAYS)

    if len(X) == 0:
        print(f"  [SKIP] {commodity}: not enough data for sequences")
        return None

    # Split sequences chronologically
    seq_split = int(len(X) * TRAIN_SPLIT)
    X_train, X_test = X[:seq_split], X[seq_split:]
    y_train, y_test = y[:seq_split], y[seq_split:]

    if len(X_test) == 0:
        X_test = X_train[-2:]
        y_test = y_train[-2:]

    # 5. Build LSTM model
    model = Sequential([
        LSTM(64, input_shape=(LOOK_BACK, 1), return_sequences=True),
        Dropout(0.2),
        LSTM(32),
        Dropout(0.2),
        Dense(PREDICT_DAYS),
    ])
    model.compile(optimizer="adam", loss="mse")

    # 6. Train
    model.fit(
        X_train, y_train,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        validation_data=(X_test, y_test),
        verbose=0,
    )

    # 7. Evaluate — calculate MAPE on test set
    y_pred_scaled = model.predict(X_test, verbose=0)

    # Inverse transform predictions and actuals for MAPE
    # Each row in y_test/y_pred is 7 values; inverse transform each
    y_test_inv = []
    y_pred_inv = []
    for i in range(len(y_test)):
        y_test_inv.append(scaler.inverse_transform(y_test[i].reshape(-1, 1)).flatten())
        y_pred_inv.append(scaler.inverse_transform(y_pred_scaled[i].reshape(-1, 1)).flatten())

    y_test_inv = np.array(y_test_inv)
    y_pred_inv = np.array(y_pred_inv)
    mape = calculate_mape(y_test_inv, y_pred_inv)

    # 8. Save model and scaler
    snake = to_snake(commodity)
    model_path = MODELS_DIR / f"lstm_{snake}.h5"
    scaler_path = MODELS_DIR / f"scaler_{snake}.pkl"

    model.save(str(model_path))
    joblib.dump(scaler, str(scaler_path))

    print(f"  {commodity} LSTM: MAPE={mape:.1f}%, trained on {n_rows} rows")

    return {
        "mape": round(mape, 2),
        "trained_at": datetime.now().isoformat(),
        "rows_used": n_rows,
        "has_synthetic": has_synthetic,
    }


def main():
    print("=" * 60)
    print("TradeNexus - LSTM Price Forecasting Model Training")
    print("=" * 60)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    registry = {}

    for commodity in TARGET_COMMODITIES:
        snake = to_snake(commodity)
        csv_path = TRAINING_DATA_DIR / f"{snake}_prices.csv"

        if not csv_path.exists():
            print(f"  [SKIP] {commodity}: no training data at {csv_path}")
            continue

        result = train_lstm_for_commodity(commodity, csv_path)
        if result:
            registry[commodity] = result

    # Save model registry
    registry_path = MODELS_DIR / "model_registry.json"
    with open(registry_path, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)

    print(f"\nModel registry saved to: {registry_path}")
    print(f"Trained {len(registry)} / {len(TARGET_COMMODITIES)} commodity models.")
    print("Done!")


if __name__ == "__main__":
    main()
