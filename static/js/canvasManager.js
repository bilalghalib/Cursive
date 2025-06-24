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

// Store default line properties to prevent accumulating changes
let defaultLineWidth = 2;

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
        
        // Store and set default drawing properties
        ctx.strokeStyle = config.canvas.line_color;
        defaultLineWidth = config.canvas.line_width || 2;
        ctx.lineWidth = defaultLineWidth;
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
            
            // Reset line width to default after each stroke to prevent accumulation
            ctx.lineWidth = defaultLineWidth;
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
    
    // Use the stored default line width
    const baseLineWidth = defaultLineWidth;
    
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
                    
                    // Adjust line width based on pressure - using consistent base width
                    const prevWidth = baseLineWidth * (0.5 + prevPressure * 1.5);
                    const currWidth = baseLineWidth * (0.5 + currPressure * 1.5);
                    
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
    ctx.lineWidth = baseLineWidth;
    ctx.restore();
}

function drawCurrentStroke() {
    if (currentStroke.length > 1) {
        ctx.save();
        ctx.setTransform(scale, 0, 0, scale, panX, panY);
        
        // Use the stored default line width
        const baseLineWidth = defaultLineWidth;
        
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
            
            // Adjust line width based on pressure - using consistent base width
            const prevWidth = baseLineWidth * (0.5 + prevPressure * 1.5);
            const currWidth = baseLineWidth * (0.5 + currPressure * 1.5);
            
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
        
        // Reset line width to the original default to prevent accumulation
        ctx.lineWidth = baseLineWidth;
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
    
    // Create a more visually appealing selection with primary color
    const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
    
    // Use theme-appropriate selection colors
    const fillColor = isDarkMode ? 
        'rgba(75, 171, 247, 0.2)' : 
        'rgba(0, 123, 255, 0.2)';
        
    const strokeColor = isDarkMode ? 
        'rgba(75, 171, 247, 0.8)' : 
        'rgba(0, 123, 255, 0.8)';
    
    // Fill with translucent color
    ctx.fillStyle = fillColor;
    ctx.fillRect(selectionStart.x, selectionStart.y, width, height);
    
    // Draw dashed border for better visibility
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2 / scale;
    ctx.setLineDash([6 / scale, 3 / scale]); // Create dashed line effect
    ctx.strokeRect(selectionStart.x, selectionStart.y, width, height);
    
    // Draw sizing handles at the corners
    const handleSize = 8 / scale;
    ctx.fillStyle = strokeColor;
    
    // Top-left handle
    ctx.fillRect(selectionStart.x - handleSize/2, selectionStart.y - handleSize/2, handleSize, handleSize);
    
    // Top-right handle
    ctx.fillRect(selectionStart.x + width - handleSize/2, selectionStart.y - handleSize/2, handleSize, handleSize);
    
    // Bottom-left handle
    ctx.fillRect(selectionStart.x - handleSize/2, selectionStart.y + height - handleSize/2, handleSize, handleSize);
    
    // Bottom-right handle
    ctx.fillRect(selectionStart.x + width - handleSize/2, selectionStart.y + height - handleSize/2, handleSize, handleSize);
    
    // Reset line dash and restore context
    ctx.setLineDash([]);
    ctx.restore();
    
    // Add magnifier icon in the middle if selection is large enough
    if (Math.abs(width) > 50 / scale && Math.abs(height) > 50 / scale) {
        const centerX = selectionStart.x + width / 2;
        const centerY = selectionStart.y + height / 2;
        
        ctx.save();
        ctx.setTransform(scale, 0, 0, scale, panX, panY);
        
        // Draw chat icon
        const iconSize = Math.min(Math.abs(width), Math.abs(height)) * 0.2;
        if (iconSize > 10 / scale) {
            // Semi-transparent background circle
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(centerX, centerY, iconSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw simplified chat icon
            ctx.fillStyle = strokeColor;
            ctx.beginPath();
            ctx.arc(centerX, centerY, iconSize * 0.7, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(centerX, centerY, iconSize * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
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
    
    // Only process if selection has reasonable size
    if (width > 20 && height > 20) { // Increased size threshold for better detection
        // Add visual feedback during processing
        const x = Math.min(selectionStart.x, selectionEnd.x);
        const y = Math.min(selectionStart.y, selectionEnd.y);
        
        // Get theme-appropriate colors
        const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
        const primaryColor = isDarkMode ? 
            'rgba(75, 171, 247, 0.8)' : 
            'rgba(0, 123, 255, 0.8)';
        const successColor = isDarkMode ?
            'rgba(40, 180, 100, 0.8)' :
            'rgba(40, 180, 100, 0.8)';
        const errorColor = isDarkMode ?
            'rgba(220, 50, 50, 0.8)' :
            'rgba(220, 50, 50, 0.8)';
        
        // Highlight the selection with a pulse animation
        let pulseCounter = 0;
        const maxPulses = 5; // More pulses for a smoother animation
        const pulseInterval = setInterval(() => {
            ctx.save();
            ctx.setTransform(scale, 0, 0, scale, panX, panY);
            
            // Draw a pulsing highlight rectangle
            const pulse = Math.sin(pulseCounter * 0.3);
            const alpha = 0.2 + 0.4 * Math.abs(pulse);
            const expandFactor = 1 + 0.05 * pulse;
            
            // Calculate expanded selection for pulse effect
            const expandedWidth = width * expandFactor;
            const expandedHeight = height * expandFactor;
            const expandedX = x - (expandedWidth - width) / 2;
            const expandedY = y - (expandedHeight - height) / 2;
            
            // Draw expanded highlight
            ctx.fillStyle = `rgba(100, 150, 255, ${alpha})`;
            ctx.fillRect(expandedX, expandedY, expandedWidth, expandedHeight);
            
            // Draw selection border
            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 2 / scale;
            ctx.setLineDash([8 / scale, 4 / scale]);
            ctx.strokeRect(expandedX, expandedY, expandedWidth, expandedHeight);
            ctx.setLineDash([]);
            
            pulseCounter++;
            if (pulseCounter >= maxPulses * Math.PI * 2) {
                clearInterval(pulseInterval);
            }
            
            ctx.restore();
        }, 33); // Faster for smoother animation (30fps)
        
        // Create a temporary canvas for the selection
        const selectionCanvas = document.createElement('canvas');
        selectionCanvas.width = width * scale;
        selectionCanvas.height = height * scale;
        const selectionCtx = selectionCanvas.getContext('2d');
        
        // Capture the selected area from the main canvas
        selectionCtx.fillStyle = 'white';
        selectionCtx.fillRect(0, 0, selectionCanvas.width, selectionCanvas.height);
        
        selectionCtx.drawImage(canvas, 
            x * scale + panX, y * scale + panY, width * scale, height * scale,
            0, 0, width * scale, height * scale
        );
        
        // Build selection data
        const selectionDataUrl = selectionCanvas.toDataURL('image/png');
        const selectionData = {
            box: { x, y, width, height },
            imageData: selectionDataUrl
        };
        
        try {
            // Create a more informative processing indicator
            const selectionOverlay = document.createElement('div');
            selectionOverlay.className = 'selection-processing';
            selectionOverlay.innerHTML = `<div class="selection-indicator">
                <i class="fas fa-brain"></i> 
                <span>Converting handwriting to text...</span>
            </div>`;
            document.body.appendChild(selectionOverlay);
            
            // Position the overlay near the selection
            const viewportX = x * scale + panX + (width * scale / 2);
            const viewportY = y * scale + panY + (height * scale / 2);
            selectionOverlay.style.left = `${viewportX}px`;
            selectionOverlay.style.top = `${viewportY}px`;
            
            try {
                // Process the selection
                await handleImageSelection(selectionData);
                
                // Clear the pulse animation
                clearInterval(pulseInterval);
                
                // Draw a success indicator with animation
                const successFrames = 30;
                let frameCount = 0;
                
                const successAnimation = setInterval(() => {
                    ctx.save();
                    ctx.setTransform(scale, 0, 0, scale, panX, panY);
                    
                    // Draw expanding success rectangle
                    const progress = frameCount / successFrames;
                    const expandSize = progress * 20 / scale;
                    
                    ctx.strokeStyle = successColor;
                    ctx.lineWidth = 3 / scale;
                    ctx.strokeRect(
                        x - expandSize, 
                        y - expandSize, 
                        width + expandSize * 2, 
                        height + expandSize * 2
                    );
                    
                    // Fade out as it expands
                    if (frameCount >= successFrames / 2) {
                        // Draw checkmark in center of selection
                        const centerX = x + width / 2;
                        const centerY = y + height / 2;
                        const checkSize = 20 / scale;
                        
                        ctx.lineWidth = 4 / scale;
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        
                        // Draw circle
                        ctx.beginPath();
                        ctx.arc(centerX, centerY, checkSize, 0, Math.PI * 2);
                        ctx.stroke();
                        
                        // Draw checkmark
                        ctx.beginPath();
                        ctx.moveTo(centerX - checkSize/2, centerY);
                        ctx.lineTo(centerX - checkSize/5, centerY + checkSize/2);
                        ctx.lineTo(centerX + checkSize/2, centerY - checkSize/3);
                        ctx.stroke();
                    }
                    
                    frameCount++;
                    if (frameCount >= successFrames) {
                        clearInterval(successAnimation);
                    }
                    
                    ctx.restore();
                }, 16);
                
            } catch (error) {
                console.error('Error handling image selection:', error);
                
                // Clear the pulse animation
                clearInterval(pulseInterval);
                
                // Show error indicator animation
                const errorFrames = 20;
                let errorFrame = 0;
                
                const errorAnimation = setInterval(() => {
                    ctx.save();
                    ctx.setTransform(scale, 0, 0, scale, panX, panY);
                    
                    // Shake effect
                    const shakeAmount = 3 / scale;
                    const offsetX = Math.sin(errorFrame * 0.8) * shakeAmount;
                    
                    ctx.strokeStyle = errorColor;
                    ctx.lineWidth = 3 / scale;
                    ctx.strokeRect(x + offsetX, y, width, height);
                    
                    // Draw X mark
                    if (errorFrame > 5) {
                        const centerX = x + width / 2;
                        const centerY = y + height / 2;
                        const xSize = 15 / scale;
                        
                        ctx.lineWidth = 4 / scale;
                        ctx.lineCap = 'round';
                        
                        // X mark
                        ctx.beginPath();
                        ctx.moveTo(centerX - xSize, centerY - xSize);
                        ctx.lineTo(centerX + xSize, centerY + xSize);
                        ctx.stroke();
                        
                        ctx.beginPath();
                        ctx.moveTo(centerX + xSize, centerY - xSize);
                        ctx.lineTo(centerX - xSize, centerY + xSize);
                        ctx.stroke();
                    }
                    
                    errorFrame++;
                    if (errorFrame >= errorFrames) {
                        clearInterval(errorAnimation);
                    }
                    
                    ctx.restore();
                }, 33);
                
                // Show error message
                const errorTooltip = document.createElement('div');
                errorTooltip.className = 'selection-tooltip';
                errorTooltip.textContent = 'Error processing selection. Please try again.';
                document.body.appendChild(errorTooltip);
                
                const tooltipX = x * scale + panX + (width * scale / 2);
                const tooltipY = y * scale + panY - 20;
                errorTooltip.style.left = `${tooltipX}px`;
                errorTooltip.style.top = `${tooltipY}px`;
                
                // Remove tooltip after 3 seconds
                setTimeout(() => {
                    document.body.removeChild(errorTooltip);
                }, 3000);
                
            } finally {
                // Remove the processing indicator
                document.body.removeChild(selectionOverlay);
            }
        } catch (error) {
            console.error('Selection process error:', error);
            clearInterval(pulseInterval);
        }
    } else {
        // If selection is too small, give enhanced visual feedback
        ctx.save();
        ctx.setTransform(scale, 0, 0, scale, panX, panY);
        
        const x = Math.min(selectionStart.x, selectionEnd.x);
        const y = Math.min(selectionStart.y, selectionEnd.y);
        
        // Animated feedback for too small selection
        let pulseCount = 0;
        const maxPulses = 3;
        
        const smallSelectionAnimation = setInterval(() => {
            // Clear previous drawing
            redrawCanvas();
            
            // Draw pulsing red rectangle
            const pulse = Math.sin(pulseCount * 0.7);
            const alpha = 0.3 + 0.3 * Math.abs(pulse);
            
            ctx.save();
            ctx.setTransform(scale, 0, 0, scale, panX, panY);
            ctx.strokeStyle = `rgba(220, 50, 50, ${alpha})`;
            ctx.fillStyle = `rgba(220, 50, 50, ${alpha/3})`;
            ctx.lineWidth = 2 / scale;
            
            // Draw with slight expansion effect
            const expand = 2 * Math.abs(pulse) / scale;
            ctx.fillRect(x - expand, y - expand, width + expand*2, height + expand*2);
            ctx.strokeRect(x - expand, y - expand, width + expand*2, height + expand*2);
            
            pulseCount += 0.5;
            if (pulseCount >= maxPulses * Math.PI) {
                clearInterval(smallSelectionAnimation);
                redrawCanvas(); // Clean up after animation
            }
            
            ctx.restore();
        }, 50);
        
        // Create and show an improved tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'selection-tooltip';
        tooltip.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <div>Please select a larger area with text</div>
        `;
        document.body.appendChild(tooltip);
        
        // Position tooltip more precisely
        const viewportX = (selectionStart.x + selectionEnd.x) / 2 * scale + panX;
        const viewportY = Math.min(selectionStart.y, selectionEnd.y) * scale + panY - 50;
        tooltip.style.left = `${viewportX}px`;
        tooltip.style.top = `${viewportY}px`;
        
        // Fade in and out animation for tooltip
        let opacity = 0;
        tooltip.style.opacity = '0';
        
        const fadeIn = setInterval(() => {
            opacity += 0.1;
            tooltip.style.opacity = opacity.toString();
            if (opacity >= 1) clearInterval(fadeIn);
        }, 30);
        
        // Remove tooltip after animation
        setTimeout(() => {
            let fadeOut = setInterval(() => {
                opacity -= 0.1;
                tooltip.style.opacity = opacity.toString();
                if (opacity <= 0) {
                    clearInterval(fadeOut);
                    document.body.removeChild(tooltip);
                }
            }, 30);
        }, 2000);
    }
    
    // Return to drawing mode
    setDrawMode();
    
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

// Draw handwriting strokes on the canvas directly
export async function drawHandwritingOnCanvas(text, x, y, maxWidth, options = {}) {
    try {
        // Import the handwriting simulation module dynamically
        const { renderHandwritingOnCanvas, handwritingStyles } = await import('./handwritingSimulation.js');
        
        // Get theme-based color
        const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
        const color = isDarkMode ? 
            getComputedStyle(document.documentElement).getPropertyValue('--ink-color').trim() : 
            '#000000';
        
        // Set default style for handwriting
        const styleName = options.style || 'cursive';
        const style = handwritingStyles[styleName] || handwritingStyles.cursive;
        
        // Adjust for current zoom and pan
        ctx.save();
        ctx.setTransform(scale, 0, 0, scale, panX, panY);
        
        // Prepare the options for rendering
        const renderOptions = {
            fontSize: options.fontSize || 20,
            ...style,
            color,
            // Add new parameters for enhanced handwriting
            animationDelay: options.animationDelay || false,
            consistentStyle: options.consistentStyle !== undefined ? options.consistentStyle : true,
        };
        
        // If specified, adjust slant and jitter for more natural variation
        if (options.slantVariation) {
            renderOptions.slant = style.slant * (0.8 + Math.random() * 0.4);
        }
        
        if (options.jitterVariation) {
            renderOptions.jitter = style.jitter * (0.8 + Math.random() * 0.4);
        }
        
        // Store the rendered text and its position so it's remembered for future updates
        // This uses a consistent ID based on the current timestamp if not provided
        const handwritingId = options.handwritingId || `hw_${Date.now()}`;
        
        // Add to drawings array for persistence
        if (options.saveToDrawings !== false) {
            drawings.push({
                type: 'handwriting',
                text,
                x,
                y,
                maxWidth,
                style: styleName,
                id: handwritingId,
                timestamp: Date.now()
            });
            
            // Save the updated drawings to local storage
            await saveDrawings(drawings);
            
            // Push to undo stack
            recordAction();
        }
        
        // Render the handwriting
        await renderHandwritingOnCanvas(ctx, text, x, y, maxWidth, renderOptions);
        
        ctx.restore();
        
        // Redraw the canvas to show the new handwriting
        refreshCanvas();
        
        return true;
    } catch (error) {
        console.error('Error drawing handwriting on canvas:', error);
        return false;
    }
}

// Stream handwriting directly to canvas with word-by-word updates
export async function streamHandwritingToCanvas(prompt, x, y, maxWidth, options = {}) {
    try {
        // Show loading while preparing
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        
        // Import necessary modules
        const { handwritingStyles } = await import('./handwritingSimulation.js');
        const { sendChatToAI } = await import('./aiService.js');
        
        // Get theme-based color
        const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
        const color = isDarkMode ? 
            getComputedStyle(document.documentElement).getPropertyValue('--ink-color').trim() : 
            '#000000';
        
        // Choose handwriting style
        const styleName = options.style || 'cursive';
        const style = handwritingStyles[styleName] || handwritingStyles.cursive;
        
        // Create chat history with the prompt
        const chatHistory = [{ role: 'user', content: prompt }];
        
        // Prepare starting options for the handwriting
        const handwritingId = `stream_${Date.now()}`;
        let currentText = '';
        let lastRenderedWordCount = 0;
        let stabilizationTimer = null;
        
        // Create temp drawing to be used during streaming
        const tempDrawing = {
            type: 'handwriting',
            text: '',
            x,
            y,
            maxWidth,
            style: styleName,
            id: handwritingId,
            timestamp: Date.now()
        };
        
        // Add empty drawing to drawing array 
        drawings.push(tempDrawing);
        
        // Record this action for undo history
        recordAction();
        
        // Create a toast notification to show we're streaming
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = 'Streaming AI response...';
        document.body.appendChild(toast);
        
        // Hide loading overlay - we'll see the streaming now
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        
        // Setup the streaming progress callback
        const onProgress = async (text) => {
            currentText = text;
            
            // Count words to see if we have new ones to render
            const currentWordCount = text.split(' ').length;
            
            // Only render if we have new words
            if (currentWordCount > lastRenderedWordCount) {
                // Clear any pending render timer
                if (stabilizationTimer) {
                    clearTimeout(stabilizationTimer);
                }
                
                // Set a delay to avoid too frequent updates
                stabilizationTimer = setTimeout(async () => {
                    // Update this drawing in place
                    tempDrawing.text = text;
                    
                    // Draw the current text state
                    await drawHandwritingOnCanvas(
                        text, 
                        x, 
                        y, 
                        maxWidth, 
                        {
                            style: styleName,
                            fontSize: options.fontSize || 20,
                            animationDelay: false, // No animation during streaming
                            consistentStyle: true, // Keep consistent style
                            saveToDrawings: false, // Don't save intermediate versions
                            handwritingId // Use same ID for updates
                        }
                    );
                    
                    // Update last rendered count
                    lastRenderedWordCount = currentWordCount;
                }, 200); // 200ms delay for smoother updates
            }
        };
        
        // Start streaming the response
        const response = await sendChatToAI(chatHistory, onProgress);
        
        // Final rendering after streaming completes
        await drawHandwritingOnCanvas(
            response, 
            x, 
            y, 
            maxWidth, 
            {
                style: styleName,
                fontSize: options.fontSize || 20,
                animationDelay: false,
                consistentStyle: true,
                saveToDrawings: true, // Save the final version
                handwritingId // Use same ID
            }
        );
        
        // Update chat history with the response
        chatHistory.push({ role: 'assistant', content: response });
        
        // Remove toast
        toast.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 500);
        
        // Return the response
        return response;
    } catch (error) {
        console.error('Error streaming handwriting to canvas:', error);
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        return null;
    }
}

async function redrawNotebookItems() {
    const items = await getAllNotebookItems();
    const textOverlaysContainer = document.getElementById('text-overlays');
    
    // Clear existing overlays
    textOverlaysContainer.innerHTML = '';
    
    // Get theme-based colors
    const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
    const highlightColor = isDarkMode ?
        'rgba(80, 180, 250, 0.2)' :
        'rgba(255, 255, 200, 0.4)';
    
    items.forEach(item => {
        if (item && item.selectionBox) {
            const { selectionBox, transcription, chatHistory, id } = item;
            
            // Draw highlighted selection area on canvas
            ctx.save();
            ctx.setTransform(scale, 0, 0, scale, panX, panY);
            ctx.fillStyle = highlightColor;
            ctx.fillRect(
                selectionBox.x, 
                selectionBox.y, 
                selectionBox.width, 
                selectionBox.height
            );
            ctx.restore();
            
            // Calculate positions for overlays
            const startX = selectionBox.x * scale + panX;
            const startY = (selectionBox.y + selectionBox.height) * scale + panY + 15;
            const maxWidth = Math.max(300, selectionBox.width * scale);
            
            // Create user text bubble with controls
            const userBubble = document.createElement('div');
            userBubble.className = 'text-bubble user-text';
            userBubble.id = `user-text-${id}`;
            userBubble.innerHTML = `
                <h4>You wrote:</h4>
                <div class="content">${transcription}</div>
                <div class="bubble-controls">
                    <button class="bubble-control-btn bubble-toggle-btn" title="Collapse/Expand">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                    <button class="bubble-control-btn bubble-remove-btn" title="Hide">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            // Position the user bubble
            userBubble.style.left = `${startX}px`;
            userBubble.style.top = `${startY}px`;
            userBubble.style.maxWidth = `${maxWidth}px`;
            userBubble.style.transform = `scale(${scale})`;
            textOverlaysContainer.appendChild(userBubble);
            
            // Add AI response bubble if available
            const lastAIMessage = chatHistory && chatHistory.filter(message => message.role === 'assistant').pop();
            if (lastAIMessage) {
                // Calculate position below user bubble
                const userBubbleHeight = userBubble.offsetHeight;
                const aiBubbleY = startY + userBubbleHeight * scale + 10;
                
                // Create AI response bubble with handwritten-style text and controls
                const aiBubble = document.createElement('div');
                aiBubble.className = 'text-bubble ai-response font-caveat'; // Default handwriting font
                aiBubble.id = `ai-text-${id}`;
                aiBubble.innerHTML = `
                    <h4>Claude:</h4>
                    <div class="content">${lastAIMessage.content}</div>
                    <div class="bubble-controls">
                        <button class="bubble-control-btn bubble-toggle-btn" title="Collapse/Expand">
                            <i class="fas fa-chevron-up"></i>
                        </button>
                        <button class="bubble-control-btn bubble-remove-btn" title="Hide">
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="bubble-control-btn bubble-font-btn" title="Change Font">
                            <i class="fas fa-font"></i>
                        </button>
                    </div>
                    <select class="font-selector" title="Change font style" style="display: none;">
                        <option value="font-caveat" selected>Caveat</option>
                        <option value="font-architects-daughter">Architects Daughter</option>
                        <option value="font-indie-flower">Indie Flower</option>
                        <option value="font-dancing-script">Dancing Script</option>
                        <option value="font-normal">Normal</option>
                    </select>
                `;
                
                // Position the AI bubble
                aiBubble.style.left = `${startX}px`;
                aiBubble.style.top = `${aiBubbleY}px`;
                aiBubble.style.maxWidth = `${maxWidth}px`;
                aiBubble.style.transform = `scale(${scale})`;
                textOverlaysContainer.appendChild(aiBubble);
            }
        } else {
            console.warn('Encountered an invalid notebook item:', item);
        }
    });
    
    // Add event listeners for bubbles
    const bubbles = document.querySelectorAll('.text-bubble');
    bubbles.forEach(bubble => {
        // Allow for dragging to reposition bubbles
        bubble.addEventListener('mousedown', startDraggingBubble);
        
        // Double-click to edit text (for user bubbles only)
        if (bubble.classList.contains('user-text')) {
            bubble.addEventListener('dblclick', (e) => {
                // Don't allow editing if clicked on controls
                if (e.target.closest('.bubble-controls')) return;
                
                const content = bubble.querySelector('.content');
                content.contentEditable = 'true';
                content.focus();
            });
            
            // Save changes on blur
            const content = bubble.querySelector('.content');
            content.addEventListener('blur', (e) => {
                content.contentEditable = 'false';
                // TODO: Save edited content
            });
        }
        
        // Handle bubble toggle (collapse/expand)
        const toggleBtn = bubble.querySelector('.bubble-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                bubble.classList.toggle('collapsed');
                
                // Save collapse state in localStorage
                const bubbleId = bubble.id;
                if (bubble.classList.contains('collapsed')) {
                    localStorage.setItem(`${bubbleId}-collapsed`, 'true');
                } else {
                    localStorage.removeItem(`${bubbleId}-collapsed`);
                }
            });
            
            // Check if this bubble was previously collapsed
            const bubbleId = bubble.id;
            const wasCollapsed = localStorage.getItem(`${bubbleId}-collapsed`);
            if (wasCollapsed === 'true') {
                bubble.classList.add('collapsed');
            }
        }
        
        // Handle bubble removal
        const removeBtn = bubble.querySelector('.bubble-remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                bubble.style.display = 'none';
                
                // Save hidden state in localStorage
                const bubbleId = bubble.id;
                localStorage.setItem(`${bubbleId}-hidden`, 'true');
            });
            
            // Check if this bubble was previously hidden
            const bubbleId = bubble.id;
            const wasHidden = localStorage.getItem(`${bubbleId}-hidden`);
            if (wasHidden === 'true') {
                bubble.style.display = 'none';
            }
        }
        
        // Handle font selection for AI responses
        if (bubble.classList.contains('ai-response')) {
            const fontSelector = bubble.querySelector('.font-selector');
            const fontBtn = bubble.querySelector('.bubble-font-btn');
            
            // Toggle font selector visibility
            if (fontBtn && fontSelector) {
                fontBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    fontSelector.style.display = fontSelector.style.display === 'none' ? 'block' : 'none';
                });
            }
            
            if (fontSelector) {
                fontSelector.addEventListener('change', (e) => {
                    // Remove all font classes
                    bubble.classList.remove(
                        'font-caveat',
                        'font-architects-daughter',
                        'font-indie-flower',
                        'font-dancing-script',
                        'font-normal'
                    );
                    
                    // Add the selected font class
                    bubble.classList.add(e.target.value);
                    
                    // Store the bubble-specific font preference
                    const bubbleId = bubble.id;
                    localStorage.setItem(`${bubbleId}-font`, e.target.value);
                    
                    // Hide the selector after selection
                    fontSelector.style.display = 'none';
                });
                
                // Apply the bubble-specific font preference if available
                const bubbleId = bubble.id;
                const bubbleFont = localStorage.getItem(`${bubbleId}-font`);
                
                if (bubbleFont) {
                    bubble.classList.remove(
                        'font-caveat',
                        'font-architects-daughter',
                        'font-indie-flower',
                        'font-dancing-script',
                        'font-normal'
                    );
                    bubble.classList.add(bubbleFont);
                    fontSelector.value = bubbleFont;
                }
            }
        }
        
        // Allow clicking on collapsed bubbles to expand them
        bubble.addEventListener('click', (e) => {
            if (bubble.classList.contains('collapsed') && 
                !e.target.closest('.bubble-controls')) {
                bubble.classList.remove('collapsed');
                localStorage.removeItem(`${bubble.id}-collapsed`);
            }
        });
    });
}

// Function to handle dragging bubbles
function startDraggingBubble(e) {
    const bubble = e.currentTarget;
    let isDragging = false;
    let startX = e.clientX;
    let startY = e.clientY;
    let initialLeft = parseInt(bubble.style.left);
    let initialTop = parseInt(bubble.style.top);
    
    // Only start dragging if not clicking on text content
    if (e.target.classList.contains('content') || e.target.tagName === 'H4') {
        return;
    }
    
    // Mouse move handler for dragging
    function handleDragMove(e) {
        if (!isDragging) {
            isDragging = true;
            bubble.style.opacity = '0.8';
            bubble.style.cursor = 'grabbing';
        }
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        bubble.style.left = `${initialLeft + dx}px`;
        bubble.style.top = `${initialTop + dy}px`;
    }
    
    // Mouse up handler to end dragging
    function handleDragEnd() {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        
        if (isDragging) {
            bubble.style.opacity = '1';
            bubble.style.cursor = 'text';
        }
    }
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
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
