"""
run_all_training.py
Runs all training steps in sequence.

HOW TO RUN (from project root in VS Code terminal):
    python run_all_training.py

BEFORE RUNNING - put these files in data/raw/:
    1. Entity Recognition in Resumes.json
       -> https://www.kaggle.com/datasets/dataturks/resume-entities-for-ner

    2. UpdatedResumeDataSet.csv
       -> https://www.kaggle.com/datasets/gauravduttakiit/resume-dataset

INSTALL PACKAGES (run once):
    pip install sentence-transformers spacy xgboost shap scikit-learn pandas numpy
    python -m spacy download en_core_web_sm

Each step saves its output to models/ so you can re-run any step individually:
    python training/step1_train_ner.py
    python training/step2_train_classifier.py
    python training/step3_sbert_ablation.py
"""

import sys
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent

def run_step(script_path, step_name):
    print("\n" + "=" * 60)
    print(f"RUNNING: {step_name}")
    print("=" * 60 + "\n")
    result = subprocess.run(
        [sys.executable, str(script_path)],
        cwd=str(ROOT)
    )
    if result.returncode != 0:
        print(f"\n[ERROR] {step_name} failed with exit code {result.returncode}")
        print("Fix the error above and re-run that step individually.")
        sys.exit(result.returncode)
    print(f"\n[OK] {step_name} completed successfully.")


if __name__ == "__main__":
    print("=" * 60)
    print("JOBFIT AI - FULL ML TRAINING PIPELINE")
    print("=" * 60)
    print("\nThis will run 3 training steps in order.")
    print("Expected total time: 10-20 minutes depending on hardware.")

    # Check data files exist before starting
    ner_data = ROOT / "data" / "raw" / "Entity Recognition in Resumes.json"
    clf_data = ROOT / "data" / "raw" / "UpdatedResumeDataSet.csv"

    missing_files = []
    if not ner_data.exists():
        missing_files.append(f"  - {ner_data.name}  (from kaggle.com/dataturks/resume-entities-for-ner)")
    if not clf_data.exists():
        missing_files.append(f"  - {clf_data.name}  (from kaggle.com/gauravduttakiit/resume-dataset)")

    if missing_files:
        print("\n[ERROR] Missing dataset files in data/raw/:")
        for f in missing_files:
            print(f)
        print("\nDownload them from Kaggle and place in data/raw/ then re-run.")
        sys.exit(1)

    print("\nAll dataset files found. Starting training...\n")

    run_step(ROOT / "training" / "step1_train_ner.py",        "Step 1: NER Model Training")
    run_step(ROOT / "training" / "step2_train_classifier.py", "Step 2: XGBoost Classifier + SHAP")
    run_step(ROOT / "training" / "step3_sbert_ablation.py",   "Step 3: SBERT Embeddings + Ablation")

    print("\n" + "=" * 60)
    print("ALL TRAINING COMPLETE")
    print("=" * 60)
    print("\nModels saved:")
    print("  models/ner_model/                   <- custom spaCy NER")
    print("  models/classifier/                  <- XGBoost + SHAP")
    print("  models/embeddings_cache/            <- SBERT skill embeddings")
    print("\nPaper metrics:")
    print("  models/ner_eval_results.json        <- Table 1: NER performance")
    print("  models/classifier/eval_results.json <- Table 2: Classifier metrics")
    print("  models/ablation_results.json        <- Table 3: Ablation study")
    print("\nNow restart the backend to use trained models:")
    print("  uvicorn backend.api.main:app --reload --port 8000")
