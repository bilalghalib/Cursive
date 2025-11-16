/**
 * Smart Canvas Positioning
 * Determines where AI should write responses based on context
 */

import type { Stroke, Point } from './types';

export interface Position {
  x: number;
  y: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/**
 * Calculate bounding box for a stroke
 */
export function getStrokeBounds(stroke: Stroke): Bounds {
  if (!stroke.points || stroke.points.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
      centerX: 0,
      centerY: 0
    };
  }

  const xs = stroke.points.map(p => p.x);
  const ys = stroke.points.map(p => p.y);

  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  };
}

/**
 * Calculate bounding box for multiple strokes
 */
export function getMultiStrokeBounds(strokes: Stroke[]): Bounds | null {
  if (strokes.length === 0) return null;

  const bounds = strokes.map(getStrokeBounds);

  const minX = Math.min(...bounds.map(b => b.minX));
  const minY = Math.min(...bounds.map(b => b.minY));
  const maxX = Math.max(...bounds.map(b => b.maxX));
  const maxY = Math.max(...bounds.map(b => b.maxY));

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  };
}

/**
 * Smart positioning algorithm
 *
 * Priority:
 * 1. Below last selection (if exists)
 * 2. Below last AI response (if exists)
 * 3. Below bottom-most drawing
 * 4. Default: top-left (50, 50)
 *
 * @param allDrawings - All strokes on canvas
 * @param lastSelection - Bounds of last user selection
 * @param lastAIResponse - Bounds of last AI response
 * @param canvasWidth - Canvas width for boundary checking
 * @param canvasHeight - Canvas height for boundary checking
 * @param margin - Vertical margin between elements (default 40px)
 * @returns Position where AI should start writing
 */
export function calculateSmartPosition(
  allDrawings: Stroke[],
  lastSelection: Bounds | null,
  lastAIResponse: Bounds | null,
  canvasWidth: number,
  canvasHeight: number,
  margin: number = 40
): Position {
  // Priority 1: Below last selection
  if (lastSelection) {
    const x = lastSelection.minX;
    const y = lastSelection.maxY + margin;

    // Ensure within canvas bounds
    if (y < canvasHeight - 100) {
      return { x, y };
    }
  }

  // Priority 2: Below last AI response
  if (lastAIResponse) {
    const x = lastAIResponse.minX;
    const y = lastAIResponse.maxY + margin;

    if (y < canvasHeight - 100) {
      return { x, y };
    }
  }

  // Priority 3: Below bottom-most drawing
  if (allDrawings.length > 0) {
    let maxY = 0;
    let correspondingX = 50;

    for (const drawing of allDrawings) {
      const bounds = getStrokeBounds(drawing);

      if (bounds.maxY > maxY) {
        maxY = bounds.maxY;
        correspondingX = bounds.minX;
      }
    }

    const y = maxY + margin;

    if (y < canvasHeight - 100) {
      return { x: correspondingX, y };
    }
  }

  // Priority 4: Default top-left
  return { x: 50, y: 50 };
}

/**
 * Check if a position would cause overlap with existing content
 *
 * @param position - Position to check
 * @param width - Width of content to place
 * @param height - Height of content to place
 * @param existingBounds - Array of existing content bounds
 * @param padding - Minimum padding around content
 * @returns true if position is clear, false if would overlap
 */
export function isPositionClear(
  position: Position,
  width: number,
  height: number,
  existingBounds: Bounds[],
  padding: number = 20
): boolean {
  const newBounds: Bounds = {
    minX: position.x - padding,
    minY: position.y - padding,
    maxX: position.x + width + padding,
    maxY: position.y + height + padding,
    width: width + padding * 2,
    height: height + padding * 2,
    centerX: position.x + width / 2,
    centerY: position.y + height / 2
  };

  // Check for overlap with each existing bounds
  for (const bounds of existingBounds) {
    if (boundsOverlap(newBounds, bounds)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if two bounds overlap
 */
function boundsOverlap(a: Bounds, b: Bounds): boolean {
  return !(
    a.maxX < b.minX || // a is left of b
    a.minX > b.maxX || // a is right of b
    a.maxY < b.minY || // a is above b
    a.minY > b.maxY    // a is below b
  );
}

/**
 * Find the next available position in a grid pattern
 * Useful when smart positioning fails (e.g., canvas is full)
 *
 * @param canvasWidth - Canvas width
 * @param canvasHeight - Canvas height
 * @param cellWidth - Grid cell width
 * @param cellHeight - Grid cell height
 * @param existingBounds - Existing content to avoid
 * @returns First available grid position, or null if canvas is full
 */
export function findGridPosition(
  canvasWidth: number,
  canvasHeight: number,
  cellWidth: number,
  cellHeight: number,
  existingBounds: Bounds[]
): Position | null {
  const cols = Math.floor(canvasWidth / cellWidth);
  const rows = Math.floor(canvasHeight / cellHeight);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cellWidth + 20;
      const y = row * cellHeight + 20;

      if (isPositionClear({ x, y }, cellWidth - 40, cellHeight - 40, existingBounds)) {
        return { x, y };
      }
    }
  }

  return null; // Canvas is full
}

/**
 * Calculate position for multi-line text
 * Returns starting position and line height for flowing text
 *
 * @param text - Text to position
 * @param maxWidth - Maximum line width
 * @param fontSize - Font size
 * @param lineHeight - Line height multiplier (default 1.5)
 * @param startPosition - Starting position
 * @returns Array of positions for each line
 */
export function calculateMultiLinePositions(
  text: string,
  maxWidth: number,
  fontSize: number,
  lineHeight: number = 1.5,
  startPosition: Position
): Position[] {
  // Simple word-wrap algorithm
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  // Rough estimate: each character is ~0.6 * fontSize wide
  const charWidth = fontSize * 0.6;

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = testLine.length * charWidth;

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  // Calculate positions for each line
  const positions: Position[] = [];
  const lineSpacing = fontSize * lineHeight;

  for (let i = 0; i < lines.length; i++) {
    positions.push({
      x: startPosition.x,
      y: startPosition.y + i * lineSpacing
    });
  }

  return positions;
}

/**
 * Adjust position to stay within canvas bounds
 */
export function clampToCanvas(
  position: Position,
  contentWidth: number,
  contentHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  margin: number = 20
): Position {
  return {
    x: Math.max(margin, Math.min(position.x, canvasWidth - contentWidth - margin)),
    y: Math.max(margin, Math.min(position.y, canvasHeight - contentHeight - margin))
  };
}
