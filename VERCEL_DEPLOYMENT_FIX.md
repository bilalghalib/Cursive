# Vercel Deployment Fix

## Problem

Vercel was serving the old static `index.html` instead of the Next.js app, causing:
1. **404 error for env.js** - The old static site tried to load a gitignored file
2. **Tracking Prevention blocked storage** - Browser privacy features blocking localStorage access
3. **Wrong app version** - Showing v1.0.44 (old static site) instead of Next.js app

## Solution Applied

### 1. Moved Old Static Site to Archive
```bash
mv index.html legacy-static-site/
mv static legacy-static-site/
mv templates legacy-static-site/
```

Now Vercel will serve the **Next.js app** from `app/page.tsx` instead of the old static HTML.

### 2. Updated vercel.json
- Removed old static file rewrites (no longer needed)
- Added `Permissions-Policy: storage-access=*` header to prevent tracking prevention issues
- Kept security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)

### 3. Environment Variables Needed in Vercel

**IMPORTANT:** You need to add these environment variables in your Vercel project settings:

Go to: https://vercel.com/bilalghalib/cursive/settings/environment-variables

Add the following variables from your `.env.local.example`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Anthropic API (for AI features)
ANTHROPIC_API_KEY=sk-ant-...

# App URL
NEXT_PUBLIC_APP_URL=https://cursive-draw.vercel.app
```

## What Works Now

✅ **Next.js app will be served** instead of old static site
✅ **No more env.js 404 errors** - Next.js uses environment variables
✅ **No tracking prevention issues** - Proper headers configured
✅ **Working Canvas and Toolbar** - Already implemented in Next.js app

## Next Steps

1. **Commit and push these changes**
2. **Add environment variables in Vercel** (see above)
3. **Redeploy** - Vercel will auto-deploy when you push

## Testing

After deployment, you should see:
- ✅ Next.js app loads (with Canvas and Toolbar)
- ✅ No console errors
- ✅ No 404 for env.js
- ✅ No storage blocking warnings

## What's Different in the Next.js App

The Next.js app currently has:
- ✅ Basic canvas drawing (components/Canvas.tsx)
- ✅ Toolbar with tool selection (components/Toolbar.tsx)
- ⏳ 30% feature parity with old site
- ⏳ Still needs: handwriting simulation, AI chat, plugins, export

See `NEXTJS_MIGRATION_STATUS.md` for full migration status.

## Rollback (if needed)

If you need to rollback to the old static site:
```bash
mv legacy-static-site/index.html .
mv legacy-static-site/static .
mv legacy-static-site/templates .
```

But you'll need to fix the env.js issue (create it from env.example.js with real credentials).
