'use client';

import { useState, useRef } from 'react';
import { useCanvas } from '@/hooks/useCanvas';
import { Download, X, GraduationCap, Lock } from 'lucide-react';
import { STORAGE_KEYS } from '@/lib/constants';

export default function TrainPage() {
  const [state, actions, canvasRef] = useCanvas();
  const [isDrawing, setIsDrawing] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Developer password (in production, use env var or better auth)
  const DEV_PASSWORD = process.env.NEXT_PUBLIC_TRAIN_PASSWORD || 'cursive-dev-2024';

  // Start training on mount (only if authorized)
  const hasStarted = useRef(false);

  if (isAuthorized && !hasStarted.current && !state.trainingMode.active) {
    hasStarted.current = true;
    actions.startTrainingMode('print');
    actions.toggleTypographyGuides();
  }

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
      const stroke = {
        points: state.currentStroke,
        color: '#000000',
        width: 2,
        timestamp: Date.now()
      };

      actions.submitTrainingSample(stroke);
      actions.finishDrawing();
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

  const totalCharacters = state.trainingMode.style === 'print' ? 62 : 26;
  const currentIndex = Math.floor(state.drawings.length / 5);
  const progress = (currentIndex / totalCharacters) * 100;

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
                <h2 className="text-lg font-semibold text-blue-900">
                  {state.trainingMode.currentPrompt}
                </h2>
                <p className="text-sm text-blue-700">
                  Sample {state.trainingMode.samplesCollected} of {state.trainingMode.samplesRequired}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-medium text-blue-900">
                  Character {currentIndex + 1} of {totalCharacters}
                </p>
                <p className="text-xs text-blue-700">{Math.round(progress)}% complete</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
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
