'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, TranscriptionResult } from '@/lib/types';
import { sendChatToAI, sendImageToAI, imageDataToBase64 } from '@/lib/ai';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialTranscription?: TranscriptionResult;
  selectionImageData?: ImageData | null;
}

type InputMode = 'type' | 'draw';

export function ChatPanel({ isOpen, onClose, initialTranscription, selectionImageData }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>('type');
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatDrawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [chatStrokes, setChatStrokes] = useState<{ x: number; y: number }[]>([]);

  // Initialize chat with transcription if provided
  useEffect(() => {
    if (initialTranscription && isOpen) {
      const initialMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: initialTranscription.transcription,
        timestamp: Date.now(),
        isHandwritten: true
      };
      setMessages([initialMessage]);

      // Auto-send to AI
      handleSendToAI([initialMessage]);
    }
  }, [initialTranscription, isOpen]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentResponse]);

  // Initialize chat drawing canvas
  useEffect(() => {
    const canvas = chatDrawingCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.parentElement?.clientWidth || 400;
    canvas.height = 200;

    // Configure context
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [inputMode]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = chatDrawingCanvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setChatStrokes([{ x, y }]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = chatDrawingCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setChatStrokes(prev => [...prev, { x, y }]);

    // Draw on canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    const lastPoint = chatStrokes[chatStrokes.length - 1];
    if (lastPoint) {
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = chatDrawingCanvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }
    setIsDrawing(false);
    setChatStrokes([]);
  };

  const clearDrawing = () => {
    const canvas = chatDrawingCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setChatStrokes([]);
  };

  const handleSendMessage = async () => {
    let messageContent = '';
    let isHandwritten = false;

    if (inputMode === 'type') {
      messageContent = textInput.trim();
      if (!messageContent) return;
      setTextInput('');
    } else {
      // Get drawing from canvas
      const canvas = chatDrawingCanvasRef.current;
      if (!canvas) return;

      const imageData = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height);
      if (!imageData) return;

      // Check if canvas is empty (all white pixels)
      const data = imageData.data;
      const isEmpty = data.every((val, i) => i % 4 === 3 || val === 255);
      if (isEmpty) return;

      setIsLoading(true);

      try {
        // Transcribe drawing
        const base64Image = imageDataToBase64(imageData);
        const result = await sendImageToAI(base64Image);
        messageContent = result.transcription;
        isHandwritten = true;

        // Clear canvas after successful transcription
        clearDrawing();
      } catch (error) {
        console.error('Error transcribing drawing:', error);
        alert('Failed to transcribe drawing. Please try again.');
        setIsLoading(false);
        return;
      }
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: Date.now(),
      isHandwritten
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    // Send to AI
    await handleSendToAI(newMessages);
  };

  const handleSendToAI = async (chatHistory: ChatMessage[]) => {
    setIsLoading(true);
    setCurrentResponse('');

    try {
      const aiMessages = chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await sendChatToAI(aiMessages, (progressText) => {
        setCurrentResponse(progressText);
      });

      // Add AI response
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMessage]);
      setCurrentResponse('');
    } catch (error) {
      console.error('Error sending to AI:', error);
      alert('Failed to get AI response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStreamToCanvas = () => {
    // TODO: Implement handwriting simulation
    alert('Handwriting simulation coming soon!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">AI Chat</h2>
          <div className="flex items-center gap-2">
            {messages.some(m => m.role === 'assistant') && (
              <button
                onClick={handleStreamToCanvas}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                title="Stream to Canvas"
              >
                <i className="fas fa-paint-brush mr-1" />
                Stream to Canvas
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              title="Close"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.isHandwritten && (
                  <div className="text-xs opacity-75 mb-1">
                    <i className="fas fa-pen mr-1" />
                    Handwritten
                  </div>
                )}
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}

          {/* Current AI response (streaming) */}
          {currentResponse && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 text-gray-900">
                <div className="whitespace-pre-wrap">{currentResponse}</div>
                <div className="mt-2 text-xs text-gray-500">
                  <i className="fas fa-spinner fa-spin mr-1" />
                  Thinking...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setInputMode('type')}
              className={`flex-1 py-2 px-4 rounded transition-colors ${
                inputMode === 'type'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <i className="fas fa-keyboard mr-2" />
              Type
            </button>
            <button
              onClick={() => setInputMode('draw')}
              className={`flex-1 py-2 px-4 rounded transition-colors ${
                inputMode === 'draw'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <i className="fas fa-pen mr-2" />
              Draw
            </button>
          </div>

          {/* Input Controls */}
          <div className="flex gap-2">
            <div className="flex-1">
              {inputMode === 'type' ? (
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type your response..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              ) : (
                <div className="relative">
                  <canvas
                    ref={chatDrawingCanvasRef}
                    className="w-full border border-gray-300 rounded bg-white cursor-crosshair"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerOut={handlePointerUp}
                  />
                  <button
                    onClick={clearDrawing}
                    className="absolute top-2 right-2 p-2 bg-white rounded shadow hover:bg-gray-100 transition-colors"
                    title="Clear drawing"
                  >
                    <i className="fas fa-eraser" />
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleSendMessage}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors self-end"
            >
              {isLoading ? (
                <i className="fas fa-spinner fa-spin" />
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-2" />
                  Send
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
