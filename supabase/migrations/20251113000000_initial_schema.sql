-- Initial Cursive Database Schema for Supabase
-- Migration from Flask/PostgreSQL to Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USER SETTINGS TABLE
-- Note: auth.users table is managed by Supabase Auth
-- We only store additional user settings here
-- ============================================================================

CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Subscription & Billing
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  stripe_customer_id TEXT UNIQUE,

  -- BYOK - Bring Your Own Key (encrypted in Supabase Vault)
  has_own_api_key BOOLEAN DEFAULT FALSE,
  encrypted_api_key TEXT, -- Store in Supabase Vault instead

  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Add index for faster lookups
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_user_settings_stripe_customer ON user_settings(stripe_customer_id);

-- ============================================================================
-- NOTEBOOKS TABLE
-- ============================================================================

CREATE TABLE notebooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content
  title TEXT NOT NULL,
  description TEXT,

  -- Sharing
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  share_id TEXT UNIQUE, -- Public share URL ID

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notebooks_user_id ON notebooks(user_id);
CREATE INDEX idx_notebooks_user_updated ON notebooks(user_id, updated_at DESC);
CREATE INDEX idx_notebooks_share_id ON notebooks(share_id) WHERE share_id IS NOT NULL;

-- ============================================================================
-- DRAWINGS TABLE
-- ============================================================================

CREATE TABLE drawings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,

  -- Drawing data
  stroke_data JSONB, -- Canvas strokes
  transcription TEXT, -- OCR result
  ai_response TEXT, -- Claude's response
  drawing_type TEXT NOT NULL DEFAULT 'handwriting' CHECK (drawing_type IN ('handwriting', 'typed', 'shape')),
  canvas_state JSONB, -- Pan, zoom, etc.

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_drawings_notebook_id ON drawings(notebook_id);
CREATE INDEX idx_drawings_created ON drawings(created_at DESC);

-- ============================================================================
-- API USAGE TABLE (for billing)
-- ============================================================================

CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Token usage
  tokens_used INTEGER NOT NULL,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,

  -- Cost calculation
  cost NUMERIC(10, 6) NOT NULL,
  model TEXT NOT NULL,
  endpoint TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_api_usage_user_created ON api_usage(user_id, created_at DESC);
CREATE INDEX idx_api_usage_created ON api_usage(created_at DESC);

-- ============================================================================
-- BILLING TABLE
-- ============================================================================

CREATE TABLE billing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe data
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  subscription_status TEXT NOT NULL DEFAULT 'inactive',

  -- Billing period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  tokens_used_this_period INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_billing_user_id ON billing(user_id);
CREATE INDEX idx_billing_stripe_customer ON billing(stripe_customer_id);
CREATE INDEX idx_billing_stripe_subscription ON billing(stripe_subscription_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;

-- User Settings Policies
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Notebooks Policies
CREATE POLICY "Users can view own notebooks"
  ON notebooks FOR SELECT
  USING (auth.uid() = user_id OR is_shared = true);

CREATE POLICY "Users can insert own notebooks"
  ON notebooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notebooks"
  ON notebooks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notebooks"
  ON notebooks FOR DELETE
  USING (auth.uid() = user_id);

-- Drawings Policies
CREATE POLICY "Users can view drawings from accessible notebooks"
  ON drawings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notebooks
      WHERE notebooks.id = drawings.notebook_id
      AND (notebooks.user_id = auth.uid() OR notebooks.is_shared = true)
    )
  );

CREATE POLICY "Users can insert drawings to own notebooks"
  ON drawings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notebooks
      WHERE notebooks.id = drawings.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update drawings in own notebooks"
  ON drawings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM notebooks
      WHERE notebooks.id = drawings.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete drawings from own notebooks"
  ON drawings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM notebooks
      WHERE notebooks.id = drawings.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

-- API Usage Policies
CREATE POLICY "Users can view own API usage"
  ON api_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Note: INSERT on api_usage is handled by Edge Functions (service role)

-- Billing Policies
CREATE POLICY "Users can view own billing"
  ON billing FOR SELECT
  USING (auth.uid() = user_id);

-- Note: INSERT/UPDATE on billing is handled by Edge Functions (service role)

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notebooks_updated_at
  BEFORE UPDATE ON notebooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_updated_at
  BEFORE UPDATE ON billing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-track API usage in billing
CREATE OR REPLACE FUNCTION track_api_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Update billing record with token usage
  UPDATE billing
  SET tokens_used_this_period = tokens_used_this_period + NEW.tokens_used,
      updated_at = NOW()
  WHERE user_id = NEW.user_id;

  -- Create billing record if doesn't exist
  IF NOT FOUND THEN
    INSERT INTO billing (user_id, tokens_used_this_period)
    VALUES (NEW.user_id, NEW.tokens_used);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_api_usage_insert
  AFTER INSERT ON api_usage
  FOR EACH ROW
  EXECUTE FUNCTION track_api_usage();

-- Auto-create user_settings on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id, subscription_tier)
  VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Get user's quota limit based on tier
CREATE OR REPLACE FUNCTION get_user_quota_limit(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_tier TEXT;
  v_has_own_key BOOLEAN;
BEGIN
  SELECT subscription_tier, has_own_api_key
  INTO v_tier, v_has_own_key
  FROM user_settings
  WHERE user_id = p_user_id;

  -- Users with their own API key have unlimited quota
  IF v_has_own_key THEN
    RETURN 999999999;
  END IF;

  -- Return quota based on tier
  CASE v_tier
    WHEN 'free' THEN RETURN 10000;
    WHEN 'pro' THEN RETURN 50000;
    WHEN 'enterprise' THEN RETURN 999999999;
    ELSE RETURN 10000;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Check if user has exceeded quota
CREATE OR REPLACE FUNCTION check_user_quota(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_tokens_used INTEGER;
  v_quota_limit INTEGER;
BEGIN
  -- Get current usage
  SELECT COALESCE(tokens_used_this_period, 0)
  INTO v_tokens_used
  FROM billing
  WHERE user_id = p_user_id;

  -- Get quota limit
  v_quota_limit := get_user_quota_limit(p_user_id);

  -- Return true if under quota
  RETURN v_tokens_used < v_quota_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_settings IS 'Additional user settings beyond Supabase Auth';
COMMENT ON TABLE notebooks IS 'User notebooks containing collections of drawings';
COMMENT ON TABLE drawings IS 'Canvas drawings with AI transcription and responses';
COMMENT ON TABLE api_usage IS 'API usage tracking for billing and analytics';
COMMENT ON TABLE billing IS 'Stripe billing and subscription information';
