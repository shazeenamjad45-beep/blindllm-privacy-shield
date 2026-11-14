@echo off
echo ========================================================
echo Running BlindLLM Cryptographic & Pipeline Test Suite...
echo ========================================================
set PYTHONPATH=.
.venv\Scripts\pytest -v backend/tests/
pause
