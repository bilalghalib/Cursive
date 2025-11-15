/**
 * Supabase Edge Function: Claude API Proxy
 * Replaces Flask proxy.py - handles Claude API requests securely
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ALLOWED_MODELS = [
  // Claude 4.5 models (latest)
  'claude-sonnet-4-5',
  'claude-sonnet-4-5-20250929',
  'claude-haiku-4-5',
  'claude-haiku-4-5-20251001',
  'claude-opus-4-1',
  'claude-opus-4-1-20250805',
  // Claude 3.5 models (legacy)
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307'
]

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get user from JWT (if authenticated)
    const authHeader = req.headers.get('Authorization')
    let userId: string | null = null
    let userApiKey: string | null = null

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      const { data: { user }, error } = await supabase.auth.getUser(token)

      if (!error && user) {
        userId = user.id

        // Check if user has their own API key
        const { data: userData } = await supabase
          .from('users')
          .select('encrypted_api_key')
          .eq('id', userId)
          .single()

        if (userData?.encrypted_api_key) {
          // TODO: Decrypt user's API key if they have one
          userApiKey = null  // For now, always use server key
        }
      }
    }

    // Parse request body
    const body = await req.json()
    const { model, max_tokens, messages } = body

    // Validate model
    if (!ALLOWED_MODELS.includes(model)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid model',
          details: { model: [`Must be one of: ${ALLOWED_MODELS.join(', ')}`] }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate max_tokens
    if (max_tokens < 1 || max_tokens > 4096) {
      return new Response(
        JSON.stringify({
          error: 'Invalid max_tokens',
          details: { max_tokens: ['Must be between 1 and 4096'] }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Use user's API key if available, otherwise use server key
    const apiKey = userApiKey || CLAUDE_API_KEY

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens,
        messages
      })
    })

    const data = await response.json()

    // Track usage for billing (if using server API key and user is authenticated)
    if (userId && !userApiKey && data.usage) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      // Calculate cost (Anthropic pricing)
      const inputCost = (data.usage.input_tokens / 1000000) * 3  // $3 per 1M tokens
      const outputCost = (data.usage.output_tokens / 1000000) * 15  // $15 per 1M tokens
      const totalCost = inputCost + outputCost

      await supabase.from('api_usage').insert({
        user_id: userId,
        tokens_used: data.usage.input_tokens + data.usage.output_tokens,
        tokens_input: data.usage.input_tokens,
        tokens_output: data.usage.output_tokens,
        cost: totalCost,
        model,
        endpoint: '/functions/v1/claude-proxy',
        created_at: new Date().toISOString()
      })
    }

    return new Response(
      JSON.stringify(data),
      {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
