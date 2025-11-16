/**
 * AI Service for Claude API Integration
 * Handles OCR (vision) and chat functionality
 */

export interface Message {
  role: 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image';
    text?: string;
    source?: {
      type: 'base64';
      media_type: string;
      data: string;
    };
  }>;
}

export interface OCRResponse {
  transcription: string;
  tags: string[];
}

/**
 * Send an image to Claude for OCR (handwriting transcription)
 * @param imageData Base64 encoded image data
 * @returns Transcription and tags
 */
export async function sendImageToAI(imageData: string): Promise<OCRResponse> {
  try {
    // Remove data URL prefix if present
    const base64Data = imageData.includes('base64,')
      ? imageData.split('base64,')[1]
      : imageData;

    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: base64Data,
                },
              },
              {
                type: 'text',
                text:
                  'Transcribe this handwritten text and respond with ONLY valid JSON (no markdown code blocks, no extra text):\n' +
                  '{\n' +
                  '  "transcription": "provide only transcription of the handwriting",\n' +
                  '  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]\n' +
                  '}\n' +
                  'Provide up to 5 relevant tags for the content. Return ONLY the JSON object, nothing else.',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `AI API request failed: ${response.statusText}. Details: ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    const textContent = data.content[0].text;

    // Parse the JSON response
    return parseAIResponse(textContent);
  } catch (error) {
    console.error('Error in AI image service:', error);
    throw error;
  }
}

/**
 * Send chat messages to Claude
 * @param messages Array of chat messages
 * @param onProgress Optional callback for streaming responses
 * @returns AI response text
 */
export async function sendChatToAI(
  messages: Message[],
  onProgress?: (text: string) => void
): Promise<string> {
  try {
    // Filter out empty messages
    const validMessages = messages.filter((msg) => {
      if (typeof msg.content === 'string') {
        return msg.content.trim() !== '';
      }
      return true;
    });

    if (validMessages.length === 0) {
      throw new Error('No valid messages to send to AI');
    }

    // Non-streaming request
    if (!onProgress) {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          messages: validMessages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `AI API request failed: ${response.statusText}. Details: ${JSON.stringify(errorData)}`
        );
      }

      const data = await response.json();
      return data.content[0].text;
    }

    // Streaming request
    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: validMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `AI API request failed: ${response.statusText}. Details: ${JSON.stringify(errorData)}`
      );
    }

    // Process streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    if (!reader) {
      throw new Error('Response body is not readable');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            // Handle different event types
            if (data.type === 'content_block_delta') {
              const text = data.delta?.text || '';
              fullText += text;
              onProgress(fullText);
            }
          } catch (e) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }

    return fullText;
  } catch (error) {
    console.error('Error in AI chat service:', error);
    throw error;
  }
}

/**
 * Parse AI response JSON
 * @param response Raw response text from AI
 * @returns Parsed OCR response
 */
function parseAIResponse(response: string): OCRResponse {
  try {
    // Remove markdown code blocks if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(cleaned);

    return {
      transcription: parsed.transcription || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    // Fallback: treat the entire response as transcription
    return {
      transcription: response,
      tags: [],
    };
  }
}
