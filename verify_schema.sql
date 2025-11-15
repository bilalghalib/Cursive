-- Verify the schema fixes were applied
SELECT 'Checking notebooks table columns...' as step;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'notebooks'
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Checking RLS policies on notebooks...' as step;
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'notebooks';

SELECT 'Checking RLS policies on drawings...' as step;
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'drawings';
