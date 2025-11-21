# Living Fonts - ML Training Package

Python scripts for training LSTM models from handwriting samples.

## Installation

```bash
pip install -r requirements.txt
```

## Usage

### 1. Collect Training Data

Use the Cursive training UI at `/train` to collect handwriting samples. Export the JSON file.

### 2. Train the LSTM

```bash
python train_lstm.py \
  --input ~/Downloads/cursive-training-1234567890.json \
  --output my-handwriting.onnx \
  --epochs 100 \
  --batch-size 32 \
  --hidden-dim 128
```

### 3. Test the Model

```bash
python test_model.py \
  --model my-handwriting.onnx \
  --char "a" \
  --output test_output.json
```

## Training Parameters

- `--input` - Path to training JSON (from `/train` export)
- `--output` - Output ONNX model path (default: `model.onnx`)
- `--epochs` - Number of training epochs (default: 100)
- `--batch-size` - Batch size (default: 32)
- `--lr` - Learning rate (default: 0.001)
- `--hidden-dim` - LSTM hidden dimension (default: 128)
- `--layers` - Number of LSTM layers (default: 2)

## Output Files

Training produces:
- `model.onnx` - ONNX model for browser inference
- `model.json` - Character-to-index mapping
- `best_model.pt` - PyTorch checkpoint (best validation loss)

## Model Architecture

```
Input: Character embedding (64-dim) + Previous stroke (dx, dy, pressure, pen_up)
  ↓
LSTM (128-dim hidden, 2 layers)
  ↓
Output: Predicted stroke (dx, dy, pressure, pen_up)
```

## Tips for Better Results

### Data Quality
- ✅ Collect at least **10 samples per character** (more is better)
- ✅ Write naturally (don't try to be perfect)
- ✅ Include ligatures for cursive (th, he, ll, etc.)
- ✅ Write common words (the, and, is, of, to...)

### Training
- Start with **100 epochs** (monitor validation loss)
- If overfitting: reduce `--hidden-dim` or add dropout
- If underfitting: increase `--epochs` or `--hidden-dim`

### Hyperparameters
| Dataset Size | Epochs | Hidden Dim | Batch Size |
|--------------|--------|------------|------------|
| Small (300)  | 50     | 64         | 16         |
| Medium (850) | 100    | 128        | 32         |
| Large (2000) | 200    | 256        | 64         |

## Troubleshooting

### "RuntimeError: CUDA out of memory"
- Reduce `--batch-size` (try 16 or 8)
- Reduce `--hidden-dim` (try 64)

### "Loss not decreasing"
- Check training data quality (consistent character labels?)
- Increase `--epochs` (100 → 200)
- Try lower learning rate `--lr 0.0005`

### "Model too large for browser"
- Reduce `--hidden-dim` (128 → 64)
- Reduce `--layers` (2 → 1)
- Quantize model (8-bit instead of 32-bit)

## Next Steps

After training, integrate the model into Living Fonts:

```bash
cp my-handwriting.onnx ../core/models/
cp my-handwriting.json ../core/models/
```

Then use in browser with ONNX.js!
