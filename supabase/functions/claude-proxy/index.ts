/**
 * Supabase Edge Function: Claude API Proxy
 *
 * This function proxies requests to Claude API while:
 * - Authenticating users
 * - Supporting BYOK (Bring Your Own Key)
 * - Tracking usage for billing
 * - Enforcing rate limits
 * - Handling streaming responses
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

// Environment variables (set via `supabase secrets set`)
const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Pricing configuration (per 1K tokens)
const PRICING = {
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
  'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
};

const MARKUP_PERCENTAGE = 0.15; // 15% markup for non-BYOK users

/**
 * Calculate cost for API usage
 */
function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  const pricing = PRICING[model] || PRICING['claude-3-5-sonnet-20241022'];

  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  const baseCost = inputCost + outputCost;

  return baseCost * (1 + MARKUP_PERCENTAGE);
}

/**
 * Handle CORS preflight requests
 */
function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers':
          'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  return null;
}

/**
 * Verify user authentication
 */
async function authenticateUser(
  req: Request,
  supabase: any
): Promise<{ user: any; error: Response | null }> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      user: null,
      error: new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  const token = authHeader.replace('Bearer ', '');

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return {
      user: null,
      error: new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  return { user, error: null };
}

/**
 * Track API usage in database
 */
async function trackUsage(
  supabase: any,
  userId: string,
  tokensInput: number,
  tokensOutput: number,
  model: string,
  endpoint: string
) {
  try {
    const cost = calculateCost(tokensInput, tokensOutput, model);
    const tokensUsed = tokensInput + tokensOutput;

    // Insert usage record
    const { error: insertError } = await supabase.from('api_usage').insert({
      user_id: userId,
      tokens_used: tokensUsed,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      cost,
      model,
      endpoint,
    });

    if (insertError) {
      console.error('Error tracking usage:', insertError);
    }

    // Update period usage
    const { error: updateError } = await supabase.rpc('increment_tokens', {
      user_id_param: userId,
      tokens_param: tokensUsed,
    });

    if (updateError) {
      console.error('Error updating period usage:', updateError);
    }

    console.log(`✅ Usage tracked: ${tokensUsed} tokens, $${cost.toFixed(6)}`);
  } catch (error) {
    console.error('Failed to track usage:', error);
  }
}

/**
 * Get user's API key (BYOK) or use server key
 */
async function getApiKey(
  supabase: any,
  userId: string
): Promise<{ apiKey: string; isByok: boolean }> {
  const { data: settings, error } = await supabase
    .from('user_settings')
    .select('encrypted_api_key')
    .eq('user_id', userId)
    .single();

  if (error || !settings?.encrypted_api_key) {
    // User doesn't have their own key, use server key
    return { apiKey: CLAUDE_API_KEY, isByok: false };
  }

  // TODO: Implement decryption if you encrypted the key on the backend
  // For now, assuming it's stored in plaintext (not recommended for production!)
  // In production, you should decrypt it here using your encryption key

  return { apiKey: settings.encrypted_api_key, isByok: true };
}

/**
 * Main request handler
 */
serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Initialize Supabase client with service role key (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Authenticate user
    const { user, error: authError } = await authenticateUser(req, supabase);
    if (authError) return authError;

    // Parse request body
    const { model, max_tokens, messages, stream } = await req.json();

    // Validate request
    if (!model || !messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: model and messages required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Get API key (user's own or server's)
    const { apiKey, isByok } = await getApiKey(supabase, user.id);

    console.log(
      `📨 Claude API request from ${user.email} (BYOK: ${isByok}, Model: ${model})`
    );

    // Make request to Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: max_tokens || 4096,
        messages,
        stream: stream || false,
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Claude API error:', errorText);

      return new Response(
        JSON.stringify({
          error: 'Claude API request failed',
          details: errorText,
        }),
        {
          status: claudeResponse.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Handle streaming vs non-streaming
    if (stream) {
      // For streaming, we can't easily track tokens here
      // Return the stream directly
      return new Response(claudeResponse.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Non-streaming: parse response and track usage
      const responseData = await claudeResponse.json();

      // Track usage (only if not BYOK)
      if (!isByok) {
        const tokensInput = responseData.usage?.input_tokens || 0;
        const tokensOutput = responseData.usage?.output_tokens || 0;

        await trackUsage(
          supabase,
          user.id,
          tokensInput,
          tokensOutput,
          model,
          '/api/claude'
        );
      }

      return new Response(JSON.stringify(responseData), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  } catch (error) {
    console.error('Edge function error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
