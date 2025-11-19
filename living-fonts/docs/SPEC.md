# Living Font Specification v1.0

## `.livingfont` File Format

A Living Font is a JSON file with the extension `.livingfont` that contains training samples, style parameters, and an ONNX model for generating handwritten strokes.

---

## File Structure

```json
{
  "schema_version": "1.0.0",
  "metadata": { /* ... */ },
  "samples": { /* ... */ },
  "style_profile": { /* ... */ },
  "emotional_ranges": { /* ... */ },
  "model": { /* ... */ }
}
```

---

## Complete Example

```json
{
  "schema_version": "1.0.0",

  "metadata": {
    "name": "Bilal's Cursive",
    "author": "Bilal Ghalib",
    "created_at": "2025-11-19T10:30:00Z",
    "description": "Dynamic cursive with print elements",
    "tags": ["cursive", "hybrid", "professional"],
    "license": "CC-BY-4.0",
    "version": "1.0.0"
  },

  "samples": {
    "characters": {
      "a": [
        {
          "points": [
            { "x": 0, "y": 10, "pressure": 0.5, "t": 0 },
            { "x": 2, "y": 8, "pressure": 0.7, "t": 10 },
            { "x": 4, "y": 10, "pressure": 0.6, "t": 20 }
          ],
          "duration_ms": 120,
          "bounds": {
            "width": 15,
            "height": 20,
            "minX": 0,
            "minY": 8,
            "maxX": 15,
            "maxY": 28
          }
        }
        // ... 9 more samples (total 10 per character)
      ],
      "b": [ /* 10 samples */ ],
      // ... all 70 characters (a-z, A-Z, 0-9, punctuation)
    },

    "bigrams": {
      "th": [
        {
          "points": [ /* combined stroke for "th" */ ],
          "duration_ms": 240,
          "connection_point": { "x": 12, "y": 10 }
        }
        // ... 4 more samples
      ],
      "he": [ /* 5 samples */ ]
      // ... 50 most common bigrams
    },

    "words": {
      "the": [
        {
          "strokes": [
            { "points": [ /* ... */ ] },  // 't'
            { "points": [ /* ... */ ] },  // 'h'
            { "points": [ /* ... */ ] }   // 'e'
          ],
          "duration_ms": 580
        }
        // ... 2 more samples
      ]
      // ... 50 common words
    }
  },

  "style_profile": {
    "baseline": {
      "slant_degrees": 5.2,
      "letter_spacing_multiplier": 1.15,
      "word_spacing_multiplier": 1.8,
      "baseline_variation_px": 2.3,
      "x_height_px": 50,
      "cap_height_px": 80,
      "ascender_px": 100,
      "descender_px": 70,
      "connects_letters": true,
      "connection_height_ratio": 0.33
    },

    "pressure": {
      "min": 0.3,
      "max": 0.9,
      "avg": 0.6,
      "variation": 0.25
    },

    "timing": {
      "avg_speed_px_per_ms": 2.5,
      "acceleration": "moderate",
      "stroke_pause_ms": 50
    },

    "character_variation": {
      "position_jitter_px": 1.5,
      "rotation_jitter_degrees": 2.0,
      "scale_jitter_ratio": 0.05
    }
  },

  "emotional_ranges": {
    "excited": {
      "slant_degrees": [8, 12],
      "spacing_multiplier": [1.3, 1.5],
      "baseline_variation_px": [4, 6],
      "pressure_variation": [0.4, 0.6],
      "speed_multiplier": 1.4
    },
    "calm": {
      "slant_degrees": [2, 4],
      "spacing_multiplier": [0.95, 1.05],
      "baseline_variation_px": [0.5, 1.5],
      "pressure_variation": [0.1, 0.2],
      "speed_multiplier": 0.8
    },
    "formal": {
      "slant_degrees": [0, 2],
      "spacing_multiplier": [1.0, 1.1],
      "baseline_variation_px": [0.2, 0.8],
      "pressure_variation": [0.05, 0.15],
      "speed_multiplier": 0.9
    },
    "thoughtful": {
      "slant_degrees": [3, 5],
      "spacing_multiplier": [0.9, 1.0],
      "baseline_variation_px": [1, 2],
      "pressure_variation": [0.2, 0.3],
      "speed_multiplier": 0.7
    },
    "urgent": {
      "slant_degrees": [10, 15],
      "spacing_multiplier": [1.2, 1.6],
      "baseline_variation_px": [3, 7],
      "pressure_variation": [0.5, 0.8],
      "speed_multiplier": 1.8
    }
  },

  "model": {
    "type": "lstm",
    "architecture": "char2stroke-v1",
    "input_dim": 70,
    "hidden_dim": 128,
    "output_dim": 4,
    "layers": 2,
    "bidirectional": false,
    "file_url": "https://fonts.cursive.app/bilal-cursive-v1.onnx",
    "file_path": "./models/bilal-cursive-v1.onnx",
    "file_size_bytes": 487392,
    "checksum_sha256": "a3f5b8c9d2e7f4a1b6c8d5e9f2a7b4c1d8e5f9a2b7c4d1e8f5a9b2c7d4e1f8a5"
  }
}
```

---

## Streaming Protocol for AI Responses

### Problem

When Claude streams text, we need style metadata BEFORE rendering, but the stream arrives token-by-token. How do we parse partial JSON?

### Solution: Buffered Two-Phase Streaming

Claude sends responses in this format:

```
STYLE:{"mood":"excited","intensity":0.9,"segments":[{"start":0,"end":15,"mood":"excited"}]}
TEXT:That's amazing! Let me think about this...
```

#### Protocol:

1. **Prefix markers**: `STYLE:` and `TEXT:`
2. **Parse in order**: STYLE comes first, TEXT follows
3. **Buffer until delimiter**: Accumulate stream until `\nTEXT:` marker
4. **Start rendering**: Once STYLE parsed, begin rendering TEXT as it streams

---

## Implementation Example

```typescript
// Streaming response parser
class LivingFontStreamParser {
  private buffer = '';
  private phase: 'style' | 'text' = 'style';
  private styleData: StyleMetadata | null = null;

  parse(chunk: string): { style?: StyleMetadata; text?: string } {
    this.buffer += chunk;

    if (this.phase === 'style') {
      // Look for STYLE: marker
      const styleMatch = this.buffer.match(/STYLE:(.+?)\nTEXT:/s);
      if (styleMatch) {
        this.styleData = JSON.parse(styleMatch[1]);
        this.buffer = this.buffer.replace(/STYLE:.+?\nTEXT:/s, '');
        this.phase = 'text';
        return { style: this.styleData };
      }
      // Still buffering style data
      return {};
    }

    if (this.phase === 'text') {
      // All remaining chunks are text
      const text = this.buffer;
      this.buffer = '';
      return { text };
    }

    return {};
  }
}

// Usage
const parser = new LivingFontStreamParser();
const font = await LivingFont.load('my-font.livingfont');

for await (const chunk of claudeStream) {
  const parsed = parser.parse(chunk);

  if (parsed.style) {
    // Initialize renderer with style
    renderer.setStyle(parsed.style);
  }

  if (parsed.text) {
    // Render text incrementally
    const strokes = await font.synthesize(parsed.text, {
      mood: parsed.style?.mood || 'neutral'
    });
    canvas.renderStrokes(strokes);
  }
}
```

---

## Alternative: Chunked Word Buffering

If style comes inline, buffer by words:

```typescript
class WordBuffer {
  private wordBuffer = '';
  private wordCount = 0;

  add(chunk: string): string | null {
    this.wordBuffer += chunk;

    // Check if we have complete words
    const words = this.wordBuffer.split(/\s+/);

    if (words.length > 5) {  // Render in batches of 5 words
      const toRender = words.slice(0, 5).join(' ');
      this.wordBuffer = words.slice(5).join(' ');
      return toRender;
    }

    return null;
  }

  flush(): string {
    const remaining = this.wordBuffer;
    this.wordBuffer = '';
    return remaining;
  }
}

// Usage
const buffer = new WordBuffer();

for await (const chunk of stream) {
  const wordBatch = buffer.add(chunk);
  if (wordBatch) {
    const strokes = await font.synthesize(wordBatch);
    canvas.renderStrokes(strokes);
  }
}

// Don't forget to flush!
const remaining = buffer.flush();
if (remaining) {
  const strokes = await font.synthesize(remaining);
  canvas.renderStrokes(strokes);
}
```

---

## System Prompt for Claude (Style Metadata)

```typescript
const SYSTEM_PROMPT = `You are a wise tutor helping students learn through handwriting.

IMPORTANT: When responding, include style metadata for handwriting rendering.

Format your responses like this:

STYLE:{"mood":"excited","intensity":0.9,"segments":[{"start":0,"end":50,"mood":"excited"},{"start":51,"end":120,"mood":"thoughtful"}]}
TEXT:That's a great question! Let me help you think through this...

Mood options: excited, calm, formal, thoughtful, urgent, encouraging
Intensity: 0.0 to 1.0
Segments: Define different moods for different parts of your response

If you're teaching something exciting, use "excited" mood.
If explaining calmly, use "calm" mood.
If being formal/serious, use "formal" mood.
`;
```

---

## Field Definitions

### `metadata`
- `name` (string, required): Human-readable font name
- `author` (string, required): Creator's name
- `created_at` (ISO 8601, required): Creation timestamp
- `description` (string, optional): Font description
- `tags` (string[], optional): Searchable tags
- `license` (string, required): License identifier (e.g., "CC-BY-4.0", "MIT")
- `version` (string, required): Semantic version (e.g., "1.0.0")

### `samples.characters`
- Object mapping characters to arrays of stroke samples
- Each character must have 5-20 samples
- Each sample has:
  - `points` (Point[], required): Array of `{x, y, pressure, t}` points
  - `duration_ms` (number, required): Total time to draw stroke
  - `bounds` (Bounds, required): Bounding box

### `samples.bigrams`
- Object mapping two-character sequences to stroke samples
- Used for cursive connections
- Recommended: 50 most common bigrams × 3-5 samples each

### `samples.words`
- Object mapping common words to multi-stroke samples
- Captures natural word-level flow
- Recommended: 20-50 common words × 3 samples each

### `style_profile.baseline`
- `slant_degrees` (number): Average letter slant (-20 to 20, 0 = upright)
- `letter_spacing_multiplier` (number): Letter spacing (0.8 to 1.5)
- `word_spacing_multiplier` (number): Word spacing (1.0 to 2.5)
- `baseline_variation_px` (number): Baseline jitter (0 to 10)
- `x_height_px` (number): Lowercase letter height
- `connects_letters` (boolean): Whether letters connect (cursive)

### `style_profile.pressure`
- `min` (number): Minimum pressure (0.0 to 1.0)
- `max` (number): Maximum pressure (0.0 to 1.0)
- `avg` (number): Average pressure
- `variation` (number): Pressure variation (0.0 to 1.0)

### `emotional_ranges`
- Object mapping mood names to parameter ranges
- Each mood defines min/max ranges for slant, spacing, messiness, etc.
- Used to vary handwriting based on emotion

### `model`
- `type` (string): Model architecture (e.g., "lstm", "transformer")
- `file_url` (string): URL to download ONNX model
- `file_path` (string): Relative path to model file
- `checksum_sha256` (string): SHA-256 hash for integrity check

---

## Validation

A valid `.livingfont` file must:

1. ✅ Be valid JSON
2. ✅ Have `schema_version` = "1.0.0"
3. ✅ Include all required `metadata` fields
4. ✅ Have at least 26 lowercase characters in `samples.characters`
5. ✅ Each character has 3-20 samples
6. ✅ Include `style_profile` with all baseline/pressure/timing fields
7. ✅ Include at least one emotional range
8. ✅ Include valid `model` metadata with checksum

---

## Backward Compatibility

Future versions (v1.1, v2.0) will maintain backward compatibility by:
- Adding new optional fields (never removing)
- Parsers ignore unknown fields
- `schema_version` field enables version-specific behavior

---

## File Size Recommendations

- **Minimum** (26 chars × 3 samples): ~50 KB
- **Recommended** (70 chars × 10 samples + bigrams): ~200 KB
- **Premium** (full dataset + multiple models): ~500 KB

Compress with gzip for ~60% size reduction.

---

## Related Standards

- OpenType Variable Fonts (inspiration for parametric variation)
- SVG Fonts (stroke-based rendering)
- ONNX (model interchange format)

---

**Version**: 1.0.0
**Last Updated**: 2025-11-19
**Status**: Draft (pending community feedback)
