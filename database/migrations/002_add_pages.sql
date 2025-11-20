-- ============================================================================
-- Migration 002: Add Pages System
-- ============================================================================
-- Adds A4-sized pages to notebooks, allowing users to have multiple pages
-- per notebook instead of infinite canvas
-- ============================================================================

-- ============================================================================
-- TABLE: pages
-- Stores individual pages within notebooks (A4-sized)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notebook_id UUID NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  title TEXT, -- Optional page title: "Intro to Derivatives", "Practice Problems"
  size TEXT NOT NULL DEFAULT 'A4' CHECK (size IN ('A4', 'Letter', 'A5')),
  orientation TEXT NOT NULL DEFAULT 'portrait' CHECK (orientation IN ('portrait', 'landscape')),
  background_color TEXT NOT NULL DEFAULT '#ffffff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure no duplicate page numbers within a notebook
  UNIQUE(notebook_id, page_number)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_pages_notebook_id ON public.pages(notebook_id);
CREATE INDEX IF NOT EXISTS idx_pages_notebook_page ON public.pages(notebook_id, page_number);

COMMENT ON TABLE public.pages IS 'Individual pages within notebooks (A4, Letter, or A5)';
COMMENT ON COLUMN public.pages.page_number IS 'Page number within notebook (1, 2, 3, ...)';
COMMENT ON COLUMN public.pages.size IS 'Page size: A4 (794×1123), Letter (816×1056), or A5';
COMMENT ON COLUMN public.pages.orientation IS 'Page orientation: portrait or landscape';

-- ============================================================================
-- UPDATE: drawings table - Add page_id reference
-- ============================================================================
ALTER TABLE public.drawings
  ADD COLUMN IF NOT EXISTS page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE;

-- Index for fast page lookups
CREATE INDEX IF NOT EXISTS idx_drawings_page_id ON public.drawings(page_id);

COMMENT ON COLUMN public.drawings.page_id IS 'Which page this drawing belongs to (NULL for legacy infinite canvas)';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES for pages
-- ============================================================================

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Users can view pages in their own notebooks OR shared notebooks
CREATE POLICY "Users can view pages in accessible notebooks"
  ON public.pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = pages.notebook_id
      AND (notebooks.user_id = auth.uid() OR notebooks.is_shared = TRUE)
    )
  );

-- Users can insert pages in their own notebooks
CREATE POLICY "Users can insert pages in own notebooks"
  ON public.pages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = pages.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

-- Users can update pages in their own notebooks
CREATE POLICY "Users can update pages in own notebooks"
  ON public.pages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = pages.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

-- Users can delete pages in their own notebooks
CREATE POLICY "Users can delete pages in own notebooks"
  ON public.pages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = pages.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

-- ============================================================================
-- HELPER FUNCTION: Auto-create first page when notebook is created
-- ============================================================================
CREATE OR REPLACE FUNCTION create_default_page()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically create Page 1 when a new notebook is created
  INSERT INTO public.pages (notebook_id, page_number, size, orientation, background_color)
  VALUES (NEW.id, 1, 'A4', 'portrait', '#ffffff');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create first page
DROP TRIGGER IF EXISTS trigger_create_default_page ON public.notebooks;
CREATE TRIGGER trigger_create_default_page
  AFTER INSERT ON public.notebooks
  FOR EACH ROW
  EXECUTE FUNCTION create_default_page();

COMMENT ON FUNCTION create_default_page() IS 'Automatically creates Page 1 when a new notebook is created';

-- ============================================================================
-- Migration complete!
-- ============================================================================
