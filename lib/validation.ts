// Input validation utilities

import type { Stroke, Point } from './types';
import { CANVAS } from './constants';

/**
 * Validates that a point has valid coordinates
 */
export function isValidPoint(point: unknown): point is Point {
  if (!point || typeof point !== 'object') {
    return false;
  }

  const p = point as Partial<Point>;

  return (
    typeof p.x === 'number' &&
    typeof p.y === 'number' &&
    !isNaN(p.x) &&
    !isNaN(p.y) &&
    isFinite(p.x) &&
    isFinite(p.y) &&
    (p.pressure === undefined || (typeof p.pressure === 'number' && p.pressure >= 0 && p.pressure <= 1))
  );
}

/**
 * Validates that a stroke has all required properties
 */
export function isValidStroke(stroke: unknown): stroke is Stroke {
  if (!stroke || typeof stroke !== 'object') {
    return false;
  }

  const s = stroke as Partial<Stroke>;

  return (
    Array.isArray(s.points) &&
    s.points.length > 0 &&
    s.points.every(isValidPoint) &&
    typeof s.color === 'string' &&
    s.color.length > 0 &&
    typeof s.width === 'number' &&
    s.width > 0 &&
    s.width <= CANVAS.MAX_STROKE_WIDTH
  );
}

/**
 * Sanitizes a stroke, removing invalid points and clamping width
 */
export function sanitizeStroke(stroke: Stroke): Stroke | null {
  if (!stroke || !Array.isArray(stroke.points)) {
    return null;
  }

  // Filter out invalid points
  const validPoints = stroke.points.filter(isValidPoint);

  if (validPoints.length === 0) {
    return null;
  }

  return {
    ...stroke,
    points: validPoints,
    width: Math.max(CANVAS.MIN_STROKE_WIDTH, Math.min(CANVAS.MAX_STROKE_WIDTH, stroke.width)),
    color: stroke.color || CANVAS.DEFAULT_COLOR,
  };
}

/**
 * Validates an email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates password strength
 * Requires: min 6 characters
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

/**
 * Sanitizes a string by removing control characters
 */
export function sanitizeString(input: string, maxLength = 1000): string {
  return input
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates that a number is within a range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
}
