'use client';

import { useEffect } from 'react';
import type { CanvasState, CanvasActions, Stroke, ChatMessage, TextOverlay } from '@/lib/types';
import { sendImageToAI, imageDataToBase64, sendChatToAI } from '@/lib/ai';

interface CanvasProps {
  state: CanvasState;
  actions: CanvasActions;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export function Canvas({ state, actions, canvasRef }: CanvasProps) {
  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      // Redraw after resize
      redrawCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Configure drawing context
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Redraw canvas whenever state changes
  useEffect(() => {
    redrawCanvas();
  }, [state.drawings, state.currentStroke, state.scale, state.panX, state.panY, state.selectionRect, state.textOverlays, state.typographyGuides]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Draw typography guides (before transformations, so they're always visible)
    drawTypographyGuides(ctx);

    // Apply transformations
    ctx.save();
    ctx.translate(state.panX, state.panY);
    ctx.scale(state.scale, state.scale);

    // Draw all strokes
    state.drawings.forEach(stroke => {
      drawStroke(ctx, stroke);
    });

    // Draw current stroke
    if (state.currentStroke.length > 0) {
      drawStroke(ctx, {
        points: state.currentStroke,
        color: '#000000',
        width: 2
      });
    }

    // Draw text overlays
    state.textOverlays.forEach(overlay => {
      drawTextOverlay(ctx, overlay);
    });

    ctx.restore();

    // Draw selection rectangle (after restoring transform, so it's not affected by pan/zoom)
    if (state.selectionRect) {
      drawSelectionRect(ctx, state.selectionRect);
    }
  };

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length === 0) return;

    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;

    const firstPoint = stroke.points[0];
    ctx.moveTo(firstPoint.x, firstPoint.y);

    for (let i = 1; i < stroke.points.length; i++) {
      const point = stroke.points[i];
      ctx.lineTo(point.x, point.y);
    }

    ctx.stroke();
  };

  const drawTextOverlay = (ctx: CanvasRenderingContext2D, overlay: TextOverlay) => {
    ctx.save();

    // Set font and text properties
    ctx.font = `${overlay.fontSize}px 'Caveat', cursive`;
    ctx.fillStyle = overlay.color;
    ctx.textBaseline = 'top';

    // Word wrap the text
    const words = overlay.text.split(' ');
    const lineHeight = overlay.fontSize * 1.4;
    let currentLine = '';
    let y = overlay.y;

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + words[i] + ' ';
      const metrics = ctx.measureText(testLine);

      if (metrics.width > overlay.width && i > 0) {
        ctx.fillText(currentLine, overlay.x, y);
        currentLine = words[i] + ' ';
        y += lineHeight;
      } else {
        currentLine = testLine;
      }
    }
    ctx.fillText(currentLine, overlay.x, y);

    ctx.restore();
  };

  const drawSelectionRect = (ctx: CanvasRenderingContext2D, rect: { startX: number; startY: number; endX: number; endY: number }) => {
    const minX = Math.min(rect.startX, rect.endX);
    const minY = Math.min(rect.startY, rect.endY);
    const width = Math.abs(rect.endX - rect.startX);
    const height = Math.abs(rect.endY - rect.startY);

    // Draw dashed rectangle
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#2563eb'; // blue-600
    ctx.lineWidth = 2;
    ctx.strokeRect(minX, minY, width, height);

    // Draw semi-transparent fill
    ctx.fillStyle = 'rgba(37, 99, 235, 0.1)';
    ctx.fillRect(minX, minY, width, height);
    ctx.restore();
  };

  const drawTypographyGuides = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas || !state.typographyGuides.enabled) return;

    const guides = state.typographyGuides;
    const width = canvas.width;

    ctx.save();
    ctx.strokeStyle = guides.color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = guides.opacity;
    ctx.setLineDash([5, 3]);

    // Draw guide lines
    const lines = [
      { y: guides.baseline - guides.ascender, label: 'Ascender' },
      { y: guides.baseline - guides.capHeight, label: 'Cap Height' },
      { y: guides.baseline - guides.xHeight, label: 'X-Height' },
      { y: guides.baseline, label: 'BASELINE', bold: true },
      { y: guides.baseline + guides.descender, label: 'Descender' }
    ];

    lines.forEach(line => {
      ctx.beginPath();
      ctx.moveTo(0, line.y);
      ctx.lineTo(width, line.y);
      ctx.stroke();

      // Draw label
      ctx.globalAlpha = guides.opacity * 1.5;
      ctx.fillStyle = guides.color;
      ctx.font = line.bold ? 'bold 12px sans-serif' : '10px sans-serif';
      ctx.fillText(line.label, 10, line.y - 5);
      ctx.globalAlpha = guides.opacity;
    });

    ctx.restore();
  };

  // Get canvas coordinates from event
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - state.panX) / state.scale;
    const y = (e.clientY - rect.top - state.panY) / state.scale;

    return { x, y };
  };

  const getScreenCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Capture pointer for smooth tracking
    canvas.setPointerCapture(e.pointerId);

    switch (state.currentTool) {
      case 'draw': {
        const { x, y } = getCanvasCoords(e);
        actions.startDrawing({ x, y });
        break;
      }
      case 'select': {
        const { x, y } = getScreenCoords(e);
        actions.startSelection(x, y);
        break;
      }
      case 'pan': {
        const { x, y } = getScreenCoords(e);
        actions.startPan(x, y);
        // Change cursor
        canvas.style.cursor = 'grabbing';
        break;
      }
      // Zoom mode doesn't use pointer down
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    switch (state.currentTool) {
      case 'draw': {
        if (state.currentStroke.length > 0) {
          const { x, y } = getCanvasCoords(e);
          actions.continueDrawing({ x, y });
        }
        break;
      }
      case 'select': {
        if (state.selectionRect) {
          const { x, y } = getScreenCoords(e);
          actions.updateSelection(x, y);
        }
        break;
      }
      case 'pan': {
        const { x, y } = getScreenCoords(e);
        actions.updatePan(x, y);
        break;
      }
    }
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Release pointer capture
    canvas.releasePointerCapture(e.pointerId);

    switch (state.currentTool) {
      case 'draw': {
        actions.finishDrawing();
        break;
      }
      case 'select': {
        // Selection finished - trigger AI conversation flow
        const imageData = actions.finishSelection();
        if (imageData) {
          try {
            // Step 1: Transcribe handwriting
            const base64Image = imageDataToBase64(imageData);
            const transcription = await sendImageToAI(base64Image);

            // Step 2: Add user message to chat history
            const userMessage: ChatMessage = {
              id: Date.now().toString(),
              role: 'user',
              content: transcription.transcription,
              timestamp: Date.now(),
              isHandwritten: true
            };
            actions.addChatMessage(userMessage);

            // Step 3: Get AI response
            const aiMessages = [...state.chatHistory, userMessage].map(msg => ({
              role: msg.role,
              content: msg.content
            }));

            const aiResponse = await sendChatToAI(aiMessages);

            // Step 4: Add AI message to chat history
            const aiMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: aiResponse,
              timestamp: Date.now() + 1
            };
            actions.addChatMessage(aiMessage);

            // Step 5: Display AI response as text overlay on canvas
            // Find a good position (below the selection, or at top if needed)
            const selectionY = state.selectionRect ? Math.max(state.selectionRect.startY, state.selectionRect.endY) : 100;

            const overlay: TextOverlay = {
              id: aiMessage.id,
              text: aiResponse,
              x: 50,
              y: selectionY + 50,
              width: canvas.width - 100,
              fontSize: 24,
              color: '#4338ca', // indigo-700 for AI responses
              timestamp: Date.now()
            };
            actions.addTextOverlay(overlay);

            // Clear selection rectangle
            actions.clearSelection();
          } catch (error) {
            console.error('Error in AI conversation:', error);
            alert('Failed to process selection. Please try again.');
          }
        }
        break;
      }
      case 'pan': {
        actions.finishPan();
        canvas.style.cursor = 'grab';
        break;
      }
    }
  };

  // Mouse wheel for zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (state.currentTool === 'zoom') {
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - state.panX) / state.scale;
      const y = (e.clientY - rect.top - state.panY) / state.scale;

      actions.zoom(-e.deltaY, x, y);
    }
  };

  // Update cursor based on tool
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    switch (state.currentTool) {
      case 'draw':
        canvas.style.cursor = 'crosshair';
        break;
      case 'select':
        canvas.style.cursor = 'crosshair';
        break;
      case 'pan':
        canvas.style.cursor = 'grab';
        break;
      case 'zoom':
        canvas.style.cursor = 'zoom-in';
        break;
    }
  }, [state.currentTool]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to clear selection
      if (e.key === 'Escape' && state.selectionRect) {
        actions.clearSelection();
      }

      // Ctrl/Cmd + Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        actions.undo();
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y for redo
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        actions.redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectionRect, actions]);

  return (
    <div className="relative w-full h-full bg-white">
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOut={handlePointerUp}
        onWheel={handleWheel}
      />

      {/* Tool indicator */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-md text-sm">
        <div className="flex items-center gap-2">
          <span>Tool: <strong>{state.currentTool}</strong></span>
          {state.currentTool === 'zoom' && (
            <span className="ml-2">| Zoom: {Math.round(state.scale * 100)}%</span>
          )}
        </div>
        {state.chatHistory.length > 0 && (
          <div className="text-xs opacity-75 mt-1">
            {state.chatHistory.length} messages
          </div>
        )}
      </div>
    </div>
  );
}
