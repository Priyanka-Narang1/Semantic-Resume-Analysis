# Smart Resume Analyzer

AI-powered resume analysis with skill gap detection and explainable feedback.
Built for B.Tech AI/ML final year project - GGSIPU Delhi.

---

## What it does

- Parses resume (PDF, DOCX, or pasted text) and extracts skills, experience, education, projects
- Compares against a job description or target role template
- Classifies each missing skill as: Hard Gap / Transferable / Preferred Gap
- Scores each resume section with evidence-grounded feedback
- Generates a prioritized learning roadmap with free course links
- React frontend with score gauge, gap cards, roadmap timeline, skills chart

## Research Novelty

1. Evidence-grounded feedback - ties score explanations to specific resume sentences
2. Transferable skill detection - finds skills you already have that bridge a gap (e.g. TensorFlow bridges to PyTorch)
3. Gap severity scoring - ranks gaps by role criticality, not just presence/absence
4. Section-level XAI rubrics - explains WHY each section scored the way it did

---

## Project Structure

```
resume_analyzer/
|-- backend/
|   |-- parser/
|   |   |-- resume_parser.py       # PDF/DOCX/TXT text extraction + section splitting
|   |   |-- skill_extractor.py     # Skill matching + normalization against ontology
|   |-- gap_engine/
|   |   |-- gap_detector.py        # Gap classification + severity scoring
|   |-- xai/
|   |   |-- feedback_generator.py  # Section scoring + evidence-grounded explanations
|   |-- recommender/
|   |   |-- recommender.py         # Learning roadmap + resource links
|   |-- analyzer.py                # Orchestrator: runs the full pipeline
|   |-- api/
|       |-- main.py                # FastAPI app + endpoints
|
|-- frontend/
|   |-- src/
|       |-- pages/
|       |   |-- UploadPage.jsx     # Resume + JD input
|       |   |-- Dashboard.jsx      # Results with 4 tabs
|       |-- components/
|           |-- ScoreGauge.jsx     # Circular score display
|           |-- GapCard.jsx        # Per-gap detail with evidence
|           |-- RoadmapTimeline.jsx# Learning plan timeline
|           |-- SectionScoreCard.jsx
|           |-- SkillsChart.jsx    # Recharts bar chart
|
|-- data/
|   |-- ontology/
|       |-- skills_ontology.json   # Skill taxonomy, transferability map, role templates
|
|-- tests/
|   |-- test_pipeline.py           # End-to-end backend test
```

---

## Quick Start

### Prerequisites
- Python 3.10 or 3.11
- Node.js 18+
- VS Code (recommended)

### Step 1 - Backend setup

Windows:
```
setup.bat
```

Mac/Linux:
```
bash setup.sh
```

Or manually:
```
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
python tests/test_pipeline.py
```

### Step 2 - Run the backend

```
# Make sure venv is active
uvicorn backend.api.main:app --reload --port 8000
```

You should see: "Uvicorn running on http://127.0.0.1:8000"

API docs available at: http://localhost:8000/docs

### Step 3 - Run the frontend (separate terminal)

```
cd frontend
npm install
npm start
```

Frontend runs at: http://localhost:3000

The frontend proxies API calls to port 8000 automatically (configured in package.json).

---

## API Endpoints

### POST /analyze/text
Analyze resume from pasted text.

```json
{
  "resume_text": "... your resume text ...",
  "jd_text": "... job description ...",
  "target_role": "data scientist"
}
```

### POST /analyze/file
Multipart form upload of PDF, DOCX, or TXT file.

Fields: file, jd_text (optional), target_role (optional)

### GET /roles
Returns list of supported role names.

### GET /docs
Interactive Swagger API documentation.

---

## Test the backend alone

```
python tests/test_pipeline.py
```

Expected output: All tests pass, final score printed, processing time ~0.1s

---

## Supported Roles (built-in templates)

- data scientist
- software engineer
- frontend developer
- backend developer
- ml engineer
- devops engineer
- full stack developer
- data analyst
- android developer
- ios developer

---

## Extending the project

### Add a new role
Edit data/ontology/skills_ontology.json, add entry under "role_skill_map":

```json
"cloud architect": {
  "required": ["aws", "terraform", "kubernetes", "networking"],
  "preferred": ["azure", "gcp", "ci/cd"],
  "soft": ["communication", "leadership"]
}
```

### Add a new skill
Add it to the relevant category in skills_ontology.json under "categories".

### Add transferability
Add to "transferable_skills" map:
```json
"new_framework": ["existing_skill_1", "existing_skill_2"]
```

---

## Tech Stack

- Backend: Python 3.11, FastAPI, spaCy, scikit-learn, PyMuPDF, pdfplumber
- Frontend: React 18, Recharts, Axios
- No external APIs required - runs fully offline

---

## For the Research Paper

### Dataset
Use from Kaggle:
- Resume Dataset (2400 resumes, 24 categories) by laxmimerit
- Resume Entities for NER by dataturks
- Job Description Dataset by PromptCloudHQ

Download to data/raw/ and use notebooks/ for EDA and experiments.

### Metrics to report
- Skill extraction precision/recall vs manually labeled test set
- Section scoring correlation vs human evaluator ratings
- User study: did explainable feedback improve resume action rate? (survey 20+ peers)
- Comparison: keyword baseline vs this system on match accuracy

### Key claims to support
1. Transferable skill detection reduces perceived gap count by X% vs simple matching
2. Evidence-grounded feedback is rated X% more actionable than generic advice (user survey)
3. Severity ranking helps users prioritize learning vs unranked gap lists
