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

// Text overlay (for AI responses on canvas)
export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  color: string;
  timestamp: number;
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

  // Chat/Conversation state
  chatHistory: ChatMessage[];
  textOverlays: TextOverlay[];

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

  // Chat/Conversation actions
  addChatMessage: (message: ChatMessage) => void;
  addTextOverlay: (overlay: TextOverlay) => void;
  removeTextOverlay: (id: string) => void;
  clearTextOverlays: () => void;

  // History actions
  undo: () => void;
  redo: () => void;

  // Utility actions
  clearAll: () => void;
  getCanvasImageData: () => ImageData | null;
}

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isHandwritten?: boolean;
}

export interface TranscriptionResult {
  transcription: string;
  tags: string[];
}
