#!/bin/bash
# iMessage Scheduler — one-command setup and launch

set -e

echo "================================================"
echo "  iMessage Scheduler — Setup & Launch"
echo "================================================"
echo ""

# Check prerequisites
echo "[1/4] Checking prerequisites..."

if ! command -v node &> /dev/null; then
  echo "❌ Node.js is required (v20+). Install from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js v20+ required (found v$(node -v))"
  exit 1
fi
echo "   ✓ Node.js $(node -v)"

if ! command -v pnpm &> /dev/null; then
  echo "   → Installing pnpm..."
  npm install -g pnpm
fi
echo "   ✓ pnpm $(pnpm -v)"

# Check macOS
if [[ "$(uname)" != "Darwin" ]]; then
  echo "⚠️  Warning: iMessage gateway requires macOS with Messages.app"
fi

echo ""
echo "[2/4] Installing dependencies..."
pnpm install

echo ""
echo "[3/4] Setting up environment..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "   ✓ Created .env from .env.example"
else
  echo "   ✓ .env already exists"
fi

echo ""
echo "[4/4] Starting all services..."
echo ""
echo "  Frontend  →  http://localhost:5173"
echo "  Backend   →  http://localhost:3001"
echo "  Gateway   →  http://localhost:3002"
echo ""
echo "================================================"
echo ""

# Open browser after a short delay
(sleep 3 && open http://localhost:5173 2>/dev/null || true) &

# Start all services
pnpm dev
