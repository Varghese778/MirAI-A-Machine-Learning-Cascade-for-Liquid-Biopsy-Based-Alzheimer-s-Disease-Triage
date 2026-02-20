/**
 * MirAI Web App — app.js
 * Manages step navigation, async prediction fetch,
 * loading animation, and compassionate result display.
 */

(function () {
    "use strict";

    /* ── State ─────────────────────────────────────────────────── */
    let currentStep = 1;
    const TOTAL_STEPS = 3;
    let geneticsSkipped = false;

    /* ── DOM refs ───────────────────────────────────────────────── */
    const form = document.getElementById("screening-form");
    const progressFill = document.getElementById("progress-fill");
    const stepDots = document.querySelectorAll(".step-dot");
    const loadingPanel = document.getElementById("loading-panel");
    const resultPanel = document.getElementById("result-panel");

    /* Step navigation buttons */
    const next1Btn = document.getElementById("next-1");
    const next2Btn = document.getElementById("next-2");
    const back1Btn = document.getElementById("back-1");
    const back2Btn = document.getElementById("back-2");
    const skipGenBtn = document.getElementById("skip-genetics");
    const restartBtn = document.getElementById("restart-btn");

    /* Result elements */
    const resultIcon = document.getElementById("result-icon");
    const resultCat = document.getElementById("result-category");
    const resultMsg = document.getElementById("result-message");
    const resultStage = document.getElementById("result-stage");
    const gaugeArc = document.getElementById("gauge-arc");
    const gaugeNeedle = document.getElementById("gauge-needle");
    const gaugeValue = document.getElementById("gauge-value");

    /* ── Helpers ────────────────────────────────────────────────── */

    /** Show step n, hide all others, update progress indicators */
    function goToStep(n) {
        document.querySelectorAll(".step-panel").forEach(panel => {
            panel.classList.remove("active");
        });
        const target = document.getElementById(`step-${n}`);
        if (target) {
            target.classList.add("active");
        }

        // Update progress bar
        progressFill.style.width = `${(n / TOTAL_STEPS) * 100}%`;

        // Update dots
        stepDots.forEach(dot => {
            const s = parseInt(dot.dataset.step, 10);
            dot.classList.remove("active", "done");
            if (s === n) dot.classList.add("active");
            if (s < n) dot.classList.add("done");
        });

        currentStep = n;
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    /** Validate required fields in a given step panel.
     *  Returns true if valid, else highlights the field and returns false. */
    function validateStep(stepNum) {
        const panel = document.getElementById(`step-${stepNum}`);
        const required = panel.querySelectorAll("[required]");
        let valid = true;

        required.forEach(el => {
            el.style.borderColor = "";
            if (!el.value || el.value === "") {
                el.style.borderColor = "var(--risk-high)";
                el.focus();
                valid = false;
            }
        });

        return valid;
    }

    /** Read all form data into a plain object */
    function collectFormData() {
        const data = {};

        // ── Stage 1 ────────────────────────────────────────────────
        data.AGE = parseFloat(document.getElementById("age").value) || null;
        data.PTGENDER = document.getElementById("gender").value || null;
        data.PTEDUCAT = parseFloat(document.getElementById("education").value) || null;

        // ── Stage 2 ────────────────────────────────────────────────
        if (!geneticsSkipped) {
            const apoeChecked = document.querySelector('input[name="APOE4"]:checked');
            data.APOE4 = apoeChecked ? parseFloat(apoeChecked.value) : null;
        } else {
            data.APOE4 = null;
        }

        // ── Stage 3 plasma biomarkers (all optional) ───────────────
        const plasmaMap = {
            AB42_F: "ab42",
            AB40_F: "ab40",
            AB42_AB40_F: "ab4240",
            pT217_AB42_F: "pt217",
            NfL_Q: "nfl",
            GFAP_Q: "gfap",
        };

        Object.entries(plasmaMap).forEach(([key, id]) => {
            const el = document.getElementById(id);
            const val = el ? el.value.trim() : "";
            data[key] = val !== "" ? parseFloat(val) : null;
        });

        return data;
    }

    /* ── Gauge animation ────────────────────────────────────────── */

    /**
     * Animates the SVG arc gauge.
     * The gauge is a semicircle (path from 20,100 to 180,100 via top).
     * Full arc length ≈ π × 80 ≈ 251.2
     */
    function animateGauge(percent, tier) {
        const ARC_LEN = 251.2;

        // stroke-dashoffset: 251.2 = empty, 0 = full
        const offset = ARC_LEN - (percent / 100) * ARC_LEN;
        gaugeArc.style.strokeDashoffset = offset;

        // Colour by tier
        const colours = { low: "#5aab6e", moderate: "#e4a44a", high: "#c9504a" };
        gaugeArc.style.stroke = colours[tier] || colours.moderate;

        // Needle: -90° = left (0%), 0° = top (50%), +90° = right (100%)
        const angle = -90 + (percent / 100) * 180;
        gaugeNeedle.style.transform = `rotate(${angle}deg)`;

        // Counter
        let current = 0;
        const step = percent / 60; // ~60 frames
        const timer = setInterval(() => {
            current = Math.min(current + step, percent);
            gaugeValue.textContent = `${current.toFixed(1)}%`;
            if (current >= percent) clearInterval(timer);
        }, 16);
    }

    /* ── Result rendering ───────────────────────────────────────── */
    function showResult(data) {
        // Hide loading, show result
        loadingPanel.classList.add("hidden");
        resultPanel.classList.remove("hidden");

        const tier = data.risk_tier;   // "low" | "moderate" | "high"
        const prob = data.risk_probability; // 0‒100

        // Icon
        const icons = { low: "🌿", moderate: "🌤️", high: "🔔" };
        resultIcon.textContent = icons[tier] || "🌿";

        // Category text
        const labels = { low: "Low Risk", moderate: "Moderate Risk", high: "Higher Risk" };
        resultCat.textContent = labels[tier] || data.risk_category;
        resultCat.className = `result-category ${tier}`;

        // Message
        resultMsg.textContent = data.message;

        // Stage info
        const stageNames = {
            1: "Stage 1 (Demographics only)",
            2: "Stage 2 (Demographics + Genetics)",
            3: "Stage 3 (Full plasma biomarker panel)",
        };
        resultStage.textContent =
            `Evaluated using ${stageNames[data.stage] || `Stage ${data.stage}`}`;

        // Gauge
        animateGauge(prob, tier);
    }

    /* ── Prediction fetch ───────────────────────────────────────── */
    async function runPrediction() {
        // Hide form, show loading
        form.classList.add("hidden");
        progressFill.style.width = "100%";
        document.getElementById("step-indicator").classList.add("hidden");

        loadingPanel.classList.remove("hidden");

        const payload = collectFormData();

        try {
            const response = await fetch("/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "An unexpected error occurred.");
            }

            showResult(result);

        } catch (err) {
            loadingPanel.classList.add("hidden");
            form.classList.remove("hidden");
            goToStep(currentStep);

            // Surface error gracefully
            alert(`Something went wrong: ${err.message}\n\nPlease check your inputs and try again.`);
            console.error(err);
        }
    }

    /* ── Event listeners ────────────────────────────────────────── */

    // Step 1 → 2
    next1Btn.addEventListener("click", () => {
        if (validateStep(1)) goToStep(2);
    });

    // Step 2 → 3
    next2Btn.addEventListener("click", () => {
        // APOE4 radio is optional if user skipped
        if (!geneticsSkipped) {
            const apoeChecked = document.querySelector('input[name="APOE4"]:checked');
            if (!apoeChecked) {
                // Softly nudge — not a hard block
                if (!confirm("You haven't selected an APOE4 status. Continue without it?")) {
                    return;
                }
                geneticsSkipped = true;
            }
        }
        goToStep(3);
    });

    // Back buttons
    back1Btn.addEventListener("click", () => goToStep(1));
    back2Btn.addEventListener("click", () => goToStep(2));

    // Skip genetics
    skipGenBtn.addEventListener("click", () => {
        geneticsSkipped = true;
        // Clear any APOE selection
        document.querySelectorAll('input[name="APOE4"]').forEach(r => (r.checked = false));
        goToStep(3);
    });

    // Form submit
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        runPrediction();
    });

    // Restart
    restartBtn.addEventListener("click", () => {
        form.reset();
        geneticsSkipped = false;

        resultPanel.classList.add("hidden");
        loadingPanel.classList.add("hidden");
        form.classList.remove("hidden");
        document.getElementById("step-indicator").classList.remove("hidden");

        // Reset gauge
        gaugeArc.style.strokeDashoffset = "251.2";
        gaugeNeedle.style.transform = "rotate(-90deg)";
        gaugeValue.textContent = "0%";

        goToStep(1);
    });

    /* ── Keyboard accessibility ─────────────────────────────────── */
    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            if (currentStep === 1) next1Btn.click();
            else if (currentStep === 2) next2Btn.click();
        }
    });

    /* ── Init ───────────────────────────────────────────────────── */
    goToStep(1);

})();
