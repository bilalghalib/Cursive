'use client';

import { useState, useRef, useCallback } from 'react';
import type { Tool, Point, Stroke, SelectionRect, CanvasState, CanvasActions } from '@/lib/types';

export function useCanvas(): [CanvasState, CanvasActions, React.RefObject<HTMLCanvasElement>] {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Tool state
  const [currentTool, setCurrentTool] = useState<Tool>('draw');

  // Drawing state
  const [drawings, setDrawings] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);

  // Transform state
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Selection state
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);

  // History
  const [undoStack, setUndoStack] = useState<Stroke[][]>([[]]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);

  // Pan state (temporary during drag)
  const panStartRef = useRef<{ x: number; y: number; initialPanX: number; initialPanY: number } | null>(null);

  // Actions
  const actions: CanvasActions = {
    // Tool actions
    setTool: useCallback((tool: Tool) => {
      setCurrentTool(tool);
      // Clear selection when switching tools
      if (tool !== 'select') {
        setSelectionRect(null);
      }
    }, []),

    // Drawing actions
    startDrawing: useCallback((point: Point) => {
      setCurrentStroke([point]);
    }, []),

    continueDrawing: useCallback((point: Point) => {
      setCurrentStroke(prev => [...prev, point]);
    }, []),

    finishDrawing: useCallback(() => {
      if (currentStroke.length > 0) {
        const newStroke: Stroke = {
          points: currentStroke,
          color: '#000000',
          width: 2,
          timestamp: Date.now()
        };

        setDrawings(prev => {
          const newDrawings = [...prev, newStroke];
          // Update undo stack
          setUndoStack(stack => [...stack, newDrawings]);
          setRedoStack([]);
          return newDrawings;
        });

        setCurrentStroke([]);
      }
    }, [currentStroke]),

    // Selection actions
    startSelection: useCallback((x: number, y: number) => {
      setSelectionRect({ startX: x, startY: y, endX: x, endY: y });
    }, []),

    updateSelection: useCallback((x: number, y: number) => {
      setSelectionRect(prev => {
        if (!prev) return null;
        return { ...prev, endX: x, endY: y };
      });
    }, []),

    finishSelection: useCallback((): ImageData | null => {
      if (!selectionRect || !canvasRef.current) return null;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Calculate selection bounds
      const minX = Math.min(selectionRect.startX, selectionRect.endX);
      const minY = Math.min(selectionRect.startY, selectionRect.endY);
      const width = Math.abs(selectionRect.endX - selectionRect.startX);
      const height = Math.abs(selectionRect.endY - selectionRect.startY);

      // Get image data from selection
      if (width > 0 && height > 0) {
        return ctx.getImageData(minX, minY, width, height);
      }

      return null;
    }, [selectionRect]),

    clearSelection: useCallback(() => {
      setSelectionRect(null);
    }, []),

    // Pan actions
    startPan: useCallback((x: number, y: number) => {
      panStartRef.current = {
        x,
        y,
        initialPanX: panX,
        initialPanY: panY
      };
    }, [panX, panY]),

    updatePan: useCallback((x: number, y: number) => {
      if (!panStartRef.current) return;

      const deltaX = x - panStartRef.current.x;
      const deltaY = y - panStartRef.current.y;

      setPanX(panStartRef.current.initialPanX + deltaX);
      setPanY(panStartRef.current.initialPanY + deltaY);
    }, []),

    finishPan: useCallback(() => {
      panStartRef.current = null;
    }, []),

    // Zoom actions
    zoom: useCallback((delta: number, centerX: number, centerY: number) => {
      const zoomFactor = delta > 0 ? 1.1 : 0.9;
      const newScale = Math.max(0.1, Math.min(5, scale * zoomFactor));

      // Zoom towards cursor position
      const scaleDiff = newScale - scale;
      setPanX(prev => prev - (centerX * scaleDiff));
      setPanY(prev => prev - (centerY * scaleDiff));
      setScale(newScale);
    }, [scale]),

    // History actions
    undo: useCallback(() => {
      if (undoStack.length > 1) {
        const newUndoStack = [...undoStack];
        const currentState = newUndoStack.pop()!;
        const previousState = newUndoStack[newUndoStack.length - 1];

        setUndoStack(newUndoStack);
        setRedoStack(prev => [...prev, currentState]);
        setDrawings(previousState);
      }
    }, [undoStack]),

    redo: useCallback(() => {
      if (redoStack.length > 0) {
        const newRedoStack = [...redoStack];
        const nextState = newRedoStack.pop()!;

        setRedoStack(newRedoStack);
        setUndoStack(prev => [...prev, nextState]);
        setDrawings(nextState);
      }
    }, [redoStack]),

    // Utility actions
    clearAll: useCallback(() => {
      setDrawings([]);
      setCurrentStroke([]);
      setUndoStack([[]]);
      setRedoStack([]);
      setSelectionRect(null);
      setScale(1);
      setPanX(0);
      setPanY(0);
    }, []),

    getCanvasImageData: useCallback((): ImageData | null => {
      if (!canvasRef.current) return null;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return null;
      return ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    }, [])
  };

  const state: CanvasState = {
    currentTool,
    drawings,
    currentStroke,
    scale,
    panX,
    panY,
    selectionRect,
    undoStack,
    redoStack
  };

  return [state, actions, canvasRef];
}
