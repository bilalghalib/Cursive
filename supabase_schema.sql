-- ============================================================================
-- CURSIVE - SUPABASE DATABASE SCHEMA
-- ============================================================================
-- Run this SQL in your Supabase Dashboard > SQL Editor
-- This creates all tables, indexes, RLS policies, and triggers
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- NOTEBOOKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notebooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_shared BOOLEAN DEFAULT FALSE,
  share_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_notebooks_user_id ON public.notebooks(user_id);
CREATE INDEX IF NOT EXISTS idx_notebooks_updated_at ON public.notebooks(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notebooks_share_id ON public.notebooks(share_id) WHERE share_id IS NOT NULL;

COMMENT ON TABLE public.notebooks IS 'User notebooks containing collections of drawings';
COMMENT ON COLUMN public.notebooks.share_id IS 'Public share ID for shareable notebooks';

-- ============================================================================
-- DRAWINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.drawings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE NOT NULL,
  stroke_data JSONB,
  transcription TEXT,
  ai_response TEXT,
  drawing_type TEXT DEFAULT 'handwriting' CHECK (drawing_type IN ('handwriting', 'typed', 'shape')),
  canvas_state JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_drawings_notebook_id ON public.drawings(notebook_id);
CREATE INDEX IF NOT EXISTS idx_drawings_created_at ON public.drawings(created_at DESC);

COMMENT ON TABLE public.drawings IS 'Individual drawings with stroke data and AI interactions';
COMMENT ON COLUMN public.drawings.stroke_data IS 'JSON containing canvas stroke data';
COMMENT ON COLUMN public.drawings.transcription IS 'OCR text from handwriting';
COMMENT ON COLUMN public.drawings.ai_response IS 'AI response to the drawing/text';

-- ============================================================================
-- API USAGE TABLE (for billing and analytics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tokens_used INTEGER NOT NULL,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  cost NUMERIC(10, 6) NOT NULL,
  model TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_api_usage_user_created ON public.api_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON public.api_usage(created_at DESC);

COMMENT ON TABLE public.api_usage IS 'Track API usage for billing and analytics';
COMMENT ON COLUMN public.api_usage.cost IS 'Calculated cost in USD';

-- ============================================================================
-- USER SETTINGS TABLE (for BYOK and subscription info)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_api_key TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  subscription_status TEXT DEFAULT 'inactive',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  tokens_used_this_period INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_stripe_customer ON public.user_settings(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

COMMENT ON TABLE public.user_settings IS 'User-specific settings, subscription, and BYOK API keys';
COMMENT ON COLUMN public.user_settings.encrypted_api_key IS 'Encrypted Anthropic API key (BYOK)';
COMMENT ON COLUMN public.user_settings.tokens_used_this_period IS 'Tokens used in current billing period';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- NOTEBOOKS POLICIES
-- ============================================================================

-- Users can view their own notebooks
CREATE POLICY "Users can view own notebooks"
  ON public.notebooks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own notebooks
CREATE POLICY "Users can insert own notebooks"
  ON public.notebooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own notebooks
CREATE POLICY "Users can update own notebooks"
  ON public.notebooks FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notebooks
CREATE POLICY "Users can delete own notebooks"
  ON public.notebooks FOR DELETE
  USING (auth.uid() = user_id);

-- Anyone can view shared notebooks (public sharing)
CREATE POLICY "Anyone can view shared notebooks"
  ON public.notebooks FOR SELECT
  USING (is_shared = TRUE);

-- ============================================================================
-- DRAWINGS POLICIES
-- ============================================================================

-- Users can view drawings in their own notebooks
CREATE POLICY "Users can view drawings in own notebooks"
  ON public.drawings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = drawings.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

-- Users can insert drawings in their own notebooks
CREATE POLICY "Users can insert drawings in own notebooks"
  ON public.drawings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = drawings.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

-- Users can update drawings in their own notebooks
CREATE POLICY "Users can update drawings in own notebooks"
  ON public.drawings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = drawings.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

-- Users can delete drawings in their own notebooks
CREATE POLICY "Users can delete drawings in own notebooks"
  ON public.drawings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = drawings.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

-- Anyone can view drawings in shared notebooks
CREATE POLICY "Anyone can view drawings in shared notebooks"
  ON public.drawings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = drawings.notebook_id
      AND notebooks.is_shared = TRUE
    )
  );

-- ============================================================================
-- API USAGE POLICIES
-- ============================================================================

-- Users can only view their own API usage
CREATE POLICY "Users can view own api usage"
  ON public.api_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Note: INSERT is handled by Edge Function with service role key
-- No public INSERT policy needed

-- ============================================================================
-- USER SETTINGS POLICIES
-- ============================================================================

-- Users can view their own settings
CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update notebooks.updated_at
DROP TRIGGER IF EXISTS update_notebooks_updated_at ON public.notebooks;
CREATE TRIGGER update_notebooks_updated_at
  BEFORE UPDATE ON public.notebooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update user_settings.updated_at
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Auto-create user_settings on signup
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user_settings record for new user
  INSERT INTO public.user_settings (user_id, subscription_tier, tokens_used_this_period)
  VALUES (NEW.id, 'free', 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create user_settings when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- Function: Increment tokens used (for billing)
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_tokens(user_id_param UUID, tokens_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_total INTEGER;
BEGIN
  UPDATE public.user_settings
  SET tokens_used_this_period = tokens_used_this_period + tokens_param
  WHERE user_id = user_id_param
  RETURNING tokens_used_this_period INTO new_total;

  RETURN new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Reset monthly tokens (call this monthly via cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_monthly_tokens()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  UPDATE public.user_settings
  SET
    tokens_used_this_period = 0,
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '30 days'
  WHERE current_period_end < NOW();

  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMPLETE! 🎉
-- ============================================================================
-- Your Supabase database is now ready for Cursive!
--
-- Next steps:
-- 1. Go to Supabase Dashboard > Database > Cron Jobs
-- 2. Create a monthly job to run: SELECT reset_monthly_tokens();
-- 3. Enable Email Auth in Authentication > Providers
-- 4. Deploy the Edge Function (see supabase/functions/claude-proxy/)
-- ============================================================================
