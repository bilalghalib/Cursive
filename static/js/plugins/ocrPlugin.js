/**
 * OCR Plugin for Cursive
 *
 * Extracts text from handwritten content or images on the canvas
 * and converts it to digital text that can be edited and searched.
 */

import { BasePlugin } from '../pluginManager.js';
import { sendImageToAI } from '../aiService.js';

class OCRPlugin extends BasePlugin {
    constructor() {
        super({
            id: 'ocr-tool',
            name: 'OCR',
            description: 'Extract text from handwriting or images',
            icon: 'fa-font',
            category: 'analysis',
            version: '1.0.0',
            author: 'Cursive Team',
            settings: {
                autoDetectLanguage: true,
                preserveFormatting: true,
                outputFormat: 'plain' // plain, markdown, json
            }
        });

        this.selectionStart = null;
        this.selectionEnd = null;
        this.isSelecting = false;
        this.selectedRegion = null;
    }

    async initialize() {
        await super.initialize();
        console.log('OCR Plugin initialized');
        return true;
    }

    onActivate() {
        // Change cursor to crosshair for selection
        if (this.canvas) {
            this.canvas.style.cursor = 'crosshair';
        }

        // Show instruction tooltip
        this.showInstructions('Select an area containing text to extract');
    }

    onDeactivate() {
        // Reset cursor
        if (this.canvas) {
            this.canvas.style.cursor = 'default';
        }

        // Clear selection
        this.clearSelection();
    }

    onMouseDown(event, canvasX, canvasY) {
        this.isSelecting = true;
        this.selectionStart = { x: canvasX, y: canvasY };
        this.selectionEnd = null;
    }

    onMouseMove(event, canvasX, canvasY) {
        if (!this.isSelecting) return;

        this.selectionEnd = { x: canvasX, y: canvasY };

        // Draw selection rectangle
        this.drawSelectionRect();
    }

    async onMouseUp(event, canvasX, canvasY) {
        if (!this.isSelecting) return;

        this.isSelecting = false;
        this.selectionEnd = { x: canvasX, y: canvasY };

        // Calculate selection bounds
        const bounds = this.calculateSelectionBounds();

        if (bounds.width < 10 || bounds.height < 10) {
            this.showError('Selection too small. Please select a larger area.');
            this.clearSelection();
            return;
        }

        // Extract text from selected region
        await this.extractText(bounds);
    }

    calculateSelectionBounds() {
        if (!this.selectionStart || !this.selectionEnd) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        const x = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const y = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
        const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);

        return { x, y, width, height };
    }

    drawSelectionRect() {
        if (!this.ctx || !this.selectionStart || !this.selectionEnd) return;

        const bounds = this.calculateSelectionBounds();

        // Save context state
        this.ctx.save();

        // Draw selection rectangle
        this.ctx.strokeStyle = '#007bff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

        // Draw semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 123, 255, 0.1)';
        this.ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

        // Restore context state
        this.ctx.restore();
    }

    async extractText(bounds) {
        try {
            this.showLoading('Extracting text...');

            // Get image data from selection
            const imageData = this.ctx.getImageData(
                bounds.x,
                bounds.y,
                bounds.width,
                bounds.height
            );

            // Convert to base64
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = bounds.width;
            tempCanvas.height = bounds.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.putImageData(imageData, 0, 0);
            const base64Image = tempCanvas.toDataURL('image/png');

            // Send to AI for OCR
            const prompt = this.settings.preserveFormatting
                ? "Extract all text from this image, preserving formatting and structure. Return only the extracted text."
                : "Extract all text from this image and return it as plain text.";

            const result = await sendImageToAI(base64Image, prompt);

            // Display result
            this.displayExtractedText(result, bounds);

            this.clearSelection();
            this.hideLoading();

        } catch (error) {
            console.error('OCR extraction error:', error);
            this.showError('Failed to extract text. Please try again.');
            this.hideLoading();
        }
    }

    displayExtractedText(text, bounds) {
        // Create a text bubble to display the extracted text
        const bubble = document.createElement('div');
        bubble.className = 'ocr-result-bubble';
        bubble.style.cssText = `
            position: absolute;
            left: ${bounds.x + bounds.width + 10}px;
            top: ${bounds.y}px;
            background: white;
            border: 2px solid #007bff;
            border-radius: 8px;
            padding: 12px;
            max-width: 300px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 1000;
        `;

        bubble.innerHTML = `
            <div class="ocr-result-header">
                <strong>Extracted Text</strong>
                <button class="ocr-copy-btn" title="Copy to clipboard">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="ocr-close-btn" title="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="ocr-result-text">${text || 'No text detected'}</div>
        `;

        document.body.appendChild(bubble);

        // Copy to clipboard
        bubble.querySelector('.ocr-copy-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(text);
            this.showSuccess('Text copied to clipboard!');
        });

        // Close button
        bubble.querySelector('.ocr-close-btn').addEventListener('click', () => {
            document.body.removeChild(bubble);
        });

        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (document.body.contains(bubble)) {
                document.body.removeChild(bubble);
            }
        }, 30000);
    }

    clearSelection() {
        this.selectionStart = null;
        this.selectionEnd = null;
        this.selectedRegion = null;
    }

    // UI Helper methods
    showInstructions(message) {
        // Implementation depends on your UI framework
        console.log(`[OCR Plugin] ${message}`);
    }

    showLoading(message) {
        console.log(`[OCR Plugin] ${message}`);
    }

    hideLoading() {
        console.log('[OCR Plugin] Loading complete');
    }

    showError(message) {
        console.error(`[OCR Plugin Error] ${message}`);
        alert(message);
    }

    showSuccess(message) {
        console.log(`[OCR Plugin Success] ${message}`);
    }

    renderSettings() {
        return `
            <div class="plugin-settings" id="${this.id}-settings">
                <h3>${this.name} Settings</h3>
                <label>
                    <input type="checkbox" id="ocr-preserve-formatting"
                           ${this.settings.preserveFormatting ? 'checked' : ''}>
                    Preserve formatting
                </label>
                <label>
                    <input type="checkbox" id="ocr-auto-language"
                           ${this.settings.autoDetectLanguage ? 'checked' : ''}>
                    Auto-detect language
                </label>
                <label>
                    Output Format:
                    <select id="ocr-output-format">
                        <option value="plain" ${this.settings.outputFormat === 'plain' ? 'selected' : ''}>Plain Text</option>
                        <option value="markdown" ${this.settings.outputFormat === 'markdown' ? 'selected' : ''}>Markdown</option>
                        <option value="json" ${this.settings.outputFormat === 'json' ? 'selected' : ''}>JSON</option>
                    </select>
                </label>
            </div>
        `;
    }

    onSettingsChanged(settings) {
        console.log('OCR settings updated:', settings);
    }
}

export default OCRPlugin;
