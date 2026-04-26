# Machine Learning Models Used in the Architecture

The architecture has evolved into a fully interconnected machine learning ecosystem. Rather than relying on simple logic or a single AI, the system uses a compound architecture of **7 distinct ML models/systems**, each specializing in a specific segment of the data pipeline.

Here is the breakdown of the models, what they do, and where they live in the codebase:

---

## 1. Custom spaCy Named Entity Recognition (NER)
*   **Purpose**: The main extraction engine. Instead of using regex to locate buzzwords, this custom neural network reads the structural layout and textual context to intelligently extract specific entities: `SKILLS`, `ROLES`, `ORGANIZATIONS`, and `DATES` from raw resume text.
*   **Where it is trained**: `training/step1_train_ner.py`
*   **Where it is executed**: `backend/parser/skill_extractor.py` 

## 2. XGBoost + TF-IDF Classifier Pipeline
*   **Purpose**: The core categorization engine. It assesses the candidate's entire resume text to predict their "Primary Job Function" (e.g., Data Scientist vs. Backend Engineer). This outputs probabilities used as a proxy for "resume quality" and feeds the SHAP Explainer (Explainable AI) to show the user exactly which terms led to the conclusion.
*   **Where it is trained**: `training/step2_train_classifier.py`
*   **Where it is executed**: Principally fed into `backend/analyzer.py` and output to the UI via `feedback_generator.py`.

## 3. Sentence-BERT (SBERT) Semantic Matcher (`all-MiniLM-L6-v2`)
*   **Purpose**: The core comparative engine. It converts extracted text into 384-dimensional dense vectors to compute how mathematically "close" two skills are (Cosine Similarity). It natively solves the synonym problem (evaluating "js" and "javascript" to >0.90 similarity), removing the need for hardcoded dictionaries. 
*   **Where it is Calibrated**: `training/step3_sbert_calibrate.py` (which determines the empirical similarity cutoff threshold like `0.63`).
*   **Where it is executed**: `backend/gap_engine/gap_detector.py` and `backend/parser/skill_extractor.py`.

## 4. Logistic Regression Section Scorers
*   **Purpose**: A suite of five distinct mathematical models (one for each section: Skills, Experience, Education, Projects, Summary). These models weigh various textual features (brevity, JD alignment, quantify density) against each other to map a fair, scaled score out of 10. They completely replace the arbitrary `earned += 3` logic.
*   **Where it is trained**: `training/step4_train_section_scorer.py`
*   **Where it is executed**: `backend/xai/feedback_generator.py` (evaluating feature coefficients during scoring).

## 5. Severity Linear Regression
*   **Purpose**: Computes precisely how "severe" a missing gap is. It projects the raw SBERT similarity distance penalty and contextual priority markers through a learned linear matrix to output a 1-to-10 severity score, effectively erasing the prior fabricated `0.4 * semantic_penalty` formula loop.
*   **Where it is trained**: `training/step4_train_section_scorer.py`
*   **Where it is executed**: `backend/gap_engine/gap_detector.py` (calculating priority dynamically).

## 6. Pre-trained Base spaCy NLP (`en_core_web_sm`)
*   **Purpose**: The syntactic logic engine. It applies foundational grammar models (Parts-of-Speech Tagging and generic Named Entity Recognition) during the feedback generation loop to structurally prove that a bullet point contains active verbs (`VBG`) and quantified metrics (`CARDINAL`, `PERCENT`), replacing simplistic arrays of 20 hardcoded action verbs.
*   **Where it is executed**: `backend/xai/feedback_generator.py`.

## 7. Generative Context/LLM Framework
*   **Purpose**: Used to dynamically derive unstructured answers that mathematical models cannot (or should not) handle directly. It performs "Zero-Shot Context Classification" to split unstructured Job Descriptions into *Required* vs *Preferred* chunks without using keywords like "Must Have". It is also designated to map out learning roadmaps dynamically (weeks to learn + course URLs).
*   **Where it is executed**: `backend/parser/skill_extractor.py` (JD Section Parsing) and `backend/recommender/recommender.py` (Course & Estimate Generation).
