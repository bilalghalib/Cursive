# Simple Setup Guide - Cursive

## ✅ What We Did

Removed all complexity! No more Flask, no more Vite. Just simple static files + Supabase.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
# Copy the example file
cp static/js/env.example.js static/js/env.js

# Edit static/js/env.js with your Supabase credentials
```

### 3. Run Development Server
```bash
npm run dev
```

Server starts on:
- **Local**: http://localhost:8080
- **Network**: http://0.0.0.0:8080

---

## 📱 Testing on iPad

### Find Your Computer's IP Address

**Mac/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```bash
ipconfig
```

Look for something like `192.168.1.X` or `10.0.0.X`

### Connect from iPad

1. Make sure iPad is on **same WiFi network** as your computer
2. Open Safari on iPad
3. Go to: `http://YOUR_IP:8080`
4. Draw and test!

**Example:** If your IP is `192.168.1.100`, open `http://192.168.1.100:8080`

---

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│  Frontend (Static Files)            │
│  - HTML/CSS/JavaScript (ES6)        │
│  - Runs in browser                  │
│  - No build step needed             │
└──────────────┬──────────────────────┘
               │
               ↓
┌──────────────────────────────────────┐
│  Supabase (Backend as a Service)     │
│  ├─ Database (PostgreSQL)            │
│  ├─ Authentication                   │
│  ├─ Edge Functions (API proxy)       │
│  └─ Storage                          │
└──────────────┬───────────────────────┘
               │
               ↓
┌──────────────────────────────────────┐
│  Anthropic Claude API                │
│  - Vision (OCR handwriting)          │
│  - Chat (AI responses)               │
└──────────────────────────────────────┘
```

---

## 📁 Project Structure

```
Cursive/
├── index.html              # Main page
├── server.js               # Simple static file server
├── package.json            # Node dependencies
├── vercel.json             # Vercel deployment config
│
├── static/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── env.js          # ⚠️ Your credentials (gitignored)
│   │   ├── env.example.js  # Template
│   │   ├── supabaseClient.js
│   │   ├── app.js
│   │   └── ...
│   └── config/
│       └── config.yaml
│
└── supabase/
    ├── migrations/         # Database schema
    └── functions/          # Edge Functions (API proxy)
        ├── claude-proxy/
        └── stripe-webhook/
```

---

## 🔧 Development Workflow

### 1. Edit Code
Just edit any `.js`, `.css`, or `.html` file

### 2. Refresh Browser
No build step! Changes appear instantly

### 3. Test on iPad
Open `http://YOUR_IP:8080` on iPad and test

### 4. Commit Changes
```bash
git add .
git commit -m "Your changes"
git push
```

---

## 🌐 Deploy to Vercel

### Option 1: GitHub Integration (Recommended)
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your repository
5. Vercel auto-detects settings from `vercel.json`
6. Add environment variables in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - **Don't** add any Supabase variables (they're in `env.js` already)
7. Deploy!

### Option 2: Vercel CLI
```bash
npm install -g vercel
vercel login
vercel
```

### Deploying Supabase Edge Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy functions
supabase functions deploy claude-proxy
supabase functions deploy stripe-webhook
```

---

## 🔐 Security Notes

### What's Safe to Commit
- ✅ `env.example.js` (template)
- ✅ All HTML/CSS/JS (except `env.js`)
- ✅ Supabase anon key in `env.js` (protected by RLS)

### What's NOT Safe
- ❌ `env.js` (your actual credentials)
- ❌ Supabase service role key (never expose to frontend)
- ❌ `.env` file (legacy, not used anymore)

### Why Anon Key is Safe
The Supabase anon key is **public by design**. Your data is protected by:
- Row Level Security (RLS) policies in your database
- Authentication requirements
- Edge Function validation

---

## 🐛 Troubleshooting

### Server won't start
```bash
# Make sure port 8080 is not in use
lsof -i :8080
kill -9 PID

# Or change port in server.js
const PORT = 3000;
```

### Can't access from iPad
1. **Check WiFi**: iPad and computer on same network?
2. **Check IP**: Is the IP address correct?
3. **Check Firewall**: Is port 8080 allowed?
```bash
# Mac: Allow incoming connections
# System Preferences → Security & Privacy → Firewall → Firewall Options
# Allow Node.js

# Windows: Allow port in Windows Firewall
```

### Supabase errors
- Make sure `env.js` exists (copy from `env.example.js`)
- Check credentials are correct
- Check browser console for errors (F12)

### "Module not found" errors
- Make sure server is running (`npm run dev`)
- Check file paths in `index.html` match actual files
- All modules use `.js` extension in imports

---

## 📊 What Changed from Before

| Before | After |
|--------|-------|
| Flask backend | ❌ Removed |
| Vite build system | ❌ Removed |
| npm @supabase/supabase-js | ❌ Removed |
| Python dependencies | ❌ Removed |
| Build step | ❌ Removed |
| .env file | ❌ Removed (use env.js) |
| Supabase CDN | ✅ Added |
| Simple Node server | ✅ Added |
| Static deployment | ✅ Added |
| iPad local network testing | ✅ Added |

---

## 💡 Pro Tips

### Hot Reloading
The server doesn't have hot reload built-in. Just refresh your browser after editing files.

### iPad Debugging
1. Connect iPad to Mac via USB
2. Open Safari on Mac
3. Develop → iPad → Your Page
4. Full DevTools available!

### Network Speed
Test on local WiFi is usually fast enough. If you need faster:
1. Connect iPad via USB
2. Use Safari's USB debugging
3. Or deploy to Vercel and test from there

### Multiple Devices
The server accepts connections from any device on your network:
- iPad: `http://YOUR_IP:8080`
- iPhone: `http://YOUR_IP:8080`
- Another laptop: `http://YOUR_IP:8080`

---

## 📚 Next Steps

1. **Test the app**: Draw, transcribe, get AI responses
2. **Deploy to Vercel**: Make it live on the internet
3. **Set up Supabase**: Create database, enable auth, deploy Edge Functions
4. **Add features**: Check `CLAUDE.md` for roadmap

---

## 🆘 Need Help?

1. Check browser console (F12) for errors
2. Check server console for request logs
3. Read detailed setup: `VERCEL_SUPABASE_REFACTOR.md`
4. Check Supabase docs: https://supabase.com/docs

---

**You're all set!** 🎉

The app is now super simple:
- No build tools
- No backend server to manage
- Just edit and refresh
- Test on iPad via local network
- Deploy to Vercel when ready
