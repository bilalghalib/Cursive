-- ============================================================================
-- Drop Old Flask Schema
-- ============================================================================
-- This migration drops the old Flask-based schema (integer IDs, custom users table)
-- and prepares for the Supabase Auth-based schema (UUID IDs, auth.users)

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS public.api_usage CASCADE;
DROP TABLE IF EXISTS public.billing CASCADE;
DROP TABLE IF EXISTS public.drawings CASCADE;
DROP TABLE IF EXISTS public.notebooks CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop sequences created by serial columns
DROP SEQUENCE IF EXISTS public.api_usage_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.billing_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.drawings_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.notebooks_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.users_id_seq CASCADE;

-- Clean up any remaining constraints or indexes
-- (CASCADE should handle most, but just in case)

COMMENT ON SCHEMA public IS 'Old Flask schema dropped, ready for Supabase Auth schema';
