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

// Using requestAnimationFrame instead of interval for smoother rendering

let undoStack = [];
let redoStack = [];

let touchIdentifier = null;

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
        
        fillCanvasBackground();
        
        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerup', handlePointerUp);
        canvas.addEventListener('pointerout', handlePointerUp);
        
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        
        // Add wheel event for intuitive zooming with mouse/trackpad
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        
        canvas.style.touchAction = 'none';
        
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

// Improved touch handling with palm rejection and support for stylus
function handleTouchStart(e) {
    e.preventDefault();
    
    // Check if this is a stylus/pen input
    const isPen = e.touches[0].touchType === 'stylus' || 
                 (e.touches[0].pointerType === 'pen') || 
                 (window.PointerEvent && e.touches[0].pointerType === 'pen');
    
    // For palm rejection: only accept touch if it's a pen or if we don't have an active touch
    // and the touch area is small (finger touches have larger radiusX/Y than stylus)
    const isSmallTouchArea = e.touches[0].radiusX < 15 && e.touches[0].radiusY < 15;
    
    if ((isPen || (touchIdentifier === null && isSmallTouchArea)) && e.touches.length === 1) {
        touchIdentifier = e.touches[0].identifier;
        
        // Store touch start time for detecting tap-and-hold
        const touch = e.touches[0];
        touch.startTime = Date.now();
        
        // Enhanced position information
        touch.clientX = touch.clientX || touch.pageX;
        touch.clientY = touch.clientY || touch.pageY;
        
        handlePointerDown(touch);
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    
    // Find our tracked touch
    if (touchIdentifier !== null) {
        for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === touchIdentifier) {
                const touch = e.touches[i];
                
                // Enhanced position information
                touch.clientX = touch.clientX || touch.pageX;
                touch.clientY = touch.clientY || touch.pageY;
                
                // Calculate velocity for smoother lines
                if (lastX && lastY) {
                    const now = Date.now();
                    const dt = now - (touch.lastMoveTime || touch.startTime || now);
                    if (dt > 0) {
                        touch.velocityX = (touch.clientX - lastX) / dt;
                        touch.velocityY = (touch.clientY - lastY) / dt;
                        touch.lastMoveTime = now;
                    }
                }
                
                handlePointerMove(touch);
                break;
            }
        }
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    
    // Find our tracked touch that ended
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdentifier) {
            const touch = e.changedTouches[i];
            
            // Enhanced position information
            touch.clientX = touch.clientX || touch.pageX;
            touch.clientY = touch.clientY || touch.pageY;
            
            // Check if this was a tap-and-hold (long press)
            const touchDuration = Date.now() - (touch.startTime || Date.now());
            touch.isLongPress = touchDuration > 500; // 500ms threshold for long press
            
            handlePointerUp(touch);
            touchIdentifier = null;
            break;
        }
    }
}

function handlePointerDown(e) {
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
            // Get pressure if available (stylus)
            let pressure = 1.0; // Default pressure
            
            if (e.pressure !== undefined && e.pressure !== 0) {
                // Standard pressure (values between 0 and 1)
                pressure = e.pressure;
            } else if (e.force !== undefined && e.force !== 0) {
                // iOS force touch (values between 0 and 1)
                pressure = e.force;
            } else if (e.touches && e.touches[0] && e.touches[0].force !== undefined && e.touches[0].force !== 0) {
                // Touch with force data
                pressure = e.touches[0].force;
            }
            
            // Adjust the line width based on pressure
            if (pressure !== 1.0) {
                const baseLine = ctx.lineWidth;
                const newLineWidth = baseLine * (0.5 + pressure * 1.5); // Scale between 50% and 200% of base line width
                ctx.lineWidth = newLineWidth;
            }
            
            currentStroke = [];
            addPointToStroke(x, y, pressure);
        }
    }
    startRedrawInterval();
}

function handlePointerMove(e) {
    // Get canvas coordinates accounting for current pan and zoom
    const { x, y } = getCanvasCoordinates(e);
    
    if (isPanning) {
        // Calculate more accurate delta movement with smoother panning
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        
        // Apply pan movement
        panX += dx;
        panY += dy;
        
        // Add boundary constraints to prevent excessive panning
        const maxPanX = canvas.width * 2;
        const maxPanY = canvas.height * 2;
        panX = Math.min(Math.max(-maxPanX, panX), maxPanX);
        panY = Math.min(Math.max(-maxPanY, panY), maxPanY);
        
        // Update last position
        [lastX, lastY] = [e.clientX, e.clientY];
        
        // Immediately refresh to avoid lag sensation
        requestAnimationFrame(() => {
            refreshCanvas();
        });
    } else if (isZooming && mode === 'zoom' && isZoomMode) {
        // Make vertical dragging zoom more intuitive
        const dy = e.clientY - zoomStartY;
        
        // Make zoom more responsive with a faster response
        if (dy < -5) {
            zoomIn();
            zoomStartY = e.clientY; // Reset start position after zoom
        } else if (dy > 5) {
            zoomOut();
            zoomStartY = e.clientY; // Reset start position after zoom
        }
    } else if (isDrawing) {
        if (mode === 'draw') {
            // Drawing - add point to current stroke
            addPointToStroke(x, y);
            [lastX, lastY] = [x, y];
        } else if (mode === 'select') {
            // Selection - update end point and redraw
            selectionEnd = { x, y };
            redrawCanvas();
        }
    }
}

function handlePointerUp(e) {
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

let animationFrameId = null;

function startRedrawInterval() {
    stopRedrawInterval();
    
    // Use requestAnimationFrame for smoother animation
    function animate() {
        redrawCanvas();
        animationFrameId = requestAnimationFrame(animate);
    }
    
    animationFrameId = requestAnimationFrame(animate);
}

function stopRedrawInterval() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
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

function addPointToStroke(x, y, pressure = 1.0) {
    // Store point with pressure information for variable width lines
    currentStroke.push({ x, y, pressure });
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
    
    // Default line width from config
    const defaultLineWidth = ctx.lineWidth;
    
    drawings.forEach(stroke => {
        if (stroke.length > 1) {
            // For strokes with pressure information
            if (stroke[0].pressure !== undefined) {
                // Use a smoother curve algorithm for better writing
                ctx.beginPath();
                
                // Start at the first point
                ctx.moveTo(stroke[0].x, stroke[0].y);
                
                // For each segment, use a Bezier curve for smoother lines
                for (let i = 1; i < stroke.length; i++) {
                    const prevPoint = stroke[i-1];
                    const currPoint = stroke[i];
                    
                    // Apply pressure to line width if available
                    const prevPressure = prevPoint.pressure || 1.0;
                    const currPressure = currPoint.pressure || 1.0;
                    
                    // Adjust line width based on pressure
                    const prevWidth = defaultLineWidth * (0.5 + prevPressure * 1.5);
                    const currWidth = defaultLineWidth * (0.5 + currPressure * 1.5);
                    
                    // Special case for variable width drawing through custom path
                    if (Math.abs(prevWidth - currWidth) > 0.1) {
                        // Finish the current path
                        ctx.stroke();
                        
                        // Start a new path with the new width
                        ctx.beginPath();
                        ctx.lineWidth = currWidth;
                        ctx.moveTo(prevPoint.x, prevPoint.y);
                    }
                    
                    ctx.lineTo(currPoint.x, currPoint.y);
                    ctx.stroke();
                    
                    // Reset path for next segment
                    ctx.beginPath();
                    ctx.moveTo(currPoint.x, currPoint.y);
                }
            } 
            // For older strokes without pressure data
            else {
                ctx.lineWidth = defaultLineWidth;
                ctx.beginPath();
                ctx.moveTo(stroke[0].x, stroke[0].y);
                for (let i = 1; i < stroke.length; i++) {
                    ctx.lineTo(stroke[i].x, stroke[i].y);
                }
                ctx.stroke();
            }
        }
    });
    
    // Reset line width
    ctx.lineWidth = defaultLineWidth;
    ctx.restore();
}

function drawCurrentStroke() {
    if (currentStroke.length > 1) {
        ctx.save();
        ctx.setTransform(scale, 0, 0, scale, panX, panY);
        
        // Default line width from config
        const defaultLineWidth = ctx.lineWidth;
        
        // Use a smoother curve algorithm for better writing
        ctx.beginPath();
        ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
        
        // For each segment, apply pressure information
        for (let i = 1; i < currentStroke.length; i++) {
            const prevPoint = currentStroke[i-1];
            const currPoint = currentStroke[i];
            
            // Apply pressure to line width if available
            const prevPressure = prevPoint.pressure || 1.0;
            const currPressure = currPoint.pressure || 1.0;
            
            // Adjust line width based on pressure
            const prevWidth = defaultLineWidth * (0.5 + prevPressure * 1.5);
            const currWidth = defaultLineWidth * (0.5 + currPressure * 1.5);
            
            // Special case for variable width drawing
            if (Math.abs(prevWidth - currWidth) > 0.1) {
                // Finish the current path
                ctx.stroke();
                
                // Start a new path with the new width
                ctx.beginPath();
                ctx.lineWidth = currWidth;
                ctx.moveTo(prevPoint.x, prevPoint.y);
            }
            
            ctx.lineTo(currPoint.x, currPoint.y);
            ctx.stroke();
            
            // Reset path for next segment
            ctx.beginPath();
            ctx.moveTo(currPoint.x, currPoint.y);
        }
        
        // Reset line width
        ctx.lineWidth = defaultLineWidth;
        ctx.restore();
    }
}

export function redrawCanvas() {
    fillCanvasBackground();
    
    // Update stroke color based on theme
    const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
    if (isDarkMode) {
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink-color').trim();
    } else {
        ctx.strokeStyle = '#000000'; // Default black
    }
    
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

// Renamed to better reflect its purpose across themes
function fillCanvasBackground() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Use theme-appropriate canvas color
    const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
    if (isDarkMode) {
        // For dark mode, use a subtle grid pattern to help with writing guidance
        const darkBg = getComputedStyle(document.documentElement).getPropertyValue('--canvas-color').trim();
        ctx.fillStyle = darkBg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw a subtle grid in dark mode for better depth perception
        ctx.strokeStyle = 'rgba(80, 80, 80, 0.15)'; // Very subtle grid lines
        ctx.lineWidth = 0.5;
        
        // Only draw grid if we're zoomed in enough to see it
        if (scale > 0.5) {
            const gridSize = 50; // Grid size in pixels
            
            ctx.beginPath();
            // Vertical lines
            for (let x = 0; x < canvas.width; x += gridSize) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
            }
            // Horizontal lines
            for (let y = 0; y < canvas.height; y += gridSize) {
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
            }
            ctx.stroke();
        }
    } else {
        // Light mode - simple white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
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
    
    fillCanvasBackground();
    redrawCanvas();
}

export function setDrawMode() {
    mode = 'draw';
    canvas.style.cursor = 'auto';
    canvas.classList.remove('pan-mode', 'select-mode', 'zoom-mode');
    canvas.classList.add('draw-mode');
}

export function setSelectMode() {
    mode = 'select';
    canvas.style.cursor = 'crosshair';
    canvas.classList.remove('pan-mode', 'draw-mode', 'zoom-mode');
    canvas.classList.add('select-mode');
}

export function setPanMode() {
    mode = 'pan';
    canvas.style.cursor = 'grab';
    canvas.classList.remove('draw-mode', 'select-mode', 'zoom-mode');
    canvas.classList.add('pan-mode');
}

export function setZoomMode() {
    mode = 'zoom';
    canvas.style.cursor = 'ns-resize';
    canvas.classList.remove('pan-mode', 'draw-mode', 'select-mode');
    canvas.classList.add('zoom-mode');
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

export function zoomIn() {
    zoom(canvas.width / 2, canvas.height / 2, 1.2); // Increased zoom factor for more noticeable change
}

export function zoomOut() {
    zoom(canvas.width / 2, canvas.height / 2, 0.8); // Increased zoom factor for more noticeable change
}

// Improved zoom function with better center point calculation
function zoom(centerX, centerY, delta) {
    // Calculate the point we're zooming on in world coordinates
    const pointX = (centerX - panX) / scale;
    const pointY = (centerY - panY) / scale;
    
    // Update scale with smoother limits and constraints
    const newScale = scale * delta;
    scale = Math.min(Math.max(0.1, newScale), 5); // Limit scale between 0.1 and 5
    
    // Adjust panning to keep the point under the cursor
    panX = centerX - pointX * scale;
    panY = centerY - pointY * scale;
    
    // Add boundary constraints to prevent excessive panning
    const maxPanX = canvas.width * 2;
    const maxPanY = canvas.height * 2;
    panX = Math.min(Math.max(-maxPanX, panX), maxPanX);
    panY = Math.min(Math.max(-maxPanY, panY), maxPanY);
    
    redrawCanvas();
    refreshCanvas();
}

// Add a new function for wheel-based zooming (more intuitive)
function handleWheel(e) {
    e.preventDefault();
    
    // Convert wheel delta to zoom factor
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    
    // Zoom at the mouse position rather than center of screen
    zoom(e.clientX, e.clientY, delta);
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
    fillCanvasBackground();
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
    
    // Get theme-based colors
    const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDarkMode ? 
        getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() : 
        '#000000';
    const highlightColor = isDarkMode ?
        'rgba(80, 180, 250, 0.2)' :
        'rgba(255, 255, 200, 0.4)';
    const bgColor = isDarkMode ?
        'rgba(40, 40, 40, 0.7)' :
        'rgba(255, 255, 255, 0.7)';
    
    items.forEach(item => {
        if (item && item.selectionBox) {
            const { selectionBox, transcription, chatHistory } = item;
            
            // Create a better layout with proper padding
            const padding = 15 / scale;
            const startX = selectionBox.x;
            const startY = selectionBox.y + selectionBox.height + 15 / scale;
            const width = Math.max(300, selectionBox.width) / scale;
            let currentY = startY + padding;
            
            // Draw background for text area
            ctx.save();
            ctx.setTransform(scale, 0, 0, scale, panX, panY);
            
            // Draw a rectangular background with rounded corners
            ctx.fillStyle = bgColor;
            const cornerRadius = 10 / scale;
            
            // Draw highlighted selection area
            ctx.fillStyle = highlightColor;
            ctx.fillRect(
                selectionBox.x, 
                selectionBox.y, 
                selectionBox.width, 
                selectionBox.height
            );
            
            // Estimate total height based on text content
            const transcriptionLines = Math.ceil(transcription.length / 40); // rough estimate
            
            // Find the last AI message
            const lastAIMessage = chatHistory && chatHistory.filter(message => message.role === 'assistant').pop();
            let aiMessageLines = 0;
            if (lastAIMessage) {
                aiMessageLines = Math.ceil(lastAIMessage.content.length / 40); // rough estimate
            }
            
            // Calculate estimated height for content
            const estimatedHeight = (transcriptionLines + aiMessageLines + 3) * 20 / scale;
            
            // Draw rounded rectangle for response
            roundedRect(
                ctx,
                startX, 
                startY, 
                width, 
                estimatedHeight + padding * 2,
                cornerRadius
            );
            
            // Set text color
            ctx.fillStyle = textColor;
            ctx.font = `${14/scale}px Arial`;
            
            // Draw user text
            ctx.font = `bold ${14/scale}px Arial`;
            ctx.fillText('You wrote:', startX + padding, currentY);
            currentY += 20 / scale;
            
            // Regular font for content
            ctx.font = `${14/scale}px Arial`;
            
            // Draw the transcription text and update currentY
            let transcriptionHeight = drawTextOnCanvas(
                transcription, 
                startX + padding * 2, 
                currentY, 
                width - padding * 3
            );
            
            currentY += transcriptionHeight + 15 / scale;
            
            // Draw AI response if available
            if (lastAIMessage) {
                // Draw header for AI response
                ctx.font = `bold ${14/scale}px Arial`;
                ctx.fillText('Claude:', startX + padding, currentY);
                currentY += 20 / scale;
                
                // Regular font for content
                ctx.font = `${14/scale}px Arial`;
                
                // Draw the AI response text
                drawTextOnCanvas(
                    lastAIMessage.content, 
                    startX + padding * 2, 
                    currentY, 
                    width - padding * 3
                );
            }
            
            ctx.restore();
        } else {
            console.warn('Encountered an invalid notebook item:', item);
        }
    });
}

// Helper function to draw rounded rectangles
function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
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