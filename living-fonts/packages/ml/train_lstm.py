#!/usr/bin/env python3
"""
Living Fonts - LSTM Training Script

Trains a character-to-stroke LSTM model from handwriting samples collected
via the training UI. Exports to ONNX for browser inference.

Requirements:
    pip install torch numpy onnx

Usage:
    python train_lstm.py --input training-data.json --output model.onnx
"""

import argparse
import json
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from pathlib import Path
from typing import List, Dict, Tuple
import onnx


# ============================================================================
# Data Structures
# ============================================================================

class HandwritingSample:
    """Single character sample with stroke data"""
    def __init__(self, character: str, points: List[Dict], metadata: Dict = None):
        self.character = character
        self.points = points  # [{'x': float, 'y': float, 'pressure': float, 't': int}]
        self.metadata = metadata or {}

    def to_sequence(self) -> np.ndarray:
        """Convert points to sequence of (dx, dy, pressure, pen_up) deltas"""
        sequence = []
        prev_x, prev_y = 0, 0

        for i, point in enumerate(self.points):
            x = point['x']
            y = point['y']
            pressure = point.get('pressure', 0.5)

            # Calculate deltas
            dx = x - prev_x
            dy = y - prev_y
            pen_up = 0  # 0 = pen down, 1 = pen up

            sequence.append([dx, dy, pressure, pen_up])

            prev_x, prev_y = x, y

        # Add final pen-up marker
        sequence.append([0, 0, 0, 1])

        return np.array(sequence, dtype=np.float32)

    @property
    def bounds(self) -> Dict:
        """Calculate bounding box"""
        xs = [p['x'] for p in self.points]
        ys = [p['y'] for p in self.points]
        return {
            'minX': min(xs),
            'maxX': max(xs),
            'minY': min(ys),
            'maxY': max(ys),
            'width': max(xs) - min(xs),
            'height': max(ys) - min(ys)
        }


# ============================================================================
# Dataset
# ============================================================================

class HandwritingDataset(Dataset):
    """PyTorch dataset for handwriting samples"""

    def __init__(self, samples: List[HandwritingSample], char_to_idx: Dict[str, int]):
        self.samples = samples
        self.char_to_idx = char_to_idx
        self.max_seq_len = max(len(s.points) for s in samples) + 1  # +1 for pen-up

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        sample = self.samples[idx]

        # Character as one-hot encoded index
        char_idx = self.char_to_idx[sample.character]

        # Stroke sequence (dx, dy, pressure, pen_up)
        sequence = sample.to_sequence()

        # Pad to max length
        padded = np.zeros((self.max_seq_len, 4), dtype=np.float32)
        padded[:len(sequence)] = sequence

        return {
            'char_idx': char_idx,
            'sequence': torch.FloatTensor(padded),
            'seq_len': len(sequence)
        }


# ============================================================================
# LSTM Model
# ============================================================================

class Char2StrokeLSTM(nn.Module):
    """
    Character-to-Stroke LSTM

    Input: Character embedding
    Output: Sequence of (dx, dy, pressure, pen_up) predictions
    """

    def __init__(
        self,
        num_chars: int,
        embedding_dim: int = 64,
        hidden_dim: int = 128,
        num_layers: int = 2,
        dropout: float = 0.2
    ):
        super().__init__()

        self.num_chars = num_chars
        self.embedding_dim = embedding_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers

        # Character embedding
        self.char_embedding = nn.Embedding(num_chars, embedding_dim)

        # LSTM
        self.lstm = nn.LSTM(
            input_size=embedding_dim + 4,  # embedding + previous (dx, dy, pressure, pen_up)
            hidden_size=hidden_dim,
            num_layers=num_layers,
            dropout=dropout if num_layers > 1 else 0,
            batch_first=True
        )

        # Output projection
        self.fc_dx_dy = nn.Linear(hidden_dim, 2)  # (dx, dy)
        self.fc_pressure = nn.Linear(hidden_dim, 1)  # pressure (0-1)
        self.fc_pen_up = nn.Linear(hidden_dim, 1)  # pen_up (sigmoid)

    def forward(self, char_idx, prev_strokes, hidden=None):
        """
        Args:
            char_idx: (batch_size,) character indices
            prev_strokes: (batch_size, seq_len, 4) previous stroke deltas
            hidden: Optional LSTM hidden state

        Returns:
            predictions: (batch_size, seq_len, 4) predicted (dx, dy, pressure, pen_up)
            hidden: LSTM hidden state
        """
        batch_size, seq_len, _ = prev_strokes.shape

        # Character embedding
        char_emb = self.char_embedding(char_idx)  # (batch_size, embedding_dim)

        # Expand to match sequence length
        char_emb_seq = char_emb.unsqueeze(1).expand(-1, seq_len, -1)  # (batch_size, seq_len, embedding_dim)

        # Concatenate character embedding with previous strokes
        lstm_input = torch.cat([char_emb_seq, prev_strokes], dim=2)  # (batch_size, seq_len, embedding_dim + 4)

        # LSTM
        lstm_out, hidden = self.lstm(lstm_input, hidden)  # (batch_size, seq_len, hidden_dim)

        # Output projections
        dx_dy = self.fc_dx_dy(lstm_out)  # (batch_size, seq_len, 2)
        pressure = torch.sigmoid(self.fc_pressure(lstm_out))  # (batch_size, seq_len, 1) in [0, 1]
        pen_up = torch.sigmoid(self.fc_pen_up(lstm_out))  # (batch_size, seq_len, 1) in [0, 1]

        # Concatenate predictions
        predictions = torch.cat([dx_dy, pressure, pen_up], dim=2)  # (batch_size, seq_len, 4)

        return predictions, hidden


# ============================================================================
# Training Loop
# ============================================================================

def train_epoch(model, dataloader, optimizer, criterion, device):
    """Train for one epoch"""
    model.train()
    total_loss = 0
    num_batches = 0

    for batch in dataloader:
        char_idx = batch['char_idx'].to(device)
        sequence = batch['sequence'].to(device)
        seq_len = batch['seq_len']

        # Zero gradients
        optimizer.zero_grad()

        # Forward pass (teacher forcing)
        # Input: previous strokes (shift by 1, start with zeros)
        prev_strokes = torch.zeros_like(sequence)
        prev_strokes[:, 1:, :] = sequence[:, :-1, :]

        predictions, _ = model(char_idx, prev_strokes)

        # Loss (MSE for dx, dy, pressure + BCE for pen_up)
        mse_loss = criterion['mse'](predictions[:, :, :3], sequence[:, :, :3])
        bce_loss = criterion['bce'](predictions[:, :, 3:4], sequence[:, :, 3:4])
        loss = mse_loss + bce_loss

        # Backward pass
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        num_batches += 1

    return total_loss / num_batches


def evaluate(model, dataloader, criterion, device):
    """Evaluate on validation set"""
    model.eval()
    total_loss = 0
    num_batches = 0

    with torch.no_grad():
        for batch in dataloader:
            char_idx = batch['char_idx'].to(device)
            sequence = batch['sequence'].to(device)

            prev_strokes = torch.zeros_like(sequence)
            prev_strokes[:, 1:, :] = sequence[:, :-1, :]

            predictions, _ = model(char_idx, prev_strokes)

            mse_loss = criterion['mse'](predictions[:, :, :3], sequence[:, :, :3])
            bce_loss = criterion['bce'](predictions[:, :, 3:4], sequence[:, :, 3:4])
            loss = mse_loss + bce_loss

            total_loss += loss.item()
            num_batches += 1

    return total_loss / num_batches


# ============================================================================
# ONNX Export
# ============================================================================

def export_to_onnx(model, char_to_idx, output_path):
    """Export model to ONNX format for browser inference"""
    model.eval()

    # Dummy inputs for tracing
    dummy_char_idx = torch.tensor([0], dtype=torch.long)
    dummy_prev_strokes = torch.zeros(1, 50, 4, dtype=torch.float32)  # Max seq length 50

    # Export
    torch.onnx.export(
        model,
        (dummy_char_idx, dummy_prev_strokes),
        output_path,
        export_params=True,
        opset_version=11,
        do_constant_folding=True,
        input_names=['char_idx', 'prev_strokes'],
        output_names=['predictions'],
        dynamic_axes={
            'char_idx': {0: 'batch_size'},
            'prev_strokes': {0: 'batch_size', 1: 'seq_len'},
            'predictions': {0: 'batch_size', 1: 'seq_len'}
        }
    )

    print(f"✅ Model exported to {output_path}")

    # Validate ONNX model
    onnx_model = onnx.load(output_path)
    onnx.checker.check_model(onnx_model)
    print("✅ ONNX model validated")


# ============================================================================
# Main
# ============================================================================

def load_training_data(json_path: str) -> Tuple[List[HandwritingSample], Dict]:
    """Load training data from JSON export"""
    with open(json_path, 'r') as f:
        data = json.load(f)

    samples = []
    characters = set()

    for sample in data['samples']:
        char = sample.get('character')
        points = sample.get('points', [])

        if char and points:
            samples.append(HandwritingSample(char, points, sample))
            characters.add(char)

    # Create character-to-index mapping
    char_to_idx = {char: idx for idx, char in enumerate(sorted(characters))}
    idx_to_char = {idx: char for char, idx in char_to_idx.items()}

    print(f"✅ Loaded {len(samples)} samples for {len(characters)} characters")
    print(f"   Characters: {sorted(characters)}")

    return samples, char_to_idx, idx_to_char


def main():
    parser = argparse.ArgumentParser(description='Train Living Font LSTM model')
    parser.add_argument('--input', type=str, required=True, help='Path to training data JSON')
    parser.add_argument('--output', type=str, default='model.onnx', help='Output ONNX model path')
    parser.add_argument('--epochs', type=int, default=100, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size')
    parser.add_argument('--lr', type=float, default=0.001, help='Learning rate')
    parser.add_argument('--hidden-dim', type=int, default=128, help='LSTM hidden dimension')
    parser.add_argument('--layers', type=int, default=2, help='Number of LSTM layers')
    args = parser.parse_args()

    # Device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"🔥 Using device: {device}")

    # Load data
    samples, char_to_idx, idx_to_char = load_training_data(args.input)

    # Split train/val (90/10)
    np.random.shuffle(samples)
    split = int(0.9 * len(samples))
    train_samples = samples[:split]
    val_samples = samples[split:]

    # Datasets
    train_dataset = HandwritingDataset(train_samples, char_to_idx)
    val_dataset = HandwritingDataset(val_samples, char_to_idx)

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False)

    # Model
    model = Char2StrokeLSTM(
        num_chars=len(char_to_idx),
        hidden_dim=args.hidden_dim,
        num_layers=args.layers
    ).to(device)

    print(f"📊 Model: {sum(p.numel() for p in model.parameters())} parameters")

    # Optimizer and loss
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)
    criterion = {
        'mse': nn.MSELoss(),
        'bce': nn.BCELoss()
    }

    # Training loop
    print(f"\n🚀 Training for {args.epochs} epochs...")
    best_val_loss = float('inf')

    for epoch in range(args.epochs):
        train_loss = train_epoch(model, train_loader, optimizer, criterion, device)
        val_loss = evaluate(model, val_loader, criterion, device)

        print(f"Epoch {epoch+1}/{args.epochs} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f}")

        # Save best model
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), 'best_model.pt')

    # Load best model and export to ONNX
    model.load_state_dict(torch.load('best_model.pt'))
    export_to_onnx(model, char_to_idx, args.output)

    # Save character mapping
    mapping_path = Path(args.output).with_suffix('.json')
    with open(mapping_path, 'w') as f:
        json.dump({
            'char_to_idx': char_to_idx,
            'idx_to_char': idx_to_char,
            'num_chars': len(char_to_idx)
        }, f, indent=2)

    print(f"✅ Character mapping saved to {mapping_path}")
    print("\n🎉 Training complete!")


if __name__ == '__main__':
    main()
