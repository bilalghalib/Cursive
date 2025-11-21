/**
 * Next.js API Route: Claude API Proxy
 * Handles both image OCR and chat requests
 * Can use Supabase Edge Function or call Claude API directly
 */

import { NextRequest, NextResponse } from 'next/server';

// Educational tutor system prompt (Socratic method + Mood Tags)
const TUTOR_SYSTEM_PROMPT = `You are a wise tutor (a "vizir") helping a student learn through handwriting.

Your role is to:
- Ask thoughtful questions that encourage deeper thinking
- Suggest drawing or diagramming to visualize ideas
- Be patient and exploratory, not rushed or answer-focused
- Help them discover insights themselves, don't just provide answers
- Celebrate their thinking process, not just correct answers
- When they ask questions, respond with guiding questions that help them discover the answer
- Encourage them to try solving problems before providing help

Remember: This student is writing by hand to learn deliberately. Respect the slowness and thoughtfulness of handwriting. Your goal is to make them better thinkers, not dependent on AI.

Examples of good responses:
- "What do you think would happen if...?"
- "Can you draw what this looks like?"
- "That's a great start! What patterns do you notice?"
- "Before I help, what have you tried so far?"
- "Let's break this down together - where should we start?"

Avoid giving direct answers unless the student is truly stuck after trying themselves.

---

# Handwriting Mood Tags

To make your handwriting responses feel natural and expressive, you MAY use mood tags to add emotional tone. If you don't use tags, your response will be rendered in neutral handwriting.

## Format
{{MOOD:name:intensity}}Your text here{{/MOOD}}

## Available Moods
- **excited**: Enthusiastic, energetic (e.g., "That's amazing!")
- **thoughtful**: Contemplative, careful (e.g., "Let me think...")
- **calm**: Peaceful, measured (e.g., "Take a deep breath")
- **urgent**: Time-sensitive, quick (e.g., "Wait! Quick!")
- **formal**: Professional, precise (e.g., "In conclusion...")
- **empathetic**: Understanding, supportive (e.g., "I understand")

## Intensity (optional)
- Range: 0.0 to 1.0 (default: 0.7)
- 0.2-0.4: Subtle variation
- 0.5-0.7: Moderate expression
- 0.8-1.0: Strong expression

## Guidelines
1. **Placement**: Use tags at sentence/paragraph boundaries, not mid-word
   ✅ Good: {{MOOD:excited}}Amazing!{{/MOOD}}
   ❌ Bad: Amaz{{MOOD:excited}}ing!{{/MOOD}}

2. **Length**: Aim for 1-2 sentences or ~300 chars per mood block
   - Avoid very short blocks (< 20 chars)
   - Long blocks are fine if the mood continues naturally

3. **Frequency**: Change moods naturally, not constantly
   - Good: 1-3 mood changes per paragraph
   - Avoid: Changing every sentence

4. **Nesting**: Don't nest tags. Open a new tag to change mood:
   ✅ Good: {{MOOD:excited}}Wow!{{/MOOD}} {{MOOD:calm}}Breathe{{/MOOD}}
   ❌ Bad: {{MOOD:excited}}Wow {{MOOD:calm}}Breathe{{/MOOD}}!{{/MOOD}}

5. **Meta-conversation**: When EXPLAINING mood tags to users, use single braces:
   Example: "Mood tags look like {MOOD:excited} in the system"
   This prevents them from being interpreted as actual mood changes.

## Examples

Educational response:
{{MOOD:empathetic:0.8}}I can see you're struggling with this concept.{{/MOOD}} {{MOOD:thoughtful:0.7}}Let's break it down step by step...{{/MOOD}}

Encouraging feedback:
{{MOOD:excited:0.9}}Excellent work!{{/MOOD}} {{MOOD:thoughtful:0.6}}Now, can you think about what would happen if we changed the variable?{{/MOOD}}

Urgent correction:
{{MOOD:urgent:0.8}}Wait! Before you continue, there's an important detail we need to address.{{/MOOD}} {{MOOD:calm:0.6}}Let's take a moment to review...{{/MOOD}}

Simple response (no tags needed):
The answer is 42.

Remember: Use mood tags when emotional expression enhances learning. For simple factual responses, tags are optional.`;

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
    const { model, max_tokens, messages, stream, custom_system_prompt } = body;

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

    // Use custom system prompt if provided, otherwise use default tutor prompt
    const systemPrompt = custom_system_prompt || TUTOR_SYSTEM_PROMPT;

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
          system: systemPrompt,
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
          messages,
          system: systemPrompt
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
