/**
 * Connection Point Utilities
 * Calculates entry/exit points for cursive handwriting connections
 */

import type { Point, ConnectionPoint, Stroke } from './types';

/**
 * Calculate the angle between two points (in degrees)
 */
function calculateAngle(from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const radians = Math.atan2(dy, dx);
  return radians * (180 / Math.PI);
}

/**
 * Get the entry point (start) of a stroke with angle and pressure
 */
export function calculateEntryPoint(stroke: Stroke): ConnectionPoint | null {
  if (stroke.points.length < 2) return null;

  const startPoint = stroke.points[0];
  const nextPoint = stroke.points[1];

  return {
    x: startPoint.x,
    y: startPoint.y,
    angle: calculateAngle(startPoint, nextPoint),
    pressure: startPoint.pressure || 0.5
  };
}

/**
 * Get the exit point (end) of a stroke with angle and pressure
 */
export function calculateExitPoint(stroke: Stroke): ConnectionPoint | null {
  if (stroke.points.length < 2) return null;

  const endPoint = stroke.points[stroke.points.length - 1];
  const prevPoint = stroke.points[stroke.points.length - 2];

  return {
    x: endPoint.x,
    y: endPoint.y,
    angle: calculateAngle(prevPoint, endPoint),
    pressure: endPoint.pressure || 0.5
  };
}

/**
 * Enhance a stroke with entry/exit connection points
 */
export function addConnectionPoints(stroke: Stroke): Stroke {
  const entryPoint = calculateEntryPoint(stroke);
  const exitPoint = calculateExitPoint(stroke);

  return {
    ...stroke,
    entryPoint: entryPoint || undefined,
    exitPoint: exitPoint || undefined
  };
}

/**
 * Check if two strokes can connect smoothly based on their connection points
 *
 * @param from - The stroke to connect from (must have exitPoint)
 * @param to - The stroke to connect to (must have entryPoint)
 * @param maxDistance - Maximum distance between connection points (default: 50px)
 * @param maxAngleDiff - Maximum angle difference in degrees (default: 45°)
 * @returns true if the strokes can connect smoothly
 */
export function canConnect(
  from: Stroke,
  to: Stroke,
  maxDistance: number = 50,
  maxAngleDiff: number = 45
): boolean {
  if (!from.exitPoint || !to.entryPoint) return false;

  // Check distance
  const dx = to.entryPoint.x - from.exitPoint.x;
  const dy = to.entryPoint.y - from.exitPoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > maxDistance) return false;

  // Check angle similarity (for smooth flow)
  const angleDiff = Math.abs(from.exitPoint.angle - to.entryPoint.angle);
  const normalizedAngleDiff = Math.min(angleDiff, 360 - angleDiff);

  return normalizedAngleDiff <= maxAngleDiff;
}

/**
 * Generate a connecting stroke between two characters
 *
 * @param from - The stroke to connect from
 * @param to - The stroke to connect to
 * @returns A new stroke that smoothly connects the two
 */
export function createConnector(from: Stroke, to: Stroke): Stroke | null {
  if (!from.exitPoint || !to.entryPoint) return null;

  // Create a smooth bezier curve between exit and entry points
  const points: Point[] = [];

  const startX = from.exitPoint.x;
  const startY = from.exitPoint.y;
  const endX = to.entryPoint.x;
  const endY = to.entryPoint.y;

  // Control points for bezier curve (based on exit/entry angles)
  const startAngleRad = from.exitPoint.angle * (Math.PI / 180);
  const endAngleRad = to.entryPoint.angle * (Math.PI / 180);

  const controlDistance = 20; // Distance of control points

  const cp1x = startX + Math.cos(startAngleRad) * controlDistance;
  const cp1y = startY + Math.sin(startAngleRad) * controlDistance;

  const cp2x = endX - Math.cos(endAngleRad) * controlDistance;
  const cp2y = endY - Math.sin(endAngleRad) * controlDistance;

  // Sample points along the bezier curve
  const numPoints = 10;
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;

    // Cubic bezier formula
    const x = Math.pow(1 - t, 3) * startX +
              3 * Math.pow(1 - t, 2) * t * cp1x +
              3 * (1 - t) * Math.pow(t, 2) * cp2x +
              Math.pow(t, 3) * endX;

    const y = Math.pow(1 - t, 3) * startY +
              3 * Math.pow(1 - t, 2) * t * cp1y +
              3 * (1 - t) * Math.pow(t, 2) * cp2y +
              Math.pow(t, 3) * endY;

    // Interpolate pressure
    const pressure = from.exitPoint.pressure * (1 - t) + to.entryPoint.pressure * t;

    points.push({ x, y, pressure });
  }

  return {
    points,
    color: from.color,
    width: from.width * 0.7, // Slightly thinner for connectors
    timestamp: Date.now(),
    character: '~connector~',
    connectedTo: to.character
  };
}

/**
 * Analyze a ligature stroke to identify where individual characters connect
 *
 * @param stroke - A ligature stroke (e.g., "tt", "ff")
 * @returns Array of connection points within the ligature
 */
export function findLigatureConnectionPoints(stroke: Stroke): ConnectionPoint[] {
  if (!stroke.isLigature || stroke.points.length < 10) return [];

  const connectionPoints: ConnectionPoint[] = [];

  // Look for sharp direction changes (potential character boundaries)
  for (let i = 5; i < stroke.points.length - 5; i++) {
    const prevAngle = calculateAngle(stroke.points[i - 2], stroke.points[i - 1]);
    const currAngle = calculateAngle(stroke.points[i - 1], stroke.points[i]);
    const nextAngle = calculateAngle(stroke.points[i], stroke.points[i + 1]);

    // If there's a significant change in direction, it might be a connection point
    const angleDiff1 = Math.abs(currAngle - prevAngle);
    const angleDiff2 = Math.abs(nextAngle - currAngle);

    if (angleDiff1 > 30 || angleDiff2 > 30) {
      const point = stroke.points[i];
      connectionPoints.push({
        x: point.x,
        y: point.y,
        angle: currAngle,
        pressure: point.pressure || 0.5
      });
    }
  }

  return connectionPoints;
}

/**
 * Calculate the center of mass for a stroke (useful for positioning)
 */
export function calculateStrokeCenter(stroke: Stroke): Point {
  if (stroke.points.length === 0) {
    return { x: 0, y: 0 };
  }

  const sum = stroke.points.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y
    }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / stroke.points.length,
    y: sum.y / stroke.points.length
  };
}

/**
 * Normalize connection angles to a preferred range
 * Cursive handwriting typically has exit angles between -10° and 30°
 */
export function normalizeCursiveAngle(angle: number): number {
  // Normalize to -180 to 180 range
  let normalized = angle % 360;
  if (normalized > 180) normalized -= 360;
  if (normalized < -180) normalized += 360;

  // Clamp to typical cursive range
  return Math.max(-10, Math.min(30, normalized));
}
