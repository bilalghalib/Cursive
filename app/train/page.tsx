'use client';

import { useState, useRef, useEffect } from 'react';
import { useCanvas } from '@/hooks/useCanvas';
import { Download, X, GraduationCap, Lock } from 'lucide-react';
import { STORAGE_KEYS, TRAINING } from '@/lib/constants';

// Training phases
type TrainingPhase = 'cursiveLower' | 'cursiveUpper' | 'numbers' | 'ligatures' | 'words';

interface TrainingProgress {
  phase: TrainingPhase;
  itemIndex: number;
  variationIndex: number;
}

export default function TrainPage() {
  const [state, actions, canvasRef] = useCanvas();
  const [isDrawing, setIsDrawing] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress>({
    phase: 'cursiveLower',
    itemIndex: 0,
    variationIndex: 0
  });

  // Developer password (in production, use env var or better auth)
  const DEV_PASSWORD = process.env.NEXT_PUBLIC_TRAIN_PASSWORD || 'cursive-dev-2024';

  // Start training on mount (only if authorized)
  const hasStarted = useRef(false);

  if (isAuthorized && !hasStarted.current && !state.trainingMode.active) {
    hasStarted.current = true;
    actions.startTrainingMode('cursive');
    actions.toggleTypographyGuides();
  }

  // Get current training item based on phase
  const getCurrentItem = (): string => {
    const { phase, itemIndex } = trainingProgress;

    switch (phase) {
      case 'cursiveLower':
        return TRAINING.ALPHABET_LOWERCASE[itemIndex] || 'a';
      case 'cursiveUpper':
        return TRAINING.ALPHABET_UPPERCASE[itemIndex] || 'A';
      case 'numbers':
        return TRAINING.NUMBERS[itemIndex] || '0';
      case 'ligatures':
        return TRAINING.LIGATURES[itemIndex] || 'tt';
      case 'words':
        return TRAINING.COMMON_WORDS[itemIndex] || 'and';
      default:
        return 'a';
    }
  };

  const getPhaseLabel = (phase: TrainingPhase): string => {
    switch (phase) {
      case 'cursiveLower': return 'Cursive Lowercase';
      case 'cursiveUpper': return 'Cursive Uppercase';
      case 'numbers': return 'Numbers';
      case 'ligatures': return 'Ligatures';
      case 'words': return 'Common Words';
    }
  };

  const getTotalItems = (phase: TrainingPhase): number => {
    switch (phase) {
      case 'cursiveLower': return TRAINING.ALPHABET_LOWERCASE.length;
      case 'cursiveUpper': return TRAINING.ALPHABET_UPPERCASE.length;
      case 'numbers': return TRAINING.NUMBERS.length;
      case 'ligatures': return TRAINING.LIGATURES.length;
      case 'words': return TRAINING.COMMON_WORDS.length;
    }
  };

  const advanceTraining = () => {
    setTrainingProgress(prev => {
      const totalItems = getTotalItems(prev.phase);
      const nextVariation = prev.variationIndex + 1;

      // If we've collected all variations for this item
      if (nextVariation >= TRAINING.VARIATIONS_PER_ITEM) {
        const nextItem = prev.itemIndex + 1;

        // If we've finished all items in this phase
        if (nextItem >= totalItems) {
          // Move to next phase
          const phases: TrainingPhase[] = ['cursiveLower', 'cursiveUpper', 'numbers', 'ligatures', 'words'];
          const currentPhaseIndex = phases.indexOf(prev.phase);

          if (currentPhaseIndex < phases.length - 1) {
            return {
              phase: phases[currentPhaseIndex + 1],
              itemIndex: 0,
              variationIndex: 0
            };
          } else {
            // Training complete!
            actions.stopTrainingMode();
            return prev;
          }
        }

        // Next item, reset variations
        return {
          ...prev,
          itemIndex: nextItem,
          variationIndex: 0
        };
      }

      // Next variation of same item
      return {
        ...prev,
        variationIndex: nextVariation
      };
    });
  };

  // Update the training prompt when progress changes
  useEffect(() => {
    if (state.trainingMode.active) {
      const currentItem = getCurrentItem();
      const variation = trainingProgress.variationIndex + 1;
      const prompt = `Write: "${currentItem}" (variation ${variation}/${TRAINING.VARIATIONS_PER_ITEM})`;

      // We'd need to add a way to update the current prompt in the training mode
      // For now, this is a placeholder
    }
  }, [trainingProgress, state.trainingMode.active]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === DEV_PASSWORD) {
      setIsAuthorized(true);
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  // Show password gate if not authorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Developer Access Required
          </h1>
          <p className="text-center text-gray-600 mb-6">
            This handwriting training tool is for developers only.
          </p>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter developer password"
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
            >
              Access Training Tool
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <a
              href="/"
              className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <X size={16} />
              Back to App
            </a>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-xs text-gray-500">
              <strong>Hint:</strong> Set NEXT_PUBLIC_TRAIN_PASSWORD in .env.local or use default
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (state.trainingMode.active) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setIsDrawing(true);
      actions.startDrawing({ x, y, pressure: e.pressure });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !state.trainingMode.active) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    actions.continueDrawing({ x, y, pressure: e.pressure });
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;

    setIsDrawing(false);

    // Submit the stroke as a training sample
    if (state.currentStroke.length > 0) {
      const currentItem = getCurrentItem();
      const stroke = {
        points: state.currentStroke,
        color: '#000000',
        width: 2,
        timestamp: Date.now(),
        // Add metadata for training
        character: currentItem,
        phase: trainingProgress.phase,
        variation: trainingProgress.variationIndex + 1
      };

      actions.submitTrainingSample(stroke);
      actions.finishDrawing();

      // Advance to next item/variation
      advanceTraining();
    }
  };

  const handleExport = () => {
    const trainingData = {
      version: '2.0.0-training',
      timestamp: Date.now(),
      style: state.trainingMode.style,
      samples: state.drawings.map(stroke => ({
        character: stroke.character,
        strokeOrder: stroke.strokeOrder,
        points: stroke.points,
        color: stroke.color,
        width: stroke.width
      })),
      metadata: {
        totalSamples: state.drawings.length,
        samplesPerCharacter: 5,
      }
    };

    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.TRAINING_DATA, JSON.stringify(trainingData));

    // Download as JSON
    const blob = new Blob([JSON.stringify(trainingData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cursive-training-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Training data exported! You can now use this in the main app.');
  };

  const handleClear = () => {
    if (confirm('Clear current stroke?')) {
      actions.finishDrawing();
    }
  };

  const handleSkip = () => {
    if (confirm('Skip this character?')) {
      actions.nextTrainingPrompt();
    }
  };

  // Calculate total progress
  const getTotalTrainingItems = () => {
    return (
      TRAINING.ALPHABET_LOWERCASE.length +
      TRAINING.ALPHABET_UPPERCASE.length +
      TRAINING.NUMBERS.length +
      TRAINING.LIGATURES.length +
      TRAINING.COMMON_WORDS.length
    );
  };

  const getCurrentProgressIndex = () => {
    const { phase, itemIndex } = trainingProgress;
    let index = 0;

    // Add completed phases
    if (phase === 'cursiveUpper' || phase === 'numbers' || phase === 'ligatures' || phase === 'words') {
      index += TRAINING.ALPHABET_LOWERCASE.length;
    }
    if (phase === 'numbers' || phase === 'ligatures' || phase === 'words') {
      index += TRAINING.ALPHABET_UPPERCASE.length;
    }
    if (phase === 'ligatures' || phase === 'words') {
      index += TRAINING.NUMBERS.length;
    }
    if (phase === 'words') {
      index += TRAINING.LIGATURES.length;
    }

    // Add current item index
    index += itemIndex;

    return index;
  };

  const totalItems = getTotalTrainingItems();
  const currentIndex = getCurrentProgressIndex();
  const progress = (currentIndex / totalItems) * 100;
  const currentItem = getCurrentItem();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Handwriting Training</h1>
              <p className="text-sm text-gray-600">Teach Cursive to write in your style</p>
            </div>
          </div>

          <a
            href="/"
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X size={20} />
            <span className="text-sm">Back to App</span>
          </a>
        </div>
      </header>

      {/* Training Status */}
      {state.trainingMode.active && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-2xl font-bold text-blue-900 mb-1">
                  Write: "{currentItem}"
                </h2>
                <p className="text-sm text-blue-700">
                  {getPhaseLabel(trainingProgress.phase)} •
                  Variation {trainingProgress.variationIndex + 1} of {TRAINING.VARIATIONS_PER_ITEM}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-medium text-blue-900">
                  Item {currentIndex + 1} of {totalItems}
                </p>
                <p className="text-xs text-blue-700">{Math.round(progress)}% complete</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Phase indicator */}
            <div className="flex gap-2 text-xs">
              <span className={`px-2 py-1 rounded ${trainingProgress.phase === 'cursiveLower' ? 'bg-blue-600 text-white' : 'bg-blue-200 text-blue-700'}`}>
                Lowercase
              </span>
              <span className={`px-2 py-1 rounded ${trainingProgress.phase === 'cursiveUpper' ? 'bg-blue-600 text-white' : 'bg-blue-200 text-blue-700'}`}>
                Uppercase
              </span>
              <span className={`px-2 py-1 rounded ${trainingProgress.phase === 'numbers' ? 'bg-blue-600 text-white' : 'bg-blue-200 text-blue-700'}`}>
                Numbers
              </span>
              <span className={`px-2 py-1 rounded ${trainingProgress.phase === 'ligatures' ? 'bg-blue-600 text-white' : 'bg-blue-200 text-blue-700'}`}>
                Ligatures
              </span>
              <span className={`px-2 py-1 rounded ${trainingProgress.phase === 'words' ? 'bg-blue-600 text-white' : 'bg-blue-200 text-blue-700'}`}>
                Words
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <main className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
        />

        {/* Typography guides info */}
        {state.typographyGuides.enabled && (
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 max-w-xs">
            <h3 className="font-semibold text-gray-900 mb-2">Typography Guides</h3>
            <div className="space-y-1 text-xs text-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-blue-500" />
                <span>Baseline - where letters sit</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-blue-500/50" />
                <span>X-Height - lowercase size</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-blue-500/50" />
                <span>Cap Height - uppercase size</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Controls */}
      <footer className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors text-sm font-medium"
            >
              Clear Stroke
            </button>

            <button
              onClick={handleSkip}
              className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-md transition-colors text-sm font-medium"
            >
              Skip Character
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => actions.toggleTypographyGuides()}
              className={`
                px-4 py-2 rounded-md transition-colors text-sm font-medium
                ${state.typographyGuides.enabled
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {state.typographyGuides.enabled ? 'Hide' : 'Show'} Guides
            </button>

            <button
              onClick={handleExport}
              disabled={state.drawings.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md transition-colors text-sm font-medium"
            >
              <Download size={16} />
              Export Training Data
            </button>
          </div>
        </div>
      </footer>

      {/* Completion message */}
      {!state.trainingMode.active && state.drawings.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Training Complete!</h2>
              <p className="text-gray-600 mb-6">
                You've successfully trained Cursive to write in your handwriting style.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleExport}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium"
                >
                  Export Data
                </button>
                <a
                  href="/"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-center"
                >
                  Go to App
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
