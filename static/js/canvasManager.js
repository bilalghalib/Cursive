import { getConfig } from './config.js';
import { handleImageSelection, displayFullResponse, isZoomMode } from './app.js';
import { getAllNotebookItems, getDrawings, saveDrawings, getInitialDrawingData } from './dataManager.js';

let canvas, ctx;
let isDrawing = false;
let isProcessing = false;
let isPanning = false;
let lastX = 0, lastY = 0;

let isZooming = false;
let zoomStartY = 0;

let mode = 'draw';
let selectionStart = { x: 0, y: 0 };
let selectionEnd = { x: 0, y: 0 };
let savedImageData;

let scale = 1;
let panX = 0;
let panY = 0;

let drawings = [];
let currentStroke = [];

let redrawInterval;
const REDRAW_INTERVAL = 50; // Redraw every 50ms

let undoStack = [];
let redoStack = [];

export async function initCanvas() {
    try {
        const config = await getConfig();
        canvas = document.getElementById('drawing-canvas');
        if (!canvas) {
            throw new Error('Canvas element not found');
        }
        ctx = canvas.getContext('2d');
        
        resizeCanvas();
        
        ctx.strokeStyle = config.canvas.line_color;
        ctx.lineWidth = config.canvas.line_width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        fillCanvasWhite();
        
        
        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerup', handlePointerUp);
        canvas.addEventListener('pointerout', handlePointerUp);
        
        canvas.addEventListener('touchstart', preventDefaultTouch, { passive: false });
        canvas.addEventListener('touchmove', preventDefaultTouch, { passive: false });
        canvas.addEventListener('touchend', preventDefaultTouch, { passive: false });
        
        canvas.style.touchAction = 'none';
        canvas.style.userSelect = 'none';
        canvas.style.webkitUserSelect = 'none';
        canvas.style.msUserSelect = 'none';
        
        window.addEventListener('resize', resizeCanvas);
        
        drawings = await getDrawings();
        if (!Array.isArray(drawings) || drawings.length === 0) {
            drawings = await getInitialDrawingData();
            if (!Array.isArray(drawings)) {
                console.error('Initial drawing data is not an array');
                drawings = [];
            }
            await saveDrawings(drawings);
        }
        undoStack = [{ drawings: [] }];
        redrawCanvas();
        
        startRedrawInterval();
        
        console.log('Canvas initialized successfully');
    } catch (error) {
        console.error('Error initializing canvas:', error);
    }
}

function startRedrawInterval() {
    stopRedrawInterval();
    redrawInterval = setInterval(redrawCanvas, REDRAW_INTERVAL);
}
function stopRedrawInterval() {
    if (redrawInterval) clearInterval(redrawInterval);
}

function preventDefaultTouch(e) {
    e.preventDefault();
}



function handlePointerDown(e) {
    e.preventDefault();
    const { x, y } = getCanvasCoordinates(e);
    if (mode === 'pan') {
        isPanning = true;
        setPanningCursor();
        [lastX, lastY] = [e.clientX, e.clientY];
    } else if (mode === 'zoom' && isZoomMode) {
        isZooming = true;
        zoomStartY = e.clientY;
    } else if (mode === 'draw' || mode === 'select') {
        isDrawing = true;
        [lastX, lastY] = [x, y];
        if (mode === 'select') {
            selectionStart = { x, y };
            savedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } else if (mode === 'draw') {
            currentStroke = [];
            addPointToStroke(x, y);
        }
    }
    startRedrawInterval();
}

function handlePointerMove(e) {
    e.preventDefault();
    const { x, y } = getCanvasCoordinates(e);
    if (isPanning) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        panX += dx;
        panY += dy;
        [lastX, lastY] = [e.clientX, e.clientY];
        refreshCanvas();
    } else if (isZooming && mode === 'zoom' && isZoomMode) {
        const dy = e.clientY - zoomStartY;
        if (dy < 0) {
            zoomIn();
        } else if (dy > 0) {
            zoomOut();
        }
        zoomStartY = e.clientY;
    } else if (isDrawing) {
        if (mode === 'draw') {
            addPointToStroke(x, y);
            [lastX, lastY] = [x, y];
        } else if (mode === 'select') {
            selectionEnd = { x, y };
            redrawCanvas();
        }
    }
}

function handlePointerUp(e) {
    e.preventDefault();
    if (isPanning) {
        isPanning = false;
        resetPanningCursor();
    } else if (isZooming) {
        isZooming = false;
    } else if (isDrawing) {
        isDrawing = false;
        if (mode === 'select') {
            handleSelection();
        } else if (mode === 'draw') {
            if (currentStroke.length > 1) {
                addDrawingAction(currentStroke);
            }
        }
    }
    stopRedrawInterval();
    redrawCanvas();
    refreshCanvas();
    }
    


export function undo() {
    if (undoStack.length > 1) { // Keep at least one state (the initial empty state)
        redoStack.push(undoStack.pop());
        const previousState = undoStack[undoStack.length - 1];
        drawings = previousState.drawings;
        saveDrawings(drawings);
        refreshCanvas();
    }
}

export function redo() {
    if (redoStack.length > 0) {
        const nextState = redoStack.pop();
        undoStack.push(nextState);
        drawings = nextState.drawings;
        saveDrawings(drawings);
        refreshCanvas();
    }
}

function refreshCanvas() {
    clearCanvasOnly();
    drawStoredDrawings();
    redrawNotebookItems();
}



function addPointToStroke(x, y) {
    currentStroke.push({ x, y });
}

function addDrawingAction(stroke) {
    const newDrawings = [...drawings, stroke];
    undoStack.push({ drawings: newDrawings });
    redoStack = []; // Clear redo stack when a new action is performed
    drawings = newDrawings;
    saveDrawings(drawings);
}


function drawStoredDrawings() {
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, panX, panY);
    
    drawings.forEach(stroke => {
        if (stroke.length > 1) {
            ctx.beginPath();
            ctx.moveTo(stroke[0].x, stroke[0].y);
            for (let i = 1; i < stroke.length; i++) {
                ctx.lineTo(stroke[i].x, stroke[i].y);
            }
            ctx.stroke();
        }
    });
    
    ctx.restore();
}

function drawCurrentStroke() {
    if (currentStroke.length > 1) {
        ctx.save();
        ctx.setTransform(scale, 0, 0, scale, panX, panY);
        ctx.beginPath();
        ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
        for (let i = 1; i < currentStroke.length; i++) {
            ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
        }
        ctx.stroke();
        ctx.restore();
    }
}

export function redrawCanvas() {
    fillCanvasWhite();
    drawStoredDrawings();
    drawCurrentStroke();
    if (mode === 'select' && isDrawing) {
        drawSelectionRect();
    }
    redrawNotebookItems();
}

function drawSelectionRect() {
    const width = selectionEnd.x - selectionStart.x;
    const height = selectionEnd.y - selectionStart.y;
    
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, panX, panY);
    ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'; // Translucent yellow
    ctx.fillRect(selectionStart.x, selectionStart.y, width, height);
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)'; // More opaque yellow for the border
    ctx.lineWidth = 2 / scale;
    ctx.strokeRect(selectionStart.x, selectionStart.y, width, height);
    ctx.restore();
}

function fillCanvasWhite() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

function resizeCanvas() {
    const toolbar = document.getElementById('toolbar');
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const toolbarHeight = toolbar ? toolbar.offsetHeight : 0;
    
    canvas.width = windowWidth;
    canvas.height = windowHeight - toolbarHeight;
    
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = toolbarHeight + 'px';
    
    fillCanvasWhite();
    redrawCanvas();
}

export function setDrawMode() {
    mode = 'draw';
    canvas.style.cursor = 'auto';
    canvas.classList.remove('pan-mode', 'select-mode');
    canvas.classList.add('draw-mode');
}

export function setSelectMode() {
    mode = 'select';
    canvas.style.cursor = 'crosshair';
    canvas.classList.remove('pan-mode', 'draw-mode');
    canvas.classList.add('select-mode');
}

export function setPanMode() {
    mode = 'pan';
    canvas.style.cursor = 'grab';
    canvas.classList.remove('draw-mode', 'select-mode');
    canvas.classList.add('pan-mode');
}

function setPanningCursor() {
    if (mode === 'pan') {
        canvas.style.cursor = 'grabbing';
    }
}

function resetPanningCursor() {
    if (mode === 'pan') {
        canvas.style.cursor = 'grab';
    }
}
    export function setZoomMode() {
        mode = 'zoom';
        canvas.style.cursor = 'ns-resize';
        canvas.classList.remove('pan-mode', 'draw-mode', 'select-mode');
        canvas.classList.add('zoom-mode');
    }
    
    export function zoomIn() {
        zoom(canvas.width / 2, canvas.height / 2, 1.1);
    }
    
    export function zoomOut() {
        zoom(canvas.width / 2, canvas.height / 2, 0.9);
    }
    
    function zoom(centerX, centerY, delta) {
        const pointX = (centerX - panX) / scale;
        const pointY = (centerY - panY) / scale;
        
        scale *= delta;
        scale = Math.min(Math.max(0.1, scale), 10); // Limit scale between 0.1 and 10
        
        panX = centerX - pointX * scale;
        panY = centerY - pointY * scale;
        
        redrawCanvas();
        refreshCanvas();
    }

function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left - panX) / scale,
        y: (e.clientY - rect.top - panY) / scale
    };
}

async function handleSelection() {
    if (isProcessing) return;
    isProcessing = true;
    
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);
    
    if (width > 5 && height > 5) {
        const x = Math.min(selectionStart.x, selectionEnd.x);
        const y = Math.min(selectionStart.y, selectionEnd.y);
        
        const selectionCanvas = document.createElement('canvas');
        selectionCanvas.width = width * scale;
        selectionCanvas.height = height * scale;
        const selectionCtx = selectionCanvas.getContext('2d');
        
        selectionCtx.fillStyle = 'white';
        selectionCtx.fillRect(0, 0, selectionCanvas.width, selectionCanvas.height);
        
        selectionCtx.drawImage(canvas, 
            x * scale + panX, y * scale + panY, width * scale, height * scale,
            0, 0, width * scale, height * scale
        );
        
        const selectionDataUrl = selectionCanvas.toDataURL('image/png');
        const selectionData = {
            box: { x, y, width, height },
            imageData: selectionDataUrl
        };
        try {
            await handleImageSelection(selectionData);
        } catch (error) {
            console.error('Error handling image selection:', error);
            alert('Error processing image. Please try again.');
        }
    }
    
    setDrawMode();
    ctx.strokeStyle = 'black';
    
    isProcessing = false;
}

function clearCanvasOnly() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    fillCanvasWhite();
}

export async function clearCanvas() {
    clearCanvasOnly();
    drawings = [];
    await saveDrawings(drawings);
    undoStack = [{ drawings: [] }]; // Reset to initial state
    redoStack = [];
}



export function clearSelection() {
    ctx.putImageData(savedImageData, 0, 0);
    selectionStart = { x: 0, y: 0 };
    selectionEnd = { x: 0, y: 0 };
}
export function drawTextOnCanvas(text, x, y, maxWidth, maxHeight = Infinity) {
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, panX, panY);
    ctx.fillStyle = 'black';
    
    // Set a fixed font size
    const baseFontSize = 12;
    ctx.font = `${baseFontSize}px Arial`;
    
    // Scale the maxWidth and maxHeight
    const scaledMaxWidth = maxWidth * scale;
    const scaledMaxHeight = maxHeight * scale;
    
    const words = text.split(' ');
    let line = '';
    let lineHeight = baseFontSize * 1.2; // Adjust line height based on font size
    let currentY = y;
    
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if ((testWidth > scaledMaxWidth && n > 0) || currentY + lineHeight > y + scaledMaxHeight) {
            ctx.fillText(line, x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
            if (currentY + lineHeight > y + scaledMaxHeight) {
                break;
            }
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, currentY);
    ctx.restore();
    
    return (currentY + lineHeight - y) / scale; // Return the height used, adjusted for scale
}

async function redrawNotebookItems() {
    const items = await getAllNotebookItems();
    items.forEach(item => {
        if (item && item.selectionBox) {
            const { selectionBox, transcription, chatHistory } = item;
            let currentY = selectionBox.y + selectionBox.height + 5 / scale;
            const width = Math.max(400, selectionBox.width) / scale;
            
            // Draw the transcription text and update currentY
            let transcriptionHeight = drawTextOnCanvas(`Transcription: ${transcription}`, selectionBox.x, currentY, width);
            currentY += transcriptionHeight + 5 / scale; // Update currentY to be just below the transcription text
            
            // Find the last AI message in the chat history
            const lastAIMessage = chatHistory && chatHistory.filter(message => message.role === 'assistant').pop();
            if (lastAIMessage) {
                // Draw the AI response text just below the transcription text
                let aiResponseHeight = drawTextOnCanvas(`AI: ${lastAIMessage.content}`, selectionBox.x, currentY, width);
                currentY += aiResponseHeight + 5 / scale; // Update currentY to be just below the AI response text
            }
        } else {
            console.warn('Encountered an invalid notebook item:', item);
        }
    });
}

export async function updateDrawings(newDrawings) {
    drawings = newDrawings;
    await saveDrawings(drawings);
}

export async function clearNotebook() {
    const STORAGE_KEY = await getStorageKey();
    await Promise.all([
        localStorage.removeItem(STORAGE_KEY),
        localStorage.removeItem('drawings')
    ]);
    return { clearedItems: true, clearedDrawings: true };
}


export { refreshCanvas };