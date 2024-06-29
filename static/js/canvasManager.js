// canvasManager.js
import DrawingEngine from './drawingEngine.js';
import TransformHandler from './transformHandler.js';
import { getConfig } from './config.js';
import { getDrawings, saveDrawings, getInitialDrawingData } from './dataManager.js';

class CanvasManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.drawingEngine = null;
        this.transformHandler = null;
        this.mode = 'draw';
        this.isDrawing = false;
        this.isPanning = false;
        this.isZooming = false;
        this.isSelecting = false;
        this.lastX = 0;
        this.lastY = 0;
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.zoomStartY = 0;
        this.touchIdentifier = null;
        this.selectionStart = { x: 0, y: 0 };
        this.selectionEnd = { x: 0, y: 0 };
        this.notebookItems = [];
    }
    
    async init() {
        const config = await getConfig();
        this.canvas = document.getElementById('drawing-canvas');
        if (!this.canvas) {
            throw new Error('Canvas element not found');
        }
        this.ctx = this.canvas.getContext('2d');
        
        this.drawingEngine = new DrawingEngine(this.canvas, this.ctx, config);
        this.transformHandler = new TransformHandler(this);
        
        this.resizeCanvas();
        this.addEventListeners();
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        await this.loadDrawings();
        
        this.drawingEngine.redrawCanvas();
        this.drawAllNotebookItems();
    }
    
    setNotebookItems(items) {
        this.notebookItems = items || []; // Handle potential undefined input
        this.drawAllNotebookItems();
    }
    
    drawAllNotebookItems() {
        if (!this.notebookItems || this.notebookItems.length === 0) return; // Check if notebookItems exists and is not empty
        
        this.drawingEngine.redrawCanvas();
        this.notebookItems.forEach(item => {
            if (item && item.selectionBox && item.transcription && item.chatHistory && item.chatHistory.length > 0) {
                this.displayTranscriptionAndResponse(
                    item.selectionBox,
                    item.transcription,
                    item.chatHistory[item.chatHistory.length - 1].content
                );
            }
        });
    }
    
    async loadDrawings() {
        let drawings = await getDrawings();
        if (!Array.isArray(drawings) || drawings.length === 0) {
            drawings = await getInitialDrawingData();
            if (!Array.isArray(drawings)) {
                console.error('Initial drawing data is not an array');
                drawings = [];
            }
            await saveDrawings(drawings);
        }
        this.drawingEngine.setDrawings(drawings);
    }
    
    resizeCanvas() {
        const toolbar = document.getElementById('toolbar');
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const toolbarHeight = toolbar ? toolbar.offsetHeight : 0;
        
        this.canvas.width = windowWidth;
        this.canvas.height = windowHeight - toolbarHeight;
        
        this.canvas.style.position = 'fixed';
        this.canvas.style.left = '0';
        this.canvas.style.top = toolbarHeight + 'px';
        
        this.drawingEngine.resizeOffscreenCanvas();
        this.drawingEngine.redrawCanvas();
    }
    
    addEventListeners() {
        this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
        this.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
        this.canvas.addEventListener('pointerout', this.handlePointerUp.bind(this));
        
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    }
    
    setMode(newMode) {
        this.mode = newMode;
        switch (newMode) {
            case 'draw':
                this.canvas.style.cursor = 'auto';
                break;
            case 'select':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'pan':
                this.canvas.style.cursor = 'grab';
                break;
            case 'zoom':
                this.canvas.style.cursor = 'ns-resize';
                break;
        }
        this.canvas.className = `${newMode}-mode`;
    }
    
    handlePointerDown(e) {
        const { x, y } = this.getCanvasCoordinates(e);
        if (this.mode === 'pan') {
            this.isPanning = true;
            this.canvas.style.cursor = 'grabbing';
            [this.lastX, this.lastY] = [e.clientX, e.clientY];
        } else if (this.mode === 'zoom') {
            this.isZooming = true;
            this.zoomStartY = e.clientY;
        } else if (this.mode === 'draw') {
            this.isDrawing = true;
            [this.lastX, this.lastY] = [x, y];
            this.drawingEngine.startStroke(x, y);
        } else if (this.mode === 'select') {
            this.isSelecting = true;
            this.selectionStart = { x, y };
            this.selectionEnd = { x, y };
        }
    }
    
    handlePointerMove(e) {
        const { x, y } = this.getCanvasCoordinates(e);
        if (this.isPanning) {
            const dx = e.clientX - this.lastX;
            const dy = e.clientY - this.lastY;
            this.pan(dx, dy);
            [this.lastX, this.lastY] = [e.clientX, e.clientY];
        } else if (this.isZooming) {
            const dy = e.clientY - this.zoomStartY;
            if (dy < 0) {
                this.zoom(1.1);
            } else if (dy > 0) {
                this.zoom(0.9);
            }
            this.zoomStartY = e.clientY;
        } else if (this.isDrawing) {
            this.drawingEngine.addPointToStroke(x, y);
            this.drawingEngine.redrawCanvas();
        } else if (this.isSelecting) {
            this.selectionEnd = { x, y };
            this.drawSelectionRect();
        }
    }
    
    handlePointerUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = 'grab';
        } else if (this.isZooming) {
            this.isZooming = false;
        } else if (this.isDrawing) {
            this.isDrawing = false;
            this.drawingEngine.endStroke();
        } else if (this.isSelecting) {
            this.isSelecting = false;
            this.captureSelection();
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
    
    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        return this.transformHandler.getTransformedPoint(e.clientX - rect.left, e.clientY - rect.top);
    }
    
    pan(dx, dy) {
        this.transformHandler.pan(dx, dy);
    }
    
    zoom(factor) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        this.transformHandler.zoom(centerX, centerY, factor);
    }
    
    drawSelectionRect() {
        this.drawingEngine.redrawCanvas();
        
        const ctx = this.ctx;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        
        const x = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const y = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
        const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
        
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.strokeRect(x, y, width, height);
        
        ctx.restore();
    }
    
    captureSelection() {
        const x = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const y = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
        const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
        
        const imageData = this.ctx.getImageData(x, y, width, height);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);
        
        const dataURL = tempCanvas.toDataURL('image/png');
        return { dataURL, box: { x, y, width, height } };
    }
    
    
    displayTranscriptionAndResponse(selectionBox, transcription, aiResponse) {
        const ctx = this.ctx;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        
        const { x, y, width, height } = selectionBox;
        const padding = 5;
        const lineHeight = 20;
        
        // Draw background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(x, y + height, width, lineHeight * 4 + padding * 2);
        
        // Draw text
        ctx.fillStyle = 'black';
        ctx.font = '14px Arial';
        ctx.fillText(`Transcription: ${transcription}`, x + padding, y + height + lineHeight);
        
        // Wrap AI response
        const wrappedResponse = this.wrapText(ctx, aiResponse, width - padding * 2);
        wrappedResponse.forEach((line, index) => {
            ctx.fillText(line, x + padding, y + height + lineHeight * (index + 2));
        });
        
        ctx.restore();
    }
    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];
        
        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + " " + word).width;
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }
    

    undo() {
        this.drawingEngine.undo();
    }

    redo() {
        this.drawingEngine.redo();
    }

    clearCanvas() {
        this.drawingEngine.clearCanvas();
    }
    redrawCanvas() {
        this.drawingEngine.redrawCanvas();
        this.drawAllNotebookItems();
    }
    
    drawAllNotebookItems() {
        if (!this.notebookItems || this.notebookItems.length === 0) return;
        
        this.notebookItems.forEach(item => {
            if (item && item.selectionBox && item.transcription && item.chatHistory && item.chatHistory.length > 0) {
                this.displayTranscriptionAndResponse(
                    item.selectionBox,
                    item.transcription,
                    item.chatHistory[item.chatHistory.length - 1].content
                );
            }
        });
    }
}

export default CanvasManager;