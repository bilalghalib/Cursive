// transformHandler.js

class TransformHandler {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.canvas = canvasManager.canvas;
        this.ctx = canvasManager.ctx;
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
    }

    setTransform(scale, panX, panY) {
        this.scale = scale;
        this.panX = panX;
        this.panY = panY;
        this.applyTransform();
    }

    applyTransform() {
        this.ctx.setTransform(this.scale, 0, 0, this.scale, this.panX, this.panY);
        this.canvasManager.drawingEngine.setTransform(this.scale, this.panX, this.panY);
    }

    zoom(centerX, centerY, factor) {
        const pointX = (centerX - this.panX) / this.scale;
        const pointY = (centerY - this.panY) / this.scale;

        this.scale *= factor;
        this.scale = Math.min(Math.max(0.1, this.scale), 10); // Limit scale between 0.1 and 10

        this.panX = centerX - pointX * this.scale;
        this.panY = centerY - pointY * this.scale;

        this.applyTransform();
        this.canvasManager.drawingEngine.redrawCanvas();
    }

    pan(dx, dy) {
        this.panX += dx;
        this.panY += dy;
        this.applyTransform();
        this.canvasManager.drawingEngine.redrawCanvas();
    }

    resetTransform() {
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.applyTransform();
        this.canvasManager.drawingEngine.redrawCanvas();
    }

    getTransformedPoint(x, y) {
        return {
            x: (x - this.panX) / this.scale,
            y: (y - this.panY) / this.scale
        };
    }
}

export default TransformHandler;
