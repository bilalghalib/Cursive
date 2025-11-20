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
 * Detect if a stroke is a fast circle gesture
 *
 * Criteria:
 * - Completes in < 0.8s
 * - Start and end points within 20px
 * - Path length / diameter ratio > 2.5 (ensures it's circular, not just 2 points)
 * - Average speed > 200px/s
 *
 * Returns:
 * - 'double_circle' if this is the 2nd circle within 1 second (send all to AI)
 * - 'circle' if this is a single fast circle (becomes lasso selection)
 * - 'none' if not a gesture
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

  // Check if stroke is closed (start/end within 20px)
  const distanceToClose = Math.sqrt(
    Math.pow(lastPoint.x - firstPoint.x, 2) +
    Math.pow(lastPoint.y - firstPoint.y, 2)
  );

  if (distanceToClose > 20) {
    return { isGesture: false, gestureType: 'none', confidence: 0 };
  }

  // Calculate total path length
  let pathLength = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    pathLength += Math.sqrt(dx * dx + dy * dy);
  }

  // Calculate bounding box to get diameter
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;
  const diameter = Math.max(width, height);

  // Check path length to diameter ratio (circle should be > 2.5, ideally ~3.14)
  const ratio = diameter > 0 ? pathLength / diameter : 0;
  if (ratio < 2.5) {
    return { isGesture: false, gestureType: 'none', confidence: 0 };
  }

  // Calculate average speed (px/ms)
  const averageSpeed = duration > 0 ? pathLength / duration : 0;

  // Fast circle criteria
  const isFast = duration < 800 && averageSpeed > 0.2; // 0.2 px/ms = 200 px/s

  if (isFast) {
    // Calculate confidence based on how circular and fast it is
    const circularityScore = Math.min(ratio / 3.14, 1); // Ideal circle = π
    const speedScore = Math.min(averageSpeed / 0.5, 1); // Cap at 0.5 px/ms
    const confidence = (circularityScore + speedScore) / 2;

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
        diameter
      }
    };
  }

  return { isGesture: false, gestureType: 'none', confidence: 0 };
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
