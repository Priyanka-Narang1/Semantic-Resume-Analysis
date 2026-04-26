#!/bin/bash
echo "=== Smart Resume Analyzer Setup ==="
echo

echo "[1/4] Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

echo "[2/4] Installing Python dependencies..."
pip install -r requirements.txt

echo "[3/4] Downloading spaCy English model..."
python -m spacy download en_core_web_sm

echo "[4/4] Running tests..."
python tests/test_pipeline.py

echo
echo "=== Setup Complete ==="
echo
echo "To start the backend:"
echo "  source venv/bin/activate"
echo "  uvicorn backend.api.main:app --reload --port 8000"
echo
echo "To start the frontend (in a separate terminal):"
echo "  cd frontend && npm install && npm start"
echo
