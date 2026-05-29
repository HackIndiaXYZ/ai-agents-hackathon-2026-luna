"""
TradeNexus API — FastAPI application entry point.

Registers all routers, configures CORS, and provides health checks.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import market, dispatch, opportunity, compliance, feedback


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle manager."""
    # --- Startup ---
    print("[TradeNexus] API starting up...")
    yield
    # --- Shutdown ---
    print("[TradeNexus] API shutting down...")


app = FastAPI(
    title="TradeNexus API",
    description="Multilingual commodity trader intelligence platform for Indian markets.",
    version="1.0.0",
    lifespan=lifespan,
)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://tradenexus.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(market.router, prefix="/api/v1/market", tags=["Market"])
app.include_router(dispatch.router, prefix="/api/v1/dispatch", tags=["Dispatch"])
app.include_router(opportunity.router, prefix="/api/v1/opportunity", tags=["Opportunity"])
app.include_router(compliance.router, prefix="/api/v1/compliance", tags=["Compliance"])
app.include_router(feedback.router, prefix="/api/v1/feedback", tags=["Feedback"])


# --- Health Check ---
@app.get("/health", tags=["Health"])
async def health_check():
    """Returns service health status."""
    return {"status": "ok", "version": "1.0.0"}
