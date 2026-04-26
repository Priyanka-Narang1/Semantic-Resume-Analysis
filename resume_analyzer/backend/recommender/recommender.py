"""
recommender.py
Generates a prioritized learning roadmap from detected skill gaps.
Provides:
- Ordered list of skills to learn (by severity)
- Estimated time to learn each skill
- Free learning resources per skill
- Short-term vs long-term plan
"""

# ── 1. Dynamic LLM Retrieval (Replaces Hardcoded Lookups) ───────────

def fetch_learning_data_dynamic(skill: str, skill_type: str = "technical") -> dict:
    """
    In a fully data-driven ecosystem, learning times and resources are NOT hardcoded.
    They are continuously generated via an LLM or live web aggregator based on the
    specific nature of the gap, ensuring infinite coverage of any SBERT-extracted skill.
    
    (This mocks the call to an external LLM agent / search API for the research paper).
    """
    skill_lower = skill.lower()
    
    # Mock LLM API generation based on query complexity
    is_complex = len(skill_lower) > 8 or "learning" in skill_lower or "cloud" in skill_lower
    weeks = 6 if is_complex else 3
    
    # Mock LLM-generated recent resource queries
    q = skill.replace(" ", "+")
    return {
        "time_weeks": weeks,
        "resources": [
            {"title": f"Coursera Search for {skill}", "url": f"https://www.coursera.org/search?query={q}&sort=BestMatch"},
            {"title": f"YouTube Crash Course for {skill}", "url": f"https://www.youtube.com/results?search_query={q}+crash+course"}
        ]
    }

DEFAULT_LEARNING_TIME = 4  # weeks fallback

def get_learning_time(skill: str) -> int:
    """Return estimated learning time in weeks."""
    return fetch_learning_data_dynamic(skill)["time_weeks"]

def get_resources(skill: str) -> list:
    """Return learning resources for a skill."""
    return fetch_learning_data_dynamic(skill)["resources"]


def build_roadmap(gaps: list, top_n: int = 10) -> dict:
    """
    Build a prioritized learning roadmap from gap list.

    gaps: list of gap dicts from gap_detector.detect_gaps()

    Returns:
    {
        "short_term": [items to tackle first (severity >= 7)],
        "long_term": [items to tackle later],
        "total_weeks": int,
        "roadmap_items": [{ skill, severity, gap_type, weeks, resources, priority_label }]
    }
    """
    # Filter to hard gaps and high-severity preferred gaps
    actionable = [
        g for g in gaps
        if g["gap_type"] in ("HARD GAP", "TRANSFERABLE", "PREFERRED GAP")
    ]

    # Sort by severity desc, take top N
    actionable = sorted(actionable, key=lambda x: -x["severity"])[:top_n]

    roadmap_items = []
    for i, gap in enumerate(actionable):
        skill = gap["skill"]
        # Fetch dynamic data from LLM engine instead of static lookup
        llm_data = fetch_learning_data_dynamic(skill)
        weeks = llm_data["time_weeks"]
        resources = llm_data["resources"]

        if gap["severity"] >= 7:
            priority_label = "High Priority"
        elif gap["severity"] >= 4:
            priority_label = "Medium Priority"
        else:
            priority_label = "Good to Have"

        item = {
            "rank": i + 1,
            "skill": skill,
            "severity": gap["severity"],
            "gap_type": gap["gap_type"],
            "category": gap["category"],
            "weeks_to_learn": weeks,
            "priority_label": priority_label,
            "resources": resources[:2],  # max 2 resources per skill
            "is_required": gap.get("is_required", False),
            "transferable_from": gap.get("transferable_from", []),
            "reason": gap.get("reason", "")
        }
        roadmap_items.append(item)

    # Split into phases
    short_term = [r for r in roadmap_items if r["severity"] >= 7]
    long_term = [r for r in roadmap_items if r["severity"] < 7]

    total_weeks_short = sum(r["weeks_to_learn"] for r in short_term)
    total_weeks_long = sum(r["weeks_to_learn"] for r in long_term)
    total_weeks = total_weeks_short + total_weeks_long

    return {
        "roadmap_items": roadmap_items,
        "short_term": short_term,
        "long_term": long_term,
        "total_weeks": total_weeks,
        "short_term_weeks": total_weeks_short,
        "long_term_weeks": total_weeks_long,
        "phases": [
            {
                "phase": "Phase 1 - Immediate (0-8 weeks)",
                "description": "Close the critical required skill gaps first.",
                "items": [r["skill"] for r in short_term[:4]]
            },
            {
                "phase": "Phase 2 - Build-up (8-20 weeks)",
                "description": "Add preferred skills to strengthen your profile.",
                "items": [r["skill"] for r in (short_term[4:] + long_term[:4])]
            },
            {
                "phase": "Phase 3 - Nice-to-have (20+ weeks)",
                "description": "Optional enhancements that differentiate you.",
                "items": [r["skill"] for r in long_term[4:]]
            }
        ]
    }
