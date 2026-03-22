const canvas = document.getElementById('radarCanvas');
const ctx = canvas.getContext('2d');
const terminal = document.getElementById('terminal');

let width, height, centerX, centerY, radius;
const API_URL = 'http://localhost:8000';

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

let sweepAngle = 0;
let signals = []; // Array of {angle, intensity, life, isCorrected}
let currentData = {
    baseline: 0,
    corrected: 0,
    rms: 0,
    tdoa: 0,
    snr: 30,
    noise: 1.5
};

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
    
    // Grid
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (radius / 5) * i, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Axes
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();

    // Compass
    ctx.fillStyle = 'rgba(0, 242, 255, 0.3)';
    ctx.font = '700 12px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText('N (0°)', centerX, centerY - radius - 15);
    ctx.fillText('E (90°)', centerX + radius + 25, centerY + 5);
    ctx.fillText('S (180°)', centerX, centerY + radius + 25);
    ctx.fillText('W (270°)', centerX - radius - 30, centerY + 5);
    
    ctx.restore();
}

function drawSweep() {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(sweepAngle);

    const grad = ctx.createConicGradient(0, 0, 0);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.1, 'rgba(0, 242, 255, 0.05)');
    grad.addColorStop(1, 'rgba(0, 242, 255, 0.3)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -0.6, 0);
    ctx.fill();

    // Leading edge
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius, 0);
    ctx.stroke();

    ctx.restore();
    sweepAngle += 0.035;
}

function updateTelemetryUI() {
    document.getElementById('baselineAngle').textContent = currentData.baseline.toFixed(2) + '°';
    document.getElementById('correctedAngle').textContent = currentData.corrected.toFixed(2) + '°';
    document.getElementById('rmsError').textContent = '±' + currentData.rms.toFixed(2) + '°';
    document.getElementById('snrValue').textContent = currentData.snr.toFixed(1);
    document.getElementById('rawTdoa').textContent = currentData.tdoa.toFixed(3) + ' ns';
    document.getElementById('coordX').textContent = `AZ: ${currentData.corrected.toFixed(2).padStart(6, '0')}°`;
}

async function fetchAIPrediction(tdoa1, tdoa2, snr) {
    try {
        const response = await fetch(`${API_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tdoa1, tdoa2, snr })
        });
        if (!response.ok) throw new Error('API Offline');
        return await response.json();
    } catch (err) {
        return null; // Fallback handled in simulation
    }
}

// Simulation loop
setInterval(async () => {
    // Simulate real signal environment
    const targetAngle = (Date.now() / 10000 % 1) * 360; // Moving target
    const noise = 1.5;
    const snr = 20 + Math.random() * 15;
    
    // Geometric approximation (noisy)
    const tdoa1 = (0.5 * Math.cos(targetAngle * Math.PI / 180)) / 3e8 * 1e9 + (Math.random() - 0.5) * noise;
    const tdoa2 = (0.5 * Math.sin(targetAngle * Math.PI / 180)) / 3e8 * 1e9 + (Math.random() - 0.5) * noise;
    
    const apiResult = await fetchAIPrediction(tdoa1, tdoa2, snr);
    
    currentData.baseline = (targetAngle + (Math.random() - 0.5) * 15) % 360;
    currentData.tdoa = tdoa1;
    currentData.snr = snr;

    if (apiResult && apiResult.status === "ai_optimized") {
        currentData.corrected = apiResult.angle;
        currentData.rms = apiResult.rms_error;
    } else {
        // Untrained fallback logic
        currentData.corrected = currentData.baseline;
        currentData.rms = 10.0;
    }

    // Add to radar signals
    signals.push({ angle: currentData.baseline, intensity: 0.4, life: 1.0, isCorrected: false });
    signals.push({ angle: currentData.corrected, intensity: 1.0, life: 1.0, isCorrected: true });

    updateTelemetryUI();
}, 500);

function drawSignals() {
    signals.forEach((sig, index) => {
        const rad = (sig.angle - 90) * (Math.PI / 180);
        const x = centerX + Math.cos(rad) * radius * 0.95;
        const y = centerY + Math.sin(rad) * radius * 0.95;

        ctx.globalAlpha = sig.life * sig.intensity;
        ctx.fillStyle = sig.isCorrected ? '#a8ff00' : '#ff0055';
        
        ctx.beginPath();
        ctx.arc(x, y, sig.isCorrected ? 4 : 2, 0, Math.PI * 2);
        ctx.fill();

        if (sig.isCorrected) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#a8ff00';
            ctx.strokeStyle = '#a8ff00';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        sig.life -= 0.01;
        if (sig.life <= 0) signals.splice(index, 1);
    });
    ctx.globalAlpha = 1;
}

function animate() {
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, width, height);
    drawBackground();
    drawSignals();
    drawSweep();
    requestAnimationFrame(animate);
}

document.getElementById('rescanBtn').addEventListener('click', () => {
    log('Resetting digital signal filters...', 'warning');
    signals = [];
    setTimeout(() => log('Filters re-initialized. Recalibrating...', 'info'), 500);
});

document.getElementById('trainBtn').addEventListener('click', async () => {
    log('Initiating AI Retraining Sequence...', 'warning');
    const btn = document.getElementById('trainBtn');
    btn.disabled = true;
    try {
        const res = await fetch(`${API_URL}/train`, { method: 'POST' });
        const data = await res.json();
        log(`Training successful! MAE: ${data.mae.toFixed(3)}°`, 'success');
    } catch (err) {
        log('Training failed: Backend offline.', 'error');
    }
    btn.disabled = false;
});

animate();
log('AI Correction Engine Online.', 'success');
log('Awaiting signal synchronization...', 'info');
