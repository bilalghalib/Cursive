/**
 * Handwriting Training Module
 * Collects user's handwriting samples and analyzes their unique style
 */

// Training prompts - start with common letters, then words
const trainingPrompts = [
    // Lowercase letters (most common)
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
    { type: 'letter', text: 'x', samples: 3 },
    { type: 'letter', text: 'j', samples: 3 },
    { type: 'letter', text: 'q', samples: 3 },
    { type: 'letter', text: 'z', samples: 3 },

    // Uppercase letters (key ones)
    { type: 'letter', text: 'A', samples: 2 },
    { type: 'letter', text: 'I', samples: 2 },
    { type: 'letter', text: 'T', samples: 2 },

    // Common words to learn connections and flow
    { type: 'word', text: 'the', samples: 2 },
    { type: 'word', text: 'and', samples: 2 },
    { type: 'word', text: 'hello', samples: 2 },

    // Sentence for overall style
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

// Initialize the training interface
function init() {
    canvas = document.getElementById('training-canvas');
    ctx = canvas.getContext('2d');

    // Set up canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Set up drawing
    setupCanvas();

    // Load existing samples if any
    loadSavedSamples();

    // Set up UI
    updatePrompt();
    updateStats();

    // Button handlers
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
    // Pointer events for drawing
    canvas.addEventListener('pointerdown', startDrawing);
    canvas.addEventListener('pointermove', draw);
    canvas.addEventListener('pointerup', stopDrawing);
    canvas.addEventListener('pointerout', stopDrawing);

    // Touch events for mobile
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

    // Hide hint
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

    // Draw the line segment
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

    // Store the completed stroke
    if (currentStroke.length > 2) {
        allStrokes.push({
            points: currentStroke,
            duration: Date.now() - strokeStartTime,
            bounds: calculateBounds(currentStroke)
        });

        // Enable next button once user has drawn something
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
    // Save the current sample
    saveSample();

    currentSampleIndex++;
    const currentPrompt = trainingPrompts[currentPromptIndex];

    // Check if we need more samples for this prompt
    if (currentSampleIndex >= currentPrompt.samples) {
        // Move to next prompt
        currentPromptIndex++;
        currentSampleIndex = 0;

        // Check if training is complete
        if (currentPromptIndex >= trainingPrompts.length) {
            completeTraining();
            return;
        }
    }

    // Update UI for next prompt
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

    // Store the sample with metadata
    collectedSamples[key].push({
        strokes: allStrokes,
        type: currentPrompt.type,
        timestamp: Date.now()
    });

    // Save to localStorage
    localStorage.setItem('handwritingSamples', JSON.stringify(collectedSamples));

    console.log(`Saved sample for "${key}":`, allStrokes.length, 'strokes');
}

function loadSavedSamples() {
    const saved = localStorage.getItem('handwritingSamples');
    if (saved) {
        try {
            collectedSamples = JSON.parse(saved);
            console.log('Loaded saved samples:', Object.keys(collectedSamples).length, 'characters');
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

    // Show sample count
    if (currentSampleIndex > 0) {
        samplesCollected.textContent = `✓ Sample ${currentSampleIndex} of ${currentPrompt.samples} collected`;
        samplesCollected.style.display = 'block';
    } else {
        samplesCollected.style.display = 'none';
    }

    // Update progress bar
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

async function completeTraining() {
    // Analyze the collected samples to extract style parameters
    const styleProfile = analyzeHandwritingStyle();

    // Save style profile
    localStorage.setItem('handwritingStyleProfile', JSON.stringify(styleProfile));

    console.log('Training complete! Style profile:', styleProfile);

    // Show completion message
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
        characterSizes: {},
        timestamp: Date.now()
    };

    const allSampleStrokes = [];
    let totalSlant = 0;
    let slantCount = 0;
    let totalPressure = 0;
    let pressureCount = 0;
    let minPressure = 1;
    let maxPressure = 0;
    let pressureVariances = [];
    let baselineYs = [];

    // Analyze each character's samples
    Object.entries(collectedSamples).forEach(([char, samples]) => {
        samples.forEach(sample => {
            sample.strokes.forEach(stroke => {
                allSampleStrokes.push(stroke);

                // Analyze slant
                if (stroke.points.length > 5) {
                    const slant = calculateSlant(stroke.points);
                    if (!isNaN(slant) && isFinite(slant)) {
                        totalSlant += slant;
                        slantCount++;
                    }
                }

                // Analyze pressure
                stroke.points.forEach(point => {
                    const pressure = point.pressure || 0.5;
                    totalPressure += pressure;
                    pressureCount++;
                    minPressure = Math.min(minPressure, pressure);
                    maxPressure = Math.max(maxPressure, pressure);
                });

                // Analyze baseline
                if (stroke.bounds) {
                    baselineYs.push(stroke.bounds.centerY);
                }
            });
        });
    });

    // Calculate average slant (in degrees)
    if (slantCount > 0) {
        profile.slant = totalSlant / slantCount;
    }

    // Calculate pressure dynamics
    const avgPressure = pressureCount > 0 ? totalPressure / pressureCount : 0.5;
    profile.pressureDynamics = {
        min: minPressure,
        max: maxPressure,
        avg: avgPressure,
        variation: maxPressure - minPressure
    };

    // Calculate baseline variation (messiness indicator)
    if (baselineYs.length > 1) {
        const baselineMean = baselineYs.reduce((a, b) => a + b, 0) / baselineYs.length;
        const baselineVariance = baselineYs.reduce((sum, y) => sum + Math.pow(y - baselineMean, 2), 0) / baselineYs.length;
        profile.baselineVariation = Math.sqrt(baselineVariance);

        // Normalize messiness to 0-1 scale (higher = messier)
        profile.messiness = Math.min(1, profile.baselineVariation / 20);
    }

    // Analyze spacing (based on word samples)
    const wordSamples = Object.entries(collectedSamples)
        .filter(([char, _]) => char.length > 1);

    if (wordSamples.length > 0) {
        // Calculate average letter spacing
        let totalSpacing = 0;
        let spacingCount = 0;

        wordSamples.forEach(([word, samples]) => {
            samples.forEach(sample => {
                if (sample.strokes.length > 1) {
                    // Calculate gaps between strokes
                    for (let i = 1; i < sample.strokes.length; i++) {
                        const prevBounds = sample.strokes[i - 1].bounds;
                        const currBounds = sample.strokes[i].bounds;
                        if (prevBounds && currBounds) {
                            const gap = currBounds.minX - prevBounds.maxX;
                            totalSpacing += gap;
                            spacingCount++;
                        }
                    }
                }
            });
        });

        if (spacingCount > 0) {
            const avgSpacing = totalSpacing / spacingCount;
            // Normalize to multiplier (1.0 = average)
            profile.spacing = Math.max(0.5, Math.min(2.0, avgSpacing / 10));
        }

        // Detect if letters connect (cursive)
        const connectingCount = wordSamples.reduce((count, [word, samples]) => {
            return count + samples.filter(sample => {
                // If strokes overlap or touch, likely cursive
                return sample.strokes.some((stroke, i) => {
                    if (i === 0) return false;
                    const prev = sample.strokes[i - 1].bounds;
                    const curr = stroke.bounds;
                    if (!prev || !curr) return false;
                    return (curr.minX - prev.maxX) < 3; // Very small gap = connected
                });
            }).length;
        }, 0);

        profile.connectLetters = connectingCount > wordSamples.length / 2;
    }

    // Analyze drawing speed
    const speeds = allSampleStrokes
        .map(stroke => {
            if (!stroke.duration || stroke.points.length < 2) return null;
            const distance = calculateStrokeLength(stroke.points);
            return distance / stroke.duration; // pixels per ms
        })
        .filter(s => s !== null && !isNaN(s) && isFinite(s));

    if (speeds.length > 0) {
        const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        if (avgSpeed > 0.5) profile.speed = 'fast';
        else if (avgSpeed < 0.2) profile.speed = 'slow';
        else profile.speed = 'medium';
    }

    return profile;
}

function calculateSlant(points) {
    // Use linear regression to find the angle of the stroke
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
    const angle = Math.atan(slope) * (180 / Math.PI);

    return angle;
}

function calculateStrokeLength(points) {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i - 1].x;
        const dy = points[i].y - points[i - 1].y;
        length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
}

// Export for testing
window.showTestPage = function() {
    window.location.href = '/handwriting-test';
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
