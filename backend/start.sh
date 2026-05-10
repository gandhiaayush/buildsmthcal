#!/bin/bash
# Start the No-Show Predictor backend engine
# Usage: cd backend && ./start.sh

cd "$(dirname "$0")"
pip3 install -q -r requirements.txt
echo "Starting backend on http://localhost:8000"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
