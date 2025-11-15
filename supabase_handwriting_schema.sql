-- Handwriting Storage Table for Cursive
-- Stores user's handwriting samples and style profile

CREATE TABLE IF NOT EXISTS user_handwriting (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Handwriting samples (raw stroke data)
  samples JSONB,

  -- Analyzed style profile
  style_profile JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one profile per user
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_handwriting_user_id ON user_handwriting(user_id);

-- Enable Row Level Security
ALTER TABLE user_handwriting ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own handwriting
CREATE POLICY "Users can read own handwriting"
  ON user_handwriting
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own handwriting
CREATE POLICY "Users can insert own handwriting"
  ON user_handwriting
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own handwriting
CREATE POLICY "Users can update own handwriting"
  ON user_handwriting
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own handwriting
CREATE POLICY "Users can delete own handwriting"
  ON user_handwriting
  FOR DELETE
  USING (auth.uid() = user_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_handwriting_updated_at
  BEFORE UPDATE ON user_handwriting
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE user_handwriting IS 'Stores user handwriting samples and analyzed style profiles for canvas writeback';
COMMENT ON COLUMN user_handwriting.samples IS 'Raw stroke data collected during training (character samples)';
COMMENT ON COLUMN user_handwriting.style_profile IS 'Analyzed style parameters (slant, spacing, messiness, etc.)';
