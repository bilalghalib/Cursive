# Apply Supabase Migration

## Problem
The "save to web" feature is failing with 400 errors because the database tables don't exist yet in Supabase.

## Solution
You need to apply the migration SQL to create the required tables in your Supabase database.

## Option 1: Using Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: `kfgmeonhhmchoyoklswm`

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Execute the Migration**
   - Open the file: `supabase/migrations/20251113000000_initial_schema.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" or press Ctrl+Enter

4. **Verify Tables Were Created**
   - Go to "Table Editor" in the left sidebar
   - You should now see these tables:
     - `user_settings`
     - `notebooks`
     - `drawings`
     - `api_usage`
     - `billing`
     - `user_handwriting` (if you also ran the handwriting schema)

## Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your project
supabase link --project-ref kfgmeonhhmchoyoklswm

# Push migrations
supabase db push
```

## What This Migration Creates

The migration will create:

1. **Tables:**
   - `user_settings` - User subscription and API key settings
   - `notebooks` - Collections of drawings
   - `drawings` - Individual canvas drawings with strokes
   - `api_usage` - API usage tracking for billing
   - `billing` - Stripe subscription information

2. **Row Level Security (RLS):**
   - Users can only access their own data
   - Shared notebooks are accessible to others

3. **Functions and Triggers:**
   - Auto-update `updated_at` timestamps
   - Track API usage in billing
   - Create user settings on signup

## After Migration

Once the migration is applied, the "save to web" feature will work properly and you'll be able to:
- Save notebooks to Supabase
- Create shareable links
- Load shared notebooks

## Troubleshooting

If you get errors about existing objects:
- Some tables might already exist
- You can run individual CREATE TABLE statements from the migration file
- Or drop existing tables first (⚠️ this will delete data!)
