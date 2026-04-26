@echo off
echo === Smart Resume Analyzer Setup ===
echo.

echo [1/4] Creating Python virtual environment...
python -m venv venv
call venv\Scripts\activate

echo [2/4] Installing Python dependencies...
pip install -r requirements.txt

echo [3/4] Downloading spaCy English model...
python -m spacy download en_core_web_sm

echo [4/4] Running tests...
python tests/test_pipeline.py

echo.
echo === Setup Complete ===
echo.
echo To start the backend:
echo   call venv\Scripts\activate
echo   uvicorn backend.api.main:app --reload --port 8000
echo.
echo To start the frontend (in a separate terminal):
echo   cd frontend
echo   npm install
echo   npm start
echo.
pause
