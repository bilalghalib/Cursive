// drawingEngine.js
import { simplifyStroke } from './utils.js';

class DrawingEngine {
    constructor(canvas, ctx, config) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        this.drawings = [];
        this.currentStroke = [];
        this.config = config;
        this.undoStack = [];
        this.redoStack = [];

        this.scale = 1;
        this.panX = 0;
        this.panY = 0;

        this.ctx.strokeStyle = config.canvas.line_color;
        this.ctx.lineWidth = config.canvas.line_width;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.resizeOffscreenCanvas();
    }

    resizeOffscreenCanvas() {
        this.offscreenCanvas.width = this.canvas.width;
        this.offscreenCanvas.height = this.canvas.height;
        this.updateOffscreenCanvas();
    }

    setDrawings(drawings) {
        this.drawings = drawings;
        this.updateOffscreenCanvas();
    }

    updateOffscreenCanvas() {
        this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
        this.offscreenCtx.save();
        this.offscreenCtx.scale(this.scale, this.scale);
        this.offscreenCtx.translate(this.panX, this.panY);
        this.drawings.forEach(this.drawStroke.bind(this, this.offscreenCtx));
        this.offscreenCtx.restore();
    }

    drawStroke(context, stroke) {
        if (stroke.length > 1) {
            context.beginPath();
            context.moveTo(stroke[0].x, stroke[0].y);
            for (let i = 1; i < stroke.length; i++) {
                context.lineTo(stroke[i].x, stroke[i].y);
            }
            context.stroke();
        }
    }

    startStroke(x, y) {
        this.currentStroke = [{ x, y }];
    }

    addPointToStroke(x, y) {
        this.currentStroke.push({ x, y });
    }

    endStroke() {
        if (this.currentStroke.length > 1) {
            const simplifiedStroke = simplifyStroke(this.currentStroke, 1); // Adjust tolerance as needed
            this.undoStack.push([...this.drawings]);
            this.drawings.push(simplifiedStroke);
            this.redoStack = [];
            this.updateOffscreenCanvas();
            this.currentStroke = [];
        }
    }

    redrawCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
        if (this.currentStroke.length > 1) {
            this.ctx.save();
            this.ctx.scale(this.scale, this.scale);
            this.ctx.translate(this.panX, this.panY);
            this.drawStroke(this.ctx, this.currentStroke);
            this.ctx.restore();
        }
    }

    setTransform(scale, panX, panY) {
        this.scale = scale;
        this.panX = panX;
        this.panY = panY;
        this.updateOffscreenCanvas();
    }

    undo() {
        if (this.undoStack.length > 0) {
            this.redoStack.push([...this.drawings]);
            this.drawings = this.undoStack.pop();
            this.updateOffscreenCanvas();
            this.redrawCanvas();
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            this.undoStack.push([...this.drawings]);
            this.drawings = this.redoStack.pop();
            this.updateOffscreenCanvas();
            this.redrawCanvas();
        }
    }

    clearCanvas() {
        this.undoStack.push([...this.drawings]);
        this.drawings = [];
        this.redoStack = [];
        this.updateOffscreenCanvas();
        this.redrawCanvas();
    }
}

export default DrawingEngine;
