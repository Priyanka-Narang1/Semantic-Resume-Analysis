"""
main.py
FastAPI application entry point.
Run with: uvicorn backend.api.main:app --reload --port 8000
"""

import os
import uuid
import shutil
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from backend.analyzer import analyze, get_supported_roles

# ─────────────────────────────────────────
# App setup
# ─────────────────────────────────────────
app = FastAPI(
    title="Smart Resume Analyzer API",
    description="AI-powered resume analysis with skill gap detection and explainable feedback",
    version="1.0.0"
)

# Allow frontend to call this API (Updated for production/Vercel)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins, including localhost and your Vercel deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temp upload folder
UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ─────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────
class TextAnalysisRequest(BaseModel):
    resume_text: str
    jd_text: Optional[str] = None
    target_role: Optional[str] = None


class AnalysisResponse(BaseModel):
    success: bool
    data: dict
    message: str = ""


# ─────────────────────────────────────────
# Routes
# ─────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Smart Resume Analyzer API", "status": "running", "version": "1.0.0"}


@app.get("/roles")
def list_roles():
    """Return all supported target roles."""
    roles = get_supported_roles()
    return {"roles": roles}


@app.post("/analyze/text")
def analyze_from_text(request: TextAnalysisRequest):
    """
    Analyze resume from raw text input.
    Body: { resume_text, jd_text (optional), target_role (optional) }
    """
    if not request.resume_text or len(request.resume_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Resume text is too short or empty.")

    try:
        result = analyze(
            resume_text=request.resume_text,
            jd_text=request.jd_text,
            target_role=request.target_role
        )
        return {"success": True, "data": result, "message": "Analysis complete"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/file")
async def analyze_from_file(
    file: UploadFile = File(...),
    jd_text: str = Form(default=""),
    target_role: str = Form(default="")
):
    """
    Analyze resume from uploaded file (PDF, DOCX, TXT).
    Multipart form: file + optional jd_text + optional target_role
    """
    allowed_types = {".pdf", ".docx", ".txt"}
    ext = Path(file.filename).suffix.lower()

    if ext not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}. Use PDF, DOCX, or TXT.")

    # Save temp file
    temp_path = UPLOAD_DIR / f"{uuid.uuid4()}{ext}"
    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        result = analyze(
            resume_file_path=str(temp_path),
            jd_text=jd_text if jd_text.strip() else None,
            target_role=target_role if target_role.strip() else None,
            file_name=file.filename
        )
        return {"success": True, "data": result, "message": "Analysis complete"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Always clean up temp file
        if temp_path.exists():
            temp_path.unlink()


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/parse/file")
async def parse_file_text(file: UploadFile = File(...)):
    """Extract raw text from uploaded PDF/DOCX/TXT for preview before analysis."""
    allowed_types = {".pdf", ".docx", ".txt"}
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}.")

    temp_path = UPLOAD_DIR / f"{uuid.uuid4()}{ext}"
    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        from backend.parser.resume_parser import extract_text
        text = extract_text(str(temp_path))
        if not text or len(text.strip()) < 30:
            raise HTTPException(status_code=422, detail="Could not extract text. Try pasting the resume text instead.")
        return {"success": True, "text": text, "file_name": file.filename}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path.exists():
            temp_path.unlink()
