/**
 * LLM-Guided Style Variation
 * Instructs Claude to provide style metadata with responses for context-aware handwriting
 */

/**
 * System prompt addition for style-aware responses
 * Add this to your AI prompts when handwriting is enabled
 */
export const STYLE_AWARE_SYSTEM_PROMPT = `
When responding, you can optionally include handwriting style guidance by wrapping your response in a JSON object.
This allows the handwriting to reflect the emotional tone of your response.

Format:
{
  "text": "your response here",
  "style": {
    "slant": number (-10 to 10, negative = backslant, positive = forward slant),
    "spacing": number (0.5 to 2.0, multiplier for letter spacing),
    "messiness": number (0 to 1, 0 = very neat, 1 = very messy/expressive),
    "mood": string (optional: "excited", "calm", "formal", "casual", "urgent", "thoughtful")
  }
}

Examples:
- Excited response: {"text": "That's amazing!", "style": {"slant": 8, "spacing": 1.3, "messiness": 0.6, "mood": "excited"}}
- Formal response: {"text": "Thank you for your inquiry.", "style": {"slant": 0, "spacing": 1.0, "messiness": 0.2, "mood": "formal"}}
- Thoughtful response: {"text": "Let me think about that...", "style": {"slant": 3, "spacing": 0.9, "messiness": 0.3, "mood": "thoughtful"}}

You can also respond with plain text if no style variation is needed.
`.trim();

/**
 * Style presets for different moods/contexts
 */
export const STYLE_PRESETS = {
    excited: {
        slant: 8,
        spacing: 1.3,
        messiness: 0.6
    },
    calm: {
        slant: 2,
        spacing: 1.0,
        messiness: 0.2
    },
    formal: {
        slant: 0,
        spacing: 1.0,
        messiness: 0.1
    },
    casual: {
        slant: 5,
        spacing: 1.2,
        messiness: 0.4
    },
    urgent: {
        slant: 10,
        spacing: 1.4,
        messiness: 0.7
    },
    thoughtful: {
        slant: 3,
        spacing: 0.9,
        messiness: 0.3
    },
    confident: {
        slant: 4,
        spacing: 1.1,
        messiness: 0.2
    },
    uncertain: {
        slant: 1,
        spacing: 0.8,
        messiness: 0.5
    }
};

/**
 * Parse AI response for style metadata
 * Handles both JSON format and plain text
 *
 * @param {string} response - Raw AI response
 * @returns {Object} Parsed response with text and style
 */
export function parseStyleAwareResponse(response) {
    try {
        // Try to parse as JSON
        const parsed = JSON.parse(response);

        if (parsed.text && parsed.style) {
            // Validate style object
            const style = validateStyleObject(parsed.style);

            return {
                text: parsed.text,
                styleVariation: style,
                hasStyleMetadata: true,
                mood: parsed.style.mood || null
            };
        }
    } catch (e) {
        // Not JSON, treat as plain text
    }

    // Plain text response
    return {
        text: response,
        styleVariation: {},
        hasStyleMetadata: false,
        mood: null
    };
}

/**
 * Validate and normalize style object
 */
function validateStyleObject(style) {
    const normalized = {};

    // Slant: -10 to 10
    if (style.slant !== undefined) {
        normalized.slant = Math.max(-10, Math.min(10, Number(style.slant) || 0));
    }

    // Spacing: 0.5 to 2.0
    if (style.spacing !== undefined) {
        normalized.spacing = Math.max(0.5, Math.min(2.0, Number(style.spacing) || 1.0));
    }

    // Messiness: 0 to 1
    if (style.messiness !== undefined) {
        normalized.messiness = Math.max(0, Math.min(1, Number(style.messiness) || 0));
    }

    // Apply preset if mood is specified
    if (style.mood && STYLE_PRESETS[style.mood]) {
        const preset = STYLE_PRESETS[style.mood];
        return { ...preset, ...normalized }; // User values override preset
    }

    return normalized;
}

/**
 * Generate style-aware prompt for AI
 * Adds style guidance to the system message
 *
 * @param {Array} messages - Chat history
 * @param {boolean} enableStyleGuidance - Whether to add style prompt
 * @returns {Array} Messages with style guidance
 */
export function addStyleGuidance(messages, enableStyleGuidance = true) {
    if (!enableStyleGuidance) {
        return messages;
    }

    // Check if system message exists
    const hasSystemMessage = messages.some(m => m.role === 'system');

    if (hasSystemMessage) {
        // Append to existing system message
        return messages.map(m => {
            if (m.role === 'system') {
                return {
                    ...m,
                    content: m.content + '\n\n' + STYLE_AWARE_SYSTEM_PROMPT
                };
            }
            return m;
        });
    } else {
        // Add new system message at the beginning
        return [
            {
                role: 'system',
                content: STYLE_AWARE_SYSTEM_PROMPT
            },
            ...messages
        ];
    }
}

/**
 * Get style description for UI display
 */
export function getStyleDescription(styleVariation, mood) {
    const parts = [];

    if (mood) {
        parts.push(`${mood} mood`);
    }

    if (styleVariation.slant) {
        if (Math.abs(styleVariation.slant) < 3) {
            parts.push('upright');
        } else if (styleVariation.slant > 0) {
            parts.push('forward slant');
        } else {
            parts.push('backslant');
        }
    }

    if (styleVariation.spacing) {
        if (styleVariation.spacing > 1.2) {
            parts.push('wide spacing');
        } else if (styleVariation.spacing < 0.8) {
            parts.push('tight spacing');
        }
    }

    if (styleVariation.messiness !== undefined) {
        if (styleVariation.messiness > 0.6) {
            parts.push('expressive');
        } else if (styleVariation.messiness < 0.3) {
            parts.push('neat');
        }
    }

    return parts.length > 0 ? parts.join(', ') : 'normal style';
}

/**
 * Example usage for developers
 */
export const USAGE_EXAMPLE = `
// In your AI service:
import { addStyleGuidance, parseStyleAwareResponse } from './llmStyleGuide.js';

// Before sending to AI:
const messagesWithStyle = addStyleGuidance(chatHistory, true);

// Send to Claude:
const response = await sendToAI(messagesWithStyle);

// Parse response:
const { text, styleVariation, mood } = parseStyleAwareResponse(response);

// Use in writeback:
await writeAIResponseToCanvas(text, {
    styleVariation,
    ...otherOptions
});
`;
