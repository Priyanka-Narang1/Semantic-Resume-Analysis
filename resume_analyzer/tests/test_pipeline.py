"""
test_pipeline.py
Quick end-to-end test of the full analysis pipeline.
Run from project root: python tests/test_pipeline.py
Tests with a sample resume and job description.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.parser.skill_extractor import (
    extract_skills_from_text,
    extract_skills_from_jd,
    get_role_skills,
    get_all_roles
)
from backend.gap_engine.gap_detector import detect_gaps
from backend.xai.feedback_generator import score_section, generate_score_breakdown, find_evidence_for_skill
from backend.recommender.recommender import build_roadmap
from backend.analyzer import analyze

# ─────────────────────────────────────────
# Sample data
# ─────────────────────────────────────────
SAMPLE_RESUME = """
Priya Sharma
priya.sharma@email.com | github.com/priyasharma | linkedin.com/in/priyasharma

SUMMARY
Final year B.Tech AI/ML student with strong foundation in Python and machine learning.
Passionate about building data-driven solutions.

SKILLS
Programming: Python, JavaScript, C++
ML/AI: Machine Learning, Scikit-learn, Pandas, NumPy, TensorFlow
Databases: MySQL, MongoDB
Tools: Git, GitHub, VS Code, Jupyter
Web: HTML, CSS, Flask

EXPERIENCE
Machine Learning Intern - DataCorp Solutions (June 2023 - Aug 2023)
- Built a customer churn prediction model achieving 87% accuracy using Random Forest
- Cleaned and preprocessed datasets of 50000+ records using Pandas
- Deployed the model as a REST API using Flask, serving 200+ daily requests
- Collaborated with a 4-member team to deliver the project 2 weeks ahead of schedule

PROJECTS
Smart Traffic Management System
- Developed a computer vision system using Python and OpenCV to detect vehicle density
- Reduced average wait time by 35% in simulation experiments
- Tech stack: Python, OpenCV, scikit-learn, Flask

Sentiment Analysis Tool
- Built an NLP pipeline to classify tweets as positive/negative/neutral
- Achieved 82% accuracy using fine-tuned BERT model
- GitHub: github.com/priyasharma/sentiment-tool

EDUCATION
B.Tech in Artificial Intelligence and Machine Learning
Guru Gobind Singh Indraprastha University, Delhi - 2021 to 2025
CGPA: 8.4/10
Relevant Coursework: Machine Learning, Data Structures, Database Management, NLP

CERTIFICATIONS
- Deep Learning Specialization - Coursera (2023)
- Python for Data Science - NPTEL (2022)
"""

SAMPLE_JD = """
Data Scientist - TechStartup India

We are looking for a Data Scientist to join our growing team.

Required Skills:
- Python (3+ years)
- Machine Learning and Deep Learning
- TensorFlow or PyTorch
- SQL and database management
- Docker for deployment
- Git version control
- Statistics and probability

Preferred Skills:
- Experience with AWS or GCP
- Knowledge of Spark or Kafka
- MLOps practices
- Kubernetes
- Communication and presentation skills

You will work on building recommendation systems, NLP pipelines, and deploying
ML models at scale. Experience with data pipelines is a strong plus.
"""

TARGET_ROLE = "data scientist"


# ─────────────────────────────────────────
# Run tests
# ─────────────────────────────────────────

def test_skill_extraction():
    print("\n=== TEST: Skill Extraction ===")
    result = extract_skills_from_text(SAMPLE_RESUME)
    print(f"Skills found: {result['total_count']}")
    print(f"Skills: {result['skills']}")
    assert len(result['skills']) > 5, "Should find at least 5 skills"
    print("PASS")


def test_jd_parsing():
    print("\n=== TEST: JD Parsing ===")
    result = extract_skills_from_jd(SAMPLE_JD)
    print(f"JD total skills: {result['total_count']}")
    print(f"Required: {result['required']}")
    print(f"Preferred: {result['preferred']}")
    assert len(result['all_skills']) > 3, "Should find skills in JD"
    print("PASS")


def test_role_skills():
    print("\n=== TEST: Role Skills ===")
    roles = get_all_roles()
    print(f"Supported roles: {roles}")
    skills = get_role_skills(TARGET_ROLE)
    print(f"Data scientist required: {skills['required']}")
    assert len(skills['required']) > 0
    print("PASS")


def test_gap_detection():
    print("\n=== TEST: Gap Detection ===")
    resume_skills = extract_skills_from_text(SAMPLE_RESUME)['skills']
    jd_data = extract_skills_from_jd(SAMPLE_JD)
    gaps = detect_gaps(resume_skills, jd_data, TARGET_ROLE)
    print(f"Overall score: {gaps['overall_score']}")
    print(f"Matched skills: {len(gaps['matched_skills'])}")
    print(f"Gaps found: {len(gaps['gaps'])}")
    print(f"Hard gaps: {gaps['summary']['hard_gap_count']}")
    print(f"Transferable: {gaps['summary']['transferable_count']}")
    if gaps['gaps']:
        print(f"Top gap: {gaps['gaps'][0]['skill']} - {gaps['gaps'][0]['gap_type']} (severity {gaps['gaps'][0]['severity']})")
    assert gaps['overall_score'] >= 0
    print("PASS")


def test_section_scoring():
    print("\n=== TEST: Section Scoring ===")
    resume_skills = extract_skills_from_text(SAMPLE_RESUME)['skills']
    jd_skills = extract_skills_from_jd(SAMPLE_JD)['all_skills']
    from backend.parser.resume_parser import parse_resume_from_text
    parsed = parse_resume_from_text(SAMPLE_RESUME)
    for sec_name, sec_text in parsed['sections'].items():
        if sec_name in ('skills', 'experience', 'education', 'projects'):
            score = score_section(sec_name, sec_text, resume_skills, jd_skills)
            print(f"  {sec_name}: {score['score']}/10 ({score['percentage']}%)")
    print("PASS")


def test_roadmap():
    print("\n=== TEST: Roadmap ===")
    resume_skills = extract_skills_from_text(SAMPLE_RESUME)['skills']
    jd_data = extract_skills_from_jd(SAMPLE_JD)
    gaps = detect_gaps(resume_skills, jd_data, TARGET_ROLE)
    roadmap = build_roadmap(gaps['gaps'])
    print(f"Roadmap items: {len(roadmap['roadmap_items'])}")
    print(f"Total learning time: {roadmap['total_weeks']} weeks")
    if roadmap['roadmap_items']:
        top = roadmap['roadmap_items'][0]
        print(f"Top priority: {top['skill']} ({top['weeks_to_learn']} weeks)")
    print("PASS")


def test_full_pipeline():
    print("\n=== TEST: Full Pipeline ===")
    result = analyze(
        resume_text=SAMPLE_RESUME,
        jd_text=SAMPLE_JD,
        target_role=TARGET_ROLE
    )
    print(f"Final score: {result['score_breakdown']['final_score']}")
    print(f"ATS Label: {result['score_breakdown']['ats_label']}")
    print(f"Processing time: {result['processing_time_seconds']}s")
    print(f"Gaps: {len(result['gap_analysis']['gaps'])}")
    print(f"Roadmap items: {len(result['roadmap']['roadmap_items'])}")
    assert result['error'] is None
    print("PASS")
    return result


if __name__ == "__main__":
    print("Running Smart Resume Analyzer tests...\n")
    try:
        test_skill_extraction()
        test_jd_parsing()
        test_role_skills()
        test_gap_detection()
        test_section_scoring()
        test_roadmap()
        result = test_full_pipeline()

        print("\n" + "="*50)
        print("ALL TESTS PASSED")
        print("="*50)
        print(f"\nFull analysis result keys: {list(result.keys())}")

    except AssertionError as e:
        print(f"\nTEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        import traceback
        print(f"\nERROR: {e}")
        traceback.print_exc()
        sys.exit(1)
