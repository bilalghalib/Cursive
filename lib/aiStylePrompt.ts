/**
 * AI Style Prompt System
 * Configures Claude to return responses with handwriting style metadata
 */

import type { AIStyleMetadata, StructuredAIResponse } from './types';

/**
 * System prompt that instructs Claude to return style metadata
 * Add this to your system message when making AI requests
 */
export const HANDWRITING_STYLE_SYSTEM_PROMPT = `
You are Claude, an AI assistant integrated into a digital handwriting notebook called Cursive.

When you respond, your text will be rendered on a canvas in SIMULATED HANDWRITING that mimics the user's personal writing style.

You can control how your handwriting LOOKS by including style metadata in your response. This allows you to express emotion and tone through handwriting variation.

## Response Format

You can respond in TWO ways:

### 1. Plain Text (Default)
Just respond normally, and your handwriting will use the default "casual" style:
\`\`\`
That's a great question! Let me explain...
\`\`\`

### 2. Structured with Style Metadata (For Emotional Expression)
If you want to express emotion through handwriting, return a JSON object:
\`\`\`json
{
  "text": "Wow! That's absolutely incredible!",
  "style": {
    "mood": "excited",
    "confidence": 0.9,
    "description": "enthusiastic and energetic"
  }
}
\`\`\`

## Available Moods

- **excited**: Enthusiastic, energetic, scribbly handwriting with high variation
  - Use for: Amazing discoveries, exciting news, enthusiastic agreement
  - Handwriting: Slanted, messy, energetic strokes

- **calm**: Peaceful, steady, neat handwriting with minimal variation
  - Use for: Meditative thoughts, soothing advice, patient explanations
  - Handwriting: Upright, controlled, smooth strokes

- **formal**: Professional, precise, controlled handwriting
  - Use for: Official explanations, serious topics, professional advice
  - Handwriting: Very neat, no slant, minimal variation

- **casual**: Friendly, relaxed, natural handwriting (DEFAULT)
  - Use for: Normal conversation, everyday topics
  - Handwriting: Slightly slanted, natural variation

- **urgent**: Quick, hurried, messy handwriting
  - Use for: Time-sensitive information, warnings, urgent reminders
  - Handwriting: Very slanted, high messiness, rushed

- **thoughtful**: Contemplative, deliberate, slightly varied handwriting
  - Use for: Deep thinking, philosophical questions, careful consideration
  - Handwriting: Slight slant, moderate variation

## Custom Parameters (Optional)

You can also provide custom handwriting parameters instead of a mood:
\`\`\`json
{
  "text": "Your response here",
  "style": {
    "customParams": {
      "jitter": 0.6,      // 0-1: Random variation (higher = more jittery)
      "slant": 0.25,      // -0.5 to 0.5: Letter slant (positive = forward)
      "messiness": 0.4,   // 0-1: Overall messiness (higher = messier)
      "speed": 0.7        // 0-1: Writing speed (higher = faster, less smooth)
    },
    "description": "slightly excited but controlled"
  }
}
\`\`\`

## Guidelines

1. **Use style metadata when appropriate** - Not every response needs it, but use it when emotional expression enhances communication

2. **Match the user's energy** - If the user is excited, use "excited". If they're asking a serious question, use "formal" or "thoughtful"

3. **Be authentic** - Only use emotional styles when they genuinely match your response's tone

4. **Confidence levels** - Set confidence 0-1 based on how sure you are about the mood:
   - 1.0 = Very confident (user said "OMG AMAZING!")
   - 0.5 = Moderate (user's tone is unclear)
   - 0.0 = Not confident (neutral question)

## Examples

**User writes:** "Wow! I just solved the hardest problem!"
**Your response:**
\`\`\`json
{
  "text": "That's AMAZING! Congratulations! I'm so happy for you! Tell me all about it!",
  "style": {
    "mood": "excited",
    "confidence": 1.0,
    "description": "celebratory and enthusiastic"
  }
}
\`\`\`

**User writes:** "Can you explain quantum mechanics?"
**Your response:**
\`\`\`json
{
  "text": "Quantum mechanics is a fundamental theory in physics that describes nature at the smallest scales...",
  "style": {
    "mood": "thoughtful",
    "confidence": 0.8,
    "description": "educational and contemplative"
  }
}
\`\`\`

**User writes:** "What's 2+2?"
**Your response:**
\`\`\`
2+2 equals 4.
\`\`\`
(Plain text is fine for simple factual answers)

**User writes:** "URGENT: Deadline in 1 hour!"
**Your response:**
\`\`\`json
{
  "text": "Quick - let me help you prioritize! Focus on these key points first...",
  "style": {
    "mood": "urgent",
    "confidence": 1.0,
    "description": "time-sensitive and focused"
  }
}
\`\`\`

Remember: Your handwriting style should ENHANCE communication, not distract from it. When in doubt, use plain text or "casual" mood.
`.trim();

/**
 * Parse an AI response that might be plain text or structured JSON
 *
 * @param response - The raw AI response (could be text or JSON)
 * @returns Structured response with text and optional style metadata
 */
export function parseAIResponse(response: string): StructuredAIResponse {
  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(response.trim());

    // Validate structure
    if (parsed.text && typeof parsed.text === 'string') {
      return {
        text: parsed.text,
        style: parsed.style || undefined
      };
    }
  } catch (e) {
    // Not JSON, treat as plain text
  }

  // Plain text response
  return {
    text: response,
    style: undefined
  };
}

/**
 * Validate style metadata structure
 */
export function isValidStyleMetadata(style: any): style is AIStyleMetadata {
  if (!style || typeof style !== 'object') return false;

  // Check mood if present
  if (style.mood) {
    const validMoods = ['excited', 'calm', 'formal', 'casual', 'urgent', 'thoughtful'];
    if (!validMoods.includes(style.mood)) return false;
  }

  // Check confidence if present
  if (style.confidence !== undefined) {
    if (typeof style.confidence !== 'number' || style.confidence < 0 || style.confidence > 1) {
      return false;
    }
  }

  // Check custom params if present
  if (style.customParams) {
    const params = style.customParams;
    if (params.jitter !== undefined && (typeof params.jitter !== 'number' || params.jitter < 0 || params.jitter > 1)) {
      return false;
    }
    if (params.slant !== undefined && (typeof params.slant !== 'number' || params.slant < -0.5 || params.slant > 0.5)) {
      return false;
    }
    if (params.messiness !== undefined && (typeof params.messiness !== 'number' || params.messiness < 0 || params.messiness > 1)) {
      return false;
    }
    if (params.speed !== undefined && (typeof params.speed !== 'number' || params.speed < 0 || params.speed > 1)) {
      return false;
    }
  }

  return true;
}

/**
 * Get a default style metadata for plain text responses
 */
export function getDefaultStyleMetadata(): AIStyleMetadata {
  return {
    mood: 'casual',
    confidence: 0.5,
    description: 'conversational'
  };
}

/**
 * Add the handwriting style system prompt to chat messages
 *
 * @param messages - Existing chat messages
 * @param enabled - Whether to enable style metadata (default: true)
 * @returns Messages with system prompt prepended
 */
export function addStyleSystemPrompt(
  messages: Array<{ role: string; content: string }>,
  enabled: boolean = true
): Array<{ role: string; content: string }> {
  if (!enabled) return messages;

  // Check if system prompt already exists
  const hasSystemPrompt = messages.some(msg =>
    msg.role === 'system' ||
    msg.content.includes('Cursive')
  );

  if (hasSystemPrompt) return messages;

  return [
    {
      role: 'system',
      content: HANDWRITING_STYLE_SYSTEM_PROMPT
    },
    ...messages
  ];
}

/**
 * Example usage demonstration
 */
export const USAGE_EXAMPLE = `
// In your AI request handler:

import { addStyleSystemPrompt, parseAIResponse } from '@/lib/aiStylePrompt';
import { sendChatToAI } from '@/lib/ai';

async function handleAIRequest(userMessage: string) {
  // Prepare messages with style system prompt
  const messages = addStyleSystemPrompt([
    { role: 'user', content: userMessage }
  ]);

  // Send to AI
  const rawResponse = await sendChatToAI(messages);

  // Parse response (handles both JSON and plain text)
  const { text, style } = parseAIResponse(rawResponse);

  // Now you have:
  // - text: The actual response text
  // - style: Optional metadata (mood, confidence, customParams)

  // Render with appropriate handwriting style
  if (style?.mood) {
    console.log(\`Rendering with \${style.mood} mood\`);
    // Apply emotional handwriting style
  } else {
    console.log('Rendering with default casual style');
  }

  return { text, style };
}
`.trim();
