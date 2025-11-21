-- ============================================================================
-- CURSIVE - VALUES ALIGNMENT MIGRATION
-- Created: 2025-11-21
-- ============================================================================
-- This migration aligns the database with Cursive's core educational values:
-- 1. Handwriting as Human Experience
-- 2. Learning Through Deliberate Practice
-- 3. Educational Integrity (hide AI, export clean work)
-- 4. Transparent AI (visible system prompts)
-- 5. Handwriting Literacy
--
-- BREAKING CHANGES:
-- - Drops public.users table (uses auth.users instead)
-- - Changes all IDs from INTEGER to UUID
-- - Adds educational columns: is_ai_generated, user_type, hide_ai_responses
-- - Separates billing table (for Stripe webhook pattern)
--
-- ⚠️ WARNING: This will DELETE all existing data. Run only on clean database.
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STEP 1: DROP OLD TABLES (clean slate)
-- ============================================================================

DROP TABLE IF EXISTS public.api_usage CASCADE;
DROP TABLE IF EXISTS public.billing CASCADE;
DROP TABLE IF EXISTS public.drawings CASCADE;
DROP TABLE IF EXISTS public.notebooks CASCADE;
DROP TABLE IF EXISTS public.user_handwriting CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.users CASCADE; -- Anti-pattern - we use auth.users

-- ============================================================================
-- TABLE: notebooks
-- Stores collections of drawings (notebooks/canvases)
-- ============================================================================
CREATE TABLE public.notebooks (
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
CREATE INDEX idx_notebooks_user_id ON public.notebooks(user_id);
CREATE INDEX idx_notebooks_updated_at ON public.notebooks(updated_at DESC);
CREATE INDEX idx_notebooks_share_id ON public.notebooks(share_id) WHERE share_id IS NOT NULL;

COMMENT ON TABLE public.notebooks IS 'User notebooks containing collections of drawings';
COMMENT ON COLUMN public.notebooks.user_id IS 'References Supabase auth.users(id) - NO public.users table';
COMMENT ON COLUMN public.notebooks.share_id IS 'Public share ID for shareable notebooks';

-- ============================================================================
-- TABLE: drawings
-- Individual strokes/drawings with AI interactions
-- ============================================================================
CREATE TABLE public.drawings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notebook_id UUID NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  stroke_data JSONB,
  transcription TEXT,
  ai_response TEXT,
  drawing_type TEXT NOT NULL DEFAULT 'handwriting' CHECK (drawing_type IN ('handwriting', 'typed', 'shape')),
  canvas_state JSONB,

  -- EDUCATIONAL INTEGRITY (Value #3)
  is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_drawings_notebook_id ON public.drawings(notebook_id);
CREATE INDEX idx_drawings_created_at ON public.drawings(created_at DESC);
CREATE INDEX idx_drawings_is_ai ON public.drawings(is_ai_generated);

COMMENT ON TABLE public.drawings IS 'Individual drawings with stroke data and AI interactions';
COMMENT ON COLUMN public.drawings.stroke_data IS 'JSON containing canvas stroke data with pressure';
COMMENT ON COLUMN public.drawings.transcription IS 'OCR text from handwriting';
COMMENT ON COLUMN public.drawings.ai_response IS 'AI response to the drawing/text';
COMMENT ON COLUMN public.drawings.is_ai_generated IS 'TRUE if AI created this (for Student Mode hide/show toggle)';

-- ============================================================================
-- TABLE: user_handwriting
-- User handwriting samples and style profile for AI mimicry
-- ============================================================================
CREATE TABLE public.user_handwriting (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  samples JSONB,
  style_profile JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_user_handwriting_user_id ON public.user_handwriting(user_id);

COMMENT ON TABLE public.user_handwriting IS 'Stores user handwriting samples and style profiles for AI writeback';
COMMENT ON COLUMN public.user_handwriting.samples IS 'Raw stroke data collected during training';
COMMENT ON COLUMN public.user_handwriting.style_profile IS 'Analyzed style parameters (slant, spacing, messiness)';

-- ============================================================================
-- TABLE: api_usage
-- Track API usage for billing and analytics
-- ============================================================================
CREATE TABLE public.api_usage (
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
CREATE INDEX idx_api_usage_user_created ON public.api_usage(user_id, created_at DESC);
CREATE INDEX idx_api_usage_created_at ON public.api_usage(created_at DESC);

COMMENT ON TABLE public.api_usage IS 'Track API usage for billing and analytics';
COMMENT ON COLUMN public.api_usage.cost IS 'Calculated cost in USD';

-- ============================================================================
-- TABLE: user_settings
-- User preferences, subscription, BYOK API keys
-- ============================================================================
CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_api_key TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),

  -- EDUCATIONAL FEATURES (Values #2, #3)
  user_type TEXT NOT NULL DEFAULT 'student' CHECK (user_type IN ('student', 'parent', 'teacher', 'school', 'individual')),
  hide_ai_responses BOOLEAN NOT NULL DEFAULT FALSE,

  -- TRANSPARENT AI (Value #4)
  custom_system_prompt TEXT, -- User can customize AI tutor behavior

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_user_settings_user_type ON public.user_settings(user_type);

COMMENT ON TABLE public.user_settings IS 'User settings and preferences (billing moved to separate table)';
COMMENT ON COLUMN public.user_settings.encrypted_api_key IS 'Encrypted Anthropic API key (BYOK)';
COMMENT ON COLUMN public.user_settings.user_type IS 'Educational role: student, parent, teacher, school, individual';
COMMENT ON COLUMN public.user_settings.hide_ai_responses IS 'User preference to hide AI responses by default (Student Mode)';
COMMENT ON COLUMN public.user_settings.custom_system_prompt IS 'User-customized system prompt (overrides default tutor prompt)';

-- ============================================================================
-- TABLE: billing (SEPARATE for Stripe Webhook Pattern)
-- ============================================================================
CREATE TABLE public.billing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe IDs
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,

  -- Subscription status
  subscription_status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'canceled', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,

  -- Usage tracking (reset monthly)
  tokens_used_this_period INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_billing_user_id ON public.billing(user_id);
CREATE INDEX idx_billing_stripe_customer ON public.billing(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_billing_stripe_subscription ON public.billing(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

COMMENT ON TABLE public.billing IS 'Billing and subscription data (separate table for Stripe webhook updates)';
COMMENT ON COLUMN public.billing.stripe_customer_id IS 'Stripe Customer ID (cus_xxx)';
COMMENT ON COLUMN public.billing.stripe_subscription_id IS 'Stripe Subscription ID (sub_xxx)';
COMMENT ON COLUMN public.billing.subscription_status IS 'Current subscription status from Stripe';
COMMENT ON COLUMN public.billing.tokens_used_this_period IS 'API tokens used in current billing period';

-- ============================================================================
-- STRIPE WEBHOOK PATTERN
-- ============================================================================
-- Design Pattern for Stripe Webhooks:
--
-- 1. Webhook Endpoint: POST /api/webhooks/stripe
-- 2. Verify webhook signature using stripe.webhooks.constructEvent()
-- 3. Handle events:
--    - customer.created → INSERT INTO billing
--    - customer.subscription.created → UPDATE billing SET stripe_subscription_id
--    - customer.subscription.updated → UPDATE billing SET subscription_status, current_period_*
--    - customer.subscription.deleted → UPDATE billing SET subscription_status = 'canceled'
--    - invoice.payment_succeeded → No action (status already updated by subscription.updated)
--    - invoice.payment_failed → UPDATE billing SET subscription_status = 'past_due'
--
-- 4. Use service role key for webhook updates (bypass RLS)
-- 5. Log all webhook events for debugging
--
-- Example webhook handler:
-- ```typescript
-- const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
-- const sig = request.headers.get('stripe-signature');
-- const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
--
-- switch (event.type) {
--   case 'customer.subscription.updated':
--     const subscription = event.data.object;
--     await supabase.from('billing')
--       .update({
--         subscription_status: subscription.status,
--         current_period_start: new Date(subscription.current_period_start * 1000),
--         current_period_end: new Date(subscription.current_period_end * 1000)
--       })
--       .eq('stripe_customer_id', subscription.customer);
--     break;
-- }
-- ```
-- ============================================================================

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_handwriting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;

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
-- BILLING POLICIES
-- ============================================================================

-- Users can only view their own billing
CREATE POLICY "Users can view own billing"
  ON public.billing FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own billing (on signup)
CREATE POLICY "Users can insert own billing"
  ON public.billing FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own billing (subscription changes)
CREATE POLICY "Users can update own billing"
  ON public.billing FOR UPDATE
  USING (auth.uid() = user_id);

-- Note: Stripe webhooks will use service role key to bypass RLS

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
CREATE TRIGGER update_notebooks_updated_at
  BEFORE UPDATE ON public.notebooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update user_handwriting.updated_at
CREATE TRIGGER update_user_handwriting_updated_at
  BEFORE UPDATE ON public.user_handwriting
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update user_settings.updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update billing.updated_at
CREATE TRIGGER update_billing_updated_at
  BEFORE UPDATE ON public.billing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Auto-create user_settings and billing on signup
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user_settings record for new user with default preferences
  INSERT INTO public.user_settings (user_id, subscription_tier, user_type, hide_ai_responses)
  VALUES (NEW.id, 'free', 'student', FALSE);

  -- Create billing record for new user
  INSERT INTO public.billing (user_id, subscription_status, tokens_used_this_period)
  VALUES (NEW.id, 'inactive', 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create user_settings and billing when user signs up
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
  UPDATE public.billing
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
  UPDATE public.billing
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
-- Schema is now aligned with Cursive's educational values:
-- ✅ Educational Integrity: is_ai_generated, hide_ai_responses, user_type
-- ✅ Transparent AI: custom_system_prompt
-- ✅ UUID architecture (Supabase best practice)
-- ✅ auth.users (no public.users anti-pattern)
-- ✅ Separate billing table (Stripe webhook pattern)
-- ============================================================================

SELECT 'Values Alignment Migration Complete!' as status;
