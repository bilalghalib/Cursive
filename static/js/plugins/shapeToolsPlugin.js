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
            version: '2.0.0',
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

        // Vector shape storage
        this.vectorShapes = [];
        this.selectedShape = null;
        this.dragHandle = null;
        this.isEditMode = false;

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

        // Remove keyboard handler
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
        }

        // Clear selection
        this.selectedShape = null;
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
            max-height: calc(100vh - 100px);
            overflow-y: auto;
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

            <div class="shape-actions" style="margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <button id="shape-delete-btn" style="padding: 8px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-trash"></i> Delete
                </button>
                <button id="shape-clear-btn" style="padding: 8px; background: #ffc107; color: black; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-eraser"></i> Clear All
                </button>
            </div>

            <div class="shape-instructions" style="font-size: 12px; color: #666; padding: 8px; background: #f5f5f5; border-radius: 4px;">
                <i class="fas fa-info-circle"></i>
                <strong>Draw:</strong> Click and drag<br>
                <strong>Edit:</strong> Click shape to select, drag to move<br>
                <strong>Resize:</strong> Drag corner handles<br>
                <strong>Delete:</strong> Select shape and press Delete or click Delete button
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

        // Delete and Clear buttons
        document.getElementById('shape-delete-btn').addEventListener('click', () => {
            this.deleteSelectedShape();
        });

        document.getElementById('shape-clear-btn').addEventListener('click', () => {
            if (confirm('Clear all shapes? This cannot be undone.')) {
                this.clearShapes();
            }
        });

        // Close button
        document.getElementById('shape-close-btn').addEventListener('click', () => {
            this.hideShapeToolbar();
        });

        // Keyboard shortcuts
        this.keyboardHandler = (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.selectedShape) {
                    e.preventDefault();
                    this.deleteSelectedShape();
                }
            } else if (e.key === 'Escape') {
                this.selectedShape = null;
                this.redrawShapes();
            }
        };
        document.addEventListener('keydown', this.keyboardHandler);
    }

    onMouseDown(event, canvasX, canvasY) {
        const point = this.snapPoint({ x: canvasX, y: canvasY });

        // Check if clicking on a handle of selected shape
        if (this.selectedShape) {
            const handle = this.getHandleAtPoint(point);
            if (handle) {
                this.dragHandle = handle;
                this.startPoint = point;
                return;
            }
        }

        // Check if clicking on an existing shape
        const clickedShape = this.getShapeAtPoint(point);
        if (clickedShape) {
            this.selectedShape = clickedShape;
            this.isEditMode = true;
            this.startPoint = point;
            this.redrawShapes();
            return;
        }

        // Start drawing new shape
        this.selectedShape = null;
        this.isDrawing = true;
        this.startPoint = point;
        this.currentPoint = this.startPoint;
    }

    onMouseMove(event, canvasX, canvasY) {
        const point = this.snapPoint({ x: canvasX, y: canvasY });

        // Handle dragging a handle
        if (this.dragHandle) {
            this.resizeShape(this.selectedShape, this.dragHandle, point);
            this.redrawShapes();
            return;
        }

        // Handle moving selected shape
        if (this.isEditMode && this.selectedShape && this.startPoint) {
            const dx = point.x - this.startPoint.x;
            const dy = point.y - this.startPoint.y;
            this.moveShape(this.selectedShape, dx, dy);
            this.startPoint = point;
            this.redrawShapes();
            return;
        }

        // Handle drawing new shape
        if (!this.isDrawing) return;
        this.currentPoint = point;
        this.redrawShapes();
    }

    onMouseUp(event, canvasX, canvasY) {
        if (this.dragHandle) {
            this.dragHandle = null;
            return;
        }

        if (this.isEditMode) {
            this.isEditMode = false;
            this.startPoint = null;
            return;
        }

        if (!this.isDrawing) return;

        this.isDrawing = false;
        this.currentPoint = this.snapPoint({ x: canvasX, y: canvasY });

        // Create and store vector shape
        const shape = this.createVectorShape(this.startPoint, this.currentPoint);
        if (shape) {
            this.vectorShapes.push(shape);
            this.redrawShapes();
        }

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

    createVectorShape(start, end) {
        if (!start || !end) return null;

        return {
            type: this.settings.currentShape,
            start: { ...start },
            end: { ...end },
            strokeColor: this.settings.strokeColor,
            strokeWidth: this.settings.strokeWidth,
            fillColor: this.settings.fillColor,
            fillEnabled: this.settings.fillEnabled,
            id: Date.now() + Math.random()
        };
    }

    redrawShapes() {
        if (!this.ctx) return;

        // Request canvas redraw from main app
        if (window.redrawCanvas) {
            window.redrawCanvas();
        }

        // Draw all stored vector shapes
        this.vectorShapes.forEach(shape => {
            this.drawVectorShape(shape, false);
        });

        // Draw preview of shape being drawn
        if (this.isDrawing && this.startPoint && this.currentPoint) {
            const previewShape = this.createVectorShape(this.startPoint, this.currentPoint);
            if (previewShape) {
                previewShape.strokeColor = 'rgba(0, 123, 255, 0.7)';
                this.drawVectorShape(previewShape, true);
            }
        }

        // Draw selection handles if shape is selected
        if (this.selectedShape) {
            this.drawSelectionHandles(this.selectedShape);
        }
    }

    drawVectorShape(shape, isPreview = false) {
        if (!this.ctx || !shape) return;

        this.ctx.save();

        // Set styles
        this.ctx.strokeStyle = shape.strokeColor;
        this.ctx.lineWidth = shape.strokeWidth;
        this.ctx.fillStyle = shape.fillColor;

        // Draw based on shape type
        switch (shape.type) {
            case 'rectangle':
                this.drawRectangle(shape.start, shape.end, shape.fillEnabled);
                break;
            case 'circle':
                this.drawCircle(shape.start, shape.end, shape.fillEnabled);
                break;
            case 'ellipse':
                this.drawEllipse(shape.start, shape.end, shape.fillEnabled);
                break;
            case 'triangle':
                this.drawTriangle(shape.start, shape.end, shape.fillEnabled);
                break;
            case 'arrow':
                this.drawArrow(shape.start, shape.end);
                break;
            case 'line':
                this.drawLine(shape.start, shape.end);
                break;
            case 'star':
                this.drawStar(shape.start, shape.end, shape.fillEnabled);
                break;
            case 'pentagon':
                this.drawPolygon(shape.start, shape.end, 5, shape.fillEnabled);
                break;
            case 'hexagon':
                this.drawPolygon(shape.start, shape.end, 6, shape.fillEnabled);
                break;
        }

        this.ctx.restore();
    }

    drawSelectionHandles(shape) {
        if (!this.ctx || !shape) return;

        const handles = this.getShapeHandles(shape);

        this.ctx.save();
        this.ctx.fillStyle = '#0077ff';
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;

        handles.forEach(handle => {
            this.ctx.beginPath();
            this.ctx.arc(handle.x, handle.y, 6, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        });

        // Draw bounding box
        const bounds = this.getShapeBounds(shape);
        this.ctx.strokeStyle = '#0077ff';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        this.ctx.setLineDash([]);

        this.ctx.restore();
    }

    getShapeHandles(shape) {
        const bounds = this.getShapeBounds(shape);
        return [
            { x: bounds.x, y: bounds.y, position: 'nw' },
            { x: bounds.x + bounds.width, y: bounds.y, position: 'ne' },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height, position: 'se' },
            { x: bounds.x, y: bounds.y + bounds.height, position: 'sw' }
        ];
    }

    getShapeBounds(shape) {
        const minX = Math.min(shape.start.x, shape.end.x);
        const minY = Math.min(shape.start.y, shape.end.y);
        const maxX = Math.max(shape.start.x, shape.end.x);
        const maxY = Math.max(shape.start.y, shape.end.y);

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    getHandleAtPoint(point) {
        if (!this.selectedShape) return null;

        const handles = this.getShapeHandles(this.selectedShape);
        const hitDistance = 10;

        for (const handle of handles) {
            const dx = point.x - handle.x;
            const dy = point.y - handle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= hitDistance) {
                return handle;
            }
        }

        return null;
    }

    getShapeAtPoint(point) {
        // Check in reverse order (top to bottom)
        for (let i = this.vectorShapes.length - 1; i >= 0; i--) {
            const shape = this.vectorShapes[i];
            const bounds = this.getShapeBounds(shape);

            // Expand bounds slightly for easier selection
            const padding = 10;
            if (point.x >= bounds.x - padding &&
                point.x <= bounds.x + bounds.width + padding &&
                point.y >= bounds.y - padding &&
                point.y <= bounds.y + bounds.height + padding) {
                return shape;
            }
        }

        return null;
    }

    moveShape(shape, dx, dy) {
        if (!shape) return;

        shape.start.x += dx;
        shape.start.y += dy;
        shape.end.x += dx;
        shape.end.y += dy;
    }

    resizeShape(shape, handle, newPoint) {
        if (!shape || !handle) return;

        // Update the corner based on which handle is being dragged
        switch (handle.position) {
            case 'nw':
                shape.start.x = newPoint.x;
                shape.start.y = newPoint.y;
                break;
            case 'ne':
                shape.end.x = newPoint.x;
                shape.start.y = newPoint.y;
                break;
            case 'se':
                shape.end.x = newPoint.x;
                shape.end.y = newPoint.y;
                break;
            case 'sw':
                shape.start.x = newPoint.x;
                shape.end.y = newPoint.y;
                break;
        }
    }

    // Export shapes for LLM (rasterize to image)
    rasterizeShapes(targetCtx) {
        if (!targetCtx) return;

        this.vectorShapes.forEach(shape => {
            const savedCtx = this.ctx;
            this.ctx = targetCtx;
            this.drawVectorShape(shape, false);
            this.ctx = savedCtx;
        });
    }

    // Get vector data for storage
    getVectorData() {
        return {
            shapes: this.vectorShapes,
            version: '2.0'
        };
    }

    // Load vector data from storage
    loadVectorData(data) {
        if (data && data.shapes) {
            this.vectorShapes = data.shapes;
            this.redrawShapes();
        }
    }

    // Clear all shapes
    clearShapes() {
        this.vectorShapes = [];
        this.selectedShape = null;
        this.redrawShapes();
    }

    // Delete selected shape
    deleteSelectedShape() {
        if (this.selectedShape) {
            const index = this.vectorShapes.indexOf(this.selectedShape);
            if (index > -1) {
                this.vectorShapes.splice(index, 1);
                this.selectedShape = null;
                this.redrawShapes();
            }
        }
    }

    drawRectangle(start, end, fillEnabled) {
        const width = end.x - start.x;
        const height = end.y - start.y;

        this.ctx.beginPath();
        this.ctx.rect(start.x, start.y, width, height);
        if (fillEnabled) this.ctx.fill();
        this.ctx.stroke();
    }

    drawCircle(start, end, fillEnabled) {
        const radius = Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );

        this.ctx.beginPath();
        this.ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
        if (fillEnabled) this.ctx.fill();
        this.ctx.stroke();
    }

    drawEllipse(start, end, fillEnabled) {
        const radiusX = Math.abs(end.x - start.x);
        const radiusY = Math.abs(end.y - start.y);
        const centerX = (start.x + end.x) / 2;
        const centerY = (start.y + end.y) / 2;

        this.ctx.beginPath();
        this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        if (fillEnabled) this.ctx.fill();
        this.ctx.stroke();
    }

    drawTriangle(start, end, fillEnabled) {
        const width = end.x - start.x;
        const height = end.y - start.y;

        this.ctx.beginPath();
        this.ctx.moveTo(start.x + width / 2, start.y);
        this.ctx.lineTo(start.x + width, start.y + height);
        this.ctx.lineTo(start.x, start.y + height);
        this.ctx.closePath();
        if (fillEnabled) this.ctx.fill();
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

    drawStar(start, end, fillEnabled) {
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
        if (fillEnabled) this.ctx.fill();
        this.ctx.stroke();
    }

    drawPolygon(start, end, sides, fillEnabled) {
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
        if (fillEnabled) this.ctx.fill();
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
