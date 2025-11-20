'use client';

import { useEffect } from 'react';
import { getStroke } from 'perfect-freehand';
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

    // Set canvas size (account for high-DPI displays like iPad Retina)
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Set actual size in memory (scaled for retina)
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      // Set display size (CSS pixels)
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Scale context to match
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

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

    // Apply transformations
    ctx.save();
    ctx.translate(state.panX, state.panY);
    ctx.scale(state.scale, state.scale);

    // Draw typography guides (if enabled)
    if (state.typographyGuides.enabled) {
      drawTypographyGuides(ctx);
    }

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

    // Draw text overlays (filter AI responses if hideAIResponses is true)
    const visibleOverlays = state.hideAIResponses
      ? state.textOverlays.filter(overlay => !overlay.isAI)
      : state.textOverlays;

    visibleOverlays.forEach(overlay => {
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

    // Convert points to perfect-freehand format: [x, y, pressure]
    const inputPoints = stroke.points.map(p => [
      p.x,
      p.y,
      p.pressure || 0.5 // Default pressure if not available
    ]);

    // Use perfect-freehand to generate smooth outline
    const outlinePoints = getStroke(inputPoints, {
      size: stroke.width * 4,        // Base size (multiply by 4 for good thickness)
      thinning: 0.5,                  // Pressure sensitivity
      smoothing: 0.5,                 // Curve smoothing
      streamline: 0.5,                // Point reduction for smoothness
      easing: (t) => t,               // Linear pressure easing
      start: { taper: 0, cap: true }, // Round start cap
      end: { taper: 0, cap: true }    // Round end cap
    });

    // Render the stroke as a filled polygon
    if (outlinePoints.length === 0) return;

    ctx.beginPath();
    ctx.fillStyle = stroke.color;

    // Move to first point
    ctx.moveTo(outlinePoints[0][0], outlinePoints[0][1]);

    // Draw outline polygon
    for (let i = 1; i < outlinePoints.length; i++) {
      ctx.lineTo(outlinePoints[i][0], outlinePoints[i][1]);
    }

    ctx.closePath();
    ctx.fill();
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

  const drawTypographyGuides = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const guides = state.typographyGuides;
    const canvasWidth = canvas.width / state.scale;

    ctx.save();

    // --- HORIZONTAL GUIDELINES ---
    ctx.strokeStyle = guides.color;
    ctx.globalAlpha = guides.opacity;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // Draw horizontal guide lines
    const lines = [
      { y: guides.baseline - guides.ascender, label: 'Ascender', color: '#3b82f6' },
      { y: guides.baseline - guides.capHeight, label: 'Cap Height', color: '#8b5cf6' },
      { y: guides.baseline - guides.xHeight, label: 'X-Height', color: '#10b981' },
      { y: guides.baseline, label: 'Baseline', bold: true, color: '#ef4444' },
      { y: guides.baseline + guides.descender, label: 'Descender', color: '#f59e0b' },
    ];

    lines.forEach(line => {
      ctx.strokeStyle = line.color;
      ctx.globalAlpha = line.bold ? 0.6 : guides.opacity;
      ctx.lineWidth = line.bold ? 2 : 1;

      if (!line.bold) {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([10, 5]);
      }

      ctx.beginPath();
      ctx.moveTo(0, line.y);
      ctx.lineTo(canvasWidth, line.y);
      ctx.stroke();

      // Draw label on left
      ctx.globalAlpha = 1;
      ctx.fillStyle = line.color;
      ctx.font = line.bold ? 'bold 12px sans-serif' : '11px sans-serif';
      ctx.fillText(line.label, 10, line.y - 5);

      // Draw label on right for clarity
      ctx.textAlign = 'right';
      ctx.fillText(line.label, canvasWidth - 10, line.y - 5);
      ctx.textAlign = 'left';
    });

    // --- VERTICAL SPACING GUIDES (for letter width consistency) ---
    ctx.globalAlpha = 0.15;
    ctx.setLineDash([3, 8]);
    ctx.lineWidth = 0.5;

    // Draw vertical guides at regular intervals (letter width guides)
    const letterWidthGuide = guides.xHeight * 0.8; // Approximate letter width
    for (let x = 100; x < canvasWidth; x += letterWidthGuide) {
      ctx.strokeStyle = '#94a3b8'; // slate-400
      ctx.beginPath();
      ctx.moveTo(x, guides.baseline - guides.ascender - 20);
      ctx.lineTo(x, guides.baseline + guides.descender + 20);
      ctx.stroke();
    }

    // --- SLANT ANGLE GUIDE (for cursive consistency) ---
    // Draw slanted guides to help maintain consistent slant
    ctx.globalAlpha = 0.12;
    ctx.setLineDash([2, 10]);
    ctx.strokeStyle = '#8b5cf6'; // purple-500
    const slantAngle = 15; // degrees (typical cursive slant)
    const slantSpacing = 80;

    for (let x = 100; x < canvasWidth; x += slantSpacing) {
      const dx = Math.tan((slantAngle * Math.PI) / 180) * (guides.ascender + guides.descender);
      ctx.beginPath();
      ctx.moveTo(x - dx / 2, guides.baseline - guides.ascender);
      ctx.lineTo(x + dx / 2, guides.baseline + guides.descender);
      ctx.stroke();
    }

    // --- CONNECTION POINT GUIDES (for cursive connections) ---
    // Show where letters typically connect (at baseline or slightly above)
    ctx.globalAlpha = 0.3;
    ctx.setLineDash([]);
    ctx.strokeStyle = '#f59e0b'; // amber-500
    ctx.lineWidth = 2;

    // Connection height (typically 1/3 up from baseline to x-height)
    const connectionY = guides.baseline - (guides.xHeight / 3);

    // Draw connection point markers (small circles)
    for (let x = 100 + letterWidthGuide; x < canvasWidth; x += letterWidthGuide) {
      ctx.beginPath();
      ctx.arc(x, connectionY, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
    }

    // --- TRAINING MODE SPECIFIC GUIDES ---
    if (state.trainingMode.active) {
      // Draw character positioning box (where to write the current character)
      const boxX = 120;
      const boxWidth = guides.xHeight * 1.2; // Character width guide

      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = '#06b6d4'; // cyan-500
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 5]);

      // Draw vertical boundaries for character
      ctx.beginPath();
      ctx.moveTo(boxX, guides.baseline - guides.ascender - 10);
      ctx.lineTo(boxX, guides.baseline + guides.descender + 10);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(boxX + boxWidth, guides.baseline - guides.ascender - 10);
      ctx.lineTo(boxX + boxWidth, guides.baseline + guides.descender + 10);
      ctx.stroke();

      // Draw "write here" indicator
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✏️ Write here', boxX + boxWidth / 2, guides.baseline - guides.ascender - 25);
      ctx.textAlign = 'left';
    }

    // --- LEGEND (top-right corner) ---
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(canvasWidth - 180, 10, 170, 140);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(canvasWidth - 180, 10, 170, 140);

    ctx.globalAlpha = 1;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText('Typography Guides', canvasWidth - 175, 25);

    ctx.font = '10px sans-serif';
    const legendItems = [
      { color: '#ef4444', label: 'Baseline (sit letters)' },
      { color: '#10b981', label: 'X-Height (lowercase)' },
      { color: '#8b5cf6', label: 'Cap Height (uppercase)' },
      { color: '#3b82f6', label: 'Ascender (b,d,h,k,l,t)' },
      { color: '#f59e0b', label: 'Descender (g,j,p,q,y)' },
      { color: '#8b5cf6', label: 'Slant Guide (~15°)' },
      { color: '#f59e0b', label: 'Connection Points' },
    ];

    legendItems.forEach((item, i) => {
      const y = 45 + i * 14;
      ctx.fillStyle = item.color;
      ctx.fillRect(canvasWidth - 170, y - 6, 10, 3);
      ctx.fillStyle = '#475569';
      ctx.fillText(item.label, canvasWidth - 155, y);
    });

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
        actions.startDrawing({ x, y, pressure: e.pressure });
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
          actions.continueDrawing({ x, y, pressure: e.pressure });
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
              timestamp: Date.now(),
              isAI: true  // Mark as AI-generated for hide/show toggle
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
