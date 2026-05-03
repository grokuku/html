#!/bin/bash
# Simple HTTP server for testing Wipeout Clone
# Usage: ./serve.sh [port]

PORT="${1:-8080}"

echo "🚀 WIPEOUT Clone - Starting server on port $PORT"
echo "   Open http://localhost:$PORT in your browser"
echo ""

cd "$(dirname "$0")"

# Try Python 3 first, then Python 2, then Node.js
if command -v python3 &> /dev/null; then
    python3 -m http.server "$PORT"
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer "$PORT"
elif command -v npx &> /dev/null; then
    npx http-server -p "$PORT" -c-1
else
    echo "Error: No HTTP server found. Install Python 3 or Node.js"
    exit 1
fi