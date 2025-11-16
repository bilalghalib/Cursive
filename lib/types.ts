// Shared TypeScript types for Cursive

export interface Point {
  x: number;
  y: number;
  pressure?: number; // For pressure sensitivity
}

export interface ConnectionPoint {
  x: number;
  y: number;
  angle: number;    // Exit/entry angle in degrees (for smooth connections)
  pressure: number; // Pressure at connection point
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
  timestamp?: number;
  // Training metadata (optional)
  character?: string;        // What letter/character is this?
  strokeOrder?: number;      // Which stroke in the character (1st, 2nd, etc.)
  position?: 'start' | 'middle' | 'end';  // Position in word
  connectedTo?: string;      // Next character if cursive
  normalized?: boolean;      // Has this been normalized to guides?

  // Connection points for cursive flow (V2)
  entryPoint?: ConnectionPoint;  // Where the letter starts (for connecting FROM previous)
  exitPoint?: ConnectionPoint;   // Where the letter ends (for connecting TO next)
  isLigature?: boolean;          // True if this is a multi-character ligature (e.g., "tt")

  // Training phase metadata (V2)
  phase?: string;            // Which training phase: 'cursiveLower', 'ligatures', etc.
  variation?: number;        // Which variation (1, 2, or 3)

  // AI-generated metadata (V2)
  isAIGenerated?: boolean;   // True if synthesized by AI (for undo/styling)
  aiMessageId?: string;      // Link to the AI message that generated this
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

// Typography guides (for handwriting training)
export interface TypographyGuides {
  enabled: boolean;
  baseline: number;        // Y-coordinate where letters sit
  xHeight: number;         // Height of lowercase letters (e.g., 'x')
  capHeight: number;       // Height of capital letters
  ascender: number;        // Top line (for b, d, h, k, l, t)
  descender: number;       // Bottom line (for g, j, p, q, y)
  color: string;          // Color of guide lines
  opacity: number;        // 0-1, how visible the guides are
}

// Training mode state
export interface TrainingMode {
  active: boolean;
  currentPrompt: string;   // "Write the letter 'a'"
  currentCharacter: string; // 'a'
  samplesRequired: number;  // How many samples to collect
  samplesCollected: number; // How many we have so far
  style: 'print' | 'cursive'; // Writing style
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

  // Training mode
  typographyGuides: TypographyGuides;
  trainingMode: TrainingMode;

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

  // AI Handwriting actions (V2)
  addAIStrokes: (strokes: Stroke[], messageId: string) => void;
  undoLastAIResponse: () => void;

  // Typography & Training actions
  toggleTypographyGuides: () => void;
  updateTypographyGuides: (guides: Partial<TypographyGuides>) => void;
  startTrainingMode: (style: 'print' | 'cursive') => void;
  stopTrainingMode: () => void;
  nextTrainingPrompt: () => void;
  submitTrainingSample: (stroke: Stroke) => void;

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
  // AI response style metadata (V2)
  styleMetadata?: AIStyleMetadata;
}

// AI response with style/quality metadata
export interface AIStyleMetadata {
  mood?: 'excited' | 'calm' | 'formal' | 'casual' | 'urgent' | 'thoughtful';
  confidence?: number;      // 0-1: How confident is the mood detection?
  customParams?: {          // Custom handwriting parameters
    jitter?: number;        // 0-1: Random variation
    slant?: number;         // -0.5 to 0.5: Character slant
    messiness?: number;     // 0-1: Overall messiness
    speed?: number;         // 0-1: Writing speed (affects smoothness)
  };
  description?: string;     // Human-readable: "enthusiastic and energetic"
}

// Structured AI response format
export interface StructuredAIResponse {
  text: string;
  style?: AIStyleMetadata;
}

export interface TranscriptionResult {
  transcription: string;
  tags: string[];
}
