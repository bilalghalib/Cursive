'use client';

import { useEffect, useState } from 'react';
import { getStroke } from 'perfect-freehand';
import type { CanvasState, CanvasActions, Stroke, ChatMessage, TextOverlay, Point, LassoSelection, BoundingBox } from '@/lib/types';
import { sendImageToAI, imageDataToBase64, sendChatToAI } from '@/lib/ai';
import { detectCircleGesture, type GestureResult, resetCircleDetection } from '@/lib/gestureDetection';
import { findStrokesInCircle, calculatePointsBounds, calculateSpatialContext } from '@/lib/spatial';
import { PAGE } from '@/lib/constants';
import { TopBar } from './TopBar';
import { GestureCheatSheet } from './GestureCheatSheet';
import { LassoSelectionUI } from './LassoSelectionUI';

interface CanvasProps {
  state: CanvasState;
  actions: CanvasActions;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export function Canvas({ state, actions, canvasRef }: CanvasProps) {
  // Help overlay state
  const [showHelp, setShowHelp] = useState(false);

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

      // For A4 page rendering, calculate canvas size to fit page with padding
      const currentPage = state.pages.find(p => p.id === state.currentPageId);
      const pageWidth = currentPage?.size === 'A4' ? PAGE.A4_WIDTH : PAGE.A4_WIDTH;
      const pageHeight = currentPage?.size === 'A4' ? PAGE.A4_HEIGHT : PAGE.A4_HEIGHT;

      // Canvas should fit the page with padding
      const width = Math.max(container.clientWidth, pageWidth + PAGE.PAGE_PADDING * 2);
      const height = Math.max(container.clientHeight, pageHeight + PAGE.PAGE_PADDING * 2);

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

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [state.currentPageId, state.pages]);

  // Redraw canvas whenever state changes
  useEffect(() => {
    redrawCanvas();
  }, [state.drawings, state.currentStroke, state.scale, state.panX, state.panY, state.selectionRect, state.lassoSelection, state.textOverlays, state.typographyGuides, state.currentPageId]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas (account for DPR scaling)
    ctx.save();
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#f3f4f6'; // gray-100 background (outside page)
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Re-apply DPR scaling
    ctx.restore();

    // Get current page dimensions
    const currentPage = state.pages.find(p => p.id === state.currentPageId);
    const pageWidth = currentPage?.size === 'A4' ? PAGE.A4_WIDTH : PAGE.A4_WIDTH;
    const pageHeight = currentPage?.size === 'A4' ? PAGE.A4_HEIGHT : PAGE.A4_HEIGHT;

    // Calculate page position (centered in canvas)
    const canvasWidth = canvas.width / dpr;
    const canvasHeight = canvas.height / dpr;
    const pageX = (canvasWidth - pageWidth) / 2;
    const pageY = PAGE.PAGE_PADDING;

    // Draw A4 page with shadow
    ctx.save();

    // Shadow
    ctx.shadowColor = PAGE.SHADOW_COLOR;
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    // Page background
    ctx.fillStyle = currentPage?.backgroundColor || PAGE.DEFAULT_BACKGROUND;
    ctx.fillRect(pageX, pageY, pageWidth, pageHeight);

    // Page border
    ctx.strokeStyle = PAGE.BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(pageX, pageY, pageWidth, pageHeight);

    ctx.restore();

    // Set clip region to page area (strokes only appear on page)
    ctx.save();
    ctx.beginPath();
    ctx.rect(pageX, pageY, pageWidth, pageHeight);
    ctx.clip();

    // Apply transformations (relative to page)
    ctx.translate(pageX + state.panX, pageY + state.panY);
    ctx.scale(state.scale, state.scale);

    // Draw typography guides (if enabled)
    if (state.typographyGuides.enabled) {
      drawTypographyGuides(ctx, pageWidth);
    }

    // Draw all strokes on current page
    const currentPageStrokes = state.drawings; // TODO: Filter by page_id when DB is connected
    currentPageStrokes.forEach(stroke => {
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

    // Draw lasso selection path (if active)
    if (state.lassoSelection) {
      drawLassoPath(ctx, state.lassoSelection.path);
    }

    // Draw text overlays (filter AI responses if hideAIResponses is true)
    const visibleOverlays = state.hideAIResponses
      ? state.textOverlays.filter(overlay => !overlay.isAI)
      : state.textOverlays;

    visibleOverlays.forEach(overlay => {
      drawTextOverlay(ctx, overlay);
    });

    ctx.restore(); // Restore after page clipping

    // Draw selection rectangle (outside page clipping)
    if (state.selectionRect) {
      ctx.save();
      ctx.translate(pageX, pageY);
      drawSelectionRect(ctx, state.selectionRect);
      ctx.restore();
    }
  };

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length === 0) return;

    // Convert points to perfect-freehand format: [x, y, pressure]
    const inputPoints = stroke.points.map(p => [
      p.x,
      p.y,
      p.pressure || 0.5
    ]);

    // Use perfect-freehand to generate smooth outline
    const outlinePoints = getStroke(inputPoints, {
      size: stroke.width * 4,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      easing: (t) => t,
      start: { taper: 0, cap: true },
      end: { taper: 0, cap: true }
    });

    if (outlinePoints.length === 0) return;

    ctx.beginPath();
    ctx.fillStyle = stroke.color;
    ctx.moveTo(outlinePoints[0][0], outlinePoints[0][1]);
    for (let i = 1; i < outlinePoints.length; i++) {
      ctx.lineTo(outlinePoints[i][0], outlinePoints[i][1]);
    }
    ctx.closePath();
    ctx.fill();
  };

  const drawLassoPath = (ctx: CanvasRenderingContext2D, path: Point[]) => {
    if (path.length < 2) return;

    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#3b82f6'; // blue-500
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;

    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    // Close the path if it's a closed loop
    if (path.length > 3) {
      ctx.closePath();
    }
    ctx.stroke();

    // Fill with semi-transparent blue
    ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
    ctx.fill();

    ctx.restore();
  };

  const drawTextOverlay = (ctx: CanvasRenderingContext2D, overlay: TextOverlay) => {
    ctx.save();
    ctx.font = `${overlay.fontSize}px 'Caveat', cursive`;
    ctx.fillStyle = overlay.color;
    ctx.textBaseline = 'top';

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

  const drawTypographyGuides = (ctx: CanvasRenderingContext2D, pageWidth: number) => {
    const guides = state.typographyGuides;

    ctx.save();
    ctx.strokeStyle = guides.color;
    ctx.globalAlpha = guides.opacity;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

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
      ctx.setLineDash(line.bold ? [10, 5] : [5, 5]);

      ctx.beginPath();
      ctx.moveTo(0, line.y);
      ctx.lineTo(pageWidth, line.y);
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.fillStyle = line.color;
      ctx.font = line.bold ? 'bold 12px sans-serif' : '11px sans-serif';
      ctx.fillText(line.label, 10, line.y - 5);
    });

    ctx.restore();
  };

  const drawSelectionRect = (ctx: CanvasRenderingContext2D, rect: { startX: number; startY: number; endX: number; endY: number }) => {
    const minX = Math.min(rect.startX, rect.endX);
    const minY = Math.min(rect.startY, rect.endY);
    const width = Math.abs(rect.endX - rect.startX);
    const height = Math.abs(rect.endY - rect.startY);

    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(minX, minY, width, height);
    ctx.fillStyle = 'rgba(37, 99, 235, 0.1)';
    ctx.fillRect(minX, minY, width, height);
    ctx.restore();
  };

  // Get canvas coordinates from event (relative to page)
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const canvasWidth = canvas.width / dpr;

    const currentPage = state.pages.find(p => p.id === state.currentPageId);
    const pageWidth = currentPage?.size === 'A4' ? PAGE.A4_WIDTH : PAGE.A4_WIDTH;
    const pageX = (canvasWidth - pageWidth) / 2;
    const pageY = PAGE.PAGE_PADDING;

    const x = (e.clientX - rect.left - pageX - state.panX) / state.scale;
    const y = (e.clientY - rect.top - pageY - state.panY) / state.scale;

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

  // Helper to render strokes to a temporary canvas for AI processing
  const renderStrokesToImage = async (strokes: Stroke[]): Promise<ImageData | null> => {
    if (strokes.length === 0) return null;

    // Calculate bounding box for all strokes
    const allPoints = strokes.flatMap(s => s.points);
    if (allPoints.length === 0) return null;

    const xs = allPoints.map(p => p.x);
    const ys = allPoints.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const padding = 20;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    // Create temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;

    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return null;

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Render each stroke
    strokes.forEach(stroke => {
      const outlinePoints = getStroke(stroke.points, {
        size: stroke.width,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
        simulatePressure: true
      });

      if (outlinePoints.length === 0) return;

      ctx.save();
      ctx.fillStyle = stroke.color;
      ctx.beginPath();

      // Adjust points to be relative to bounding box
      const [firstPoint] = outlinePoints;
      ctx.moveTo(firstPoint[0] - minX + padding, firstPoint[1] - minY + padding);

      for (let i = 1; i < outlinePoints.length; i++) {
        const [x, y] = outlinePoints[i];
        ctx.lineTo(x - minX + padding, y - minY + padding);
      }

      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // Get image data
    return ctx.getImageData(0, 0, width, height);
  };

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);

    // Always draw in this simplified version (no tool switching)
    const { x, y } = getCanvasCoords(e);
    actions.startDrawing({ x, y, pressure: e.pressure });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (state.currentStroke.length > 0) {
      const { x, y } = getCanvasCoords(e);
      actions.continueDrawing({ x, y, pressure: e.pressure });
    }
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.releasePointerCapture(e.pointerId);

    if (state.currentStroke.length > 0) {
      const gestureResult = detectCircleGesture(state.currentStroke);

      if (gestureResult.isGesture && gestureResult.confidence > 0.5) {
        // Detected circle gesture!
        if (gestureResult.gestureType === 'double_circle') {
          // Double circle: Send all new strokes immediately
          await handleDoubleCircleSend();
        } else if (gestureResult.gestureType === 'circle') {
          // Single circle: Create lasso selection
          handleSingleCircleSelection();
        }
      } else {
        // Not a gesture, just add as regular stroke
        actions.finishDrawing();
      }
    }
  };

  // Handle double-circle: Send all new strokes immediately
  const handleDoubleCircleSend = async () => {
    console.log('Double circle detected! Sending all new strokes...');

    // Get all strokes created since last AI interaction
    const newStrokes = state.drawings.filter(stroke =>
      !stroke.isAI && (stroke.timestamp || 0) > state.lastAITimestamp
    );

    if (newStrokes.length === 0) {
      console.log('No new strokes to send');
      actions.finishDrawing();
      return;
    }

    try {
      // Render new strokes to temporary canvas
      const imageData = await renderStrokesToImage(newStrokes);
      if (!imageData) {
        console.error('Failed to render strokes to image');
        actions.finishDrawing();
        return;
      }

      // Convert to base64
      const base64Image = imageDataToBase64(imageData);

      // Send to AI
      const response = await sendImageToAI(base64Image);
      console.log('AI Response:', response);

      // Add AI response as text overlay
      // TODO: Position AI response spatially using calculateSpatialContext
      const currentPage = state.pages.find(p => p.id === state.currentPageId);
      const pageHeight = currentPage?.size === 'A4' ? PAGE.A4_HEIGHT : PAGE.A4_HEIGHT;

      actions.addTextOverlay({
        id: `overlay-${Date.now()}`,
        text: response.transcription,
        x: 50,
        y: pageHeight - 100,
        width: 700,
        fontSize: 16,
        color: '#3b82f6', // Blue for AI responses
        timestamp: Date.now(),
        isAI: true
      });

      // Update last AI timestamp
      actions.setLastAITimestamp(Date.now());

      // Add to chat history
      actions.addChatMessage({
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: response.transcription,
        timestamp: Date.now(),
        isHandwritten: false
      });
    } catch (error) {
      console.error('Error sending to AI:', error);
    }

    actions.finishDrawing();
  };

  // Handle single circle: Select strokes inside
  const handleSingleCircleSelection = () => {
    const selectedIndices = findStrokesInCircle(state.drawings, state.currentStroke);

    if (selectedIndices.length > 0) {
      const bounds = calculatePointsBounds(state.currentStroke);
      const lassoSelection: LassoSelection = {
        path: [...state.currentStroke],
        selectedStrokes: selectedIndices,
        bounds,
        pageId: state.currentPageId
      };

      actions.setLassoSelection(lassoSelection);
      actions.finishDrawing();
    } else {
      // No strokes inside, just add circle as regular drawing
      actions.finishDrawing();
    }
  };

  // Lasso selection handlers
  const handleLassoAskAI = async () => {
    if (!state.lassoSelection) return;

    console.log('Ask AI clicked for lasso selection', state.lassoSelection);

    try {
      // Get selected strokes
      const selectedStrokes = state.lassoSelection.selectedStrokes.map(
        index => state.drawings[index]
      );

      // Render selected strokes to image
      const imageData = await renderStrokesToImage(selectedStrokes);
      if (!imageData) {
        console.error('Failed to render strokes to image');
        actions.clearLasso();
        return;
      }

      // Convert to base64
      const base64Image = imageDataToBase64(imageData);

      // Calculate spatial context for AI response positioning
      const spatialContext = calculateSpatialContext(
        state.lassoSelection.bounds,
        state.drawings,
        state.textOverlays,
        PAGE.A4_WIDTH,
        PAGE.A4_HEIGHT
      );

      console.log('Spatial context:', spatialContext);

      // Send to AI
      const response = await sendImageToAI(base64Image);
      console.log('AI Response:', response);

      // Add AI response as text overlay at suggested position
      actions.addTextOverlay({
        id: `overlay-${Date.now()}`,
        text: response.transcription,
        x: 50,
        y: spatialContext.suggestedResponseY,
        width: 700,
        fontSize: 16,
        color: '#3b82f6', // Blue for AI responses
        timestamp: Date.now(),
        isAI: true
      });

      // Update last AI timestamp
      actions.setLastAITimestamp(Date.now());

      // Add to chat history
      actions.addChatMessage({
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: response.transcription,
        timestamp: Date.now(),
        isHandwritten: false
      });
    } catch (error) {
      console.error('Error sending to AI:', error);
    }

    actions.clearLasso();
  };

  const handleLassoDelete = () => {
    if (!state.lassoSelection) return;

    console.log('Deleting strokes:', state.lassoSelection.selectedStrokes);

    // Delete selected strokes using new action
    actions.deleteStrokes(state.lassoSelection.selectedStrokes);
    actions.clearLasso();
  };

  const handleLassoClear = () => {
    actions.clearLasso();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ? key to toggle help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowHelp(prev => !prev);
      }

      // Escape to clear selection or lasso
      if (e.key === 'Escape') {
        if (state.lassoSelection) {
          actions.clearLasso();
        } else if (state.selectionRect) {
          actions.clearSelection();
        }
      }

      // Cmd/Ctrl + Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        actions.undo();
      }

      // Cmd/Ctrl + Shift + Z for redo
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        actions.redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.lassoSelection, state.selectionRect, actions]);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top Bar */}
      <TopBar
        notebookTitle="My Notebook" // TODO: Get from actual notebook
        pages={state.pages}
        currentPageId={state.currentPageId}
        onPageChange={actions.goToPage}
        onPageTitleUpdate={actions.updatePageTitle}
        onHelpClick={() => setShowHelp(true)}
      />

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerOut={handlePointerUp}
        />

        {/* Lasso Selection UI */}
        {state.lassoSelection && (
          <LassoSelectionUI
            selection={state.lassoSelection}
            onAskAI={handleLassoAskAI}
            onDelete={handleLassoDelete}
            onClear={handleLassoClear}
          />
        )}
      </div>

      {/* Help Overlay */}
      {showHelp && (
        <GestureCheatSheet onClose={() => setShowHelp(false)} />
      )}
    </div>
  );
}
