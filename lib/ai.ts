/**
 * Client-side AI Service
 * Provides functions to interact with Claude API via Next.js API route
 */

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; source?: any }>;
}

export interface TranscriptionResponse {
  transcription: string;
  tags: string[];
  fullResponse: string;
}

export interface AIConfig {
  model: string;
  max_tokens: number;
}

// Default configuration
const DEFAULT_CONFIG: AIConfig = {
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024
};

/**
 * Send an image to Claude for transcription
 * @param imageData Base64 encoded image data (with data:image/png;base64, prefix)
 * @param config Optional AI configuration
 * @returns Transcription and tags
 */
export async function sendImageToAI(
  imageData: string,
  config: Partial<AIConfig> = {}
): Promise<TranscriptionResponse> {
  try {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };

    // Remove the data:image/xxx;base64, prefix if present
    const base64Data = imageData.includes(',')
      ? imageData.split(',')[1]
      : imageData;

    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: fullConfig.model,
        max_tokens: fullConfig.max_tokens,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: base64Data
                }
              },
              {
                type: 'text',
                text: 'Transcribe this handwritten text and respond with ONLY valid JSON (no markdown code blocks, no extra text):\n' +
                  '{\n' +
                  '  "transcription": "provide only transcription of the handwriting",\n' +
                  '  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]\n' +
                  '}\n' +
                  'Provide up to 5 relevant tags for the content. Return ONLY the JSON object, nothing else.'
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`AI API request failed: ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const text = data.content[0].text;

    return parseAIResponse(text);
  } catch (error) {
    console.error('Error in AI image service:', error);
    throw error;
  }
}

/**
 * Send chat messages to Claude
 * @param chatHistory Array of messages
 * @param onProgress Optional callback for streaming progress
 * @param config Optional AI configuration
 * @returns AI response text
 */
export async function sendChatToAI(
  chatHistory: AIMessage[],
  onProgress?: (text: string) => void,
  config: Partial<AIConfig> = {}
): Promise<string> {
  try {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };

    // Filter out any messages with empty content
    const validMessages = chatHistory.filter(msg => {
      if (typeof msg.content === 'string') {
        return msg.content.trim() !== '';
      }
      return true; // Keep array content (e.g., image messages)
    });

    if (validMessages.length === 0) {
      throw new Error('No valid messages to send to AI');
    }

    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: fullConfig.model,
        max_tokens: fullConfig.max_tokens,
        messages: validMessages,
        stream: !!onProgress // Enable streaming if progress callback provided
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`AI API request failed: ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
    }

    // For now, we only support non-streaming
    // TODO: Add streaming support in API route
    const data = await response.json();
    const text = data.content[0].text;

    if (onProgress) {
      onProgress(text);
    }

    return text;
  } catch (error) {
    console.error('Error in AI chat service:', error);
    throw error;
  }
}

/**
 * Parse Claude's JSON response, handling markdown code blocks
 */
function parseAIResponse(response: string): TranscriptionResponse {
  try {
    // Claude may wrap JSON in markdown code blocks - strip them
    let cleanedResponse = response.trim();

    // Remove markdown code block markers if present
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsedResponse = JSON.parse(cleanedResponse);
    return {
      transcription: parsedResponse.transcription || '',
      tags: parsedResponse.tags || [],
      fullResponse: response
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    console.error('Raw response:', response);
    return {
      transcription: 'Error parsing AI response',
      tags: [],
      fullResponse: response
    };
  }
}

/**
 * Convert canvas ImageData to base64 PNG
 */
export function imageDataToBase64(imageData: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}
