# Serverless Migration Guide - Supabase Only (No Flask)

This guide walks you through migrating Cursive from Flask to a fully serverless architecture using Supabase Edge Functions.

## Why Go Serverless?

**Benefits:**
- ✅ No server to maintain or pay for
- ✅ Auto-scaling (handles traffic spikes automatically)
- ✅ Lower costs (pay per request, not per server hour)
- ✅ Simpler deployment (just push code to Supabase)
- ✅ Built-in monitoring and logs
- ✅ Global edge network (faster for users worldwide)

**Trade-offs:**
- ⚠️ Cold starts (first request may be slower)
- ⚠️ 25s execution limit per function
- ⚠️ Must rewrite Python → TypeScript/Deno

---

## Architecture Comparison

### Before (Flask):
```
Frontend → Flask (Render) → Claude API
           ↓
        PostgreSQL (Supabase)
```
- **Cost:** ~$7-52/month (server always running)
- **Scaling:** Manual (upgrade server tier)
- **Deploy:** Push to Render, restart server

### After (Serverless):
```
Frontend → Edge Functions (Supabase) → Claude API
           ↓
        Supabase (DB + Auth + Storage)
```
- **Cost:** ~$0-25/month (pay per request)
- **Scaling:** Automatic
- **Deploy:** `supabase functions deploy`

---

## Migration Steps

### Phase 1: Setup Supabase Project

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create new project
   - Save your credentials:
     - Project URL
     - Anon key
     - Service role key

2. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

3. **Login and Link Project**
   ```bash
   supabase login
   supabase link --project-ref [YOUR-PROJECT-REF]
   ```

4. **Initialize Local Setup**
   ```bash
   supabase init
   ```

---

### Phase 2: Database Setup

1. **Create Migration File**
   ```bash
   supabase migration new initial_schema
   ```

2. **Add Schema (see below)**
   Edit `supabase/migrations/[timestamp]_initial_schema.sql`

3. **Apply Migrations**
   ```bash
   supabase db push
   ```

---

### Phase 3: Create Edge Functions

Edge Functions replace your Flask routes. They run on Deno (TypeScript runtime).

**Functions Needed:**

1. **`claude-proxy`** - Handles Claude API calls (streaming + non-streaming)
2. **`track-usage`** - Records API usage for billing
3. **`billing-webhook`** - Handles Stripe webhooks
4. **`notebooks`** - CRUD operations for notebooks
5. **`drawings`** - CRUD operations for drawings

**Create them:**
```bash
supabase functions new claude-proxy
supabase functions new track-usage
supabase functions new billing-webhook
supabase functions new notebooks
supabase functions new drawings
```

---

### Phase 4: Frontend Migration

1. **Install Supabase JS Client**
   ```bash
   npm install @supabase/supabase-js
   ```

2. **Replace Flask API Calls**
   - Remove fetch calls to Flask routes
   - Use Supabase client for auth, DB, storage
   - Use Edge Functions for Claude API

3. **Update Authentication**
   - Remove Flask-Login logic
   - Use Supabase Auth (`signUp`, `signIn`, `signOut`)

---

### Phase 5: Deploy

1. **Deploy Edge Functions**
   ```bash
   supabase functions deploy claude-proxy
   supabase functions deploy track-usage
   # ... deploy all functions
   ```

2. **Set Secrets**
   ```bash
   supabase secrets set CLAUDE_API_KEY=sk-ant-...
   supabase secrets set STRIPE_SECRET_KEY=sk_...
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. **Deploy Frontend**
   - Push to Vercel/Netlify
   - Set environment variables

4. **Delete Flask Files** (final step)
   ```bash
   rm proxy.py auth.py billing.py models.py database.py
   rm requirements.txt wsgi.py setup.py
   ```

---

## Database Schema

```sql
-- supabase/migrations/[timestamp]_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (managed by Supabase Auth, but we add custom fields)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  subscription_tier TEXT DEFAULT 'free',
  api_key_encrypted TEXT, -- User's own Claude API key (BYOK)
  stripe_customer_id TEXT,
  token_usage_month INTEGER DEFAULT 0,
  token_limit_month INTEGER DEFAULT 10000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notebooks table
CREATE TABLE notebooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drawings table
CREATE TABLE drawings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stroke_data JSONB NOT NULL,
  transcription TEXT,
  ai_response TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- API Usage table (for billing)
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tokens_used INTEGER NOT NULL,
  model TEXT NOT NULL,
  cost_usd DECIMAL(10, 6) NOT NULL,
  endpoint TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Billing Events table (Stripe webhooks)
CREATE TABLE billing_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Shared Pages table (for shareable URLs)
CREATE TABLE shared_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  page_id TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Notebooks
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notebooks"
  ON notebooks FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create own notebooks"
  ON notebooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notebooks"
  ON notebooks FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notebooks"
  ON notebooks FOR DELETE
  USING (auth.uid() = user_id);

-- Drawings
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own drawings"
  ON drawings FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create own drawings"
  ON drawings FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own drawings"
  ON drawings FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own drawings"
  ON drawings FOR DELETE
  USING (auth.uid() = user_id);

-- API Usage
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage"
  ON api_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Shared Pages
ALTER TABLE shared_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view shared pages"
  ON shared_pages FOR SELECT
  USING (true);
CREATE POLICY "Users can create shared pages"
  ON shared_pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_notebooks_user_id ON notebooks(user_id);
CREATE INDEX idx_drawings_notebook_id ON drawings(notebook_id);
CREATE INDEX idx_drawings_user_id ON drawings(user_id);
CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_api_usage_timestamp ON api_usage(timestamp);
CREATE INDEX idx_shared_pages_page_id ON shared_pages(page_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notebooks_updated_at BEFORE UPDATE ON notebooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Edge Function Examples

### 1. Claude API Proxy (`claude-proxy`)

```typescript
// supabase/functions/claude-proxy/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get user from JWT token
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get user profile (check for BYOK)
    const { data: profile } = await supabase
      .from('profiles')
      .select('api_key_encrypted, subscription_tier, token_usage_month, token_limit_month')
      .eq('id', user.id)
      .single()

    // Check usage limits
    if (!profile?.api_key_encrypted && profile?.token_usage_month >= profile?.token_limit_month) {
      return new Response(JSON.stringify({ error: 'Token limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get API key (user's or server's)
    const apiKey = profile?.api_key_encrypted
      ? await decrypt(profile.api_key_encrypted) // Implement decryption
      : Deno.env.get('CLAUDE_API_KEY')

    // Parse request
    const body = await req.json()
    const { messages, model, max_tokens, stream } = body

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens,
        messages,
        stream: stream ?? false,
      }),
    })

    if (stream) {
      // Stream response back to client
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
        },
      })
    } else {
      // Return JSON response
      const data = await response.json()

      // Track usage asynchronously (don't wait)
      trackUsage(user.id, data.usage.input_tokens + data.usage.output_tokens, model)

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function trackUsage(userId: string, tokens: number, model: string) {
  // Call track-usage function asynchronously
  fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/track-usage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_KEY')}`,
    },
    body: JSON.stringify({ userId, tokens, model }),
  }).catch(console.error)
}

async function decrypt(encrypted: string): Promise<string> {
  // Implement decryption (use Web Crypto API or a library)
  // For now, return as-is (you'll implement this)
  return encrypted
}
```

### 2. Usage Tracking (`track-usage`)

```typescript
// supabase/functions/track-usage/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PRICING = {
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
}

serve(async (req) => {
  try {
    const { userId, tokens, model } = await req.json()

    // Calculate cost
    const pricing = PRICING[model] || PRICING['claude-3-5-sonnet-20241022']
    const cost = (tokens / 1000) * ((pricing.input + pricing.output) / 2) // Simplified

    // Create Supabase admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''
    )

    // Insert usage record
    await supabase.from('api_usage').insert({
      user_id: userId,
      tokens_used: tokens,
      model,
      cost_usd: cost,
      endpoint: '/claude-proxy',
    })

    // Update user's monthly usage
    await supabase.rpc('increment_token_usage', {
      user_id: userId,
      tokens: tokens,
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

**Add this SQL function for incrementing usage:**
```sql
CREATE OR REPLACE FUNCTION increment_token_usage(user_id UUID, tokens INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET token_usage_month = token_usage_month + tokens
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Frontend Migration

### Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### Create Supabase Client

```javascript
// static/js/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Update Authentication

```javascript
// static/js/auth.js
import { supabase } from './supabaseClient.js'

// Sign up
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  if (error) throw error
  return data
}

// Sign in
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Listen for auth changes
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
}
```

### Update AI Service

```javascript
// static/js/aiService.js
import { supabase } from './supabaseClient.js'

export async function sendImageToAI(imageData) {
  // Get current session
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  // Call Edge Function
  const { data, error } = await supabase.functions.invoke('claude-proxy', {
    body: {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: imageData.split(',')[1],
            },
          },
          {
            type: 'text',
            text: 'Transcribe the handwritten text in this image.',
          },
        ],
      }],
    },
  })

  if (error) throw error
  return data.content[0].text
}

export async function sendChatToAI(messages, onChunk) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  // For streaming, use fetch directly to Edge Function URL
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude-proxy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages,
        stream: true,
      }),
    }
  )

  // Handle streaming response
  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6))
        if (data.type === 'content_block_delta') {
          onChunk(data.delta.text)
        }
      }
    }
  }
}
```

### Update Data Manager

```javascript
// static/js/dataManager.js
import { supabase } from './supabaseClient.js'

// Create notebook
export async function createNotebook(title) {
  const { data, error } = await supabase
    .from('notebooks')
    .insert({ title })
    .select()
    .single()

  if (error) throw error
  return data
}

// Get all notebooks
export async function getNotebooks() {
  const { data, error } = await supabase
    .from('notebooks')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data
}

// Save drawing
export async function saveDrawing(notebookId, strokeData, transcription, aiResponse) {
  const { data, error } = await supabase
    .from('drawings')
    .insert({
      notebook_id: notebookId,
      stroke_data: strokeData,
      transcription,
      ai_response: aiResponse,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Get drawings for notebook
export async function getDrawings(notebookId) {
  const { data, error } = await supabase
    .from('drawings')
    .select('*')
    .eq('notebook_id', notebookId)
    .order('timestamp', { ascending: true })

  if (error) throw error
  return data
}
```

---

## Deployment Steps

### 1. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy claude-proxy
supabase functions deploy track-usage
supabase functions deploy billing-webhook

# Set secrets
supabase secrets set CLAUDE_API_KEY=sk-ant-...
supabase secrets set STRIPE_SECRET_KEY=sk_...
```

### 2. Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Test Everything

- [ ] Sign up new user
- [ ] Create notebook
- [ ] Draw and get OCR transcription
- [ ] Send chat message
- [ ] Check Supabase dashboard for data

---

## Cost Comparison

### Serverless (Supabase):
- **Supabase Pro:** $25/month
  - Unlimited Edge Function invocations
  - 8GB database
  - 100GB storage
- **Edge Functions:** Free (included in Pro)
- **Estimated total:** $25/month

### Flask (Previous):
- **Render/Railway:** $7-25/month
- **Supabase:** $0-25/month (just for DB)
- **Estimated total:** $7-50/month

**Savings:** ~$0-25/month + no server management

---

## Troubleshooting

### Edge Function errors
- Check logs: `supabase functions logs claude-proxy`
- Ensure secrets are set: `supabase secrets list`

### CORS issues
- Ensure `corsHeaders` are set in all Edge Functions
- Handle OPTIONS requests

### Authentication errors
- Check JWT token is being sent
- Verify Supabase URL and keys in `.env`

---

## Next Steps After Migration

1. **Delete Flask files** (safe to remove after testing)
2. **Set up monitoring** (Supabase has built-in logs)
3. **Configure custom domain** (Vercel + Supabase)
4. **Add Stripe billing** (webhook Edge Function)
5. **Launch!** 🚀

---

**Questions? Check:**
- Supabase Edge Functions docs: https://supabase.com/docs/guides/functions
- Deno docs: https://deno.land/manual
- Supabase Auth docs: https://supabase.com/docs/guides/auth
