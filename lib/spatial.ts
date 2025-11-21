/**
 * Spatial utilities for calculating bounding boxes and AI response positioning
 */

import type { Point, Stroke, BoundingBox, SpatialContext, TextOverlay } from './types';

// A4 dimensions in pixels at 96 DPI
export const A4_DIMENSIONS = {
  width: 794,
  height: 1123,
  aspectRatio: 1.414 // √2
} as const;

// Letter dimensions in pixels at 96 DPI
export const LETTER_DIMENSIONS = {
  width: 816,
  height: 1056,
  aspectRatio: 1.294
} as const;

/**
 * Calculate bounding box for a set of points
 */
export function calculatePointsBounds(points: Point[]): BoundingBox {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Calculate bounding box for a stroke
 */
export function calculateStrokeBounds(stroke: Stroke): BoundingBox {
  const bounds = calculatePointsBounds(stroke.points);
  return {
    ...bounds,
    type: stroke.isAI ? 'ai_response' : 'student_stroke'
  };
}

/**
 * Calculate bounding box for multiple strokes
 */
export function calculateStrokesBounds(strokes: Stroke[]): BoundingBox {
  if (strokes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const allPoints = strokes.flatMap(s => s.points);
  return calculatePointsBounds(allPoints);
}

/**
 * Calculate bounding box for a text overlay
 */
export function calculateTextOverlayBounds(overlay: TextOverlay): BoundingBox {
  // Estimate height based on font size (rough approximation)
  const lines = overlay.text.split('\n').length;
  const lineHeight = overlay.fontSize * 1.4; // Typical line height
  const estimatedHeight = lines * lineHeight;

  return {
    x: overlay.x,
    y: overlay.y,
    width: overlay.width,
    height: estimatedHeight,
    type: overlay.isAI ? 'ai_response' : 'student_stroke'
  };
}

/**
 * Check if a point is inside a bounding box
 */
export function pointInBounds(point: Point, bounds: BoundingBox): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

/**
 * Check if a stroke intersects with a bounding box (lasso selection)
 */
export function strokeIntersectsBounds(stroke: Stroke, bounds: BoundingBox): boolean {
  // Simple check: if any point of the stroke is inside the bounds
  return stroke.points.some(point => pointInBounds(point, bounds));
}

/**
 * Check if two bounding boxes overlap
 */
export function boundsOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

/**
 * Calculate spatial context for AI response positioning
 *
 * This tells the AI:
 * - Page size (A4 dimensions)
 * - Selection bounds (what user circled/lassoed)
 * - All occupied rectangles (existing strokes and AI responses)
 * - Suggested position for AI response (below selection, avoiding collisions)
 *
 * Philosophy: "Write below naturally" - AI responses appear below the related content,
 * never in margins unless student wrote there. Respects page boundaries.
 */
export function calculateSpatialContext(
  selectionBounds: BoundingBox,
  strokes: Stroke[],
  textOverlays: TextOverlay[],
  pageWidth: number = A4_DIMENSIONS.width,
  pageHeight: number = A4_DIMENSIONS.height
): SpatialContext {
  // Page margins (AI should stay within these bounds)
  const PAGE_MARGIN_TOP = 50;
  const PAGE_MARGIN_BOTTOM = 50;
  const PAGE_MARGIN_LEFT = 50;
  const PAGE_MARGIN_RIGHT = 50;

  const MIN_SPACING_BELOW_SELECTION = 30; // Space between selection and AI response
  const MIN_SPACE_NEEDED = 100; // Minimum space needed to fit a response

  // Calculate bounding boxes for all existing content
  const strokeBounds = strokes.map(calculateStrokeBounds);
  const overlayBounds = textOverlays.map(calculateTextOverlayBounds);
  const occupiedRectangles = [...strokeBounds, ...overlayBounds];

  // Find the lowest point of the selection
  const selectionBottom = selectionBounds.y + selectionBounds.height;

  // Find all content below the selection
  const contentBelow = occupiedRectangles.filter(
    rect => rect.y > selectionBottom
  );

  // Calculate suggested response Y position (below selection with padding)
  let suggestedResponseY = selectionBottom + MIN_SPACING_BELOW_SELECTION;

  // Check if there's content blocking the suggested position
  if (contentBelow.length > 0) {
    const nearestContentY = Math.min(...contentBelow.map(rect => rect.y));
    const availableSpace = nearestContentY - selectionBottom;

    if (availableSpace < MIN_SPACE_NEEDED) {
      // Not enough space between selection and next content
      // Find the lowest content and suggest below it
      const lowestContentBottom = Math.max(
        ...occupiedRectangles.map(rect => rect.y + rect.height)
      );
      suggestedResponseY = lowestContentBottom + MIN_SPACING_BELOW_SELECTION;
    }
  }

  // Ensure suggested position stays within page margins
  // If too close to bottom, it will be handled by canvas rendering (scroll or new page)
  const maxAllowedY = pageHeight - PAGE_MARGIN_BOTTOM - MIN_SPACE_NEEDED;
  if (suggestedResponseY > maxAllowedY) {
    // Response would be too close to page bottom
    // Either suggest at margin or indicate need for new page
    suggestedResponseY = Math.min(suggestedResponseY, maxAllowedY);
  }

  // Calculate available space below selection (before hitting other content or page bottom)
  const nextContentY = contentBelow.length > 0
    ? Math.min(...contentBelow.map(rect => rect.y))
    : pageHeight - PAGE_MARGIN_BOTTOM;

  const availableSpaceBelow = Math.max(0, nextContentY - suggestedResponseY);

  return {
    pageSize: {
      width: pageWidth,
      height: pageHeight
    },
    selectionBounds,
    occupiedRectangles,
    suggestedResponseY,
    availableSpaceBelow
  };
}

/**
 * Check if a lasso path is closed (forms a loop)
 */
export function isLassoClosed(path: Point[], threshold: number = 30): boolean {
  if (path.length < 3) return false;

  const first = path[0];
  const last = path[path.length - 1];

  const distance = Math.sqrt(
    Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2)
  );

  return distance <= threshold;
}

/**
 * Find strokes that are completely inside a closed lasso path
 * Uses simplified point-in-polygon algorithm
 *
 * For circle gestures: Finds strokes where the CENTER of their bounding box
 * is inside the circle path
 */
export function findStrokesInLasso(
  strokes: Stroke[],
  lassoPath: Point[]
): number[] {
  if (!isLassoClosed(lassoPath)) return [];

  const selectedIndices: number[] = [];

  strokes.forEach((stroke, index) => {
    // Check if stroke's bounding box center is inside lasso
    const bounds = calculateStrokeBounds(stroke);
    const center = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };

    if (pointInPolygon(center, lassoPath)) {
      selectedIndices.push(index);
    }
  });

  return selectedIndices;
}

/**
 * Find strokes inside a circular path
 * More efficient than generic polygon test for circles
 *
 * This is the primary function for circle gesture selection:
 * "Draw a circle around content → selects what's inside"
 */
export function findStrokesInCircle(
  strokes: Stroke[],
  circlePath: Point[]
): number[] {
  if (circlePath.length < 3) return [];

  // Calculate circle center and radius from path
  const xs = circlePath.map(p => p.x);
  const ys = circlePath.map(p => p.y);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

  // Calculate average distance from center to path points (approximate radius)
  const distances = circlePath.map(p =>
    Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2))
  );
  const radius = distances.reduce((sum, d) => sum + d, 0) / distances.length;

  const selectedIndices: number[] = [];

  strokes.forEach((stroke, index) => {
    // Check if stroke's bounding box center is inside circle
    const bounds = calculateStrokeBounds(stroke);
    const strokeCenterX = bounds.x + bounds.width / 2;
    const strokeCenterY = bounds.y + bounds.height / 2;

    const distanceFromCenter = Math.sqrt(
      Math.pow(strokeCenterX - centerX, 2) +
      Math.pow(strokeCenterY - centerY, 2)
    );

    if (distanceFromCenter <= radius) {
      selectedIndices.push(index);
    }
  });

  return selectedIndices;
}

/**
 * Point-in-polygon test using ray casting algorithm
 */
function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}
