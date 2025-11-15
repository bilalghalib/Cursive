-- Fix Supabase Schema Issues
-- Run this to add missing columns and fix RLS policies

-- ============================================================================
-- STEP 1: Add missing columns to notebooks table (if they don't exist)
-- ============================================================================

-- Add share_id column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notebooks' AND column_name = 'share_id'
    ) THEN
        ALTER TABLE notebooks ADD COLUMN share_id TEXT UNIQUE;
        CREATE INDEX IF NOT EXISTS idx_notebooks_share_id ON notebooks(share_id) WHERE share_id IS NOT NULL;
        RAISE NOTICE 'Added share_id column to notebooks';
    ELSE
        RAISE NOTICE 'share_id column already exists';
    END IF;
END $$;

-- Add is_shared column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notebooks' AND column_name = 'is_shared'
    ) THEN
        ALTER TABLE notebooks ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT FALSE;
        RAISE NOTICE 'Added is_shared column to notebooks';
    ELSE
        RAISE NOTICE 'is_shared column already exists';
    END IF;
END $$;

-- Add description column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notebooks' AND column_name = 'description'
    ) THEN
        ALTER TABLE notebooks ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to notebooks';
    ELSE
        RAISE NOTICE 'description column already exists';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Add missing columns to drawings table (if they don't exist)
-- ============================================================================

-- Add drawing_type column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'drawings' AND column_name = 'drawing_type'
    ) THEN
        ALTER TABLE drawings ADD COLUMN drawing_type TEXT NOT NULL DEFAULT 'handwriting';
        ALTER TABLE drawings ADD CONSTRAINT drawings_drawing_type_check
            CHECK (drawing_type IN ('handwriting', 'typed', 'shape'));
        RAISE NOTICE 'Added drawing_type column to drawings';
    ELSE
        RAISE NOTICE 'drawing_type column already exists';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Fix type mismatch between notebooks.id and drawings.notebook_id
-- ============================================================================

DO $$
DECLARE
    notebooks_id_type TEXT;
    drawings_notebook_id_type TEXT;
    has_fkey BOOLEAN;
BEGIN
    -- Get column types
    SELECT data_type INTO notebooks_id_type
    FROM information_schema.columns
    WHERE table_name = 'notebooks' AND column_name = 'id';

    SELECT data_type INTO drawings_notebook_id_type
    FROM information_schema.columns
    WHERE table_name = 'drawings' AND column_name = 'notebook_id';

    RAISE NOTICE 'notebooks.id type: %, drawings.notebook_id type: %',
        notebooks_id_type, drawings_notebook_id_type;

    -- If notebooks.id is UUID but notebook_id is not, convert it
    IF notebooks_id_type = 'uuid' AND drawings_notebook_id_type != 'uuid' THEN
        RAISE NOTICE 'Converting drawings.notebook_id from % to uuid...', drawings_notebook_id_type;

        -- Check if foreign key exists
        SELECT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'drawings_notebook_id_fkey'
            AND table_name = 'drawings'
        ) INTO has_fkey;

        -- Drop foreign key if exists
        IF has_fkey THEN
            ALTER TABLE drawings DROP CONSTRAINT drawings_notebook_id_fkey;
            RAISE NOTICE 'Dropped existing foreign key constraint';
        END IF;

        -- Convert to UUID (will fail if there's incompatible data)
        ALTER TABLE drawings
        ALTER COLUMN notebook_id TYPE UUID USING notebook_id::TEXT::UUID;

        -- Recreate foreign key
        ALTER TABLE drawings
        ADD CONSTRAINT drawings_notebook_id_fkey
        FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE;

        RAISE NOTICE 'Successfully converted notebook_id to UUID and recreated foreign key';
    ELSE
        RAISE NOTICE 'Type conversion not needed';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Enable RLS on tables (if not already enabled)
-- ============================================================================

DO $$
BEGIN
    ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
    ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on notebooks and drawings tables';
END $$;

-- ============================================================================
-- STEP 5: Drop existing policies (if any) and recreate them
-- ============================================================================

-- Drop existing policies for notebooks
DROP POLICY IF EXISTS "Users can view own notebooks" ON notebooks;
DROP POLICY IF EXISTS "Users can insert own notebooks" ON notebooks;
DROP POLICY IF EXISTS "Users can update own notebooks" ON notebooks;
DROP POLICY IF EXISTS "Users can delete own notebooks" ON notebooks;

-- Drop existing policies for drawings
DROP POLICY IF EXISTS "Users can view drawings from accessible notebooks" ON drawings;
DROP POLICY IF EXISTS "Users can insert drawings to own notebooks" ON drawings;
DROP POLICY IF EXISTS "Users can update drawings in own notebooks" ON drawings;
DROP POLICY IF EXISTS "Users can delete drawings from own notebooks" ON drawings;

-- ============================================================================
-- STEP 6: Create RLS policies for notebooks
-- ============================================================================

-- Users can view their own notebooks OR shared notebooks
CREATE POLICY "Users can view own notebooks"
  ON notebooks FOR SELECT
  USING (auth.uid() = user_id OR is_shared = true);

-- Users can insert their own notebooks
CREATE POLICY "Users can insert own notebooks"
  ON notebooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own notebooks
CREATE POLICY "Users can update own notebooks"
  ON notebooks FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notebooks
CREATE POLICY "Users can delete own notebooks"
  ON notebooks FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 7: Create RLS policies for drawings
-- ============================================================================

-- Users can view drawings from notebooks they own or that are shared
CREATE POLICY "Users can view drawings from accessible notebooks"
  ON drawings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notebooks
      WHERE notebooks.id = drawings.notebook_id
      AND (notebooks.user_id = auth.uid() OR notebooks.is_shared = true)
    )
  );

-- Users can insert drawings into their own notebooks
CREATE POLICY "Users can insert drawings to own notebooks"
  ON drawings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notebooks
      WHERE notebooks.id = drawings.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

-- Users can update drawings in their own notebooks
CREATE POLICY "Users can update drawings in own notebooks"
  ON drawings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM notebooks
      WHERE notebooks.id = drawings.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

-- Users can delete drawings from their own notebooks
CREATE POLICY "Users can delete drawings from own notebooks"
  ON drawings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM notebooks
      WHERE notebooks.id = drawings.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 8: Create updated_at trigger function (if it doesn't exist)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger for notebooks
DROP TRIGGER IF EXISTS update_notebooks_updated_at ON notebooks;
CREATE TRIGGER update_notebooks_updated_at
  BEFORE UPDATE ON notebooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DONE!
-- ============================================================================

-- Verify the fix
SELECT 'Schema fixes applied successfully!' as status;

-- Show current notebooks table structure
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'notebooks'
AND table_schema = 'public'
ORDER BY ordinal_position;
