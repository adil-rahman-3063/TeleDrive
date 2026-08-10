#!/usr/bin/env bash
set -e

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║       TeleDrive Setup (Mac / Linux)      ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# ─── Check Python ───
if ! command -v python3 &>/dev/null; then
    echo "  [ERROR] Python 3 is not installed."
    echo "  Install it: https://www.python.org/downloads/"
    exit 1
fi
PYVER=$(python3 --version 2>&1)
echo "  [OK] Found $PYVER"

# ─── Check Node.js ───
if ! command -v node &>/dev/null; then
    echo "  [ERROR] Node.js is not installed."
    echo "  Install it: https://nodejs.org/"
    exit 1
fi
NODEVER=$(node --version 2>&1)
echo "  [OK] Found Node.js $NODEVER"

# ─── Backend setup ───
echo ""
echo "  --- Setting up backend ---"

cd teledrive-backend

if [ ! -f .env ]; then
    echo "  ┌──────────────────────────────────────────┐"
    echo "  │  Telegram API Credentials Setup          │"
    echo "  │  Get them at: https://my.telegram.org    │"
    echo "  └──────────────────────────────────────────┘"
    echo ""
    read -p "  Enter your API_ID: " API_ID
    read -p "  Enter your API_HASH: " API_HASH
    
    echo "API_ID=$API_ID" > .env
    echo "API_HASH=$API_HASH" >> .env
    echo "  [OK] Credentials saved to .env"
else
    echo "  [OK] .env already exists"
fi

if [ ! -d .venv ]; then
    echo "  [..] Creating Python virtual environment..."
    python3 -m venv .venv
    echo "  [OK] Virtual environment created"
else
    echo "  [OK] Virtual environment already exists"
fi

echo "  [..] Installing Python dependencies..."
.venv/bin/pip install -r requirements.txt --quiet
echo "  [OK] Python dependencies installed"

cd ..

# ─── Frontend setup ───
echo ""
echo "  --- Setting up frontend ---"

cd teledrive

echo "  [..] Installing Node.js dependencies..."
npm install --silent 2>/dev/null
echo "  [OK] Node.js dependencies installed"

cd ..

# ─── Done ───
echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║           Setup complete!                ║"
echo "  ╠══════════════════════════════════════════╣"
echo "  ║  You can now use start.sh to launch!     ║"
echo "  ║                                          ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""
read -p "Do you want to launch TeleDrive now? (Y/n): " LAUNCH
if [[ "$LAUNCH" == "Y" || "$LAUNCH" == "y" || -z "$LAUNCH" ]]; then
    chmod +x start.sh
    ./start.sh
fi
