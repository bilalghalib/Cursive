/**
 * Calculator Plugin for Cursive
 *
 * Allows users to write mathematical expressions on the canvas
 * and automatically evaluates them, displaying the results inline.
 */

import { BasePlugin } from '../pluginManager.js';

class CalculatorPlugin extends BasePlugin {
    constructor() {
        super({
            id: 'calculator-tool',
            name: 'Calculator',
            description: 'Evaluate mathematical expressions',
            icon: 'fa-calculator',
            category: 'utility',
            version: '1.0.0',
            author: 'Cursive Team',
            settings: {
                precision: 2,
                showSteps: false,
                autoEvaluate: true,
                supportedFunctions: ['sin', 'cos', 'tan', 'sqrt', 'log', 'exp']
            }
        });

        this.isDrawing = false;
        this.currentExpression = '';
        this.expressionStart = null;
    }

    async initialize() {
        await super.initialize();
        console.log('Calculator Plugin initialized');
        return true;
    }

    onActivate() {
        if (this.canvas) {
            this.canvas.style.cursor = 'text';
        }
        this.showCalculatorPanel();
    }

    onDeactivate() {
        if (this.canvas) {
            this.canvas.style.cursor = 'default';
        }
        this.hideCalculatorPanel();
    }

    showCalculatorPanel() {
        // Check if panel already exists
        let panel = document.getElementById('calculator-panel');
        if (panel) {
            panel.style.display = 'block';
            return;
        }

        // Create calculator panel
        panel = document.createElement('div');
        panel.id = 'calculator-panel';
        panel.className = 'calculator-panel';
        panel.style.cssText = `
            position: fixed;
            right: 20px;
            top: 80px;
            width: 300px;
            background: white;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 1000;
            font-family: 'Courier New', monospace;
        `;

        panel.innerHTML = `
            <div class="calculator-header">
                <h3 style="margin: 0 0 12px 0;">Calculator</h3>
                <button id="calc-close-btn" style="float: right; margin-top: -30px;">×</button>
            </div>
            <div class="calculator-display">
                <input type="text" id="calc-input" placeholder="Enter expression..."
                       style="width: 100%; padding: 8px; font-size: 18px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 8px;">
                <div id="calc-result" style="min-height: 30px; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 16px;"></div>
            </div>
            <div class="calculator-buttons" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 12px;">
                <button class="calc-btn" data-value="7">7</button>
                <button class="calc-btn" data-value="8">8</button>
                <button class="calc-btn" data-value="9">9</button>
                <button class="calc-btn" data-value="/">÷</button>
                <button class="calc-btn" data-value="4">4</button>
                <button class="calc-btn" data-value="5">5</button>
                <button class="calc-btn" data-value="6">6</button>
                <button class="calc-btn" data-value="*">×</button>
                <button class="calc-btn" data-value="1">1</button>
                <button class="calc-btn" data-value="2">2</button>
                <button class="calc-btn" data-value="3">3</button>
                <button class="calc-btn" data-value="-">−</button>
                <button class="calc-btn" data-value="0">0</button>
                <button class="calc-btn" data-value=".">.</button>
                <button class="calc-btn" data-value="=">=</button>
                <button class="calc-btn" data-value="+">+</button>
            </div>
            <div class="calculator-functions" style="margin-top: 12px;">
                <button class="calc-fn-btn" data-fn="sqrt">√</button>
                <button class="calc-fn-btn" data-fn="pow">x²</button>
                <button class="calc-fn-btn" data-fn="sin">sin</button>
                <button class="calc-fn-btn" data-fn="cos">cos</button>
                <button class="calc-fn-btn" data-fn="clear">C</button>
            </div>
            <div class="calculator-history" style="margin-top: 12px; max-height: 150px; overflow-y: auto; font-size: 12px;">
                <div id="calc-history"></div>
            </div>
        `;

        document.body.appendChild(panel);

        // Attach event listeners
        this.attachCalculatorListeners();
    }

    hideCalculatorPanel() {
        const panel = document.getElementById('calculator-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    attachCalculatorListeners() {
        const input = document.getElementById('calc-input');
        const result = document.getElementById('calc-result');
        const closeBtn = document.getElementById('calc-close-btn');

        // Number and operator buttons
        document.querySelectorAll('.calc-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const value = btn.dataset.value;
                if (value === '=') {
                    this.evaluateExpression(input.value);
                } else {
                    input.value += value;
                }
            });
        });

        // Function buttons
        document.querySelectorAll('.calc-fn-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const fn = btn.dataset.fn;
                if (fn === 'clear') {
                    input.value = '';
                    result.textContent = '';
                } else if (fn === 'sqrt') {
                    input.value += 'sqrt(';
                } else if (fn === 'pow') {
                    input.value += '^2';
                } else {
                    input.value += fn + '(';
                }
            });
        });

        // Input change
        input.addEventListener('input', () => {
            if (this.settings.autoEvaluate) {
                this.evaluateExpression(input.value, true);
            }
        });

        // Enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.evaluateExpression(input.value);
            }
        });

        // Close button
        closeBtn.addEventListener('click', () => {
            this.hideCalculatorPanel();
        });
    }

    evaluateExpression(expr, preview = false) {
        try {
            if (!expr || expr.trim() === '') {
                return;
            }

            // Sanitize and evaluate expression
            const sanitized = this.sanitizeExpression(expr);
            const result = this.calculate(sanitized);

            // Display result
            const resultDiv = document.getElementById('calc-result');
            const formatted = typeof result === 'number'
                ? result.toFixed(this.settings.precision)
                : result;

            resultDiv.textContent = preview ? `≈ ${formatted}` : `= ${formatted}`;
            resultDiv.style.color = preview ? '#666' : '#000';

            // Add to history if not preview
            if (!preview) {
                this.addToHistory(expr, formatted);
            }

            // Emit event for canvas integration
            if (!preview) {
                this.onCalculationComplete(expr, formatted);
            }

            return result;

        } catch (error) {
            const resultDiv = document.getElementById('calc-result');
            resultDiv.textContent = 'Error: ' + error.message;
            resultDiv.style.color = 'red';
            console.error('Calculator error:', error);
        }
    }

    sanitizeExpression(expr) {
        // Replace common symbols
        let sanitized = expr
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/−/g, '-')
            .replace(/\^/g, '**')
            .replace(/√/g, 'Math.sqrt');

        // Replace function names
        this.settings.supportedFunctions.forEach(fn => {
            const regex = new RegExp(fn + '\\(', 'g');
            sanitized = sanitized.replace(regex, `Math.${fn}(`);
        });

        return sanitized;
    }

    calculate(expr) {
        // Use Function constructor for safe evaluation
        // Note: In production, use a proper math parser library
        try {
            const result = Function('"use strict"; return (' + expr + ')')();
            return result;
        } catch (e) {
            throw new Error('Invalid expression');
        }
    }

    addToHistory(expression, result) {
        const history = document.getElementById('calc-history');
        if (!history) return;

        const entry = document.createElement('div');
        entry.className = 'calc-history-entry';
        entry.style.cssText = 'padding: 4px; border-bottom: 1px solid #eee; cursor: pointer;';
        entry.innerHTML = `
            <div style="color: #666;">${expression}</div>
            <div style="color: #000; font-weight: bold;">= ${result}</div>
        `;

        // Click to reuse expression
        entry.addEventListener('click', () => {
            document.getElementById('calc-input').value = expression;
        });

        history.insertBefore(entry, history.firstChild);

        // Limit history to 10 entries
        while (history.children.length > 10) {
            history.removeChild(history.lastChild);
        }
    }

    onCalculationComplete(expression, result) {
        // This can be used to draw the result on canvas
        console.log(`Calculation: ${expression} = ${result}`);

        // Optionally trigger an event for canvas integration
        const event = new CustomEvent('calculator-result', {
            detail: { expression, result }
        });
        document.dispatchEvent(event);
    }

    onClick(event, canvasX, canvasY) {
        // Place result on canvas at click position
        if (this.ctx) {
            const input = document.getElementById('calc-input');
            const resultDiv = document.getElementById('calc-result');

            if (input && resultDiv && resultDiv.textContent) {
                this.drawResultOnCanvas(canvasX, canvasY, input.value, resultDiv.textContent);
            }
        }
    }

    drawResultOnCanvas(x, y, expression, result) {
        if (!this.ctx) return;

        this.ctx.save();
        this.ctx.font = '16px "Courier New", monospace';
        this.ctx.fillStyle = '#333';

        // Draw expression
        this.ctx.fillText(expression, x, y);

        // Draw result below
        this.ctx.font = 'bold 20px "Courier New", monospace';
        this.ctx.fillStyle = '#007bff';
        this.ctx.fillText(result, x, y + 25);

        this.ctx.restore();
    }

    renderSettings() {
        return `
            <div class="plugin-settings" id="${this.id}-settings">
                <h3>${this.name} Settings</h3>
                <label>
                    Precision (decimal places):
                    <input type="number" id="calc-precision" min="0" max="10"
                           value="${this.settings.precision}">
                </label>
                <label>
                    <input type="checkbox" id="calc-auto-eval"
                           ${this.settings.autoEvaluate ? 'checked' : ''}>
                    Auto-evaluate as you type
                </label>
                <label>
                    <input type="checkbox" id="calc-show-steps"
                           ${this.settings.showSteps ? 'checked' : ''}>
                    Show calculation steps
                </label>
            </div>
        `;
    }
}

export default CalculatorPlugin;
