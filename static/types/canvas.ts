/**
 * Canvas and Drawing Type Definitions
 */

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
  timestamp?: number;
}

export interface Drawing {
  strokes: Stroke[];
  timestamp: number;
}

export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportState {
  scale: number;
  panX: number;
  panY: number;
}

export interface CanvasState {
  drawings: Drawing[];
  viewport: ViewportState;
  mode: CanvasMode;
}

export type CanvasMode = 'draw' | 'select' | 'pan' | 'zoom' | 'erase';

export interface UndoStackItem {
  drawings: Drawing[];
}

export interface TouchInfo {
  identifier: number | null;
  isPen: boolean;
  x: number;
  y: number;
}
