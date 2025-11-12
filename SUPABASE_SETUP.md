# 🚀 Cursive - Supabase Migration Guide

This guide walks you through migrating Cursive from the custom Flask backend to Supabase.

---

## 📋 **Table of Contents**

1. [Prerequisites](#prerequisites)
2. [Step 1: Create Supabase Project](#step-1-create-supabase-project)
3. [Step 2: Set Up Database Schema](#step-2-set-up-database-schema)
4. [Step 3: Configure Authentication](#step-3-configure-authentication)
5. [Step 4: Deploy Edge Function](#step-4-deploy-edge-function)
6. [Step 5: Update Frontend Code](#step-5-update-frontend-code)
7. [Step 6: Test the Integration](#step-6-test-the-integration)
8. [Troubleshooting](#troubleshooting)
9. [Migration Checklist](#migration-checklist)

---

## **Prerequisites**

Before starting, ensure you have:

- ✅ A [Supabase](https://supabase.com) account (free tier works!)
- ✅ [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- ✅ [Node.js](https://nodejs.org/) 16+ installed
- ✅ An [Anthropic API key](https://console.anthropic.com/)
- ✅ (Optional) [Stripe](https://stripe.com) account for billing

### Install Supabase CLI

```bash
# macOS/Linux
npm install -g supabase

# Or using Homebrew (macOS)
brew install supabase/tap/supabase

# Verify installation
supabase --version
```

---

## **Step 1: Create Supabase Project**

### 1.1 Create Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `cursive` (or your preferred name)
   - **Database Password**: Generate a strong password and **save it**
   - **Region**: Choose the closest to your users
4. Click **"Create new project"** (takes ~2 minutes)

### 1.2 Get API Keys

Once your project is created:

1. Go to **Settings** > **API**
2. Copy these values:

```bash
# Project URL
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co

# Anon key (public - safe to use in frontend)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service role key (SECRET - only for backend/Edge Functions)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Save these in a safe place (you'll need them later)

---

## **Step 2: Set Up Database Schema**

### 2.1 Run SQL Schema

1. Open **Supabase Dashboard** > **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `supabase_schema.sql` from this repo
4. Paste into the SQL Editor
5. Click **"Run"** (or press `Cmd/Ctrl + Enter`)

✅ You should see: **Success. No rows returned**

### 2.2 Verify Tables Created

1. Go to **Table Editor**
2. You should see these tables:
   - `notebooks`
   - `drawings`
   - `api_usage`
   - `user_settings`

### 2.3 Set Up Cron Job (Monthly Token Reset)

1. Go to **Database** > **Cron Jobs**
2. Click **"Create a new cron job"**
3. Configure:
   - **Name**: `Reset Monthly Tokens`
   - **Schedule**: `0 0 1 * *` (runs on 1st of every month at midnight)
   - **SQL**: `SELECT reset_monthly_tokens();`
4. Click **"Create cron job"**

---

## **Step 3: Configure Authentication**

### 3.1 Enable Email Auth

1. Go to **Authentication** > **Providers**
2. **Email** should already be enabled
3. Configure settings:
   - ✅ **Enable email confirmations** (recommended)
   - **Confirm email** template: Customize if desired
   - **Site URL**: `http://localhost:5022` (for local dev)
   - **Redirect URLs**: Add your production domain later

### 3.2 (Optional) Enable OAuth Providers

For Google/GitHub login:

1. **Authentication** > **Providers**
2. Enable **Google** or **GitHub**
3. Follow the setup instructions for each provider
4. Add redirect URLs:
   - Development: `http://localhost:5022`
   - Production: `https://yourdomain.com`

---

## **Step 4: Deploy Edge Function**

### 4.1 Login to Supabase CLI

```bash
supabase login
```

This will open a browser window to authenticate.

### 4.2 Link to Your Project

```bash
cd /path/to/Cursive
supabase link --project-ref <your-project-ref>
```

**Find your project ref:**
- Dashboard > **Settings** > **General**
- Or from your URL: `https://<project-ref>.supabase.co`

### 4.3 Deploy the Edge Function

```bash
supabase functions deploy claude-proxy
```

Expected output:
```
Deploying Function claude-proxy...
Function deployed successfully!
URL: https://<your-project-ref>.supabase.co/functions/v1/claude-proxy
```

### 4.4 Set Edge Function Secrets

```bash
# Set Claude API key
supabase secrets set CLAUDE_API_KEY=sk-ant-your-key-here

# Set Supabase URL and Service Role Key
supabase secrets set SUPABASE_URL=https://xxxxx.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1...
```

**Verify secrets:**
```bash
supabase secrets list
```

---

## **Step 5: Update Frontend Code**

### 5.1 Add Supabase Client Library

Add to `templates/index.html` (before closing `</head>` tag):

```html
<!-- Supabase JS Client -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### 5.2 Update Supabase Configuration

Edit `static/js/supabaseClient.js`:

```javascript
// Replace these with your actual values
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### 5.3 Replace JavaScript Files

**Backup old files first:**
```bash
mv static/js/dataManager.js static/js/dataManager.old.js
mv static/js/aiService.js static/js/aiService.old.js
```

**Rename new files:**
```bash
mv static/js/dataManager.supabase.js static/js/dataManager.js
mv static/js/aiService.supabase.js static/js/aiService.js
```

### 5.4 Update index.html Imports

Make sure `templates/index.html` includes the new modules:

```html
<script type="module">
  import getSupabase from './static/js/supabaseClient.js';
  import * as authService from './static/js/authService.js';
  import * as dataManager from './static/js/dataManager.js';
  import * as aiService from './static/js/aiService.js';

  // Initialize Supabase
  const supabase = getSupabase();

  // ... rest of your app initialization
</script>
```

### 5.5 Add Authentication UI

See [Step 8: Add Auth UI](#step-8-add-authentication-ui) below.

---

## **Step 6: Test the Integration**

### 6.1 Test Authentication

1. Open your app: `http://localhost:5022`
2. You should see a login/signup modal
3. Sign up with a test email
4. Check your email for confirmation link (if enabled)
5. Log in

### 6.2 Test Database Operations

Open browser console and test:

```javascript
// Create a notebook
const notebook = await createNotebook('Test Notebook', 'Testing Supabase');
console.log('Created:', notebook);

// Get all notebooks
const notebooks = await getAllNotebooks();
console.log('Notebooks:', notebooks);

// Create a drawing
const drawing = await saveNotebookItem({
  strokes: [],
  transcription: 'Hello world',
  aiResponse: 'Hi there!',
  type: 'handwriting',
  selectionBox: { x: 0, y: 0, width: 100, height: 50 },
});
console.log('Drawing created:', drawing);
```

### 6.3 Test Claude AI Integration

1. Draw something on the canvas
2. Select it and click "Transcribe"
3. Check browser console for:
   - ✅ Request to Edge Function
   - ✅ Response from Claude API
   - ✅ Usage tracked in database

Verify in Supabase Dashboard > **Table Editor** > `api_usage`:
- You should see a new row with token counts

### 6.4 Test Usage Tracking

```javascript
// Get usage stats
const stats = await getUsageStats();
console.log('Usage stats:', stats);
```

---

## **Step 7: Production Deployment**

### 7.1 Update CORS and Site URL

In Supabase Dashboard:

1. **Authentication** > **URL Configuration**:
   - **Site URL**: `https://yourdomain.com`
   - **Redirect URLs**: Add `https://yourdomain.com/**`

2. **Edge Function CORS** (if needed):
   Edit `supabase/functions/claude-proxy/index.ts`:
   ```typescript
   'Access-Control-Allow-Origin': 'https://yourdomain.com'
   ```

### 7.2 Deploy to Production

```bash
# Redeploy Edge Function with production settings
supabase functions deploy claude-proxy

# Update secrets if different from dev
supabase secrets set CLAUDE_API_KEY=sk-ant-production-key
```

### 7.3 Monitor Usage

Set up monitoring:
1. **Dashboard** > **Database** > **Query Performance**
2. **Edge Functions** > **Logs** (check for errors)
3. **Authentication** > **Users** (monitor sign-ups)

---

## **Step 8: Add Authentication UI**

Add this to `templates/index.html` (before closing `</body>`):

```html
<!-- Authentication Modal -->
<div id="auth-modal" class="modal" style="display: none;">
  <div class="modal-content" style="max-width: 400px; margin: 100px auto; padding: 30px; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
    <h2 id="auth-modal-title" style="margin-bottom: 20px;">Welcome to Cursive</h2>

    <!-- Login Form -->
    <form id="login-form" style="display: block;">
      <div style="margin-bottom: 15px;">
        <input
          type="email"
          id="login-email"
          placeholder="Email"
          required
          style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;"
        />
      </div>
      <div style="margin-bottom: 15px;">
        <input
          type="password"
          id="login-password"
          placeholder="Password"
          required
          style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;"
        />
      </div>
      <button
        type="submit"
        style="width: 100%; padding: 12px; background: #4F46E5; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer;"
      >
        Log In
      </button>
      <p style="margin-top: 15px; text-align: center; font-size: 14px;">
        Don't have an account? <a href="#" id="show-signup" style="color: #4F46E5; text-decoration: none;">Sign up</a>
      </p>
    </form>

    <!-- Signup Form -->
    <form id="signup-form" style="display: none;">
      <div style="margin-bottom: 15px;">
        <input
          type="email"
          id="signup-email"
          placeholder="Email"
          required
          style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;"
        />
      </div>
      <div style="margin-bottom: 15px;">
        <input
          type="password"
          id="signup-password"
          placeholder="Password (min 8 characters)"
          required
          style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;"
        />
      </div>
      <button
        type="submit"
        style="width: 100%; padding: 12px; background: #4F46E5; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer;"
      >
        Sign Up
      </button>
      <p style="margin-top: 15px; text-align: center; font-size: 14px;">
        Already have an account? <a href="#" id="show-login" style="color: #4F46E5; text-decoration: none;">Log in</a>
      </p>
    </form>

    <div id="auth-error" style="display: none; margin-top: 15px; padding: 10px; background: #FEE2E2; color: #DC2626; border-radius: 6px; font-size: 14px;"></div>
  </div>
</div>

<!-- Add this CSS too -->
<style>
  .modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
```

Then add this JavaScript to initialize auth (in your main script):

```javascript
import { login, signUp, onAuthStateChange, isAuthenticated } from './static/js/authService.js';

// Check auth on page load
async function init() {
  const authed = await isAuthenticated();

  if (!authed) {
    showAuthModal();
    return;
  }

  // User is authenticated, initialize app
  initializeApp();
}

function showAuthModal() {
  document.getElementById('auth-modal').style.display = 'flex';
}

function hideAuthModal() {
  document.getElementById('auth-modal').style.display = 'none';
}

// Login form handler
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    await login(email, password);
    hideAuthModal();
    initializeApp();
  } catch (error) {
    const errorEl = document.getElementById('auth-error');
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
  }
});

// Signup form handler
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;

  try {
    await signUp(email, password);
    alert('Sign up successful! Please check your email to confirm your account.');
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
  } catch (error) {
    const errorEl = document.getElementById('auth-error');
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
  }
});

// Toggle forms
document.getElementById('show-signup').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = 'block';
  document.getElementById('auth-modal-title').textContent = 'Create Account';
});

document.getElementById('show-login').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('auth-modal-title').textContent = 'Welcome Back';
});

// Listen for auth changes
onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    hideAuthModal();
    initializeApp();
  } else if (event === 'SIGNED_OUT') {
    showAuthModal();
  }
});

// Start
init();
```

---

## **Troubleshooting**

### ❌ "Supabase client not initialized"

**Solution:**
- Check that you've added the Supabase CDN script to `index.html`
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in `supabaseClient.js`

### ❌ "Invalid or expired token"

**Solution:**
- Clear browser localStorage: `localStorage.clear()`
- Log out and log back in
- Check token expiration in Supabase Dashboard > Authentication > Settings

### ❌ "Row Level Security policy violation"

**Solution:**
- Verify RLS policies are created (check `supabase_schema.sql`)
- Ensure user is authenticated when making queries
- Check user ID matches in database

### ❌ Edge Function returns 500 error

**Solution:**
- Check Edge Function logs: `supabase functions logs claude-proxy`
- Verify secrets are set: `supabase secrets list`
- Check Claude API key is valid

### ❌ "Failed to fetch" on API calls

**Solution:**
- Check CORS settings in Edge Function
- Verify Edge Function is deployed: `supabase functions list`
- Check network tab in browser DevTools

---

## **Migration Checklist**

Use this checklist to track your progress:

### Setup
- [ ] Create Supabase project
- [ ] Get API keys (URL, Anon, Service Role)
- [ ] Run database schema SQL
- [ ] Enable email authentication
- [ ] (Optional) Set up OAuth providers

### Edge Function
- [ ] Install Supabase CLI
- [ ] Link to project
- [ ] Deploy `claude-proxy` Edge Function
- [ ] Set secrets (CLAUDE_API_KEY, etc.)
- [ ] Test Edge Function with curl

### Frontend
- [ ] Add Supabase CDN script to index.html
- [ ] Update `supabaseClient.js` with your credentials
- [ ] Replace `dataManager.js` with Supabase version
- [ ] Replace `aiService.js` with Supabase version
- [ ] Add authentication UI
- [ ] Test login/signup flow
- [ ] Test notebook CRUD operations
- [ ] Test Claude AI integration
- [ ] Test usage tracking

### Production
- [ ] Update Site URL and Redirect URLs
- [ ] Deploy Edge Function with production secrets
- [ ] Set up monitoring
- [ ] Test end-to-end in production

---

## **Next Steps**

Once migration is complete:

1. **Add Stripe Integration** (optional):
   - Follow [STRIPE_SETUP.md](STRIPE_SETUP.md) (to be created)
   - Set up subscription tiers
   - Test checkout flow

2. **Add Features**:
   - Real-time collaboration (Supabase Realtime)
   - Notebook sharing
   - Export to PDF with server-side rendering

3. **Optimize**:
   - Add caching with Redis
   - Optimize database queries
   - Add CDN for static assets

---

## **Support**

Need help? Check:

- [Supabase Documentation](https://supabase.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [GitHub Issues](https://github.com/your-repo/issues)

---

✨ **You've successfully migrated Cursive to Supabase!** Enjoy your new scalable backend! 🎉
