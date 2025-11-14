# Installing Supabase CLI

## ✅ Fixed: Config Error

I've fixed the `supabase/config.toml` to remove the deprecated `[edge_functions]` section. The error should now be resolved.

---

## Install Supabase CLI on Your Mac

Since you're on macOS (I see `Cruzer-2` which is a Mac), use **Homebrew**:

```bash
# Install via Homebrew (recommended for macOS)
brew install supabase/tap/supabase

# Verify installation
supabase --version
```

### Alternative: Using npm (as project dependency)

If you prefer npm:

```bash
# Install as dev dependency in your project
npm install supabase --save-dev

# Run via npx
npx supabase --version

# Use in commands
npx supabase start
npx supabase db push
```

---

## After Installation

Once installed, you can run:

```bash
# Start local Supabase (Docker required)
supabase start

# This will start:
# - PostgreSQL (port 54322)
# - PostgREST API (port 54321)
# - Supabase Studio (port 54323)
# - Edge Functions runtime
# - Auth server
# - Storage server
```

**Note:** Supabase CLI requires **Docker Desktop** to be running on your Mac.

---

## Quick Start Commands

```bash
# 1. Start local Supabase
supabase start

# 2. Push database schema (creates tables)
supabase db push

# 3. In another terminal, start your frontend
npm run dev

# 4. Open http://localhost:3000
```

Your app will connect to local Supabase at `http://localhost:54321`

---

## If You Don't Want Local Supabase

You can skip local setup and deploy directly to production:

1. Create a Supabase project at https://supabase.com
2. Get your credentials (URL + anon key)
3. Create `.env` file:
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...your-key...
   ```
4. Deploy functions:
   ```bash
   supabase login
   supabase link --project-ref your-project-ref
   supabase db push
   supabase functions deploy claude-proxy
   ```

---

## Troubleshooting

### "Docker not running"
- Start Docker Desktop on your Mac
- Wait for it to fully start
- Run `supabase start` again

### "Permission denied"
- Make sure you have Homebrew installed
- Run with sudo: `sudo brew install supabase/tap/supabase`

### "Command not found: supabase"
- Restart your terminal after installation
- Or use: `npx supabase` if installed via npm

---

## Next Steps

Once Supabase CLI is installed and `supabase start` works:

1. ✅ Your local Supabase will be running
2. ✅ Run `npm run dev` to start frontend
3. ✅ Test the app at http://localhost:3000
4. ✅ Check Supabase Studio at http://localhost:54323

Then you can deploy to production following `QUICKSTART_SERVERLESS.md`!
