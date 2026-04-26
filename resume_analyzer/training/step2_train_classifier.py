"""
training/step2_train_classifier.py
Train TF-IDF + XGBoost resume category classifier.

IMPROVEMENTS:
- Uses step0 cleaned data (classifier_cleaned.csv)
- Removes manual constraints, applies natural distribution with balanced sample weights
- Calculates data-driven CATEGORY_IMPORTANCE weights from empirical skill frequencies per role
- Saves these weights to category_weights.json for the backend to use

HOW TO RUN:
    python training/step2_train_classifier.py
"""

import sys
import json
import pickle
import re
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

print("=" * 65)
print("Step 2: Training XGBoost Classifier & Category Weights")
print("=" * 65)

try:
    import pandas as pd
    import numpy as np
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.preprocessing import LabelEncoder
    from sklearn.metrics import classification_report
    from sklearn.pipeline import Pipeline
    from sklearn.utils.class_weight import compute_sample_weight
    import xgboost as xgb
    import shap
except ImportError as e:
    print(f"[ERROR] Missing package: {e}")
    sys.exit(1)

CSV_PATH = ROOT / "data" / "processed" / "classifier_cleaned.csv"
if not CSV_PATH.exists():
    print("[ERROR] dataset not found at data/processed/classifier_cleaned.csv")
    sys.exit(1)

print("\nLoading dataset...")
df = pd.read_csv(CSV_PATH)
df = df.dropna(subset=["clean_text", "Category"])
print(f"[OK] Loaded {len(df)} cleaned rows")

le = LabelEncoder()
df["label"] = le.fit_transform(df["Category"])
print(f"[OK] Labels encoded ({len(le.classes_)} classes)")

# ── 1. Calculate Data-Driven Category Weights ───────────────────
print("\nCalculating empirical skill category weights...")
ONTOLOGY_PATH = ROOT / "data" / "ontology" / "skills_ontology.json"
with open(ONTOLOGY_PATH) as f:
    ontology = json.load(f)

skill_to_cat = {}
for cat_key, cat_data in ontology["categories"].items():
    for skill in cat_data["skills"]:
        skill_to_cat[skill.lower()] = cat_key

# We calculate: for each role, how often does a category appear?
role_cat_counts = defaultdict(lambda: defaultdict(int))

for _, row in df.iterrows():
    role = row["Category"]
    text = row["clean_text"]
    text_words = set(text.split())
    # A bit simplified, but effective for frequency calculation
    for skill, cat in skill_to_cat.items():
        if len(skill.split()) == 1:
            if skill in text_words:
                role_cat_counts[role][cat] += 1
        else:
            if skill in text:
                role_cat_counts[role][cat] += 1

category_weights = {}
for role, counts in role_cat_counts.items():
    if not counts:
        continue
    max_count = max(counts.values())
    # Scale from 1.0 to 10.0 based on relative frequency
    scaled = {cat: round((cnt / max_count) * 9 + 1, 1) for cat, cnt in counts.items()}
    category_weights[role] = scaled

# Global fallback weights (average across all roles)
global_counts = defaultdict(int)
for counts in role_cat_counts.values():
    for cat, cnt in counts.items():
        global_counts[cat] += cnt

max_global = max(global_counts.values()) if global_counts else 1
global_weights = {cat: round((cnt / max_global) * 9 + 1, 1) for cat, cnt in global_counts.items()}
category_weights["_global"] = global_weights

MODEL_DIR = ROOT / "models" / "classifier"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

with open(MODEL_DIR / "category_weights.json", "w") as f:
    json.dump(category_weights, f, indent=2)
print("[OK] Saved empirical weights to models/classifier/category_weights.json")


# ── 2. TF-IDF & XGBoost Training ────────────────────────────────
print("\nBuilding TF-IDF features...")
tfidf = TfidfVectorizer(
    max_features=5000,
    ngram_range=(1, 2),
    min_df=2,
    sublinear_tf=True,
    stop_words="english"
)
X = tfidf.fit_transform(df["clean_text"])
y = df["label"].values

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Compute sample weights to balance the natural dataset distribution
sample_weights = compute_sample_weight("balanced", y_train)

print(f"[OK] Train: {X_train.shape[0]}, Test: {X_test.shape[0]}")

print("\nTraining XGBoost classifier (with balanced sample weights)...")
clf = xgb.XGBClassifier(
    n_estimators=200,
    max_depth=6,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    eval_metric="mlogloss",
    random_state=42,
    n_jobs=1,
    verbosity=0
)
clf.fit(
    X_train, y_train,
    sample_weight=sample_weights,
    eval_set=[(X_test, y_test)],
    verbose=0
)

# ── Evaluate ────────────────────────────────────────────────────
y_pred = clf.predict(X_test)
acc = (y_pred == y_test).mean()
print(f"\n[OK] Test Accuracy: {acc:.4f}")

# ── SHAP ────────────────────────────────────────────────────────
print("\nComputing SHAP values (50-sample background)...")
try:
    X_test_dense  = X_test.toarray()
    bg_idx        = np.random.choice(X_test_dense.shape[0], size=min(50, X_test_dense.shape[0]), replace=False)
    X_background  = shap.sample(X_test_dense, 50, random_state=42)
    explainer     = shap.TreeExplainer(clf, data=X_background, feature_perturbation="interventional")
    shap_ok = True
except Exception as e:
    print(f"[WARN] SHAP failed: {e}")
    explainer = None
    shap_ok = False

# ── Save all models ─────────────────────────────────────────────
print("\nSaving models...")

with open(MODEL_DIR / "tfidf_vectorizer.pkl", "wb") as f:
    pickle.dump(tfidf, f)
clf.save_model(str(MODEL_DIR / "xgboost_classifier.json"))
with open(MODEL_DIR / "label_encoder.pkl", "wb") as f:
    pickle.dump(le, f)
if shap_ok and explainer:
    with open(MODEL_DIR / "shap_explainer.pkl", "wb") as f:
        pickle.dump(explainer, f)

from sklearn.metrics import precision_recall_fscore_support
p, r, f_score, _ = precision_recall_fscore_support(y_test, y_pred, average="weighted")
eval_results = {
    "accuracy":       round(float(acc), 4),
    "precision":      round(float(p),   4),
    "recall":         round(float(r),   4),
    "f1_weighted":    round(float(f_score),   4),
    "n_classes":      int(len(le.classes_)),
    "categories":     list(le.classes_)
}
with open(MODEL_DIR / "eval_results.json", "w") as f:
    json.dump(eval_results, f, indent=2)

print("\nStep 2 complete.")
