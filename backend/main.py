import os
import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import auth, metadata, predict, authority, feedback
from backend.db.database import init_db

app = FastAPI(
    title="RideCast API",
    description="AI-Driven Bus Crowd Forecasting & Smart Fleet Allocation Engine",
    version="2.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(metadata.router)
app.include_router(predict.router)
app.include_router(authority.router)
app.include_router(auth.router)
app.include_router(feedback.router)


@app.on_event("startup")
def startup_event():
    init_db()
    # Warm up model & artifacts in background
    try:
        from backend.services.model_service import get_model, get_artifacts
        get_model()
        get_artifacts()
        print("RideCast LSTM Model & Preprocessing Artifacts loaded successfully.")
    except Exception as e:
        print(f"Warning during model warmup: {e}")


@app.get("/")
def root():
    return {
        "app": "RideCast API",
        "status": "online",
        "version": "2.0.0",
        "docs": "/docs"
    }


@app.get("/api/health")
def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True, app_dir=str(PROJECT_ROOT))
