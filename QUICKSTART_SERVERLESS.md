# 🚀 Quick Start: Deploy Cursive Serverless

**Goal:** Get Cursive running on Supabase in 15 minutes (no Flask server!)

## ✅ What You Already Have

Your codebase is **90% ready** for serverless deployment:
- ✅ Supabase Edge Functions (claude-proxy, stripe-webhook)
- ✅ Database schema with migrations
- ✅ Supabase client configured in frontend
- ✅ Local Supabase development setup

**What's left:** Create Supabase project → Deploy → Test

---

## Step 1: Create Supabase Project (5 min)

1. Go to https://supabase.com and sign up
2. Click **New Project**
3. Fill in:
   - Name: `cursive-prod`
   - Database Password: (generate strong password, save it!)
   - Region: Choose closest to you
4. Click **Create Project** and wait 2-3 minutes

---

## Step 2: Get Your Credentials (2 min)

In your Supabase dashboard:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public key**: `eyJhbGc...`
   - **service_role key**: `eyJhbGc...` (keep secret!)

3. Go to **Settings** → **Database**
4. Copy **Connection String** (URI format)

---

## Step 3: Set Up Local Environment (3 min)

Create `.env` file in project root:

```bash
# Frontend variables (for Vite)
VITE_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key...

# For local Flask testing (optional)
CLAUDE_API_KEY=sk-ant-your-key-here
```

---

## Step 4: Deploy Database Schema (2 min)

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref [YOUR-PROJECT-REF]

# Push database schema
supabase db push
```

This creates all your tables (notebooks, drawings, api_usage, etc.) with Row Level Security enabled.

---

## Step 5: Deploy Edge Functions (3 min)

```bash
# Deploy Claude API proxy
supabase functions deploy claude-proxy

# Deploy Stripe webhook
supabase functions deploy stripe-webhook

# Set secrets (these are NOT in .env, they're in Supabase cloud)
supabase secrets set CLAUDE_API_KEY=sk-ant-your-key-here
supabase secrets set STRIPE_SECRET_KEY=sk_your-key-here
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your-secret-here
```

---

## Step 6: Test Locally

### Option A: Test with Local Supabase (Recommended for Development)

```bash
# Start local Supabase (includes database, Edge Functions, auth)
supabase start

# In another terminal, start Vite dev server
npm run dev

# Open http://localhost:3000
```

Your app will use local Supabase at `http://localhost:54321`

### Option B: Test with Production Supabase

Just run:
```bash
npm run dev
```

If `VITE_SUPABASE_URL` is set in `.env`, it'll connect to your production Supabase.

---

## Step 7: Deploy Frontend to Vercel (Free!)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts, then set environment variables in Vercel dashboard:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
```

Your app is now live! 🎉

---

## Step 8: Test End-to-End

1. Visit your Vercel URL (e.g., `cursive.vercel.app`)
2. Sign up for a new account
3. Draw on canvas
4. Select text and click "Transcribe"
5. Send a chat message

**Check Supabase dashboard:**
- **Authentication** → See new user
- **Table Editor** → `notebooks` table should have data
- **Edge Functions** → `claude-proxy` logs should show requests
- **API** → `api_usage` table should track tokens

---

## Troubleshooting

### "Supabase client not initialized"
- Check `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart Vite dev server after changing `.env`

### "401 Unauthorized" when calling Edge Functions
- Make sure you're signed in (check browser console for auth state)
- Verify JWT token is being sent in request headers

### Edge Function errors
```bash
# Check logs
supabase functions logs claude-proxy --tail

# Common fixes:
# - Ensure secrets are set: supabase secrets list
# - Check CORS headers in Edge Function
# - Verify Claude API key is valid
```

### Database connection fails
- Ensure migrations ran successfully: `supabase db push`
- Check RLS policies are enabled
- Verify user is authenticated

---

## What's Different from Flask?

| Feature | Flask (Old) | Supabase (New) |
|---------|-------------|----------------|
| **API calls** | `fetch('/api/claude')` | `supabase.functions.invoke('claude-proxy')` |
| **Auth** | Flask-Login | Supabase Auth (`supabase.auth.signUp()`) |
| **Database** | SQLAlchemy | Supabase client (`supabase.from('notebooks').select()`) |
| **Deployment** | Render/Railway | Vercel/Netlify (frontend only!) |
| **Cost** | $7-50/month | $0-25/month |
| **Scaling** | Manual | Automatic |

---

## Next Steps

**Once everything works:**

1. ✅ **Delete Flask files** (you don't need them anymore!)
   ```bash
   rm proxy.py auth.py billing.py models.py database.py
   rm requirements.txt wsgi.py setup.py
   rm -rf __pycache__
   ```

2. ✅ **Update frontend to use Supabase** (see SERVERLESS_MIGRATION.md for code examples)
   - Update `static/js/aiService.js` to call Edge Functions
   - Update `static/js/dataManager.js` to use Supabase DB
   - Add auth UI for sign up/login

3. ✅ **Set up billing** (optional)
   - Configure Stripe in Supabase dashboard
   - Test webhook endpoint
   - Add subscription UI

4. ✅ **Add custom domain**
   - Vercel dashboard → Settings → Domains
   - Add your domain (e.g., `app.cursive.com`)

5. ✅ **Launch!** 🚀

---

## Cost Breakdown

**Free Tier (Testing):**
- Supabase: $0 (500MB database, 1GB storage)
- Vercel: $0 (100GB bandwidth)
- **Total: $0/month**

**Production (Paid):**
- Supabase Pro: $25/month (8GB database, unlimited Edge Functions)
- Vercel: $0 (unless you exceed free tier)
- **Total: ~$25/month**

**At scale (100 users @ $9/month):**
- Revenue: $900/month
- Supabase: $25-50/month
- Stripe fees: ~$27/month (3% of revenue)
- **Profit: ~$800-850/month** 💰

---

## Support

- **Supabase Docs:** https://supabase.com/docs
- **Edge Functions:** https://supabase.com/docs/guides/functions
- **Full Migration Guide:** See `SERVERLESS_MIGRATION.md`
- **Deployment Guide:** See `SUPABASE_DEPLOYMENT.md`

---

## Summary: What You Just Did

1. ✅ Created Supabase project
2. ✅ Deployed database schema
3. ✅ Deployed Edge Functions (Claude API proxy)
4. ✅ Tested locally
5. ✅ Deployed frontend to Vercel
6. ✅ **No Flask server needed!**

Your app is now:
- ✅ **Serverless** (no server to maintain)
- ✅ **Auto-scaling** (handles traffic spikes)
- ✅ **Global** (Edge Functions run worldwide)
- ✅ **Cheap** ($0-25/month vs $50+/month)

**Congratulations! You're fully serverless! 🎉**
