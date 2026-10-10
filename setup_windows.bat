@echo off
setlocal
cd /d "%~dp0"
title Circuit Doctor - Setup

echo ============================================
echo Circuit Doctor - Windows setup
echo ============================================
where py >nul 2>nul
if errorlevel 1 (
  echo ERROR: Python launcher 'py' was not found.
  echo Install Python 3.11+ from https://www.python.org/downloads/windows/
  echo IMPORTANT: select "Add Python to PATH" during installation.
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js was not found.
  echo Install Node.js LTS from https://nodejs.org/
  pause
  exit /b 1
)

echo [1/4] Creating Python virtual environment...
if not exist "backend\.venv\Scripts\python.exe" py -3 -m venv backend\.venv
if errorlevel 1 goto fail

echo [2/4] Installing backend dependencies...
"backend\.venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 goto fail
"backend\.venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
if errorlevel 1 goto fail

echo [3/4] Installing frontend dependencies...
pushd frontend
call npm install
if errorlevel 1 (
  popd
  goto fail
)
popd

echo [4/4] Checking optional local tools...
where ollama >nul 2>nul
if errorlevel 1 (echo Ollama not detected - deterministic prompt fallback remains available.) else (echo Ollama detected.)
where ngspice >nul 2>nul
if errorlevel 1 (echo ngspice not detected - analytical fallback will be clearly labelled.) else (echo ngspice detected.)
echo.
echo Setup complete. Double-click start_windows.bat to launch Circuit Doctor.
pause
exit /b 0

:fail
echo.
echo SETUP FAILED. Read the error above, fix the issue, then run setup_windows.bat again.
pause
exit /b 1
