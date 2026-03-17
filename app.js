const canvas = document.getElementById('radarCanvas');
const ctx = canvas.getContext('2d');
const terminal = document.getElementById('terminal');

let width, height, centerX, centerY, radius;

function resize() {
    width = canvas.parentElement.clientWidth;
    height = canvas.parentElement.clientHeight;
    canvas.width = width;
    canvas.height = height;
    centerX = width / 2;
    centerY = height / 2;
    radius = Math.min(centerX, centerY) * 0.85;
}

window.addEventListener('resize', resize);
resize();

let angle = 0;
let baselineAngle = 45;
let correctedAngle = 38.6;
let sweepAngle = 0;

function log(msg, type = 'info') {
    const p = document.createElement('p');
    p.className = type;
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    p.textContent = `[${time}] ${msg}`;
    terminal.appendChild(p);
    terminal.scrollTop = terminal.scrollHeight;
}

function drawBackground() {
    // Background glow
    const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    grad.addColorStop(0, 'rgba(0, 242, 255, 0.05)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Circles
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (radius / 4) * i, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();

    // Text labels
    ctx.fillStyle = 'rgba(0, 242, 255, 0.4)';
    ctx.font = '10px Courier New';
    ctx.fillText('0°', centerX + radius + 5, centerY);
    ctx.fillText('90°', centerX - 10, centerY + radius + 15);
    ctx.fillText('180°', centerX - radius - 30, centerY);
    ctx.fillText('270°', centerX - 10, centerY - radius - 5);
}

function drawSweep() {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(sweepAngle);

    const sweepGrad = ctx.createConicGradient(0, 0, 0);
    sweepGrad.addColorStop(0, 'transparent');
    sweepGrad.addColorStop(0.1, 'rgba(0, 242, 255, 0.1)');
    sweepGrad.addColorStop(1, 'rgba(0, 242, 255, 0.4)');

    ctx.fillStyle = sweepGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -0.4, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    sweepAngle += 0.02;
}

function drawSignals() {
    // Target Line Baseline (Red-ish)
    const bRad = (baselineAngle - 90) * (Math.PI / 180);
    ctx.strokeStyle = '#ff3e00';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + Math.cos(bRad) * radius, centerY + Math.sin(bRad) * radius);
    ctx.stroke();
    ctx.setLineDash([]);

    // Target Line AI Corrected (Green-ish)
    const cRad = (correctedAngle - 90) * (Math.PI / 180);
    ctx.strokeStyle = '#a8ff00';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#a8ff00';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + Math.cos(cRad) * radius, centerY + Math.sin(cRad) * radius);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
}

function animate() {
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawSweep();
    drawSignals();
    requestAnimationFrame(animate);
}

// Random data simulation
setInterval(() => {
    baselineAngle += (Math.random() - 0.5) * 2;
    correctedAngle = baselineAngle - 6.4 + (Math.random() - 0.5) * 0.5;
    
    document.getElementById('baselineAngle').textContent = baselineAngle.toFixed(2) + '°';
    document.getElementById('correctedAngle').textContent = correctedAngle.toFixed(2) + '°';
    document.getElementById('rmsError').textContent = '±' + (1.2 + Math.random() * 0.3).toFixed(2) + '°';
}, 2000);

document.getElementById('rescanBtn').addEventListener('click', () => {
    log('Forcing deep packet inspection...', 'warning');
    log('Recalibrating multipath filter...', 'info');
    setTimeout(() => log('AI optimization recalculated.', 'success'), 1000);
});

animate();
log('Dashboard initialized.', 'success');
log('Awaiting telemetry stream...', 'info');
