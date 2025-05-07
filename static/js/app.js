import { initCanvas, setDrawMode, setSelectMode, setPanMode, setZoomMode, clearCanvas, drawTextOnCanvas, clearSelection, redrawCanvas, zoomIn, zoomOut, undo, redo, refreshCanvas, updateDrawings } from './canvasManager.js';
import { saveNotebookItem, getAllNotebookItems, exportNotebook, importNotebook, clearNotebook, saveDrawings, getDrawings, getInitialDrawingData, saveToWeb,getMostRecentDrawings } from './dataManager.js';
import { sendImageToAI, sendChatToAI } from './aiService.js';
import { getConfig } from './config.js';
import { initPromptCanvas, clearPromptCanvas, submitHandwrittenPrompt, toggleWritePromptPanel } from './promptManager.js';
import { renderHandwriting, handwritingStyles } from './handwritingSimulation.js';

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
        setupChatInputHandlers(); // Initialize chat input handlers
        
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
    
    // Direct handwriting prompt elements
    const directChatButton = document.getElementById('direct-chat-button');
    const writePromptPanel = document.getElementById('write-prompt-panel');
    const closePanelBtn = document.getElementById('close-prompt-panel');
    const clearPromptBtn = document.getElementById('clear-prompt-btn');
    const submitPromptBtn = document.getElementById('submit-prompt-btn');
    
    // Response modal elements
    const etchToCanvasBtn = document.getElementById('etch-to-canvas-btn');
    
    drawBtn.addEventListener('click', () => {
        setDrawMode();
        setActiveButton(drawBtn);
        isZoomMode = false;
    });
    selectBtn.addEventListener('click', () => {
        setSelectMode();
        setActiveButton(selectBtn);
        isZoomMode = false;
        
        // Show a tooltip to guide selection
        showSelectTooltip();
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
    
    // Direct handwriting prompt handlers
    if (directChatButton) {
        directChatButton.addEventListener('click', () => {
            toggleWritePromptPanel();
            initPromptCanvas(); // Initialize prompt canvas when opened
        });
    }
    
    if (closePanelBtn) {
        closePanelBtn.addEventListener('click', () => {
            writePromptPanel.classList.add('hidden');
        });
    }
    
    if (clearPromptBtn) {
        clearPromptBtn.addEventListener('click', clearPromptCanvas);
    }
    
    if (submitPromptBtn) {
        submitPromptBtn.addEventListener('click', submitHandwrittenPrompt);
    }
    
    // Etch to canvas button handler
    if (etchToCanvasBtn) {
        etchToCanvasBtn.addEventListener('click', handleEtchToCanvas);
    }
    
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
        
        // Get all notebook items to include in the PDF
        const notebookItems = await getAllNotebookItems();
        
        // Create a PDF using jsPDF (using CDN, already included in index.html)
        const { jsPDF } = window.jspdf;
        
        // Determine PDF orientation based on canvas dimensions
        const orientation = tempCanvas.width > tempCanvas.height ? 'landscape' : 'portrait';
        
        // Create PDF with the canvas dimensions
        const pdf = new jsPDF(orientation, 'pt', [tempCanvas.width, tempCanvas.height]);
        
        // First page: Canvas content
        // Convert the canvas to an image and add to the PDF
        const imgData = tempCanvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, tempCanvas.width, tempCanvas.height);
        
        // Add a second page with all text conversations
        if (notebookItems.length > 0) {
            // Add a new page
            pdf.addPage();
            
            // Set some styles for the text
            pdf.setFontSize(16);
            pdf.setTextColor(0, 0, 0);
            
            // Add title
            pdf.setFont('helvetica', 'bold');
            pdf.text('Cursive Notebook - Conversations', 40, 40);
            
            // Set position for content
            let yPos = 80;
            const margin = 40;
            const pageWidth = pdf.internal.pageSize.getWidth();
            const textWidth = pageWidth - (margin * 2);
            
            // Add each conversation
            for (let i = 0; i < notebookItems.length; i++) {
                const item = notebookItems[i];
                if (!item || !item.transcription) continue;
                
                // Check if we need to add a new page (if less than 100 points left on page)
                if (yPos > pdf.internal.pageSize.getHeight() - 100) {
                    pdf.addPage();
                    yPos = 80;
                }
                
                // User's text
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Conversation ${i+1}:`, margin, yPos);
                yPos += 25;
                
                pdf.setFont('helvetica', 'normal');
                pdf.text(`You wrote:`, margin, yPos);
                yPos += 20;
                
                const userTextLines = pdf.splitTextToSize(item.transcription, textWidth);
                pdf.text(userTextLines, margin, yPos);
                yPos += userTextLines.length * 15 + 10;
                
                // AI's response
                if (item.chatHistory && item.chatHistory.length > 0) {
                    const lastAIMessage = item.chatHistory.filter(msg => msg.role === 'assistant').pop();
                    if (lastAIMessage) {
                        pdf.setFont('helvetica', 'italic');
                        pdf.text(`Claude:`, margin, yPos);
                        yPos += 20;
                        
                        const aiTextLines = pdf.splitTextToSize(lastAIMessage.content, textWidth);
                        pdf.text(aiTextLines, margin, yPos);
                        yPos += aiTextLines.length * 15 + 30;
                    }
                }
                
                // Add a separator line for all but the last item
                if (i < notebookItems.length - 1) {
                    pdf.setDrawColor(200, 200, 200);
                    pdf.line(margin, yPos - 10, pageWidth - margin, yPos - 10);
                    yPos += 20;
                }
            }
        }
        
        // Save the PDF
        pdf.save('cursive_notebook.pdf');
        
        // Show a toast notification
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = 'PDF exported successfully!';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 500);
        }, 2000);
        
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
    const promptModal = document.getElementById('prompt-modal');
    const infoModal = document.getElementById('info-modal');
    
    // Fix for close buttons
    if (event.target.classList.contains('close')) {
        const parentModal = event.target.closest('.modal');
        if (parentModal) {
            parentModal.style.display = 'none';
            if (parentModal.id === 'response-modal') {
                // Trigger redraw after closing the modal
                redrawCanvas();
            }
            return;
        }
    }
    
    // Close modals if clicking outside of the modal content
    if (event.target === modal) {
        modal.style.display = 'none';
        redrawCanvas();
    }
    
    if (event.target === saveToWebModal) {
        saveToWebModal.style.display = 'none';
    }
    
    if (event.target === promptModal) {
        promptModal.style.display = 'none';
    }
    
    if (event.target === infoModal) {
        infoModal.style.display = 'none';
    }
}

window.onerror = function(message, source, lineno, colno, error) {
    debugLog('Error:', message, 'at', source, 'line', lineno);
};

// Function to show selection tooltip for better UX
function showSelectTooltip() {
    // Create tooltip if it doesn't exist
    let tooltip = document.querySelector('.select-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'select-tooltip';
        tooltip.innerHTML = `
            <i class="fas fa-vector-square"></i>
            <div>Draw a box around text to select it for chat</div>
        `;
        document.body.appendChild(tooltip);
    }
    
    // Show tooltip
    tooltip.classList.add('visible');
    
    // Hide after 3 seconds
    setTimeout(() => {
        tooltip.classList.remove('visible');
    }, 3000);
}

// Setup handlers for the chat input options in the response modal
function setupChatInputHandlers() {
    // Get elements
    const typeTextBtn = document.getElementById('type-text-btn');
    const drawTextBtn = document.getElementById('draw-text-btn');
    const chatInput = document.getElementById('chat-input');
    const chatDrawingContainer = document.getElementById('chat-drawing-container');
    const chatDrawingCanvas = document.getElementById('chat-drawing-canvas');
    const clearDrawingBtn = document.getElementById('clear-drawing-btn');
    const sendChatBtn = document.getElementById('send-chat-btn');
    
    if (!typeTextBtn || !drawTextBtn || !chatInput || !chatDrawingContainer || !chatDrawingCanvas) {
        console.error('Could not find all chat input elements');
        return;
    }
    
    // Initialize chat drawing canvas
    let chatDrawingCtx = chatDrawingCanvas.getContext('2d');
    let isDrawing = false;
    let lastX, lastY;
    
    // Size the canvas to its container
    function resizeChatCanvas() {
        chatDrawingCanvas.width = chatDrawingContainer.clientWidth;
        chatDrawingCanvas.height = chatDrawingContainer.clientHeight;
        
        // Reset drawing context properties after resize
        chatDrawingCtx.strokeStyle = '#000000';
        chatDrawingCtx.lineWidth = 2;
        chatDrawingCtx.lineCap = 'round';
        chatDrawingCtx.lineJoin = 'round';
        
        // Clear canvas to white
        chatDrawingCtx.fillStyle = 'white';
        chatDrawingCtx.fillRect(0, 0, chatDrawingCanvas.width, chatDrawingCanvas.height);
    }
    
    // Input option toggle handlers
    typeTextBtn.addEventListener('click', () => {
        typeTextBtn.classList.add('active');
        drawTextBtn.classList.remove('active');
        chatInput.classList.remove('hidden');
        chatDrawingContainer.classList.add('hidden');
    });
    
    drawTextBtn.addEventListener('click', () => {
        drawTextBtn.classList.add('active');
        typeTextBtn.classList.remove('active');
        chatInput.classList.add('hidden');
        chatDrawingContainer.classList.remove('hidden');
        
        // Resize and initialize canvas when showing
        resizeChatCanvas();
    });
    
    // Drawing handlers for chat canvas
    chatDrawingCanvas.addEventListener('pointerdown', (e) => {
        isDrawing = true;
        const rect = chatDrawingCanvas.getBoundingClientRect();
        [lastX, lastY] = [e.clientX - rect.left, e.clientY - rect.top];
        
        // Start path
        chatDrawingCtx.beginPath();
        chatDrawingCtx.moveTo(lastX, lastY);
    });
    
    chatDrawingCanvas.addEventListener('pointermove', (e) => {
        if (!isDrawing) return;
        
        const rect = chatDrawingCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Get pressure information if available
        let pressure = e.pressure || 1.0;
        const lineWidth = 2 * (0.5 + pressure * 1.5);
        chatDrawingCtx.lineWidth = lineWidth;
        
        chatDrawingCtx.lineTo(x, y);
        chatDrawingCtx.stroke();
        
        // Start new path for next segment
        chatDrawingCtx.beginPath();
        chatDrawingCtx.moveTo(x, y);
        
        [lastX, lastY] = [x, y];
    });
    
    chatDrawingCanvas.addEventListener('pointerup', () => {
        isDrawing = false;
    });
    
    chatDrawingCanvas.addEventListener('pointerout', () => {
        isDrawing = false;
    });
    
    // Clear drawing button
    clearDrawingBtn.addEventListener('click', () => {
        chatDrawingCtx.fillStyle = 'white';
        chatDrawingCtx.fillRect(0, 0, chatDrawingCanvas.width, chatDrawingCanvas.height);
    });
    
    // Modified send button handler to handle both text and drawing
    sendChatBtn.addEventListener('click', async () => {
        // Check if we're in text or drawing mode
        const isDrawingMode = drawTextBtn.classList.contains('active');
        
        if (isDrawingMode) {
            // Handle drawn input
            const imageData = chatDrawingCanvas.toDataURL('image/png');
            await handleDrawnChatInput(imageData);
            
            // Clear the drawing for next input
            chatDrawingCtx.fillStyle = 'white';
            chatDrawingCtx.fillRect(0, 0, chatDrawingCanvas.width, chatDrawingCanvas.height);
        } else {
            // Handle typed text input
            const text = chatInput.value.trim();
            if (text) {
                await handleTypedChatInput(text);
                chatInput.value = ''; // Clear input
            }
        }
    });
    
    // Also handle Enter key for text input
    chatInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (text) {
                await handleTypedChatInput(text);
                chatInput.value = ''; // Clear input
            }
        }
    });
    
    // Initialize the canvas
    resizeChatCanvas();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (!chatDrawingContainer.classList.contains('hidden')) {
            resizeChatCanvas();
        }
    });
}

// Handle chat input that was typed
async function handleTypedChatInput(text) {
    try {
        showLoading();
        
        // Add user message to chat history
        currentChatHistory.push({ role: 'user', content: text });
        
        // Update response modal content
        const content = document.getElementById('response-content');
        
        // Add the new user message to the display
        const userMessageElement = document.createElement('div');
        userMessageElement.classList.add('chat-message', 'user-message');
        userMessageElement.innerHTML = `<strong>You:</strong> ${text}`;
        content.appendChild(userMessageElement);
        
        // Add typing indicator
        const typingElement = document.createElement('div');
        typingElement.classList.add('chat-message', 'ai-message', 'typing');
        typingElement.innerHTML = `<strong>Claude:</strong> <span class="typing-indicator">...</span>`;
        content.appendChild(typingElement);
        
        // Scroll to bottom of content
        content.scrollTop = content.scrollHeight;
        
        // Setup streaming response handler
        let responseText = '';
        const onProgress = (text) => {
            responseText = text;
            
            // Use our new handwriting simulation for AI responses
            typingElement.innerHTML = `<strong>Claude:</strong>`;
            
            // Create a handwriting container div
            const handwritingContainer = document.createElement('div');
            handwritingContainer.className = 'handwriting-container';
            
            // Get a random handwriting style with a preference for cursive or neat
            const styleNames = Object.keys(handwritingStyles);
            const styleName = Math.random() > 0.5 ? 'cursive' : 'neat';
            const style = handwritingStyles[styleName];
            
            // Render the handwriting
            renderHandwriting(handwritingContainer, text, {
                width: content.offsetWidth - 60, // Account for padding
                fontSize: 20,
                ...style,
                color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim()
            });
            
            typingElement.appendChild(handwritingContainer);
            content.scrollTop = content.scrollHeight;
        };
        
        // Send the request with streaming enabled
        const chatResponse = await sendChatToAI(currentChatHistory, onProgress);
        
        // Update chat history with AI response
        currentChatHistory.push({ role: 'assistant', content: chatResponse });
        
        // Create a pseudo-selection for this chat (for tracking in notebook)
        const notebookItem = {
            id: Date.now().toString(),
            selectionBox: { x: 0, y: 0, width: 100, height: 50 }, // Arbitrary values
            transcription: text,
            tags: ['chat', 'typed'],
            chatHistory: [...currentChatHistory],
            isDirectChat: true
        };
        
        // Save to notebook
        await saveNotebookItem(notebookItem);
        
        // Redraw main canvas to show new notebook items
        redrawCanvas();
    } catch (error) {
        console.error('Error handling chat input:', error);
        alert('Error processing your message. Please try again.');
    } finally {
        hideLoading();
    }
}

// Handle chat input that was drawn
async function handleDrawnChatInput(imageData) {
    try {
        showLoading();
        
        // Transcribe the drawing first
        const config = await getConfig();
        const response = await fetch('/api/claude', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: config.claude.model,
                max_tokens: config.claude.max_tokens,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "image",
                                source: {
                                    type: "base64",
                                    media_type: "image/png",
                                    data: imageData.split(',')[1]
                                }
                            },
                            {
                                type: "text",
                                text: "Transcribe this handwritten text and respond in valid JSON with the following structure:\n" +
                                "{\n" +
                                "  \"transcription\": \"provide only transcription of the handwriting\",\n" +
                                "  \"tags\": [\"tag1\", \"tag2\", \"tag3\", \"tag4\", \"tag5\"]\n" +
                                "}\n" +
                                "Provide up to 5 relevant tags for the content."
                            }
                        ]
                    }
                ]
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to transcribe handwriting');
        }
        
        const data = await response.json();
        let transcription = '';
        let tags = [];
        
        try {
            const parsedResponse = JSON.parse(data.content[0].text);
            transcription = parsedResponse.transcription || '';
            tags = parsedResponse.tags || [];
        } catch (error) {
            console.error('Error parsing transcription:', error);
            transcription = 'Error transcribing handwriting';
        }
        
        if (!transcription) {
            throw new Error('Failed to transcribe handwriting');
        }
        
        // Update response modal content
        const content = document.getElementById('response-content');
        
        // Add the transcribed user message to the display
        const userMessageElement = document.createElement('div');
        userMessageElement.classList.add('chat-message', 'user-message');
        userMessageElement.innerHTML = `
            <strong>You (handwritten):</strong> ${transcription}
            <div class="handwriting-preview">
                <img src="${imageData}" alt="Your handwriting" style="max-width: 200px; max-height: 80px;">
            </div>
        `;
        content.appendChild(userMessageElement);
        
        // Add typing indicator
        const typingElement = document.createElement('div');
        typingElement.classList.add('chat-message', 'ai-message', 'typing');
        typingElement.innerHTML = `<strong>Claude:</strong> <span class="typing-indicator">...</span>`;
        content.appendChild(typingElement);
        
        // Scroll to bottom of content
        content.scrollTop = content.scrollHeight;
        
        // Add to chat history
        currentChatHistory.push({ role: 'user', content: transcription });
        
        // Setup streaming response handler
        let responseText = '';
        const onProgress = (text) => {
            responseText = text;
            
            // Use our new handwriting simulation for AI responses
            typingElement.innerHTML = `<strong>Claude:</strong>`;
            
            // Create a handwriting container div
            const handwritingContainer = document.createElement('div');
            handwritingContainer.className = 'handwriting-container';
            
            // Use the "messy" style for more character
            const style = handwritingStyles.messy;
            
            // Render the handwriting
            renderHandwriting(handwritingContainer, text, {
                width: content.offsetWidth - 60, // Account for padding
                fontSize: 20,
                ...style,
                color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim()
            });
            
            typingElement.appendChild(handwritingContainer);
            content.scrollTop = content.scrollHeight;
        };
        
        // Send to Claude with streaming
        const chatResponse = await sendChatToAI(currentChatHistory, onProgress);
        
        // Update chat history
        currentChatHistory.push({ role: 'assistant', content: chatResponse });
        
        // Create a notebook item for tracking
        const notebookItem = {
            id: Date.now().toString(),
            selectionBox: { x: 0, y: 0, width: 100, height: 50 }, // Arbitrary values
            transcription: transcription,
            tags: tags,
            chatHistory: [...currentChatHistory],
            isDirectChat: true,
            handwritingImage: imageData
        };
        
        // Save to notebook
        await saveNotebookItem(notebookItem);
        
        // Redraw main canvas to show new notebook items
        redrawCanvas();
    } catch (error) {
        console.error('Error handling drawn chat input:', error);
        alert('Error processing your handwritten message. Please try again.');
    } finally {
        hideLoading();
    }
}

// Handle etching the current AI response to the canvas
async function handleEtchToCanvas() {
    try {
        // Check if we have recent AI responses
        if (currentChatHistory.length === 0) {
            alert('No recent AI responses to etch to canvas.');
            return;
        }
        
        // Get the last AI response
        const lastAIMessage = currentChatHistory.filter(msg => msg.role === 'assistant').pop();
        if (!lastAIMessage) {
            alert('No AI response to etch to canvas.');
            return;
        }
        
        // Show loading overlay
        showLoading();
        
        // Import the handwriting simulation functionality
        const { drawHandwritingOnCanvas } = await import('./canvasManager.js');
        
        // Get current canvas dimensions for positioning
        const canvas = document.getElementById('drawing-canvas');
        const centerX = canvas.width / 3;  // Offset from center for better positioning
        const centerY = canvas.height / 3;
        
        // Draw the handwriting on the canvas - adjust position based on current view
        await drawHandwritingOnCanvas(
            lastAIMessage.content,
            centerX / scale - panX / scale, // Convert to canvas coordinates
            centerY / scale - panY / scale,
            600, // Max width
            { style: 'cursive' }
        );
        
        // Create an animation to highlight the new text
        const tempOverlay = document.createElement('div');
        tempOverlay.className = 'etched-text-highlight';
        tempOverlay.style.position = 'fixed';
        tempOverlay.style.left = `${centerX}px`;
        tempOverlay.style.top = `${centerY}px`;
        tempOverlay.style.width = '600px';
        tempOverlay.style.height = '300px';
        tempOverlay.style.background = 'rgba(100, 200, 255, 0.2)';
        tempOverlay.style.borderRadius = '10px';
        tempOverlay.style.pointerEvents = 'none';
        tempOverlay.style.zIndex = '30';
        tempOverlay.style.animation = 'fadeOut 2s forwards';
        
        document.body.appendChild(tempOverlay);
        
        // Remove the animation overlay after it fades out
        setTimeout(() => {
            document.body.removeChild(tempOverlay);
        }, 2000);
        
        // Close the response modal
        const modal = document.getElementById('response-modal');
        modal.style.display = 'none';
        
        // Show a toast notification of success
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = 'Text etched to canvas!';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 500);
        }, 2000);
        
    } catch (error) {
        console.error('Error etching to canvas:', error);
        alert('Error adding response to canvas. Please try again.');
    } finally {
        hideLoading();
    }
}

export { handleImageSelection, handleTranscriptionResponse, displayFullResponse, isZoomMode };
