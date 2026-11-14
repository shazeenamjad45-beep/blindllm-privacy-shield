@echo off
echo ========================================================
echo Starting BlindLLM FastAPI Cryptographic Backend...
echo ========================================================
set PYTHONPATH=.
.venv\Scripts\python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
