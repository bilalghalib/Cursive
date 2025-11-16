/**
 * Handwriting Synthesis Engine
 * Converts text to strokes using trained handwriting samples
 */

import type { Stroke, Point, AIStyleMetadata } from './types';
import { createConnector, canConnect, calculateStrokeCenter } from './connectionPoints';
import { applyEmotionalStyle, moodPresets } from './emotionalHandwriting';
import { simulateHandwriting } from './handwriting';
import { STORAGE_KEYS, CANVAS } from './constants';

export interface SynthesisOptions {
  startX: number;
  startY: number;
  maxWidth: number;
  lineHeight?: number;
  wordSpacing?: number;
  letterSpacing?: number;
  scaleFactor?: number; // Scale down from training size (default: 0.75)
  color?: string;
  styleMetadata?: AIStyleMetadata;
  onProgress?: (progress: number, currentWord: string) => void; // 0-100 progress
}

export interface SynthesisResult {
  strokes: Stroke[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  warnings: string[];
  stats: {
    totalChars: number;
    synthesizedChars: number;
    fallbackChars: number;
    missingChars: string[];
  };
}

interface TrainingData {
  version: string;
  timestamp: number;
  style: string;
  samples: Stroke[];
  metadata?: {
    totalSamples: number;
    samplesPerCharacter: number;
  };
}

/**
 * Load training data from localStorage
 */
export function loadTrainingData(): TrainingData | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TRAINING_DATA);
    if (!data) return null;

    const parsed = JSON.parse(data);

    // Validate structure
    if (!parsed.samples || !Array.isArray(parsed.samples)) {
      console.error('[Synthesis] Invalid training data structure');
      return null;
    }

    console.log(`[Synthesis] Loaded ${parsed.samples.length} training samples`);
    return parsed;
  } catch (error) {
    console.error('[Synthesis] Failed to load training data:', error);
    return null;
  }
}

/**
 * Check if training data exists and is valid
 */
export function hasTrainingData(): boolean {
  const data = loadTrainingData();
  return data !== null && data.samples.length > 0;
}

/**
 * Find trained samples for a specific character
 */
function findSamplesForCharacter(
  trainingData: TrainingData,
  char: string
): Stroke[] {
  // Try exact match first
  let samples = trainingData.samples.filter(s => s.character === char);

  // Try case-insensitive match
  if (samples.length === 0) {
    samples = trainingData.samples.filter(s =>
      s.character?.toLowerCase() === char.toLowerCase()
    );
  }

  // Try finding in ligatures or words
  if (samples.length === 0) {
    samples = trainingData.samples.filter(s =>
      s.character?.includes(char)
    );
  }

  return samples;
}

/**
 * Calculate average letter height from training data
 */
function calculateAverageLetterHeight(trainingData: TrainingData): number {
  if (trainingData.samples.length === 0) return 50; // Fallback

  const heights = trainingData.samples.map(stroke => {
    const ys = stroke.points.map(p => p.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return maxY - minY;
  });

  const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
  return avgHeight;
}

/**
 * Apply jitter (random variation) to points
 */
function applyJitter(points: Point[], intensity: number): Point[] {
  return points.map(p => ({
    x: p.x + (Math.random() - 0.5) * intensity * 10,
    y: p.y + (Math.random() - 0.5) * intensity * 5,
    pressure: p.pressure  // Explicitly preserve pressure
  }));
}

/**
 * Apply slant (italic effect) to points
 */
function applySlant(points: Point[], slant: number): Point[] {
  // Slant is how much to shift x based on y
  // Positive slant = forward lean
  const avgY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  return points.map(p => ({
    x: p.x + (p.y - avgY) * slant,
    y: p.y,
    pressure: p.pressure  // Explicitly preserve pressure
  }));
}

/**
 * Transform stroke to new position and scale
 */
function transformStroke(
  stroke: Stroke,
  offsetX: number,
  offsetY: number,
  scaleFactor: number,
  emotionalParams?: { jitter: number; slant: number }
): Stroke {
  // Get stroke bounds for centering
  const xs = stroke.points.map(p => p.x);
  const ys = stroke.points.map(p => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);

  // Transform points
  let transformedPoints: Point[] = stroke.points.map(p => ({
    x: (p.x - minX) * scaleFactor + offsetX,
    y: (p.y - minY) * scaleFactor + offsetY,
    pressure: p.pressure
  }));

  // Apply emotional variation
  if (emotionalParams) {
    if (emotionalParams.jitter > 0) {
      transformedPoints = applyJitter(transformedPoints, emotionalParams.jitter);
    }
    if (emotionalParams.slant !== 0) {
      transformedPoints = applySlant(transformedPoints, emotionalParams.slant);
    }
  }

  return {
    ...stroke,
    points: transformedPoints,
    // Update connection points with new positions
    entryPoint: stroke.entryPoint ? {
      x: (stroke.entryPoint.x - minX) * scaleFactor + offsetX,
      y: (stroke.entryPoint.y - minY) * scaleFactor + offsetY,
      angle: stroke.entryPoint.angle,
      pressure: stroke.entryPoint.pressure
    } : undefined,
    exitPoint: stroke.exitPoint ? {
      x: (stroke.exitPoint.x - minX) * scaleFactor + offsetX,
      y: (stroke.exitPoint.y - minY) * scaleFactor + offsetY,
      angle: stroke.exitPoint.angle,
      pressure: stroke.exitPoint.pressure
    } : undefined
  };
}

/**
 * Calculate width of a stroke
 */
function getStrokeWidth(stroke: Stroke): number {
  const xs = stroke.points.map(p => p.x);
  return Math.max(...xs) - Math.min(...xs);
}

/**
 * Synthesize handwriting from text using training data
 */
export async function synthesizeHandwriting(
  text: string,
  options: SynthesisOptions
): Promise<SynthesisResult> {
  const {
    startX,
    startY,
    maxWidth,
    lineHeight = 60,
    wordSpacing = 20,
    letterSpacing = 5,
    scaleFactor = 0.75, // Scale down from training size
    color = '#4338ca', // Indigo blue for AI
    styleMetadata,
    onProgress
  } = options;

  const warnings: string[] = [];
  const stats = {
    totalChars: text.length,
    synthesizedChars: 0,
    fallbackChars: 0,
    missingChars: [] as string[]
  };

  // Load training data
  const trainingData = loadTrainingData();
  if (!trainingData) {
    throw new Error('No training data found. Please complete handwriting training first.');
  }

  // Get emotional parameters
  let emotionalParams = { jitter: 0.2, slant: 0.15 }; // Default: casual
  if (styleMetadata?.mood) {
    const moodStyle = moodPresets[styleMetadata.mood];
    if (moodStyle) {
      // Scale by confidence if provided
      const confidence = styleMetadata.confidence || 1.0;
      emotionalParams = {
        jitter: moodStyle.jitter * confidence,
        slant: moodStyle.slant * confidence
      };
    }
  } else if (styleMetadata?.customParams) {
    emotionalParams = {
      jitter: styleMetadata.customParams.jitter || 0.2,
      slant: styleMetadata.customParams.slant || 0.15
    };
  }

  console.log(`[Synthesis] Starting synthesis: "${text.substring(0, 50)}..." (${text.length} chars)`);
  console.log(`[Synthesis] Emotional params:`, emotionalParams);
  console.log(`[Synthesis] Scale factor: ${scaleFactor}`);

  // Warn if text is very long
  if (text.length > 500) {
    warnings.push(`Long text (${text.length} chars) may take time to render`);
  }

  const allStrokes: Stroke[] = [];
  let currentX = startX;
  let currentY = startY;
  let previousStroke: Stroke | null = null;

  // Split into words for word-wrapping
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const totalWords = words.length;

  for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
    const word = words[wordIndex];

    // Report progress
    if (onProgress) {
      const progress = (wordIndex / totalWords) * 100;
      onProgress(progress, word);
    }

    // Estimate word width (rough approximation)
    const estimatedWordWidth = word.length * (30 * scaleFactor) + (word.length - 1) * letterSpacing;

    // Word wrap: move to next line if word doesn't fit
    if (currentX + estimatedWordWidth > startX + maxWidth && currentX > startX) {
      currentX = startX;
      currentY += lineHeight;
      previousStroke = null; // Break cursive connection at line break
    }

    // Synthesize each character in the word
    for (let i = 0; i < word.length; i++) {
      const char = word[i];

      // Find training samples for this character
      const samples = findSamplesForCharacter(trainingData, char);

      if (samples.length > 0) {
        // Pick random variation
        const sample = samples[Math.floor(Math.random() * samples.length)];

        // Transform to current position
        const transformedStroke = transformStroke(
          sample,
          currentX,
          currentY,
          scaleFactor,
          emotionalParams
        );

        // Override color to blue for AI
        transformedStroke.color = color;
        transformedStroke.timestamp = Date.now();

        // Try to create connector from previous letter (cursive flow)
        if (previousStroke && previousStroke.exitPoint && transformedStroke.entryPoint) {
          // Check if they can connect smoothly
          if (canConnect(previousStroke, transformedStroke, 60, 60)) {
            const connector = createConnector(previousStroke, transformedStroke);
            if (connector) {
              connector.color = color;
              allStrokes.push(connector);
            }
          }
        }

        allStrokes.push(transformedStroke);
        stats.synthesizedChars++;

        // Update position
        const strokeWidth = getStrokeWidth(transformedStroke);
        currentX += strokeWidth + letterSpacing;
        previousStroke = transformedStroke;

      } else {
        // Character not in training data - use SVG simulation fallback
        console.warn(`[Synthesis] No training data for "${char}", using fallback`);
        stats.fallbackChars++;
        if (!stats.missingChars.includes(char)) {
          stats.missingChars.push(char);
        }

        // TODO: Implement SVG fallback
        // For now, just add space
        currentX += 15 * scaleFactor;
        previousStroke = null; // Break connection
      }
    }

    // Add word spacing after each word (except last)
    if (wordIndex < words.length - 1) {
      currentX += wordSpacing;
      previousStroke = null; // Break cursive connection between words
    }

    // Small delay for progressive rendering
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Calculate final bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const stroke of allStrokes) {
    for (const point of stroke.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }

  const bounds = {
    minX: minX === Infinity ? startX : minX,
    minY: minY === Infinity ? startY : minY,
    maxX: maxX === -Infinity ? startX : maxX,
    maxY: maxY === -Infinity ? startY : maxY,
    width: maxX === -Infinity ? 0 : maxX - minX,
    height: maxY === -Infinity ? 0 : maxY - minY
  };

  // Final progress
  if (onProgress) {
    onProgress(100, '');
  }

  console.log(`[Synthesis] Complete: ${stats.synthesizedChars} chars synthesized, ${stats.fallbackChars} fallbacks`);
  if (stats.missingChars.length > 0) {
    console.warn(`[Synthesis] Missing chars:`, stats.missingChars);
    warnings.push(`Some characters not in training data: ${stats.missingChars.join(', ')}`);
  }

  return {
    strokes: allStrokes,
    bounds,
    warnings,
    stats
  };
}

/**
 * Convenience function: Synthesize and add to canvas
 */
export async function synthesizeAndRender(
  text: string,
  options: SynthesisOptions,
  onStrokesGenerated: (strokes: Stroke[]) => void
): Promise<SynthesisResult> {
  const result = await synthesizeHandwriting(text, options);

  // Mark all strokes as AI-generated
  result.strokes.forEach(stroke => {
    (stroke as any).isAIGenerated = true;
  });

  onStrokesGenerated(result.strokes);

  return result;
}
