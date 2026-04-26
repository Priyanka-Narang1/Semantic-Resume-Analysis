"""
training/step1_train_ner.py
Train custom spaCy NER on the cleaned resume NER dataset from step0.

IMPROVEMENTS (Data-Driven rewrite):
- Eliminates manual heuristic data augmentation (uppercase/synonyms).
- Relies exclusively on high-quality, pre-cleaned data from step0.
- 50 training iterations with dropout 0.2
- Warm-up with en_core_web_sm weights (transfer learning)
- Per-label F1 table with support counts for paper

HOW TO RUN:
    python training/step1_train_ner.py
"""

import json
import random
import sys
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

print("=" * 60)
print("Step 1: Training Custom NER Model (Clean-Data First)")
print("=" * 60)

# ── Dependencies ────────────────────────────────────────────────
try:
    import spacy
    from spacy.training import Example
    from spacy.util import minibatch, compounding
    print(f"[OK] spaCy {spacy.__version__}")
except ImportError:
    print("[ERROR] Run: pip install spacy && python -m spacy download en_core_web_sm")
    sys.exit(1)

# ── Dataset ─────────────────────────────────────────────────────
DATA_PATH = ROOT / "data" / "processed" / "ner_cleaned.json"
if not DATA_PATH.exists():
    print(f"\n[ERROR] Not found: {DATA_PATH}. Run step0_clean_eda.py first.")
    sys.exit(1)
print(f"[OK] Dataset: {DATA_PATH.name}")

# ── Load and Format ──────────────────────────────────────────────
with open(DATA_PATH, encoding="utf-8") as f:
    clean_records = json.load(f)

training_data = []
for record in clean_records:
    text = record["content"]
    ents = record["entities"]
    training_data.append((text, {"entities": ents}))

print(f"[OK] Loaded {len(training_data)} pristine records")

# ── Train / val split ────────────────────────────────────────────
random.seed(42)
random.shuffle(training_data)
split = int(len(training_data) * 0.85)

train_data = training_data[:split]
val_data   = training_data[split:]

print(f"[OK] Train: {len(train_data)}, Validation: {len(val_data)}")

# ── Build model with transfer from en_core_web_sm ───────────────
print("\nBuilding NER model (transfer from en_core_web_sm)...")
try:
    nlp = spacy.load("en_core_web_sm", exclude=["ner"])
    print("[OK] Using en_core_web_sm as base (transfer learning)")
except Exception:
    nlp = spacy.blank("en")
    print("[OK] Using blank model (en_core_web_sm not found)")

if "ner" not in nlp.pipe_names:
    ner = nlp.add_pipe("ner", last=True)
else:
    ner = nlp.get_pipe("ner")

all_labels = set(l for _, ann in training_data for _, _, l in ann["entities"])
for label in all_labels:
    ner.add_label(label)
print(f"[OK] Labels: {sorted(all_labels)}")

# ── Training ─────────────────────────────────────────────────────
MODEL_DIR = ROOT / "models" / "ner_model"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

N_ITER   = 50
DROPOUT  = 0.2
best_f1  = 0.0

other_pipes = [p for p in nlp.pipe_names if p != "ner"]
optimizer = nlp.begin_training()

print(f"\nTraining for {N_ITER} iterations (dropout={DROPOUT})...")
print(f"{'Iter':>5}  {'Loss':>10}  {'Precision':>10}  {'Recall':>10}  {'F1':>10}")
print("-" * 56)

with nlp.disable_pipes(*other_pipes):  # only train NER
    for iteration in range(N_ITER):
        random.shuffle(train_data)
        losses  = {}
        batches = minibatch(train_data, size=compounding(4.0, 32.0, 1.001))
        for batch in batches:
            examples = []
            for text, annotations in batch:
                doc  = nlp.make_doc(text)
                ents = annotations["entities"]
                if not ents:
                    continue
                try:
                    examples.append(Example.from_dict(doc, {"entities": ents}))
                except Exception:
                    continue
            if examples:
                nlp.update(examples, drop=DROPOUT, losses=losses)

        # Evaluate every 5 iterations
        if (iteration + 1) % 5 == 0:
            tp = fp = fn = 0
            for text, annotations in val_data:
                doc        = nlp(text)
                pred_spans = set((e.start_char, e.end_char, e.label_) for e in doc.ents)
                gold_spans = set((s, e, l) for s, e, l in annotations["entities"])
                tp += len(pred_spans & gold_spans)
                fp += len(pred_spans - gold_spans)
                fn += len(gold_spans - pred_spans)
            p  = tp / (tp + fp) if (tp + fp) > 0 else 0
            r  = tp / (tp + fn) if (tp + fn) > 0 else 0
            f1 = 2 * p * r / (p + r) if (p + r) > 0 else 0
            loss_val = losses.get("ner", 0)
            print(f"{iteration+1:>5}  {loss_val:>10.2f}  {p:>10.3f}  {r:>10.3f}  {f1:>10.3f}")
            if f1 > best_f1:
                best_f1 = f1
                nlp.to_disk(MODEL_DIR)
                print(f"       -> Best model saved (F1 = {f1:.3f})")

print(f"\nBest overall F1: {best_f1:.3f}")

# ── Final per-label evaluation ───────────────────────────────────
print("\nRunning final per-label evaluation on validation set...")
nlp_best   = spacy.load(str(MODEL_DIR))
per_label  = defaultdict(lambda: {"tp": 0, "fp": 0, "fn": 0})
label_support = defaultdict(int)

for text, annotations in val_data:
    doc        = nlp_best(text)
    pred_spans = set((e.start_char, e.end_char, e.label_) for e in doc.ents)
    gold_spans = set((s, e, l) for s, e, l in annotations["entities"])
    for span in gold_spans:
        label_support[span[2]] += 1
    for span in pred_spans & gold_spans:
        per_label[span[2]]["tp"] += 1
    for span in pred_spans - gold_spans:
        per_label[span[2]]["fp"] += 1
    for span in gold_spans - pred_spans:
        per_label[span[2]]["fn"] += 1

print(f"\n{'Label':<15}  {'Precision':>10}  {'Recall':>10}  {'F1':>10}  {'Support':>9}")
print("-" * 62)

results = {}
macro_f1s = []
for label in sorted(per_label.keys()):
    c  = per_label[label]
    p  = c["tp"] / (c["tp"] + c["fp"]) if (c["tp"] + c["fp"]) > 0 else 0
    r  = c["tp"] / (c["tp"] + c["fn"]) if (c["tp"] + c["fn"]) > 0 else 0
    f1 = 2*p*r/(p+r) if (p+r) > 0 else 0
    sup = label_support[label]
    print(f"{label:<15}  {p:>10.3f}  {r:>10.3f}  {f1:>10.3f}  {sup:>9}")
    results[label] = {
        "precision": round(p, 3),
        "recall":    round(r, 3),
        "f1":        round(f1, 3),
        "support":   sup
    }
    macro_f1s.append(f1)

macro = sum(macro_f1s) / len(macro_f1s) if macro_f1s else 0
print("-" * 62)
print(f"{'Macro avg':<15}  {'':>10}  {'':>10}  {macro:>10.3f}")
print(f"{'Best overall':<15}  {'':>10}  {'':>10}  {best_f1:>10.3f}")

# Save for paper
results["_meta"] = {
    "best_f1":          round(best_f1, 3),
    "macro_f1":         round(macro, 3),
    "n_train":          len(train_data),
    "n_val":            len(val_data),
    "n_iter":           N_ITER,
    "dropout":          DROPOUT,
    "augmentation":     "None (Clean-First Mode)",
    "base_model":       "en_core_web_sm (transfer)"
}

import json as _json
eval_path = ROOT / "models" / "ner_eval_results.json"
with open(eval_path, "w") as f:
    _json.dump(results, f, indent=2)

print(f"\n[OK] Eval results  -> models/ner_eval_results.json")
print(f"[OK] NER model     -> models/ner_model/")
print("\nStep 1 complete. Run step2 next:")
print("  python training/step2_train_classifier.py")
