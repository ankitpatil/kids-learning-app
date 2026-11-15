#!/bin/bash
# Double-click to run Little Learners locally and open it in Chrome.
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -1)/bin:$PATH"
if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js is not installed. Get it from https://nodejs.org (LTS), then double-click this file again."
  read -n 1 -p "Press any key to close..."; exit 1
fi
echo "Node $(node -v) found."
if [ ! -d node_modules ]; then echo "Installing (first time only, ~1 minute)..."; npm install || { read -n 1 -p "Install failed. Press any key..."; exit 1; }; fi
( sleep 4; open -a "Google Chrome" http://localhost:5173 2>/dev/null || open http://localhost:5173 ) &
echo "Starting Little Learners at http://localhost:5173  (close this window or press Ctrl+C to stop)"
npm run dev -- --port 5173 --strictPort
