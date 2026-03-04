"""
MirAI Web App - Flask Backend
Serves the HTML interface and exposes a /predict API endpoint.
"""

import os
import sys
import json
import numpy as np
import requests as http_requests
from dotenv import load_dotenv
from flask import Flask, request, jsonify, render_template

# -- Load .env file ---
load_dotenv()

# -- Path resolution: find the parent project root so we can import inference.py
APP_DIR    = os.path.dirname(os.path.abspath(__file__))   # .../mirai-web-app/
ROOT_DIR   = os.path.dirname(APP_DIR)                     # .../MirAI/
MODEL_DIR  = os.path.join(ROOT_DIR, "models")

# Add root to sys.path so `inference` module can be imported
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from inference import MirAI  # noqa: E402 (import after path tweak)

# -- Flask app ---
app = Flask(__name__)

# Load models once at startup
print("[*] Loading MirAI models ...")
mirai = MirAI(model_dir=MODEL_DIR)
print("[+] Models loaded successfully.")


# -- Routes ---
@app.route("/")
def index():
    """Serve the main screening UI."""
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    """
    Accept a JSON body with patient features and return a risk prediction.

    Mandatory fields for Stage 1:
        AGE (int), PTGENDER ("Male"|"Female"), PTEDUCAT (int)

    Additional for Stage 2:
        APOE4 (0|1|2)

    Additional for Stage 3 (optional -- leave absent/null to use NaN):
        AB42_F, AB40_F, AB42_AB40_F, pT217_AB42_F, NfL_Q, GFAP_Q
    """
    try:
        data = request.get_json(force=True)

        if not data:
            return jsonify({"error": "No JSON payload received."}), 400

        # Determine the stage based on which fields were provided
        has_stage2 = data.get("APOE4") is not None
        plasma_fields = ["AB42_F", "AB40_F", "AB42_AB40_F", "pT217_AB42_F", "NfL_Q", "GFAP_Q"]
        has_stage3 = any(data.get(f) is not None for f in plasma_fields)

        # Stage 1 validation
        for field in ["AGE", "PTGENDER", "PTEDUCAT"]:
            if data.get(field) is None:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # -- Coerce types ---
        patient = {
            "AGE":      float(data["AGE"]),
            "PTGENDER": str(data["PTGENDER"]),   # "Male" | "Female"
            "PTEDUCAT": float(data["PTEDUCAT"]),
        }

        if has_stage2 or has_stage3:
            patient["APOE4"] = float(data.get("APOE4", 0))

        if has_stage3:
            for pf in plasma_fields:
                val = data.get(pf)
                patient[pf] = float(val) if val is not None else np.nan

        # -- Choose stage and run prediction ---
        if has_stage3:
            stage = 3
        elif has_stage2:
            stage = 2
        else:
            stage = 1

        result = mirai.predict(patient, stage=stage)

        # Enrich response with compassionate messaging
        prob = result["risk_probability"]
        if prob < 0.30:
            tier = "low"
            message = (
                "Your screening profile suggests a low risk of Alzheimer's at this time. "
                "Keep nurturing your brain health -- stay active, sleep well, and stay connected."
            )
        elif prob < 0.60:
            tier = "moderate"
            message = (
                "Your screening profile suggests a moderate risk. "
                "We'd recommend sharing these results with your healthcare provider "
                "for a fuller conversation. Early awareness is a powerful tool."
            )
        else:
            tier = "high"
            message = (
                "Your screening profile suggests elevated risk. This is not a diagnosis -- "
                "it's an invitation to speak with your doctor. Early consultation can open "
                "the door to monitoring and care options that make a real difference."
            )

        return jsonify({
            "stage": result["stage"],
            "risk_probability": round(prob * 100, 1),   # return as percentage
            "risk_category": result["risk_category"],
            "risk_tier": tier,
            "message": message,
        })

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500


# -- ASI:One Chatbot Endpoint ---
ASI_ONE_API_KEY = os.environ.get("ASI_ONE_API_KEY", "")
ASI_ONE_URL = "https://api.asi1.ai/v1/chat/completions"


@app.route("/chat", methods=["POST"])
def chat():
    """
    AI chatbot powered by ASI:One.
    Accepts { "message": "...", "screening_context": {...} }
    Returns { "reply": "..." }
    """
    try:
        data = request.get_json(force=True)
        user_msg = data.get("message", "").strip()
        context = data.get("screening_context", {})

        if not user_msg:
            return jsonify({"error": "Empty message."}), 400

        if not ASI_ONE_API_KEY:
            return jsonify({"error": "ASI:One API key not configured."}), 500

        system_prompt = (
            "You are MirAI Assistant, an Alzheimer's disease screening support chatbot. "
            "You help clinicians and patients understand their MirAI screening results. "
            "You do NOT diagnose — you explain risk factors, biomarkers, next steps, "
            "and provide emotional support. Be compassionate and concise. "
            "If asked about emergencies, direct them to the Alzheimer's Association "
            "24/7 Helpline: 1-800-272-3900. "
            f"Current screening result context: {json.dumps(context)}"
        )

        resp = http_requests.post(
            ASI_ONE_URL,
            headers={
                "Authorization": f"Bearer {ASI_ONE_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "asi1-mini",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_msg},
                ],
                "temperature": 0.7,
                "max_tokens": 512,
            },
            timeout=30,
        )

        resp.raise_for_status()
        reply = resp.json()["choices"][0]["message"]["content"]
        return jsonify({"reply": reply})

    except http_requests.exceptions.Timeout:
        return jsonify({"reply": "The AI service is taking too long. Please try again."}), 504
    except http_requests.exceptions.RequestException as e:
        return jsonify({"reply": f"Could not reach AI service: {str(e)}"}), 502
    except Exception as e:
        return jsonify({"reply": f"Chat error: {str(e)}"}), 500


# -- Entry point ---
if __name__ == "__main__":
    print("\n[*] MirAI Web Interface is now running.")
    print("    Open your browser at:  http://127.0.0.1:5000\n")
    app.run(debug=True, port=5000)
