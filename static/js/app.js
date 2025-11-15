import { initCanvas, setDrawMode, setSelectMode, setPanMode, setZoomMode, clearCanvas, drawTextOnCanvas, clearSelection, redrawCanvas, zoomIn, zoomOut, undo, redo, refreshCanvas, updateDrawings, getCanvasScale, getCanvasPanX, getCanvasPanY } from './canvasManager.js';
import { saveNotebookItem, getAllNotebookItems, exportNotebook, importNotebook, clearNotebook, saveDrawings, getDrawings, getInitialDrawingData, saveToWeb,getMostRecentDrawings } from './dataManager.js';
import { sendImageToAI, sendChatToAI } from './aiService.js';
import { getConfig } from './config.js';
import { initPromptCanvas, clearPromptCanvas, submitHandwrittenPrompt, toggleWritePromptPanel } from './promptManager.js';
import { renderHandwriting, handwritingStyles } from './handwritingSimulation.js';
import { pluginManager } from './pluginManager.js';
import { getAllPlugins } from './plugins/index.js';
import { isAuthenticated, login, signUp, logout, getCurrentUser, validatePassword, isValidEmail, getSession, getPasswordStrength } from './authService.js';
import { loadSharedNotebook } from './sharingService.js';
import { initCollaboration, broadcastCursorMove } from './collaborationService.js';

let notebookItems = [];
let currentChatHistory = [];
let isDebugMode = false;
let isAppInitialized = false;

let isZoomMode = false;

// Expose redrawCanvas to window for plugins
window.redrawCanvas = redrawCanvas;

async function initApp() {
    if (isAppInitialized) return;

    showLoading();

    try {
        const config = await getConfig();
        if (!config) {
            throw new Error('Configuration not loaded. Cannot initialize app.');
        }

        // Initialize auth UI (works for both logged in and logged out states)
        setupAuthUI();

        await initCanvas();

        let drawings = [];

        // Check if this is a shared notebook view
        if (window.shareId) {
            console.log('Loading shared notebook:', window.shareId);
            try {
                const { notebook, drawings: sharedDrawings } = await loadSharedNotebook(window.shareId);
                drawings = sharedDrawings;
                notebookItems = [];

                console.log(`Loaded shared notebook: ${notebook.title} (${drawings.length} drawings)`);

                // Save to localStorage for offline viewing
                await saveDrawings(drawings);

                // Initialize collaboration if user is authenticated
                if (isAuthenticated()) {
                    await initCollaboration(notebook.id);
                }
            } catch (error) {
                console.error('Error loading shared notebook:', error);
                alert('Unable to load shared notebook. It may be private or no longer exist.');
            }
        } else if (window.pageData) {
            // If pageData is available, use it (legacy file-based sharing)
            notebookItems = window.pageData.items || [];
            drawings = window.pageData.drawings || [];
            console.log("Loaded data from window.pageData:", { items: notebookItems.length, drawings: drawings.length });

            // Save the notebook items to localStorage
            const STORAGE_KEY = config.storage.key;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notebookItems));

            // Save the drawings to localStorage
            await saveDrawings(drawings);
        } else {
            // Load from localStorage/Supabase if no page data
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

        // Initialize plugin system
        await initPluginSystem();

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
    
    // Direct AI streaming to canvas
    const streamToCanvasBtn = document.getElementById('stream-to-canvas-btn');
    
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
    
    // Stream AI text directly to canvas handler
    if (streamToCanvasBtn) {
        streamToCanvasBtn.addEventListener('click', handleStreamToCanvas);
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

        // Clear previous content
        content.innerHTML = '';

        // Add collapsible transcription (hidden by default)
        const transcriptionToggle = document.createElement('button');
        transcriptionToggle.classList.add('transcription-toggle');
        transcriptionToggle.innerHTML = '<i class="fas fa-chevron-down"></i> Show what I wrote';

        const userMessageElement = document.createElement('div');
        userMessageElement.classList.add('chat-message', 'user-message', 'hidden');
        userMessageElement.setAttribute('data-transcription', 'true');
        userMessageElement.textContent = transcription;

        transcriptionToggle.addEventListener('click', () => {
            userMessageElement.classList.toggle('hidden');
            const icon = transcriptionToggle.querySelector('i');
            if (userMessageElement.classList.contains('hidden')) {
                icon.className = 'fas fa-chevron-down';
                transcriptionToggle.innerHTML = '<i class="fas fa-chevron-down"></i> Show what I wrote';
            } else {
                icon.className = 'fas fa-chevron-up';
                transcriptionToggle.innerHTML = '<i class="fas fa-chevron-up"></i> Hide what I wrote';
            }
        });

        content.appendChild(transcriptionToggle);
        content.appendChild(userMessageElement);

        // Add typing indicator for AI response
        const typingElement = document.createElement('div');
        typingElement.classList.add('chat-message', 'ai-message', 'typing');
        typingElement.innerHTML = `<span class="typing-indicator">...</span>`;
        content.appendChild(typingElement);

        // Show the modal
        modal.style.display = 'block';
        
        // Setup streaming response handler with word-by-word rendering
        let responseText = '';
        let lastWordCount = 0;
        let stabilizationTimer = null;
        
        // Create a handwriting container once
        typingElement.innerHTML = `<strong>Claude:</strong>`;
        const handwritingContainer = document.createElement('div');
        handwritingContainer.className = 'handwriting-container';
        handwritingContainer.id = 'streaming-handwriting-container-selection';
        typingElement.appendChild(handwritingContainer);
        
        // Choose a suitable handwriting style - use cursive for selections from canvas
        const styleName = 'cursive';
        const style = handwritingStyles[styleName];
        
        // Store style settings for reuse
        const handwritingSettings = {
            width: content.offsetWidth - 60, // Account for padding
            fontSize: 20,
            ...style,
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(),
            consistentStyle: true // Keep character styles consistent
        };
        
        // Save original handwriting style for the whole response
        const initialStyle = { ...handwritingSettings };
        
        // Function to handle streamed text updates
        const onProgress = (text) => {
            responseText = text;
            
            // Count words to see if we have new ones to render
            const currentWordCount = text.split(" ").length;
            
            // Only re-render if we have new words
            if (currentWordCount > lastWordCount) {
                // Clear any pending render timer
                if (stabilizationTimer) {
                    clearTimeout(stabilizationTimer);
                }
                
                // Set a short delay before rendering to avoid too many renders when words come quickly
                stabilizationTimer = setTimeout(() => {
                    // Render the handwriting with only the words we have so far
                    renderHandwriting(handwritingContainer, text, {
                        ...initialStyle,
                        // If this is the "final" render (hasn't changed in 300ms), add animation effect 
                        animationDelay: currentWordCount > 30 && Math.random() > 0.8
                    });
                    
                    lastWordCount = currentWordCount;
                    content.scrollTop = content.scrollHeight;
                }, 300); // 300ms delay to stabilize fast word streaming
            }
        };
        
        // Send the request with streaming enabled
        const chatResponse = await sendChatToAI(currentChatHistory, onProgress);
        
        // Final render with complete text - make sure we got everything
        renderHandwriting(handwritingContainer, chatResponse, {
            ...initialStyle
        });
        
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
    // Show loading overlay
    showLoading();
    
    try {
        // Clear the canvas first (this is visual so user gets immediate feedback)
        clearCanvas();
        
        // Clear notebook items in storage
        await clearNotebook();
        
        // Reset in-memory data
        notebookItems = [];
        currentChatHistory = [];
        
        // Clear drawings from storage
        await saveDrawings([]);
        
        // Log for debugging
        debugLog('Canvas cleared. All drawings and conversations have been removed.');
        
        // Redraw the clean canvas
        redrawCanvas();
        refreshCanvas();
        
        // Change the URL to the root state
        window.history.pushState({}, '', '/');
        
        // Show brief success message
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = 'Canvas cleared';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 1000);
    } catch (error) {
        console.error('Error clearing canvas:', error);
    } finally {
        hideLoading();
    }
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
            
            // Load all text overlays from the DOM
            const textOverlays = document.querySelectorAll('.text-bubble');
            const overlaysInfo = Array.from(textOverlays).map(bubble => {
                // Get content and role from bubble
                const isUser = bubble.classList.contains('user-text');
                const content = bubble.querySelector('.content')?.textContent || '';
                const id = bubble.id || '';
                return { isUser, content, id };
            });
            
            // Create a map to match notebook items with their overlays
            const bubbleIdMap = {};
            overlaysInfo.forEach(overlay => {
                if (overlay.id) {
                    const itemId = overlay.id.replace('user-text-', '').replace('ai-text-', '');
                    if (!bubbleIdMap[itemId]) {
                        bubbleIdMap[itemId] = [];
                    }
                    bubbleIdMap[itemId].push(overlay);
                }
            });
            
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
                
                // Get user text from the notebook item or overlay
                let userText = item.transcription;
                // If the overlay has different content, use that (it might have been edited)
                const overlays = bubbleIdMap[item.id] || [];
                const userOverlay = overlays.find(o => o.isUser);
                if (userOverlay && userOverlay.content && userOverlay.content !== item.transcription) {
                    userText = userOverlay.content;
                }
                
                const userTextLines = pdf.splitTextToSize(userText, textWidth);
                pdf.text(userTextLines, margin, yPos);
                yPos += userTextLines.length * 15 + 10;
                
                // AI's response
                if (item.chatHistory && item.chatHistory.length > 0) {
                    const lastAIMessage = item.chatHistory.filter(msg => msg.role === 'assistant').pop();
                    if (lastAIMessage) {
                        pdf.setFont('helvetica', 'italic');
                        pdf.text(`Claude:`, margin, yPos);
                        yPos += 20;
                        
                        // Get AI text from chat history or overlay
                        let aiText = lastAIMessage.content;
                        const aiOverlay = overlays.find(o => !o.isUser);
                        if (aiOverlay && aiOverlay.content && aiOverlay.content !== lastAIMessage.content) {
                            aiText = aiOverlay.content;
                        }
                        
                        const aiTextLines = pdf.splitTextToSize(aiText, textWidth);
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
            
            // Also add direct chat conversations that might not be part of notebook items
            const directChats = notebookItems.filter(item => item.isDirectChat);
            if (directChats.length > 0) {
                // Add a section for direct chats if there are any
                pdf.addPage();
                
                // Add title for direct chats
                pdf.setFont('helvetica', 'bold');
                pdf.text('Direct Chat Conversations', 40, 40);
                
                yPos = 80;
                
                // Process each direct chat
                for (let i = 0; i < directChats.length; i++) {
                    const chat = directChats[i];
                    
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(`Direct Chat ${i+1}:`, margin, yPos);
                    yPos += 25;
                    
                    // Add each message in the conversation
                    if (chat.chatHistory && chat.chatHistory.length > 0) {
                        for (const message of chat.chatHistory) {
                            // Check if we need a new page
                            if (yPos > pdf.internal.pageSize.getHeight() - 100) {
                                pdf.addPage();
                                yPos = 80;
                            }
                            
                            if (message.role === 'user') {
                                pdf.setFont('helvetica', 'normal');
                                pdf.text(`You:`, margin, yPos);
                                yPos += 20;
                                
                                const textLines = pdf.splitTextToSize(message.content, textWidth);
                                pdf.text(textLines, margin, yPos);
                                yPos += textLines.length * 15 + 15;
                            } else if (message.role === 'assistant') {
                                pdf.setFont('helvetica', 'italic');
                                pdf.text(`Claude:`, margin, yPos);
                                yPos += 20;
                                
                                const textLines = pdf.splitTextToSize(message.content, textWidth);
                                pdf.text(textLines, margin, yPos);
                                yPos += textLines.length * 15 + 25;
                            }
                        }
                    }
                    
                    // Add separator between conversations
                    if (i < directChats.length - 1) {
                        pdf.setDrawColor(200, 200, 200);
                        pdf.line(margin, yPos - 10, pageWidth - margin, yPos - 10);
                        yPos += 30;
                    }
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

// Wait for a short delay to ensure all modules are loaded
function safeInitApp() {
    // Force a small delay to ensure DOM is fully loaded and all modules are available
    setTimeout(() => {
        console.log("Initializing Cursive app...");
        initApp();
    }, 500);
}

// Initialize the app when the DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeInitApp);
} else {
    safeInitApp();
}

// Also listen for window load event as a backup
window.addEventListener('load', () => {
    if (!isAppInitialized) {
        console.log("Initializing app on window load...");
        initApp();
    }
});


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
        
        // Setup variables for streaming response
        let responseText = '';
        let lastWordCount = 0;
        let stabilizationTimer = null;
        
        // Create a handwriting container once
        typingElement.innerHTML = `<strong>Claude:</strong>`;
        const handwritingContainer = document.createElement('div');
        handwritingContainer.className = 'handwriting-container';
        handwritingContainer.id = 'streaming-handwriting-container';
        typingElement.appendChild(handwritingContainer);
        
        // Get a random handwriting style but with some preferences
        let styleName;
        const styleRandom = Math.random();
        if (styleRandom < 0.4) {
            styleName = 'cursive'; // 40% chance for cursive
        } else if (styleRandom < 0.7) {
            styleName = 'neat'; // 30% chance for neat
        } else if (styleRandom < 0.9) {
            styleName = 'print'; // 20% chance for print
        } else {
            styleName = 'messy'; // 10% chance for messy
        }
        
        const style = handwritingStyles[styleName];
        
        // Store style settings for reuse
        const handwritingSettings = {
            width: content.offsetWidth - 60, // Account for padding
            fontSize: 20,
            ...style,
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(),
            consistentStyle: true // Keep character styles consistent
        };
        
        // Save original handwriting style for the whole response
        const initialStyle = { ...handwritingSettings };
        
        // Function to handle streamed text updates
        const onProgress = (text) => {
            responseText = text;
            
            // Count words to see if we have new ones to render
            const currentWordCount = text.split(" ").length;
            
            // Only re-render if we have new words
            if (currentWordCount > lastWordCount) {
                // Clear any pending render timer
                if (stabilizationTimer) {
                    clearTimeout(stabilizationTimer);
                }
                
                // Set a short delay before rendering to avoid too many renders when words come quickly
                stabilizationTimer = setTimeout(() => {
                    // Make sure the handwriting container is properly positioned
                    handwritingContainer.style.position = 'relative';
                    handwritingContainer.style.left = '0';
                    handwritingContainer.style.top = '0';
                    handwritingContainer.style.margin = '10px 0';
                    handwritingContainer.style.width = '100%';
                    
                    // Ensure we're using the same style throughout the response
                    // Render the handwriting with only the words we have so far
                    renderHandwriting(handwritingContainer, text, {
                        ...initialStyle,
                        width: Math.min(content.offsetWidth - 80, 600), // Constrain width for better readability
                        // If this is the "final" render (hasn't changed in 300ms), add animation effect
                        animationDelay: currentWordCount > 30 && Math.random() > 0.8
                    });
                    
                    lastWordCount = currentWordCount;
                    content.scrollTop = content.scrollHeight;
                }, 300); // 300ms delay to stabilize fast word streaming
            }
        };
        
        // Send the request with streaming enabled
        const chatResponse = await sendChatToAI(currentChatHistory, onProgress);
        
        // Final render with complete text - make sure we got everything
        renderHandwriting(handwritingContainer, chatResponse, {
            ...initialStyle
        });
        
        // Update chat history with AI response
        currentChatHistory.push({ role: 'assistant', content: chatResponse });
        
        // Create a pseudo-selection for this chat (for tracking in notebook)
        const notebookItem = {
            id: Date.now().toString(),
            selectionBox: { x: 0, y: 0, width: 100, height: 50 }, // Arbitrary values
            transcription: text,
            tags: ['chat', 'typed'],
            chatHistory: [...currentChatHistory],
            isDirectChat: true,
            handwritingStyle: styleName // Track the handwriting style used
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
        
        // Setup streaming response handler with word-by-word rendering
        let responseText = '';
        let lastWordCount = 0;
        let stabilizationTimer = null;
        
        // Create a handwriting container once
        typingElement.innerHTML = `<strong>Claude:</strong>`;
        const handwritingContainer = document.createElement('div');
        handwritingContainer.className = 'handwriting-container';
        handwritingContainer.id = 'streaming-handwriting-container-drawn';
        typingElement.appendChild(handwritingContainer);
        
        // Analyze the handwriting style from the user's input and pick a similar style
        // This makes it appear like Claude is matching the user's writing style
        let userWritingStyle = 'messy'; // Default to messy for handwritten input
        
        // If the tags contain style hints, use them to select a handwriting style
        const styleHints = {
            neat: ['neat', 'clean', 'tidy', 'organized', 'legible'],
            cursive: ['cursive', 'flowing', 'connected', 'elegant', 'script'],
            print: ['print', 'block', 'capitals', 'clear', 'simple'],
            messy: ['messy', 'rushed', 'scrawl', 'quick', 'hasty', 'scribble']
        };
        
        // Check if any of the tags match our style hints
        for (const [style, hints] of Object.entries(styleHints)) {
            if (tags.some(tag => hints.includes(tag.toLowerCase()))) {
                userWritingStyle = style;
                break;
            }
        }
        
        // Get the selected style
        const style = handwritingStyles[userWritingStyle];
        
        // Store style settings for reuse
        const handwritingSettings = {
            width: content.offsetWidth - 60, // Account for padding
            fontSize: 20,
            ...style,
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(),
            consistentStyle: true, // Keep character styles consistent
            // Adjust slant and jitter to simulate user style adaptation
            slant: style.slant * (0.8 + Math.random() * 0.4), // Vary slant slightly
            jitter: style.jitter * (0.8 + Math.random() * 0.4) // Vary jitter slightly
        };
        
        // Save original handwriting style for the whole response
        const initialStyle = { ...handwritingSettings };
        
        // Function to handle streamed text updates
        const onProgress = (text) => {
            responseText = text;
            
            // Count words to see if we have new ones to render
            const currentWordCount = text.split(" ").length;
            
            // Only re-render if we have new words
            if (currentWordCount > lastWordCount) {
                // Clear any pending render timer
                if (stabilizationTimer) {
                    clearTimeout(stabilizationTimer);
                }
                
                // Set a short delay before rendering to avoid too many renders when words come quickly
                stabilizationTimer = setTimeout(() => {
                    // Make sure the handwriting container is properly positioned
                    handwritingContainer.style.position = 'relative';
                    handwritingContainer.style.left = '0';
                    handwritingContainer.style.top = '0';
                    handwritingContainer.style.margin = '10px 0';
                    handwritingContainer.style.width = '100%';

                    // Render the handwriting with only the words we have so far
                    renderHandwriting(handwritingContainer, text, {
                        ...initialStyle,
                        width: Math.min(content.offsetWidth - 80, 600), // Constrain width for better readability
                        // If this is the "final" render (hasn't changed in 300ms), add animation effect
                        animationDelay: currentWordCount > 30 && Math.random() > 0.8
                    });
                    
                    lastWordCount = currentWordCount;
                    content.scrollTop = content.scrollHeight;
                }, 250); // Slightly shorter delay for handwritten input
            }
        };
        
        // Send to Claude with streaming
        const chatResponse = await sendChatToAI(currentChatHistory, onProgress);
        
        // Final render with complete text - make sure we got everything
        renderHandwriting(handwritingContainer, chatResponse, {
            ...initialStyle
        });
        
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
            handwritingImage: imageData,
            handwritingStyle: userWritingStyle // Track the handwriting style used
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
        
        // Find the current displayed handwriting style
        let currentStyle = 'cursive'; // Default 
        
        // Try to find the style from the current handwriting container if possible
        const handwritingContainer = document.querySelector('.handwriting-container');
        if (handwritingContainer && handwritingContainer.id) {
            // Extract style info from the container ID or data attributes if available
            const containerId = handwritingContainer.id;
            
            // Find the most recent notebookItem with a handwritingStyle
            const recentItems = notebookItems.slice().reverse();
            const recentItemWithStyle = recentItems.find(item => item.handwritingStyle);
            
            if (recentItemWithStyle) {
                currentStyle = recentItemWithStyle.handwritingStyle;
            } else {
                // Check for drawn vs typed containers to set appropriate style
                if (containerId.includes('drawn')) {
                    currentStyle = 'messy';
                } else if (containerId.includes('selection')) {
                    currentStyle = 'cursive';
                } else {
                    // Random select a style with preference for cursive
                    const styleRandom = Math.random();
                    if (styleRandom < 0.5) {
                        currentStyle = 'cursive';
                    } else if (styleRandom < 0.8) {
                        currentStyle = 'neat';
                    } else {
                        currentStyle = 'print';
                    }
                }
            }
        }
        
        // Draw the handwriting on the canvas with animation - adjust position based on current view
        const canvasScale = getCanvasScale();
        const canvasPanX = getCanvasPanX();
        const canvasPanY = getCanvasPanY();

        await drawHandwritingOnCanvas(
            lastAIMessage.content,
            centerX / canvasScale - canvasPanX / canvasScale, // Convert to canvas coordinates
            centerY / canvasScale - canvasPanY / canvasScale,
            600, // Max width
            {
                style: currentStyle,
                animationDelay: true, // Use animation for etching to canvas
                consistentStyle: true
            }
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
        
        // Update notebook item with etch information
        try {
            // Find the most recent notebook item (likely the current conversation)
            if (notebookItems.length > 0) {
                const latestItem = notebookItems[notebookItems.length - 1];
                // Add a flag that this has been etched to canvas
                latestItem.etchedToCanvas = true;
                latestItem.etchedStyle = currentStyle;
                await saveNotebookItem(latestItem);
            }
        } catch (e) {
            console.error('Error updating notebook item with etch info:', e);
            // Non-critical error, don't show to user
        }
        
    } catch (error) {
        console.error('Error etching to canvas:', error);
        alert('Error adding response to canvas. Please try again.');
    } finally {
        hideLoading();
    }
}

// Handle streaming AI text directly to canvas
async function handleStreamToCanvas() {
    try {
        // Show the stream prompt modal
        const streamPromptModal = document.getElementById('stream-prompt-modal');
        const streamPromptInput = document.getElementById('stream-prompt-input');
        const streamPromptSubmit = document.getElementById('stream-prompt-submit');
        
        if (!streamPromptModal || !streamPromptInput || !streamPromptSubmit) {
            console.error('Missing modal elements for stream prompt');
            return;
        }
        
        // Clear previous input
        streamPromptInput.value = '';
        
        // Show the modal
        streamPromptModal.style.display = 'block';
        
        // Focus the input
        setTimeout(() => {
            streamPromptInput.focus();
        }, 100);
        
        // Handle submit action with a Promise
        const promptPromise = new Promise((resolve) => {
            // Handle submit button click
            const submitHandler = () => {
                const prompt = streamPromptInput.value.trim();
                if (prompt) {
                    streamPromptModal.style.display = 'none';
                    resolve(prompt);
                } else {
                    // Highlight empty input
                    streamPromptInput.classList.add('error');
                    setTimeout(() => {
                        streamPromptInput.classList.remove('error');
                    }, 500);
                }
            };
            
            // Handle close button and clicks outside modal
            const closeHandler = (e) => {
                if (e.target === streamPromptModal || e.target.classList.contains('close')) {
                    streamPromptModal.style.display = 'none';
                    resolve(null); // User cancelled
                }
            };
            
            // Handle Enter key in textarea
            const keyHandler = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitHandler();
                } else if (e.key === 'Escape') {
                    streamPromptModal.style.display = 'none';
                    resolve(null); // User cancelled
                }
            };
            
            // Attach event listeners
            streamPromptSubmit.addEventListener('click', submitHandler, { once: true });
            streamPromptModal.addEventListener('click', closeHandler, { once: true });
            streamPromptInput.addEventListener('keydown', keyHandler);
            
            // Clean up event listeners when promise resolves
            Promise.resolve().then(() => {
                // Keep the listeners until the modal is closed
                const cleanup = () => {
                    streamPromptSubmit.removeEventListener('click', submitHandler);
                    streamPromptModal.removeEventListener('click', closeHandler);
                    streamPromptInput.removeEventListener('keydown', keyHandler);
                };
                
                // Set up a mutation observer to detect when modal is hidden
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.attributeName === 'style' && 
                            streamPromptModal.style.display === 'none') {
                            cleanup();
                            observer.disconnect();
                        }
                    });
                });
                
                observer.observe(streamPromptModal, { attributes: true });
            });
        });
        
        // Wait for the user input
        const prompt = await promptPromise;
        
        // If user cancelled, return
        if (!prompt) return;
        
        // Import the canvasManager function for streaming handwriting
        const { streamHandwritingToCanvas } = await import('./canvasManager.js');
        
        // Show loading while preparing
        showLoading();
        
        // Get canvas dimensions and calculate a good starting position
        const canvas = document.getElementById('drawing-canvas');
        const centerX = canvas.width / 3; // Position at 1/3 of canvas width 
        const centerY = canvas.height / 3; // Position at 1/3 of canvas height
        
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = 'Streaming AI response to canvas...';
        document.body.appendChild(toast);
        
        // Stream the response directly to canvas
        // The streamHandwritingToCanvas function handles all the streaming
        const scale = getCanvasScale();
        const panX = getCanvasPanX();
        const panY = getCanvasPanY();
        const response = await streamHandwritingToCanvas(
            prompt,
            centerX / scale - panX / scale, // Convert to canvas coordinates
            centerY / scale - panY / scale,
            600, // Max width
            {
                style: 'cursive', // Use cursive style
                fontSize: 24, // Slightly larger font
                animationDelay: false, // No animation during streaming
                consistentStyle: true // Keep consistent style
            }
        );
        
        // Update toast to show completion
        toast.textContent = 'AI text added to canvas';
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 500);
        }, 2000);
        
        // Create a notebook item to track this direct interaction
        const notebookItem = {
            id: Date.now().toString(),
            selectionBox: { x: 0, y: 0, width: 100, height: 50 }, // Arbitrary values
            transcription: prompt,
            tags: ['direct-streaming'],
            chatHistory: [
                { role: 'user', content: prompt },
                { role: 'assistant', content: response }
            ],
            isDirectChat: true,
            handwritingStyle: 'cursive'
        };
        
        // Save to notebook
        await saveNotebookItem(notebookItem);
        
    } catch (error) {
        console.error('Error streaming to canvas:', error);
        alert('Error streaming AI text to canvas. Please try again.');
    } finally {
        hideLoading();
    }
}

// Plugin System Initialization
async function initPluginSystem() {
    try {
        console.log('Initializing plugin system...');

        // Get all available plugins
        const plugins = getAllPlugins();

        // Register each plugin with the manager
        for (const plugin of plugins) {
            await pluginManager.registerPlugin(plugin);
        }

        // Set canvas context for all plugins
        const canvas = document.getElementById('drawing-canvas');
        const ctx = canvas ? canvas.getContext('2d') : null;

        if (ctx) {
            pluginManager.getAllPlugins().forEach(plugin => {
                plugin.canvas = canvas;
                plugin.ctx = ctx;
            });
        }

        // Render plugin toolbar
        pluginManager.renderPluginToolbar('plugin-toolbar');

        // Log stats
        const stats = pluginManager.getStats();
        console.log('Plugin system initialized:', stats);
        console.log(`Loaded ${stats.total} plugins (${stats.enabled} enabled)`);

    } catch (error) {
        console.error('Error initializing plugin system:', error);
        // Don't fail the whole app if plugins fail to initialize
    }
}

// Authentication UI Functions
function showAuthModal() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
        authModal.style.display = 'block';
        setupAuthModalHandlers();
    }
}

function hideAuthModal() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
        authModal.style.display = 'none';
    }
}

async function setupAuthUI() {
    // Check if user is authenticated
    const user = await getCurrentUser();

    // Update auth button based on login state
    const authBtn = document.getElementById('auth-btn');
    const authBtnText = document.getElementById('auth-btn-text');

    if (user) {
        // User is logged in
        if (authBtnText) authBtnText.textContent = user.email.split('@')[0]; // Show username
        if (authBtn) {
            authBtn.title = 'Settings & Logout';
            authBtn.onclick = () => showSettingsModal();
        }

        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement) {
            userEmailElement.textContent = user.email;
        }
        console.log('✅ User authenticated:', user.email);
    } else {
        // User is NOT logged in
        if (authBtnText) authBtnText.textContent = 'Login';
        if (authBtn) {
            authBtn.title = 'Login/Signup';
            authBtn.onclick = () => showAuthModal();
        }

        console.log('ℹ️ User not authenticated - app running in guest mode');
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement) {
            userEmailElement.textContent = 'Not logged in';
        }
    }

    // Setup settings button handler
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!user) {
                showAuthModal();
            } else {
                showSettingsModal();
            }
        });
    }

    // Setup logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await logout();
        });
    }
}

function setupAuthModalHandlers() {
    // Tab switching
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (loginTab && signupTab && loginForm && signupForm) {
        loginTab.addEventListener('click', () => {
            loginTab.classList.add('active');
            signupTab.classList.remove('active');
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
        });

        signupTab.addEventListener('click', () => {
            signupTab.classList.add('active');
            loginTab.classList.remove('active');
            signupForm.style.display = 'block';
            loginForm.style.display = 'none';
        });
    }

    // Login form submission
    const loginSubmitBtn = document.getElementById('login-submit-btn');
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const loginError = document.getElementById('login-error');

    if (loginSubmitBtn && loginEmail && loginPassword) {
        loginSubmitBtn.addEventListener('click', async () => {
            const email = loginEmail.value.trim();
            const password = loginPassword.value;

            if (!email || !password) {
                showError(loginError, 'Please enter email and password');
                return;
            }

            if (!isValidEmail(email)) {
                showError(loginError, 'Please enter a valid email');
                return;
            }

            loginSubmitBtn.disabled = true;
            loginSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

            try {
                const result = await login(email, password);

                if (!result.success) {
                    showError(loginError, result.error || 'Login failed');
                    loginSubmitBtn.disabled = false;
                    loginSubmitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
                } else {
                    hideAuthModal();
                    // Reload to initialize app with authentication
                    window.location.reload();
                }
            } catch (error) {
                showError(loginError, error.message || 'Login failed');
                loginSubmitBtn.disabled = false;
                loginSubmitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
            }
        });

        // Allow Enter key to submit
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loginSubmitBtn.click();
            }
        });
    }

    // Signup form submission
    const signupSubmitBtn = document.getElementById('signup-submit-btn');
    const signupEmail = document.getElementById('signup-email');
    const signupPassword = document.getElementById('signup-password');
    const signupConfirmPassword = document.getElementById('signup-confirm-password');
    const signupError = document.getElementById('signup-error');

    if (signupSubmitBtn && signupEmail && signupPassword && signupConfirmPassword) {
        // Password validation on input
        signupPassword.addEventListener('input', () => {
            const password = signupPassword.value;
            const strength = getPasswordStrength(password);
            const strengthDiv = document.getElementById('password-strength');

            if (strengthDiv) {
                if (password.length > 0) {
                    strengthDiv.textContent = strength.message;
                    strengthDiv.style.color = strength.color;
                } else {
                    strengthDiv.textContent = '';
                }
            }
        });

        signupSubmitBtn.addEventListener('click', async () => {
            const email = signupEmail.value.trim();
            const password = signupPassword.value;
            const confirmPassword = signupConfirmPassword.value;

            if (!email || !password || !confirmPassword) {
                showError(signupError, 'Please fill in all fields');
                return;
            }

            if (!isValidEmail(email)) {
                showError(signupError, 'Please enter a valid email');
                return;
            }

            if (!validatePassword(password)) {
                showError(signupError, 'Password must be at least 8 characters with uppercase, lowercase, and a number');
                return;
            }

            if (password !== confirmPassword) {
                showError(signupError, 'Passwords do not match');
                return;
            }

            signupSubmitBtn.disabled = true;
            signupSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

            try {
                const result = await signUp(email, password);

                if (!result.success) {
                    showError(signupError, result.error || 'Registration failed');
                    signupSubmitBtn.disabled = false;
                    signupSubmitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
                } else {
                    hideAuthModal();
                    // Reload to initialize app with authentication
                    window.location.reload();
                }
            } catch (error) {
                showError(signupError, error.message || 'Registration failed');
                signupSubmitBtn.disabled = false;
                signupSubmitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
            }
        });

        // Allow Enter key to submit
        signupConfirmPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                signupSubmitBtn.click();
            }
        });
    }
}

function showError(errorElement, message) {
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function showSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
        settingsModal.style.display = 'block';
        setupSettingsModalHandlers();
    }
}

function setupSettingsModalHandlers() {
    const settingsModal = document.getElementById('settings-modal');

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn && !logoutBtn.dataset.handlerAttached) {
        logoutBtn.dataset.handlerAttached = 'true';
        logoutBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to logout?')) {
                await logout();
            }
        });
    }

    // Save API key button (store in localStorage for now, will integrate with Supabase DB)
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    const apiKeyInput = document.getElementById('api-key-input');
    const apiKeyStatus = document.getElementById('api-key-status');

    if (saveApiKeyBtn && apiKeyInput && !saveApiKeyBtn.dataset.handlerAttached) {
        saveApiKeyBtn.dataset.handlerAttached = 'true';
        saveApiKeyBtn.addEventListener('click', async () => {
            const apiKey = apiKeyInput.value.trim();

            if (!apiKey) {
                apiKeyStatus.textContent = 'Please enter an API key';
                apiKeyStatus.className = 'setting-status error';
                return;
            }

            // Validate Anthropic, OpenAI, or Claude API key format
            const isAnthropicKey = apiKey.startsWith('sk-ant-');
            const isOpenAIKey = apiKey.startsWith('sk-');

            if (!isAnthropicKey && !isOpenAIKey) {
                apiKeyStatus.textContent = 'Invalid API key format (should start with sk-ant- for Anthropic or sk- for OpenAI)';
                apiKeyStatus.className = 'setting-status error';
                return;
            }

            saveApiKeyBtn.disabled = true;
            saveApiKeyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            try {
                // Store in localStorage for now
                // TODO: Store in Supabase database with encryption
                localStorage.setItem('cursive_user_api_key', apiKey);

                apiKeyStatus.textContent = '✓ API key saved successfully';
                apiKeyStatus.className = 'setting-status success';
                apiKeyInput.value = '';
            } catch (error) {
                apiKeyStatus.textContent = 'Failed to save API key';
                apiKeyStatus.className = 'setting-status error';
            }

            saveApiKeyBtn.disabled = false;
            saveApiKeyBtn.innerHTML = '<i class="fas fa-save"></i> Save API Key';
        });
    }

    // Close button
    const closeBtn = settingsModal ? settingsModal.querySelector('.close') : null;
    if (closeBtn && !closeBtn.dataset.handlerAttached) {
        closeBtn.dataset.handlerAttached = 'true';
        closeBtn.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
    }
}

async function loadUsageStats() {
    const stats = await getUsageStats();

    const tokensUsedElement = document.getElementById('tokens-used');
    const tokensLimitElement = document.getElementById('tokens-limit');
    const usageCostElement = document.getElementById('usage-cost');
    const usageProgressElement = document.getElementById('usage-progress');

    if (tokensUsedElement) {
        tokensUsedElement.textContent = stats.tokens_used.toLocaleString();
    }

    if (tokensLimitElement) {
        tokensLimitElement.textContent = stats.limit.toLocaleString();
    }

    if (usageCostElement) {
        usageCostElement.textContent = `$${stats.cost.toFixed(2)}`;
    }

    if (usageProgressElement) {
        const percentage = (stats.tokens_used / stats.limit) * 100;
        usageProgressElement.style.width = `${Math.min(percentage, 100)}%`;

        // Change color based on usage
        if (percentage >= 90) {
            usageProgressElement.style.backgroundColor = '#e74c3c';
        } else if (percentage >= 70) {
            usageProgressElement.style.backgroundColor = '#f39c12';
        } else {
            usageProgressElement.style.backgroundColor = '#3498db';
        }
    }
}

export { handleImageSelection, handleTranscriptionResponse, displayFullResponse, isZoomMode, pluginManager };
