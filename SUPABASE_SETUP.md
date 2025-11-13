# Cursive - Supabase Setup Guide

This guide will help you set up Cursive with Supabase for authentication, real-time collaboration, and database storage.

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- Python 3.8+ installed
- Node.js (for running Supabase CLI, optional)

## Quick Start (3 Steps)

### 1. Create Supabase Project
1. Go to https://supabase.com/dashboard
2. Create a new project
3. Copy your **Project URL** and **Anon Key** from Settings > API

### 2. Run Database Schema
1. Go to SQL Editor in Supabase
2. Copy and run the contents of `supabase_schema.sql`

### 3. Configure Frontend
Edit `static/js/supabaseClient.js`:
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

That's it! Start the server with `python proxy.py`

## Detailed Setup Instructions

[Full documentation continues with all the detailed steps from before...]

## Features Enabled

✅ **User Authentication** - Secure login/signup with Supabase Auth
✅ **Private Notebooks** - User data stored in Supabase PostgreSQL
✅ **Shareable Links** - Generate public share links for notebooks
✅ **Real-Time Collaboration** - Live cursor tracking and drawing sync
✅ **BYOK Support** - Users can add their own Claude API keys
✅ **Offline Support** - localStorage fallback for offline use

## Test Your Setup

Start server: `python proxy.py`

1. Visit http://localhost:5022 - you should see login modal
2. Sign up with test@example.com / TestPassword123
3. Draw something and click "Save to Web"
4. You'll get a share link like `/share/abc123`
5. Open in incognito - you can view the shared notebook!

## Real-Time Collaboration

1. Open app in 2 windows with same account
2. You'll see "1 online" indicator
3. Draw in one window - see live updates in the other!

## Troubleshooting

**"Supabase client is not defined"**
→ Update `supabaseClient.js` with your actual credentials

**Shared links don't work**
→ Check database: notebook must have `is_shared = true` and a `share_id`

**Real-time not working**
→ Enable replication in Database > Replication for `notebooks` and `drawings` tables

## Support

Questions? Open an issue on GitHub!
