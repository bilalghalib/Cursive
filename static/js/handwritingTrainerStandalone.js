/**
 * Standalone Handwriting Trainer
 * No dependencies on main app - stores directly to localStorage
 */

// Training prompts
const trainingPrompts = [
    { type: 'letter', text: 'a', samples: 3 },
    { type: 'letter', text: 'e', samples: 3 },
    { type: 'letter', text: 'i', samples: 3 },
    { type: 'letter', text: 'o', samples: 3 },
    { type: 'letter', text: 'n', samples: 3 },
    { type: 'letter', text: 't', samples: 3 },
    { type: 'letter', text: 's', samples: 3 },
    { type: 'letter', text: 'r', samples: 3 },
    { type: 'letter', text: 'h', samples: 3 },
    { type: 'letter', text: 'l', samples: 3 },
    { type: 'letter', text: 'd', samples: 3 },
    { type: 'letter', text: 'c', samples: 3 },
    { type: 'letter', text: 'u', samples: 3 },
    { type: 'letter', text: 'm', samples: 3 },
    { type: 'letter', text: 'p', samples: 3 },
    { type: 'letter', text: 'f', samples: 3 },
    { type: 'letter', text: 'g', samples: 3 },
    { type: 'letter', text: 'b', samples: 3 },
    { type: 'letter', text: 'y', samples: 3 },
    { type: 'letter', text: 'w', samples: 3 },
    { type: 'letter', text: 'v', samples: 3 },
    { type: 'letter', text: 'k', samples: 3 },
    { type: 'letter', text: 'x', samples: 2 },
    { type: 'letter', text: 'j', samples: 2 },
    { type: 'letter', text: 'q', samples: 2 },
    { type: 'letter', text: 'z', samples: 2 },
    { type: 'word', text: 'the', samples: 2 },
    { type: 'word', text: 'and', samples: 2 },
    { type: 'word', text: 'hello', samples: 2 },
    { type: 'sentence', text: 'The quick brown fox', samples: 1 }
];

let canvas, ctx;
let currentPromptIndex = 0;
let currentSampleIndex = 0;
let isDrawing = false;
let currentStroke = [];
let allStrokes = [];
let collectedSamples = {};
let strokeStartTime = 0;
let lastPointTime = 0;

function init() {
    console.log('✍️ Initializing standalone handwriting trainer...');

    canvas = document.getElementById('training-canvas');
    ctx = canvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    setupCanvas();
    loadSavedSamples();
    updatePrompt();
    updateStats();

    document.getElementById('clear-btn').addEventListener('click', clearCanvas);
    document.getElementById('next-btn').addEventListener('click', nextSample);
    document.getElementById('skip-btn').addEventListener('click', skipPrompt);
}

function resizeCanvas() {
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width - 20;
    canvas.height = 400;
    redrawCanvas();
}

function setupCanvas() {
    canvas.addEventListener('pointerdown', startDrawing);
    canvas.addEventListener('pointermove', draw);
    canvas.addEventListener('pointerup', stopDrawing);
    canvas.addEventListener('pointerout', stopDrawing);
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    canvas.addEventListener('touchend', stopDrawing, { passive: false });
    canvas.style.touchAction = 'none';
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;

    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const pressure = touch.force || 0.5;

    if (e.type === 'touchstart') {
        startDrawing({ offsetX: x, offsetY: y, pressure });
    } else if (e.type === 'touchmove') {
        draw({ offsetX: x, offsetY: y, pressure });
    }
}

function startDrawing(e) {
    isDrawing = true;
    currentStroke = [];
    strokeStartTime = Date.now();
    lastPointTime = strokeStartTime;

    const point = {
        x: e.offsetX,
        y: e.offsetY,
        pressure: e.pressure || 0.5,
        timestamp: strokeStartTime
    };

    currentStroke.push(point);
    document.getElementById('canvas-hint').style.display = 'none';
}

function draw(e) {
    if (!isDrawing) return;

    const now = Date.now();
    const point = {
        x: e.offsetX,
        y: e.offsetY,
        pressure: e.pressure || 0.5,
        timestamp: now,
        timeSinceLastPoint: now - lastPointTime
    };

    currentStroke.push(point);
    lastPointTime = now;

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2 + (point.pressure * 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentStroke.length > 1) {
        const prevPoint = currentStroke[currentStroke.length - 2];
        ctx.beginPath();
        ctx.moveTo(prevPoint.x, prevPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
    }
}

function stopDrawing(e) {
    if (!isDrawing) return;
    isDrawing = false;

    if (currentStroke.length > 2) {
        allStrokes.push({
            points: currentStroke,
            duration: Date.now() - strokeStartTime,
            bounds: calculateBounds(currentStroke)
        });
        document.getElementById('next-btn').disabled = false;
    }

    currentStroke = [];
}

function calculateBounds(stroke) {
    if (stroke.length === 0) return null;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    stroke.forEach(point => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    });

    return {
        minX, minY, maxX, maxY,
        width: maxX - minX,
        height: maxY - minY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2
    };
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    allStrokes = [];
    currentStroke = [];
    document.getElementById('next-btn').disabled = true;
    document.getElementById('canvas-hint').style.display = 'block';
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    allStrokes.forEach(stroke => {
        stroke.points.forEach((point, i) => {
            if (i === 0) return;

            const prevPoint = stroke.points[i - 1];
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2 + (point.pressure * 2);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(prevPoint.x, prevPoint.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
        });
    });
}

function nextSample() {
    saveSample();

    currentSampleIndex++;
    const currentPrompt = trainingPrompts[currentPromptIndex];

    if (currentSampleIndex >= currentPrompt.samples) {
        currentPromptIndex++;
        currentSampleIndex = 0;

        if (currentPromptIndex >= trainingPrompts.length) {
            completeTraining();
            return;
        }
    }

    clearCanvas();
    updatePrompt();
    updateStats();
    document.getElementById('next-btn').disabled = true;
}

function skipPrompt() {
    currentPromptIndex++;
    currentSampleIndex = 0;

    if (currentPromptIndex >= trainingPrompts.length) {
        completeTraining();
        return;
    }

    clearCanvas();
    updatePrompt();
    updateStats();
    document.getElementById('next-btn').disabled = true;
}

function saveSample() {
    if (allStrokes.length === 0) return;

    const currentPrompt = trainingPrompts[currentPromptIndex];
    const key = currentPrompt.text;

    if (!collectedSamples[key]) {
        collectedSamples[key] = [];
    }

    collectedSamples[key].push({
        strokes: allStrokes,
        type: currentPrompt.type,
        timestamp: Date.now()
    });

    // Save directly to localStorage (standalone - no Supabase)
    localStorage.setItem('handwritingSamples', JSON.stringify(collectedSamples));
    console.log(`✅ Saved sample for "${key}":`, allStrokes.length, 'strokes');
}

function loadSavedSamples() {
    const saved = localStorage.getItem('handwritingSamples');
    if (saved) {
        try {
            collectedSamples = JSON.parse(saved);
            console.log('✅ Loaded saved samples:', Object.keys(collectedSamples).length, 'characters');
        } catch (e) {
            console.error('Error loading saved samples:', e);
            collectedSamples = {};
        }
    }
}

function updatePrompt() {
    const currentPrompt = trainingPrompts[currentPromptIndex];
    const promptText = document.getElementById('prompt-text');
    const sampleDisplay = document.getElementById('sample-display');
    const promptInstruction = document.getElementById('prompt-instruction');
    const samplesCollected = document.getElementById('samples-collected');

    if (currentPrompt.type === 'letter') {
        promptText.textContent = 'Write the letter:';
        promptInstruction.textContent = `Write it ${currentPrompt.samples} times naturally, with slight variations`;
    } else if (currentPrompt.type === 'word') {
        promptText.textContent = 'Write the word:';
        promptInstruction.textContent = `Write it ${currentPrompt.samples} times to help me learn letter connections`;
    } else {
        promptText.textContent = 'Write this sentence:';
        promptInstruction.textContent = 'Write it naturally to capture your overall writing flow';
    }

    sampleDisplay.textContent = currentPrompt.text;

    if (currentSampleIndex > 0) {
        samplesCollected.textContent = `✓ Sample ${currentSampleIndex} of ${currentPrompt.samples} collected`;
        samplesCollected.style.display = 'block';
    } else {
        samplesCollected.style.display = 'none';
    }

    const progress = (currentPromptIndex / trainingPrompts.length) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';
}

function updateStats() {
    const charsLearned = Object.keys(collectedSamples).length;
    const totalSamples = Object.values(collectedSamples).reduce((sum, samples) => sum + samples.length, 0);
    const completion = Math.round((currentPromptIndex / trainingPrompts.length) * 100);

    document.getElementById('chars-learned').textContent = charsLearned;
    document.getElementById('total-samples').textContent = totalSamples;
    document.getElementById('completion-percent').textContent = completion + '%';
}

function completeTraining() {
    const styleProfile = analyzeHandwritingStyle();

    // Save directly to localStorage (standalone)
    localStorage.setItem('handwritingStyleProfile', JSON.stringify(styleProfile));

    console.log('🎉 Training complete! Style profile:', styleProfile);

    document.querySelector('.prompt-box').style.display = 'none';
    document.querySelector('.canvas-container').style.display = 'none';
    document.querySelector('.button-group').style.display = 'none';
    document.getElementById('completion-message').style.display = 'block';
}

function analyzeHandwritingStyle() {
    const profile = {
        slant: 0,
        spacing: 1.0,
        messiness: 0,
        baselineVariation: 0,
        pressureDynamics: { min: 0, max: 1, avg: 0.5, variation: 0 },
        speed: 'medium',
        connectLetters: false,
        timestamp: Date.now()
    };

    const allSampleStrokes = [];
    let totalSlant = 0, slantCount = 0;
    let totalPressure = 0, pressureCount = 0;
    let minPressure = 1, maxPressure = 0;
    let baselineYs = [];

    Object.entries(collectedSamples).forEach(([char, samples]) => {
        samples.forEach(sample => {
            sample.strokes.forEach(stroke => {
                allSampleStrokes.push(stroke);

                if (stroke.points.length > 5) {
                    const slant = calculateSlant(stroke.points);
                    if (!isNaN(slant) && isFinite(slant)) {
                        totalSlant += slant;
                        slantCount++;
                    }
                }

                stroke.points.forEach(point => {
                    const pressure = point.pressure || 0.5;
                    totalPressure += pressure;
                    pressureCount++;
                    minPressure = Math.min(minPressure, pressure);
                    maxPressure = Math.max(maxPressure, pressure);
                });

                if (stroke.bounds) {
                    baselineYs.push(stroke.bounds.centerY);
                }
            });
        });
    });

    if (slantCount > 0) {
        profile.slant = totalSlant / slantCount;
    }

    const avgPressure = pressureCount > 0 ? totalPressure / pressureCount : 0.5;
    profile.pressureDynamics = {
        min: minPressure,
        max: maxPressure,
        avg: avgPressure,
        variation: maxPressure - minPressure
    };

    if (baselineYs.length > 1) {
        const baselineMean = baselineYs.reduce((a, b) => a + b, 0) / baselineYs.length;
        const baselineVariance = baselineYs.reduce((sum, y) => sum + Math.pow(y - baselineMean, 2), 0) / baselineYs.length;
        profile.baselineVariation = Math.sqrt(baselineVariance);
        profile.messiness = Math.min(1, profile.baselineVariation / 20);
    }

    return profile;
}

function calculateSlant(points) {
    if (points.length < 2) return 0;

    const n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    points.forEach(p => {
        sumX += p.x;
        sumY += p.y;
        sumXY += p.x * p.y;
        sumX2 += p.x * p.x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return Math.atan(slope) * (180 / Math.PI);
}

window.showTestPage = function() {
    window.location.href = '/handwriting-test.html';
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
