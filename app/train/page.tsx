'use client';

import { useState, useRef, useEffect } from 'react';
import { useCanvas } from '@/hooks/useCanvas';
import { Download, X, GraduationCap } from 'lucide-react';
import { STORAGE_KEYS, TRAINING } from '@/lib/constants';
import { getStroke } from 'perfect-freehand';
import type { Stroke } from '@/lib/types';

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
  const [isPenActive, setIsPenActive] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress>({
    phase: 'cursiveLower',
    itemIndex: 0,
    variationIndex: 0
  });

  // Start training on mount
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!hasStarted.current && !state.trainingMode.active) {
      hasStarted.current = true;
      actions.startTrainingMode('cursive');
      actions.toggleTypographyGuides();
    }
  }, []);

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
    // Clear canvas for next character
    actions.clearAll();

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

  // Canvas rendering effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redrawCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Redraw when state changes
  useEffect(() => {
    redrawCanvas();
  }, [state.drawings, state.currentStroke, state.typographyGuides]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw typography guides
    if (state.typographyGuides.enabled) {
      drawTypographyGuides(ctx, canvas);
    }

    // Draw all completed strokes
    state.drawings.forEach(stroke => {
      drawStroke(ctx, stroke);
    });

    // Draw current stroke
    if (state.currentStroke.length > 0) {
      drawStroke(ctx, {
        points: state.currentStroke,
        color: '#000000',
        width: 2
      });
    }
  };

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length === 0) return;

    const inputPoints = stroke.points.map(p => [
      p.x,
      p.y,
      p.pressure || 0.5
    ]);

    const outlinePoints = getStroke(inputPoints, {
      size: (stroke.width || 2) * 4,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      easing: (t) => t,
      start: { taper: 0, cap: true },
      end: { taper: 0, cap: true }
    });

    if (outlinePoints.length === 0) return;

    ctx.beginPath();
    ctx.fillStyle = stroke.color;
    ctx.moveTo(outlinePoints[0][0], outlinePoints[0][1]);

    for (let i = 1; i < outlinePoints.length; i++) {
      ctx.lineTo(outlinePoints[i][0], outlinePoints[i][1]);
    }

    ctx.closePath();
    ctx.fill();
  };

  const drawTypographyGuides = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const guides = state.typographyGuides;
    const canvasWidth = canvas.width;

    ctx.save();

    // Draw horizontal guide lines
    const lines = [
      { y: guides.baseline - guides.ascender, label: 'Ascender', color: '#3b82f6' },
      { y: guides.baseline - guides.capHeight, label: 'Cap Height', color: '#8b5cf6' },
      { y: guides.baseline - guides.xHeight, label: 'X-Height', color: '#10b981' },
      { y: guides.baseline, label: 'Baseline', bold: true, color: '#ef4444' },
      { y: guides.baseline + guides.descender, label: 'Descender', color: '#f59e0b' },
    ];

    lines.forEach(line => {
      ctx.strokeStyle = line.color;
      ctx.globalAlpha = line.bold ? 0.6 : 0.3;
      ctx.lineWidth = line.bold ? 2 : 1;
      ctx.setLineDash(line.bold ? [10, 5] : [5, 5]);

      ctx.beginPath();
      ctx.moveTo(0, line.y);
      ctx.lineTo(canvasWidth, line.y);
      ctx.stroke();

      // Draw labels
      ctx.globalAlpha = 1;
      ctx.fillStyle = line.color;
      ctx.font = line.bold ? 'bold 12px sans-serif' : '11px sans-serif';
      ctx.fillText(line.label, 10, line.y - 5);
    });

    // Draw training box in training mode
    if (state.trainingMode.active) {
      const boxX = 120;
      const boxWidth = guides.xHeight * 1.2;

      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 5]);

      ctx.beginPath();
      ctx.moveTo(boxX, guides.baseline - guides.ascender - 10);
      ctx.lineTo(boxX, guides.baseline + guides.descender + 10);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(boxX + boxWidth, guides.baseline - guides.ascender - 10);
      ctx.lineTo(boxX + boxWidth, guides.baseline + guides.descender + 10);
      ctx.stroke();

      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✏️ Write here', boxX + boxWidth / 2, guides.baseline - guides.ascender - 25);
      ctx.textAlign = 'left';
    }

    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Palm rejection: Only allow pen input, ignore touch/mouse when pen is active
    if (e.pointerType === 'pen') {
      setIsPenActive(true);
    } else if (isPenActive && e.pointerType !== 'pen') {
      // Ignore touch/mouse if pen was used
      return;
    }

    // Prefer pen input for training
    if (e.pointerType !== 'pen' && !isPenActive) {
      // Show a hint to use a stylus
      console.log('For best results, use a stylus/pen for training');
    }

    if (state.trainingMode.active) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const dpr = window.devicePixelRatio || 1;
      const x = (e.clientX - rect.left) * dpr;
      const y = (e.clientY - rect.top) * dpr;
      const pressure = e.pressure > 0 ? e.pressure : 0.5;

      setIsDrawing(true);
      actions.startDrawing({ x, y, pressure });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    // Palm rejection: ignore non-pen input when pen is active
    if (isPenActive && e.pointerType !== 'pen') {
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dpr = window.devicePixelRatio || 1;
    const x = (e.clientX - rect.left) * dpr;
    const y = (e.clientY - rect.top) * dpr;
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    actions.continueDrawing({ x, y, pressure });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    // Palm rejection: ignore non-pen input when pen is active
    if (isPenActive && e.pointerType !== 'pen') {
      return;
    }

    setIsDrawing(false);

    // Submit the stroke as a training sample
    if (state.currentStroke.length > 0) {
      const currentItem = getCurrentItem();

      // Determine current emotional state (for now default to neutral, will add UI for this)
      const currentEmotion = 'neutral'; // TODO: Get from UI state
      const currentIntensity = 0.5; // TODO: Get from UI state

      const stroke = {
        points: state.currentStroke,
        color: '#000000',
        width: 2,
        timestamp: Date.now(),
        // Add metadata for training
        character: currentItem,
        phase: trainingProgress.phase,
        variation: trainingProgress.variationIndex + 1,
        // Emotional state metadata (for LSTM training)
        emotional_state: currentEmotion,
        intensity: currentIntensity
      };

      actions.submitTrainingSample(stroke);
      actions.finishDrawing();

      // DON'T auto-advance - let user see the stroke and manually advance
      // advanceTraining();  // Commented out - add manual "Next" button instead
    }
  };

  const handleExport = () => {
    const trainingData = {
      version: '2.0.0-training',
      timestamp: Date.now(),
      style: state.trainingMode.style,
      samples: state.drawings.map(stroke => ({
        character: stroke.character,
        emotional_state: (stroke as any).emotional_state || 'neutral',
        intensity: (stroke as any).intensity || 0.5,
        points: stroke.points.map(p => ({
          x: p.x,
          y: p.y,
          pressure: p.pressure || 0.5,
          t: 0 // Timestamp can be 0 for now
        })),
        strokeOrder: stroke.strokeOrder,
        phase: (stroke as any).phase,
        variation: (stroke as any).variation
      })),
      metadata: {
        totalSamples: state.drawings.length,
        samplesPerCharacter: 5,
        emotionalStates: ['neutral', 'excited', 'thoughtful', 'calm', 'urgent']
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
    <div className="fixed inset-0 flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Handwriting Training</h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Teach Cursive to write in your style</p>
            </div>
          </div>

          <a
            href="/"
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
          >
            <X size={16} className="sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm hidden sm:inline">Back to App</span>
            <span className="text-xs sm:text-sm sm:hidden">Back</span>
          </a>
        </div>
      </header>

      {/* Training Status */}
      {state.trainingMode.active && (
        <div className="bg-blue-50 border-b border-blue-200 px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-start sm:items-center justify-between gap-2 mb-2 sm:mb-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-1 truncate">
                  Write: "{currentItem}"
                </h2>
                <p className="text-xs sm:text-sm text-blue-700">
                  {getPhaseLabel(trainingProgress.phase)} • Var {trainingProgress.variationIndex + 1}/{TRAINING.VARIATIONS_PER_ITEM}
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-xs sm:text-sm font-medium text-blue-900">
                  {currentIndex + 1}/{totalItems}
                </p>
                <p className="text-xs text-blue-700">{Math.round(progress)}%</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-blue-200 rounded-full h-1.5 sm:h-2 mb-2">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Phase indicator */}
            <div className="flex gap-1 sm:gap-2 text-xs overflow-x-auto pb-1">
              <span className={`px-2 py-1 rounded whitespace-nowrap ${trainingProgress.phase === 'cursiveLower' ? 'bg-blue-600 text-white' : 'bg-blue-200 text-blue-700'}`}>
                Lower
              </span>
              <span className={`px-2 py-1 rounded whitespace-nowrap ${trainingProgress.phase === 'cursiveUpper' ? 'bg-blue-600 text-white' : 'bg-blue-200 text-blue-700'}`}>
                Upper
              </span>
              <span className={`px-2 py-1 rounded whitespace-nowrap ${trainingProgress.phase === 'numbers' ? 'bg-blue-600 text-white' : 'bg-blue-200 text-blue-700'}`}>
                Numbers
              </span>
              <span className={`px-2 py-1 rounded whitespace-nowrap ${trainingProgress.phase === 'ligatures' ? 'bg-blue-600 text-white' : 'bg-blue-200 text-blue-700'}`}>
                Ligatures
              </span>
              <span className={`px-2 py-1 rounded whitespace-nowrap ${trainingProgress.phase === 'words' ? 'bg-blue-600 text-white' : 'bg-blue-200 text-blue-700'}`}>
                Words
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <main className="flex-1 relative overflow-hidden min-h-0">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          style={{ touchAction: 'none' }}
        />

        {/* Pen usage hint */}
        {!isPenActive && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2 rounded-lg shadow-sm text-sm">
            ✏️ For best results, use a stylus or Apple Pencil
          </div>
        )}
      </main>

      {/* Controls */}
      <footer className="bg-white border-t border-gray-200 px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4">
          <div className="flex gap-2 order-2 sm:order-1">
            <button
              onClick={handleClear}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors text-xs sm:text-sm font-medium"
            >
              Clear
            </button>

            <button
              onClick={() => {
                // Clear canvas and advance to next character
                actions.clearCanvas();
                advanceTraining();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
            >
              Next Character →
            </button>

            <button
              onClick={handleSkip}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-md transition-colors text-xs sm:text-sm font-medium"
            >
              Skip
            </button>
          </div>

          <div className="flex gap-2 order-1 sm:order-2">
            <button
              onClick={() => actions.toggleTypographyGuides()}
              className={`
                flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md transition-colors text-xs sm:text-sm font-medium
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
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md transition-colors text-xs sm:text-sm font-medium"
            >
              <Download size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Export Training Data</span>
              <span className="sm:hidden">Export</span>
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
