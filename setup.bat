@echo off
setlocal enabledelayedexpansion

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║         TeleDrive Setup (Windows)        ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ─── Check Python ───
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Python is not installed or not in PATH.
    echo  Download it from https://www.python.org/downloads/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PYVER=%%i
echo  [OK] Found %PYVER%

:: ─── Check Node.js ───
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo  Download it from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version 2^>^&1') do set NODEVER=%%i
echo  [OK] Found Node.js %NODEVER%

:: ─── Backend setup ───
echo.
echo  --- Setting up backend ---

cd teledrive-backend

if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo  [OK] Created .env from .env.example
        echo.
        echo  ┌──────────────────────────────────────────┐
        echo  │  IMPORTANT: Edit teledrive-backend\.env  │
        echo  │  and add your Telegram API credentials.  │
        echo  │                                          │
        echo  │  Get them at: https://my.telegram.org    │
        echo  └──────────────────────────────────────────┘
        echo.
    ) else (
        echo  [WARN] No .env.example found. Create .env manually.
    )
) else (
    echo  [OK] .env already exists
)

if not exist .venv (
    echo  [..] Creating Python virtual environment...
    python -m venv .venv
    echo  [OK] Virtual environment created
) else (
    echo  [OK] Virtual environment already exists
)

echo  [..] Installing Python dependencies...
.venv\Scripts\pip install -r requirements.txt --quiet
echo  [OK] Python dependencies installed

cd ..

:: ─── Frontend setup ───
echo.
echo  --- Setting up frontend ---

cd teledrive

echo  [..] Installing Node.js dependencies...
call npm install --silent 2>nul
echo  [OK] Node.js dependencies installed

cd ..

:: ─── Done ───
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║           Setup complete!                ║
echo  ╠══════════════════════════════════════════╣
echo  ║                                          ║
echo  ║  1. Edit teledrive-backend\.env with     ║
echo  ║     your Telegram API_ID and API_HASH    ║
echo  ║                                          ║
echo  ║  2. Start the app:                       ║
echo  ║     cd teledrive ^&^& npm run dev          ║
echo  ║                                          ║
echo  ║  3. Open http://localhost:3000            ║
echo  ║                                          ║
echo  ╚══════════════════════════════════════════╝
echo.
pause
