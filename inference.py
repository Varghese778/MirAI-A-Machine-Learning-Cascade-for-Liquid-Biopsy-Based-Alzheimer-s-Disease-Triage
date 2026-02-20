import os
import json
import joblib
import pandas as pd
import numpy as np


class MirAI:

    def __init__(self, model_dir="models"):

        self.model_dir = model_dir

        with open(os.path.join(model_dir, "mirai_features.json"), "r") as f:
            self.meta = json.load(f)

        self.stage1_model = joblib.load(
            os.path.join(model_dir, "mirai_stage1_model.joblib")
        )

        self.stage2_model = joblib.load(
            os.path.join(model_dir, "mirai_stage2_model.joblib")
        )

        self.stage3_model = joblib.load(
            os.path.join(model_dir, "mirai_stage3_model.joblib")
        )

    # --------------------------------------------------
    # STAGE 3 CUSTOM PREP (numeric-only + missing flags)
    # --------------------------------------------------

    def _prepare_stage3(self, patient_dict):
        features = self.meta["stage3_features"]
        plasma = self.meta["plasma_features_stage3"]

        row = {}

        for col in features:
            # Handle missing indicator columns
            if col.endswith("_missing"):
                base = col.replace("_missing", "")
                row[col] = 0 if base in patient_dict and patient_dict[base] is not None else 1
                continue

            # Encode gender (CRITICAL FIX)
            if col == "PTGENDER":
                val = patient_dict.get(col, None)
                if val == "Male":
                    row[col] = 0
                elif val == "Female":
                    row[col] = 1
                else:
                    raise ValueError("PTGENDER must be 'Male' or 'Female'")
                continue

            # Plasma numeric coercion
            if col in plasma:
                try:
                    row[col] = float(patient_dict.get(col, np.nan))
                except:
                    row[col] = np.nan
                continue

            # All other numeric values
            row[col] = patient_dict.get(col, None)

        return pd.DataFrame([row])

    # --------------------------------------------------

    def predict(self, patient_dict, stage=3):
        if stage == 1:
            X = pd.DataFrame([patient_dict])[self.meta["stage1_features"]]
            prob = self.stage1_model.predict_proba(X)[0][1]

        elif stage == 2:
            X = pd.DataFrame([patient_dict])[self.meta["stage2_features"]]
            prob = self.stage2_model.predict_proba(X)[0][1]

        elif stage == 3:
            X = self._prepare_stage3(patient_dict)
            prob = self.stage3_model.predict_proba(X)[0][1]

        else:
            raise ValueError("Stage must be 1, 2, or 3")

        return {
            "stage": stage,
            "risk_probability": float(prob),
            "risk_category": "High Risk" if prob >= 0.5 else "Low Risk"
        }
