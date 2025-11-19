# 🎓 Living Fonts Training Guide

## How to Train Your Handwriting for AI Synthesis

This guide walks you through training Cursive to write in **YOUR** handwriting style, with authentic emotional variation.

---

## 🎯 What You're Training

You're not training a "font" - you're training an **emotional presentation system**.

The AI will learn:
1. ✍️ **Your neutral handwriting** (baseline)
2. 🎭 **How YOU write when excited** (authentic variation)
3. 💭 **How YOU write when thoughtful** (authentic variation)
4. 😌 **How YOU write when calm** (authentic variation)
5. ⚡ **How YOU write when urgent** (authentic variation)

**Key insight:** You'll actually FEEL the emotion while writing, not simulate it algorithmically.

---

## ⏱️ Time Commitment

- **Minimum**: 20 minutes (~400 samples)
- **Recommended**: 30-40 minutes (~850 samples)
- **Premium**: 60 minutes (~2,000 samples)

**Today's session**: Aim for 30-40 minutes.

---

## 📋 Training Phases

### Phase 1: Neutral Baseline (8 minutes)

**Goal**: Capture your normal handwriting

**What to write:**
- Lowercase: a-z (26 letters × 3 samples = 78)
- Numbers: 0-9 (10 × 3 = 30)

**How to do it:**
1. Navigate to `/train` (password: `cursive-dev-2024`)
2. **Write naturally** - don't try to be perfect
3. Stay within the typography guides
4. Take your time

**Total**: ~110 samples in 8 minutes

---

### Phase 2: Emotional States (20-30 minutes)

**The key**: Actually FEEL the emotion before writing.

#### **State 1: Excited (5 min)**

**Setup:**
- Put on upbeat music 🎵
- Think about something that makes you happy
- Stand up, move around, get energized

**Then write:**
- a-z lowercase (3 samples each)
- Common words: "amazing!", "yes!", "wow!", "great!"

**What changes naturally:**
- Slant increases (more forward lean)
- Spacing widens
- Baseline wobbles more
- Strokes get looser, faster

**Total**: ~85 samples

---

#### **State 2: Thoughtful (5 min)**

**Setup:**
- Play calm, instrumental music 🎼
- Sit upright, slow your breathing
- Think about a complex problem
- Adopt a contemplative mindset

**Then write:**
- a-z lowercase (3 samples each)
- Words: "think", "consider", "perhaps", "analyze"

**What changes naturally:**
- Slant decreases (more upright)
- Spacing tightens
- Baseline steadies
- Strokes slower, more deliberate

**Total**: ~85 samples

---

#### **State 3: Calm (5 min)**

**Setup:**
- Deep breaths, close eyes for 30 seconds
- Think peaceful thoughts
- Relax shoulders, slow down

**Then write:**
- a-z lowercase (3 samples each)
- Words: "breathe", "peace", "gentle", "relax"

**What changes naturally:**
- Very consistent baseline
- Moderate spacing
- Smooth, controlled strokes
- No jitter or rush

**Total**: ~85 samples

---

#### **State 4: Urgent (5 min)**

**Setup:**
- Set a timer for 3 minutes
- Stand up, imagine you're in a hurry
- Think: "I need to write this FAST"

**Then write:**
- a-z lowercase (3 samples each)
- Words: "quick!", "hurry!", "now!", "wait!"

**What changes naturally:**
- High slant
- Wide, rushed spacing
- Baseline variation increases
- Strokes faster, messier

**Total**: ~85 samples

---

### Phase 3: Cursive Connections (10 min) **OPTIONAL**

**Goal**: Capture how letters connect

**Top 20 bigrams** (letter pairs):
```
th, he, in, er, an, re, on, at, en, nd,
ed, to, it, ou, ea, hi, is, or, ti, as
```

**For each bigram:**
- Write it 3 times in each emotional state
- Focus on the CONNECTION between letters

**Total**: ~60 samples (20 bigrams × 3)

**Why this matters:** Cursive connections are different when excited vs. calm!

---

## 🎨 Training UI Features

When you open `/train`, you'll see:

### Typography Guides
- ✅ **Baseline** (red) - Where letters sit
- ✅ **X-height** (green) - Lowercase height
- ✅ **Ascender/Descender** (blue/orange) - Tall/low letters
- ✅ **Slant guides** (purple) - ~15° for consistency
- ✅ **Connection points** (amber dots) - Where cursive connects
- ✅ **"Write here" box** - Cyan boundaries for character

### Progress Tracking
- See which phase you're in
- Track samples collected
- Skip characters if needed
- Clear and retry

---

## 💾 Export Format

After training, click **Export Training Data**.

You'll get a JSON file like:
```json
{
  "version": "2.0.0-emotional-training",
  "timestamp": 1732051200000,
  "samples": [
    {
      "character": "a",
      "emotional_state": "excited",
      "intensity": 0.9,
      "points": [
        {"x": 120, "y": 285, "pressure": 0.7, "t": 0},
        {"x": 125, "y": 280, "pressure": 0.8, "t": 15}
      ]
    }
    // ... 850 more samples
  ],
  "metadata": {
    "total_samples": 850,
    "emotional_states": {
      "neutral": 110,
      "excited": 85,
      "thoughtful": 85,
      "calm": 85,
      "urgent": 85
    }
  }
}
```

---

## 🤖 Training the LSTM Model

Once you have your training data:

### 1. Install Python Dependencies

```bash
cd living-fonts/packages/ml
pip install -r requirements.txt
```

### 2. Train the Model

```bash
python train_lstm.py \
  --input ~/Downloads/cursive-training-*.json \
  --output bilal-cursive.onnx \
  --epochs 100 \
  --batch-size 32 \
  --hidden-dim 128
```

**Expected time**: ~10-15 minutes (CPU), ~3-5 minutes (GPU)

### 3. Output Files

```
bilal-cursive.onnx          # Browser-ready model (500 KB)
bilal-cursive.json          # Character mapping
best_model.pt               # PyTorch checkpoint (backup)
```

### 4. Test the Model

```bash
python test_model.py \
  --model bilal-cursive.onnx \
  --text "Hello world!" \
  --mood "excited" \
  --intensity 0.8 \
  --output test.json
```

This generates stroke sequences for "Hello world!" in excited handwriting.

---

## 🎯 Quality Metrics

### Good Training Data:
- ✅ 10+ samples per character
- ✅ Multiple emotional states captured
- ✅ Consistent use of typography guides
- ✅ Natural variation (not robotic)
- ✅ Authentic emotional differences

### Warning Signs:
- ❌ < 5 samples per character (too few)
- ❌ All samples identical (no variation)
- ❌ Emotional states feel fake (not authentic)
- ❌ Baseline all over the place (inconsistent)

---

## 📊 What Happens Next?

### The LSTM Learns:

**Input:** Character ('a') + Emotional state ('excited') + Intensity (0.8)

**Output:** Sequence of stroke points:
```json
[
  {"dx": 2, "dy": -3, "pressure": 0.7, "pen_up": 0},
  {"dx": 3, "dy": 1, "pressure": 0.8, "pen_up": 0},
  {"dx": 1, "dy": 2, "pressure": 0.6, "pen_up": 0},
  {"dx": 0, "dy": 0, "pressure": 0, "pen_up": 1}
]
```

### The Model Captures:
- ✅ Your unique letter shapes
- ✅ How pressure varies in YOUR writing
- ✅ How YOUR handwriting changes with emotion
- ✅ Natural timing and flow
- ✅ Cursive connections (if trained)

---

## 🚀 Using Your Living Font

Once trained, integrate into Cursive:

```typescript
import { LivingFont } from 'cursive-living-fonts';

// Load your font
const font = await LivingFont.load('bilal-cursive.onnx');

// Generate strokes
const strokes = await font.synthesize('Hello!', {
  mood: 'excited',
  intensity: 0.9
});

// Render to canvas
canvas.renderStrokes(strokes);
```

---

## 💡 Tips for Better Results

### Do:
- ✅ **Actually feel the emotion** - this is key!
- ✅ **Use the guides** - they ensure consistency
- ✅ **Take breaks** - 5 min between emotional states
- ✅ **Be authentic** - write how YOU naturally write
- ✅ **Vary slightly** - don't copy yourself exactly

### Don't:
- ❌ **Rush** - quality > quantity
- ❌ **Fake emotions** - it won't look real
- ❌ **Ignore guides** - inconsistent training data
- ❌ **Try to be perfect** - natural > perfect
- ❌ **Copy samples** - AI needs variation

---

## 🔧 Troubleshooting

### "My handwriting looks too consistent"
→ Good! Consistency in x-height/baseline is what we want. Variation comes from emotional states.

### "I can't write differently when 'excited'"
→ Try physical cues: stand up, smile, move. Emotion affects muscle tension and pace.

### "The guides are distracting"
→ Hide them with the toggle button. But they help! Try to use them.

### "I messed up a character"
→ Click "Clear Stroke" and redo it. Quality matters.

### "This is taking forever"
→ 30 minutes of quality training > 60 minutes of rushed training. Take breaks.

---

## ✅ Checklist

Before training:
- [ ] Stylus/tablet ready (Apple Pencil, Wacom, etc.)
- [ ] Music prepared (upbeat, calm, etc.)
- [ ] 30-40 minute time block clear
- [ ] Password handy (`cursive-dev-2024`)

During training:
- [ ] Use typography guides
- [ ] Actually feel each emotion
- [ ] Take breaks between states
- [ ] Write naturally, not perfectly

After training:
- [ ] Export training data (JSON)
- [ ] Verify ~850 samples collected
- [ ] Check emotional states captured
- [ ] Save file somewhere safe

Ready to train LSTM:
- [ ] Python installed
- [ ] Requirements installed (`pip install -r requirements.txt`)
- [ ] Training JSON file path known
- [ ] ~15 minutes available for training

---

## 🎉 You're Ready!

**Goal**: Capture YOUR authentic handwriting, with YOUR authentic emotions.

**Time**: 30-40 minutes

**Output**: A trained LSTM model that writes like YOU, with emotional variation.

**This isn't just a font** - it's your handwriting personality, encoded into a neural network.

---

**Ready to begin?** Open `/train` and let's do this! 🚀
