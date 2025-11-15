# ✍️ Handwriting Writeback Setup Guide

## Quick Start

1. **Run the Supabase migration** (if using Supabase):
   ```bash
   # In your Supabase dashboard SQL editor, run:
   cat supabase_handwriting_schema.sql
   # Or use Supabase CLI:
   supabase db push
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Train your handwriting**:
   - Visit `http://localhost:5022/handwriting-trainer.html`
   - Follow the prompts (~5-10 minutes)
   - Writes 30+ character samples

4. **Test it**:
   - Visit `http://localhost:5022/handwriting-test.html`
   - Type text and see it in your style

5. **Use in Cursive**:
   - Go to `http://localhost:5022/`
   - Draw → Select → Send to AI
   - AI responds in YOUR handwriting!

---

## Storage Options

### ✅ With Supabase (Recommended)

**Pros:**
- Syncs across devices
- Backed up automatically
- Works when logged in

**Setup:**
1. Run `supabase_handwriting_schema.sql` in your Supabase project
2. Login to Cursive
3. Train handwriting
4. Data saves to Supabase + localStorage

### ✅ Without Supabase (localStorage only)

**Pros:**
- No setup needed
- Works offline
- No login required

**Cons:**
- No sync across devices
- Can be cleared by browser
- Lost if cookies cleared

**Setup:**
1. Just start training!
2. Data saves to localStorage only

---

## How It Works

### Storage Strategy

```
User trains handwriting
        ↓
   Is logged in?
   ├─ Yes → Save to Supabase + localStorage (backup)
   └─ No  → Save to localStorage only

AI response arrives
        ↓
   Load handwriting
   ├─ Try Supabase first (if logged in)
   └─ Fallback to localStorage

   Has samples?
   ├─ Yes → Use real handwriting synthesis
   └─ No  → Use SVG simulation fallback
```

### Data Stored

**Samples** (~100-150KB):
```json
{
  "a": [
    {
      "strokes": [[{x, y, pressure, timestamp}, ...]],
      "type": "letter",
      "timestamp": 1234567890
    }
  ],
  "b": [...],
  ...
}
```

**Style Profile** (~1KB):
```json
{
  "slant": 5.2,
  "spacing": 1.15,
  "messiness": 0.35,
  "baselineVariation": 2.3,
  "pressureDynamics": {
    "min": 0.3,
    "max": 0.9,
    "avg": 0.6,
    "variation": 0.6
  },
  "speed": "medium",
  "connectLetters": true,
  "timestamp": 1234567890
}
```

---

## Checking Storage Status

### In Browser Console

```javascript
import { getHandwritingStorageInfo } from './static/js/handwritingStorage.js';

const info = await getHandwritingStorageInfo();
console.log(info);
/*
{
  authenticated: true,
  userId: "abc-123",
  hasLocalSamples: true,
  hasLocalProfile: true,
  localSamplesSize: 145234,
  hasSupabaseSamples: true,
  hasSupabaseProfile: true
}
*/
```

### Verify Writeback is Active

```javascript
import { hasHandwritingSamples } from './static/js/handwritingStorage.js';

if (await hasHandwritingSamples()) {
  console.log('✅ Handwriting writeback is active!');
} else {
  console.log('❌ No handwriting samples. Please train first.');
}
```

---

## Retraining Handwriting

If you want to retrain (improve samples or change style):

```javascript
import { deleteHandwritingData } from './static/js/handwritingStorage.js';

// Clear all handwriting data
await deleteHandwritingData();

// Then visit /handwriting-trainer.html to retrain
```

Or manually:
1. Go to `/handwriting-trainer.html`
2. It will load existing samples (if any)
3. Complete training again
4. New samples replace old ones

---

## Troubleshooting

### "No handwriting samples found"

**Cause:** User hasn't trained yet
**Fix:** Visit `/handwriting-trainer.html`

### Handwriting doesn't sync across devices

**Cause:** Not logged in, or Supabase table not created
**Fix:**
1. Login to Cursive
2. Run `supabase_handwriting_schema.sql` in Supabase
3. Retrain handwriting

### AI still uses SVG simulation

**Cause:** Writeback not detecting samples
**Fix:**
```javascript
// Check if samples exist
import { hasHandwritingSamples } from './static/js/handwritingStorage.js';
console.log('Has samples:', await hasHandwritingSamples());

// Check storage info
import { getHandwritingStorageInfo } from './static/js/handwritingStorage.js';
console.log(await getHandwritingStorageInfo());
```

### localStorage quota exceeded

**Cause:** Too many samples (rare)
**Fix:**
1. Login to sync to Supabase
2. Or train fewer characters (minimum 26)

---

## Security

- ✅ Row Level Security (RLS) enabled on Supabase
- ✅ Users can only access their own handwriting
- ✅ Samples stored as JSONB (no code execution)
- ✅ No personal data (just stroke coordinates)

---

## Advanced: Manual Supabase Query

To check your handwriting in Supabase:

```sql
-- View your handwriting record
SELECT
  user_id,
  created_at,
  updated_at,
  jsonb_object_keys(samples) as characters,
  style_profile->>'slant' as slant,
  style_profile->>'spacing' as spacing,
  style_profile->>'messiness' as messiness
FROM user_handwriting
WHERE user_id = auth.uid();

-- Count samples per character
SELECT
  key as character,
  jsonb_array_length(value) as sample_count
FROM user_handwriting,
     jsonb_each(samples)
WHERE user_id = auth.uid();
```

---

## Next Steps

1. ✅ Run migration: `supabase_handwriting_schema.sql`
2. ✅ Start server: `npm run dev`
3. ✅ Train: `/handwriting-trainer.html`
4. ✅ Test: `/handwriting-test.html`
5. ✅ Use: Main app automatically uses your handwriting!

Questions? See `HANDWRITING_WRITEBACK.md` for technical details.
