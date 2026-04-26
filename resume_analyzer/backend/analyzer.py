"""
analyzer.py
Main analysis pipeline.
Orchestrates: parse -> extract skills -> detect gaps -> score sections -> generate feedback -> build roadmap
Single entry point for the API.
"""

import time
from pathlib import Path

from backend.parser.resume_parser import parse_resume, parse_resume_from_text
from backend.parser.skill_extractor import (
    extract_skills_from_text,
    extract_skills_from_jd,
    get_role_skills,
    get_all_roles
)
from backend.gap_engine.gap_detector import detect_gaps
from backend.xai.feedback_generator import (
    score_section,
    generate_score_breakdown,
    find_evidence_for_skill,
    suggest_rewrite
)
from backend.recommender.recommender import build_roadmap


def analyze(
    resume_text: str = None,
    resume_file_path: str = None,
    jd_text: str = None,
    target_role: str = None,
    file_name: str = "resume.txt"
) -> dict:
    """
    Full analysis pipeline.

    Provide either resume_text (string) or resume_file_path (path to file).
    Provide either jd_text (job description) or target_role (role name from ontology).
    Both jd_text and target_role can be provided together.

    Returns a complete analysis result dict.
    """
    start_time = time.time()

    # ── Step 1: Parse Resume ──────────────────────
    if resume_file_path:
        resume_data = parse_resume(resume_file_path)
    elif resume_text:
        resume_data = parse_resume_from_text(resume_text, file_name)
    else:
        raise ValueError("Provide either resume_text or resume_file_path")

    raw_text = resume_data["raw_text"]
    sections = resume_data["sections"]

    # ── Step 2: Extract Resume Skills ────────────
    resume_skill_data = extract_skills_from_text(raw_text)
    resume_skills = resume_skill_data["skills"]

    # ── Step 3: Extract JD Skills ────────────────
    jd_data = {}
    jd_skills_all = []

    if jd_text and jd_text.strip():
        jd_data = extract_skills_from_jd(jd_text)
        jd_skills_all = jd_data.get("all_skills", [])

    # Merge with role ontology if target_role provided
    if target_role and target_role.strip():
        role_skills = get_role_skills(target_role)
        # Merge: role ontology fills in what JD text might miss
        existing_req = set(jd_data.get("required", []))
        existing_pref = set(jd_data.get("preferred", []))
        merged_req = list(existing_req | set(role_skills.get("required", [])))
        merged_pref = list(existing_pref | set(role_skills.get("preferred", [])))
        merged_all = list(set(jd_skills_all) | set(merged_req) | set(merged_pref))

        jd_data = {
            "all_skills": merged_all,
            "required": merged_req,
            "preferred": merged_pref,
            "inferred": jd_data.get("inferred", role_skills.get("soft", [])),
            "skills_by_category": jd_data.get("skills_by_category", {}),
            "evidence": jd_data.get("evidence", []),
            "total_count": len(merged_all)
        }
        jd_skills_all = merged_all

    if not jd_skills_all:
        # No JD or role provided — return basic analysis only
        return {
            "error": None,
            "resume_info": resume_data,
            "resume_skills": resume_skill_data,
            "warning": "No job description or target role provided. Showing resume analysis only.",
            "processing_time_seconds": round(time.time() - start_time, 2)
        }

    # ── Step 4: Detect Gaps ───────────────────────
    gap_result = detect_gaps(resume_skills, jd_data, target_role or "", raw_text)

    # ── Step 5: Score Each Section ────────────────
    section_scores = {}
    for sec_name, sec_text in sections.items():
        if sec_name in ("skills", "experience", "education", "projects", "summary"):
            section_scores[sec_name] = score_section(
                sec_name,
                sec_text,
                resume_skills,
                jd_skills_all
            )

    # ── Step 6: Generate Score Breakdown ─────────
    score_breakdown = generate_score_breakdown(
        gap_result["overall_score"],
        section_scores,
        gap_result["summary"],
        resume_skills,
        jd_skills_all,
        role_prediction=gap_result.get("role_prediction")
    )

    # ── Step 7: Add evidence to top gaps (rewrite already in gap from detector) ──
    enriched_gaps = []
    for gap in gap_result["gaps"][:15]:
        skill = gap["skill"]
        evidence = find_evidence_for_skill(skill, raw_text)
        enriched_gap = {
            **gap,
            "resume_evidence": evidence,
            # rewrite_suggestion already set by gap_detector contextually
        }
        enriched_gaps.append(enriched_gap)

    # ── Step 8: Build Roadmap ─────────────────────
    roadmap = build_roadmap(gap_result["gaps"])

    processing_time = round(time.time() - start_time, 2)

    return {
        "error": None,
        # Resume info
        "resume_info": {
            "file_name": resume_data["file_name"],
            "word_count": resume_data["word_count"],
            "sections_found": list(sections.keys()),
            "contact": resume_data["contact"]
        },
        # Skills
        "resume_skills": resume_skill_data,
        "jd_skills": jd_data,
        # Gap analysis
        "gap_analysis": {
            **gap_result,
            "gaps": enriched_gaps  # overwrite with enriched version
        },
        # Scoring
        "section_scores": section_scores,
        "score_breakdown": score_breakdown,
        # Roadmap
        "roadmap": roadmap,
        # Meta
        "target_role": target_role or "Not specified",
        "processing_time_seconds": processing_time
    }


def get_supported_roles() -> list:
    """Return list of roles supported by the ontology."""
    return get_all_roles()
