-- Fix UUID vs INTEGER type mismatch
-- This converts notebook_id to UUID if needed

-- First, check current types
DO $$
DECLARE
    notebooks_id_type TEXT;
    drawings_notebook_id_type TEXT;
BEGIN
    -- Get notebooks.id type
    SELECT data_type INTO notebooks_id_type
    FROM information_schema.columns
    WHERE table_name = 'notebooks' AND column_name = 'id';

    -- Get drawings.notebook_id type
    SELECT data_type INTO drawings_notebook_id_type
    FROM information_schema.columns
    WHERE table_name = 'drawings' AND column_name = 'notebook_id';

    RAISE NOTICE 'notebooks.id type: %', notebooks_id_type;
    RAISE NOTICE 'drawings.notebook_id type: %', drawings_notebook_id_type;

    -- If types don't match and notebooks.id is UUID, convert drawings.notebook_id
    IF notebooks_id_type = 'uuid' AND drawings_notebook_id_type != 'uuid' THEN
        RAISE NOTICE 'Type mismatch detected! Converting drawings.notebook_id to UUID...';

        -- Drop foreign key constraint if it exists
        EXECUTE '
            ALTER TABLE drawings
            DROP CONSTRAINT IF EXISTS drawings_notebook_id_fkey;
        ';

        -- Convert column to UUID
        -- This will fail if there's data that can't be converted
        EXECUTE '
            ALTER TABLE drawings
            ALTER COLUMN notebook_id TYPE UUID USING notebook_id::TEXT::UUID;
        ';

        -- Recreate foreign key
        EXECUTE '
            ALTER TABLE drawings
            ADD CONSTRAINT drawings_notebook_id_fkey
            FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE;
        ';

        RAISE NOTICE 'Successfully converted drawings.notebook_id to UUID!';
    ELSE
        RAISE NOTICE 'Types match or no conversion needed.';
    END IF;
END $$;
