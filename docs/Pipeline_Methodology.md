# System Architecture & Pipeline Methodology

This document outlines the sequential execution pipeline of the JobFit AI Resume Analyzer. It breaks down the transition from raw Kaggle data to a fully explainable, inference-ready backend system.

---

## Phase 1: Data Preparation & Exploratory Data Analysis (EDA)
**Objective Processing:** `step0_clean_eda.py`
The pipeline begins by ingesting the raw Kaggle `Resume.csv` dataset string. Because user-generated resumes contain unpredictable whitespace, punctuation artifacts, and unicode characters, the data must be mathematically normalized.
* **Procedures Executed:**
  - Removal of non-UTF-8 characters, HTML noise, and redundant punctuations.
  - Frequency counting of inherent label categories across the dataset.
  - Visualization plotting of domain distribution to identify data imbalance.
* **Output Generated:** 
  - `data/processed/cleaned_resumes.csv`: The normalized dataset used by all downstream ML models.
  - `models/figures/ner_label_frequencies.png`: A visual histogram demonstrating class distribution.

## Phase 2: Named Entity Recognition (NER) Training
**Objective Processing:** `step1_train_ner.py`
We train a Custom `spaCy` NLP model to geometrically isolate "Skills" as mathematical Entities from free-flowing text blocks. 
* **Procedures Executed:**
  - Converts text spans (e.g., `characters 14 to 20 = "Python"`) into strict binary vectors.
  - Temporarily disables baseline spaCy components (`tagger`, `parser`) to optimize CPU constraint times.
  - Trains the neural network for 50 loss-minimizing loops (epochs), dropping 20% random weights iteratively to prevent catastrophic overfitting.
* **Output Generated:**
  - `models/ner_model/`: A serialized binary directory containing the compiled neural network weights.
  - `models/ner_eval_results.json`: A metrics payload detailing the model’s algorithmic competency (Precision, Recall, F1). Note: The architecture explicitly mitigates low F1-scores structurally downstream.

## Phase 3: Classifier & Frequency Weight Engine
**Objective Processing:** `step2_train_classifier.py`
This step resolves empirical frequency matrixing to decouple the severity logic from heuristic human bias.
* **Procedures Executed:**
  - TF-IDF generation: Converts paragraph word-density into numerical matrices.
  - Trains an **XGBoost Classifier** to map resume patterns to formalized job sectors (e.g., "Software Engineer" vs. "HR").
  - Mathematical frequency extraction: Calculates exactly what percentage of HR resumes contain "Soft Skills", scaling the output between 1.0 and 10.0.
* **Output Generated:**
  - `models/classifier/xgb_pipeline.pkl`: The active trained classifier engine.
  - `models/classifier/category_weights.json`: The empirical scaling dictionary replacing hardcoded heuristics (e.g., mathematically proving soft skills require a 10/10 severity scale globally).

## Phase 4: Semantic Calibration (SBERT Ablation)
**Objective Processing:** `step3_sbert_calibrate.py` & `Ablation Studies`
Replaces legacy "exact string matching" with High-Dimensional Semantic Similarity matrices.
* **Procedures Executed:**
  - Iterates varying SBERT configurations against synthetically similar concepts (e.g., matching "Neural Networks" to "Deep Learning").
  - Identifies the perfect Cosine Similarity threshold where the algorithm distinguishes identical skills from fundamentally different technologies without generating false positives.
* **Output Generated:**
  - `models/sbert_threshold.json`: Dictates the active runtime threshold (e.g., `0.63`) preventing the system from penalizing candidates for using synonyms. 

## Phase 5: Generative Extractor & Explainable AI (XAI)
**Objective Processing:** `backend/gap_engine/_advice.py`
Connects the backend ML matrix to user-facing deterministic text outputs without employing hallucination-prone APIs.
* **Procedures Executed:**
  - Text Extraction: Slices the user's document into explicit "Project" and "Experience" arrays.
  - Dynamic Substring Location: Parses the arrays to locate the precise geometric sentence containing the flagged bridge-skills.
  - Syntactic Wrapping: Merges the isolated user sentence into contextual strings warning.
* **Output Generated:**
  - An independent deterministic string structure natively fed back to the React UI quoting the user directly (e.g., *"Take your bullet '- Built an HTML5 Player' and rewrite it..."*).
