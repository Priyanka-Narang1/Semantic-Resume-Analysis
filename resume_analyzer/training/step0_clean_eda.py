"""
training/step0_clean_eda.py
Data Cleaning & EDA Pipeline.

1. NER Dataset: Remove PII, deduplicate, filter overlapping/misaligned spans.
2. Classifier Dataset: Remove PII, drop < 50 words, normalize classes, compute stats.
3. Generates figures for the research paper.

HOW TO RUN:
    python training/step0_clean_eda.py
"""

import sys
import json
import re
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")  # Force non-interactive backend to avoid Tkinter crash
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

print("=" * 60)
print("Step 0: Data Cleaning & Exploratory Data Analysis")
print("=" * 60)

DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROC_DIR = DATA_DIR / "processed"
FIGURES_DIR = ROOT / "models" / "figures"

PROC_DIR.mkdir(parents=True, exist_ok=True)
FIGURES_DIR.mkdir(parents=True, exist_ok=True)

# ── PII Scrubbing ───────────────────────────────────────────────
def remove_pii(text: str) -> str:
    """Redact emails and phone numbers to ensure privacy."""
    text = str(text)
    # Redact email
    text = re.sub(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", "[EMAIL]", text)
    # Redact phone numbers
    text = re.sub(r"(\+91[\s\-]?)?[6-9]\d{9}|(\+\d{1,3}[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}", "[PHONE]", text)
    return text


# ── 1. Classifier Dataset Cleaning ──────────────────────────────
print("\n[1] Cleaning Classifier Dataset...")

_candidates = [
    RAW_DIR / "Resume.csv",
    RAW_DIR / "UpdatedResumeDataSet.csv",
    RAW_DIR / "resume_dataset.csv"
]
CSV_PATH = next((p for p in _candidates if p.exists()), None)

if CSV_PATH is None:
    print("[ERROR] Could not find Resume.csv in data/raw/")
else:
    df = pd.read_csv(CSV_PATH)
    initial_len = len(df)
    
    resume_col = next((c for c in ["Resume_str", "Resume", "resume"] if c in df.columns), None)
    cat_col = next((c for c in ["Category", "category"] if c in df.columns), df.columns[-1])
    
    # Drop NAs
    df = df.dropna(subset=[resume_col, cat_col]).copy()
    
    # Remove PII
    df["clean_text"] = df[resume_col].apply(remove_pii)
    
    # Drop under 50 words
    df["word_count"] = df["clean_text"].apply(lambda x: len(str(x).split()))
    df = df[df["word_count"] >= 50].copy()
    
    # Normalize category names
    df["Category"] = df[cat_col].str.title().str.strip()
    
    # Deduplicate exact text
    df = df.drop_duplicates(subset=["clean_text"])
    
    final_len = len(df)
    print(f"  -> Initial rows: {initial_len}")
    print(f"  -> Final rows: {final_len} (Dropped {initial_len - final_len})")
    
    # Save cleaned
    out_csv = PROC_DIR / "classifier_cleaned.csv"
    df.to_csv(out_csv, index=False)
    print(f"  -> Saved clean data to {out_csv.name}")
    
    # EDA: Plot Class Distribution
    plt.figure(figsize=(12, 8))
    sns.countplot(y="Category", hue="Category", data=df, order=df["Category"].value_counts().index, palette="viridis", legend=False)
    plt.title("Resume Category Distribution (Cleaned)")
    plt.xlabel("Count")
    plt.ylabel("Category")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "category_distribution.png", dpi=300)
    plt.close()
    print("  -> Saved figure: category_distribution.png")


# ── 2. NER Dataset Cleaning ─────────────────────────────────────
print("\n[2] Cleaning NER Dataset...")

NER_PATH = RAW_DIR / "Entity Recognition in Resumes.json"
if not NER_PATH.exists():
    print("[ERROR] Could not find Entity Recognition in Resumes.json")
else:
    raw_data = []
    with open(NER_PATH, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                try:
                    raw_data.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
                    
    initial_ner = len(raw_data)
    clean_ner_data = []
    
    LABEL_MAP = {
        "SKILLS": "SKILL", "SKILL": "SKILL",
        "COMPANIES WORKED AT": "ORG", "COMPANIES": "ORG",
        "DESIGNATION": "ROLE",
        "COLLEGE NAME": "EDU", "DEGREE": "EDU",
        "GRADUATION YEAR": "DATE", "YEARS OF EXPERIENCE": "EXP",
        "NAME": "PERSON", "EMAIL ADDRESS": "EMAIL", "LOCATION": "LOC"
    }

    total_ents = 0
    kept_ents = 0
    misaligned_ents = 0
    
    for record in raw_data:
        text = record.get("content", "").strip()
        annotation = record.get("annotation", [])
        if not text or not annotation:
            continue
            
        # PII Scrubbing offsets entities, which is complex to map back.
        # Since this is training data for NER, replacing exact bounds is destructive.
        # Strategy: we keep exact bounds but just validate the spans.
        
        entities = []
        if isinstance(annotation, list):
            for item in annotation:
                if not isinstance(item, dict):
                    continue
                label_list = item.get("label", [])
                label = label_list[0] if label_list else ""
                lbl = LABEL_MAP.get(label.upper().strip(), label.upper().strip())
                for pt in item.get("points", []):
                    s = pt.get("start", 0)
                    e = pt.get("end", 0) + 1  # Inclusive to exclusive
                    if 0 <= s < e <= len(text):
                        entities.append((s, e, lbl))
        elif isinstance(annotation, dict):
            for ent in annotation.get("entities", []):
                s, e, lbl = ent[0], ent[1], ent[2]
                lbl = LABEL_MAP.get(str(lbl).upper().strip(), str(lbl).upper().strip())
                if 0 <= s < e <= len(text):
                    entities.append((s, e, lbl))

        total_ents += len(entities)
        
        # Clean entities
        clean_ents = []
        seen_spans = set()
        
        for s, e, lbl in sorted(entities, key=lambda x: x[0]):
            span = text[s:e]
            
            # Metric 1: alignment
            if span != span.strip() or not span.strip():
                misaligned_ents += 1
                continue
                
            # Metric 2: overlaps
            overlap = any(not (e <= os or s >= oe) for os, oe, _ in seen_spans)
            if overlap:
                misaligned_ents += 1
                continue
                
            seen_spans.add((s, e, lbl))
            clean_ents.append((s, e, lbl))
            
        kept_ents += len(clean_ents)
        
        # Reject record if < 70% of entities are valid (too noisy)
        if len(entities) > 0 and (len(clean_ents) / len(entities)) < 0.7:
            continue
            
        if clean_ents:
            clean_ner_data.append({
                "content": text,
                "entities": clean_ents
            })

    print(f"  -> Initial records: {initial_ner}")
    print(f"  -> Final records: {len(clean_ner_data)} (Dropped {initial_ner - len(clean_ner_data)})")
    print(f"  -> Total raw spans: {total_ents}")
    print(f"  -> Valid spans kept: {kept_ents} (Misaligned/Overlap: {misaligned_ents})")
    
    out_ner = PROC_DIR / "ner_cleaned.json"
    with open(out_ner, "w", encoding="utf-8") as f:
        json.dump(clean_ner_data, f, indent=2)
    print(f"  -> Saved clean NER data to {out_ner.name}")
    
    # EDA: Plot Entity Frequencies
    labels_flat = [ent[2] for rec in clean_ner_data for ent in rec["entities"]]
    counts = Counter(labels_flat)
    
    plt.figure(figsize=(10, 6))
    sns.barplot(x=list(counts.values()), y=list(counts.keys()), hue=list(counts.keys()), palette="mako", legend=False)
    plt.title("NER Label Frequencies (Cleaned)")
    plt.xlabel("Count")
    plt.ylabel("Entity Label")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "ner_label_frequencies.png", dpi=300)
    plt.close()
    print("  -> Saved figure: ner_label_frequencies.png")


print("\nStep 0 complete.")
