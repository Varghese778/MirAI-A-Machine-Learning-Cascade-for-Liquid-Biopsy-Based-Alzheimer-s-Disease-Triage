"""
MirAI Test Script
-----------------

This script loads the deployed MirAI models and evaluates
three synthetic clinical examples:

1. Cognitively Normal (CN)
2. Mild Cognitive Impairment (MCI)
3. Alzheimer's Disease (AD)

Run:
    python test.py
"""

from inference import MirAI


# ==========================================
# INITIALIZE MODEL
# ==========================================

model = MirAI(model_dir="models")


# ==========================================
# SAMPLE PATIENT TEMPLATES
# ==========================================

# ---- Cognitively Normal ----
patient_cn = {
    "AGE": 65,
    "PTEDUCAT": 18,
    "PTGENDER": "Female",
    "APOE4": 0,
    "AB42_F": 30,          # above median
    "AB40_F": 260,         # normal
    "AB42_AB40_F": 0.11,   # high ratio (protective)
    "pT217_AB42_F": 0.002, # low
    "NfL_Q": 12,           # low
    "GFAP_Q": 90           # low
}

# ---- Mild Cognitive Impairment ----
patient_mci = {
    "AGE": 72,
    "PTEDUCAT": 14,
    "PTGENDER": "Male",
    "APOE4": 1,
    "AB42_F": 22,
    "AB40_F": 290,
    "AB42_AB40_F": 0.08,
    "pT217_AB42_F": 0.015,
    "NfL_Q": 22,
    "GFAP_Q": 180
}


# ---- Alzheimer's Disease ----
patient_ad = {
    "AGE": 78,
    "PTEDUCAT": 12,
    "PTGENDER": "Male",
    "APOE4": 1,
    "AB42_F": 18,
    "AB40_F": 310,
    "AB42_AB40_F": 0.06,
    "pT217_AB42_F": 0.05,
    "NfL_Q": 40,
    "GFAP_Q": 300
}



# ==========================================
# FUNCTION TO RUN ALL STAGES
# ==========================================

def evaluate_patient(name, patient_dict):
    print("\n====================================")
    print(f"Patient Type: {name}")
    print("====================================")

    for stage in [1, 2, 3]:
        result = model.predict(patient_dict, stage=stage)
        print(f"Stage {stage} Result:")
        print(f"  Risk Probability: {result['risk_probability']:.4f}")
        print(f"  Risk Category: {result['risk_category']}")
        print("------------------------------------")


# ==========================================
# RUN TESTS
# ==========================================

evaluate_patient("Cognitively Normal (CN)", patient_cn)
evaluate_patient("Mild Cognitive Impairment (MCI)", patient_mci)
evaluate_patient("Alzheimer's Disease (AD)", patient_ad)

print("\nTest completed successfully.")
