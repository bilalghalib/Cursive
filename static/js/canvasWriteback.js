/**
 * Canvas Writeback Integration
 * Connects AI streaming with handwriting synthesis for real-time canvas rendering
 */

import { hasHandwritingSamples, streamWriteback, textToStrokes } from './handwritingSynthesis.js';
import { updateDrawings, getDrawings, saveDrawings } from './dataManager.js';

let isWritebackEnabled = false;
let writebackPosition = { x: 50, y: 50 };
let lastSelectionEnd = null;

/**
 * Initialize writeback system
 * Check if user has trained their handwriting
 */
export async function initWriteback() {
    isWritebackEnabled = await hasHandwritingSamples();

    if (isWritebackEnabled) {
        console.log('✓ Handwriting writeback enabled');
    } else {
        console.log('ℹ Handwriting writeback disabled (no samples). Visit /handwriting-trainer.html to enable.');
    }

    return isWritebackEnabled;
}

/**
 * Check if writeback is available
 */
export function isWritebackAvailable() {
    return isWritebackEnabled;
}

/**
 * Set the position for the next AI writeback
 * This should be called after user makes a selection
 */
export function setWritebackPosition(x, y) {
    writebackPosition = { x, y };
    lastSelectionEnd = { x, y };
}

/**
 * Get smart writeback position
 * Priority:
 * 1. Below last selection
 * 2. Below last AI response
 * 3. Smart placement in empty space
 * 4. Default position
 */
export function getWritebackPosition(canvasWidth, canvasHeight) {
    const drawings = getDrawings();

    // Priority 1: Below last selection
    if (lastSelectionEnd) {
        return {
            x: lastSelectionEnd.x,
            y: lastSelectionEnd.y + 40
        };
    }

    // Priority 2: Find last AI response
    const aiResponses = drawings.filter(d => d.type === 'ai-handwriting');
    if (aiResponses.length > 0) {
        const lastResponse = aiResponses[aiResponses.length - 1];
        return {
            x: lastResponse.x || 50,
            y: (lastResponse.y || 50) + 50
        };
    }

    // Priority 3: Smart placement - find bottom-most y
    if (drawings.length > 0) {
        let bottomY = 0;
        drawings.forEach(drawing => {
            if (Array.isArray(drawing) && drawing.length > 0) {
                // User stroke
                drawing.forEach(point => {
                    bottomY = Math.max(bottomY, point.y);
                });
            } else if (drawing.y) {
                // Other drawing types
                bottomY = Math.max(bottomY, drawing.y);
            }
        });

        return {
            x: 50,
            y: bottomY + 50
        };
    }

    // Default: upper-left with margin
    return { x: 50, y: 50 };
}

/**
 * Write AI response to canvas using synthesized handwriting
 * This is the main integration point for AI streaming
 *
 * @param {string} text - The AI response text
 * @param {Object} options - Options
 * @param {Function} options.onProgress - Callback for progress (optional)
 * @param {Object} options.styleVariation - LLM-suggested style variation (optional)
 * @param {Object} options.canvas - Canvas context
 * @param {Function} options.redrawCanvas - Function to trigger canvas redraw
 */
export async function writeAIResponseToCanvas(text, options = {}) {
    if (!isWritebackEnabled) {
        console.warn('Writeback not available. User needs to train handwriting first.');
        return false;
    }

    const {
        onProgress,
        styleVariation = {},
        canvas,
        redrawCanvas,
        canvasWidth,
        canvasHeight
    } = options;

    // Get position
    const position = getWritebackPosition(canvasWidth || 800, canvasHeight || 600);
    const startX = position.x;
    const startY = position.y;

    // Get current drawings
    const drawings = await getDrawings();

    // Track where AI response ends for next positioning
    let lastStrokeEndY = startY;
    let strokeCount = 0;

    // Stream writeback
    await streamWriteback(
        text,
        startX,
        startY,
        async (stroke) => {
            // Add stroke to drawings array
            drawings.push(stroke);

            // Track position
            if (stroke.length > 0) {
                const lastPoint = stroke[stroke.length - 1];
                lastStrokeEndY = Math.max(lastStrokeEndY, lastPoint.y);
            }

            strokeCount++;

            // Update canvas every few strokes (performance)
            if (strokeCount % 3 === 0) {
                await updateDrawings(drawings);
                if (redrawCanvas) redrawCanvas();
            }

            // Progress callback
            if (onProgress) {
                onProgress({
                    strokesWritten: strokeCount,
                    currentY: lastStrokeEndY
                });
            }
        },
        {
            maxWidth: 600,
            lineHeight: 40,
            styleVariation,
            speed: 40 // ms per stroke
        }
    );

    // Final save and redraw
    await saveDrawings(drawings);
    if (redrawCanvas) redrawCanvas();

    // Update last position
    lastSelectionEnd = {
        x: startX,
        y: lastStrokeEndY
    };

    console.log(`✓ Wrote ${strokeCount} strokes to canvas`);
    return true;
}

/**
 * Write complete AI response (non-streaming)
 * Useful for quick responses or batch rendering
 */
export async function writeAIResponseBatch(text, options = {}) {
    if (!isWritebackEnabled) {
        return false;
    }

    const {
        styleVariation = {},
        canvasWidth,
        canvasHeight,
        redrawCanvas
    } = options;

    // Get position
    const position = getWritebackPosition(canvasWidth || 800, canvasHeight || 600);

    // Generate all strokes at once
    const strokes = textToStrokes(text, position.x, position.y, {
        maxWidth: 600,
        lineHeight: 40,
        styleVariation
    });

    // Add to drawings
    const drawings = await getDrawings();
    drawings.push(...strokes);

    // Save
    await saveDrawings(drawings);
    if (redrawCanvas) redrawCanvas();

    console.log(`✓ Wrote ${strokes.length} strokes to canvas (batch)`);
    return true;
}

/**
 * Parse LLM response for style metadata
 * Expected format: {"text": "...", "style": {...}}
 * Falls back to plain text if not JSON
 */
export function parseAIResponseForStyle(response) {
    try {
        const parsed = JSON.parse(response);
        if (parsed.text && parsed.style) {
            return {
                text: parsed.text,
                styleVariation: parsed.style,
                hasStyleMetadata: true
            };
        }
    } catch (e) {
        // Not JSON, treat as plain text
    }

    return {
        text: response,
        styleVariation: {},
        hasStyleMetadata: false
    };
}

/**
 * Show notification prompting user to train handwriting
 */
export function showTrainingPrompt() {
    const message = document.createElement('div');
    message.className = 'handwriting-training-prompt';
    message.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            max-width: 350px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        ">
            <h3 style="margin: 0 0 10px 0;">✍️ Teach Me Your Handwriting!</h3>
            <p style="margin: 0 0 15px 0; font-size: 0.95rem; opacity: 0.95;">
                Train Cursive to write AI responses in YOUR handwriting style.
            </p>
            <button onclick="window.location.href='/handwriting-trainer'" style="
                background: white;
                color: #667eea;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                margin-right: 10px;
            ">
                Start Training
            </button>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: transparent;
                color: white;
                border: 1px solid white;
                padding: 10px 20px;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
            ">
                Later
            </button>
        </div>
        <style>
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        </style>
    `;

    document.body.appendChild(message);

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        if (message.parentElement) {
            message.remove();
        }
    }, 10000);
}

/**
 * Add training link to settings or toolbar
 */
export function addTrainingLink() {
    // This can be called from app.js to add a link to the UI
    const link = document.createElement('a');
    link.href = '/handwriting-trainer';
    link.textContent = '✍️ Train Handwriting';
    link.style.cssText = `
        display: inline-block;
        padding: 8px 16px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        margin: 10px 0;
    `;

    return link;
}

// Auto-init on module load (async)
(async () => {
    await initWriteback();
})();
