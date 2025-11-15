# Development Setup

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# Server will start at:
# - Local: http://localhost:5173
# - Network: http://192.168.1.X:5173 (check terminal output for exact IP)
```

## For iPad Testing

When you run `npm run dev`, Vite will show you the network address:

```
 VITE v7.2.2  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.45:5173/   ← Use this on your iPad
```

**On your iPad:**
1. Make sure you're on the same WiFi network as your computer
2. Open Safari
3. Navigate to the Network URL shown in your terminal (e.g., `http://192.168.1.45:5173`)
4. Done! You can now test with Apple Pencil

## Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory, ready to deploy to Vercel.

## Environment Variables

Make sure you have a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=https://kfgmeonhhmchoyoklswm.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

(Copy from `.env.example` if you don't have one)

## Why Vite?

✅ **Hot Module Replacement** - Changes appear instantly without full reload  
✅ **Modern ES modules** - Can use npm packages like `@supabase/supabase-js`  
✅ **Tree-shaking** - Only bundles code you actually use  
✅ **Network access** - Easy iPad/mobile testing on local WiFi  
✅ **Fast builds** - Production builds optimized and minified  
✅ **Cache busting** - File hashes prevent stale code in production

## Troubleshooting

### "Missing Supabase environment variables"
Make sure your `.env` file exists and has the correct values.

### Can't access from iPad
- Check that both devices are on the same WiFi network
- Check your computer's firewall settings (may need to allow port 5173)
- Try accessing `http://[computer-name].local:5173` instead

### Build fails
- Delete `node_modules` and `dist` folders
- Run `npm install` again
- Try `npm run build` again
