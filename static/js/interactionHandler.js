// interactionHandler.js
import { throttle } from './utils.js';

class InteractionHandler {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.canvas = canvasManager.canvas;
        this.mode = 'draw';
        this.isInteracting = false;
        this.lastX = 0;
        this.lastY = 0;
        this.touchIdentifier = null;

        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);

        this.throttledHandlePointerMove = throttle(this.handlePointerMove, 16);

        this.addEventListeners();
    }

    addEventListeners() {
        this.canvas.addEventListener('pointerdown', this.handlePointerDown);
        this.canvas.addEventListener('pointermove', this.throttledHandlePointerMove);
        this.canvas.addEventListener('pointerup', this.handlePointerUp);
        this.canvas.addEventListener('pointerout', this.handlePointerUp);
        
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    }

    setMode(mode) {
        this.mode = mode;
        this.updateCursor();
    }

    updateCursor() {
        switch (this.mode) {
            case 'draw':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'pan':
                this.canvas.style.cursor = this.isInteracting ? 'grabbing' : 'grab';
                break;
            case 'zoom':
                this.canvas.style.cursor = 'ns-resize';
                break;
            default:
                this.canvas.style.cursor = 'default';
        }
    }

    handlePointerDown(e) {
        const { x, y } = this.canvasManager.getCanvasCoordinates(e);
        this.isInteracting = true;
        [this.lastX, this.lastY] = [x, y];

        switch (this.mode) {
            case 'draw':
                this.canvasManager.drawingEngine.startStroke(x, y);
                break;
            case 'pan':
                this.updateCursor();
                break;
            case 'zoom':
                // Zoom handling is done in pointerMove
                break;
        }
    }

    handlePointerMove(e) {
        if (!this.isInteracting) return;
        const { x, y } = this.canvasManager.getCanvasCoordinates(e);
        const dx = x - this.lastX;
        const dy = y - this.lastY;

        switch (this.mode) {
            case 'draw':
                this.canvasManager.drawingEngine.addPointToStroke(x, y);
                this.canvasManager.drawingEngine.redrawCanvas();
                break;
            case 'pan':
                this.canvasManager.transformHandler.pan(dx, dy);
                break;
            case 'zoom':
                const zoomFactor = dy < 0 ? 1.1 : 0.9;
                this.canvasManager.transformHandler.zoom(e.clientX, e.clientY, zoomFactor);
                break;
        }

        [this.lastX, this.lastY] = [x, y];
    }

    handlePointerUp() {
        if (this.isInteracting) {
            this.isInteracting = false;
            if (this.mode === 'draw') {
                this.canvasManager.drawingEngine.endStroke();
            }
            this.updateCursor();
        }
    }

    handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1 && this.touchIdentifier === null) {
            this.touchIdentifier = e.touches[0].identifier;
            this.handlePointerDown(e.touches[0]);
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === this.touchIdentifier) {
                    this.handlePointerMove(e.touches[i]);
                    break;
                }
            }
        }
    }

    handleTouchEnd(e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === this.touchIdentifier) {
                this.handlePointerUp(e.changedTouches[i]);
                this.touchIdentifier = null;
                break;
            }
        }
    }
}

export default InteractionHandler;
