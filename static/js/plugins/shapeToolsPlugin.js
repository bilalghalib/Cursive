/**
 * Shape Tools Plugin for Cursive
 *
 * Provides pre-made geometric shapes and drawing tools including
 * rectangles, circles, arrows, polygons, and more.
 */

import { BasePlugin } from '../pluginManager.js';

class ShapeToolsPlugin extends BasePlugin {
    constructor() {
        super({
            id: 'shape-tools',
            name: 'Shapes',
            description: 'Draw geometric shapes and arrows',
            icon: 'fa-shapes',
            category: 'drawing',
            version: '1.0.0',
            author: 'Cursive Team',
            settings: {
                currentShape: 'rectangle',
                fillColor: 'transparent',
                strokeColor: '#000000',
                strokeWidth: 2,
                fillEnabled: false,
                snapToGrid: false,
                gridSize: 20
            }
        });

        this.isDrawing = false;
        this.startPoint = null;
        this.currentPoint = null;
        this.previewShape = null;

        this.shapes = {
            rectangle: 'Rectangle',
            circle: 'Circle',
            ellipse: 'Ellipse',
            triangle: 'Triangle',
            arrow: 'Arrow',
            line: 'Line',
            star: 'Star',
            pentagon: 'Pentagon',
            hexagon: 'Hexagon'
        };
    }

    async initialize() {
        await super.initialize();
        console.log('Shape Tools Plugin initialized');
        return true;
    }

    onActivate() {
        if (this.canvas) {
            this.canvas.style.cursor = 'crosshair';
        }
        this.showShapeToolbar();
    }

    onDeactivate() {
        if (this.canvas) {
            this.canvas.style.cursor = 'default';
        }
        this.hideShapeToolbar();
        this.isDrawing = false;
    }

    showShapeToolbar() {
        let toolbar = document.getElementById('shape-toolbar');
        if (toolbar) {
            toolbar.style.display = 'block';
            return;
        }

        toolbar = document.createElement('div');
        toolbar.id = 'shape-toolbar';
        toolbar.style.cssText = `
            position: fixed;
            right: 20px;
            top: 80px;
            width: 280px;
            background: white;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 1000;
        `;

        toolbar.innerHTML = `
            <div class="shape-toolbar-header">
                <h3 style="margin: 0 0 12px 0;">Shape Tools</h3>
                <button id="shape-close-btn" style="float: right; margin-top: -30px;">×</button>
            </div>

            <div class="shape-selector" style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold;">Shape:</label>
                <div id="shape-buttons" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                    ${Object.entries(this.shapes).map(([key, label]) => `
                        <button class="shape-btn ${key === this.settings.currentShape ? 'active' : ''}"
                                data-shape="${key}"
                                style="padding: 12px; border: 2px solid #ccc; border-radius: 4px; background: white; cursor: pointer; transition: all 0.2s;">
                            ${this.getShapeIcon(key)}
                            <div style="font-size: 10px; margin-top: 4px;">${label}</div>
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="shape-options" style="margin-bottom: 16px;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px;">Options</h4>

                <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span style="min-width: 80px;">Stroke:</span>
                    <input type="color" id="shape-stroke-color" value="${this.settings.strokeColor}"
                           style="width: 40px; height: 30px; cursor: pointer;">
                    <input type="number" id="shape-stroke-width" value="${this.settings.strokeWidth}"
                           min="1" max="20" style="width: 60px; padding: 4px;">
                    <span>px</span>
                </label>

                <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <input type="checkbox" id="shape-fill-enabled"
                           ${this.settings.fillEnabled ? 'checked' : ''}>
                    <span>Fill</span>
                    <input type="color" id="shape-fill-color" value="${this.settings.fillColor}"
                           style="width: 40px; height: 30px; cursor: pointer;"
                           ${!this.settings.fillEnabled ? 'disabled' : ''}>
                </label>

                <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <input type="checkbox" id="shape-snap-grid"
                           ${this.settings.snapToGrid ? 'checked' : ''}>
                    <span>Snap to Grid</span>
                    <input type="number" id="shape-grid-size" value="${this.settings.gridSize}"
                           min="5" max="50" step="5" style="width: 60px; padding: 4px;"
                           ${!this.settings.snapToGrid ? 'disabled' : ''}>
                    <span>px</span>
                </label>
            </div>

            <div class="shape-instructions" style="font-size: 12px; color: #666; padding: 8px; background: #f5f5f5; border-radius: 4px;">
                <i class="fas fa-info-circle"></i> Click and drag to draw the selected shape
            </div>
        `;

        document.body.appendChild(toolbar);
        this.attachShapeToolbarListeners();
    }

    hideShapeToolbar() {
        const toolbar = document.getElementById('shape-toolbar');
        if (toolbar) {
            toolbar.style.display = 'none';
        }
    }

    getShapeIcon(shape) {
        const icons = {
            rectangle: '▭',
            circle: '●',
            ellipse: '⬭',
            triangle: '▲',
            arrow: '→',
            line: '─',
            star: '★',
            pentagon: '⬟',
            hexagon: '⬡'
        };
        return `<div style="font-size: 24px;">${icons[shape] || '◆'}</div>`;
    }

    attachShapeToolbarListeners() {
        // Shape selection
        document.querySelectorAll('.shape-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.settings.currentShape = btn.dataset.shape;
            });
        });

        // Color and width controls
        document.getElementById('shape-stroke-color').addEventListener('input', (e) => {
            this.settings.strokeColor = e.target.value;
        });

        document.getElementById('shape-stroke-width').addEventListener('input', (e) => {
            this.settings.strokeWidth = parseInt(e.target.value);
        });

        document.getElementById('shape-fill-enabled').addEventListener('change', (e) => {
            this.settings.fillEnabled = e.target.checked;
            document.getElementById('shape-fill-color').disabled = !e.target.checked;
        });

        document.getElementById('shape-fill-color').addEventListener('input', (e) => {
            this.settings.fillColor = e.target.value;
        });

        // Grid snap
        document.getElementById('shape-snap-grid').addEventListener('change', (e) => {
            this.settings.snapToGrid = e.target.checked;
            document.getElementById('shape-grid-size').disabled = !e.target.checked;
        });

        document.getElementById('shape-grid-size').addEventListener('input', (e) => {
            this.settings.gridSize = parseInt(e.target.value);
        });

        // Close button
        document.getElementById('shape-close-btn').addEventListener('click', () => {
            this.hideShapeToolbar();
        });
    }

    onMouseDown(event, canvasX, canvasY) {
        this.isDrawing = true;
        this.startPoint = this.snapPoint({ x: canvasX, y: canvasY });
        this.currentPoint = this.startPoint;
    }

    onMouseMove(event, canvasX, canvasY) {
        if (!this.isDrawing) return;

        this.currentPoint = this.snapPoint({ x: canvasX, y: canvasY });
        this.drawPreview();
    }

    onMouseUp(event, canvasX, canvasY) {
        if (!this.isDrawing) return;

        this.isDrawing = false;
        this.currentPoint = this.snapPoint({ x: canvasX, y: canvasY });

        // Draw final shape
        this.drawShape(this.startPoint, this.currentPoint, false);

        // Reset
        this.startPoint = null;
        this.currentPoint = null;
    }

    snapPoint(point) {
        if (!this.settings.snapToGrid) return point;

        const gridSize = this.settings.gridSize;
        return {
            x: Math.round(point.x / gridSize) * gridSize,
            y: Math.round(point.y / gridSize) * gridSize
        };
    }

    drawPreview() {
        if (!this.ctx || !this.startPoint || !this.currentPoint) return;

        // This would need integration with canvas redraw mechanism
        // For now, just draw the preview shape
        this.drawShape(this.startPoint, this.currentPoint, true);
    }

    drawShape(start, end, isPreview = false) {
        if (!this.ctx) return;

        this.ctx.save();

        // Set styles
        this.ctx.strokeStyle = isPreview ? 'rgba(0, 123, 255, 0.5)' : this.settings.strokeColor;
        this.ctx.lineWidth = this.settings.strokeWidth;
        this.ctx.fillStyle = this.settings.fillColor;

        // Draw based on shape type
        switch (this.settings.currentShape) {
            case 'rectangle':
                this.drawRectangle(start, end);
                break;
            case 'circle':
                this.drawCircle(start, end);
                break;
            case 'ellipse':
                this.drawEllipse(start, end);
                break;
            case 'triangle':
                this.drawTriangle(start, end);
                break;
            case 'arrow':
                this.drawArrow(start, end);
                break;
            case 'line':
                this.drawLine(start, end);
                break;
            case 'star':
                this.drawStar(start, end);
                break;
            case 'pentagon':
                this.drawPolygon(start, end, 5);
                break;
            case 'hexagon':
                this.drawPolygon(start, end, 6);
                break;
        }

        this.ctx.restore();
    }

    drawRectangle(start, end) {
        const width = end.x - start.x;
        const height = end.y - start.y;

        this.ctx.beginPath();
        this.ctx.rect(start.x, start.y, width, height);
        if (this.settings.fillEnabled) this.ctx.fill();
        this.ctx.stroke();
    }

    drawCircle(start, end) {
        const radius = Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );

        this.ctx.beginPath();
        this.ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
        if (this.settings.fillEnabled) this.ctx.fill();
        this.ctx.stroke();
    }

    drawEllipse(start, end) {
        const radiusX = Math.abs(end.x - start.x);
        const radiusY = Math.abs(end.y - start.y);
        const centerX = (start.x + end.x) / 2;
        const centerY = (start.y + end.y) / 2;

        this.ctx.beginPath();
        this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        if (this.settings.fillEnabled) this.ctx.fill();
        this.ctx.stroke();
    }

    drawTriangle(start, end) {
        const width = end.x - start.x;
        const height = end.y - start.y;

        this.ctx.beginPath();
        this.ctx.moveTo(start.x + width / 2, start.y);
        this.ctx.lineTo(start.x + width, start.y + height);
        this.ctx.lineTo(start.x, start.y + height);
        this.ctx.closePath();
        if (this.settings.fillEnabled) this.ctx.fill();
        this.ctx.stroke();
    }

    drawArrow(start, end) {
        const headLength = 15;
        const angle = Math.atan2(end.y - start.y, end.x - start.x);

        // Draw line
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();

        // Draw arrowhead
        this.ctx.beginPath();
        this.ctx.moveTo(end.x, end.y);
        this.ctx.lineTo(
            end.x - headLength * Math.cos(angle - Math.PI / 6),
            end.y - headLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.moveTo(end.x, end.y);
        this.ctx.lineTo(
            end.x - headLength * Math.cos(angle + Math.PI / 6),
            end.y - headLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.stroke();
    }

    drawLine(start, end) {
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();
    }

    drawStar(start, end) {
        const centerX = (start.x + end.x) / 2;
        const centerY = (start.y + end.y) / 2;
        const radius = Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        ) / 2;

        this.ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const r = i % 2 === 0 ? radius : radius / 2;
            const x = centerX + r * Math.cos(angle);
            const y = centerY + r * Math.sin(angle);
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.closePath();
        if (this.settings.fillEnabled) this.ctx.fill();
        this.ctx.stroke();
    }

    drawPolygon(start, end, sides) {
        const centerX = (start.x + end.x) / 2;
        const centerY = (start.y + end.y) / 2;
        const radius = Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        ) / 2;

        this.ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.closePath();
        if (this.settings.fillEnabled) this.ctx.fill();
        this.ctx.stroke();
    }

    renderSettings() {
        return `
            <div class="plugin-settings" id="${this.id}-settings">
                <h3>${this.name} Settings</h3>
                <label>
                    Default stroke width:
                    <input type="number" id="shape-default-width" min="1" max="20"
                           value="${this.settings.strokeWidth}">
                </label>
            </div>
        `;
    }
}

export default ShapeToolsPlugin;
