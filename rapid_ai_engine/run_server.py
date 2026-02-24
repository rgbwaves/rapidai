"""
RAPID AI Engine — Run Server
Usage:  python run_server.py
Then open http://localhost:8000/docs in your browser.
"""
import sys
import os

# Ensure the parent folder (rapidai/) is on the Python path
# so 'rapid_ai_engine' package can be found regardless of where
# you run this script from.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(SCRIPT_DIR)
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)

import uvicorn

if __name__ == "__main__":
    print("\n  RAPID AI Engine v1.0.0")
    print("  Swagger UI -> http://localhost:8000/docs")
    print("  Health     -> http://localhost:8000/health\n")
    uvicorn.run(
        "rapid_ai_engine.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
