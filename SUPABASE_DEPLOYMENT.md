# Deploying Cursive to Supabase

This guide walks you through deploying Cursive using Supabase for backend services.

## Architecture Overview

**Recommended Hybrid Approach:**
- **Database:** Supabase PostgreSQL (replaces your local PostgreSQL)
- **Authentication:** Supabase Auth (replaces Flask-Login)
- **Storage:** Supabase Storage (for canvas images, PDFs, exports)
- **Backend API:** Flask deployed to Render/Railway/Fly.io (for Claude API proxy)
- **Frontend:** Vercel/Netlify/Supabase Hosting

---

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign up
2. Click "New Project"
3. Fill in:
   - **Name:** cursive-prod (or your preferred name)
   - **Database Password:** Generate a strong password (save this!)
   - **Region:** Choose closest to your users
4. Wait 2-3 minutes for project to spin up

---

## Step 2: Database Migration

### 2.1 Get Your Supabase Connection String

In your Supabase dashboard:
1. Go to **Settings** → **Database**
2. Copy the **Connection String** (URI format)
3. It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres`

### 2.2 Update Your `.env` File

```bash
# Replace your current DATABASE_URL with Supabase connection string
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Add Supabase credentials
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=[YOUR-ANON-KEY]  # From Settings → API
SUPABASE_SERVICE_KEY=[YOUR-SERVICE-KEY]  # From Settings → API (keep secret!)
```

### 2.3 Run Database Migrations

```bash
# Initialize the database with your existing schema
python setup.py --init-db
```

This will create all tables (users, notebooks, drawings, etc.) in Supabase PostgreSQL.

---

## Step 3: Set Up Supabase Authentication

### 3.1 Enable Email Auth in Supabase

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure settings:
   - **Enable email confirmations:** ON (recommended for production)
   - **Secure email change:** ON
   - **Secure password change:** ON

### 3.2 Update Flask Backend

**Option A: Keep Flask-Login (easier, less changes)**
- Continue using your current auth system
- Supabase just provides the database

**Option B: Migrate to Supabase Auth (recommended for long-term)**
- Replace Flask-Login with Supabase Auth
- Frontend uses `@supabase/supabase-js`
- Backend validates Supabase JWT tokens

For Option B, see "Advanced: Supabase Auth Integration" below.

---

## Step 4: Set Up Supabase Storage

### 4.1 Create Storage Buckets

In Supabase dashboard → **Storage**:

1. Create bucket: `canvas-images`
   - **Public:** NO (private, user-specific)
   - **File size limit:** 10MB

2. Create bucket: `exports`
   - **Public:** YES (for shareable PDFs/pages)
   - **File size limit:** 50MB

### 4.2 Set Up Storage Policies

For `canvas-images` bucket:

```sql
-- Users can upload their own canvas images
CREATE POLICY "Users can upload own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'canvas-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can read their own images
CREATE POLICY "Users can read own images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'canvas-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

For `exports` bucket:

```sql
-- Anyone can read exports (public shareable URLs)
CREATE POLICY "Public can read exports"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'exports');

-- Authenticated users can upload exports
CREATE POLICY "Authenticated can upload exports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'exports');
```

---

## Step 5: Deploy Flask Backend

### Option A: Deploy to Render (Recommended - Free Tier Available)

1. Go to https://render.com and sign up
2. Click **New** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name:** cursive-api
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 4`
   - **Plan:** Free (or Starter for production)

5. Add Environment Variables:
   ```
   CLAUDE_API_KEY=sk-ant-...
   DATABASE_URL=[your-supabase-connection-string]
   SUPABASE_URL=https://[project-ref].supabase.co
   SUPABASE_SERVICE_KEY=[your-service-key]
   SECRET_KEY=[generate-random-string]
   STRIPE_SECRET_KEY=[your-stripe-key]
   STRIPE_WEBHOOK_SECRET=[your-webhook-secret]
   FLASK_ENV=production
   ```

6. Click **Create Web Service**
7. Wait 3-5 minutes for deployment
8. Your API will be at: `https://cursive-api.onrender.com`

### Option B: Deploy to Railway

1. Go to https://railway.app
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your Cursive repo
4. Railway auto-detects Python and sets up build
5. Add same environment variables as above
6. Deploy!

### Option C: Deploy to Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Launch app
flyctl launch

# Set secrets
flyctl secrets set CLAUDE_API_KEY=sk-ant-...
flyctl secrets set DATABASE_URL=[supabase-url]
# ... (add all env vars)

# Deploy
flyctl deploy
```

---

## Step 6: Deploy Frontend

### Option A: Vercel (Recommended - Easiest)

1. Go to https://vercel.com and sign up with GitHub
2. Click **New Project** → Import your Cursive repo
3. Configure:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

4. Add Environment Variables:
   ```
   VITE_API_URL=https://cursive-api.onrender.com
   VITE_SUPABASE_URL=https://[project-ref].supabase.co
   VITE_SUPABASE_ANON_KEY=[your-anon-key]
   ```

5. Click **Deploy**
6. Your app will be live at: `https://cursive.vercel.app`

### Option B: Netlify

1. Go to https://netlify.com
2. **Add new site** → **Import existing project**
3. Connect GitHub repo
4. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Add same environment variables as Vercel
6. Deploy!

### Option C: Supabase Hosting (Beta)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref [your-project-ref]

# Build your app
npm run build

# Deploy
supabase hosting deploy
```

---

## Step 7: Update Frontend Code

You need to update your frontend to use the deployed backend URL instead of localhost.

### 7.1 Create Environment Config

Create `static/js/config.js`:

```javascript
// Use environment variables from Vite
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5022';
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### 7.2 Update API Calls

In `static/js/aiService.js`, replace hardcoded URLs:

```javascript
import { API_BASE_URL } from './config.js';

// Before:
// const response = await fetch('/api/claude', { ... });

// After:
const response = await fetch(`${API_BASE_URL}/api/claude`, { ... });
```

---

## Step 8: Configure CORS

Update `proxy.py` to allow your Vercel/Netlify domain:

```python
ALLOWED_ORIGINS = [
    'http://localhost:5173',  # Vite dev server
    'https://cursive.vercel.app',  # Your production domain
    'https://[your-custom-domain].com'  # Custom domain if you have one
]

@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin in ALLOWED_ORIGINS:
        response.headers.add('Access-Control-Allow-Origin', origin)
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response
```

Redeploy your Flask backend after this change.

---

## Step 9: Set Up Stripe Webhooks

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. URL: `https://cursive-api.onrender.com/api/billing/webhook`
4. Events to listen to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy **Signing secret** and add to your backend env vars

---

## Step 10: Test Your Deployment

### 10.1 Test Checklist

- [ ] Visit your frontend URL (e.g., `cursive.vercel.app`)
- [ ] Sign up for a new account
- [ ] Check Supabase dashboard → **Authentication** to see new user
- [ ] Draw on canvas and select text
- [ ] Verify OCR works (calls your deployed backend)
- [ ] Test AI chat response
- [ ] Check Supabase → **Database** → Tables → `drawings` to see saved data
- [ ] Export to PDF and verify download works
- [ ] Create shareable page and test URL
- [ ] Test on mobile/tablet device

### 10.2 Monitor Logs

**Backend logs (Render):**
- Go to Render dashboard → Your service → **Logs**

**Supabase logs:**
- Supabase dashboard → **Logs**

**Frontend errors:**
- Set up Sentry (see monitoring section)

---

## Step 11: Custom Domain (Optional)

### For Frontend (Vercel)
1. Vercel dashboard → Your project → **Settings** → **Domains**
2. Add your domain (e.g., `app.cursive.com`)
3. Update DNS records with your domain registrar
4. Vercel handles SSL automatically

### For Backend (Render)
1. Render dashboard → Your service → **Settings** → **Custom Domain**
2. Add your domain (e.g., `api.cursive.com`)
3. Update DNS with CNAME record
4. SSL auto-provisioned

---

## Advanced: Supabase Auth Integration (Optional)

If you want to fully migrate to Supabase Auth instead of Flask-Login:

### Backend Changes

```python
# auth.py - Add Supabase JWT validation
from supabase import create_client, Client
import os

supabase: Client = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_KEY')
)

def verify_supabase_token(token):
    """Verify Supabase JWT token"""
    try:
        user = supabase.auth.get_user(token)
        return user
    except Exception as e:
        return None

# Middleware to protect routes
from functools import wraps

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user = verify_supabase_token(token)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401
        request.current_user = user
        return f(*args, **kwargs)
    return decorated_function

# Use on protected routes
@app.route('/api/notebooks', methods=['GET'])
@require_auth
def get_notebooks():
    user_id = request.current_user.id
    # ...
```

### Frontend Changes

```javascript
// Install Supabase JS client
// npm install @supabase/supabase-js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Sign up
async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  if (error) throw error;
  return data;
}

// Sign in
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}

// Get current session
const { data: { session } } = await supabase.auth.getSession();

// Use session token in API calls
const response = await fetch(`${API_BASE_URL}/api/claude`, {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  // ...
});
```

---

## Monitoring & Maintenance

### Set Up Error Tracking

**Sentry for Frontend:**
```bash
npm install @sentry/browser

# In your main app.js
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: "production"
});
```

**Sentry for Backend:**
```bash
pip install sentry-sdk[flask]

# In proxy.py
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

sentry_sdk.init(
    dsn="your-sentry-dsn",
    integrations=[FlaskIntegration()],
    environment="production"
)
```

### Database Backups

Supabase automatically backs up your database daily. To download backups:
1. Supabase dashboard → **Database** → **Backups**
2. Click **Download** on any backup

### Cost Monitoring

- **Supabase:** Free tier includes 500MB database, 1GB storage, 2GB bandwidth
- **Render:** Free tier sleeps after inactivity (paid tier for production)
- **Vercel:** Free tier includes 100GB bandwidth/month
- **Stripe:** Monitor in Stripe dashboard

---

## Troubleshooting

### Issue: CORS errors in browser console
**Solution:** Make sure `ALLOWED_ORIGINS` in `proxy.py` includes your frontend domain and redeploy backend.

### Issue: Database connection fails
**Solution:** Check that `DATABASE_URL` is correct and includes SSL: `?sslmode=require` at the end.

### Issue: 500 errors on API calls
**Solution:** Check backend logs in Render dashboard. Likely missing environment variable.

### Issue: Supabase Storage upload fails
**Solution:** Check Storage policies are set correctly (see Step 4.2).

### Issue: Stripe webhooks not working
**Solution:** Verify webhook URL is correct and signing secret matches.

---

## Cost Estimate (Monthly)

**Free Tier (Hobby/Testing):**
- Supabase: $0 (up to 500MB DB)
- Render: $0 (sleeps after 15min inactivity)
- Vercel: $0 (100GB bandwidth)
- **Total: $0** (with limitations)

**Production (Paid):**
- Supabase Pro: $25/month (8GB DB, 250GB bandwidth)
- Render Starter: $7/month (always on)
- Vercel Pro: $20/month (if you exceed free tier)
- Stripe: 2.9% + $0.30 per transaction
- **Total: ~$52/month** (before user revenue)

**At scale (100 users @ $9/month):**
- Revenue: $900/month
- Costs: ~$100-200/month (Supabase + Render + Vercel + Stripe fees)
- **Profit: ~$700-800/month**

---

## Next Steps After Deployment

1. **Set up monitoring:** Sentry for errors, Supabase logs for DB
2. **Configure backups:** Test restore procedure monthly
3. **Add analytics:** PostHog, Plausible, or Google Analytics
4. **Create status page:** UptimeRobot + status page for users
5. **Beta testing:** Invite 10 users, gather feedback
6. **Marketing:** Product Hunt launch, Reddit posts, Twitter

---

## Support

- Supabase Docs: https://supabase.com/docs
- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs

For Cursive-specific questions, check CLAUDE.md or create an issue on GitHub.

---

**Good luck with your deployment! 🚀**
