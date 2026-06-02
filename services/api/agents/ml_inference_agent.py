"""
TradeNexus CTRM — ML Inference Agent.

Lazy-loads trained LSTM price forecasting models and XGBoost default risk
classifier at first call. Provides inference methods for the REST API.
Zero models loaded at startup — all on-demand.
"""

import json
import logging
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger("ml_inference_agent")
logger.setLevel(logging.INFO)

# --- Paths ---

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
MODELS_DIR = PROJECT_ROOT / "data" / "ml_models"

LOOK_BACK = 21
PREDICT_DAYS = 7


def to_snake(name: str) -> str:
    return name.lower().replace(" ", "_")


class MLInferenceAgent:
    """
    ML inference agent that lazy-loads LSTM price models and XGBoost
    default risk models on first call. Thread-safe singleton caches.
    """

    def __init__(self, supabase_client):
        self.sb = supabase_client

        # Lazy-loaded caches
        self._lstm_models: Dict[str, Any] = {}
        self._scalers: Dict[str, Any] = {}
        self._registry: Optional[dict] = None
        self._xgb_model: Any = None
        self._xgb_features: Optional[List[str]] = None

    # ------------------------------------------------------------------
    # Model Registry
    # ------------------------------------------------------------------

    def _load_registry(self) -> dict:
        """Load model registry JSON (cached)."""
        if self._registry is not None:
            return self._registry

        registry_path = MODELS_DIR / "model_registry.json"
        if not registry_path.exists():
            logger.warning("Model registry not found at %s", registry_path)
            self._registry = {}
            return self._registry

        with open(registry_path, "r", encoding="utf-8") as f:
            self._registry = json.load(f)
        return self._registry

    # ------------------------------------------------------------------
    # LSTM Price Forecasting
    # ------------------------------------------------------------------

    def _load_lstm(self, commodity: str):
        """Lazy-load LSTM model and scaler for a commodity."""
        snake = to_snake(commodity)

        if snake in self._lstm_models:
            return self._lstm_models[snake], self._scalers[snake]

        model_path = MODELS_DIR / f"lstm_{snake}.h5"
        scaler_path = MODELS_DIR / f"scaler_{snake}.pkl"

        if not model_path.exists() or not scaler_path.exists():
            logger.info("No LSTM model found for '%s'", commodity)
            return None, None

        # Lazy import TensorFlow
        import joblib
        os_env_backup = None
        try:
            import os
            os_env_backup = os.environ.get("TF_CPP_MIN_LOG_LEVEL")
            os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
            from tensorflow.keras.models import load_model

            model = load_model(str(model_path), compile=False)
            scaler = joblib.load(str(scaler_path))

            self._lstm_models[snake] = model
            self._scalers[snake] = scaler
            logger.info("Loaded LSTM model for '%s'", commodity)

            return model, scaler
        except Exception as e:
            logger.error("Failed to load LSTM model for '%s': %s", commodity, e)
            return None, None
        finally:
            if os_env_backup is not None:
                import os
                os.environ["TF_CPP_MIN_LOG_LEVEL"] = os_env_backup

    async def forecast_price(self, commodity: str, days: int = 7) -> Optional[dict]:
        """
        Generate a price forecast for a commodity using the trained LSTM model.
        Returns None gracefully if model is not available.
        """
        model, scaler = self._load_lstm(commodity)
        if model is None or scaler is None:
            return None

        registry = self._load_registry()
        meta = registry.get(commodity, {})
        mape = meta.get("mape", 5.0)

        # Get last 21 days of modal prices from mandi_prices
        snake = to_snake(commodity)

        # Resolve commodity ID
        comm_res = (
            self.sb.table("commodities")
            .select("id")
            .eq("canonical_name", commodity)
            .limit(1)
            .execute()
        )
        if not comm_res.data:
            # Try title-case resolution
            comm_res = (
                self.sb.table("commodities")
                .select("id")
                .ilike("canonical_name", f"%{commodity}%")
                .limit(1)
                .execute()
            )
        if not comm_res.data:
            logger.warning("Commodity '%s' not found in DB for forecasting", commodity)
            return None

        comm_id = comm_res.data[0]["id"]

        # Get recent prices
        prices_res = (
            self.sb.table("mandi_prices")
            .select("data_as_of, modal_price")
            .eq("commodity_id", comm_id)
            .order("data_as_of", desc=True)
            .limit(100)
            .execute()
        )

        raw_prices = prices_res.data or []
        if not raw_prices:
            logger.warning("No price data for commodity '%s'", commodity)
            return None

        # Aggregate by date, get chronological order
        date_prices: Dict[str, List[float]] = {}
        for p in raw_prices:
            d = p["data_as_of"]
            date_prices.setdefault(d, []).append(float(p["modal_price"]))

        daily_avg = sorted(
            [(d, sum(ps) / len(ps)) for d, ps in date_prices.items()],
            key=lambda x: x[0],
        )

        # Take last LOOK_BACK days; pad if fewer
        prices_only = [p for _, p in daily_avg]
        if len(prices_only) < LOOK_BACK:
            # Pad by repeating the earliest known price
            padding = [prices_only[0]] * (LOOK_BACK - len(prices_only))
            prices_only = padding + prices_only

        last_prices = prices_only[-LOOK_BACK:]

        # Normalize, reshape, predict
        price_array = np.array(last_prices).reshape(-1, 1)
        scaled = scaler.transform(price_array)
        X_input = scaled.reshape(1, LOOK_BACK, 1)

        pred_scaled = model.predict(X_input, verbose=0)
        pred_prices = scaler.inverse_transform(
            pred_scaled.reshape(-1, 1)
        ).flatten()

        # Trim to requested days
        pred_prices = pred_prices[:days]

        # Build forecast response
        today = date.today()
        forecasted = []
        for i, price in enumerate(pred_prices):
            forecast_date = today + timedelta(days=i + 1)
            price_val = round(float(price), 2)
            margin = round(price_val * (mape / 100.0), 2)
            forecasted.append({
                "date": forecast_date.isoformat(),
                "price": price_val,
                "lower": round(price_val - margin, 2),
                "upper": round(price_val + margin, 2),
            })

        return {
            "commodity": commodity,
            "forecasted_prices": forecasted,
            "mape": mape,
            "model_trained_at": meta.get("trained_at"),
            "rows_used": meta.get("rows_used"),
            "has_synthetic_data": meta.get("has_synthetic", False),
            "disclaimer": "Forecast based on historical patterns only. Not financial advice.",
        }

    # ------------------------------------------------------------------
    # XGBoost Default Risk Prediction
    # ------------------------------------------------------------------

    def _load_xgb(self):
        """Lazy-load XGBoost model and feature names."""
        if self._xgb_model is not None:
            return self._xgb_model, self._xgb_features

        model_path = MODELS_DIR / "default_risk_xgb.pkl"
        features_path = MODELS_DIR / "default_risk_features.json"

        if not model_path.exists():
            logger.info("No XGBoost default risk model found at %s", model_path)
            return None, None

        import joblib
        self._xgb_model = joblib.load(str(model_path))

        if features_path.exists():
            with open(features_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
                self._xgb_features = meta.get("feature_names", [])
        else:
            self._xgb_features = [
                "payment_history_score", "corridor_reliability",
                "contract_value", "month", "is_harvest_season",
                "days_to_delivery", "counterparty_total_trades",
            ]

        logger.info("Loaded XGBoost default risk model")
        return self._xgb_model, self._xgb_features

    async def predict_default_risk(self, counterparty_features: dict) -> Optional[dict]:
        """
        Predict delivery default risk for a counterparty using XGBoost.
        Returns structured risk assessment.
        """
        model, feature_names = self._load_xgb()
        if model is None:
            return None

        # Build feature vector in correct order
        feature_vector = []
        for fname in feature_names:
            val = counterparty_features.get(fname, 0)
            feature_vector.append(float(val))

        X = np.array([feature_vector])

        # Predict probability
        proba = model.predict_proba(X)[0]
        risk_prob = float(proba[1]) if len(proba) > 1 else float(proba[0])

        # Classify risk level
        if risk_prob < 0.3:
            risk_level = "low"
            risk_message = "Low default risk. This counterparty has a strong reliability profile."
        elif risk_prob < 0.6:
            risk_level = "medium"
            risk_message = "Moderate default risk. Monitor delivery timelines and maintain buffer stock."
        else:
            risk_level = "high"
            risk_message = "High default risk. Consider requiring advance payment or reducing order size."

        # Extract top risk factors from feature importances
        importances = model.feature_importances_
        factor_pairs = sorted(
            zip(feature_names, importances),
            key=lambda x: -x[1],
        )
        top_factors = [
            f"{name} (importance: {imp:.3f})"
            for name, imp in factor_pairs[:3]
        ]

        return {
            "risk_probability": round(risk_prob, 4),
            "risk_level": risk_level,
            "risk_message": risk_message,
            "top_risk_factors": top_factors,
            "features_used": counterparty_features,
        }
