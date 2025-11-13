/**
 * AI Service for Claude API interactions
 * Handles image transcription and chat functionality with streaming support
 */

import { getConfig } from './config';
import type {
  ClaudeRequest,
  ClaudeResponse,
  ClaudeMessage,
  TranscriptionResponse,
  OnProgressCallback
} from '../types/api';

/**
 * Send an image to Claude for handwriting transcription
 * @param imageData - Base64 encoded image data (with data URL prefix)
 * @returns Promise resolving to transcription response with text and tags
 */
export async function sendImageToAI(imageData: string): Promise<TranscriptionResponse> {
  try {
    const config = await getConfig();
    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.claude.model,
        max_tokens: config.claude.max_tokens,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: imageData.split(',')[1] // Remove the data:image/jpeg;base64, part
                }
              },
              {
                type: 'text',
                text: 'Transcribe this handwritten text and respond in valid JSON with the following structure:\n' +
                  '{\n' +
                  '  "transcription": "provide only transcription of the handwriting",\n' +
                  '  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]\n' +
                  '}\n' +
                  'Provide up to 5 relevant tags for the content.'
              }
            ]
          }
        ]
      } as ClaudeRequest)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`AI API request failed: ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json() as ClaudeResponse;
    return parseAIResponse(data.content[0].text);
  } catch (error) {
    console.error('Error in AI image service:', error);
    throw error;
  }
}

/**
 * Send a chat message to Claude with optional streaming support
 * @param chatHistory - Array of chat messages
 * @param onProgress - Optional callback for streaming responses (called with incremental text)
 * @returns Promise resolving to the complete response text
 */
export async function sendChatToAI(
  chatHistory: ClaudeMessage[],
  onProgress?: OnProgressCallback | null
): Promise<string> {
  try {
    const config = await getConfig();

    // If no progress callback is provided, use the standard non-streaming approach
    if (!onProgress) {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.claude.model,
          max_tokens: config.claude.max_tokens,
          messages: chatHistory
        } as ClaudeRequest)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`AI API request failed: ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json() as ClaudeResponse;
      return data.content[0].text;
    }
    // If progress callback provided, use streaming approach
    else {
      const response = await fetch('/api/claude/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.claude.model,
          max_tokens: config.claude.max_tokens,
          messages: chatHistory,
          stream: true
        } as ClaudeRequest)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`AI API streaming request failed: ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        try {
          const lines = chunk.split('\n\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              if (jsonStr === '[DONE]') continue;

              const json = JSON.parse(jsonStr) as ClaudeResponse;
              if (json.content && json.content[0] && json.content[0].text) {
                const text = json.content[0].text;
                fullText += text;
                onProgress(fullText);
              }
            }
          }
        } catch (e) {
          console.error('Error parsing streaming response:', e);
        }
      }

      return fullText;
    }
  } catch (error) {
    console.error('Error in AI chat service:', error);
    throw error;
  }
}

/**
 * Parse the AI response for transcription data
 * @param response - Raw text response from Claude
 * @returns Parsed transcription with tags
 */
function parseAIResponse(response: string): TranscriptionResponse {
  try {
    const parsedResponse = JSON.parse(response) as {
      transcription?: string;
      tags?: string[];
    };
    return {
      transcription: parsedResponse.transcription || '',
      tags: parsedResponse.tags || [],
      fullResponse: response
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return {
      transcription: 'Error parsing AI response',
      tags: [],
      fullResponse: response
    };
  }
}
