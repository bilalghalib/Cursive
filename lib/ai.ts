/**
 * AI Service - Claude API integration via Supabase Edge Functions
 */

import { supabase } from './supabase';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface TranscriptionResult {
  transcription: string;
  tags: string[];
  fullResponse: string;
}

const EDGE_FUNCTIONS = {
  claudeProxy: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/claude-proxy`,
};

/**
 * Send an image to Claude Vision API for transcription
 */
export async function sendImageToAI(imageData: string): Promise<TranscriptionResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const response = await fetch(EDGE_FUNCTIONS.claudeProxy, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: imageData.split(',')[1] // Remove data:image/jpeg;base64, part
                }
              },
              {
                type: "text",
                text: "Transcribe this handwritten text and respond with ONLY valid JSON (no markdown code blocks, no extra text):\n" +
                "{\n" +
                "  \"transcription\": \"provide only transcription of the handwriting\",\n" +
                "  \"tags\": [\"tag1\", \"tag2\", \"tag3\", \"tag4\", \"tag5\"]\n" +
                "}\n" +
                "Provide up to 5 relevant tags for the content. Return ONLY the JSON object, nothing else."
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
    return parseAIResponse(data.content[0].text);
  } catch (error) {
    console.error('Error in AI image service:', error);
    throw error;
  }
}

/**
 * Send chat messages to Claude with optional streaming
 */
export async function sendChatToAI(
  chatHistory: Message[],
  onProgress?: (text: string) => void
): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Filter out messages with empty content
    const validMessages = chatHistory.filter(msg => msg.content && msg.content.trim() !== '');

    if (validMessages.length === 0) {
      throw new Error('No valid messages to send to AI');
    }

    // Non-streaming mode
    if (!onProgress) {
      const response = await fetch(EDGE_FUNCTIONS.claudeProxy, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          messages: validMessages
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`AI API request failed: ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return data.content[0].text;
    }

    // Streaming mode
    const response = await fetch(EDGE_FUNCTIONS.claudeProxy, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: validMessages,
        stream: true
      })
    });

    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorData = await response.clone().json();
        errorDetails = ` Details: ${JSON.stringify(errorData)}`;
      } catch (e) {
        const errorText = await response.text();
        errorDetails = ` Details: ${errorText}`;
      }
      throw new Error(`AI API streaming request failed: ${response.statusText}.${errorDetails}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!response.body || !contentType.includes('text/event-stream')) {
      // Fallback to non-streaming response
      const data = await response.json();
      const text = data?.content?.[0]?.text || '';
      if (onProgress) {
        onProgress(text);
      }
      return text;
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

            const json = JSON.parse(jsonStr);
            if (json.content && json.content[0] && json.content[0].text) {
              const text = json.content[0].text;
              fullText += text;
              if (onProgress) onProgress(fullText);
            }
          }
        }
      } catch (e) {
        console.error('Error parsing streaming response:', e);
      }
    }

    return fullText;
  } catch (error) {
    console.error('Error in AI chat service:', error);
    throw error;
  }
}

/**
 * Parse AI response, handling markdown code blocks
 */
function parseAIResponse(response: string): TranscriptionResult {
  try {
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
