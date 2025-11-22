/**
 * Gesture Detection
 *
 * Detects gestures from stroke data, specifically:
 * - Single fast circle (becomes lasso selection)
 * - Double fast circle (send all to AI immediately)
 * - Slow circles (regular drawings)
 */

import type { Point } from './types';

export interface GestureResult {
  isGesture: boolean;
  gestureType: 'circle' | 'double_circle' | 'lasso' | 'none';
  confidence: number; // 0-1
  metadata?: {
    duration?: number;
    averageSpeed?: number;
    diameter?: number;
  };
}

// Store last circle gesture time for double-circle detection
let lastCircleTimestamp: number = 0;
const DOUBLE_CIRCLE_WINDOW_MS = 1000; // 1 second window

/**
 * Detect if a stroke is a fast circle gesture using directional changes
 *
 * New approach: Track directional changes instead of perfect circle shape
 * - Divide circle into 8 sectors (N, NE, E, SE, S, SW, W, NW)
 * - Check if we visit at least 6 different sectors in sequence
 * - Must complete in < 1 second
 * - Must be closed (start/end within 30px)
 * - Fast enough (average speed > 150px/s)
 *
 * This is more permissive than the old "perfect shape" approach
 */
export function detectCircleGesture(points: Point[]): GestureResult {
  if (points.length < 10) {
    return { isGesture: false, gestureType: 'none', confidence: 0 };
  }

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const startTime = (firstPoint as any).timestamp || 0;
  const endTime = (lastPoint as any).timestamp || Date.now();

  const duration = endTime - startTime;

  // Check if stroke is closed (start/end within 30px - more permissive)
  const distanceToClose = Math.sqrt(
    Math.pow(lastPoint.x - firstPoint.x, 2) +
    Math.pow(lastPoint.y - firstPoint.y, 2)
  );

  if (distanceToClose > 30) {
    return { isGesture: false, gestureType: 'none', confidence: 0 };
  }

  // Calculate total path length
  let pathLength = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    pathLength += Math.sqrt(dx * dx + dy * dy);
  }

  // Calculate average speed (px/ms)
  const averageSpeed = duration > 0 ? pathLength / duration : 0;

  // Must be fast enough (0.15 px/ms = 150 px/s, more permissive)
  if (duration > 1000 || averageSpeed < 0.15) {
    return { isGesture: false, gestureType: 'none', confidence: 0 };
  }

  // Calculate center of the path
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

  // Track which sectors (octants) we've visited
  // 0=E, 1=NE, 2=N, 3=NW, 4=W, 5=SW, 6=S, 7=SE
  const visitedSectors = new Set<number>();
  const sectorSequence: number[] = [];

  points.forEach(point => {
    const dx = point.x - centerX;
    const dy = point.y - centerY;

    // Calculate angle in radians (-π to π)
    const angle = Math.atan2(dy, dx);

    // Convert to sector (0-7)
    // Divide circle into 8 equal parts
    const sector = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 8) % 8;

    visitedSectors.add(sector);
    if (sectorSequence.length === 0 || sectorSequence[sectorSequence.length - 1] !== sector) {
      sectorSequence.push(sector);
    }
  });

  // Check if we visited enough sectors (at least 6 out of 8 = 3/4 of circle)
  const sectorsVisited = visitedSectors.size;
  if (sectorsVisited < 6) {
    return { isGesture: false, gestureType: 'none', confidence: 0 };
  }

  // Check if sectors are in a roughly circular order
  // Look for transitions that go around the circle
  let circularTransitions = 0;
  for (let i = 1; i < sectorSequence.length; i++) {
    const prev = sectorSequence[i - 1];
    const curr = sectorSequence[i];

    // Check if we moved to an adjacent sector (wrapping around)
    const diff = (curr - prev + 8) % 8;
    if (diff === 1 || diff === 7) { // Moving forward or backward by 1
      circularTransitions++;
    }
  }

  // Should have mostly circular transitions
  const transitionRatio = sectorSequence.length > 0 ? circularTransitions / sectorSequence.length : 0;
  if (transitionRatio < 0.5) {
    return { isGesture: false, gestureType: 'none', confidence: 0 };
  }

  // Calculate confidence based on:
  // - How many sectors visited (more = better)
  // - How circular the transitions are (more circular = better)
  // - Speed (faster = more intentional)
  const sectorScore = Math.min(sectorsVisited / 8, 1);
  const transitionScore = transitionRatio;
  const speedScore = Math.min(averageSpeed / 0.3, 1);
  const confidence = (sectorScore + transitionScore + speedScore) / 3;

  // Check if this is a double circle (2nd circle within 1 second)
  const now = Date.now();
  const timeSinceLastCircle = now - lastCircleTimestamp;
  const isDoubleCircle = timeSinceLastCircle < DOUBLE_CIRCLE_WINDOW_MS;

  // Update last circle timestamp
  lastCircleTimestamp = now;

  return {
    isGesture: true,
    gestureType: isDoubleCircle ? 'double_circle' : 'circle',
    confidence,
    metadata: {
      duration,
      averageSpeed,
      diameter: Math.max(...xs) - Math.min(...xs)
    }
  };
}

/**
 * Calculate circularity of a closed path
 * Returns 0-1, where 1 is a perfect circle
 */
export function calculateCircularity(points: Point[]): number {
  if (points.length < 4) return 0;

  // Calculate center of mass
  const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  // Calculate distances from center
  const distances = points.map(p =>
    Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2))
  );

  // Calculate variance of distances (perfect circle has 0 variance)
  const meanDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
  const variance = distances.reduce((sum, d) => sum + Math.pow(d - meanDistance, 2), 0) / distances.length;
  const stdDev = Math.sqrt(variance);

  // Circularity: low standard deviation relative to mean = more circular
  const circularity = 1 - Math.min(stdDev / meanDistance, 1);

  return circularity;
}

/**
 * Add timestamps to points if they don't have them
 */
export function addTimestamps(points: Point[]): Point[] {
  const now = Date.now();
  return points.map((p, i) => ({
    ...p,
    timestamp: (p as any).timestamp || now + i
  }));
}

/**
 * Reset double-circle detection state
 * (useful when user cancels gesture or for testing)
 */
export function resetCircleDetection(): void {
  lastCircleTimestamp = 0;
}
