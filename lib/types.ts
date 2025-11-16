// Shared TypeScript types for Cursive

export interface Point {
  x: number;
  y: number;
  pressure?: number; // For pressure sensitivity
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
  timestamp?: number;
}

export type Tool = 'draw' | 'select' | 'pan' | 'zoom';

export interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface CanvasState {
  // Tool state
  currentTool: Tool;

  // Drawing state
  drawings: Stroke[];
  currentStroke: Point[];

  // Transform state
  scale: number;
  panX: number;
  panY: number;

  // Selection state
  selectionRect: SelectionRect | null;

  // History
  undoStack: Stroke[][];
  redoStack: Stroke[][];
}

export interface CanvasActions {
  // Tool actions
  setTool: (tool: Tool) => void;

  // Drawing actions
  startDrawing: (point: Point) => void;
  continueDrawing: (point: Point) => void;
  finishDrawing: () => void;

  // Selection actions
  startSelection: (x: number, y: number) => void;
  updateSelection: (x: number, y: number) => void;
  finishSelection: () => ImageData | null;
  clearSelection: () => void;

  // Pan actions
  startPan: (x: number, y: number) => void;
  updatePan: (x: number, y: number) => void;
  finishPan: () => void;

  // Zoom actions
  zoom: (delta: number, centerX: number, centerY: number) => void;

  // History actions
  undo: () => void;
  redo: () => void;

  // Utility actions
  clearAll: () => void;
  getCanvasImageData: () => ImageData | null;
}
