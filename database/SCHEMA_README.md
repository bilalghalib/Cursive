# Database Schema Documentation

## ⚠️ IMPORTANT: Which Schema is Correct?

**The ONLY correct schema is: `database/UNIFIED_SCHEMA.sql`**

All other schema files in this repository are **outdated** or **incorrect**. Use UNIFIED_SCHEMA.sql as the single source of truth.

---

## 🏗️ Architecture

- **Frontend**: Next.js 15 + React 18 + TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Authentication**: Supabase Auth (`auth.users` table with UUID)
- **Database**: PostgreSQL 15+ with Row Level Security (RLS)

---

## 📊 Tables Overview

### Core Tables

1. **`notebooks`** - Collections of drawings (like a digital canvas/notebook)
   - Each user can have multiple notebooks
   - Notebooks can be shared publicly via `share_id`
   - Stores metadata: title, description, timestamps

2. **`drawings`** - Individual strokes/drawings with AI interactions
   - Belongs to a notebook
   - Contains stroke data (pressure-sensitive points)
   - Stores OCR transcriptions and AI responses
   - **NEW**: `is_ai_generated` flag for hiding AI responses

3. **`user_handwriting`** - User's handwriting samples for AI mimicry
   - One record per user
   - Stores training samples and analyzed style profile
   - Used to generate AI responses in user's handwriting style

4. **`api_usage`** - API call tracking for billing
   - Records tokens used, costs, models
   - Used for usage analytics and billing

5. **`user_settings`** - User preferences and subscription info
   - Stores encrypted API keys (BYOK feature)
   - Subscription tier and Stripe IDs
   - **NEW**: `user_type` (student/parent/teacher/school)
   - **NEW**: `hide_ai_responses` preference

---

## 🔑 Key Design Decisions

### 1. UUID vs. INTEGER

**Decision**: Use **UUID** for all primary keys and foreign keys.

**Why**:
- Supabase Auth uses UUID for `auth.users(id)`
- Avoids sequential ID enumeration attacks
- Enables distributed data without ID conflicts
- Standard Supabase best practice

### 2. Reference `auth.users(id)` Directly

**Decision**: All `user_id` columns reference `auth.users(id)`, NOT a custom `public.users` table.

**Why**:
- Supabase Auth manages user accounts (email, password, OAuth)
- No need to duplicate user data
- RLS policies use `auth.uid()` which returns UUID from `auth.users`
- Simpler architecture, fewer joins

### 3. Educational Features

**Decision**: Added fields to support educational use case (kids/students).

**New columns**:
- `drawings.is_ai_generated` - Flag to distinguish student work from AI responses
- `user_settings.user_type` - Role: student, parent, teacher, school, individual
- `user_settings.hide_ai_responses` - User preference to hide AI by default

**Why**:
- Core value: "Educational Integrity" - students need to show clean work
- Enables "human-only export" feature
- Allows age-appropriate onboarding and features

---

## 🚫 Common Mistakes to Avoid

### ❌ DO NOT create a `public.users` table

Supabase Auth already provides `auth.users`. Creating a duplicate `public.users` table causes:
- Type mismatches (INTEGER vs. UUID)
- Foreign key errors
- Sync issues between tables
- Unnecessary complexity

### ❌ DO NOT use INTEGER for user_id

All `user_id` columns MUST be `UUID` to match `auth.users(id)`.

```sql
-- ❌ WRONG
user_id INTEGER NOT NULL

-- ✅ CORRECT
user_id UUID NOT NULL REFERENCES auth.users(id)
```

### ❌ DO NOT skip RLS policies

All tables with user data MUST have Row Level Security enabled and configured.

Without RLS:
- Users can access other users' data
- Privacy violations
- Security vulnerability

---

## 🔒 Row Level Security (RLS)

All tables have RLS policies that ensure:
- Users can only access their own data
- Shared notebooks are publicly readable (but not editable)
- API usage and settings are completely private

### Example Policy

```sql
-- Users can only view their own notebooks OR public shared notebooks
CREATE POLICY "Users can view own or shared notebooks"
  ON public.notebooks FOR SELECT
  USING (auth.uid() = user_id OR is_shared = TRUE);
```

---

## 🔄 Migrations

### Current State

The live Supabase database has been migrated with:
- `supabase/migrations/20251115161500_fix_schema_v2.sql`

This migration adds missing columns and fixes RLS policies.

### Applying the Unified Schema

If you need to rebuild the database from scratch:

```bash
# 1. Drop all existing tables (CAUTION: deletes all data!)
# In Supabase Dashboard > SQL Editor, run:
DROP TABLE IF EXISTS public.api_usage CASCADE;
DROP TABLE IF EXISTS public.drawings CASCADE;
DROP TABLE IF EXISTS public.notebooks CASCADE;
DROP TABLE IF EXISTS public.user_handwriting CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;

# 2. Apply unified schema
# Copy contents of database/UNIFIED_SCHEMA.sql
# Paste into Supabase Dashboard > SQL Editor
# Run the script
```

---

## 📈 Adding New Tables/Columns

When adding new features that require database changes:

1. **Update `database/UNIFIED_SCHEMA.sql`** first (single source of truth)
2. **Create a migration file** in `supabase/migrations/`
   - Format: `YYYYMMDDHHMMSS_description.sql`
   - Example: `20251119120000_add_collaboration_features.sql`
3. **Test locally** with Supabase CLI
4. **Apply to production** via Supabase Dashboard

---

## 🧪 Testing RLS Policies

Test RLS policies work correctly:

```sql
-- Switch to authenticated user context
SET request.jwt.claims.sub = '<user-uuid>';

-- Try to access data
SELECT * FROM notebooks; -- Should only see user's notebooks

-- Try to access another user's data
SELECT * FROM notebooks WHERE user_id = '<different-user-uuid>'; -- Should return empty
```

---

## 📚 TypeScript Types

TypeScript types are defined in `lib/types.ts` and should match the database schema.

When you add database columns, update:
- `database/UNIFIED_SCHEMA.sql` (SQL schema)
- `lib/types.ts` (TypeScript interfaces)

---

## 🗂️ Deprecated Schema Files

These files are **outdated** and should NOT be used:

- ❌ `supabase_schema.sql` - Old version, missing educational features
- ❌ `supabase_handwriting_schema.sql` - Only handwriting table, incomplete
- ❌ Any schema mentioning `public.users` with INTEGER id

If you encounter discrepancies, trust `database/UNIFIED_SCHEMA.sql`.

---

## 🎯 Next Steps

After applying the schema:

1. **Enable Email Auth** in Supabase Dashboard > Authentication > Providers
2. **Set up Cron Job** to run `SELECT reset_monthly_tokens();` monthly
3. **Deploy Edge Functions** for Claude API proxy
4. **Set environment variables** in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

---

**Questions?** See SETUP.md for full deployment instructions.
