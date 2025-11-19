# Cursive Setup Guide

Complete guide to setting up and deploying Cursive.

---

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** and npm installed
- **Git** for version control
- **Supabase account** (free tier works) - [Sign up here](https://supabase.com)
- **Anthropic API key** (optional if using BYOK) - [Get one here](https://console.anthropic.com/)
- **Vercel account** (optional, for deployment) - [Sign up here](https://vercel.com)

---

## 🚀 Quick Start (Local Development)

### Step 1: Clone Repository

```bash
git clone https://github.com/bilalghalib/Cursive.git
cd Cursive
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- Next.js 15
- React 18
- TypeScript
- Tailwind CSS 4
- Supabase client
- perfect-freehand
- Other dependencies

### Step 3: Set Up Supabase

#### 3.1 Create a Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in:
   - **Name:** Cursive (or your preferred name)
   - **Database Password:** Choose a strong password (save this!)
   - **Region:** Choose closest to your users
4. Click "Create new project" and wait ~2 minutes

#### 3.2 Get Your Supabase Credentials

Once your project is ready:

1. Go to **Settings** > **API**
2. Copy these values:
   - **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
   - **anon/public key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)

#### 3.3 Apply Database Schema

1. Copy the contents of `database/UNIFIED_SCHEMA.sql`
2. Go to Supabase Dashboard > **SQL Editor**
3. Click "New Query"
4. Paste the schema
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Verify: You should see "Schema is now ready" message

**What this creates:**
- `notebooks` table - Collections of drawings
- `drawings` table - Individual strokes with AI responses
- `user_handwriting` table - Handwriting training samples
- `api_usage` table - Token tracking for billing
- `user_settings` table - User preferences and BYOK keys
- Row Level Security (RLS) policies for all tables
- Triggers for auto-updating timestamps

#### 3.4 Enable Email Authentication

1. Go to **Authentication** > **Providers**
2. Enable **Email** provider
3. (Optional) Configure email templates in **Authentication** > **Email Templates**

### Step 4: Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Anthropic API (OPTIONAL - only if NOT using BYOK)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Stripe (OPTIONAL - for billing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Notes:**
- **Supabase credentials are REQUIRED** - the app won't work without them
- **Anthropic API key is OPTIONAL** - only needed if you want to provide API access for users without their own keys (BYOK)
- **Stripe keys are OPTIONAL** - only needed if you want to charge users for API usage

### Step 5: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**You should see:**
- The Cursive canvas interface
- A "Sign In" button in the toolbar
- Drawing tools (pencil, select, pan, zoom)

### Step 6: Test the Application

1. **Sign Up:**
   - Click "Sign In" button
   - Click "Sign up" tab
   - Enter email and password (min 6 characters)
   - Check your email for verification link
   - Click verification link

2. **Sign In:**
   - Return to app
   - Click "Sign In"
   - Enter credentials
   - You should now see your email in the user menu

3. **Draw:**
   - Select the pencil tool
   - Draw on the canvas (works best with stylus/Apple Pencil)
   - Your strokes should appear in black

4. **Test AI (requires Anthropic API key):**
   - Write some text by hand
   - Select the selection tool
   - Drag a box around your handwriting
   - AI should transcribe and respond (appears in indigo/purple)

5. **Test Student Mode:**
   - Click "Student Mode" button in toolbar
   - AI responses should disappear
   - Click "Full View" to show them again

---

## 🌐 Production Deployment (Vercel)

### Prerequisites

- Vercel account ([sign up free](https://vercel.com))
- Supabase project set up (from above)
- Git repository pushed to GitHub/GitLab/Bitbucket

### Step 1: Connect Repository to Vercel

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your Cursive repository
4. Click "Import"

### Step 2: Configure Environment Variables

In Vercel project settings, add these environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=sk-ant-your-key (optional)
```

**How to add:**
1. Go to your Vercel project
2. Click **Settings** > **Environment Variables**
3. Add each variable:
   - Key: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: Your Supabase URL
   - Click "Add"
4. Repeat for each variable

### Step 3: Deploy

1. Click **Deploy** button
2. Wait ~2-3 minutes for build to complete
3. Visit your deployment URL (e.g., `cursive-xyz.vercel.app`)

### Step 4: Configure Supabase for Production

Update your Supabase project to allow your production domain:

1. Go to Supabase Dashboard > **Authentication** > **URL Configuration**
2. Add your Vercel domain to **Site URL**:
   - Example: `https://cursive-xyz.vercel.app`
3. Add to **Redirect URLs**:
   - `https://cursive-xyz.vercel.app`
   - `https://cursive-xyz.vercel.app/**`

### Step 5: Test Production Deployment

1. Visit your Vercel URL
2. Sign up with a test account
3. Verify email works
4. Test drawing and AI features
5. Test Student Mode toggle

---

## 🔧 Advanced Configuration

### Custom Domain

1. Go to Vercel project > **Settings** > **Domains**
2. Add your custom domain (e.g., `cursive.app`)
3. Follow DNS instructions
4. Update Supabase URL configuration with new domain

### Enable Stripe Billing (Optional)

If you want to charge users for API usage:

1. **Create Stripe account:** [https://stripe.com](https://stripe.com)
2. **Get API keys:**
   - Dashboard > **Developers** > **API keys**
   - Copy **Secret key** and **Publishable key**
3. **Add to environment variables:**
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
4. **Create products in Stripe:**
   - Free tier: 10,000 tokens/month
   - Pro tier: $9/month + 50,000 tokens
   - Tokens: $0.02 per 1,000 tokens (15% markup)

### Supabase Edge Functions (Optional)

If you want to deploy the Claude API proxy as a Supabase Edge Function:

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link to your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. Deploy edge function:
   ```bash
   supabase functions deploy claude-proxy
   ```

4. Set secrets:
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key
   ```

**Note:** Currently the app uses Next.js API routes. Edge Functions are an alternative deployment option.

---

## 🔐 Security Checklist

Before launching publicly:

### Database Security
- ✅ RLS policies enabled on all tables
- ✅ API keys stored encrypted
- ✅ No public access to user data
- ✅ Audit logs for admin actions

### Authentication
- ✅ Email verification required
- ✅ Strong password requirements (min 6 characters, recommend 12+)
- ✅ Secure session cookies (httpOnly, sameSite)
- ✅ Rate limiting on auth endpoints

### API Security
- ✅ CORS configured (not wildcard)
- ✅ Input validation on all endpoints
- ✅ Rate limiting on AI requests
- ✅ Token usage tracking and limits

### Privacy
- ✅ Privacy policy published
- ✅ COPPA compliance (if targeting children under 13)
- ✅ GDPR compliance (if serving EU users)
- ✅ Data retention policy

---

## 🐛 Troubleshooting

### "Supabase is not configured" Error

**Problem:** App shows error about missing Supabase configuration

**Solution:**
1. Verify `.env.local` exists and has correct values
2. Check environment variables are prefixed with `NEXT_PUBLIC_`
3. Restart dev server after changing env vars
4. For Vercel: check environment variables in project settings

### Database Connection Error

**Problem:** Can't connect to Supabase

**Solution:**
1. Verify project URL is correct (should end with `.supabase.co`)
2. Check if database is paused (free tier pauses after inactivity)
3. Verify RLS policies are set up correctly
4. Check Supabase project status in dashboard

### Auth Not Working

**Problem:** Can't sign up or sign in

**Solution:**
1. Check Email provider is enabled in Supabase
2. Verify site URL matches your domain
3. Check spam folder for verification emails
4. Review Supabase Auth logs for errors
5. Ensure RLS policies allow user creation

### AI Responses Not Appearing

**Problem:** Selection works but no AI response

**Solution:**
1. Check `ANTHROPIC_API_KEY` is set (if not using BYOK)
2. Verify API key is valid in Anthropic console
3. Check browser console for errors
4. Verify network requests in DevTools
5. Check API usage limits not exceeded

### Student Mode Not Working

**Problem:** Toggle button doesn't hide AI responses

**Solution:**
1. Clear browser cache and reload
2. Check if overlays have `isAI: true` flag
3. Verify toggle state in React DevTools
4. Check browser console for errors

---

## 📊 Monitoring

### Production Monitoring

Recommended tools:

1. **Error Tracking:** [Sentry](https://sentry.io)
   ```bash
   npm install @sentry/nextjs
   npx @sentry/wizard -i nextjs
   ```

2. **Analytics:** [Vercel Analytics](https://vercel.com/analytics)
   - Built-in, no setup needed

3. **Database:** Supabase Dashboard
   - Query performance
   - Row count metrics
   - API usage stats

### Key Metrics to Monitor

- **User signups** - Track growth
- **Active users** - Daily/weekly active
- **API token usage** - Cost monitoring
- **Error rate** - Application health
- **Student mode usage** - Feature adoption
- **Export frequency** - User engagement

---

## 🆘 Support

### Documentation

- **Project Overview:** [CLAUDE.md](./CLAUDE.md)
- **Core Values:** [REAL_VALUES.md](./REAL_VALUES.md)
- **Database Schema:** [database/SCHEMA_README.md](./database/SCHEMA_README.md)

### Getting Help

- **GitHub Issues:** [Report bugs](https://github.com/bilalghalib/Cursive/issues)
- **GitHub Discussions:** [Ask questions](https://github.com/bilalghalib/Cursive/discussions)
- **Supabase Docs:** [https://supabase.com/docs](https://supabase.com/docs)
- **Next.js Docs:** [https://nextjs.org/docs](https://nextjs.org/docs)

---

## ✅ Post-Launch Checklist

Before announcing your Cursive deployment:

- [ ] Test signup/login flow end-to-end
- [ ] Verify email delivery works
- [ ] Test on multiple devices (desktop, tablet, iPad)
- [ ] Confirm Student Mode works correctly
- [ ] Test AI responses with real handwriting
- [ ] Verify PDF export includes/excludes AI as expected
- [ ] Set up error monitoring (Sentry)
- [ ] Configure backups (Supabase auto-backups enabled)
- [ ] Publish privacy policy
- [ ] Publish terms of service
- [ ] Test payment flow (if using Stripe)
- [ ] Set up support email/contact form
- [ ] Create user documentation/tutorials
- [ ] Prepare demo video for teachers/parents

---

**Ready to launch?** Follow this guide step-by-step, and your Cursive deployment will be live in under an hour.

Need help? Check [CLAUDE.md](./CLAUDE.md) for detailed architecture documentation.
