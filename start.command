#!/bin/bash
# Aura Shop — double-click this file to launch
cd "$(dirname "$0")/frontend"
echo "✨ Starting Aura Shop at http://localhost:3000"
open "http://localhost:3000"
python3 -m http.server 3000
