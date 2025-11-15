# Apply Supabase Migration

## Problem
The "save to web" feature is failing with 400 errors. The tables exist but may be missing columns or have incorrect RLS policies.

## Solution
First diagnose what's missing, then apply the fix.

## Step 1: Diagnose the Problem (Optional but Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: `kfgmeonhhmchoyoklswm`

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run Diagnostic**
   - Open the file: `diagnose_supabase.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" or press Ctrl+Enter
   - Review the output to see what's missing

## Step 2: Apply the Fix (REQUIRED)

1. **In the Same SQL Editor**
   - Click "New Query"

2. **Copy and Execute the Fix**
   - Open the file: `fix_supabase_schema.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" or press Ctrl+Enter

3. **Verify the Fix**
   - You should see messages like:
     - "Added share_id column to notebooks"
     - "Added is_shared column to notebooks"
     - "RLS enabled on notebooks and drawings tables"
     - "Schema fixes applied successfully!"

4. **Check Your Tables**
   - Go to "Table Editor" in the left sidebar
   - Click on `notebooks` table
   - Verify these columns exist:
     - `id`, `user_id`, `title`, `description`, `is_shared`, `share_id`, `created_at`, `updated_at`
   - Click on `drawings` table
   - Verify these columns exist:
     - `id`, `notebook_id`, `stroke_data`, `transcription`, `ai_response`, `drawing_type`, `canvas_state`, `created_at`

## Alternative: Using Supabase CLI (Advanced)

If you have the Supabase CLI installed and want to use migrations:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your project
supabase link --project-ref kfgmeonhhmchoyoklswm

# Apply the fix manually via SQL file
supabase db execute --file fix_supabase_schema.sql
```

## What This Fix Does

The fix script will:

1. **Add Missing Columns:**
   - `notebooks.share_id` - For creating shareable links
   - `notebooks.is_shared` - Flag for public sharing
   - `notebooks.description` - Notebook description
   - `drawings.drawing_type` - Type of drawing (handwriting/typed/shape)

2. **Create/Fix Row Level Security (RLS) Policies:**
   - Users can view their own notebooks
   - Users can view publicly shared notebooks
   - Users can only modify their own notebooks
   - Users can only modify drawings in their own notebooks

3. **Create Triggers:**
   - Auto-update `updated_at` timestamps on notebooks

4. **Create Indexes:**
   - Index on `share_id` for fast shared notebook lookups

## After Migration

Once the migration is applied, the "save to web" feature will work properly and you'll be able to:
- Save notebooks to Supabase
- Create shareable links
- Load shared notebooks

## Troubleshooting

### Error: "relation 'notebooks' already exists"
✅ This is expected! The tables exist but are missing columns. Run `fix_supabase_schema.sql` instead.

### Error: "column 'share_id' already exists"
✅ This is fine! The fix script checks for existing columns and only adds missing ones.

### Still getting 400 errors after running the fix?
1. Check that you're logged in to the app (see console: "✅ User authenticated")
2. Verify your user_id in Supabase: Go to Authentication > Users
3. Run the diagnostic SQL to check RLS policies
4. Try creating a test notebook manually:
   ```sql
   INSERT INTO notebooks (user_id, title, description, is_shared)
   VALUES ('your-user-id-here', 'Test Notebook', 'Test', false);
   ```

### Error: "permission denied for table notebooks"
This means RLS is enabled but policies aren't set up correctly. Re-run `fix_supabase_schema.sql`.

### Error: "new row violates check constraint"
This means a required column is missing. Re-run `fix_supabase_schema.sql`.
