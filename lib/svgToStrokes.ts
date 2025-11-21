/**
 * SVG Path to Stroke Conversion
 * Converts SVG handwriting paths to realistic stroke arrays
 *
 * This allows AI responses to be rendered as actual strokes (not SVG images),
 * aligning with Value #1: "Handwriting as Human Experience"
 */

import { Point, Stroke } from './types';
import { simulateHandwriting, HandwritingOptions } from './handwriting';

/**
 * Parses an SVG path string and converts it to a sequence of points
 */
function parseSVGPath(pathData: string): Point[] {
  const points: Point[] = [];

  // Remove extra whitespace and normalize
  const normalized = pathData.trim().replace(/\s+/g, ' ');

  // Split into command segments
  const commands = normalized.split(/(?=[MmLlHhVvCcSsQqTtAaZz])/);

  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;

  commands.forEach(cmd => {
    if (!cmd.trim()) return;

    const command = cmd[0];
    const args = cmd.slice(1).trim().split(/[\s,]+/).map(parseFloat);

    switch (command) {
      case 'M': // Move to (absolute)
        currentX = args[0];
        currentY = args[1];
        startX = currentX;
        startY = currentY;
        points.push({ x: currentX, y: currentY, pressure: 0.3 });
        break;

      case 'm': // Move to (relative)
        currentX += args[0];
        currentY += args[1];
        startX = currentX;
        startY = currentY;
        points.push({ x: currentX, y: currentY, pressure: 0.3 });
        break;

      case 'L': // Line to (absolute)
        for (let i = 0; i < args.length; i += 2) {
          currentX = args[i];
          currentY = args[i + 1];
          points.push({ x: currentX, y: currentY, pressure: 0.5 });
        }
        break;

      case 'l': // Line to (relative)
        for (let i = 0; i < args.length; i += 2) {
          currentX += args[i];
          currentY += args[i + 1];
          points.push({ x: currentX, y: currentY, pressure: 0.5 });
        }
        break;

      case 'H': // Horizontal line (absolute)
        currentX = args[0];
        points.push({ x: currentX, y: currentY, pressure: 0.5 });
        break;

      case 'h': // Horizontal line (relative)
        currentX += args[0];
        points.push({ x: currentX, y: currentY, pressure: 0.5 });
        break;

      case 'V': // Vertical line (absolute)
        currentY = args[0];
        points.push({ x: currentX, y: currentY, pressure: 0.5 });
        break;

      case 'v': // Vertical line (relative)
        currentY += args[0];
        points.push({ x: currentX, y: currentY, pressure: 0.5 });
        break;

      case 'Q': // Quadratic Bezier (absolute)
      case 'q': { // Quadratic Bezier (relative)
        const isAbsolute = command === 'Q';
        for (let i = 0; i < args.length; i += 4) {
          const cp1x = isAbsolute ? args[i] : currentX + args[i];
          const cp1y = isAbsolute ? args[i + 1] : currentY + args[i + 1];
          const endX = isAbsolute ? args[i + 2] : currentX + args[i + 2];
          const endY = isAbsolute ? args[i + 3] : currentY + args[i + 3];

          // Interpolate curve into points
          const steps = 10;
          for (let t = 1; t <= steps; t++) {
            const ratio = t / steps;
            const x = Math.pow(1 - ratio, 2) * currentX +
                     2 * (1 - ratio) * ratio * cp1x +
                     Math.pow(ratio, 2) * endX;
            const y = Math.pow(1 - ratio, 2) * currentY +
                     2 * (1 - ratio) * ratio * cp1y +
                     Math.pow(ratio, 2) * endY;

            // Vary pressure along curve (middle = higher pressure)
            const pressure = 0.3 + 0.4 * Math.sin(ratio * Math.PI);
            points.push({ x, y, pressure });
          }

          currentX = endX;
          currentY = endY;
        }
        break;
      }

      case 'C': // Cubic Bezier (absolute)
      case 'c': { // Cubic Bezier (relative)
        const isAbsolute = command === 'C';
        for (let i = 0; i < args.length; i += 6) {
          const cp1x = isAbsolute ? args[i] : currentX + args[i];
          const cp1y = isAbsolute ? args[i + 1] : currentY + args[i + 1];
          const cp2x = isAbsolute ? args[i + 2] : currentX + args[i + 2];
          const cp2y = isAbsolute ? args[i + 3] : currentY + args[i + 3];
          const endX = isAbsolute ? args[i + 4] : currentX + args[i + 4];
          const endY = isAbsolute ? args[i + 5] : currentY + args[i + 5];

          // Interpolate curve into points
          const steps = 15;
          for (let t = 1; t <= steps; t++) {
            const ratio = t / steps;
            const x = Math.pow(1 - ratio, 3) * currentX +
                     3 * Math.pow(1 - ratio, 2) * ratio * cp1x +
                     3 * (1 - ratio) * Math.pow(ratio, 2) * cp2x +
                     Math.pow(ratio, 3) * endX;
            const y = Math.pow(1 - ratio, 3) * currentY +
                     3 * Math.pow(1 - ratio, 2) * ratio * cp1y +
                     3 * (1 - ratio) * Math.pow(ratio, 2) * cp2y +
                     Math.pow(ratio, 3) * endY;

            // Vary pressure along curve
            const pressure = 0.3 + 0.4 * Math.sin(ratio * Math.PI);
            points.push({ x, y, pressure });
          }

          currentX = endX;
          currentY = endY;
        }
        break;
      }

      case 'Z': // Close path
      case 'z':
        if (startX !== currentX || startY !== currentY) {
          points.push({ x: startX, y: startY, pressure: 0.3 });
          currentX = startX;
          currentY = currentY;
        }
        break;
    }
  });

  return points;
}

/**
 * Adds realistic variation to stroke points
 * - Pressure variation (simulate pen pressure changes)
 * - Timing variation (simulate natural writing speed)
 * - Spatial jitter (imperfection)
 */
function addRealisticVariation(points: Point[], jitter: number = 0.3): Point[] {
  const baseTime = Date.now();

  return points.map((point, i) => {
    // Add spatial jitter
    const jitterX = (Math.random() - 0.5) * jitter;
    const jitterY = (Math.random() - 0.5) * jitter;

    // Vary pressure naturally (middle of stroke = more pressure)
    const progress = i / (points.length - 1);
    const basePressure = point.pressure || 0.5;
    const pressureVariation = 0.1 * Math.sin(progress * Math.PI * 2);
    const randomPressure = (Math.random() - 0.5) * 0.1;
    const pressure = Math.max(0.2, Math.min(1.0,
      basePressure + pressureVariation + randomPressure
    ));

    // Simulate natural timing (faster in middle, slower at ends)
    const speedMultiplier = 0.5 + Math.sin(progress * Math.PI);
    const timeOffset = i * (5 + speedMultiplier * 3); // 5-11ms per point

    return {
      x: point.x + jitterX,
      y: point.y + jitterY,
      pressure,
      timestamp: baseTime + timeOffset
    };
  });
}

/**
 * Converts text to an array of strokes using SVG path conversion
 *
 * @param text - The text to convert
 * @param startX - Starting X position
 * @param startY - Starting Y position
 * @param width - Available width for wrapping
 * @param options - Handwriting style options
 * @returns Array of strokes with realistic pressure and timing
 */
export function textToStrokes(
  text: string,
  startX: number,
  startY: number,
  width: number,
  options: HandwritingOptions = {}
): Stroke[] {
  // Generate SVG using existing handwriting simulator
  const svgString = simulateHandwriting(text, width, options);

  // Parse SVG to extract path elements
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
  const paths = svgDoc.querySelectorAll('path');

  const strokes: Stroke[] = [];
  const jitter = options.jitter !== undefined ? options.jitter : 0.3;
  const color = options.color || '#6B46C1'; // Purple-blue for AI
  const thickness = options.thickness || 2;

  paths.forEach((path) => {
    const pathData = path.getAttribute('d');
    const transform = path.getAttribute('transform');

    if (!pathData) return;

    // Parse path into points
    let points = parseSVGPath(pathData);

    if (points.length === 0) return;

    // Apply transform if present
    if (transform) {
      const translateMatch = transform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
      const scaleMatch = transform.match(/scale\(([-\d.]+)\)/);

      let translateX = 0;
      let translateY = 0;
      let scale = 1;

      if (translateMatch) {
        translateX = parseFloat(translateMatch[1]);
        translateY = parseFloat(translateMatch[2]);
      }

      if (scaleMatch) {
        scale = parseFloat(scaleMatch[1]);
      }

      points = points.map(p => ({
        x: (p.x * scale) + translateX + startX,
        y: (p.y * scale) + translateY + startY,
        pressure: p.pressure
      }));
    } else {
      // No transform, just offset by start position
      points = points.map(p => ({
        x: p.x + startX,
        y: p.y + startY,
        pressure: p.pressure
      }));
    }

    // Add realistic variation
    const realisticPoints = addRealisticVariation(points, jitter);

    // Create stroke object
    const stroke: Stroke = {
      points: realisticPoints,
      color,
      width: thickness,
      timestamp: Date.now(),
      isAI: true // Mark as AI-generated for Educational Integrity (Value #3)
    };

    strokes.push(stroke);
  });

  return strokes;
}

/**
 * Converts AI text response to strokes and adds them to the canvas
 *
 * @param text - AI response text
 * @param canvasX - X position on canvas
 * @param canvasY - Y position on canvas
 * @param canvasWidth - Available width
 * @param style - Handwriting style ('neat', 'cursive', etc.)
 * @returns Array of AI-generated strokes ready to render
 */
export function aiResponseToStrokes(
  text: string,
  canvasX: number,
  canvasY: number,
  canvasWidth: number,
  style: 'neat' | 'messy' | 'cursive' | 'print' | 'architect' = 'neat'
): Stroke[] {
  // Import predefined styles
  const { handwritingStyles } = require('./handwriting');
  const styleOptions = handwritingStyles[style];

  // Set AI-specific color (purple-blue)
  const aiOptions: HandwritingOptions = {
    ...styleOptions,
    color: '#6B46C1', // Purple for AI (value #8 - visual distinction)
    fontSize: 18,
    lineHeight: 28
  };

  return textToStrokes(text, canvasX, canvasY, canvasWidth, aiOptions);
}
