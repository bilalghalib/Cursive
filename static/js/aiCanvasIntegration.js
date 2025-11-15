/**
 * AI Canvas Integration
 * Smart integration that uses real handwriting synthesis when available,
 * falls back to SVG simulation otherwise
 */

import { isWritebackAvailable, writeAIResponseToCanvas, showTrainingPrompt, setWritebackPosition } from './canvasWriteback.js';
import { streamHandwritingToCanvas } from './canvasManager.js';

/**
 * Write AI response to canvas using the best available method
 * - Uses synthesized handwriting if user has trained
 * - Falls back to SVG simulation otherwise
 *
 * @param {string} text - AI response or prompt
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} maxWidth - Maximum width
 * @param {Object} options - Additional options
 * @returns {Promise<boolean>} Success status
 */
export async function smartWriteAIResponse(text, x, y, maxWidth, options = {}) {
    const hasRealHandwriting = isWritebackAvailable();

    if (hasRealHandwriting) {
        console.log('Using real handwriting synthesis');

        // Use stroke-based synthesis
        return await writeAIResponseToCanvas(text, {
            ...options,
            canvasWidth: options.canvasWidth || 800,
            canvasHeight: options.canvasHeight || 600,
            redrawCanvas: options.redrawCanvas
        });
    } else {
        console.log('Using SVG fallback (no handwriting samples)');

        // Show prompt to train (only once per session)
        if (!sessionStorage.getItem('training-prompt-shown')) {
            showTrainingPrompt();
            sessionStorage.setItem('training-prompt-shown', 'true');
        }

        // Fall back to SVG simulation
        return await streamHandwritingToCanvas(text, x, y, maxWidth, options);
    }
}

/**
 * Enhanced streaming handler for AI responses
 * Integrates with the AI service to write responses in real-time
 *
 * @param {Array} chatHistory - Chat history for context
 * @param {number} x - Start X
 * @param {number} y - Start Y
 * @param {Object} options - Options
 */
export async function streamAIToCanvas(chatHistory, x, y, options = {}) {
    const hasRealHandwriting = isWritebackAvailable();

    if (hasRealHandwriting) {
        // Use real-time stroke synthesis
        return await streamWithStrokeSynthesis(chatHistory, x, y, options);
    } else {
        // Use SVG streaming
        const lastMessage = chatHistory[chatHistory.length - 1];
        const prompt = lastMessage.content;
        return await streamHandwritingToCanvas(prompt, x, y, options.maxWidth || 600, options);
    }
}

/**
 * Stream with stroke synthesis (for real handwriting)
 */
async function streamWithStrokeSynthesis(chatHistory, x, y, options = {}) {
    const { sendChatToAI } = await import('./aiService.js');
    const { updateDrawings, saveDrawings, getDrawings } = await import('./dataManager.js');
    const { streamWriteback } = await import('./handwritingSynthesis.js');

    // Show loading
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    // Prepare
    let currentText = '';
    let buffer = '';
    let cursorX = x;
    let cursorY = y;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = 'Writing AI response in your style...';
    document.body.appendChild(toast);

    if (loadingOverlay) loadingOverlay.style.display = 'none';

    // Stream callback
    const onProgress = async (chunk) => {
        currentText += chunk;
        buffer += chunk;

        // Write complete words as they arrive
        const words = buffer.split(' ');
        buffer = words.pop(); // Keep incomplete word

        for (const word of words) {
            if (!word.trim()) continue;

            // Synthesize and render this word
            await streamWriteback(
                word + ' ',
                cursorX,
                cursorY,
                async (stroke) => {
                    const drawings = await getDrawings();
                    drawings.push(stroke);
                    await updateDrawings(drawings);

                    if (options.redrawCanvas) {
                        options.redrawCanvas();
                    }
                },
                {
                    maxWidth: options.maxWidth || 600,
                    lineHeight: options.lineHeight || 40,
                    styleVariation: options.styleVariation || {},
                    speed: 40
                }
            );

            cursorX += (word.length * 8) + 10; // Rough estimate

            // Line wrapping
            if (cursorX > x + (options.maxWidth || 600)) {
                cursorX = x;
                cursorY += options.lineHeight || 40;
            }
        }
    };

    // Start streaming
    const response = await sendChatToAI(chatHistory, onProgress);

    // Write any remaining buffer
    if (buffer.trim()) {
        await streamWriteback(
            buffer,
            cursorX,
            cursorY,
            async (stroke) => {
                const drawings = await getDrawings();
                drawings.push(stroke);
                await saveDrawings(drawings);

                if (options.redrawCanvas) {
                    options.redrawCanvas();
                }
            },
            {
                maxWidth: options.maxWidth || 600,
                lineHeight: options.lineHeight || 40,
                styleVariation: options.styleVariation || {},
                speed: 40
            }
        );
    }

    // Remove toast
    setTimeout(() => toast.remove(), 2000);

    return response;
}

/**
 * Update selection end position for smart placement
 * Call this when user makes a selection
 */
export function updateSelectionPosition(x, y) {
    setWritebackPosition(x, y);
}

/**
 * Check if handwriting is available and show appropriate UI
 */
export function initAIIntegration() {
    const hasHandwriting = isWritebackAvailable();

    if (hasHandwriting) {
        console.log('✓ AI will write in your handwriting style');
        addHandwritingStatusIndicator(true);
    } else {
        console.log('ℹ AI will use simulated handwriting (train for personalized style)');
        addHandwritingStatusIndicator(false);
    }

    return hasHandwriting;
}

/**
 * Add visual indicator to UI showing handwriting status
 */
function addHandwritingStatusIndicator(hasTrained) {
    const indicator = document.createElement('div');
    indicator.id = 'handwriting-status';
    indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${hasTrained ? '#28a745' : '#6c757d'};
        color: white;
        padding: 10px 15px;
        border-radius: 8px;
        font-size: 0.85rem;
        z-index: 1000;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        transition: transform 0.2s;
    `;

    indicator.innerHTML = hasTrained
        ? '✓ Personal Handwriting Active'
        : '○ Simulated Handwriting';

    indicator.onclick = () => {
        if (!hasTrained) {
            window.location.href = '/handwriting-trainer';
        } else {
            window.location.href = '/handwriting-test';
        }
    };

    indicator.onmouseenter = () => {
        indicator.style.transform = 'translateY(-2px)';
    };

    indicator.onmouseleave = () => {
        indicator.style.transform = 'translateY(0)';
    };

    // Remove after 5 seconds
    setTimeout(() => {
        indicator.style.opacity = '0';
        indicator.style.transition = 'opacity 0.5s';
        setTimeout(() => indicator.remove(), 500);
    }, 5000);

    document.body.appendChild(indicator);
}

// Export for use in app.js
export {
    isWritebackAvailable,
    showTrainingPrompt
};
