/**
 * Handwriting Synthesis Engine
 * Combines user samples with learned style parameters to generate new text
 */

/**
 * Load user's handwriting samples and style profile
 */
export function loadUserHandwriting() {
    const samplesJson = localStorage.getItem('handwritingSamples');
    const profileJson = localStorage.getItem('handwritingStyleProfile');

    if (!samplesJson || !profileJson) {
        return null;
    }

    try {
        return {
            samples: JSON.parse(samplesJson),
            profile: JSON.parse(profileJson)
        };
    } catch (e) {
        console.error('Error loading handwriting data:', e);
        return null;
    }
}

/**
 * Check if user has trained their handwriting
 */
export function hasHandwritingSamples() {
    return loadUserHandwriting() !== null;
}

/**
 * Convert text to stroke arrays using user's handwriting
 * @param {string} text - Text to convert
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position
 * @param {Object} options - Synthesis options
 * @returns {Array} Array of stroke objects compatible with canvasManager
 */
export function textToStrokes(text, startX, startY, options = {}) {
    const handwriting = loadUserHandwriting();

    if (!handwriting) {
        console.warn('No handwriting samples found. User needs to train first.');
        return [];
    }

    const { samples, profile } = handwriting;
    const strokes = [];

    let cursorX = startX;
    let cursorY = startY;
    const lineHeight = options.lineHeight || 40;
    const maxWidth = options.maxWidth || 600;

    // Apply style variation if provided (from LLM)
    const styleVariation = options.styleVariation || {};
    const effectiveProfile = applyStyleVariation(profile, styleVariation);

    // Split text into words
    const words = text.split(' ');

    words.forEach((word, wordIndex) => {
        const wordStrokes = synthesizeWord(
            word,
            cursorX,
            cursorY,
            samples,
            effectiveProfile
        );

        // Check if word fits on current line
        const wordWidth = getStrokesWidth(wordStrokes);

        if (cursorX + wordWidth > startX + maxWidth && wordIndex > 0) {
            // Move to next line
            cursorX = startX;
            cursorY += lineHeight;

            // Re-synthesize word at new position
            wordStrokes.length = 0;
            wordStrokes.push(...synthesizeWord(
                word,
                cursorX,
                cursorY,
                samples,
                effectiveProfile
            ));
        }

        strokes.push(...wordStrokes);
        cursorX += wordWidth + (effectiveProfile.spacing * 10);
    });

    return strokes;
}

/**
 * Synthesize a single word from character samples
 */
function synthesizeWord(word, startX, startY, samples, profile) {
    const strokes = [];
    let cursorX = startX;

    for (let i = 0; i < word.length; i++) {
        const char = word[i];
        const charStrokes = synthesizeCharacter(
            char,
            cursorX,
            startY,
            samples,
            profile,
            i
        );

        if (charStrokes.length === 0) {
            // Character not found in samples, use placeholder
            console.warn(`Character '${char}' not found in samples`);
            cursorX += 10; // Placeholder spacing
            continue;
        }

        strokes.push(...charStrokes);

        // Calculate character width
        const charWidth = getStrokesWidth(charStrokes);
        cursorX += charWidth + (profile.spacing * 5);

        // Add connector stroke if cursive
        if (profile.connectLetters && i < word.length - 1) {
            const connector = createConnectorStroke(
                charStrokes[charStrokes.length - 1],
                cursorX,
                startY,
                profile
            );
            if (connector) {
                strokes.push(connector);
            }
        }
    }

    return strokes;
}

/**
 * Synthesize a single character
 */
function synthesizeCharacter(char, x, y, samples, profile, charIndex) {
    const charSamples = samples[char];

    if (!charSamples || charSamples.length === 0) {
        return [];
    }

    // Pick a random sample
    const sampleIndex = Math.floor(Math.random() * charSamples.length);
    const sample = charSamples[sampleIndex];

    // Clone and transform the strokes
    const transformedStrokes = sample.strokes.map(stroke => {
        return transformStroke(stroke, x, y, profile, charIndex);
    });

    return transformedStrokes;
}

/**
 * Transform a stroke to a new position with style variation
 */
function transformStroke(stroke, targetX, targetY, profile, charIndex) {
    const bounds = stroke.bounds;
    if (!bounds) return stroke;

    // Calculate offset from original position
    const offsetX = targetX - bounds.minX;
    const offsetY = targetY - bounds.minY;

    // Apply baseline variation (messiness)
    const baselineJitter = (Math.random() - 0.5) * profile.baselineVariation * 2;

    // Apply slant
    const slantRadians = (profile.slant * Math.PI) / 180;

    // Create new stroke with transformed points
    const newPoints = stroke.points.map((point, i) => {
        // Apply translation
        let newX = point.x + offsetX;
        let newY = point.y + offsetY + baselineJitter;

        // Apply slant (skew transform)
        const relativeY = newY - targetY;
        newX += relativeY * Math.tan(slantRadians);

        // Add character-level jitter
        const jitterAmount = profile.messiness * 0.5;
        newX += (Math.random() - 0.5) * jitterAmount;
        newY += (Math.random() - 0.5) * jitterAmount;

        // Apply pressure variation
        let pressure = point.pressure || 0.5;
        pressure *= (1 + (Math.random() - 0.5) * profile.pressureDynamics.variation);
        pressure = Math.max(0.1, Math.min(1.0, pressure));

        return {
            x: newX,
            y: newY,
            pressure: pressure,
            timestamp: point.timestamp
        };
    });

    return newPoints;
}

/**
 * Create a connector stroke between characters (for cursive)
 */
function createConnectorStroke(lastStroke, nextX, nextY, profile) {
    if (!lastStroke || lastStroke.length === 0) return null;

    const startPoint = lastStroke[lastStroke.length - 1];
    const endPoint = { x: nextX, y: nextY };

    // Create a smooth bezier curve connector
    const controlPoint = {
        x: (startPoint.x + endPoint.x) / 2,
        y: (startPoint.y + endPoint.y) / 2 - 5, // Slight lift
        pressure: 0.3
    };

    return [
        startPoint,
        controlPoint,
        endPoint
    ];
}

/**
 * Calculate the width of a collection of strokes
 */
function getStrokesWidth(strokes) {
    if (strokes.length === 0) return 0;

    let minX = Infinity;
    let maxX = -Infinity;

    strokes.forEach(stroke => {
        stroke.forEach(point => {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
        });
    });

    return maxX - minX;
}

/**
 * Apply LLM-suggested style variation to base profile
 * @param {Object} baseProfile - User's learned style
 * @param {Object} variation - LLM-suggested variations
 * @returns {Object} Modified profile
 */
function applyStyleVariation(baseProfile, variation) {
    const modified = { ...baseProfile };

    // Apply variations
    if (variation.slant !== undefined) {
        modified.slant += variation.slant;
    }

    if (variation.spacing !== undefined) {
        modified.spacing *= variation.spacing;
    }

    if (variation.messiness !== undefined) {
        modified.messiness = Math.max(0, Math.min(1, variation.messiness));
    }

    if (variation.speed !== undefined) {
        modified.speed = variation.speed;
    }

    return modified;
}

/**
 * Streaming writeback - renders text progressively as it arrives
 * @param {string} text - Text to write (can be partial)
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {Function} onStrokeReady - Callback when stroke is ready to render
 * @param {Object} options - Options
 */
export async function streamWriteback(text, x, y, onStrokeReady, options = {}) {
    const handwriting = loadUserHandwriting();

    if (!handwriting) {
        console.warn('No handwriting samples found');
        return;
    }

    const { samples, profile } = handwriting;
    const effectiveProfile = applyStyleVariation(
        profile,
        options.styleVariation || {}
    );

    let cursorX = x;
    let cursorY = y;
    const speed = options.speed || 50; // ms per stroke

    // Split into characters
    const chars = text.split('');

    for (const char of chars) {
        if (char === ' ') {
            cursorX += effectiveProfile.spacing * 12;
            continue;
        }

        if (char === '\n') {
            cursorX = x;
            cursorY += options.lineHeight || 40;
            continue;
        }

        // Synthesize character
        const charStrokes = synthesizeCharacter(
            char,
            cursorX,
            cursorY,
            samples,
            effectiveProfile,
            0
        );

        // Render each stroke with delay
        for (const stroke of charStrokes) {
            await new Promise(resolve => setTimeout(resolve, speed));
            onStrokeReady(stroke);
        }

        // Update cursor
        const charWidth = getStrokesWidth(charStrokes);
        cursorX += charWidth + (effectiveProfile.spacing * 5);
    }
}

/**
 * Parse LLM response with style metadata
 * Expected format:
 * {
 *   "text": "Hello there!",
 *   "style": {"slant": 2, "spacing": 1.1, "messiness": 0.4}
 * }
 */
export function parseLLMResponse(response) {
    try {
        const parsed = JSON.parse(response);
        return {
            text: parsed.text || response,
            styleVariation: parsed.style || {}
        };
    } catch (e) {
        // Not JSON, treat as plain text
        return {
            text: response,
            styleVariation: {}
        };
    }
}

/**
 * Get a user-friendly description of their handwriting style
 */
export function getStyleDescription() {
    const handwriting = loadUserHandwriting();
    if (!handwriting) return 'No handwriting profile';

    const { profile } = handwriting;
    const parts = [];

    // Slant
    if (Math.abs(profile.slant) < 3) {
        parts.push('upright');
    } else if (profile.slant > 0) {
        parts.push(`${profile.slant > 10 ? 'heavily' : 'slightly'} slanted`);
    } else {
        parts.push('backslanted');
    }

    // Connection
    parts.push(profile.connectLetters ? 'cursive' : 'print');

    // Messiness
    if (profile.messiness < 0.3) {
        parts.push('neat');
    } else if (profile.messiness > 0.6) {
        parts.push('expressive');
    }

    // Speed
    parts.push(`${profile.speed} pace`);

    return parts.join(', ');
}
