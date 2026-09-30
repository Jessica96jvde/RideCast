"""
RideCast - Main Entry Point
===========================
This is the root launcher for the RideCast application.
Running `python main.py` or `python run.py` from the root directory starts
the FastAPI backend server on port 8000 with auto-reload enabled.

To start the Next.js frontend:
  cd frontend
  npm run dev
"""

import sys
import os
from pathlib import Path

# Ensure UTF-8 output encoding on Windows terminals if possible
if sys.platform == "win32":
    os.environ["PYTHONIOENCODING"] = "utf-8"

# Set up project root in Python module search path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

def print_banner():
    print("=" * 70)
    print("  [RideCast] AI Bus Crowd Forecasting & Fleet Allocation Engine")
    print("=" * 70)
    print("  * Frontend Web App:    http://localhost:3000")
    print("  * Backend REST API:    http://127.0.0.1:8000")
    print("  * Swagger API Docs:    http://127.0.0.1:8000/docs")
    print("  * Authority Login:     admin / admin123")
    print("=" * 70)
    print("  Starting FastAPI backend server with auto-reload...\n")

if __name__ == "__main__":
    import uvicorn
    print_banner()
    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        app_dir=str(PROJECT_ROOT)
    )
