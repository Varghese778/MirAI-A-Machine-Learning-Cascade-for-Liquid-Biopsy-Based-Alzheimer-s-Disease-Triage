/**
 * MirAI Application Logic
 * Glassmorphism UI effects, screening wizard, and API integration.
 */

// =============================================================================
// 1. UI EFFECTS & INTERACTIONS
// =============================================================================

// Mobile menu functionality
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        mobileMenuToggle.classList.toggle('active');
        mobileNav.classList.toggle('active');
    });
}

// Close mobile menu when clicking on links
document.querySelectorAll('.mobile-nav a').forEach(link => {
    link.addEventListener('click', () => {
        if (mobileMenuToggle) mobileMenuToggle.classList.remove('active');
        if (mobileNav) mobileNav.classList.remove('active');
    });
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (mobileMenuToggle && mobileNav &&
        !mobileMenuToggle.contains(e.target) && !mobileNav.contains(e.target)) {
        mobileMenuToggle.classList.remove('active');
        mobileNav.classList.remove('active');
    }
});

// Enhanced smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const target = document.querySelector(targetId);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Enhanced header functionality
window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (header) {
        if (window.pageYOffset > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }
});

// Active menu item highlighting
function updateActiveMenuItem() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a, .mobile-nav a');
    let currentSection = '';
    const scrollPos = window.pageYOffset + 100;

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
            currentSection = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSection}`) {
            link.classList.add('active');
        }
    });
}

window.addEventListener('scroll', updateActiveMenuItem);
window.addEventListener('load', updateActiveMenuItem);

// Parallax effect for geometric shapes
window.addEventListener('scroll', () => {
    const shapes = document.querySelectorAll('.shape');
    const scrolled = window.pageYOffset;
    shapes.forEach((shape, index) => {
        const speed = (index + 1) * 0.3;
        shape.style.transform = `translateY(${scrolled * speed}px) rotate(${scrolled * 0.1}deg)`;
    });
});

// Neural lines pulse effect
const neuralLines = document.querySelectorAll('.neural-line');
setInterval(() => {
    neuralLines.forEach((line, index) => {
        setTimeout(() => {
            line.style.opacity = '1';
            line.style.transform = 'scaleX(1.2)';
            setTimeout(() => {
                line.style.opacity = '0.2';
                line.style.transform = 'scaleX(0.5)';
            }, 200);
        }, index * 300);
    });
}, 2000);

// Enhanced particle generation
function createQuantumParticle() {
    const particle = document.createElement('div');
    particle.style.position = 'fixed';
    particle.style.width = Math.random() * 4 + 1 + 'px';
    particle.style.height = particle.style.width;
    particle.style.background = ['#00ffff', '#ff0080', '#8000ff'][Math.floor(Math.random() * 3)];
    particle.style.borderRadius = '50%';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = '100vh';
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '-1';
    particle.style.boxShadow = `0 0 10px ${particle.style.background}`;

    document.body.appendChild(particle);

    const duration = Math.random() * 3000 + 2000;
    const drift = (Math.random() - 0.5) * 200;

    particle.animate([
        { transform: 'translateY(0px) translateX(0px)', opacity: 0 },
        { transform: `translateY(-100vh) translateX(${drift}px)`, opacity: 1 }
    ], {
        duration: duration,
        easing: 'ease-out'
    }).onfinish = () => particle.remove();
}

setInterval(createQuantumParticle, 1500);

// Intersection Observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.timeline-content, .hexagon').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(50px)';
    el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    observer.observe(el);
});


// =============================================================================
// 2. MIRAI SCREENING WIZARD
// =============================================================================

const app = {
    state: {
        wizardStep: 1,
        maxSteps: 3,
        lastResult: null,
    },

    els: {
        wizardSteps: [
            document.getElementById('wizard-step-1'),
            document.getElementById('wizard-step-2'),
            document.getElementById('wizard-step-3')
        ],
        wizardProgress: document.getElementById('wizard-progress-bar'),
        wizardStepCounter: document.getElementById('wizard-step-counter'),
        wizardStepTitle: document.getElementById('wizard-step-title'),
        stageLabels: [
            document.getElementById('stage-label-1'),
            document.getElementById('stage-label-2'),
            document.getElementById('stage-label-3')
        ],
        btnNext: document.getElementById('wizard-btn-next'),
        btnBack: document.getElementById('wizard-btn-back'),
        btnSubmit: document.getElementById('wizard-btn-submit'),
        form: document.getElementById('screening-form'),
        loadingOverlay: document.getElementById('screening-loading'),

        // Toggles
        toggleGenetics: document.getElementById('toggle-genetics'),
        geneticsFields: document.getElementById('genetics-fields'),
        geneticsDisabledMsg: document.getElementById('genetics-disabled-msg'),
        togglePlasma: document.getElementById('toggle-plasma'),
        plasmaFields: document.getElementById('plasma-fields'),
        plasmaDisabledMsg: document.getElementById('plasma-disabled-msg'),

        // Results
        resultsSection: document.getElementById('results'),
    },

    chartInstance: null,

    init() {
        this.bindEvents();
        this.updateWizardUI();
    },

    bindEvents() {
        if (this.els.btnNext) this.els.btnNext.addEventListener('click', () => this.nextStep());
        if (this.els.btnBack) this.els.btnBack.addEventListener('click', () => this.prevStep());
        if (this.els.btnSubmit) this.els.btnSubmit.addEventListener('click', () => this.submitAnalysis());

        // Genetics Toggle
        if (this.els.toggleGenetics) {
            this.els.toggleGenetics.addEventListener('change', (e) => {
                const checked = e.target.checked;
                this.els.geneticsFields.style.display = checked ? 'block' : 'none';
                this.els.geneticsDisabledMsg.style.display = checked ? 'none' : 'block';
                if (!checked) document.getElementById('APOE4').value = "";
            });
        }

        // Plasma Toggle
        if (this.els.togglePlasma) {
            this.els.togglePlasma.addEventListener('change', (e) => {
                const checked = e.target.checked;
                this.els.plasmaFields.style.display = checked ? 'block' : 'none';
                this.els.plasmaDisabledMsg.style.display = checked ? 'none' : 'block';
                if (!checked) {
                    this.els.plasmaFields.querySelectorAll('input').forEach(i => i.value = "");
                }
            });
        }
    },

    // -- Wizard Navigation --
    nextStep() {
        // Validate current step
        const currentContainer = this.els.wizardSteps[this.state.wizardStep - 1];
        const inputs = currentContainer.querySelectorAll('input[required], select[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.value) {
                isValid = false;
                input.classList.add('error');
                input.addEventListener('input', function handler() {
                    this.classList.remove('error');
                    this.removeEventListener('input', handler);
                }, { once: true });
            }
        });

        if (!isValid) return;

        if (this.state.wizardStep < this.state.maxSteps) {
            this.state.wizardStep++;
            this.updateWizardUI();
        }
    },

    prevStep() {
        if (this.state.wizardStep > 1) {
            this.state.wizardStep--;
            this.updateWizardUI();
        }
    },

    updateWizardUI() {
        const step = this.state.wizardStep;
        const total = this.state.maxSteps;

        // Progress bar
        const pct = (step / total) * 100;
        if (this.els.wizardProgress) this.els.wizardProgress.style.width = `${pct}%`;
        if (this.els.wizardStepCounter) this.els.wizardStepCounter.textContent = `Step ${step} of ${total}`;

        const titles = [
            "Stage 1: Demographics",
            "Stage 2: Genetics (APOE4)",
            "Stage 3: Plasma Biomarkers"
        ];
        if (this.els.wizardStepTitle) this.els.wizardStepTitle.textContent = titles[step - 1];

        // Show/hide steps
        this.els.wizardSteps.forEach((s, i) => {
            if (i === step - 1) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });

        // Stage labels
        this.els.stageLabels.forEach((label, i) => {
            label.classList.remove('active', 'completed');
            if (i === step - 1) label.classList.add('active');
            if (i < step - 1) label.classList.add('completed');
        });

        // Button visibility
        if (this.els.btnBack) {
            this.els.btnBack.style.opacity = step === 1 ? '0' : '1';
            this.els.btnBack.style.pointerEvents = step === 1 ? 'none' : 'auto';
        }

        if (step === total) {
            if (this.els.btnNext) this.els.btnNext.style.display = 'none';
            if (this.els.btnSubmit) this.els.btnSubmit.style.display = 'block';
        } else {
            if (this.els.btnNext) this.els.btnNext.style.display = 'block';
            if (this.els.btnSubmit) this.els.btnSubmit.style.display = 'none';
        }
    },

    resetWizard() {
        if (this.els.form) this.els.form.reset();

        // Reset toggles
        if (this.els.toggleGenetics) {
            this.els.toggleGenetics.checked = true;
            this.els.geneticsFields.style.display = 'block';
            this.els.geneticsDisabledMsg.style.display = 'none';
        }
        if (this.els.togglePlasma) {
            this.els.togglePlasma.checked = true;
            this.els.plasmaFields.style.display = 'block';
            this.els.plasmaDisabledMsg.style.display = 'none';
        }

        this.state.wizardStep = 1;
        this.updateWizardUI();

        // Hide results, scroll to screening
        if (this.els.resultsSection) this.els.resultsSection.style.display = 'none';
        document.getElementById('screening').scrollIntoView({ behavior: 'smooth' });
    },

    // -- API Integration --
    async submitAnalysis() {
        const formData = new FormData(this.els.form);
        const payload = {};
        const parseVal = (val) => val === "" || val === null ? null : parseFloat(val);

        // Stage 1
        payload.AGE = parseVal(formData.get('AGE'));
        payload.PTGENDER = formData.get('PTGENDER');
        payload.PTEDUCAT = parseVal(formData.get('PTEDUCAT'));

        // Stage 2
        if (this.els.toggleGenetics && this.els.toggleGenetics.checked && formData.get('APOE4')) {
            payload.APOE4 = parseVal(formData.get('APOE4'));
        }

        // Stage 3
        if (this.els.togglePlasma && this.els.togglePlasma.checked) {
            ['pT217_AB42_F', 'AB42_AB40_F', 'NfL_Q', 'GFAP_Q'].forEach(key => {
                const val = formData.get(key);
                if (val) payload[key] = parseVal(val);
            });
        }

        // Validate essentials
        if (!payload.AGE || !payload.PTGENDER || payload.PTEDUCAT === null) {
            alert("Please complete the required demographics in Step 1.");
            this.state.wizardStep = 1;
            this.updateWizardUI();
            return;
        }

        // Show loading
        if (this.els.loadingOverlay) this.els.loadingOverlay.style.display = 'flex';

        try {
            console.log("MirAI SENDING:", payload);

            const response = await fetch('/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Unknown error during inference.');
            }

            // Slight delay for UX polish
            await new Promise(r => setTimeout(r, 600));

            this.renderResults(result, payload);

            if (this.els.loadingOverlay) this.els.loadingOverlay.style.display = 'none';

            // Show results section and scroll to it
            if (this.els.resultsSection) {
                this.els.resultsSection.style.display = 'block';
                setTimeout(() => {
                    this.els.resultsSection.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }

        } catch (error) {
            console.error("MirAI Inference Error:", error);
            alert("Prediction Failed: " + error.message);
            if (this.els.loadingOverlay) this.els.loadingOverlay.style.display = 'none';
        }
    },

    // -- Results Rendering --
    renderResults(result, inputPayload) {
        this.state.lastResult = result;

        // Classification text + color
        const rClass = document.getElementById('result-classification');
        const rPct = document.getElementById('result-percentage');
        const rHeader = document.getElementById('result-header-bg');

        if (result.risk_tier === 'low') {
            rClass.textContent = "Cognitively Normal (CN)";
            rClass.className = "result-classification risk-low";
            rPct.className = "gauge-value risk-low";
            rHeader.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))';
        } else if (result.risk_tier === 'moderate') {
            rClass.textContent = "Borderline / MCI Risk";
            rClass.className = "result-classification risk-moderate";
            rPct.className = "gauge-value risk-moderate";
            rHeader.style.background = 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.05))';
        } else {
            rClass.textContent = "MCI / Dementia Risk";
            rClass.className = "result-classification risk-high";
            rPct.className = "gauge-value risk-high";
            rHeader.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.05))';
        }

        rPct.textContent = `${result.risk_probability}%`;

        // Stage badge
        document.getElementById('result-stage-badge').textContent = `Stage ${result.stage} Output`;

        // Message
        document.getElementById('result-message').textContent = result.message;

        // Patient sidebar details
        document.getElementById('res-pat-age').textContent = `${inputPayload.AGE} years`;
        document.getElementById('res-pat-sex').textContent = inputPayload.PTGENDER;
        document.getElementById('res-pat-edu').textContent = `${inputPayload.PTEDUCAT} years`;
        document.getElementById('res-pat-apoe').textContent =
            inputPayload.APOE4 !== undefined ? `${inputPayload.APOE4} allele(s)` : 'Not provided';

        // Draw gauge chart
        this.renderGaugeChart(result.risk_probability);
    },

    renderGaugeChart(riskPct) {
        const ctx = document.getElementById('risk-gauge-chart');
        if (!ctx) return;

        if (this.chartInstance) this.chartInstance.destroy();

        let color = '#10B981'; // green
        if (riskPct >= 30 && riskPct < 60) color = '#F59E0B'; // amber
        if (riskPct >= 60) color = '#EF4444'; // red

        this.chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [riskPct, 100 - riskPct],
                    backgroundColor: [color, 'rgba(255, 255, 255, 0.08)'],
                    borderWidth: 0,
                    circumference: 180,
                    rotation: 270
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '80%',
                plugins: {
                    tooltip: { enabled: false },
                    legend: { display: false }
                },
                animation: {
                    animateRotate: true,
                    duration: 1500,
                    easing: 'easeOutQuart'
                }
            }
        });
    }
};

// Initialize MirAI wizard
app.init();

// Expose globally for onclick handlers
window.app = app;
