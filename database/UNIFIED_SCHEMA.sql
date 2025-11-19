-- ============================================================================
-- CURSIVE - UNIFIED DATABASE SCHEMA (Canonical Version)
-- ============================================================================
-- This is the CORRECT and COMPLETE schema for Cursive.
-- Architecture: Next.js + Supabase Auth + PostgreSQL
-- All tables use UUID and reference auth.users(id) from Supabase Auth
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: notebooks
-- Stores collections of drawings (notebooks/canvases)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notebooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Notebook',
  description TEXT,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  share_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notebooks_user_id ON public.notebooks(user_id);
CREATE INDEX IF NOT EXISTS idx_notebooks_updated_at ON public.notebooks(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notebooks_share_id ON public.notebooks(share_id) WHERE share_id IS NOT NULL;

COMMENT ON TABLE public.notebooks IS 'User notebooks containing collections of drawings';
COMMENT ON COLUMN public.notebooks.user_id IS 'References Supabase auth.users(id)';
COMMENT ON COLUMN public.notebooks.share_id IS 'Public share ID for shareable notebooks';

-- ============================================================================
-- TABLE: drawings
-- Stores individual drawings/strokes with AI interactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.drawings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notebook_id UUID NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  stroke_data JSONB,
  transcription TEXT,
  ai_response TEXT,
  drawing_type TEXT NOT NULL DEFAULT 'handwriting' CHECK (drawing_type IN ('handwriting', 'typed', 'shape')),
  canvas_state JSONB,
  is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_drawings_notebook_id ON public.drawings(notebook_id);
CREATE INDEX IF NOT EXISTS idx_drawings_created_at ON public.drawings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drawings_is_ai ON public.drawings(is_ai_generated);

COMMENT ON TABLE public.drawings IS 'Individual drawings with stroke data and AI interactions';
COMMENT ON COLUMN public.drawings.stroke_data IS 'JSON containing canvas stroke data with pressure';
COMMENT ON COLUMN public.drawings.transcription IS 'OCR text from handwriting';
COMMENT ON COLUMN public.drawings.ai_response IS 'AI response to the drawing/text';
COMMENT ON COLUMN public.drawings.is_ai_generated IS 'TRUE if this drawing was created by AI (for hide/show toggle)';

-- ============================================================================
-- TABLE: user_handwriting
-- Stores user's handwriting samples and style profile for AI mimicry
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_handwriting (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  samples JSONB,
  style_profile JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_handwriting_user_id ON public.user_handwriting(user_id);

COMMENT ON TABLE public.user_handwriting IS 'Stores user handwriting samples and style profiles for AI writeback';
COMMENT ON COLUMN public.user_handwriting.samples IS 'Raw stroke data collected during training';
COMMENT ON COLUMN public.user_handwriting.style_profile IS 'Analyzed style parameters (slant, spacing, messiness)';

-- ============================================================================
-- TABLE: api_usage
-- Track API usage for billing and analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tokens_used INTEGER NOT NULL,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  cost NUMERIC(10, 6) NOT NULL,
  model TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_usage_user_created ON public.api_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON public.api_usage(created_at DESC);

COMMENT ON TABLE public.api_usage IS 'Track API usage for billing and analytics';
COMMENT ON COLUMN public.api_usage.cost IS 'Calculated cost in USD';

-- ============================================================================
-- TABLE: user_settings
-- User-specific settings, subscription, and BYOK API keys
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_api_key TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  subscription_status TEXT NOT NULL DEFAULT 'inactive',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  tokens_used_this_period INTEGER NOT NULL DEFAULT 0,
  -- Educational features
  user_type TEXT NOT NULL DEFAULT 'student' CHECK (user_type IN ('student', 'parent', 'teacher', 'school', 'individual')),
  hide_ai_responses BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_settings_stripe_customer ON public.user_settings(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

COMMENT ON TABLE public.user_settings IS 'User settings, subscription, and BYOK API keys';
COMMENT ON COLUMN public.user_settings.encrypted_api_key IS 'Encrypted Anthropic API key (BYOK)';
COMMENT ON COLUMN public.user_settings.user_type IS 'Educational role: student, parent, teacher, school, or individual';
COMMENT ON COLUMN public.user_settings.hide_ai_responses IS 'User preference to hide AI responses by default';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_handwriting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- NOTEBOOKS POLICIES
-- ============================================================================

-- Users can view their own notebooks OR shared notebooks
CREATE POLICY "Users can view own or shared notebooks"
  ON public.notebooks FOR SELECT
  USING (auth.uid() = user_id OR is_shared = TRUE);

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

-- ============================================================================
-- DRAWINGS POLICIES
-- ============================================================================

-- Users can view drawings in their own notebooks OR in shared notebooks
CREATE POLICY "Users can view drawings in accessible notebooks"
  ON public.drawings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = drawings.notebook_id
      AND (notebooks.user_id = auth.uid() OR notebooks.is_shared = TRUE)
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

-- ============================================================================
-- USER_HANDWRITING POLICIES
-- ============================================================================

-- Users can only read their own handwriting
CREATE POLICY "Users can read own handwriting"
  ON public.user_handwriting FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own handwriting
CREATE POLICY "Users can insert own handwriting"
  ON public.user_handwriting FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own handwriting
CREATE POLICY "Users can update own handwriting"
  ON public.user_handwriting FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own handwriting
CREATE POLICY "Users can delete own handwriting"
  ON public.user_handwriting FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- API_USAGE POLICIES
-- ============================================================================

-- Users can only view their own API usage
CREATE POLICY "Users can view own api usage"
  ON public.api_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Insert is handled by Edge Function with service role key
-- No public INSERT policy needed

-- ============================================================================
-- USER_SETTINGS POLICIES
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

-- Trigger: Update user_handwriting.updated_at
DROP TRIGGER IF EXISTS update_user_handwriting_updated_at ON public.user_handwriting;
CREATE TRIGGER update_user_handwriting_updated_at
  BEFORE UPDATE ON public.user_handwriting
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
  -- Create user_settings record for new user with default preferences
  INSERT INTO public.user_settings (user_id, subscription_tier, tokens_used_this_period, user_type, hide_ai_responses)
  VALUES (NEW.id, 'free', 0, 'student', FALSE);

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
-- Schema is now ready. All tables use UUID and reference auth.users(id).
-- Educational features added: user_type, hide_ai_responses, is_ai_generated
-- ============================================================================
