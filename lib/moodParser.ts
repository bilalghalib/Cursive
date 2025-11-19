/**
 * Mood Stream Parser
 *
 * Parses streaming text with mood tags like:
 * {{MOOD:excited:0.9}}Text here{{/MOOD}}
 *
 * Features:
 * - Handles partial tags across chunks
 * - Progressive rendering (no buffering)
 * - Optional intensity values
 * - Graceful fallback to neutral
 */

export type MoodName =
  | 'neutral'
  | 'excited'
  | 'thoughtful'
  | 'calm'
  | 'urgent'
  | 'formal'
  | 'empathetic';

export interface MoodState {
  mood: MoodName;
  intensity: number; // 0.0 to 1.0
}

export interface MoodSegment {
  start: number;  // Character index
  end: number;    // Character index
  mood: MoodName;
  intensity: number;
}

export class MoodStreamParser {
  private currentMood: MoodName = 'neutral';
  private currentIntensity: number = 0.5;
  private partialTag: string = '';
  private charIndex: number = 0;
  private moodTimeline: MoodSegment[] = [];
  private segmentStart: number = 0;

  private readonly VALID_MOODS: MoodName[] = [
    'excited', 'thoughtful', 'calm', 'urgent', 'formal', 'empathetic'
  ];

  private readonly OPEN_TAG = /\{\{MOOD:(\w+)(?::(\d*\.?\d+))?\}\}/gi;
  private readonly CLOSE_TAG = /\{\{\/MOOD\}\}/gi;
  private readonly DEFAULT_INTENSITY = 0.7;
  private readonly MIN_PERCEPTIBLE_INTENSITY = 0.2;

  /**
   * Parse a chunk of streaming text
   * Returns cleaned text and current mood state
   */
  parse(chunk: string): { text: string; mood: MoodName; intensity: number } {
    // Handle partial tag from previous chunk
    if (this.partialTag) {
      chunk = this.partialTag + chunk;
      this.partialTag = '';
    }

    // Check for incomplete tag at end
    const lastOpenBrace = chunk.lastIndexOf('{{');
    const lastCloseBrace = chunk.lastIndexOf('}}');

    if (lastOpenBrace > lastCloseBrace) {
      // Save incomplete tag for next chunk
      this.partialTag = chunk.slice(lastOpenBrace);
      chunk = chunk.slice(0, lastOpenBrace);
    }

    // Track original length for char indexing
    let processedText = '';

    // Extract mood changes and clean text
    const text = chunk
      .replace(this.OPEN_TAG, (match, mood, intensity) => {
        // Save previous segment to timeline
        if (processedText.length > 0) {
          this.addSegment(this.segmentStart, this.charIndex);
        }

        // Update mood
        this.currentMood = this.normalizeMood(mood);
        this.currentIntensity = this.parseIntensity(intensity);
        this.segmentStart = this.charIndex;

        return '';
      })
      .replace(this.CLOSE_TAG, () => {
        // Save segment to timeline
        if (processedText.length > 0) {
          this.addSegment(this.segmentStart, this.charIndex);
        }

        // Reset to neutral
        this.currentMood = 'neutral';
        this.currentIntensity = 0.5;
        this.segmentStart = this.charIndex;

        return '';
      });

    // Update character index
    this.charIndex += text.length;

    return {
      text,
      mood: this.currentMood,
      intensity: this.currentIntensity
    };
  }

  /**
   * Normalize mood name (case-insensitive, validate)
   */
  private normalizeMood(mood: string): MoodName {
    const normalized = mood.toLowerCase().trim() as MoodName;
    return this.VALID_MOODS.includes(normalized) ? normalized : 'neutral';
  }

  /**
   * Parse and validate intensity value
   */
  private parseIntensity(value: string | undefined): number {
    if (!value) return this.DEFAULT_INTENSITY;

    const parsed = parseFloat(value);
    if (isNaN(parsed)) return this.DEFAULT_INTENSITY;

    // Clamp to [0, 1]
    let clamped = Math.max(0, Math.min(1, parsed));

    // Ensure minimum perceptible intensity (except for neutral)
    if (this.currentMood !== 'neutral' && clamped < this.MIN_PERCEPTIBLE_INTENSITY) {
      clamped = this.MIN_PERCEPTIBLE_INTENSITY;
    }

    return clamped;
  }

  /**
   * Add segment to timeline
   */
  private addSegment(start: number, end: number) {
    if (end > start) {
      this.moodTimeline.push({
        start,
        end,
        mood: this.currentMood,
        intensity: this.currentIntensity
      });
    }
  }

  /**
   * Get current mood state
   */
  getCurrentState(): MoodState {
    return {
      mood: this.currentMood,
      intensity: this.currentIntensity
    };
  }

  /**
   * Get complete mood timeline
   */
  getTimeline(): MoodSegment[] {
    // Close current segment
    if (this.charIndex > this.segmentStart) {
      this.addSegment(this.segmentStart, this.charIndex);
      this.segmentStart = this.charIndex;
    }

    return [...this.moodTimeline];
  }

  /**
   * Reset parser state
   */
  reset() {
    this.currentMood = 'neutral';
    this.currentIntensity = 0.5;
    this.partialTag = '';
    this.charIndex = 0;
    this.moodTimeline = [];
    this.segmentStart = 0;
  }
}

/**
 * TEMPORARY: Map mood to handwriting style parameters
 *
 * NOTE: This is a PLACEHOLDER for demonstration purposes only!
 *
 * The actual emotional variation should come from the trained LSTM model,
 * which learns how YOUR handwriting changes with emotion from training data.
 *
 * These preset values will be REPLACED with LSTM-generated strokes once you:
 * 1. Complete handwriting training (collecting samples in different emotional states)
 * 2. Train the LSTM model (python train_lstm.py)
 * 3. Integrate ONNX.js browser inference
 *
 * Current status: Using algorithmic approximation (not authentic)
 * Future status: Using trained neural network (authentic emotional variation)
 */
export function getMoodStyleParams_TEMPORARY_PLACEHOLDER(mood: MoodName, intensity: number) {
  // WARNING: These are arbitrary preset values, NOT learned from your handwriting!
  const baseStyles = {
    excited: { slant: 8, spacing: 1.2, messiness: 0.5, speed: 1.3 },
    thoughtful: { slant: 3, spacing: 0.95, messiness: 0.3, speed: 0.8 },
    calm: { slant: 2, spacing: 1.0, messiness: 0.2, speed: 0.85 },
    urgent: { slant: 10, spacing: 1.3, messiness: 0.6, speed: 1.5 },
    formal: { slant: 0, spacing: 1.05, messiness: 0.1, speed: 0.9 },
    empathetic: { slant: 4, spacing: 1.0, messiness: 0.25, speed: 0.85 },
    neutral: { slant: 5, spacing: 1.0, messiness: 0.3, speed: 1.0 }
  };

  const base = baseStyles[mood];

  return {
    slant: base.slant * intensity,
    spacing: 1.0 + (base.spacing - 1.0) * intensity,
    messiness: base.messiness * intensity,
    speed: 1.0 + (base.speed - 1.0) * intensity
  };
}
