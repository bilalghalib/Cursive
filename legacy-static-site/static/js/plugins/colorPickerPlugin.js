/**
 * Color Picker Plugin for Cursive
 *
 * Advanced color selection tool with palette management,
 * color history, and eyedropper functionality.
 */

import { BasePlugin } from '../pluginManager.js';

class ColorPickerPlugin extends BasePlugin {
    constructor() {
        super({
            id: 'color-picker-tool',
            name: 'Color Picker',
            description: 'Advanced color selection and palette management',
            icon: 'fa-palette',
            category: 'drawing',
            version: '1.0.0',
            author: 'Cursive Team',
            settings: {
                currentColor: '#000000',
                recentColors: [],
                maxRecentColors: 12,
                customPalettes: {},
                defaultPalette: 'basic'
            }
        });

        this.palettes = {
            basic: ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'],
            warm: ['#8B0000', '#B22222', '#DC143C', '#FF6347', '#FF4500', '#FF8C00', '#FFA500', '#FFD700'],
            cool: ['#000080', '#0000CD', '#1E90FF', '#00BFFF', '#00CED1', '#40E0D0', '#48D1CC', '#7FFFD4'],
            pastel: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E0BBE4', '#FFDFD3', '#FEC8D8'],
            material: ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4']
        };

        this.eyedropperMode = false;
    }

    async initialize() {
        await super.initialize();
        this.loadColorHistory();
        console.log('Color Picker Plugin initialized');
        return true;
    }

    onActivate() {
        this.showColorPickerPanel();
    }

    onDeactivate() {
        this.hideColorPickerPanel();
        this.eyedropperMode = false;
        if (this.canvas) {
            this.canvas.style.cursor = 'default';
        }
    }

    showColorPickerPanel() {
        let panel = document.getElementById('color-picker-panel');
        if (panel) {
            panel.style.display = 'block';
            return;
        }

        panel = document.createElement('div');
        panel.id = 'color-picker-panel';
        panel.className = 'color-picker-panel';
        panel.style.cssText = `
            position: fixed;
            right: 20px;
            top: 80px;
            width: 320px;
            background: white;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 1000;
        `;

        panel.innerHTML = `
            <div class="color-picker-header">
                <h3 style="margin: 0 0 12px 0;">Color Picker</h3>
                <button id="color-close-btn" style="float: right; margin-top: -30px;">×</button>
            </div>

            <div class="current-color-display" style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div id="current-color-swatch"
                         style="width: 60px; height: 60px; border: 2px solid #333; border-radius: 8px; background: ${this.settings.currentColor};"></div>
                    <div style="flex: 1;">
                        <input type="color" id="color-input" value="${this.settings.currentColor}"
                               style="width: 100%; height: 40px; cursor: pointer;">
                        <input type="text" id="color-hex-input" value="${this.settings.currentColor}"
                               placeholder="#000000"
                               style="width: 100%; margin-top: 4px; padding: 4px; font-family: monospace;">
                    </div>
                </div>
            </div>

            <div class="color-tools" style="margin-bottom: 16px;">
                <button id="eyedropper-btn" class="color-tool-btn" title="Pick color from canvas">
                    <i class="fas fa-eyedropper"></i> Eyedropper
                </button>
                <button id="add-to-palette-btn" class="color-tool-btn" title="Add to custom palette">
                    <i class="fas fa-plus"></i> Save Color
                </button>
            </div>

            <div class="palette-selector" style="margin-bottom: 12px;">
                <label for="palette-select">Palette:</label>
                <select id="palette-select" style="width: 100%; padding: 4px;">
                    <option value="basic">Basic</option>
                    <option value="warm">Warm</option>
                    <option value="cool">Cool</option>
                    <option value="pastel">Pastel</option>
                    <option value="material">Material Design</option>
                </select>
            </div>

            <div id="palette-container" class="palette-container"
                 style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; margin-bottom: 16px;">
            </div>

            <div class="recent-colors" style="margin-bottom: 12px;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px;">Recent Colors</h4>
                <div id="recent-colors-container"
                     style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px;">
                </div>
            </div>

            <div class="color-harmony" style="margin-top: 16px;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px;">Color Harmony</h4>
                <div id="harmony-colors"
                     style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;">
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        this.attachColorPickerListeners();
        this.renderPalette('basic');
        this.renderRecentColors();
        this.updateColorHarmony(this.settings.currentColor);
    }

    hideColorPickerPanel() {
        const panel = document.getElementById('color-picker-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    attachColorPickerListeners() {
        const colorInput = document.getElementById('color-input');
        const hexInput = document.getElementById('color-hex-input');
        const paletteSelect = document.getElementById('palette-select');
        const eyedropperBtn = document.getElementById('eyedropper-btn');
        const addBtn = document.getElementById('add-to-palette-btn');
        const closeBtn = document.getElementById('color-close-btn');

        colorInput.addEventListener('input', (e) => {
            this.setColor(e.target.value);
        });

        hexInput.addEventListener('change', (e) => {
            const color = e.target.value;
            if (/^#[0-9A-F]{6}$/i.test(color)) {
                this.setColor(color);
            }
        });

        paletteSelect.addEventListener('change', (e) => {
            this.renderPalette(e.target.value);
        });

        eyedropperBtn.addEventListener('click', () => {
            this.activateEyedropper();
        });

        addBtn.addEventListener('click', () => {
            this.addToRecentColors(this.settings.currentColor);
        });

        closeBtn.addEventListener('click', () => {
            this.hideColorPickerPanel();
        });
    }

    setColor(color) {
        this.settings.currentColor = color;

        // Update UI
        const swatch = document.getElementById('current-color-swatch');
        const colorInput = document.getElementById('color-input');
        const hexInput = document.getElementById('color-hex-input');

        if (swatch) swatch.style.background = color;
        if (colorInput) colorInput.value = color;
        if (hexInput) hexInput.value = color;

        // Update color harmony
        this.updateColorHarmony(color);

        // Emit color change event
        const event = new CustomEvent('color-changed', { detail: { color } });
        document.dispatchEvent(event);
    }

    renderPalette(paletteName) {
        const container = document.getElementById('palette-container');
        if (!container) return;

        const colors = this.palettes[paletteName] || this.palettes.basic;
        container.innerHTML = '';

        colors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.cssText = `
                width: 100%;
                height: 30px;
                background: ${color};
                border: 1px solid #ccc;
                border-radius: 4px;
                cursor: pointer;
                transition: transform 0.2s;
            `;
            swatch.title = color;

            swatch.addEventListener('click', () => {
                this.setColor(color);
                this.addToRecentColors(color);
            });

            swatch.addEventListener('mouseenter', () => {
                swatch.style.transform = 'scale(1.1)';
            });

            swatch.addEventListener('mouseleave', () => {
                swatch.style.transform = 'scale(1)';
            });

            container.appendChild(swatch);
        });
    }

    renderRecentColors() {
        const container = document.getElementById('recent-colors-container');
        if (!container) return;

        container.innerHTML = '';

        this.settings.recentColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.style.cssText = `
                width: 100%;
                height: 30px;
                background: ${color};
                border: 1px solid #ccc;
                border-radius: 4px;
                cursor: pointer;
            `;
            swatch.title = color;

            swatch.addEventListener('click', () => {
                this.setColor(color);
            });

            container.appendChild(swatch);
        });
    }

    addToRecentColors(color) {
        // Remove if already exists
        const index = this.settings.recentColors.indexOf(color);
        if (index > -1) {
            this.settings.recentColors.splice(index, 1);
        }

        // Add to front
        this.settings.recentColors.unshift(color);

        // Limit size
        if (this.settings.recentColors.length > this.settings.maxRecentColors) {
            this.settings.recentColors.pop();
        }

        this.saveColorHistory();
        this.renderRecentColors();
    }

    updateColorHarmony(baseColor) {
        const container = document.getElementById('harmony-colors');
        if (!container) return;

        const harmonies = this.generateColorHarmonies(baseColor);
        container.innerHTML = '';

        harmonies.forEach(color => {
            const swatch = document.createElement('div');
            swatch.style.cssText = `
                width: 100%;
                height: 30px;
                background: ${color};
                border: 1px solid #ccc;
                border-radius: 4px;
                cursor: pointer;
            `;
            swatch.title = color;

            swatch.addEventListener('click', () => {
                this.setColor(color);
                this.addToRecentColors(color);
            });

            container.appendChild(swatch);
        });
    }

    generateColorHarmonies(hexColor) {
        const rgb = this.hexToRgb(hexColor);
        const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);

        // Generate complementary, triadic, and analogous colors
        const harmonies = [
            this.hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l), // Complementary
            this.hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l), // Triadic 1
            this.hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l), // Triadic 2
            this.hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l),  // Analogous 1
            this.hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l)  // Analogous 2
        ];

        return harmonies;
    }

    activateEyedropper() {
        this.eyedropperMode = true;
        this.canvas.style.cursor = 'crosshair';
        console.log('Eyedropper activated - click on canvas to pick color');
    }

    onClick(event, canvasX, canvasY) {
        if (this.eyedropperMode && this.ctx) {
            // Get pixel color at click position
            const imageData = this.ctx.getImageData(canvasX, canvasY, 1, 1);
            const pixel = imageData.data;
            const color = this.rgbToHex(pixel[0], pixel[1], pixel[2]);

            this.setColor(color);
            this.addToRecentColors(color);

            this.eyedropperMode = false;
            this.canvas.style.cursor = 'default';
        }
    }

    // Color conversion utilities
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    hslToHex(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return this.rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
    }

    loadColorHistory() {
        const stored = localStorage.getItem('color_picker_history');
        if (stored) {
            try {
                this.settings.recentColors = JSON.parse(stored);
            } catch (e) {
                console.error('Error loading color history:', e);
            }
        }
    }

    saveColorHistory() {
        localStorage.setItem('color_picker_history', JSON.stringify(this.settings.recentColors));
    }

    renderSettings() {
        return `
            <div class="plugin-settings" id="${this.id}-settings">
                <h3>${this.name} Settings</h3>
                <label>
                    Max recent colors:
                    <input type="number" id="color-max-recent" min="6" max="24"
                           value="${this.settings.maxRecentColors}">
                </label>
            </div>
        `;
    }
}

export default ColorPickerPlugin;
