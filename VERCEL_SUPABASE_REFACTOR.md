# Vercel + Supabase Refactoring Plan

## 🎯 Goal
Deploy Cursive to Vercel using modern best practices with Supabase as the backend.

---

## ❌ What's Wrong Now

### 1. **Locally Hosted Supabase Library (183KB)**
```html
<!-- WRONG: Hosting library yourself -->
<script src="/static/vendor/supabase-js.min.js"></script>
```
**Issues:**
- Increases your bundle size unnecessarily
- You have to manually update the library
- Misses CDN benefits (caching, global distribution)
- Non-standard approach

### 2. **Hardcoded Credentials**
```javascript
// static/js/supabaseConfig.js - SECURITY RISK!
export const SUPABASE_URL = 'https://kfgmeonhhmchoyoklswm.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGci...' // This is public, but shouldn't be in git
```
**Issues:**
- Credentials committed to git repository
- Can't have different keys for dev/staging/production
- Violates 12-factor app principles

### 3. **No Build System**
```json
// package.json
{
  "dependencies": {
    "file-saver": "^2.0.5",
    "jspdf": "^3.0.3"
    // ❌ Missing: @supabase/supabase-js
  }
}
```
**Issues:**
- Can't use npm packages properly
- No tree-shaking or optimization
- No environment variable support

### 4. **Mixed Architecture**
```
Current Setup:
Frontend → Flask (proxy.py) → Supabase + Anthropic API
               ↓
          PostgreSQL
```
**Issues:**
- Flask doesn't deploy well to Vercel (needs custom config)
- Redundant: Supabase can handle auth, database, AND API proxying
- More expensive to run Flask server

---

## ✅ Recommended Architecture for Vercel

```
Vercel Deployment:
Frontend (Static) → Supabase Edge Functions → Anthropic API
                    ↓
               Supabase Database
                    ↓
                  Stripe
```

### Why This is Better:
- ✅ **No Flask needed** - Supabase Edge Functions replace proxy.py
- ✅ **Free hosting** - Vercel free tier + Supabase free tier
- ✅ **Auto-scaling** - Both platforms handle scaling automatically
- ✅ **Global CDN** - Vercel serves static assets worldwide
- ✅ **Environment variables** - Proper secret management
- ✅ **Instant deploys** - Push to git → auto-deploy

---

## 🛠️ Step-by-Step Refactor

### Phase 1: Set Up Proper Package Management (15 min)

#### 1.1 Install Supabase Client via npm
```bash
npm install @supabase/supabase-js
npm install -D vite @vitejs/plugin-react
```

#### 1.2 Remove Local Supabase Copy
```bash
rm static/vendor/supabase-js.min.js
```

#### 1.3 Update package.json
```json
{
  "name": "cursive",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.38.4",
    "file-saver": "^2.0.5",
    "jspdf": "^3.0.3"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.0"
  }
}
```

---

### Phase 2: Environment Variables (10 min)

#### 2.1 Create .env file (gitignored)
```bash
# .env (NEVER commit this!)
VITE_SUPABASE_URL=https://kfgmeonhhmchoyoklswm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

#### 2.2 Update .gitignore
```
.env
.env.local
.env.*.local
```

#### 2.3 Create .env.example (commit this)
```bash
# .env.example
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

#### 2.4 Delete supabaseConfig.js entirely
```bash
rm static/js/supabaseConfig.js
```

#### 2.5 Update supabaseClient.js
```javascript
// static/js/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Get config from environment variables (Vite injects these)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions
export async function getSupabaseSession() {
  const { data: { session }, error } = await supabaseClient.auth.getSession()
  if (error) {
    console.error('Error getting session:', error)
    return null
  }
  return session
}

export async function getSupabaseUser() {
  const { data: { user }, error } = await supabaseClient.auth.getUser()
  if (error) {
    console.error('Error getting user:', error)
    return null
  }
  return user
}

console.log('✅ Supabase client initialized')
```

---

### Phase 3: Vite Build Configuration (10 min)

#### 3.1 Create vite.config.js
```javascript
// vite.config.js
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  root: './static',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'templates/index.html')
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
})
```

#### 3.2 Update index.html
```html
<!-- Remove this line -->
<script src="{{ url_for('static', filename='vendor/supabase-js.min.js') }}"></script>

<!-- Remove this line (config is now in .env) -->
<!-- No longer need supabaseConfig.js -->

<!-- Keep this (imports from npm now) -->
<script type="module" src="/js/supabaseClient.js"></script>
```

---

### Phase 4: Vercel Configuration (5 min)

#### 4.1 Create vercel.json
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": null,
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "env": {
    "VITE_SUPABASE_URL": "@supabase-url",
    "VITE_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

#### 4.2 Set Environment Variables in Vercel Dashboard
1. Go to your project settings on Vercel
2. Navigate to "Environment Variables"
3. Add:
   - `VITE_SUPABASE_URL` = `https://kfgmeonhhmchoyoklswm.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGci...`

---

### Phase 5: Migrate Flask Backend to Supabase Edge Functions (30 min)

You already have Edge Functions created! Let's verify they're complete:

#### 5.1 Check Existing Edge Functions
```bash
ls -la supabase/functions/
```

You should have:
- `claude-proxy/` - Handles AI requests
- `stripe-webhook/` - Handles billing

#### 5.2 Update Frontend API Calls

**OLD (Flask):**
```javascript
// aiService.js - BEFORE
const response = await fetch('/api/claude/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages })
})
```

**NEW (Supabase Edge Function):**
```javascript
// aiService.js - AFTER
import { supabaseClient } from './supabaseClient.js'

const { data: { session } } = await supabaseClient.auth.getSession()

const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude-proxy`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ messages, stream: true })
  }
)
```

#### 5.3 Deploy Edge Functions
```bash
# Set secrets
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Deploy functions
supabase functions deploy claude-proxy
supabase functions deploy stripe-webhook
```

---

### Phase 6: Remove Flask Entirely (10 min)

Once Edge Functions are working:

```bash
# These files are no longer needed:
rm proxy.py
rm wsgi.py
rm auth.py
rm billing.py
rm database.py
rm models.py
rm rate_limiter.py
rm api_routes.py
rm requirements.txt
```

**Why?** Supabase handles all of this:
- `proxy.py` → `supabase/functions/claude-proxy`
- `auth.py` → Supabase Auth (built-in)
- `database.py` → Supabase PostgreSQL
- `billing.py` → `supabase/functions/stripe-webhook`
- `rate_limiter.py` → Supabase Edge Function quotas

---

## 📦 Final Project Structure

```
Cursive/
├── .env                              # Local secrets (gitignored)
├── .env.example                      # Template (committed)
├── .gitignore
├── package.json
├── vite.config.js
├── vercel.json                       # Vercel deployment config
│
├── static/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── supabaseClient.js         # ✅ Uses npm package now
│   │   ├── app.js
│   │   ├── canvasManager.js
│   │   ├── aiService.js              # ✅ Updated to use Edge Functions
│   │   └── ...
│   └── index.html                    # ✅ No vendor scripts needed
│
└── supabase/
    ├── config.toml
    ├── migrations/
    │   └── 20251113000000_initial_schema.sql
    └── functions/
        ├── claude-proxy/
        │   └── index.ts              # ✅ Replaces proxy.py
        └── stripe-webhook/
            └── index.ts              # ✅ Replaces billing.py
```

---

## 🚀 Deployment Workflow

### Local Development
```bash
npm install
npm run dev
# Opens http://localhost:5173
```

### Deploy to Vercel
```bash
# Option 1: Connect to GitHub (recommended)
# Push to main branch → auto-deploys

# Option 2: Manual deploy
npm run build
vercel --prod
```

### Deploy Supabase Functions
```bash
supabase functions deploy claude-proxy
supabase functions deploy stripe-webhook
```

---

## 🔐 Security Checklist

- ✅ No credentials in git
- ✅ Environment variables for all secrets
- ✅ Anon key is safe to expose (Row Level Security protects data)
- ✅ Service role key NEVER exposed to frontend
- ✅ Edge Functions validate auth tokens
- ✅ RLS policies protect database

---

## 💰 Cost Comparison

### Current Setup (Flask on VPS)
- VPS: $12-20/month
- PostgreSQL: $25/month
- Redis: $15/month
- **Total: $52-60/month + DevOps time**

### New Setup (Vercel + Supabase)
- Vercel: $0 (free tier, up to 100GB bandwidth)
- Supabase: $0 (free tier, 500MB database, 2GB bandwidth)
- **Total: $0/month for hobby projects**

When you grow:
- Vercel Pro: $20/month (1TB bandwidth)
- Supabase Pro: $25/month (8GB database, 50GB bandwidth)
- **Total: $45/month with zero DevOps**

---

## 📊 Performance Benefits

| Metric | Flask (Old) | Vercel + Supabase (New) |
|--------|-------------|-------------------------|
| **Global CDN** | ❌ Single region | ✅ 100+ edge locations |
| **Cold start** | ~2s (Gunicorn) | ~50ms (Edge Functions) |
| **Auto-scaling** | ❌ Manual | ✅ Automatic |
| **SSL** | Manual setup | ✅ Automatic |
| **CI/CD** | Manual setup | ✅ Git push = deploy |

---

## ✅ Migration Checklist

### Immediate (Critical)
- [ ] Install `@supabase/supabase-js` via npm
- [ ] Remove `static/vendor/supabase-js.min.js`
- [ ] Delete `supabaseConfig.js` (hardcoded keys)
- [ ] Create `.env` file with environment variables
- [ ] Add `.env` to `.gitignore`
- [ ] Create `vite.config.js`
- [ ] Create `vercel.json`
- [ ] Update `supabaseClient.js` to use `import.meta.env`

### Short-term (High Priority)
- [ ] Update `aiService.js` to call Edge Functions instead of Flask
- [ ] Deploy Edge Functions to Supabase
- [ ] Test authentication flow
- [ ] Test AI chat flow
- [ ] Test billing webhooks

### Long-term (Cleanup)
- [ ] Remove Flask files (proxy.py, etc.)
- [ ] Remove `requirements.txt`
- [ ] Update documentation
- [ ] Set up Vercel CI/CD

---

## 🆘 Troubleshooting

### "Import meta is not defined"
**Cause:** Using `import.meta.env` outside Vite
**Fix:** Make sure you're running `npm run dev` (Vite), not Flask

### "Supabase is not defined"
**Cause:** Removed vendor script but didn't install npm package
**Fix:** `npm install @supabase/supabase-js`

### "Missing environment variables"
**Cause:** `.env` file not created
**Fix:** Copy `.env.example` to `.env` and fill in values

### Edge Function returns 401
**Cause:** Missing auth token
**Fix:** Make sure you're passing `Authorization: Bearer <token>` header

---

## 📚 Resources

- [Supabase JS Client Docs](https://supabase.com/docs/reference/javascript/introduction)
- [Vercel Deployment Guide](https://vercel.com/docs/concepts/deployments/overview)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

## 🎯 Next Steps

1. **Read this document carefully**
2. **Run the Phase 1-4 changes** (package management, env vars, Vite, Vercel config)
3. **Test locally** with `npm run dev`
4. **Verify Edge Functions** are deployed and working
5. **Update frontend API calls** to use Edge Functions
6. **Deploy to Vercel** and test production
7. **Remove Flask** once everything works

---

Need help with any of these steps? Let me know which phase you want to tackle first!
