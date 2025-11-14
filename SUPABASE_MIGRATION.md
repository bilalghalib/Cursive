# Supabase Migration Guide
## Moving from Flask to Supabase Edge Functions

This guide will help you migrate your Cursive backend from Flask/Python to Supabase.

---

## 📊 What's Being Migrated

| Component | From (Flask) | To (Supabase) |
|-----------|--------------|---------------|
| **Auth** | Flask-Login | Supabase Auth |
| **Database** | PostgreSQL (self-hosted) | Supabase PostgreSQL |
| **API Proxy** | Flask `proxy.py` | Edge Function `claude-proxy` |
| **Billing** | Flask `billing.py` | Edge Function `stripe-webhook` |
| **Rate Limiting** | Flask-Limiter + Redis | Database functions + RLS |
| **Hosting** | Self-hosted (Gunicorn) | Supabase (global edge) |

---

## 🚀 Step 1: Create Supabase Project

### 1.1 Sign Up for Supabase
1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Choose organization
5. Set project name: `cursive-prod`
6. Set database password (save this!)
7. Choose region (closest to your users)
8. Click "Create new project"

### 1.2 Get Your Credentials
Once the project is created, go to **Settings > API**:

- `SUPABASE_URL`: `https://xxxxx.supabase.co`
- `SUPABASE_ANON_KEY`: `eyJhbG...` (public key, safe for frontend)
- `SUPABASE_SERVICE_ROLE_KEY`: `eyJhbG...` (secret key, never expose!)

Save these - you'll need them shortly.

---

## 🗄️ Step 2: Set Up Database

### 2.1 Run Migration SQL

1. In Supabase Dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase/migrations/20251113000000_initial_schema.sql`
4. Paste into the editor
5. Click "Run" (bottom right)

This will create:
- ✅ All tables (user_settings, notebooks, drawings, api_usage, billing)
- ✅ Row Level Security policies
- ✅ Triggers for auto-tracking usage
- ✅ Functions for quota checking

### 2.2 Verify Tables Created

Go to **Table Editor** in the sidebar. You should see:
- `user_settings`
- `notebooks`
- `drawings`
- `api_usage`
- `billing`

---

## 🔐 Step 3: Configure Authentication

### 3.1 Enable Email Auth

1. Go to **Authentication > Providers**
2. Enable **Email** provider
3. Configure settings:
   - ✅ Enable email confirmations (recommended)
   - ✅ Enable secure password reset
   - Minimum password length: 8 characters

### 3.2 Update Email Templates (Optional)

Go to **Authentication > Email Templates** to customize:
- Confirmation email
- Password reset email
- Magic link email

---

## ⚡ Step 4: Deploy Edge Functions

### 4.1 Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (with Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
brew install supabase/tap/supabase
```

### 4.2 Login to Supabase

```bash
npx supabase login
```

This will open your browser - authorize the CLI.

### 4.3 Link Your Project

```bash
cd /path/to/Cursive
npx supabase link --project-ref your-project-ref
```

Find your `project-ref` in Supabase Dashboard > Settings > General

### 4.4 Set Secrets

```bash
# Anthropic API Key (your server key)
npx supabase secrets set CLAUDE_API_KEY=sk-ant-your-key-here

# Stripe Keys
npx supabase secrets set STRIPE_SECRET_KEY=sk_...
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase keys (auto-detected, but set them to be safe)
npx supabase secrets set SUPABASE_URL=https://xxxxx.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

### 4.5 Deploy Functions

```bash
# Deploy Claude API proxy
npx supabase functions deploy claude-proxy

# Deploy Stripe webhook handler
npx supabase functions deploy stripe-webhook
```

You should see:
```
Deploying function claude-proxy...
  Function deployed successfully ✓
  https://xxxxx.supabase.co/functions/v1/claude-proxy
```

---

## 🎨 Step 5: Update Frontend

### 5.1 Update Supabase Client Configuration

Edit `static/js/supabaseClient.js`:

```javascript
// Replace these placeholder values with your real credentials
const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// Create and export Supabase client
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 5.2 Update API Endpoints

Edit `static/js/aiService.js`:

**Before:**
```javascript
const response = await fetch('/api/claude', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({...})
});
```

**After:**
```javascript
import { supabaseClient } from './supabaseClient.js';

const { data: { session } } = await supabaseClient.auth.getSession();

const response = await fetch('https://YOUR-PROJECT-REF.supabase.co/functions/v1/claude-proxy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  },
  body: JSON.stringify({...})
});
```

**OR** use environment variable:

```javascript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR-PROJECT-REF.supabase.co';

const response = await fetch(`${SUPABASE_URL}/functions/v1/claude-proxy`, {
  // ...
});
```

---

## 💳 Step 6: Configure Stripe Webhooks

### 6.1 Update Webhook Endpoint in Stripe

1. Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter URL: `https://YOUR-PROJECT-REF.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)
7. Add it to Supabase secrets:
   ```bash
   npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### 6.2 Test Webhook (Optional)

Use Stripe CLI to test locally:
```bash
stripe listen --forward-to https://YOUR-PROJECT-REF.supabase.co/functions/v1/stripe-webhook
stripe trigger checkout.session.completed
```

---

## 📋 Step 7: Migrate Existing Data (Optional)

If you have existing users and data in your Flask database:

### 7.1 Export from Flask PostgreSQL

```bash
# Export users (excluding passwords - they'll need to reset)
psql $DATABASE_URL -c "COPY (SELECT id, email, subscription_tier, created_at FROM users) TO STDOUT CSV HEADER" > users.csv

# Export notebooks
psql $DATABASE_URL -c "COPY notebooks TO STDOUT CSV HEADER" > notebooks.csv

# Export drawings
psql $DATABASE_URL -c "COPY drawings TO STDOUT CSV HEADER" > drawings.csv
```

### 7.2 Import to Supabase

Go to Supabase Dashboard > Table Editor:

1. Select `user_settings` table
2. Click "Insert" > "Import from CSV"
3. Upload `users.csv`
4. Map columns appropriately

Repeat for `notebooks` and `drawings`.

**Note:** Users will need to reset their passwords since Supabase uses different hashing.

---

## 🧪 Step 8: Test Everything

### 8.1 Test Authentication

1. Go to your app
2. Sign up with a new account
3. Check Supabase Dashboard > Authentication > Users
4. User should appear

### 8.2 Test AI Proxy

```bash
# Get a session token first (sign in via app or use Supabase dashboard)
TOKEN="your-session-token-here"

curl -X POST https://YOUR-PROJECT-REF.supabase.co/functions/v1/claude-proxy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

You should get a response from Claude.

### 8.3 Test Stripe Webhook

```bash
stripe trigger checkout.session.completed
```

Check Supabase Dashboard > Table Editor > billing - a new record should appear.

---

## 📊 Step 9: Monitor & Optimize

### 9.1 Set Up Monitoring

In Supabase Dashboard:

1. **Logs**: Go to Edge Functions > claude-proxy > Logs
   - Watch for errors
   - Monitor response times

2. **Database**: Go to Database > Logs
   - Check slow queries
   - Optimize indexes if needed

3. **Auth**: Go to Authentication > Logs
   - Monitor login attempts
   - Watch for suspicious activity

### 9.2 Enable Database Backups

1. Go to **Database > Backups**
2. Enable daily backups
3. Set retention period: 7-30 days

### 9.3 Set Up Alerts (Pro Plan)

If on Pro plan, set up alerts for:
- High database load
- Failed authentication attempts
- Edge function errors

---

## 🚀 Step 10: Go Live!

### 10.1 Update Environment Variables

In your production environment:
```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

### 10.2 Deploy Frontend

```bash
# Build your app
npm run build

# Deploy to your hosting (Vercel, Netlify, etc.)
# Example with Vercel:
vercel --prod
```

### 10.3 Shut Down Flask Server

Once everything is working:

1. Test thoroughly for 24-48 hours
2. Backup Flask database one last time
3. Shut down Flask/Gunicorn server
4. Cancel any hosting services (DigitalOcean, AWS, etc.)

---

## 💰 Cost Comparison

| Service | Flask (Self-Hosted) | Supabase |
|---------|---------------------|----------|
| **Server** | $20-50/month | $0 (Free tier) |
| **Redis** | $15/month | Included |
| **PostgreSQL** | $15/month | Included |
| **SSL Certs** | $0 (Let's Encrypt) | Included |
| **Monitoring** | $20/month | Included |
| **Backups** | Manual | Automated |
| **Scaling** | Manual | Automatic |
| **Total** | **$55-85/month** | **$0-25/month** |

Plus: No server management, no DevOps headaches!

---

## 🆘 Troubleshooting

### Error: "Invalid or expired token"

**Fix:** Make sure you're passing the Supabase session token:
```javascript
const { data: { session } } = await supabaseClient.auth.getSession();
fetch(..., {
  headers: { 'Authorization': `Bearer ${session.access_token}` }
})
```

### Error: "CLAUDE_API_KEY not configured"

**Fix:** Set the secret:
```bash
npx supabase secrets set CLAUDE_API_KEY=sk-ant-...
```

### Edge Function Logs Not Showing

**Fix:** Check the function deployed correctly:
```bash
npx supabase functions list
```

### Database Connection Errors

**Fix:** Check RLS policies are set up correctly. Go to Database > Policies.

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)

---

## ✅ Migration Checklist

Print this and check off as you go:

- [ ] Created Supabase project
- [ ] Saved all credentials (URL, anon key, service role key)
- [ ] Ran database migration SQL
- [ ] Verified tables created
- [ ] Enabled email authentication
- [ ] Installed Supabase CLI
- [ ] Linked project with CLI
- [ ] Set all secrets (Anthropic, Stripe, Supabase)
- [ ] Deployed `claude-proxy` function
- [ ] Deployed `stripe-webhook` function
- [ ] Updated frontend `supabaseClient.js` with real credentials
- [ ] Updated `aiService.js` to call Supabase functions
- [ ] Updated Stripe webhook endpoint
- [ ] Tested authentication (sign up/login)
- [ ] Tested AI proxy (make a Claude API call)
- [ ] Tested Stripe webhook
- [ ] Enabled database backups
- [ ] Deployed frontend to production
- [ ] Monitored for 24-48 hours
- [ ] Shut down Flask server

---

**Questions?** Open an issue or check Supabase Discord for help!

**Estimated Total Time:** 2-4 hours for experienced developers

Good luck with your migration! 🚀
