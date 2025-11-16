/**
 * Emotional Handwriting Variation
 * Maps AI sentiment/mood to handwriting style parameters
 */

import type { HandwritingOptions } from './handwriting';

export interface EmotionalStyle {
  jitter: number;               // Random variation (0-1)
  slant: number;                // Character slant (-0.5 to 0.5)
  baselineVariation: number;    // Vertical jitter (px)
  characterVariation: number;   // Shape variation (0-1)
  thickness: number;            // Stroke thickness multiplier
  thicknessVariation?: number;  // Thickness randomness (0-1)
  connectLetters?: boolean;     // Cursive connections
}

/**
 * Pre-defined mood presets
 * Based on HANDWRITING_WRITEBACK.md specifications
 */
export const moodPresets: Record<string, EmotionalStyle> = {
  excited: {
    jitter: 0.4,
    slant: 0.3,
    baselineVariation: 3,
    characterVariation: 0.6,
    thickness: 1.8,
    thicknessVariation: 0.6,
    connectLetters: true
  },
  calm: {
    jitter: 0.1,
    slant: 0.05,
    baselineVariation: 1,
    characterVariation: 0.2,
    thickness: 1.3,
    thicknessVariation: 0.2,
    connectLetters: true
  },
  formal: {
    jitter: 0.05,
    slant: 0,
    baselineVariation: 0.5,
    characterVariation: 0.1,
    thickness: 1.2,
    thicknessVariation: 0.1,
    connectLetters: false
  },
  casual: {
    jitter: 0.2,
    slant: 0.15,
    baselineVariation: 1.5,
    characterVariation: 0.4,
    thickness: 1.6,
    thicknessVariation: 0.3,
    connectLetters: true
  },
  urgent: {
    jitter: 0.4,
    slant: 0.35,
    baselineVariation: 3.5,
    characterVariation: 0.7,
    thickness: 2.0,
    thicknessVariation: 0.7,
    connectLetters: false
  },
  thoughtful: {
    jitter: 0.15,
    slant: 0.1,
    baselineVariation: 1.5,
    characterVariation: 0.3,
    thickness: 1.5,
    thicknessVariation: 0.3,
    connectLetters: true
  }
};

/**
 * Detect mood from AI response text using keyword analysis
 *
 * @param aiResponse - The AI's response text
 * @returns The detected mood string
 */
export function getMoodFromSentiment(aiResponse: string): string {
  const text = aiResponse.toLowerCase();

  // Excited/Enthusiastic
  if (
    text.includes('exciting') ||
    text.includes('amazing') ||
    text.includes('wow') ||
    text.includes('fantastic') ||
    text.includes('awesome') ||
    text.includes('incredible') ||
    text.includes('!!')
  ) {
    return 'excited';
  }

  // Urgent
  if (
    text.includes('urgent') ||
    text.includes('quickly') ||
    text.includes('hurry') ||
    text.includes('immediate') ||
    text.includes('asap') ||
    text.includes('now')
  ) {
    return 'urgent';
  }

  // Formal/Professional
  if (
    text.includes('formal') ||
    text.includes('professional') ||
    text.includes('regards') ||
    text.includes('sincerely') ||
    text.includes('respectfully')
  ) {
    return 'formal';
  }

  // Calm/Peaceful
  if (
    text.includes('calm') ||
    text.includes('peaceful') ||
    text.includes('relax') ||
    text.includes('gentle') ||
    text.includes('serene') ||
    text.includes('tranquil')
  ) {
    return 'calm';
  }

  // Thoughtful/Contemplative
  if (
    text.includes('think') ||
    text.includes('consider') ||
    text.includes('ponder') ||
    text.includes('reflect') ||
    text.includes('perhaps') ||
    text.includes('maybe')
  ) {
    return 'thoughtful';
  }

  // Default: casual
  return 'casual';
}

/**
 * Apply emotional styling to base handwriting options
 *
 * @param baseStyle - The user's base handwriting style
 * @param mood - The mood to apply (excited, calm, formal, etc.)
 * @returns HandwritingOptions with emotional variation applied
 */
export function applyEmotionalStyle(
  baseStyle: HandwritingOptions,
  mood: string
): HandwritingOptions {
  const emotionalParams = moodPresets[mood] || moodPresets.casual;

  return {
    ...baseStyle,
    jitter: emotionalParams.jitter,
    slant: emotionalParams.slant,
    baselineVariation: emotionalParams.baselineVariation,
    characterVariation: emotionalParams.characterVariation,
    thickness: emotionalParams.thickness,
    thicknessVariation: emotionalParams.thicknessVariation,
    connectLetters: emotionalParams.connectLetters
  };
}

/**
 * Get a blended style between two moods
 * Useful for transitioning between emotional states
 *
 * @param mood1 - First mood
 * @param mood2 - Second mood
 * @param ratio - Blend ratio (0 = all mood1, 1 = all mood2)
 * @returns Blended emotional style
 */
export function blendMoods(
  mood1: string,
  mood2: string,
  ratio: number = 0.5
): EmotionalStyle {
  const style1 = moodPresets[mood1] || moodPresets.casual;
  const style2 = moodPresets[mood2] || moodPresets.casual;

  return {
    jitter: style1.jitter + (style2.jitter - style1.jitter) * ratio,
    slant: style1.slant + (style2.slant - style1.slant) * ratio,
    baselineVariation: style1.baselineVariation + (style2.baselineVariation - style1.baselineVariation) * ratio,
    characterVariation: style1.characterVariation + (style2.characterVariation - style1.characterVariation) * ratio,
    thickness: style1.thickness + (style2.thickness - style1.thickness) * ratio,
    thicknessVariation: style1.thicknessVariation && style2.thicknessVariation
      ? style1.thicknessVariation + (style2.thicknessVariation - style1.thicknessVariation) * ratio
      : undefined,
    connectLetters: ratio < 0.5 ? style1.connectLetters : style2.connectLetters
  };
}

/**
 * Get style description for UI display
 *
 * @param mood - The mood preset name
 * @returns Human-readable description
 */
export function getMoodDescription(mood: string): string {
  const descriptions: Record<string, string> = {
    excited: 'Enthusiastic and energetic with expressive variation',
    calm: 'Peaceful and steady with minimal variation',
    formal: 'Professional and precise with controlled strokes',
    casual: 'Friendly and relaxed with natural flow',
    urgent: 'Quick and hurried with increased messiness',
    thoughtful: 'Contemplative and deliberate with subtle variation'
  };

  return descriptions[mood] || descriptions.casual;
}

/**
 * Example: Advanced sentiment analysis using multiple factors
 * This is a placeholder for future NLP integration
 */
export interface SentimentAnalysis {
  mood: string;
  confidence: number;
  factors: string[];
}

export function analyzeSentiment(text: string): SentimentAnalysis {
  // Simple implementation - can be enhanced with NLP libraries
  const mood = getMoodFromSentiment(text);

  // Count exclamation marks as excitement indicator
  const exclamations = (text.match(/!/g) || []).length;
  const hasQuestions = text.includes('?');
  const wordCount = text.split(/\s+/).length;

  let confidence = 0.5;

  // Adjust confidence based on signal strength
  if (exclamations >= 2) confidence += 0.2;
  if (mood !== 'casual') confidence += 0.2;

  const factors: string[] = [];
  if (exclamations > 0) factors.push(`${exclamations} exclamation marks`);
  if (hasQuestions) factors.push('contains questions');
  if (wordCount < 10) factors.push('short response');

  return {
    mood,
    confidence: Math.min(confidence, 1.0),
    factors
  };
}
