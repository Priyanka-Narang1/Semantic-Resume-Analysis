"""
feedback_generator.py
Section scoring with JD-fit-aware criteria.
Now includes SHAP feature attribution for the score breakdown.

Scoring philosophy (updated):
  - Every section is scored out of 10.
  - The PRIMARY driver for each section is JD alignment/coverage — not just
    formatting quality.  A beautifully formatted skills section that misses
    most JD-required skills should score low.
  - Experience penalises internship-only depth when the JD implies 3+ years.
  - Secondary drivers (structure, verbs, links) still matter but carry less weight.
"""

import re

try:
    import spacy
    NLP = spacy.load("en_core_web_sm", disable=["parser", "textcat"])
except ImportError:
    NLP = None

import json
from pathlib import Path
ROOT = Path(__file__).parent.parent.parent
MODELS_DIR = ROOT / "models"

try:
    with open(MODELS_DIR / "scorer" / "section_scorer_models.json") as f:
        SCORER_MODELS = json.load(f)
        ROLE_WEIGHTS = SCORER_MODELS.get("role_section_weights", {})
        SECTION_MODELS = SCORER_MODELS.get("section_models", {})
except (FileNotFoundError, json.JSONDecodeError):
    ROLE_WEIGHTS = {}
    SECTION_MODELS = {}

# Use ML models for scoring weight fallbacks instead of hardcoding
SECTION_RUBRICS = {
    sec: {"weight": ROLE_WEIGHTS.get("default", {}).get(sec, 0.2)}
    for sec in ["skills", "experience", "education", "projects", "summary"]
}

# Seniority signals used by the experience scorer
_FRESHER_RE = [
    re.compile(rf"\b{w}\b", re.IGNORECASE) for w in
    ["intern", "internship", "trainee", "fresher", "entry[- ]level"]
]
_SENIOR_RE = [
    re.compile(rf"\b{w}\b", re.IGNORECASE) for w in
    ["senior", "lead", "principal", "architect", "head of", "manager",
     "director", "vp", "staff", "years of experience", "yoe"]
]
_YEARS_RE = re.compile(r"(\d+)\+?\s*years?", re.IGNORECASE)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _jd_coverage(section_text: str, jd_skills: list):
    """
    Return (matched_count, total_jd_skills, matched_list).
    Checks which JD skills appear verbatim in section_text (case-insensitive).
    """
    text_lower = section_text.lower()
    matched = [s for s in jd_skills if s.lower() in text_lower]
    return len(matched), len(jd_skills), matched


# ── Main scorer ──────────────────────────────────────────────────────────────

def score_section(section_name, section_text, resume_skills, jd_skills):
    """
    Score a resume section out of 10.

    Parameters
    ----------
    section_name  : str   – one of skills/experience/education/projects/summary
    section_text  : str   – raw text of that section
    resume_skills : list  – skills extracted from the full resume
    jd_skills     : list  – all skills extracted from the job description
    """
    if not section_text or not section_text.strip():
        return {
            "score": 0, "max_score": 10, "percentage": 0,
            "criteria_met": [], "criteria_missed": [],
            "feedback": f"No {section_name} section detected. Consider adding one."
        }

    text_lower = section_text.lower()
    met, missed = [], []
    earned = 0
    total = 10   # all sections normalised to 10

    # ─────────────────────────────────────────────────────────────────────────
    # SKILLS
    #   7 pts  — JD coverage (proportional to % of JD skills listed)
    #   2 pts  — breadth of own resume skills
    #   1 pt   — organised into categories
    # ─────────────────────────────────────────────────────────────────────────
    if section_name == "skills":
        # JD coverage (7 pts)
        jd_matched, jd_total, jd_found = _jd_coverage(section_text, jd_skills)
        coverage_ratio = jd_matched / jd_total if jd_total else 0
        cov_pts = round(coverage_ratio * 7)
        earned += cov_pts

        if coverage_ratio >= 0.6:
            met.append(f"Good JD coverage: {jd_matched}/{jd_total} required skills listed")
        elif coverage_ratio >= 0.3:
            met.append(
                f"Partial JD coverage: {jd_matched}/{jd_total} skills listed — add the missing ones"
            )
        else:
            missing_preview = ", ".join(
                s for s in jd_skills if s.lower() not in text_lower
            )[:140]
            missed.append(
                f"Low JD coverage: only {jd_matched}/{jd_total} required skills are listed. "
                f"Add: {missing_preview}"
            )

        # Breadth (2 pts)
        own_in_section = [s for s in resume_skills if s.lower() in text_lower]
        if len(own_in_section) >= 8:
            earned += 2
            met.append(f"Strong breadth: {len(own_in_section)} distinct skills listed")
        elif len(own_in_section) >= 4:
            earned += 1
            met.append(f"Moderate breadth: {len(own_in_section)} skills listed")
        else:
            missed.append("List more specific tools, languages, and frameworks")

        # Organisation (1 pt)
        if "\n" in section_text and len(section_text.split("\n")) >= 3:
            earned += 1
            met.append("Skills organised in categories")
        else:
            missed.append("Organise skills into clear categories (Programming, ML/AI, Tools…)")

    # ─────────────────────────────────────────────────────────────────────────
    # EXPERIENCE
    #   4 pts  — seniority / experience depth vs JD expectations
    #   3 pts  — JD keyword relevance (proportional)
    #   2 pts  — quantified achievements
    #   1 pt   — action verbs
    # ─────────────────────────────────────────────────────────────────────────
    elif section_name == "experience":
        # Seniority / depth (4 pts)
        is_fresher = any(r.search(text_lower) for r in _FRESHER_RE)
        is_senior  = any(r.search(text_lower) for r in _SENIOR_RE)
        years_list = _YEARS_RE.findall(text_lower)
        max_years  = max((int(y) for y in years_list), default=0)

        if is_senior or max_years >= 3:
            earned += 4
            met.append("Demonstrates sufficient professional experience depth (3+ years or senior role)")
        elif max_years >= 1 and not is_fresher:
            earned += 2
            met.append("Shows some professional experience — aim for 2+ years full-time")
            missed.append(
                "Role may require 3+ years; highlight project scope and measurable impact to compensate"
            )
        else:
            # Only internship / no years found
            earned += 1
            missed.append(
                "Only internship/entry-level experience detected. "
                "The role likely requires 3+ years of full-time work. "
                "Compensate by quantifying every outcome and showing breadth across multiple projects."
            )

        # JD keyword relevance (3 pts)
        jd_matched, jd_total, jd_found = _jd_coverage(section_text, jd_skills)
        relevance_ratio = jd_matched / jd_total if jd_total else 0
        rel_pts = round(relevance_ratio * 3)
        earned += rel_pts

        if relevance_ratio >= 0.4:
            met.append(
                f"Mentions {jd_matched} role-relevant JD skills in experience bullets"
                f" ({', '.join(jd_found[:4])})"
            )
        else:
            missed.append(
                f"Only {jd_matched}/{jd_total} JD skills appear in your experience — "
                "weave in keywords (e.g. Python, ML, Docker, SQL) naturally into your bullets"
            )

        # Quantified achievements (2 pts)
        has_num = False
        if NLP:
            doc = NLP(text_lower)
            has_num = any(ent.label_ in ["CARDINAL", "PERCENT", "MONEY"] for ent in doc.ents)
        else:
            has_num = any(re.search(r"\d+", text_lower))

        if has_num:
            earned += 2
            met.append("Contains quantified achievements (detected via NER metrics)")
        else:
            missed.append(
                "Add numbers to every bullet: 'improved accuracy by 20%', 'served 1 000+ daily requests'"
            )

        # Action verbs (1 pt)
        actions = []
        if NLP:
            doc = NLP(section_text)
            actions = [token.text.lower() for token in doc if token.pos_ == "VERB" and token.tag_ in ["VBD", "VBN"]]
        
        if len(actions) >= 3:
            earned += 1
            met.append(f"Uses strong action verbs ({', '.join(list(set(actions))[:3])}…)")
        else:
            missed.append(
                "Start each bullet with a strong action verb (built, optimised, deployed, reduced…)"
            )

    # ─────────────────────────────────────────────────────────────────────────
    # EDUCATION
    #   4 pts  — degree clearly stated
    #   2 pts  — CGPA / grade
    #   2 pts  — relevant coursework
    #   2 pts  — JD-aligned field / courses
    # ─────────────────────────────────────────────────────────────────────────
    elif section_name == "education":
        # Degree (4 pts)
        deg_kw = ["b.tech", "btech", "b.e", "m.tech", "bachelor", "master",
                  "mba", "phd", "b.sc", "m.sc"]
        if any(k in text_lower for k in deg_kw):
            earned += 4
            met.append("Degree information clearly stated")
        else:
            missed.append("State your degree name and institution clearly")

        # Grade (2 pts)
        gpa_pats = [
            r"\d+\.\d+\s*(cgpa|gpa)",
            r"cgpa\s*[:\s]\s*\d+",
            r"\d+\s*/\s*10"
        ]
        if any(re.search(p, text_lower) for p in gpa_pats):
            earned += 2
            met.append("Academic grade (CGPA/GPA) included")
        else:
            missed.append("Include CGPA if above 7.5/10")

        # Relevant coursework (2 pts)
        cw_kw = [
            "machine learning", "data structures", "algorithms", "database",
            "networks", "nlp", "deep learning", "statistics", "probability"
        ]
        matched_cw = [k for k in cw_kw if k in text_lower]
        if len(matched_cw) >= 2:
            earned += 2
            met.append(f"Relevant coursework listed ({', '.join(matched_cw[:3])})")
        elif matched_cw:
            earned += 1
            met.append("Some relevant coursework listed — add more")
        else:
            missed.append("List courses relevant to the target role (ML, Statistics, Databases…)")

        # JD-aligned field (2 pts)
        jd_matched, jd_total, _ = _jd_coverage(section_text, jd_skills)
        if jd_matched >= 2:
            earned += 2
            met.append("Degree field / coursework aligns with JD technical areas")
        elif jd_matched >= 1:
            earned += 1
            met.append("Partial alignment with JD requirements")
        else:
            missed.append(
                "Highlight how your degree or coursework relates to the role's technical demands"
            )

    # ─────────────────────────────────────────────────────────────────────────
    # PROJECTS
    #   5 pts  — JD-relevant technologies (proportional)
    #   3 pts  — measurable outcomes
    #   2 pts  — GitHub / demo links
    # ─────────────────────────────────────────────────────────────────────────
    elif section_name == "projects":
        # JD tech usage (5 pts)
        jd_matched, jd_total, jd_found = _jd_coverage(section_text, jd_skills)
        proj_ratio = jd_matched / jd_total if jd_total else 0
        proj_pts   = round(proj_ratio * 5)
        earned    += proj_pts

        if proj_ratio >= 0.5:
            met.append(
                f"Projects demonstrate {jd_matched}/{jd_total} JD-required technologies"
                f" ({', '.join(jd_found[:4])})"
            )
        elif proj_ratio >= 0.2:
            met.append(
                f"Some JD relevance ({jd_matched}/{jd_total} techs) — "
                "extend or rebuild projects to cover more JD skills"
            )
        else:
            missing_list = [s for s in jd_skills if s.lower() not in text_lower]
            missed.append(
                f"Projects use minimal JD tech ({jd_matched}/{jd_total}). "
                f"Consider adding: {', '.join(missing_list[:5])}"
            )

        # Measurable outcomes (3 pts)
        has_num = False
        if NLP:
            doc = NLP(text_lower)
            has_num = any(ent.label_ in ["CARDINAL", "PERCENT", "MONEY"] for ent in doc.ents)
        else:
            has_num = any(re.search(r"\d+", text_lower))
            
        if has_num:
            earned += 3
            met.append("Project outcomes described with measurable results")
        else:
            missed.append(
                "Add results to every project: accuracy achieved, users served, latency improved"
            )

        # Links (2 pts)
        has_links = any(k in text_lower for k in ["github", "http", "demo", "live", "link"])
        if has_links:
            earned += 2
            met.append("GitHub or demo links included — recruiter-verifiable")
        else:
            missed.append("Add GitHub links to all projects — recruiters actively check these")

    # ─────────────────────────────────────────────────────────────────────────
    # SUMMARY
    #   4 pts  — content depth / word count
    #   4 pts  — JD keyword alignment (proportional)
    #   2 pts  — conciseness
    # ─────────────────────────────────────────────────────────────────────────
    elif section_name == "summary":
        # Content depth (4 pts)
        word_count = len(section_text.split())
        if word_count >= 40:
            earned += 4
            met.append("Summary provides substantive context")
        elif word_count >= 20:
            earned += 2
            met.append("Summary present but brief — expand to 3–5 sentences")
        else:
            missed.append(
                "Expand summary: who you are, what you build, what role you are targeting"
            )

        # JD keyword alignment (4 pts)
        jd_matched, jd_total, _ = _jd_coverage(section_text, jd_skills)
        sum_ratio = jd_matched / jd_total if jd_total else 0
        sum_pts   = round(sum_ratio * 4)
        earned   += sum_pts
        if sum_ratio >= 0.3:
            met.append(f"Summary references {jd_matched} JD-relevant terms")
        else:
            missed.append(
                "Mirror key JD terms in your summary so ATS parsers score it immediately"
            )

        # Conciseness (2 pts)
        if len(section_text.split("\n")) <= 6:
            earned += 2
            met.append("Concise and scannable")
        else:
            missed.append("Keep summary to 6 lines or fewer so recruiters read it in full")

    # ── Normalise & build feedback ────────────────────────────────────────────
    if SECTION_MODELS and section_name in SECTION_MODELS:
        model = SECTION_MODELS[section_name]
        try:
            feats = []
            if section_name == "skills":
                feats = [locals().get('jd_matched', 0)/max(1, locals().get('jd_total', 1)), locals().get('own_in_section', []), 1]
            elif section_name == "experience":
                feats = [int(locals().get('is_senior', 0)), locals().get('jd_matched', 0)/max(1, locals().get('jd_total', 1)), int(locals().get('has_num', 0)), len(locals().get('actions', []))]
            elif section_name == "education":
                feats = [1, 1, len(locals().get('matched_cw', [])), 1]
            elif section_name == "projects":
                feats = [locals().get('jd_matched', 0)/max(1, locals().get('jd_total', 1)), int(locals().get('has_num', 0)), int(locals().get('has_link', 0))]
            elif section_name == "summary":
                feats = [len(section_text.split()), locals().get('jd_matched', 0)/max(1, locals().get('jd_total', 1)), 1]
            
            # Apply learned LogisticRegression weights
            val = model["intercept"]
            for f_val, c, m, s in zip(feats, model["coef"], model["mean"], model["scale"]):
                val += ((float(f_val) - m) / (s if s != 0 else 1)) * c
                
            # Maps quality probability proxy back to 0-10 scale
            ml_score = max(0.0, min(10.0, (val + 1) * 5))
            earned = (ml_score / 10.0) * total
        except Exception:
            pass # Fallback to heuristic

    earned  = min(earned, total)
    pct     = round(earned / total * 100, 1) if total > 0 else 0
    score   = round(earned / total * 10,  1) if total > 0 else 0
    quality = (
        "strong"     if pct >= 80 else
        "solid"      if pct >= 60 else
        "needs work" if pct >= 40 else
        "weak"
    )

    parts = [f"Your {section_name} section is {quality} ({round(pct)}% criteria met)."]
    if met:    parts.append("Working well: " + "; ".join(met) + ".")
    if missed: parts.append("Improve: " + "; ".join(missed) + ".")

    return {
        "score":          score,
        "max_score":      10,
        "percentage":     pct,
        "criteria_met":   met,
        "criteria_missed": missed,
        "feedback":       " ".join(parts),
    }


# ── Score breakdown (unchanged logic) ────────────────────────────────────────

def generate_score_breakdown(match_score, section_scores, gap_summary, resume_skills, jd_skills,
                              role_prediction=None):
    """Generate score breakdown, now including SHAP-grounded explanation."""
    hard_gaps = gap_summary.get("hard_gap_count", 0)
    matched   = gap_summary.get("match_count", 0)
    total_jd  = gap_summary.get("total_jd_skills", 1)

    sec_avg = wt = 0.0
    for sec_name, sec_data in section_scores.items():
        w = SECTION_RUBRICS.get(sec_name, {}).get("weight", 0.05)
        sec_avg += sec_data["percentage"] * w
        wt += w
    if wt > 0:
        sec_avg /= wt

    final = round(match_score * 0.6 + sec_avg * 0.4, 1)
    final = max(5.0, min(99.0, final))

    if final >= 80:   ats_label, ats_color = "Strong Match",   "green"
    elif final >= 60: ats_label, ats_color = "Moderate Match", "blue"
    elif final >= 40: ats_label, ats_color = "Weak Match",     "orange"
    else:             ats_label, ats_color = "Poor Match",     "red"

    evidence = [
        f"Skill match: {matched} of {total_jd} required skills found in your resume (60% of total score).",
    ]
    if hard_gaps > 0:
        evidence.append(
            f"Hard gaps: {hard_gaps} required skills are completely absent, each reducing your score."
        )
    if gap_summary.get("transferable_count", 0) > 0:
        evidence.append(
            f"Transferable skills: {gap_summary['transferable_count']} gaps can be bridged "
            "using knowledge you already have."
        )

    method = gap_summary.get("extraction_method", "keyword")
    if "sbert" in method:
        evidence.append(
            "Matching method: Sentence-BERT semantic similarity (threshold=0.75) "
            "— catches synonyms and paraphrases."
        )
    evidence.append(
        f"Resume quality: {round(sec_avg)}% quality score across all sections (40% of total score)."
    )

    # SHAP explanation
    shap_evidence = None
    if role_prediction and role_prediction.get("shap_features"):
        top_shap = role_prediction["shap_features"][:5]
        shap_evidence = {
            "predicted_role": role_prediction.get("predicted_role"),
            "confidence":     role_prediction.get("confidence"),
            "explanation": (
                f"XGBoost + SHAP analysis: your resume most closely matches "
                f"'{role_prediction.get('predicted_role')}' "
                f"(confidence: {role_prediction.get('confidence', 0) * 100:.0f}%). "
                f"Top contributing terms: {', '.join(f['feature'] for f in top_shap[:3])}."
            ),
            "top_features": top_shap,
        }

    transferable = gap_summary.get("transferable_count", 0)
    if final >= 80:
        interp = "Your resume is a strong match. Focus on polishing language and quantifying achievements."
    elif final >= 60:
        interp = (
            f"You meet core requirements but have {hard_gaps} critical gap(s). "
            "Close hard gaps through targeted projects or certifications."
        )
    elif final >= 40:
        interp = (
            f"Foundational skills are there but significant gaps remain. "
            f"Start with your {transferable} transferable gap(s) as fastest to close."
        )
    else:
        interp = (
            "This role requires skills largely absent from your current profile. "
            "Use the learning roadmap to build systematically."
        )

    return {
        "final_score":           final,
        "match_score":           match_score,
        "section_quality_score": round(sec_avg, 1),
        "ats_label":             ats_label,
        "ats_color":             ats_color,
        "evidence":              evidence,
        "interpretation":        interp,
        "shap_evidence":         shap_evidence,
    }


# ── Evidence / rewrite helpers (unchanged) ────────────────────────────────────

def find_evidence_for_skill(skill, resume_text):
    sentences = re.split(r"[.\n;]", resume_text)
    skill_lower = skill.lower()
    best = ""
    for s in sentences:
        s = s.strip()
        if skill_lower in s.lower() and len(s) > 15:
            if re.search(r"\d", s) and not best:
                best = s[:220]
            elif not best:
                best = s[:220]
    return best


def suggest_rewrite(skill, section, resume_text):
    """Fallback — gap_detector.build_contextual_rewrite is preferred."""
    ev = find_evidence_for_skill(skill, resume_text)
    if ev:
        return (
            f"Found in resume: '{ev[:100]}...'\n"
            f"Make {skill} more prominent: explicitly name it and add a metric."
        )
    return (
        f"{skill} is not mentioned. Extend an existing project to use {skill}, "
        f"then add a bullet: 'Implemented [feature] using {skill} — [outcome]'."
    )
