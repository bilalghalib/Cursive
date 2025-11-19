# Living Fonts - Dynamic Handwriting Synthesis

**Living Fonts** are a revolutionary new font standard that brings handwriting to life with emotional variation, realistic imperfection, and unique character with every rendering.

## What Makes Living Fonts Different?

Traditional fonts (TTF, OTF, WOFF) are static vectors. Every 'a' looks identical.

**Living Fonts** are:
- ✍️ **Stroke-based** - Rendered as actual pen strokes with pressure, not vector outlines
- 🎭 **Emotionally dynamic** - Handwriting changes based on mood (excited = messy, calm = neat)
- 🎨 **Naturally varied** - Each letter rendered slightly differently (like real handwriting)
- 🧠 **ML-powered** - LSTM neural network generates realistic stroke sequences
- 📱 **Browser-native** - Runs entirely client-side with ONNX.js (no server needed)

## The Vision

Imagine AI responses that **write back in your own handwriting**, with the emotion of the message reflected in the writing style. Or educational apps where Claude writes like a patient teacher, with calm, neat handwriting for explanations and excited, energetic strokes for encouragement.

This is the future of human-AI interaction: **handwriting as interface**.

---

## Quick Start

### 1. Train Your Handwriting

```bash
cd packages/trainer
npm install
npm run dev
# Open http://localhost:3000/train
# Follow the prompts to write letters, ligatures, and words (~30 min)
```

### 2. Export Your Living Font

```bash
npm run export
# Creates: my-handwriting.livingfont
```

### 3. Use in Cursive

```typescript
import { LivingFont } from 'cursive-living-fonts';

const font = await LivingFont.load('my-handwriting.livingfont');
const strokes = await font.synthesize('Hello world!', {
  mood: 'excited',
  intensity: 0.8
});

// Render strokes to canvas
canvas.renderStrokes(strokes);
```

---

## Project Structure

```
living-fonts/
├── packages/
│   ├── core/              # Synthesis engine (LSTM inference, stroke generation)
│   ├── trainer/           # Training UI (React app for collecting samples)
│   └── ml/                # Python training scripts (LSTM training, ONNX export)
│
├── fonts/                 # Pre-trained living fonts
│   ├── default-print.livingfont
│   ├── default-cursive.livingfont
│   └── architect.livingfont
│
└── docs/
    ├── SPEC.md            # .livingfont file format specification
    ├── TRAINING.md        # How to train a living font
    └── API.md             # JavaScript API reference
```

---

## The Technology

### Training Pipeline

1. **Data Collection** - User writes letters, ligatures, words (850 samples)
2. **Normalization** - Strokes normalized to consistent baseline/x-height
3. **Feature Extraction** - Extract slant, spacing, messiness, pressure dynamics
4. **LSTM Training** - Train char-to-stroke sequence model (PyTorch)
5. **Export to ONNX** - Convert model for browser inference

### Synthesis Pipeline

1. **Text Input** - "Hello world!"
2. **Mood Mapping** - Map mood to style parameters (slant, messiness, etc.)
3. **LSTM Inference** - Generate stroke sequences for each character
4. **Post-processing** - Apply emotional variation, add natural jitter
5. **Render** - Draw strokes to canvas with pressure sensitivity

### File Format

`.livingfont` files contain:
- Raw training samples (characters, ligatures, words)
- Analyzed style profile (slant, spacing, pressure dynamics)
- Emotional parameter ranges (excited, calm, formal, etc.)
- ONNX model URL and metadata

See [SPEC.md](docs/SPEC.md) for complete specification.

---

## Examples

### Basic Usage

```typescript
import { LivingFont } from 'cursive-living-fonts';

const font = await LivingFont.load('fonts/default-cursive.livingfont');
const strokes = await font.synthesize('Learning is fun!');
```

### Emotional Variation

```typescript
// Excited handwriting (messy, slanted, fast)
const excitedStrokes = await font.synthesize('Wow! Amazing!', {
  mood: 'excited',
  intensity: 0.9
});

// Calm handwriting (neat, upright, slow)
const calmStrokes = await font.synthesize('Breathe deeply.', {
  mood: 'calm',
  intensity: 0.8
});
```

### Custom Variation

```typescript
// Full control over style parameters
const strokes = await font.synthesize('Custom style', {
  slant: 12,           // degrees
  spacing: 1.4,        // multiplier
  messiness: 0.7,      // 0-1
  speed: 1.5           // multiplier
});
```

---

## Roadmap

### Phase 1: Core Engine (This Sprint) ✅
- [x] Enhanced training UI with typography guides
- [ ] LSTM training script (Python)
- [ ] ONNX export
- [ ] Browser inference with ONNX.js
- [ ] `.livingfont` spec v1.0

### Phase 2: Integration (Next)
- [ ] Integrate with Cursive main app
- [ ] Claude API style metadata support
- [ ] Streaming synthesis (write as AI responds)

### Phase 3: Marketplace (Future)
- [ ] Living Font marketplace
- [ ] Community contributions
- [ ] Premium celebrity handwriting fonts
- [ ] Font mixing/blending

---

## Contributing

We're building an **open standard** for living fonts! Contributions welcome:

- **Train your handwriting** - Share your `.livingfont` file!
- **Improve the LSTM** - Better architecture suggestions?
- **Build tools** - Font editors, converters, viewers
- **Write docs** - Tutorials, examples, use cases

---

## License

- **Code**: MIT License
- **Fonts**: Fonts in `fonts/` directory are CC-BY-4.0 (attribution required)
- **Spec**: `.livingfont` specification is open standard (no license restrictions)

---

## Credits

Built for **Cursive** - AI tutoring through handwriting.

Powered by:
- PyTorch (training)
- ONNX (inference)
- ONNX.js (browser runtime)
- perfect-freehand (stroke rendering)

---

**Ready to make your handwriting come alive?** Start training at `/train`!
