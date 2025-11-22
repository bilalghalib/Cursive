'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Tool, Point, Stroke, SelectionRect, ChatMessage, TextOverlay, CanvasState, CanvasActions, TypographyGuides, TrainingMode, Page, Notebook, LassoSelection } from '@/lib/types';
import { TRAINING, CANVAS, PAGE } from '@/lib/constants';
import { isValidStroke, sanitizeStroke } from '@/lib/validation';

// Training alphabet prompts
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'.split('');
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const NUMBERS = '0123456789'.split('');

export function useCanvas(): [CanvasState, CanvasActions, React.RefObject<HTMLCanvasElement>] {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Refs for avoiding stale closures and cleanup
  const actionsRef = useRef<CanvasActions | null>(null);
  const trainingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Tool state
  const [currentTool, setCurrentTool] = useState<Tool>('draw');

  // Notebook system state
  const [notebooks, setNotebooks] = useState<Notebook[]>([{
    id: 'notebook-1',
    userId: undefined,
    title: 'My Notebook',
    description: undefined,
    isShared: false,
    shareId: undefined,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }]);
  const [currentNotebookId, setCurrentNotebookId] = useState<string>('notebook-1');

  // Page system state
  const [pages, setPages] = useState<Page[]>([{
    id: 'page-1',
    notebookId: 'notebook-1',
    pageNumber: 1,
    title: undefined,
    size: PAGE.DEFAULT_SIZE,
    orientation: PAGE.DEFAULT_ORIENTATION,
    backgroundColor: PAGE.DEFAULT_BACKGROUND,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }]);
  const [currentPageId, setCurrentPageId] = useState<string>('page-1');

  // Drawing state
  const [drawings, setDrawings] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);

  // Last AI interaction timestamp (for tracking "new" strokes)
  const [lastAITimestamp, setLastAITimestamp] = useState<number>(0);

  // Transform state
  const [scale, setScale] = useState<number>(CANVAS.DEFAULT_SCALE);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);

  // Selection state
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [lassoSelection, setLassoSelection] = useState<LassoSelection | null>(null);

  // Chat/Conversation state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);

  // Educational integrity state
  const [hideAIResponses, setHideAIResponses] = useState<boolean>(false);

  // Training mode state
  const [typographyGuides, setTypographyGuides] = useState<TypographyGuides>({
    enabled: false,
    baseline: TRAINING.DEFAULT_BASELINE,
    xHeight: TRAINING.DEFAULT_X_HEIGHT,
    capHeight: TRAINING.DEFAULT_CAP_HEIGHT,
    ascender: TRAINING.DEFAULT_ASCENDER,
    descender: TRAINING.DEFAULT_DESCENDER,
    color: TRAINING.GUIDE_COLOR,
    opacity: TRAINING.GUIDE_OPACITY
  });

  const [trainingMode, setTrainingMode] = useState<TrainingMode>({
    active: false,
    currentPrompt: '',
    currentCharacter: '',
    samplesRequired: TRAINING.SAMPLES_PER_CHARACTER,
    samplesCollected: 0,
    style: 'print'
  });

  const [trainingData, setTrainingData] = useState<Stroke[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);

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
      if (tool !== 'select' && tool !== 'lasso') {
        setSelectionRect(null);
        setLassoSelection(null);
      }
    }, []),

    // Notebook actions
    addNotebook: useCallback((title?: string) => {
      const newNotebook: Notebook = {
        id: `notebook-${Date.now()}`,
        userId: undefined,
        title: title || `Notebook ${notebooks.length + 1}`,
        description: undefined,
        isShared: false,
        shareId: undefined,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setNotebooks(prev => [...prev, newNotebook]);

      // Create first page for new notebook
      const newPage: Page = {
        id: `page-${Date.now()}`,
        notebookId: newNotebook.id,
        pageNumber: 1,
        title: undefined,
        size: PAGE.DEFAULT_SIZE,
        orientation: PAGE.DEFAULT_ORIENTATION,
        backgroundColor: PAGE.DEFAULT_BACKGROUND,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setPages(prev => [...prev, newPage]);

      // Switch to new notebook and page
      setCurrentNotebookId(newNotebook.id);
      setCurrentPageId(newPage.id);
    }, [notebooks]),

    deleteNotebook: useCallback((notebookId: string) => {
      if (notebooks.length === 1) {
        alert('Cannot delete the last notebook');
        return;
      }
      setNotebooks(prev => prev.filter(n => n.id !== notebookId));

      // Remove all pages from this notebook
      setPages(prev => prev.filter(p => p.notebookId !== notebookId));

      // If deleting current notebook, switch to another
      if (notebookId === currentNotebookId) {
        const remainingNotebook = notebooks.find(n => n.id !== notebookId);
        if (remainingNotebook) {
          setCurrentNotebookId(remainingNotebook.id);
          const firstPage = pages.find(p => p.notebookId === remainingNotebook.id);
          if (firstPage) setCurrentPageId(firstPage.id);
        }
      }
    }, [notebooks, currentNotebookId, pages]),

    goToNotebook: useCallback((notebookId: string) => {
      setCurrentNotebookId(notebookId);

      // Switch to first page of this notebook
      const firstPage = pages.find(p => p.notebookId === notebookId);
      if (firstPage) {
        setCurrentPageId(firstPage.id);
      }
    }, [pages]),

    updateNotebookTitle: useCallback((notebookId: string, title: string) => {
      setNotebooks(prev => prev.map(n =>
        n.id === notebookId ? { ...n, title: title || 'Untitled Notebook', updatedAt: Date.now() } : n
      ));
    }, []),

    // Page actions
    addPage: useCallback(() => {
      // Get pages in current notebook only
      const currentNotebookPages = pages.filter(p => p.notebookId === currentNotebookId);
      const newPageNumber = currentNotebookPages.length + 1;
      const newPage: Page = {
        id: `page-${Date.now()}`,
        notebookId: currentNotebookId,
        pageNumber: newPageNumber,
        title: undefined,
        size: PAGE.DEFAULT_SIZE,
        orientation: PAGE.DEFAULT_ORIENTATION,
        backgroundColor: PAGE.DEFAULT_BACKGROUND,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setPages(prev => [...prev, newPage]);
      setCurrentPageId(newPage.id);
    }, [pages, currentNotebookId]),

    deletePage: useCallback((pageId: string) => {
      if (pages.length === 1) {
        alert('Cannot delete the last page');
        return;
      }
      setPages(prev => {
        const filtered = prev.filter(p => p.id !== pageId);
        // Renumber pages
        return filtered.map((p, i) => ({ ...p, pageNumber: i + 1 }));
      });
      // If deleting current page, go to previous or next
      if (pageId === currentPageId) {
        const currentIndex = pages.findIndex(p => p.id === pageId);
        const newPage = pages[currentIndex - 1] || pages[currentIndex + 1];
        if (newPage) setCurrentPageId(newPage.id);
      }
    }, [pages, currentPageId]),

    goToPage: useCallback((pageId: string) => {
      setCurrentPageId(pageId);
    }, []),

    nextPage: useCallback(() => {
      const currentIndex = pages.findIndex(p => p.id === currentPageId);
      if (currentIndex < pages.length - 1) {
        setCurrentPageId(pages[currentIndex + 1].id);
      }
    }, [pages, currentPageId]),

    previousPage: useCallback(() => {
      const currentIndex = pages.findIndex(p => p.id === currentPageId);
      if (currentIndex > 0) {
        setCurrentPageId(pages[currentIndex - 1].id);
      }
    }, [pages, currentPageId]),

    updatePageTitle: useCallback((pageId: string, title: string) => {
      setPages(prev => prev.map(p =>
        p.id === pageId ? { ...p, title: title || undefined, updatedAt: Date.now() } : p
      ));
    }, []),

    // Drawing actions
    startDrawing: useCallback((point: Point) => {
      const pointWithTimestamp = { ...point, timestamp: Date.now() };
      setCurrentStroke([pointWithTimestamp]);
    }, []),

    continueDrawing: useCallback((point: Point) => {
      const pointWithTimestamp = { ...point, timestamp: Date.now() };
      setCurrentStroke(prev => [...prev, pointWithTimestamp]);
    }, []),

    finishDrawing: useCallback(() => {
      if (currentStroke.length > 0) {
        const newStroke: Stroke = {
          points: currentStroke,
          color: CANVAS.DEFAULT_COLOR,
          width: CANVAS.STROKE_WIDTH,
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

    // Lasso actions
    startLasso: useCallback((point: Point) => {
      // Lasso starts just like drawing
      const pointWithTimestamp = { ...point, timestamp: Date.now() };
      setCurrentStroke([pointWithTimestamp]);
    }, []),

    continueLasso: useCallback((point: Point) => {
      // Continue lasso path
      const pointWithTimestamp = { ...point, timestamp: Date.now() };
      setCurrentStroke(prev => [...prev, pointWithTimestamp]);
    }, []),

    finishLasso: useCallback(() => {
      // Lasso is finished - this is called from Canvas when circle gesture is detected
      // The actual selection logic happens in Canvas.tsx
      setCurrentStroke([]);
    }, []),

    clearLasso: useCallback(() => {
      setLassoSelection(null);
    }, []),

    // Helper to set lasso selection from Canvas (after circle detection)
    setLassoSelection: useCallback((selection: LassoSelection | null) => {
      setLassoSelection(selection);
    }, []),

    // Helper to update last AI timestamp (after AI responds)
    setLastAITimestamp: useCallback((timestamp: number) => {
      setLastAITimestamp(timestamp);
    }, []),

    sendLassoToAI: useCallback(async (includePageIds?: string[]) => {
      // TODO: Implement AI send flow
      // This will be called from Canvas.tsx when user clicks "Ask AI"
      console.log('sendLassoToAI called', { lassoSelection, includePageIds });
    }, [lassoSelection]),

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
      const zoomFactor = delta > 0 ? CANVAS.ZOOM_FACTOR : 1 / CANVAS.ZOOM_FACTOR;
      const newScale = Math.max(CANVAS.MIN_SCALE, Math.min(CANVAS.MAX_SCALE, scale * zoomFactor));

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

    // Educational integrity actions
    toggleHideAIResponses: useCallback(() => {
      setHideAIResponses(prev => !prev);
    }, []),

    // Typography & Training actions
    toggleTypographyGuides: useCallback(() => {
      setTypographyGuides(prev => ({ ...prev, enabled: !prev.enabled }));
    }, []),

    updateTypographyGuides: useCallback((guides: Partial<TypographyGuides>) => {
      setTypographyGuides(prev => ({ ...prev, ...guides }));
    }, []),

    startTrainingMode: useCallback((style: 'print' | 'cursive') => {
      // Determine alphabet based on style
      const alphabet = style === 'print'
        ? [...LOWERCASE, ...UPPERCASE, ...NUMBERS]
        : LOWERCASE; // Cursive focuses on lowercase connections

      setTrainingMode({
        active: true,
        currentPrompt: `Write the letter '${alphabet[0]}' (${TRAINING.SAMPLES_PER_CHARACTER} times)`,
        currentCharacter: alphabet[0],
        samplesRequired: TRAINING.SAMPLES_PER_CHARACTER,
        samplesCollected: 0,
        style
      });

      setCurrentPromptIndex(0);
      setTrainingData([]);

      // Auto-enable typography guides
      setTypographyGuides(prev => ({ ...prev, enabled: true }));
    }, []),

    stopTrainingMode: useCallback(() => {
      // Clear any pending timeouts
      if (trainingTimeoutRef.current) {
        clearTimeout(trainingTimeoutRef.current);
        trainingTimeoutRef.current = null;
      }

      setTrainingMode({
        active: false,
        currentPrompt: '',
        currentCharacter: '',
        samplesRequired: TRAINING.SAMPLES_PER_CHARACTER,
        samplesCollected: 0,
        style: 'print'
      });

      setCurrentPromptIndex(0);

      // Optionally disable guides
      setTypographyGuides(prev => ({ ...prev, enabled: false }));
    }, []),

    nextTrainingPrompt: useCallback(() => {
      const alphabet = trainingMode.style === 'print'
        ? [...LOWERCASE, ...UPPERCASE, ...NUMBERS]
        : LOWERCASE;

      const nextIndex = currentPromptIndex + 1;

      if (nextIndex >= alphabet.length) {
        // Training complete!
        setTrainingMode(prev => ({
          ...prev,
          active: false,
          currentPrompt: 'Training complete!',
        }));
        return;
      }

      setCurrentPromptIndex(nextIndex);
      setTrainingMode(prev => ({
        ...prev,
        currentPrompt: `Write the letter '${alphabet[nextIndex]}' (${TRAINING.SAMPLES_PER_CHARACTER} times)`,
        currentCharacter: alphabet[nextIndex],
        samplesCollected: 0
      }));
    }, [trainingMode.style, currentPromptIndex]),

    submitTrainingSample: useCallback((stroke: Stroke) => {
      // Validate and sanitize stroke before submission
      const sanitized = sanitizeStroke(stroke);

      if (!sanitized || !isValidStroke(sanitized)) {
        console.warn('[Training] Invalid stroke submitted, skipping');
        return;
      }

      // Add training metadata to stroke
      const trainedStroke: Stroke = {
        ...sanitized,
        character: trainingMode.currentCharacter,
        strokeOrder: trainingMode.samplesCollected + 1,
        normalized: true // Assume normalized to guides
      };

      setTrainingData(prev => [...prev, trainedStroke]);

      const newSamplesCollected = trainingMode.samplesCollected + 1;
      setTrainingMode(prev => ({
        ...prev,
        samplesCollected: newSamplesCollected
      }));

      // Auto-advance when we have enough samples
      if (newSamplesCollected >= trainingMode.samplesRequired) {
        // Clear any existing timeout to prevent race conditions
        if (trainingTimeoutRef.current) {
          clearTimeout(trainingTimeoutRef.current);
        }

        // Use ref to avoid stale closure - safe reference to actions
        trainingTimeoutRef.current = setTimeout(() => {
          if (actionsRef.current) {
            actionsRef.current.nextTrainingPrompt();
          }
        }, TRAINING.AUTO_ADVANCE_DELAY_MS);
      }
    }, [trainingMode.currentCharacter, trainingMode.samplesCollected, trainingMode.samplesRequired]),

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
      setLassoSelection(null);
      setChatHistory([]);
      setTextOverlays([]);
      setScale(CANVAS.DEFAULT_SCALE);
      setPanX(0);
      setPanY(0);
      setLastAITimestamp(0);
    }, []),

    deleteStrokes: useCallback((indices: number[]) => {
      setDrawings(prev => {
        const newDrawings = prev.filter((_, index) => !indices.includes(index));
        // Update undo stack
        setUndoStack(prevStack => [...prevStack, newDrawings]);
        setRedoStack([]); // Clear redo stack when new action is performed
        return newDrawings;
      });
    }, []),

    getCanvasImageData: useCallback((): ImageData | null => {
      if (!canvasRef.current) return null;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return null;
      return ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    }, [])
  };

  // Update actionsRef whenever actions object changes
  // This allows setTimeout callbacks to always use the latest actions
  useEffect(() => {
    actionsRef.current = actions;
  });

  // Cleanup on unmount - clear any pending timeouts
  useEffect(() => {
    return () => {
      if (trainingTimeoutRef.current) {
        clearTimeout(trainingTimeoutRef.current);
      }
    };
  }, []);

  const state: CanvasState = {
    currentTool,
    notebooks,
    currentNotebookId,
    pages,
    currentPageId,
    drawings,
    currentStroke,
    scale,
    panX,
    panY,
    selectionRect,
    lassoSelection,
    chatHistory,
    textOverlays,
    lastAITimestamp,
    hideAIResponses,
    typographyGuides,
    trainingMode,
    undoStack,
    redoStack
  };

  return [state, actions, canvasRef];
}
