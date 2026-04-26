"""
backend/gap_engine/_advice.py
Dynamic Explainable AI (XAI) Context Generator.
Replaces static templates by parsing exact user resume bullets
and dynamically generating rewritten suggestions based on actual text.
"""

import re

def _extract_context(resume_text: str) -> dict:
    """Parses the raw resume text to extract Experience and Project bullets."""
    text = resume_text or ""
    project_lines = []
    exp_bullets = []
    
    in_proj, in_exp = False, False
    for line in text.split("\n"):
        l = line.strip()
        if re.match(r"^projects?", l, re.IGNORECASE):
            in_proj, in_exp = True, False
            continue
        if re.match(r"^experience", l, re.IGNORECASE):
            in_exp, in_proj = True, False
            continue
            
        if re.match(r"^(education|skills|certifications|summary)", l, re.IGNORECASE):
            in_proj, in_exp = False, False
            
        # Strip standard markdown, spaces, and common unicode bullet points (like •)
        cleaned_line = l.lstrip("- *•\t\u2022")
        
        if in_proj and len(cleaned_line) > 10:
            if not re.match(r"^(tech|technologies|tools|environment|skills):", cleaned_line, re.IGNORECASE):
                project_lines.append(cleaned_line)
        elif in_exp and l.startswith("-") and len(cleaned_line) > 15:
            exp_bullets.append(cleaned_line)

    bullets = exp_bullets + project_lines
    return {"all_bullets": bullets}

def _find_closest_bullet(bullets: list, target_skill: str) -> tuple:
    """Finds the bullet point most relevant to the missing skill. Returns (string, exact_match: bool)."""
    if not bullets:
        return "Built a cloud-based web application orchestrating multiple microservices", False
    
    target = target_skill.lower()
    for b in bullets:
        if target in b.lower():
            return b[:100] + ("..." if len(b) > 100 else ""), True
            
    # Fallback to pseudo-random but deterministic bullet using the hash of the skill name
    sorted_bullets = sorted(bullets, key=len, reverse=True)
    pool_size = max(1, len(sorted_bullets) // 2)
    pool = sorted_bullets[:pool_size]
    
    idx = sum(ord(c) for c in target) % len(pool)
    best = pool[idx]
    
    return best[:100] + ("..." if len(best) > 100 else ""), False

def build_contextual_reason(skill, gap_type, category, transferable_from, resume_text, role=""):
    """Generates a dynamic reason for why the gap exists based on the resume text."""
    skill_cap = skill.capitalize()
    
    if category == "soft_skills":
        return (f"Your resume does not provide explicit evidence for '{skill_cap}'. "
                f"Recruiters look for concrete examples of {skill} in action, rather than just "
                "seeing it listed in an isolated skills dump. We need to attach this skill mathematically to a project.")
                
    if gap_type == "TRANSFERABLE" and transferable_from:
        bridges = ", ".join(transferable_from)
        return (f"You do not have '{skill_cap}' explicitly listed, but your experience with '{bridges}' "
                f"transfers directly. Since you already know {bridges}, {skill} will only "
                f"take 1-2 weeks to bridge. You must make this explicit on your resume.")
                
    return (f"The role of {role or 'this position'} explicitly requires '{skill_cap}'. "
            f"Your current bullets do not demonstrate hands-on experience with this technology. "
            f"You need to build a targeted micro-project to fill this hard gap.")

def build_contextual_rewrite(skill, category, gap_type, transferable_from, resume_text, role=""):
    """Generates a contextual rewrite quote using the candidate's actual resume text."""
    ctx = _extract_context(resume_text)
    bullets = ctx.get("all_bullets", [])
    
    # Depending on gap type, grab a bridge skill or just pick the best bullet
    search_target = transferable_from[0] if (transferable_from and gap_type == "TRANSFERABLE") else skill
    best_bullet, is_exact = _find_closest_bullet(bullets, search_target)
    
    skill_cap = skill.capitalize()
    
    if category == "soft_skills":
        action = "Collaborated with cross-functional stakeholders to build" if "team" in skill.lower() or "communic" in skill.lower() else f"Applied {skill} methodology to optimize"
        return (f"Do not just list '{skill_cap}' in your skills section. "
                f"Take an existing bullet from your resume like this:\n\n"
                f"   [Original] '- {best_bullet}'\n\n"
                f"And rewrite it to explicitly prove the soft skill in action:\n\n"
                f"   [Rewritten] '- {action}: {best_bullet}'\n")

    if gap_type == "TRANSFERABLE" and transferable_from:
        bridge = transferable_from[0]
        if is_exact:
            return (f"Since you already have {bridge} experience, leverage it! "
                    f"Find the exact bullet where you used {bridge}:\n\n"
                    f"   [Original] '- {best_bullet}'\n\n"
                    f"And append a comparative or integration step to naturally insert the new skill:\n\n"
                    f"   [Rewritten] '- {best_bullet.rstrip('.')} — benchmarking architecture against {skill_cap} pipelines'\n")
        else:
            return (f"Your resume indicates {bridge} experience, but it is not actively applied in any of your Project or Experience bullets! "
                    f"Because {skill_cap} is a highly technical hard-skill, you cannot simply append it to an unrelated project like '{best_bullet}'.\n\n"
                    f"   [Action]: Build a brand new micro-project explicitly demonstrating both {bridge} and {skill_cap} together.\n")
                
    # Hard Gap
    return (f"Because this is a Hard Gap, you lack the base knowledge to fake a rewrite. "
            f"You must complete a weekend project specific to {skill_cap}, and then integrate it "
            f"into your most relevant project workflow:\n\n"
            f"   [Suggested Addition] '- Orchestrated {skill_cap} within the infrastructure of: {best_bullet}'\n")
