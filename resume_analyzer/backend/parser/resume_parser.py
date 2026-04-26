"""
resume_parser.py
Parses resume files (PDF, DOCX, TXT) and extracts:
- Raw text
- Sections (education, experience, skills, projects)
- Contact info
- Raw skill mentions
"""

import re
import json
import os
from pathlib import Path

# PDF parsing
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False

try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False

# DOCX parsing
try:
    from docx import Document
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False


# ─────────────────────────────────────────
# Section header patterns
# ─────────────────────────────────────────
SECTION_PATTERNS = {
    "skills": [
        r"skills?", r"technical skills?", r"core competencies",
        r"technologies", r"tech stack", r"expertise",
        r"technical expertise", r"key skills?"
    ],
    "experience": [
        r"experience", r"work experience", r"employment",
        r"professional experience", r"work history", r"internship",
        r"internships?", r"industry experience", r"work"
    ],
    "education": [
        r"education", r"academic background", r"qualifications",
        r"academics", r"degrees?", r"academic credentials"
    ],
    "projects": [
        r"projects?", r"personal projects?", r"academic projects?",
        r"key projects?", r"notable projects?", r"project work",
        r"selected projects?", r"portfolio", r"open source"
    ],
    "certifications": [
        r"certifications?", r"certificates?", r"courses?",
        r"training", r"achievements?", r"awards?",
        r"achievements & profiles?", r"profiles?", r"honors?"
    ],
    "summary": [
        r"summary", r"objective", r"profile", r"about me",
        r"career objective", r"professional summary",
        r"about", r"overview", r"introduction"
    ]
}


def extract_text_from_pdf(file_path: str) -> str:
    """Extract raw text from a PDF file."""
    text = ""

    if PYMUPDF_AVAILABLE:
        try:
            doc = fitz.open(file_path)
            for page in doc:
                text += page.get_text()
            doc.close()
            if text.strip():
                return text
        except Exception as e:
            print(f"PyMuPDF failed: {e}")

    if PDFPLUMBER_AVAILABLE:
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            print(f"pdfplumber failed: {e}")

    return text


def extract_text_from_docx(file_path: str) -> str:
    """Extract raw text from a DOCX file."""
    if not DOCX_AVAILABLE:
        raise ImportError("python-docx not installed")
    doc = Document(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def extract_text_from_txt(file_path: str) -> str:
    """Read plain text file."""
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def extract_text(file_path: str) -> str:
    """Route to correct extractor based on file extension."""
    ext = Path(file_path).suffix.lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext == ".docx":
        return extract_text_from_docx(file_path)
    elif ext == ".txt":
        return extract_text_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


# ─────────────────────────────────────────
# Section splitter
# ─────────────────────────────────────────
def detect_section_header(line: str) -> str | None:
    """Return section name if line looks like a section header, else None."""
    line_clean = line.strip().lower()
    # Must be short (not a full sentence)
    if len(line_clean) > 60:
        return None
    for section, patterns in SECTION_PATTERNS.items():
        for pat in patterns:
            if re.fullmatch(pat, line_clean) or re.match(r"^" + pat + r"\s*[:\-]?\s*$", line_clean):
                return section
    return None


def split_into_sections(text: str) -> dict:
    """Split resume text into labeled sections."""
    lines = text.split("\n")
    sections = {s: [] for s in SECTION_PATTERNS}
    sections["other"] = []
    current_section = "other"

    for line in lines:
        detected = detect_section_header(line)
        if detected:
            current_section = detected
        else:
            if line.strip():
                sections[current_section].append(line.strip())

    # Collapse each section to a string
    return {k: "\n".join(v) for k, v in sections.items() if v}


# ─────────────────────────────────────────
# Contact info extraction
# ─────────────────────────────────────────
def extract_contact_info(text: str) -> dict:
    """Extract email, phone, LinkedIn, GitHub from text."""
    contact = {}

    # Email
    email_match = re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", text)
    if email_match:
        contact["email"] = email_match.group()

    # Phone (Indian and international formats)
    phone_match = re.search(r"(\+91[\s\-]?)?[6-9]\d{9}|(\+\d{1,3}[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}", text)
    if phone_match:
        contact["phone"] = phone_match.group().strip()

    # LinkedIn
    linkedin_match = re.search(r"linkedin\.com/in/[\w\-]+", text, re.IGNORECASE)
    if linkedin_match:
        contact["linkedin"] = linkedin_match.group()

    # GitHub
    github_match = re.search(r"github\.com/[\w\-]+", text, re.IGNORECASE)
    if github_match:
        contact["github"] = github_match.group()

    return contact


# ─────────────────────────────────────────
# Main parse function
# ─────────────────────────────────────────
def parse_resume(file_path: str) -> dict:
    """
    Full resume parse pipeline.
    Returns a dict with: raw_text, sections, contact, word_count.
    """
    raw_text = extract_text(file_path)

    if not raw_text.strip():
        raise ValueError("Could not extract text from the resume file.")

    sections = split_into_sections(raw_text)
    contact = extract_contact_info(raw_text)

    return {
        "raw_text": raw_text,
        "sections": sections,
        "contact": contact,
        "word_count": len(raw_text.split()),
        "char_count": len(raw_text),
        "file_name": Path(file_path).name
    }


def parse_resume_from_text(text: str, file_name: str = "resume.txt") -> dict:
    """Parse from raw text string (for API where text is already extracted)."""
    if not text.strip():
        raise ValueError("Empty resume text provided.")

    sections = split_into_sections(text)
    contact = extract_contact_info(text)

    return {
        "raw_text": text,
        "sections": sections,
        "contact": contact,
        "word_count": len(text.split()),
        "char_count": len(text),
        "file_name": file_name
    }
