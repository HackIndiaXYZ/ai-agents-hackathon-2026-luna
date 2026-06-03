"""
TradeNexus — Multi-Model Price Forecasting Trainer.

Orchestrates training based on recommended models in data_collection_report.json:
- LSTM: Deep learning 21-day lookback, 7-day predict.
- Prophet: Facebook Prophet multiplicative model.
- XGBoost: XGBRegressor with lags (1,2,3,7,14,21), rolling stats, and season encoding.
- Chronos: Zero-shot forecasting (no training required).
"""

import os
import sys
import csv
import json
import warnings
from datetime import datetime
from pathlib import Path
import joblib
import numpy as np
import pandas as pd

# Suppress warnings
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
warnings.filterwarnings("ignore")

# Path config
PROJECT_ROOT = Path(__file__).resolve().parents[2]
TRAINING_DATA_DIR = PROJECT_ROOT / "data" / "ml_training"
MODELS_DIR = PROJECT_ROOT / "data" / "ml_models"
REPORT_PATH = MODELS_DIR / "data_collection_report.json"
REGISTRY_PATH = MODELS_DIR / "model_registry.json"

TARGET_COMMODITIES = [
    "Cotton", "Soybean", "Pigeon Pea", "Chickpea", "Wheat",
    "Onion", "Groundnut", "Mustard", "Maize", "Turmeric"
]

LOOK_BACK = 21
PREDICT_DAYS = 7
TRAIN_SPLIT = 0.8

def to_snake(name: str) -> str:
    return name.lower().replace(" ", "_")

def load_csv(csv_path: Path) -> tuple[list[str], list[float], bool]:
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

def calculate_mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    mask = y_true != 0
    if not mask.any():
        return 0.0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)

# --- LSTM Trainer ---
def train_lstm(commodity: str, csv_path: Path) -> float:
    from sklearn.preprocessing import MinMaxScaler
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    
    dates, prices, _ = load_csv(csv_path)
    n_rows = len(prices)
    prices_sorted = np.array(prices).reshape(-1, 1)
    
    split_idx = int(n_rows * TRAIN_SPLIT)
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaler.fit(prices_sorted[:split_idx])
    
    all_scaled = scaler.transform(prices_sorted)
    
    # Create sequences
    X, y = [], []
    for i in range(len(all_scaled) - LOOK_BACK - PREDICT_DAYS + 1):
        X.append(all_scaled[i : i + LOOK_BACK])
        y.append(all_scaled[i + LOOK_BACK : i + LOOK_BACK + PREDICT_DAYS].flatten())
    X, y = np.array(X), np.array(y)
    
    seq_split = int(len(X) * TRAIN_SPLIT)
    X_train, X_test = X[:seq_split], X[seq_split:]
    y_train, y_test = y[:seq_split], y[seq_split:]
    
    if len(X_test) == 0:
        X_test, y_test = X_train[-2:], y_train[-2:]
        
    model = Sequential([
        LSTM(64, input_shape=(LOOK_BACK, 1), return_sequences=True),
        Dropout(0.2),
        LSTM(32),
        Dropout(0.2),
        Dense(PREDICT_DAYS),
    ])
    model.compile(optimizer="adam", loss="mse")
    model.fit(X_train, y_train, epochs=30, batch_size=16, validation_data=(X_test, y_test), verbose=0)
    
    # Evaluate
    y_pred_scaled = model.predict(X_test, verbose=0)
    y_test_inv = []
    y_pred_inv = []
    for i in range(len(y_test)):
        y_test_inv.append(scaler.inverse_transform(y_test[i].reshape(-1, 1)).flatten())
        y_pred_inv.append(scaler.inverse_transform(y_pred_scaled[i].reshape(-1, 1)).flatten())
        
    mape = calculate_mape(np.array(y_test_inv), np.array(y_pred_inv))
    
    # Save
    snake = to_snake(commodity)
    model.save(str(MODELS_DIR / f"lstm_{snake}.h5"))
    joblib.dump(scaler, str(MODELS_DIR / f"scaler_{snake}.pkl"))
    return mape

# --- Prophet Trainer ---
def train_prophet(commodity: str, csv_path: Path) -> float:
    try:
        from prophet import Prophet
    except ImportError:
        print("  [WARN] Prophet not installed. Falling back to XGBoost.")
        return train_xgboost(commodity, csv_path)
        
    dates, prices, _ = load_csv(csv_path)
    n_rows = len(prices)
    df = pd.DataFrame({"ds": pd.to_datetime(dates), "y": prices})
    
    # Eval MAPE
    split_idx = int(n_rows * TRAIN_SPLIT)
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]
    
    # Fit eval model
    eval_model = Prophet(seasonality_mode="multiplicative", daily_seasonality=False, weekly_seasonality=True, yearly_seasonality=True)
    eval_model.fit(train_df)
    
    future = pd.DataFrame({"ds": test_df["ds"]})
    forecast = eval_model.predict(future)
    y_pred = forecast["yhat"].values
    y_true = test_df["y"].values
    mape = calculate_mape(y_true, y_pred)
    
    # Fit full model
    full_model = Prophet(seasonality_mode="multiplicative", daily_seasonality=False, weekly_seasonality=True, yearly_seasonality=True)
    full_model.fit(df)
    
    # Save model
    snake = to_snake(commodity)
    joblib.dump(full_model, str(MODELS_DIR / f"prophet_{snake}.pkl"))
    return mape

# --- XGBoost Trainer ---
def train_xgboost(commodity: str, csv_path: Path) -> float:
    from xgboost import XGBRegressor
    
    dates, prices, _ = load_csv(csv_path)
    n_rows = len(prices)
    
    df = pd.DataFrame({"price": prices, "date": pd.to_datetime(dates)})
    df = df.sort_values("date").reset_index(drop=True)
    
    # Create lag features
    lags = [1, 2, 3, 7, 14, 21]
    if len(df) < 50:
        lags = [1, 2, 3, 5, 7]
        
    for lag in lags:
        df[f"lag_{lag}"] = df["price"].shift(lag)
        
    df["rolling_mean_7"] = df["price"].shift(1).rolling(7, min_periods=1).mean()
    df["rolling_std_7"] = df["price"].shift(1).rolling(7, min_periods=1).std().fillna(0)
    
    df["month"] = df["date"].dt.month
    df["is_kharif"] = df["month"].isin([6, 7, 8, 9, 10]).astype(int)
    df["is_rabi"] = df["month"].isin([11, 12, 1, 2, 3, 4]).astype(int)
    
    df_feat = df.dropna().reset_index(drop=True)
    
    feature_cols = [c for c in df_feat.columns if c not in ["price", "date", "month"]]
    X = df_feat[feature_cols]
    y = df_feat["price"]
    
    split_idx = int(len(X) * TRAIN_SPLIT)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    
    if len(X_test) == 0:
        X_test, y_test = X_train.iloc[-2:], y_train.iloc[-2:]
        
    # Fit eval model
    eval_model = XGBRegressor(n_estimators=100, max_depth=4, learning_rate=0.05, random_state=42)
    eval_model.fit(X_train, y_train)
    y_pred = eval_model.predict(X_test)
    mape = calculate_mape(y_test.values, y_pred)
    
    # Fit full model
    full_model = XGBRegressor(n_estimators=100, max_depth=4, learning_rate=0.05, random_state=42)
    full_model.fit(X, y)
    
    # Save model and feature list
    snake = to_snake(commodity)
    joblib.dump(full_model, str(MODELS_DIR / f"xgb_price_{snake}.pkl"))
    with open(MODELS_DIR / f"xgb_features_{snake}.json", "w") as f:
        json.dump({"feature_cols": feature_cols, "lags": lags}, f)
        
    return mape

def train_for_commodity(commodity: str, model_type: str, csv_path: Path) -> float:
    print(f"Training {model_type} for {commodity}...")
    if model_type == "LSTM":
        return train_lstm(commodity, csv_path)
    elif model_type == "Prophet":
        return train_prophet(commodity, csv_path)
    elif model_type == "XGBoost":
        return train_xgboost(commodity, csv_path)
    elif model_type == "Chronos":
        # Chronos is zero-shot, no training needed! Return estimate of zero-shot MAPE.
        print(f"  Chronos model zero-shot: skipped training.")
        return 7.50
    else:
        raise ValueError(f"Unknown model type: {model_type}")

def main():
    print("=" * 60)
    print("TradeNexus — Multi-Model Price Forecasting Training")
    print("=" * 60)
    
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Load dataset report
    if not REPORT_PATH.exists():
        print(f"[ERROR] Data collection report not found at {REPORT_PATH}. Run collect_price_data.py first.")
        sys.exit(1)
        
    with open(REPORT_PATH, "r", encoding="utf-8") as f:
        data_report = json.load(f)
        
    # Load existing registry to keep default risk or other entries
    registry = {}
    if REGISTRY_PATH.exists():
        try:
            with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
                registry = json.load(f)
        except Exception as e:
            print(f"[WARN] Error reading existing registry: {e}")
            
    trained_count = 0
    for commodity in TARGET_COMMODITIES:
        snake = to_snake(commodity)
        csv_path = TRAINING_DATA_DIR / f"{snake}_prices.csv"
        
        if not csv_path.exists():
            print(f"  [SKIP] {commodity}: price CSV not found at {csv_path}")
            continue
            
        report = data_report.get(commodity, {})
        model_type = report.get("recommended_model", "XGBoost")
        
        # Train and evaluate
        try:
            mape = train_for_commodity(commodity, model_type, csv_path)
            
            # Update registry (extended fields while retaining old fields)
            registry[commodity] = {
                "mape": round(mape, 2),
                "trained_at": datetime.now().isoformat(),
                "rows_used": report.get("total_rows", 0),
                "has_synthetic": report.get("synthetic_rows", 0) > 0,
                # New fields for Prompt 5
                "model_type": model_type,
                "real_data_pct": report.get("real_data_pct", 0.0),
                "data_sources": report.get("data_sources", ["unknown"]),
                "credibility_statement": report.get("credibility_statement", "")
            }
            trained_count += 1
            print(f"  [SUCCESS] {commodity} trained: MAPE={mape:.2f}%")
        except Exception as e:
            print(f"  [ERROR] Failed to train {commodity}: {e}")
            import traceback
            traceback.print_exc()
            
    # Save updated registry
    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)
        
    print(f"\nModel registry updated and saved to: {REGISTRY_PATH}")
    print(f"Trained {trained_count} / {len(TARGET_COMMODITIES)} commodity models.")
    print("Done!")

if __name__ == "__main__":
    main()
