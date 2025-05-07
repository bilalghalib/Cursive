import { initCanvas, setDrawMode, setSelectMode, setPanMode, setZoomMode, clearCanvas, drawTextOnCanvas, clearSelection, redrawCanvas, zoomIn, zoomOut, undo, redo, refreshCanvas, updateDrawings } from './canvasManager.js';
import { saveNotebookItem, getAllNotebookItems, exportNotebook, importNotebook, clearNotebook, saveDrawings, getDrawings, getInitialDrawingData, saveToWeb,getMostRecentDrawings } from './dataManager.js';
import { sendImageToAI, sendChatToAI } from './aiService.js';
import { getConfig } from './config.js';

let notebookItems = [];
let currentChatHistory = [];
let isDebugMode = false;
let isAppInitialized = false;

let isZoomMode = false;

async function initApp() {
    if (isAppInitialized) return;
    
    showLoading();
    
    try {
        const config = await getConfig();
        if (!config) {
            throw new Error('Configuration not loaded. Cannot initialize app.');
        }
        
        await initCanvas();
        
        let drawings = [];
        
        if (window.pageData) {
            // If pageData is available, use it
            notebookItems = window.pageData.items || [];
            drawings = window.pageData.drawings || [];
            console.log("Loaded data from window.pageData:", { items: notebookItems.length, drawings: drawings.length });
            
            // Save the notebook items to localStorage
            const STORAGE_KEY = config.storage.key;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notebookItems));
            
            // Save the drawings to localStorage
            await saveDrawings(drawings);
        } else {
            // Load from localStorage if window.pageData is not available
            drawings = await getMostRecentDrawings();
            notebookItems = await getAllNotebookItems();
            
            // If both window.pageData and localStorage are empty, load initial drawings
            if (drawings.length === 0) {
                drawings = await getInitialDrawingData();
                await saveDrawings(drawings);
            }
            console.log("Loaded data from localStorage:", { items: notebookItems.length, drawings: drawings.length });
        }
        
        // Update the canvas with the loaded drawings
        await updateDrawings(drawings);
        
        // Redraw the canvas to show the loaded items and drawings
        redrawCanvas();
        
        setupEventListeners();
        setDrawMode();
        initDebugConsole();
        
        isAppInitialized = true;
    } catch (error) {
        console.error('Error initializing app:', error);
        alert(`Error initializing app: ${error.message}\nPlease check the console for more details and refresh the page.`);
    } finally {
        setTimeout(() => {
            hideLoading();
        }, 500);
    }
}
async function loadInitialDrawings() {
    const drawings = await getDrawings();
    if (drawings.length === 0) {
        const initialDrawings = await getInitialDrawingData();
        await saveDrawings(initialDrawings);
        updateDrawings(initialDrawings);
    } else {
        updateDrawings(drawings);
    }
}

function setupEventListeners() {
    const drawBtn = document.getElementById('draw-btn');
    const selectBtn = document.getElementById('select-btn');
    const panBtn = document.getElementById('pan-btn');
    const zoomBtn = document.getElementById('zoom-btn');
    const newSessionBtn = document.getElementById('new-session-btn');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const saveToWebBtn = document.getElementById('save-to-web-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const pdfExportBtn = document.getElementById('pdf-export-btn');
    
    drawBtn.addEventListener('click', () => {
        setDrawMode();
        setActiveButton(drawBtn);
        isZoomMode = false;
    });
    selectBtn.addEventListener('click', () => {
        setSelectMode();
        setActiveButton(selectBtn);
        isZoomMode = false;
    });
    panBtn.addEventListener('click', () => {
        setPanMode();
        setActiveButton(panBtn);
        isZoomMode = false;
    });
    zoomBtn.addEventListener('click', () => {
        isZoomMode = !isZoomMode;
        if (isZoomMode) {
            setZoomMode();
            setActiveButton(zoomBtn);
        } else {
            setDrawMode();
            setActiveButton(drawBtn);
        }
    });
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);
    exportBtn.addEventListener('click', handleExport);
    importBtn.addEventListener('click', handleImport);
    saveToWebBtn.addEventListener('click', handleSaveToWeb);
    
    // Theme toggle handler
    themeToggleBtn.addEventListener('click', () => {
        toggleDarkMode();
    });
    
    // PDF Export handler
    if (pdfExportBtn) {
        pdfExportBtn.addEventListener('click', handlePdfExport);
    }
    
    newSessionBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await startNewSession();
    });
    
    // Initialize theme based on user preference or system setting
    initializeTheme();
}

// Dark mode implementation
function initializeTheme() {
    // Check for saved theme preference or use system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
        document.body.setAttribute('data-theme', 'dark');
        updateThemeToggleIcon(true);
        updateCanvasColors(true);
    } else {
        document.body.setAttribute('data-theme', 'light');
        updateThemeToggleIcon(false);
        updateCanvasColors(false);
    }
}

function toggleDarkMode() {
    const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
    
    if (isDarkMode) {
        document.body.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        updateThemeToggleIcon(false);
        updateCanvasColors(false);
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        updateThemeToggleIcon(true);
        updateCanvasColors(true);
    }
    
    // Redraw the canvas to reflect the theme change
    redrawCanvas();
}

function updateThemeToggleIcon(isDarkMode) {
    const icon = document.querySelector('#theme-toggle i');
    if (isDarkMode) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

function updateCanvasColors(isDarkMode) {
    // Instead of directly accessing ctx, use a function from canvasManager
    // This will trigger a redraw with the updated colors
    redrawCanvas();
}


async function handleSaveToWeb() {
    try {
        showLoading();
        const url = await saveToWeb();
        hideLoading();
        
        // Show a modal with the URL and copy-to-clipboard button
        showSaveToWebModal(url);
    } catch (error) {
        console.error('Error saving to web:', error);
        hideLoading();
        alert('Error saving to web. Please try again.');
    }
}

function setActiveButton(activeButton) {
    const buttons = document.querySelectorAll('#toolbar button');
    buttons.forEach(button => button.classList.remove('active'));
    activeButton.classList.add('active');
}

function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

async function handleImageSelection(selectionData) {
    try {
        showLoading();
        debugLog('Sending image to AI...', selectionData);
        const aiResponse = await sendImageToAI(selectionData.imageData);
        debugLog('AI Response received:', aiResponse);
        
        const transcription = aiResponse.transcription;
        
        debugLog('Sending transcription to chat AI...');
        currentChatHistory.push({ role: 'user', content: transcription });
        
        // Get chat response from Claude (this now shows response modal)
        const chatResponse = await handleTranscriptionResponse(transcription);
        
        currentChatHistory.push({ role: 'assistant', content: chatResponse });
        
        const notebookItem = {
            id: Date.now().toString(),
            selectionBox: selectionData.box,
            transcription: transcription,
            tags: aiResponse.tags,
            chatHistory: [...currentChatHistory]
        };
        
        notebookItems.push(notebookItem);
        await saveNotebookItem(notebookItem);
        
        debugLog('Notebook item saved and displayed');
        
        setDrawMode();
        setActiveButton(document.getElementById('draw-btn'));
        
        // No immediate redraw needed as modal is already showing response
        // We'll redraw when the modal is closed
        
        // Add event listener to redraw after modal is closed
        const modal = document.getElementById('response-modal');
        const onModalClose = () => {
            redrawCanvas();
            modal.removeEventListener('click', onModalClose);
        };
        modal.addEventListener('click', onModalClose);
        
    } catch (error) {
        console.error('Error handling image selection:', error);
        console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        alert(`Error processing image: ${error.message}. Please try again.`);
        
        setDrawMode();
        setActiveButton(document.getElementById('draw-btn'));
    } finally {
        hideLoading();
    }
}

async function handleTranscriptionResponse(transcription) {
    try {
        showLoading();
        
        // Get response modal elements
        const modal = document.getElementById('response-modal');
        const content = document.getElementById('response-content');
        
        // Show the modal with loading indicator
        content.innerHTML = `
            <p><strong>Transcription:</strong> ${transcription}</p>
            <p><strong>AI is thinking...</strong> <span class="typing-indicator">...</span></p>
        `;
        modal.style.display = 'block';
        
        // Setup streaming response handler
        let responseText = '';
        const onProgress = (text) => {
            responseText = text;
            content.innerHTML = `
                <p><strong>Transcription:</strong> ${transcription}</p>
                <p><strong>AI:</strong> ${text}</p>
            `;
        };
        
        // Send the request with streaming enabled
        const chatResponse = await sendChatToAI(currentChatHistory, onProgress);
        debugLog('Chat response:', chatResponse);
        
        return chatResponse;
    } catch (error) {
        console.error('Error handling transcription response:', error);
        debugLog('Error: ' + error.message);
        return 'Error processing transcription';
    } finally {
        hideLoading();
    }
}

async function loadNotebook() {
    notebookItems = await getAllNotebookItems();
    redrawCanvas();
}

function displayFullResponse(item) {
    // Don't show modal for items already displayed on canvas
    // This prevents duplication between the popup and canvas drawing
    if (item.displayed) {
        return;
    }
    
    const modal = document.getElementById('response-modal');
    const content = document.getElementById('response-content');
    content.innerHTML = `
        <p><strong>Transcription:</strong> ${item.transcription}</p>
        <p><strong>Chat History:</strong></p>
        ${item.chatHistory.map(message => `<p><strong>${message.role}:</strong> ${message.content}</p>`).join('')}
        <p><strong>Tags:</strong> ${item.tags ? item.tags.join(', ') : 'No tags'}</p>
    `;
    modal.style.display = 'block';
    
    // Mark this item as displayed to prevent showing modal again
    item.displayed = true;
}

async function startNewSession() {
    
    clearCanvas();
    await clearNotebook();
    notebookItems = [];
    currentChatHistory = [];
    await saveDrawings([]);
    debugLog('New session started. Canvas, local storage, and chat history cleared.');
    redrawCanvas();
    refreshCanvas();
    
    // Change the URL to the root state
    window.history.pushState({}, '', '/');
}

function initDebugConsole() {
    const debugConsole = document.getElementById('debug-console');
    if (debugConsole) {
        debugConsole.style.display = isDebugMode ? 'block' : 'none';
    }
}

function toggleDebugMode() {
    isDebugMode = !isDebugMode;
    const debugConsole = document.getElementById('debug-console');
    if (debugConsole) {
        debugConsole.style.display = isDebugMode ? 'block' : 'none';
    }
}

function debugLog(...args) {
    if (!isDebugMode) return;
    const debugConsole = document.getElementById('debug-console');
    if (debugConsole) {
        const log = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
        debugConsole.innerHTML += log + '<br>';
        debugConsole.scrollTop = debugConsole.scrollHeight;
    }
    console.log(...args);
}

async function handleExport() {
    try {
        showLoading();
        await exportNotebook();
        hideLoading();
    } catch (error) {
        console.error('Error exporting notebook:', error);
        alert('Error exporting notebook. Please try again.');
        hideLoading();
    }
}

// PDF export functionality
async function handlePdfExport() {
    try {
        showLoading();
        
        // Create a temporary canvas for PDF export
        const tempCanvas = document.createElement('canvas');
        const actualCanvas = document.getElementById('drawing-canvas');
        tempCanvas.width = actualCanvas.width;
        tempCanvas.height = actualCanvas.height;
        
        // Get the context and copy the current canvas content
        const tempCtx = tempCanvas.getContext('2d');
        
        // Fill with background color
        const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
        if (isDarkMode) {
            tempCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--canvas-color').trim();
        } else {
            tempCtx.fillStyle = 'white';
        }
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Draw the canvas content to the temp canvas
        tempCtx.drawImage(actualCanvas, 0, 0);
        
        // Convert the canvas to an image
        const imgData = tempCanvas.toDataURL('image/png');
        
        // Create a PDF using jsPDF (using CDN, already included in index.html)
        const { jsPDF } = window.jspdf;
        
        // Determine PDF orientation based on canvas dimensions
        const orientation = tempCanvas.width > tempCanvas.height ? 'landscape' : 'portrait';
        const pdf = new jsPDF(orientation, 'pt', [tempCanvas.width, tempCanvas.height]);
        
        // Add the image to the PDF
        pdf.addImage(imgData, 'PNG', 0, 0, tempCanvas.width, tempCanvas.height);
        
        // Save the PDF
        pdf.save('cursive_notebook.pdf');
        
        hideLoading();
    } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('Error exporting to PDF. Please try again.');
        hideLoading();
    }
}

function setupFileDropZone() {
    const dropZone = document.getElementById('file-drop-zone');
    const fileSelectBtn = document.getElementById('file-select-btn');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    fileSelectBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    return dropZone;
}

async function handleFile(file) {
    const dropZone = document.getElementById('file-drop-zone');
    dropZone.style.display = 'none';

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            showLoading();
            const importedData = await importNotebook(file);
            
            if (importedData.items && Array.isArray(importedData.items)) {
                notebookItems = importedData.items;
                await Promise.all(notebookItems.map(item => saveNotebookItem(item)));
            }
            
            if (importedData.drawings && Array.isArray(importedData.drawings)) {
                await updateDrawings(importedData.drawings);
                await saveDrawings(importedData.drawings);
            }
            
            await loadNotebook();
            redrawCanvas();
            refreshCanvas();
            hideLoading();
            return;
        } catch (error) {
            console.error(`Error importing notebook (Attempt ${attempts + 1}/${maxAttempts}):`, error);
            attempts++;
            if (attempts >= maxAttempts) {
                alert(`Error importing notebook after ${maxAttempts} attempts. Please try again later.`);
            } else {
                alert(`Import failed. Retrying... (Attempt ${attempts + 1}/${maxAttempts})`);
            }
        } finally {
            hideLoading();
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

function handleImport() {
    const dropZone = setupFileDropZone();
    dropZone.style.display = 'flex';
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}


function showSaveToWebModal(url) {
    const modal = document.getElementById('save-to-web-modal');
    const urlDisplay = document.getElementById('save-to-web-url');
    const copyButton = document.getElementById('copy-url-button');
    const goToPageButton = document.getElementById('go-to-page-button');
    
    urlDisplay.textContent = url;
    modal.style.display = 'block';
    
    copyButton.onclick = () => {
        navigator.clipboard.writeText(url).then(() => {
            alert('URL copied to clipboard!');
        }).catch(err => {
            console.error('Could not copy text: ', err);
            alert('Failed to copy URL. Please copy it manually.');
        });
    };
    
    goToPageButton.onclick = () => {
        window.location.href = url;
    };
}

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        // Page was loaded from cache
        isAppInitialized = false;
        initApp();
    }
});

// Improve modal behavior
window.onclick = function(event) {
    const modal = document.getElementById('response-modal');
    const saveToWebModal = document.getElementById('save-to-web-modal');
    
    // Close response modal if clicking anywhere in the modal or on the close button
    if (event.target == modal || 
        event.target.closest('.modal-content') && modal.style.display === 'block' || 
        event.target.className == 'close') {
        modal.style.display = 'none';
        // Trigger redraw after closing the modal
        redrawCanvas();
    }
    
    // Handle save-to-web modal separately
    if (event.target == saveToWebModal) {
        saveToWebModal.style.display = 'none';
    }
}

window.onerror = function(message, source, lineno, colno, error) {
    debugLog('Error:', message, 'at', source, 'line', lineno);
};

export { handleImageSelection, handleTranscriptionResponse, displayFullResponse, isZoomMode };
