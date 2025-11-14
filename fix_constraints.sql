-- ============================================================================
-- SUPABASE SCHEMA FIX: Add Missing UNIQUE Constraints
-- ============================================================================
--
-- Run this in the Supabase SQL Editor to add missing unique constraints
-- identified by the verification script.
--

-- 1. Add UNIQUE constraint on users.email
-- This ensures no duplicate email addresses
ALTER TABLE public.users
ADD CONSTRAINT users_email_key UNIQUE (email);

-- 2. Add UNIQUE constraint on notebooks.share_id
-- This ensures each shared notebook has a unique URL
ALTER TABLE public.notebooks
ADD CONSTRAINT notebooks_share_id_key UNIQUE (share_id);

-- 3. Add UNIQUE constraint on billing.user_id
-- This ensures one billing record per user (one-to-one relationship)
ALTER TABLE public.billing
ADD CONSTRAINT billing_user_id_key UNIQUE (user_id);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify unique constraints were added
SELECT
    tc.table_name,
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
AND tc.table_schema = 'public'
AND tc.table_name IN ('users', 'notebooks', 'billing')
ORDER BY tc.table_name, kcu.column_name;
