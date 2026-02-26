<div align="center">

# 🧠 MirAI: A Machine Learning Cascade for Liquid Biopsy-Based Alzheimer’s Disease Triage

**A research-grade, multi-stage clinical machine learning cascade for non-invasive Alzheimer's Disease risk stratification**

[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)](https://python.org)
[![XGBoost](https://img.shields.io/badge/XGBoost-3.2.0-orange)](https://xgboost.readthedocs.io)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.8.0-green)](https://scikit-learn.org)
[![SHAP](https://img.shields.io/badge/SHAP-0.50.0-yellow)](https://shap.readthedocs.io)
[![Data: ADNI](https://img.shields.io/badge/Data-ADNI-blueviolet)](https://adni.loni.usc.edu/)

</div>

---

## 📖 Project Overview

**MirAI** is an early-stage Alzheimer's Disease (AD) screening tool built on longitudinal real-world data from the **Alzheimer's Disease Neuroimaging Initiative (ADNI)**. It implements a clinically-motivated **3-stage risk escalation cascade** that progressively introduces more complex and costly biomarker data only when necessary — mirroring how a real clinical triage workflow would operate.

The system is designed as a **pre-diagnostic triage tool** to assist clinicians in identifying individuals at elevated risk of Alzheimer's Disease *before* expensive or invasive diagnostics such as PET imaging or lumbar puncture (CSF tap). It prioritizes:

- **Non-invasiveness** — Stage 3 relies solely on plasma (blood-based) biomarkers.
- **Scientific honesty** — Clinical diagnostic scores (MMSE, CDR) are strictly excluded from features to prevent target leakage.
- **Statistical rigor** — Patient-level isolation, cross-validation consistency, confidence intervals, and paired bootstrap testing.
- **Biological interpretability** — SHAP-based explainability cross-validated across folds.

> ⚠️ **Disclaimer:** MirAI is a **research prototype** intended for academic and investigational use only. It is **not** a certified medical device and must not be used for clinical diagnosis without appropriate regulatory review.

---

## ✨ Key Features & Methodology

### The 3-Stage Clinical Cascade

MirAI escalates patient evaluation progressively, spending minimal resources on low-risk individuals and reserving intensive biomarker analysis for high-risk cases.

```
Patient enters pipeline
        │
        ▼
┌─────────────────────────────┐
│  STAGE 1: Demographic Screen │  ← Age, Gender, Education (low cost)
│  AUC ≈ 0.67                 │
└──────────────┬──────────────┘
               │ High-risk patients escalated
               ▼
┌─────────────────────────────┐
│  STAGE 2: Genetic Augment   │  ← + APOE4 genotype
│  AUC improvement: signif.   │
└──────────────┬──────────────┘
               │ High-risk patients escalated
               ▼
┌─────────────────────────────┐
│  STAGE 3: Plasma Biomarkers │  ← + Plasma liquid biopsy panel
│  ΔAUC ≈ +0.105 (p < 0.001) │    (pT217, NfL, GFAP, Aβ ratios)
└─────────────────────────────┘
```

### Feature Sets per Stage

| Stage | Features | Clinical Rationale |
|-------|----------|-------------------|
| **Stage 1** | `AGE`, `PTGENDER`, `PTEDUCAT` | Zero-cost demographic screen; available for all patients |
| **Stage 2** | Stage 1 + `APOE4` | Adds genetic risk factor; one-time genotyping |
| **Stage 3** | Stage 2 + `AB42_F`, `AB40_F`, `AB42_AB40_F`, `pT217_AB42_F`, `NfL_Q`, `GFAP_Q` | Plasma amyloid/tau/neurodegeneration panel; non-invasive liquid biopsy |

### Model Architecture

- **Algorithm:** [XGBoost](https://xgboost.readthedocs.io) (`XGBClassifier`) — gradient-boosted decision trees with native NaN handling
- **Calibration:** Isotonic regression calibration (`CalibratedClassifierCV`) applied to Stages 2 & 3 to produce reliable probability estimates
- **Hyperparameter Tuning:** `GridSearchCV` using explicitly pre-computed `StratifiedGroupKFold` splits for leakage-free cross-validation
- **Stacking:** Out-of-Fold (OOF) predictions from each stage are passed forward as an input feature to the next stage via `cross_val_predict`

### Methodological Rigor

#### 🔒 Leakage Prevention
- **Patient-level isolation:** `GroupShuffleSplit` by `RID` (ADNI patient ID) ensures zero patient crossover between train and test sets — critical for repeated-measures clinical data.
- **Consistent CV folds:** `StratifiedGroupKFold` splits are precomputed and shared identically across `GridSearchCV`, `cross_val_predict`, and `CalibratedClassifierCV`.
- **Clinical target purging:** Diagnostic cognitive tools (MMSE, CDR, ADAS-Cog, FAQ, ECog) are **strictly excluded** from all feature sets to prevent label leakage.
- **Modality integrity:** CSF biomarkers (Aβ, Tau, pTau via lumbar puncture) are excluded from Stage 3; only plasma markers are used.

#### 📊 Missing Data Strategy (MNAR)
Plasma biomarker missingness is **Missing Not At Random (MNAR)** — not all patients receive blood tests, and the absence of a test itself carries clinical meaning. Therefore:
- Aggressive imputation is avoided for plasma markers.
- XGBoost's **native NaN handling** is leveraged.
- Explicit **binary missingness indicator columns** (`_missing` suffix) are added for each plasma feature.
- SHAP analysis confirmed near-zero importance for missing indicators, validating the approach.

#### 📈 Statistical Validation
- **Bootstrapped 95% CIs** computed for all AUC scores.
- **Paired bootstrap hypothesis testing** (n=2,000 iterations) tests ΔAUC between stages:
  - Stage 3 vs Stage 2: ΔAUC ≈ **+0.105**, *p* < 0.001
- **Calibration metrics:** Expected Calibration Error (ECE) and Maximum Calibration Error (MCE) computed; reliability diagrams plotted. Stage 3 ECE ≈ 0.12.
- **Decision Curve Analysis (DCA):** Stage 3 demonstrates highest net clinical benefit across all clinically relevant decision thresholds.

#### 🔍 Explainability (SHAP)
SHAP values are computed **inside each CV fold** using fold-trained models and aggregated across all folds to prevent explanation bias. Top features by mean |SHAP|:

| Rank | Feature | Biological Meaning |
|------|---------|-------------------|
| 1 | `pT217_AB42_F` | Phospho-tau 217 / Aβ42 plasma ratio — strongest AD pathology signal |
| 2 | `NfL_Q` | Neurofilament Light — neurodegeneration marker |
| 3 | `AB42_AB40_F` | Amyloid 42/40 ratio — amyloid burden indicator |
| 4 | `AGE` | Primary demographic risk factor |
| 5 | `APOE4` | Genetic predisposition (secondary once pathology measured) |

This ranking aligns precisely with established AD neuropathological mechanisms, confirming biological plausibility rather than statistical artifact.

---

## 🛠️ Tech Stack / Libraries Used

| Library | Version | Role |
|---------|---------|------|
| **Python** | 3.12.10 | Core language |
| **XGBoost** | 3.2.0 | Primary gradient-boosted classifier for all 3 stages |
| **scikit-learn** | 1.8.0 | CV splitting, calibration, GridSearchCV, metrics |
| **pandas** | 3.0.0 | Data ingestion, merging, and feature engineering |
| **NumPy** | 2.3.5 | Numerical computing and bootstrap sampling |
| **SciPy** | 1.17.0 | Statistical testing |
| **SHAP** | 0.50.0 | Model explainability and feature importance |
| **matplotlib** | 3.10.8 | ROC curves, calibration plots, DCA plots |
| **seaborn** | 0.13.2 | Statistical visualization |
| **joblib** | 1.5.3 | Model serialization (`.joblib` artifacts) |
| **numba** | 0.63.1 | SHAP computation acceleration |
| **ipykernel** | 7.2.0 | Jupyter notebook execution |

### Data Sources (ADNI)
All data is sourced from the **Alzheimer's Disease Neuroimaging Initiative (ADNI)**:

| File | Contents |
|------|---------|
| `ADNIMERGE_01Feb2026.csv` | Core longitudinal demographics, cognition, and biomarkers |
| `APOERES_01Feb2026.csv` | APOE genotyping results |
| `UPENNBIOMK_ROCHE_ELECSYS_01Feb2026.csv` | CSF biomarkers (reference, excluded from Stage 3) |
| `UPENN_PLASMA_FUJIREBIO_QUANTERIX_01Feb2026.csv` | Plasma biomarkers (Stage 3 features) |

> **Data Access:** ADNI data requires an approved registration at [adni.loni.usc.edu](https://adni.loni.usc.edu). The data files are **not** included in this repository.

---

## ⚙️ Setup and Installation

### Prerequisites
- **Python 3.12+**
- **Git**
- An approved **ADNI data access account** for the CSV data files

### 1. Clone the Repository

```bash
git clone https://github.com/Varghese778/MirAI-A-Machine-Learning-Cascade-for-Liquid-Biopsy-Based-Alzheimer-s-Disease-Triage.git
cd MirAI-A-Machine-Learning-Cascade-for-Liquid-Biopsy-Based-Alzheimer-s-Disease-Triage
```

### 2. Create and Activate a Virtual Environment

```bash
# Create the virtual environment
python -m venv med

# Activate (Windows)
med\Scripts\activate

# Activate (Linux / macOS)
source med/bin/activate
```

### 3. Install Dependencies

A pinned `requirements.txt` can be generated from `artifacts/env_info.json`. To install the key packages:

```bash
pip install xgboost==3.2.0 scikit-learn==1.8.0 pandas==3.0.0 numpy==2.3.5 \
            scipy==1.17.0 shap==0.50.0 matplotlib==3.10.8 seaborn==0.13.2 \
            joblib==1.5.3 numba==0.63.1 ipykernel==7.2.0 jupyter
```

Or restore the full pinned environment:

```bash
pip install -r requirements.txt
```

### 4. Place ADNI Data Files

Copy your approved ADNI CSV exports to the project **root directory**:

```
MirAI 2/
├── ADNIMERGE_01Feb2026.csv
├── APOERES_01Feb2026.csv
├── UPENNBIOMK_ROCHE_ELECSYS_01Feb2026.csv
└── UPENN_PLASMA_FUJIREBIO_QUANTERIX_01Feb2026.csv
```

> **Note:** Filenames may vary with your ADNI download date. Update the file paths in the notebook's data-loading cells accordingly.

### 5. Register the Kernel with Jupyter

```bash
python -m ipykernel install --user --name=med --display-name "Python (MirAI med)"
```

---

## ▶️ How to Run the Notebook

### Launch Jupyter

```bash
jupyter notebook
```

Open **`MirAI_modelling.ipynb`** from the Jupyter file browser.

### Select the Correct Kernel

In the notebook: **Kernel → Change Kernel → Python (MirAI med)**

### Execute the Notebook

Run all cells sequentially from top to bottom:  
**Kernel → Restart & Run All**

> ⚠️ Always restart the kernel and run from top to bottom to ensure full reproducibility. Partial execution may cause state inconsistencies.

### Expected Outputs

After a full run, the notebook produces:
- **ROC curves** for all 3 stages with bootstrapped CIs
- **Reliability diagrams** (calibration plots) for Stages 2 & 3
- **Decision Curve Analysis** plot comparing all strategies
- **SHAP beeswarm and bar plots** (fold-aggregated) for Stage 3
- **Saved model artifacts** in `models/`:
  - `mirai_stage1_model.joblib`
  - `mirai_stage2_model.joblib`
  - `mirai_stage3_model.joblib`
  - `mirai_features.json`

---

## 🔮 Running Inference

Use the included `inference.py` to run predictions on individual patients without re-running the notebook:

```python
from inference import MirAI

model = MirAI(model_dir="models")

patient = {
    "AGE": 74,
    "PTGENDER": "Female",
    "PTEDUCAT": 16,
    "APOE4": 1,
    "AB42_F": 892.4,
    "AB40_F": 14200.0,
    "AB42_AB40_F": 0.0628,
    "pT217_AB42_F": 0.312,
    "NfL_Q": 18.7,
    "GFAP_Q": 245.0
}

# Run full Stage 3 evaluation
result = model.predict(patient, stage=3)
print(result)
# {'stage': 3, 'risk_probability': 0.87, 'risk_category': 'High Risk'}
```

The `stage` parameter accepts `1`, `2`, or `3` to run at any point in the cascade.

---

## 📁 Project Structure

```
MirAI/
├── MirAI_modelling.ipynb              # Main modelling notebook
├── inference.py                       # Inference API class (MirAI)
├── test.py                            # Quick sanity-test for all 3 stages
├── requirements.txt                   # Pinned dependencies for the notebook env
├── MirAI_Methodology_Evolution.md     # Detailed audit & methodology log
├── .gitignore                         # Excludes data, venv, caches, artifacts
├── models/
│   ├── mirai_stage1_model.joblib      # Trained Stage 1 classifier
│   ├── mirai_stage2_model.joblib      # Trained Stage 2 classifier (calibrated)
│   ├── mirai_stage3_model.joblib      # Trained Stage 3 classifier (calibrated)
│   └── mirai_features.json            # Feature schema for all stages
├── mirai-web-app/                     # Glassmorphism web interface (Flask)
│   ├── app.py                         # Flask server & /predict endpoint
│   ├── requirements.txt               # Web app dependencies
│   ├── templates/
│   │   └── index.html                 # Single-page clinical screening UI
│   └── static/
│       ├── css/
│       │   └── style.css              # Glassmorphism design system & animations
│       ├── js/
│       │   └── app.js                 # Wizard logic, API integration, Chart.js gauge
│       └── images/
│           ├── mirai-stage-01.jpg     # Stage 1 visual (demographics)
│           ├── mirai-stage-02.jpg     # Stage 2 visual (genetics)
│           └── mirai-stage-03.jpg     # Stage 3 visual (plasma biomarkers)
└── [ADNI data CSVs — not in repo, see Data Sources section]
```

---

## ⚠️ Limitations & Future Work

- **Single cohort:** Trained and validated exclusively on ADNI data. External validation on independent cohorts (e.g., UK Biobank, AIBL) is required before broader claims.
- **No subgroup fairness analysis:** Performance stratified by age quartile, race/ethnicity, and sex has not yet been fully characterized.
- **Threshold optimization:** Operating thresholds have not been tuned for clinical cost trade-offs (sensitivity vs. specificity).
- **Prospective evaluation:** The model has not been tested in a prospective or real-world clinical setting.

---

## 📜 License & Attribution

This project uses data from the **Alzheimer's Disease Neuroimaging Initiative (ADNI)**. Investigators within the ADNI contributed to the design and implementation of ADNI and/or provided data but did not participate in this analysis. A complete listing of ADNI investigators can be found at [adni.loni.usc.edu](https://adni.loni.usc.edu).

---

## 🌿 Running the MirAI Web Interface

A local web interface is included in the `mirai-web-app/` subfolder. It features a **glassmorphism-styled single-page application** with a cyberpunk-inspired dark UI, floating particle effects, and a multi-step clinical screening wizard that runs the MirAI model cascade in your browser — no Jupyter required.

**Interface Sections:**
- **Hero** — MirAI branding, AUC performance stats, and a "Begin Screening" call-to-action
- **The 3-Stage Cascade** — Visual cards explaining Demographics → Genetics → Plasma stages
- **Clinical Dashboard** — Hexagonal metric cards showing key statistics
- **How it Works** — Interactive timeline walking through the clinical workflow
- **Patient Screening** — Multi-step wizard with toggleable data sections and form validation
- **Results** — Risk gauge chart (Chart.js), classification badge, and compassionate clinical messaging

### Folder Structure

```
mirai-web-app/
├── app.py                    # Flask backend — loads models & /predict endpoint
├── requirements.txt          # Backend dependencies
├── templates/
│   └── index.html            # Single-page glassmorphism screening UI
└── static/
    ├── css/
    │   └── style.css         # Glassmorphism design system, animations, responsive layout
    ├── js/
    │   └── app.js            # UI effects, wizard navigation, API integration, gauge chart
    └── images/
        ├── mirai-stage-01.jpg
        ├── mirai-stage-02.jpg
        └── mirai-stage-03.jpg
```

### Prerequisites

Make sure you have already run the notebook (`MirAI_modelling.ipynb`) at least once so that the trained model files exist in `models/`:

```
models/
├── mirai_stage1_model.joblib
├── mirai_stage2_model.joblib
├── mirai_stage3_model.joblib
└── mirai_features.json
```

### Step 1 — Install the Backend Dependencies

Activate your virtual environment first (the same one used for the notebook, or any environment with Python 3.10+):

```bash
# Windows
med\Scripts\activate

# macOS / Linux
source med/bin/activate
```

Then install Flask (the other packages are already in your environment):

```bash
pip install flask
```

Or install all requirements from the web app folder:

```bash
pip install -r mirai-web-app/requirements.txt
```

### Step 2 — Start the Local Server

From the **project root** (`MirAI 2/`), run:

```bash
python mirai-web-app/app.py
```

You should see:

```
[*] Loading MirAI models ...
[+] Models loaded successfully.

[*] MirAI Web Interface is now running.
    Open your browser at:  http://127.0.0.1:5000
```

### Step 3 — Open the Interface

Open your browser and navigate to:

```
http://127.0.0.1:5000
```

You will be greeted by the MirAI glassmorphism interface. Scroll through the landing page to explore the cascade explanation, dashboard metrics, and clinical workflow timeline. Then navigate to the **Patient Screening** section and work through the 3 wizard steps:

1. **Demographics** — Age, biological sex, and years of education.
2. **Genetics** — APOE4 allele count (toggle off if unavailable).
3. **Plasma Biomarkers** — pTau-217/AB42, NfL, GFAP values (toggle off if unavailable).

Click **Run Inference Analysis** and the interface will call the `/predict` endpoint, display a loading animation, then reveal a full **Analysis Report** with a Chart.js risk gauge, classification, compassionate clinical messaging, and recommended next steps.

### Step 4 — Stop the Server

Press **`Ctrl + C`** in the terminal to stop the Flask server.

> ⚠️ **Reminder:** The web interface is a local research tool. Never expose it to the public internet without proper authentication, rate-limiting, and regulatory review. Results are **not** a clinical diagnosis.

---

<div align="center">

*Built with ❤️ as part of the Codeversity MirAI project.*

</div>
