/**
 * Next.js API Route: Claude API Proxy
 * Handles both image OCR and chat requests
 * Can use Supabase Edge Function or call Claude API directly
 */

import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_MODELS = [
  'claude-sonnet-4-5',
  'claude-sonnet-4-5-20250929',
  'claude-haiku-4-5',
  'claude-haiku-4-5-20251001',
  'claude-opus-4-1',
  'claude-opus-4-1-20250805',
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307'
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, max_tokens, messages, stream } = body;

    // Validate model
    if (!model || !ALLOWED_MODELS.includes(model)) {
      return NextResponse.json(
        {
          error: 'Invalid model',
          details: { model: [`Must be one of: ${ALLOWED_MODELS.join(', ')}`] }
        },
        { status: 400 }
      );
    }

    // Validate max_tokens
    if (!max_tokens || max_tokens < 1 || max_tokens > 4096) {
      return NextResponse.json(
        {
          error: 'Invalid max_tokens',
          details: { max_tokens: ['Must be between 1 and 4096'] }
        },
        { status: 400 }
      );
    }

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Check if we should use Supabase Edge Function or direct API call
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    // Option 1: Use Supabase Edge Function (if configured)
    if (supabaseUrl && supabaseAnonKey) {
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/claude-proxy`;

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          model,
          max_tokens,
          messages,
          stream: stream || false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json(errorData, { status: response.status });
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    // Option 2: Call Claude API directly (if API key is set)
    if (anthropicApiKey) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens,
          messages
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json(errorData, { status: response.status });
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    // No configuration found
    return NextResponse.json(
      {
        error: 'No API configuration found',
        details: 'Please set either NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY or ANTHROPIC_API_KEY in your environment variables'
      },
      { status: 500 }
    );

  } catch (error) {
    console.error('Error in Claude API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
