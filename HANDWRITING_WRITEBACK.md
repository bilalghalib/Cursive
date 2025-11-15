# ✍️ Canvas Writeback - Personal Handwriting Synthesis

## Overview

Cursive can now write AI responses directly on the canvas in **YOUR personal handwriting style**! This creates an authentic, paper-like experience where Claude's responses appear as if you wrote them yourself.

### What We've Built

1. **Handwriting Training System** - Teach Cursive your handwriting style
2. **Style Analyzer** - Extract parameters (slant, spacing, messiness, pressure)
3. **Hybrid Synthesis Engine** - Combines your samples with intelligent variation
4. **LLM-Guided Variation** - Claude can adjust style based on emotional context
5. **Real-time Canvas Integration** - Streaming writeback as AI responds

---

## How It Works

### The Complete Flow

```
1. User draws on canvas → Selects text → Sends to AI
                                              ↓
2. AI responds with text (optionally with style metadata)
                                              ↓
3. Synthesis engine converts text to strokes using user's samples
                                              ↓
4. Strokes render progressively on canvas in real-time
                                              ↓
5. Final strokes integrate with undo/redo system
```

### Where to Start the Letter (Positioning)

The system uses **smart positioning** with this priority order:

1. **Below last selection** - If user just selected text, AI writes below it (40px gap)
2. **Below last AI response** - Continues conversation flow
3. **Smart placement** - Finds the bottom-most drawing and adds below it
4. **Default** - Upper-left (50, 50) if canvas is empty

You can also manually set position:
```javascript
import { setWritebackPosition } from './canvasWriteback.js';

// After user makes a selection:
setWritebackPosition(selectionEnd.x, selectionEnd.y);
```

---

## User Guide

### Step 1: Train Your Handwriting

1. Navigate to `/handwriting-trainer` or click the training prompt
2. Follow the prompts to write letters and words (takes ~5-10 minutes)
3. System captures your strokes and analyzes your style:
   - **Slant** - How much your letters tilt
   - **Spacing** - Distance between letters
   - **Messiness** - Baseline variation and natural jitter
   - **Pressure** - Thick/thin stroke dynamics
   - **Connections** - Whether you write cursive or print

4. Complete training (30+ characters recommended)
5. Test your handwriting at `/handwriting-test`

### Step 2: Use in Cursive

Once trained, AI responses automatically use your handwriting style!

- Draw something on canvas
- Select it → Send to AI
- Watch as AI responds in **YOUR handwriting**

---

## For Developers

### Architecture

```
/static/js/
├── handwritingTrainer.js       # Training interface
├── handwritingSynthesis.js     # Core synthesis engine
├── canvasWriteback.js          # Canvas integration
├── aiCanvasIntegration.js      # Smart AI integration
└── llmStyleGuide.js            # LLM style variation
```

### Key Functions

#### 1. Check if Handwriting is Available

```javascript
import { isWritebackAvailable } from './canvasWriteback.js';

if (isWritebackAvailable()) {
    console.log('User has trained handwriting!');
}
```

#### 2. Write Text to Canvas

```javascript
import { writeAIResponseToCanvas } from './canvasWriteback.js';

await writeAIResponseToCanvas('Hello!', {
    canvasWidth: 800,
    canvasHeight: 600,
    redrawCanvas: () => redrawCanvas(),
    styleVariation: {
        slant: 5,
        spacing: 1.2,
        messiness: 0.4
    }
});
```

#### 3. Smart Integration (Auto-fallback)

```javascript
import { smartWriteAIResponse } from './aiCanvasIntegration.js';

// Uses real handwriting if available, SVG simulation otherwise
await smartWriteAIResponse(text, x, y, maxWidth, options);
```

#### 4. Stream AI Response with Writeback

```javascript
import { streamAIToCanvas } from './aiCanvasIntegration.js';

await streamAIToCanvas(chatHistory, x, y, {
    maxWidth: 600,
    lineHeight: 40,
    redrawCanvas: () => redrawCanvas()
});
```

---

## LLM-Guided Style Variation

### Enable Context-Aware Handwriting

Claude can adjust handwriting style based on the emotional tone of the response!

#### 1. Add Style Guidance to Prompts

```javascript
import { addStyleGuidance } from './llmStyleGuide.js';

const messages = [
    { role: 'user', content: 'Tell me something exciting!' }
];

const messagesWithStyle = addStyleGuidance(messages, true);
// Now Claude knows it can include style metadata
```

#### 2. Claude's Response Format

Claude can respond in two ways:

**Plain text** (normal):
```
That's amazing! I'm so happy to help!
```

**With style metadata** (context-aware):
```json
{
  "text": "That's amazing! I'm so happy to help!",
  "style": {
    "slant": 8,
    "spacing": 1.3,
    "messiness": 0.6,
    "mood": "excited"
  }
}
```

#### 3. Parse and Use Style

```javascript
import { parseStyleAwareResponse } from './llmStyleGuide.js';

const aiResponse = await sendToAI(messages);
const { text, styleVariation, mood } = parseStyleAwareResponse(aiResponse);

await writeAIResponseToCanvas(text, {
    styleVariation,  // Apply context-aware style!
    ...otherOptions
});
```

### Style Presets

The system includes built-in mood presets:

| Mood | Slant | Spacing | Messiness | Use Case |
|------|-------|---------|-----------|----------|
| **excited** | 8 | 1.3 | 0.6 | Enthusiastic responses |
| **calm** | 2 | 1.0 | 0.2 | Peaceful, meditative |
| **formal** | 0 | 1.0 | 0.1 | Professional tone |
| **casual** | 5 | 1.2 | 0.4 | Friendly, relaxed |
| **urgent** | 10 | 1.4 | 0.7 | Time-sensitive |
| **thoughtful** | 3 | 0.9 | 0.3 | Contemplative |

Claude can specify a mood, or provide custom values, or both!

---

## Data Collection & Training

### What We Collect

For each letter/word sample:

```javascript
{
    strokes: [
        {
            points: [
                { x: 100, y: 200, pressure: 0.8, timestamp: 1234567890 },
                { x: 101, y: 201, pressure: 0.9, timestamp: 1234567891 },
                // ...
            ],
            duration: 450,  // ms
            bounds: { minX, minY, maxX, maxY, width, height, centerX, centerY }
        }
    ],
    type: 'letter',  // or 'word', 'sentence'
    timestamp: 1234567890
}
```

### Analyzed Style Profile

```javascript
{
    slant: 5.2,                    // Degrees (from linear regression)
    spacing: 1.15,                 // Multiplier
    messiness: 0.35,               // 0-1 scale
    baselineVariation: 2.3,        // Standard deviation in pixels
    pressureDynamics: {
        min: 0.3,
        max: 0.9,
        avg: 0.6,
        variation: 0.6
    },
    speed: 'medium',               // slow/medium/fast
    connectLetters: true,          // Cursive vs print
    timestamp: 1234567890
}
```

### Storage

- **Samples**: `localStorage['handwritingSamples']` - Raw stroke data
- **Profile**: `localStorage['handwritingStyleProfile']` - Analyzed parameters

**Size**: Approximately 50-200KB depending on training completeness

---

## Integration with Existing Code

### In `app.js` or Main Init

```javascript
import { initAIIntegration } from './aiCanvasIntegration.js';

async function initApp() {
    // ... existing init code

    // Initialize handwriting system
    const hasHandwriting = initAIIntegration();

    if (hasHandwriting) {
        console.log('✓ Personal handwriting enabled');
    } else {
        console.log('○ Using simulated handwriting');
    }

    // ... rest of init
}
```

### In AI Response Handler

**Before** (old way):
```javascript
// Handled in modal/overlay
displayResponse(aiResponse);
```

**After** (new way):
```javascript
import { smartWriteAIResponse, updateSelectionPosition } from './aiCanvasIntegration.js';

// After user selects text:
updateSelectionPosition(selectionEnd.x, selectionEnd.y);

// When AI responds:
const canvas = document.getElementById('drawing-canvas');
await smartWriteAIResponse(aiResponse, selectionEnd.x, selectionEnd.y + 40, 600, {
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    redrawCanvas: () => redrawCanvas()
});
```

---

## Advanced: Custom Variation

You can override style parameters programmatically:

```javascript
await writeAIResponseToCanvas('Custom style text', {
    styleVariation: {
        slant: 12,        // Very slanted
        spacing: 1.5,     // Wide spacing
        messiness: 0.8    // Very expressive
    },
    // ... other options
});
```

This is useful for:
- User preferences (settings panel)
- Special effects (angry = messy, excited = slanted)
- Accessibility (dyslexia-friendly spacing)

---

## Performance Considerations

### Rendering Speed

- **Stroke-based synthesis**: ~40ms per stroke (adjustable)
- **Word-by-word streaming**: Renders as text arrives
- **Batch updates**: Canvas redraws every 3 strokes (configurable)

### Memory Usage

- Training data: ~50-200KB in localStorage
- Runtime: Minimal (just references to samples)

### Optimization Tips

1. **Reduce samples** - 26 letters minimum, 52+ recommended
2. **Adjust speed** - Lower `speed` value for faster rendering (less smooth)
3. **Batch rendering** - Use `writeAIResponseBatch()` for instant rendering

---

## Troubleshooting

### "No handwriting samples found"

**Fix**: User needs to visit `/handwriting-trainer` and complete training

### Handwriting looks wrong

**Fix**: Retrain at `/handwriting-trainer` (overwrites existing samples)

### AI responses still show in modal

**Fix**: Make sure you're calling `smartWriteAIResponse()` instead of displaying in modal

### Strokes appear but immediately disappear

**Fix**: Ensure you're calling `saveDrawings()` after adding strokes

### Position is wrong

**Fix**: Call `updateSelectionPosition()` after selection, or manually set with `setWritebackPosition()`

---

## Future Enhancements

Possible improvements:

1. **Server-side synthesis** - Use RNN models for even better quality
2. **Multi-user samples** - Blend multiple writing styles
3. **Character improvement** - Let users retrain specific letters
4. **Export handwriting** - Download as font file
5. **Handwriting effects** - Simulate different pens, pencils, markers
6. **Pressure sensitivity** - Better tablet support
7. **Ligatures** - Advanced cursive connections

---

## Example: Complete Integration

```javascript
// In app.js - Complete flow

import { initAIIntegration, smartWriteAIResponse, updateSelectionPosition } from './aiCanvasIntegration.js';
import { addStyleGuidance, parseStyleAwareResponse } from './llmStyleGuide.js';

// On app init
async function initApp() {
    await initCanvas();
    const hasHandwriting = initAIIntegration();

    // ... rest of init
}

// On user selection → AI request
async function handleUserSelection(selectionBounds, imageData) {
    // Update position for smart placement
    updateSelectionPosition(selectionBounds.x, selectionBounds.y);

    // Send to AI for transcription
    const transcription = await sendImageToAI(imageData);

    // Build chat history
    const chatHistory = [
        { role: 'user', content: transcription }
    ];

    // Add style guidance
    const messagesWithStyle = addStyleGuidance(chatHistory, true);

    // Send to AI
    const aiResponse = await sendChatToAI(messagesWithStyle);

    // Parse response (handles both plain text and style-aware JSON)
    const { text, styleVariation, mood } = parseStyleAwareResponse(aiResponse);

    // Write to canvas in user's handwriting!
    const canvas = document.getElementById('drawing-canvas');
    await smartWriteAIResponse(text, selectionBounds.x, selectionBounds.y + 40, 600, {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        redrawCanvas: () => redrawCanvas(),
        styleVariation  // Apply context-aware style
    });

    console.log(`✓ Wrote AI response in ${mood || 'normal'} style`);
}
```

---

## Credits

Built with:
- **perfect-freehand** (optional, for advanced stroke smoothing)
- **Canvas API** (native HTML5)
- **localStorage** (client-side storage)
- **Claude AI** (vision + chat APIs)

## Questions?

See the implementation in:
- `static/js/handwritingTrainer.js` - Training UI
- `static/js/handwritingSynthesis.js` - Core engine
- `static/js/llmStyleGuide.js` - LLM integration

Happy handwriting! ✍️
