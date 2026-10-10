@echo off
setlocal
cd /d "%~dp0"
title Circuit Doctor Launcher
if not exist "backend\.venv\Scripts\python.exe" (
  echo Run setup_windows.bat first.
  pause
  exit /b 1
)
if not exist "frontend\node_modules" (
  echo Frontend dependencies are missing. Run setup_windows.bat first.
  pause
  exit /b 1
)
echo Starting Circuit Doctor backend and frontend...
start "Circuit Doctor API" cmd /k "cd /d ""%~dp0backend"" && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
timeout /t 2 /nobreak >nul
start "Circuit Doctor Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:5173"
echo.
echo Frontend: http://127.0.0.1:5173
echo API docs: http://127.0.0.1:8000/docs
echo Close the two terminal windows to stop the app.
