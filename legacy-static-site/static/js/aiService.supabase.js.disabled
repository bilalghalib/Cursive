/**
 * AI Service - Supabase Version
 *
 * This replaces the direct Flask proxy calls with Supabase Edge Function calls.
 * To use: rename this file to aiService.js (backup the old one first!)
 *
 * Key changes:
 * - Uses Supabase Edge Function instead of Flask /api/claude
 * - Includes authentication token in requests
 * - Handles both streaming and non-streaming responses
 */

import { getConfig } from './config.js';
import getSupabase, { getAccessToken } from './supabaseClient.js';

// Get Supabase URL for Edge Function
// This will be automatically configured when you initialize Supabase client
let EDGE_FUNCTION_URL = null;

/**
 * Get Edge Function URL
 */
async function getEdgeFunctionUrl() {
  if (!EDGE_FUNCTION_URL) {
    const supabase = getSupabase();
    if (supabase) {
      // Edge Functions are at: https://<project-ref>.supabase.co/functions/v1/<function-name>
      const supabaseUrl = supabase.supabaseUrl;
      EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1/claude-proxy`;
    } else {
      throw new Error('Supabase client not initialized');
    }
  }
  return EDGE_FUNCTION_URL;
}

/**
 * Make authenticated request to Edge Function
 */
async function makeClaudeRequest(requestBody, stream = false) {
  const url = await getEdgeFunctionUrl();
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Not authenticated. Please log in to use AI features.');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...requestBody,
      stream,
    }),
  });

  if (!response.ok) {
    let errorMessage = `AI API request failed: ${response.statusText}`;

    try {
      const errorData = await response.json();
      errorMessage += `. Details: ${JSON.stringify(errorData)}`;
    } catch (e) {
      // Could not parse error as JSON
    }

    throw new Error(errorMessage);
  }

  return response;
}

/**
 * Send image to AI for transcription
 *
 * @param {string} imageData - Base64 encoded image data
 * @returns {Promise<Object>} Parsed AI response with transcription and tags
 */
export async function sendImageToAI(imageData) {
  try {
    const config = await getConfig();

    const response = await makeClaudeRequest({
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
                data: imageData.split(',')[1], // Remove data:image/png;base64, prefix
              },
            },
            {
              type: 'text',
              text:
                'Transcribe this handwritten text and respond in valid JSON with the following structure:\n' +
                '{\n' +
                '  "transcription": "provide only transcription of the handwriting",\n' +
                '  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]\n' +
                '}\n' +
                'Provide up to 5 relevant tags for the content.',
            },
          ],
        },
      ],
    });

    const data = await response.json();
    return parseAIResponse(data.content[0].text);
  } catch (error) {
    console.error('Error in AI image service:', error);
    throw error;
  }
}

/**
 * Send chat messages to AI
 *
 * @param {Array} chatHistory - Array of message objects
 * @param {Function} onProgress - Optional callback for streaming progress
 * @returns {Promise<string>} AI response text
 */
export async function sendChatToAI(chatHistory, onProgress = null) {
  try {
    const config = await getConfig();

    // Non-streaming request
    if (!onProgress) {
      const response = await makeClaudeRequest({
        model: config.claude.model,
        max_tokens: config.claude.max_tokens,
        messages: chatHistory,
      });

      const data = await response.json();
      return data.content[0].text;
    }
    // Streaming request
    else {
      const response = await makeClaudeRequest(
        {
          model: config.claude.model,
          max_tokens: config.claude.max_tokens,
          messages: chatHistory,
        },
        true // Enable streaming
      );

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode the chunk
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim();

            if (dataStr === '[DONE]') {
              return fullText;
            }

            try {
              const data = JSON.parse(dataStr);

              if (data.error) {
                throw new Error(data.error);
              }

              if (data.content && data.content[0]?.text) {
                const text = data.content[0].text;
                fullText += text;

                // Call progress callback with new text
                if (onProgress) {
                  onProgress(text);
                }
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
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
 * Parse AI response JSON
 *
 * @param {string} responseText - AI response text
 * @returns {Object} Parsed response object
 */
function parseAIResponse(responseText) {
  try {
    // Try to extract JSON from code blocks if present
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // Try to parse directly
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Error parsing AI response:', error);

    // Return a default structure if parsing fails
    return {
      transcription: responseText,
      tags: [],
    };
  }
}

/**
 * Get usage statistics
 *
 * @returns {Promise<Object>} Usage stats
 */
export async function getUsageStats() {
  try {
    const supabase = getSupabase();
    const user = await supabase.auth.getUser();

    if (!user.data?.user) {
      throw new Error('Not authenticated');
    }

    // Get current period usage from user_settings
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('tokens_used_this_period, subscription_tier')
      .eq('user_id', user.data.user.id)
      .single();

    if (settingsError) {
      console.error('Error fetching usage stats:', settingsError);
      return { tokens_used: 0, subscription_tier: 'free' };
    }

    // Get recent usage records
    const { data: usageRecords, error: usageError } = await supabase
      .from('api_usage')
      .select('*')
      .eq('user_id', user.data.user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (usageError) {
      console.error('Error fetching usage records:', usageError);
    }

    return {
      tokens_used_this_period: settings?.tokens_used_this_period || 0,
      subscription_tier: settings?.subscription_tier || 'free',
      recent_usage: usageRecords || [],
    };
  } catch (error) {
    console.error('Error getting usage stats:', error);
    return { tokens_used: 0, subscription_tier: 'free', recent_usage: [] };
  }
}

/**
 * Update user's API key (BYOK)
 *
 * @param {string} apiKey - Anthropic API key
 * @returns {Promise<boolean>} Success status
 */
export async function updateUserApiKey(apiKey) {
  try {
    const supabase = getSupabase();
    const user = await supabase.auth.getUser();

    if (!user.data?.user) {
      throw new Error('Not authenticated');
    }

    // Validate API key format
    if (!apiKey.startsWith('sk-ant-')) {
      throw new Error('Invalid API key format. Should start with sk-ant-');
    }

    // Update user_settings
    // Note: In production, you should encrypt this on the backend!
    const { error } = await supabase
      .from('user_settings')
      .update({ encrypted_api_key: apiKey })
      .eq('user_id', user.data.user.id);

    if (error) {
      console.error('Error updating API key:', error);
      throw new Error('Failed to update API key');
    }

    console.log('✅ API key updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating API key:', error);
    throw error;
  }
}

/**
 * Delete user's API key (revert to server key)
 *
 * @returns {Promise<boolean>} Success status
 */
export async function deleteUserApiKey() {
  try {
    const supabase = getSupabase();
    const user = await supabase.auth.getUser();

    if (!user.data?.user) {
      throw new Error('Not authenticated');
    }

    const { error } = await supabase
      .from('user_settings')
      .update({ encrypted_api_key: null })
      .eq('user_id', user.data.user.id);

    if (error) {
      console.error('Error deleting API key:', error);
      throw new Error('Failed to delete API key');
    }

    console.log('✅ API key deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting API key:', error);
    throw error;
  }
}
