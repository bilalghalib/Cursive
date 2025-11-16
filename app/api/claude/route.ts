import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const getAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  return new Anthropic({ apiKey });
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, max_tokens, messages, stream } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array required' },
        { status: 400 }
      );
    }

    const anthropic = getAnthropicClient();

    // Handle streaming requests
    if (stream) {
      const stream = await anthropic.messages.stream({
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: max_tokens || 4096,
        messages: messages,
      });

      // Create a ReadableStream for SSE
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of stream) {
              // Send each event as Server-Sent Event format
              const data = JSON.stringify(event);
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            controller.error(error);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Handle non-streaming requests
    const response = await anthropic.messages.create({
      model: model || 'claude-3-5-sonnet-20241022',
      max_tokens: max_tokens || 4096,
      messages: messages,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Claude API error:', error);

    // Return appropriate error response
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: error.response?.data || null,
      },
      { status: error.status || 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
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
