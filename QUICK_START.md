# ✍️ Handwriting Writeback - Quick Start

## 🚀 TL;DR

```bash
# 1. Setup Supabase (one time)
# Run supabase_handwriting_schema.sql in your Supabase SQL editor

# 2. Start server
npm run dev

# 3. Train your handwriting
# Visit http://localhost:5022/handwriting-trainer.html
# Takes ~5-10 minutes

# 4. Test it
# Visit http://localhost:5022/handwriting-test.html

# 5. Use it
# Go to http://localhost:5022
# AI responses now appear in YOUR handwriting!
```

---

## ✅ What You Get

- **Personal handwriting synthesis** - AI writes in YOUR style
- **LLM-guided variation** - Claude adjusts style by mood (excited = messy, formal = neat)
- **Supabase sync** - Works across all your devices
- **localStorage fallback** - Works offline, no login needed
- **Smart positioning** - AI writes below your selections

---

## 📝 How to Use

### 1. First Time Setup (Supabase)

**Option A: With Supabase (syncs across devices)**
```bash
# In Supabase SQL Editor, run:
supabase_handwriting_schema.sql
```

**Option B: Without Supabase (localStorage only)**
- Skip this step! It'll work with localStorage only

### 2. Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:5022`

### 3. Train Your Handwriting

1. Visit `http://localhost:5022/handwriting-trainer.html`
2. Write letters and words as prompted
3. Takes ~5-10 minutes for full training
4. Data saves automatically (Supabase if logged in, localStorage always)

### 4. Test It

Visit `http://localhost:5022/handwriting-test.html`
- Type any text
- See it rendered in YOUR handwriting
- Adjust sliders to test variations

### 5. Use in Main App

1. Go to `http://localhost:5022/` (main app)
2. Draw something on canvas
3. Select text → Send to AI
4. **AI responds in YOUR handwriting!** ✨

---

## 🔍 How It Works

### Smart Storage

```
Training complete
     ↓
Logged in?
├─ Yes → Saves to Supabase + localStorage
└─ No  → Saves to localStorage only
```

### AI Writeback

```
AI response arrives
     ↓
Load handwriting samples
     ↓
Has samples?
├─ Yes → Use YOUR handwriting ✨
└─ No  → Use SVG simulation (fallback)
```

---

## 🎨 LLM-Guided Style Variation

Claude can adjust handwriting based on emotion!

**Example:** Excited response
```json
{
  "text": "That's amazing!",
  "style": {
    "slant": 8,
    "spacing": 1.3,
    "messiness": 0.6,
    "mood": "excited"
  }
}
```

**Mood presets:**
- `excited` - Messy, slanted, expressive
- `formal` - Neat, upright, consistent
- `calm` - Balanced, smooth
- `urgent` - Very slanted, rushed
- `thoughtful` - Slight slant, tight spacing

---

## 🔧 Troubleshooting

### "No handwriting samples found"
**Fix:** Visit `/handwriting-trainer.html` to train

### Handwriting doesn't sync across devices
**Fix:**
1. Make sure you're logged in
2. Run `supabase_handwriting_schema.sql` in Supabase
3. Retrain handwriting

### Still using SVG simulation
**Fix:** Check if samples exist
```javascript
// In browser console:
import { hasHandwritingSamples } from './static/js/handwritingStorage.js';
console.log('Has samples:', await hasHandwritingSamples());
```

### Want to retrain
```javascript
import { deleteHandwritingData } from './static/js/handwritingStorage.js';
await deleteHandwritingData();
// Then visit /handwriting-trainer.html
```

---

## 📚 More Info

- **Setup Guide:** `HANDWRITING_SETUP.md`
- **Technical Docs:** `HANDWRITING_WRITEBACK.md`
- **SQL Schema:** `supabase_handwriting_schema.sql`

---

## 🎯 Key Files

```
Cursive/
├── handwriting-trainer.html           # Training page
├── handwriting-test.html              # Test page
├── supabase_handwriting_schema.sql    # Database schema
├── static/js/
│   ├── handwritingStorage.js          # Storage service (Supabase + localStorage)
│   ├── handwritingTrainer.js          # Training interface
│   ├── handwritingSynthesis.js        # Core synthesis engine
│   ├── canvasWriteback.js             # Canvas integration
│   ├── aiCanvasIntegration.js         # Smart AI integration
│   └── llmStyleGuide.js               # LLM style variation
└── HANDWRITING_SETUP.md               # This file
```

---

**That's it!** Start with `npm run dev` and visit `/handwriting-trainer.html` 🚀
