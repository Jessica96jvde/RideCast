"""
RideCast - FastAPI Main Application Server
===========================================
This is the primary backend entry point for the RideCast platform.
It configures the FastAPI web application, enables CORS (Cross-Origin Resource Sharing),
registers all REST API routers, and warms up the machine learning model on startup.

How it works:
1. Initializes the FastAPI instance with metadata (title, docs url, version).
2. Sets up CORS middleware to allow requests from the Next.js React frontend (localhost:3000).
3. Connects all modular sub-routers:
   - /api/metadata  -> Stop list, routes, timetables, and map geometry.
   - /api/predict   -> ML passenger crowd & demand forecasting.
   - /api/authority -> Transport authority fleet management & bus allocation.
   - /api/auth      -> Authority login and token verification.
   - /api/feedback  -> Commuter accuracy feedback.
4. On startup, initializes SQLite database tables and pre-loads the LSTM model into RAM.
"""

import os
import sys
from pathlib import Path

# Ensure the root project directory is in the Python module search path (sys.path)
# This allows imports like `from backend.config import ...` to work cleanly.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import application routers and database initialization
from backend.routers import auth, metadata, predict, authority, feedback
from backend.db.database import init_db

# Create FastAPI application instance
app = FastAPI(
    title="RideCast API",
    description="AI-Driven Bus Crowd Forecasting & Smart Fleet Allocation Engine",
    version="2.0.0",
    docs_url="/docs",      # Interactive Swagger UI documentation at http://127.0.0.1:8000/docs
    redoc_url="/redoc"    # Alternative ReDoc documentation at http://127.0.0.1:8000/redoc
)

# ------------------------------------------------------------------------------
# CORS (Cross-Origin Resource Sharing) Middleware Configuration
# ------------------------------------------------------------------------------
# Web browsers block requests between different ports (e.g. Next.js on 3000 -> FastAPI on 8000)
# for security unless the server explicitly permits it.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "*"  # Allow all origins for local development flexibility
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allow GET, POST, PUT, DELETE, OPTIONS
    allow_headers=["*"],  # Allow Content-Type, Authorization, etc.
)

# ------------------------------------------------------------------------------
# Register Modular API Routers
# ------------------------------------------------------------------------------
app.include_router(metadata.router)   # Endpoints for stops, routes, timetable, map data
app.include_router(predict.router)    # Endpoints for single/batch ML crowd predictions
app.include_router(authority.router)  # Endpoints for authority overview, allocations, PDF export
app.include_router(auth.router)       # Endpoints for officer login & session checks
app.include_router(feedback.router)   # Endpoints for passenger feedback collection

# ------------------------------------------------------------------------------
# Application Lifecycle: Startup & Warmup
# ------------------------------------------------------------------------------
@app.on_event("startup")
def startup_event():
    """
    Runs once when the server starts up.
    Initializes SQLite tables and loads the heavy LSTM neural network and
    Scikit-learn scalers into memory in advance so that the first API request is fast.
    """
    # 1. Initialize SQLite Database schemas and seed initial records if empty
    init_db()
    
    # 2. Warm up TensorFlow model and pickle artifacts in memory cache
    try:
        from backend.services.model_service import get_model, get_artifacts
        get_model()
        get_artifacts()
        print("[RideCast] LSTM Model & Preprocessing Artifacts warmed up successfully.")
    except Exception as e:
        print(f"[RideCast Warning] Model warmup issue: {e}")

# ------------------------------------------------------------------------------
# Health & Root Endpoints
# ------------------------------------------------------------------------------
@app.get("/")
def root():
    """Root status endpoint returning API metadata and links to documentation."""
    return {
        "app": "RideCast API",
        "status": "online",
        "version": "2.0.0",
        "docs": "/docs"
    }

@app.get("/api/health")
def health():
    """Simple health check endpoint used by the frontend to verify backend availability."""
    return {"status": "healthy"}

# ------------------------------------------------------------------------------
# Server Entry Point for Direct Python Execution
# ------------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    # Start the Uvicorn ASGI server on port 8000 with auto-reloading enabled
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True, app_dir=str(PROJECT_ROOT))
