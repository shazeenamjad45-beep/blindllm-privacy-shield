@echo off
echo ========================================================
echo Launching BlindLLM Privacy-Preserving AI System...
echo Theme: Cloud Gray & Cobalt Blue
echo Track: AI Pipeline Secret Sharing (Mathematics for Systems Security)
echo ========================================================

start "BlindLLM Backend (Port 8000)" cmd /k "run-backend.bat"
timeout /t 2 /nobreak >nul
start "BlindLLM Frontend (Port 5173)" cmd /k "run-frontend.bat"
timeout /t 3 /nobreak >nul

echo Opening browser at http://127.0.0.1:5173 ...
start http://127.0.0.1:5173

echo ========================================================
echo BlindLLM is running!
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://127.0.0.1:5173
echo ========================================================
