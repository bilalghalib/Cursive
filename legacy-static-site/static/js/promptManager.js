import { sendChatToAI } from './aiService.js';
import { getConfig } from './config.js';
import { redrawCanvas } from './canvasManager.js';
import { saveNotebookItem } from './dataManager.js';

let promptCanvas, promptCtx;
let isDrawing = false;
let lastX = 0, lastY = 0;
let promptStrokes = [];
let currentStroke = [];

// Initialize the prompt canvas for direct handwriting input
export function initPromptCanvas() {
    promptCanvas = document.getElementById('prompt-canvas');
    if (!promptCanvas) {
        console.error('Prompt canvas element not found');
        return;
    }
    
    promptCtx = promptCanvas.getContext('2d');
    resizePromptCanvas();
    
    // Set default drawing properties
    promptCtx.strokeStyle = '#000000';
    promptCtx.lineWidth = 2;
    promptCtx.lineCap = 'round';
    promptCtx.lineJoin = 'round';
    
    // Event listeners for drawing
    promptCanvas.addEventListener('pointerdown', handlePromptPointerDown);
    promptCanvas.addEventListener('pointermove', handlePromptPointerMove);
    promptCanvas.addEventListener('pointerup', handlePromptPointerUp);
    promptCanvas.addEventListener('pointerout', handlePromptPointerUp);
    
    // Prevent default touch actions for better drawing
    promptCanvas.style.touchAction = 'none';
    
    // Add event listener for window resize
    window.addEventListener('resize', resizePromptCanvas);
    
    console.log('Prompt canvas initialized');
}

// Resize canvas to fit its container
function resizePromptCanvas() {
    const container = promptCanvas.parentElement;
    promptCanvas.width = container.offsetWidth;
    promptCanvas.height = container.offsetHeight - 50; // Account for controls
    
    // Clear the canvas and draw white background
    promptCtx.fillStyle = 'white';
    promptCtx.fillRect(0, 0, promptCanvas.width, promptCanvas.height);
}

// Handle pointer down event
function handlePromptPointerDown(e) {
    isDrawing = true;
    const rect = promptCanvas.getBoundingClientRect();
    [lastX, lastY] = [e.clientX - rect.left, e.clientY - rect.top];
    
    // Start a new stroke
    currentStroke = [];
    addPointToStroke(lastX, lastY, e.pressure || 1.0);
    
    // Begin a path
    promptCtx.beginPath();
    promptCtx.moveTo(lastX, lastY);
}

// Handle pointer move event
function handlePromptPointerMove(e) {
    if (!isDrawing) return;
    
    const rect = promptCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Get pressure information if available (for stylus)
    let pressure = e.pressure || 1.0;
    
    // Add point to the current stroke
    addPointToStroke(x, y, pressure);
    
    // Draw line with pressure sensitivity
    const lineWidth = 2 * (0.5 + pressure * 1.5);
    promptCtx.lineWidth = lineWidth;
    
    promptCtx.lineTo(x, y);
    promptCtx.stroke();
    
    // Start new path for next segment (smoother lines)
    promptCtx.beginPath();
    promptCtx.moveTo(x, y);
    
    [lastX, lastY] = [x, y];
}

// Handle pointer up event
function handlePromptPointerUp() {
    if (!isDrawing) return;
    isDrawing = false;
    
    // Add the completed stroke to strokes array
    if (currentStroke.length > 1) {
        promptStrokes.push([...currentStroke]);
    }
    
    // Reset current stroke
    currentStroke = [];
}

// Add a point to the current stroke
function addPointToStroke(x, y, pressure) {
    currentStroke.push({ x, y, pressure });
}

// Clear the prompt canvas
export function clearPromptCanvas() {
    promptCtx.fillStyle = 'white';
    promptCtx.fillRect(0, 0, promptCanvas.width, promptCanvas.height);
    promptStrokes = [];
    currentStroke = [];
}

// Convert the prompt canvas to image data
export function getPromptImageData() {
    return promptCanvas.toDataURL('image/png');
}

// Process and submit the handwritten prompt
export async function submitHandwrittenPrompt() {
    // Check if there's anything drawn
    if (promptStrokes.length === 0) {
        alert('Please write something before submitting.');
        return;
    }
    
    try {
        // Show loading indicator
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        
        // Get the image data from the canvas
        const imageData = getPromptImageData();
        
        // Create a virtual selection box for tracking in notebook
        const selectionBox = {
            x: 0,
            y: 0,
            width: promptCanvas.width,
            height: promptCanvas.height
        };
        
        // Send to AI for transcription
        const transcriptionResult = await sendToAIForTranscription(imageData);
        
        if (!transcriptionResult || !transcriptionResult.transcription) {
            throw new Error('Failed to transcribe handwriting');
        }
        
        const transcription = transcriptionResult.transcription;
        
        // Prepare chat history for response
        const chatHistory = [
            { role: 'user', content: transcription }
        ];
        
        // Show response modal with the transcribed text
        const modal = document.getElementById('response-modal');
        const content = document.getElementById('response-content');
        
        // Show the modal with loading indicator
        content.innerHTML = `
            <p><strong>Your handwritten prompt:</strong> ${transcription}</p>
            <p><strong>AI is thinking...</strong> <span class="typing-indicator">...</span></p>
        `;
        modal.style.display = 'block';
        
        // Setup streaming response handler
        let responseText = '';
        const onProgress = (text) => {
            responseText = text;
            content.innerHTML = `
                <p><strong>Your handwritten prompt:</strong> ${transcription}</p>
                <p><strong>AI:</strong> ${text}</p>
            `;
        };
        
        // Get chat response from Claude with streaming
        const chatResponse = await sendChatToAI(chatHistory, onProgress);
        
        // Add assistant response to chat history
        chatHistory.push({ role: 'assistant', content: chatResponse });
        
        // Create a notebook item to save this interaction
        const notebookItem = {
            id: Date.now().toString(),
            selectionBox: selectionBox,
            transcription: transcription,
            tags: transcriptionResult.tags || [],
            chatHistory: chatHistory,
            isHandwrittenPrompt: true
        };
        
        // Save the notebook item
        await saveNotebookItem(notebookItem);
        
        // Clear the prompt canvas after successful submission
        clearPromptCanvas();
        
        // Hide the prompt panel
        const writePromptPanel = document.getElementById('write-prompt-panel');
        writePromptPanel.classList.add('hidden');
        
        // Redraw the main canvas to show the new notebook item
        redrawCanvas();
        
    } catch (error) {
        console.error('Error submitting handwritten prompt:', error);
        alert('Error processing handwritten prompt. Please try again.');
    } finally {
        // Hide loading indicator
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
}

// Send handwritten image to AI for transcription
async function sendToAIForTranscription(imageData) {
    try {
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
            const errorData = await response.json();
            throw new Error(`AI API request failed: ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
        }
        
        const data = await response.json();
        return parseAIResponse(data.content[0].text);
    } catch (error) {
        console.error('Error in AI transcription service:', error);
        throw error;
    }
}

// Parse the AI response to extract transcription and tags
function parseAIResponse(response) {
    try {
        const parsedResponse = JSON.parse(response);
        return {
            transcription: parsedResponse.transcription || '',
            tags: parsedResponse.tags || [],
            fullResponse: response
        };
    } catch (error) {
        console.error('Error parsing AI response:', error);
        return {
            transcription: 'Error parsing AI response',
            tags: [],
            fullResponse: response
        };
    }
}

// Function to toggle the write prompt panel
export function toggleWritePromptPanel() {
    const writePromptPanel = document.getElementById('write-prompt-panel');
    
    if (!writePromptPanel) {
        console.error("Write prompt panel not found in the DOM");
        return;
    }
    
    // Toggle the hidden class
    writePromptPanel.classList.toggle('hidden');
    
    // If panel is now visible, initialize canvas and resize to fit
    if (!writePromptPanel.classList.contains('hidden')) {
        // Initialize the canvas if it hasn't been yet
        if (!promptCanvas) {
            initPromptCanvas();
        }
        
        // Resize the canvas to fit the container
        setTimeout(() => {
            resizePromptCanvas();
        }, 50); // Short delay to ensure the panel is fully visible
    }
    
    console.log("Write prompt panel toggled:", !writePromptPanel.classList.contains('hidden'));
}