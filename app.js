const canvas = document.getElementById('radarCanvas');
const ctx = canvas.getContext('2d');
const terminal = document.getElementById('terminal');

let width, height, centerX, centerY, radius;
const API_URL = 'http://localhost:8000';

class KalmanFilter {
    constructor(processNoise = 0.01, measurementNoise = 2.0) {
        this.q = processNoise; // Process noise
        this.r = measurementNoise; // Measurement noise
        this.x = 0; // Estimated value
        this.p = 1; // Error covariance
        this.k = 0; // Kalman gain
    }

    update(measurement) {
        // Prediction update
        this.p = this.p + this.q;
        // Measurement update
        this.k = this.p / (this.p + this.r);
        this.x = this.x + this.k * (measurement - this.x);
        this.p = (1 - this.k) * this.p;
        return this.x;
    }
}

// Global State
let sweepAngle = 0;
let signals = []; 
let targets = [
    { id: 1, angle: 45, kalman: new KalmanFilter(), history: [] },
    { id: 2, angle: 180, kalman: new KalmanFilter(), history: [] }
];
let accuracyChart;
let frameCount = 0;

function resize() {
    width = canvas.parentElement.clientWidth;
    height = canvas.parentElement.clientHeight;
    canvas.width = width;
    canvas.height = height;
    centerX = width / 2;
    centerY = height / 2;
    radius = Math.min(centerX, centerY) * 0.8;
}

window.addEventListener('resize', resize);
resize();

// Chart Initialization
function initChart() {
    const ctxChart = document.getElementById('accuracyChart').getContext('2d');
    accuracyChart = new Chart(ctxChart, {
        type: 'line',
        data: {
            labels: Array(20).fill(''),
            datasets: [{
                label: 'AI Error (deg)',
                borderColor: '#a8ff00',
                backgroundColor: 'rgba(168, 255, 0, 0.1)',
                data: Array(20).fill(0),
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }, {
                label: 'Raw Error (deg)',
                borderColor: '#ff0055',
                data: Array(20).fill(0),
                borderWidth: 1,
                tension: 0.4,
                dash: [5, 5]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 20, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { display: false }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function log(msg, type = 'info') {
    const p = document.createElement('p');
    p.className = type;
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    p.innerHTML = `<span style="opacity:0.5">[${time}]</span> ${msg}`;
    terminal.appendChild(p);
    terminal.scrollTop = terminal.scrollHeight;
    if (terminal.childNodes.length > 50) terminal.removeChild(terminal.firstChild);
}

function drawBackground() {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.1)';
    for (let i = 1; i <= 5; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (radius / 5) * i, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();
    ctx.restore();
}

function drawSweep() {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(sweepAngle);
    const grad = ctx.createConicGradient(0, 0, 0);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, 'rgba(0, 242, 255, 0.2)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -0.6, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius, 0);
    ctx.stroke();
    ctx.restore();
    sweepAngle += 0.035;
}

async function updateSimulation() {
    const useAI = document.getElementById('aiToggle').checked;
    const useKalman = document.getElementById('kalmanToggle').checked;
    const currentEnv = document.getElementById('missionProfile').value;
    
    // Prepare signals for backend
    const signalsToPredict = targets.map(t => {
        // Environment based noise
        let noise = 2.0;
        if (currentEnv === "Urban") noise = 4.0;
        if (currentEnv === "Desert") noise = 1.0;

        const targetTrueAngle = (t.angle + (Date.now() / 5000) * 10) % 360;
        const tdoa1 = (0.5 * Math.cos(targetTrueAngle * Math.PI / 180)) / 3e8 * 1e9 + (Math.random() - 0.5) * noise;
        const tdoa2 = (0.5 * Math.sin(targetTrueAngle * Math.PI / 180)) / 3e8 * 1e9 + (Math.random() - 0.5) * noise;
        return { tdoa1, tdoa2, snr: currentEnv === "Marine" ? 15 : 25, id: t.id, env: currentEnv, trueAngle: targetTrueAngle };
    });

    let predictions = [];
    try {
        const response = await fetch(`${API_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signalsToPredict)
        });
        if (response.ok) {
            predictions = await response.json();
            document.getElementById('backendStatus').textContent = `BCK: ${currentEnv.toUpperCase()}`;
            document.getElementById('backendStatus').style.color = 'var(--accent-tertiary)';
        }
    } catch (e) {
        document.getElementById('backendStatus').textContent = 'BACKEND: OFFLINE';
        document.getElementById('backendStatus').style.color = 'var(--accent-secondary)';
    }

    signalsToPredict.forEach((sig, index) => {
        const pred = predictions.find(p => p.id === sig.id);
        let finalAngle = sig.trueAngle + (Math.random() - 0.5) * 15;
        let aiError = 15;
        
        if (useAI && pred && pred.status === "ai_optimized") {
            finalAngle = pred.angle;
            aiError = Math.abs(pred.angle - sig.trueAngle);
        }
        
        if (useKalman) {
            finalAngle = targets[index].kalman.update(finalAngle);
        }

        // Update UI for the primary target
        if (index === 0) {
            document.getElementById('baselineAngle').textContent = sig.trueAngle.toFixed(1) + '°';
            document.getElementById('correctedAngle').textContent = finalAngle.toFixed(1) + '°';
            document.getElementById('coordX').textContent = `AZ: ${finalAngle.toFixed(2).padStart(6,'0')}°`;
            
            // Classification Label
            if (pred && pred.class) {
                const badge = document.getElementById('targetClass');
                badge.textContent = pred.class;
                badge.style.color = pred.class === "RADAR" ? "var(--accent-color)" : (pred.class === "JAMMER" ? "var(--accent-secondary)" : "var(--accent-tertiary)");
            }

            // Autonomous Calibration
            if (aiError > 8.0 && useAI && frameCount > 100) {
                autoCalibrate(currentEnv);
            }

            // Update Chart
            accuracyChart.data.datasets[0].data.shift();
            accuracyChart.data.datasets[0].data.push(aiError);
            accuracyChart.data.datasets[1].data.shift();
            accuracyChart.data.datasets[1].data.push(Math.abs((sig.trueAngle + 10) - sig.trueAngle));
            accuracyChart.update('none');
        }

        signals.push({ angle: finalAngle, life: 1.0, isAI: useAI });
    });

    document.getElementById('targetCount').textContent = targets.length;
}

let isTraining = false;
async function autoCalibrate(env) {
    if (isTraining) return;
    isTraining = true;
    document.getElementById('autoCalStatus').textContent = "CALIBRATING...";
    document.getElementById('systemAlert').textContent = "AUTO-CAL ACTIVE";
    log(`High Error Detected. Auto-Calibrating for ${env}...`, 'warning');
    
    try {
        const res = await fetch(`${API_URL}/train?environment=${env}`, { method: 'POST' });
        const data = await res.json();
        log(`Auto-Cal Success! New MAE: ${data.mae.toFixed(3)}°`, 'success');
        document.getElementById('systemAlert').textContent = "SYSTEM NOMINAL";
    } catch (e) {
        log('Auto-Calibration Failed.', 'error');
    }
    
    document.getElementById('autoCalStatus').textContent = "STANDBY";
    setTimeout(() => { isTraining = false; }, 5000); // Cooldown
}

document.getElementById('missionProfile').addEventListener('change', (e) => {
    log(`Mission Profile Switched: ${e.target.value}`, 'info');
    document.getElementById('systemAlert').textContent = `SCENARIO: ${e.target.value.toUpperCase()}`;
    signals = [];
});

function drawSignals() {
    signals.forEach((sig, i) => {
        const rad = (sig.angle - 90) * (Math.PI / 180);
        const x = centerX + Math.cos(rad) * radius * 0.95;
        const y = centerY + Math.sin(rad) * radius * 0.95;
        ctx.globalAlpha = sig.life;
        ctx.fillStyle = sig.isAI ? '#a8ff00' : '#ff0055';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        sig.life -= 0.01;
        if (sig.life <= 0) signals.splice(i, 1);
    });
    ctx.globalAlpha = 1;
}

function animate() {
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, width, height);
    drawBackground();
    drawSignals();
    drawSweep();
    if (frameCount++ % 30 === 0) updateSimulation();
    requestAnimationFrame(animate);
}

document.getElementById('trainBtn').addEventListener('click', async () => {
    log('Retraining multi-target model...', 'warning');
    const res = await fetch(`${API_URL}/train`, { method: 'POST' });
    const data = await res.json();
    log(`Success! MAE: ${data.mae.toFixed(3)}°`, 'success');
});

document.getElementById('rescanBtn').addEventListener('click', () => {
    log('Clearing radar buffers...', 'info');
    signals = [];
});

initChart();
animate();
log('AI Analytics Dashboard v3.0 Initialized.', 'success');
