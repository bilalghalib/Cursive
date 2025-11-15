-- Diagnostic SQL to check Supabase schema
-- Run this in Supabase SQL Editor to see what's missing

-- ============================================================================
-- 1. CHECK EXISTING TABLES
-- ============================================================================
SELECT
    table_name,
    (SELECT COUNT(*)
     FROM information_schema.columns c
     WHERE c.table_name = t.table_name
     AND c.table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================================================
-- 2. CHECK NOTEBOOKS TABLE SCHEMA
-- ============================================================================
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'notebooks'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- 3. CHECK DRAWINGS TABLE SCHEMA
-- ============================================================================
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'drawings'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- 4. CHECK RLS STATUS
-- ============================================================================
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('notebooks', 'drawings', 'user_settings')
ORDER BY tablename;

-- ============================================================================
-- 5. CHECK RLS POLICIES
-- ============================================================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('notebooks', 'drawings', 'user_settings')
ORDER BY tablename, policyname;

-- ============================================================================
-- 6. CHECK IF SHARE_ID COLUMN EXISTS
-- ============================================================================
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'notebooks'
AND column_name = 'share_id';

-- ============================================================================
-- 7. CHECK IF IS_SHARED COLUMN EXISTS
-- ============================================================================
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'notebooks'
AND column_name = 'is_shared';

-- ============================================================================
-- 8. TEST QUERY (This is what's failing in your app)
-- ============================================================================
-- Uncomment and replace with your actual user_id from auth.users
-- SELECT id
-- FROM notebooks
-- WHERE user_id = 'd6715043-749b-4d96-b708-ed215da664ca'
-- ORDER BY created_at DESC
-- LIMIT 1;
