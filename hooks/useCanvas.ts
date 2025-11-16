'use client';

import { useState, useRef, useCallback } from 'react';
import type { Tool, Point, Stroke, SelectionRect, ChatMessage, TextOverlay, CanvasState, CanvasActions, TypographyGuides, TrainingMode } from '@/lib/types';

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

  // Chat/Conversation state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);

  // Training state
  const [typographyGuides, setTypographyGuides] = useState<TypographyGuides>({
    enabled: false,
    baseline: 300,
    xHeight: 50,
    capHeight: 80,
    ascender: 100,
    descender: 70,
    color: '#3b82f6',
    opacity: 0.3
  });

  const [trainingMode, setTrainingMode] = useState<TrainingMode>({
    active: false,
    currentPrompt: '',
    currentCharacter: '',
    samplesRequired: 5,
    samplesCollected: 0,
    style: 'print'
  });

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

    // Chat/Conversation actions
    addChatMessage: useCallback((message: ChatMessage) => {
      setChatHistory(prev => [...prev, message]);
    }, []),

    addTextOverlay: useCallback((overlay: TextOverlay) => {
      setTextOverlays(prev => [...prev, overlay]);
    }, []),

    removeTextOverlay: useCallback((id: string) => {
      setTextOverlays(prev => prev.filter(overlay => overlay.id !== id));
    }, []),

    clearTextOverlays: useCallback(() => {
      setTextOverlays([]);
    }, []),

    // Typography & Training actions
    toggleTypographyGuides: useCallback(() => {
      setTypographyGuides(prev => ({ ...prev, enabled: !prev.enabled }));
    }, []),

    updateTypographyGuides: useCallback((guides: Partial<TypographyGuides>) => {
      setTypographyGuides(prev => ({ ...prev, ...guides }));
    }, []),

    startTrainingMode: useCallback((style: 'print' | 'cursive') => {
      setTrainingMode({
        active: true,
        currentPrompt: 'Write the letter "a"',
        currentCharacter: 'a',
        samplesRequired: 5,
        samplesCollected: 0,
        style
      });
      setTypographyGuides(prev => ({ ...prev, enabled: true }));
    }, []),

    stopTrainingMode: useCallback(() => {
      setTrainingMode(prev => ({ ...prev, active: false }));
    }, []),

    nextTrainingPrompt: useCallback(() => {
      // This would advance to the next character/word in the training sequence
      // For now, just increment the samples collected
      setTrainingMode(prev => ({
        ...prev,
        samplesCollected: prev.samplesCollected + 1
      }));
    }, []),

    submitTrainingSample: useCallback((stroke: Stroke) => {
      // This would save the training sample to the database
      // For now, just log it
      console.log('Training sample submitted:', stroke);
    }, []),

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
      setChatHistory([]);
      setTextOverlays([]);
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
    chatHistory,
    textOverlays,
    typographyGuides,
    trainingMode,
    undoStack,
    redoStack
  };

  return [state, actions, canvasRef];
}
