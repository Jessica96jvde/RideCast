"""
RideCast - Application Runner
=============================
Alias for main.py. Running `python run.py` starts the RideCast backend server.
"""

import sys
import os
from pathlib import Path

# Ensure UTF-8 output encoding on Windows terminals if possible
if sys.platform == "win32":
    os.environ["PYTHONIOENCODING"] = "utf-8"

PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from main import print_banner

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
