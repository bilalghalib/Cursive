'use client';

import { useState } from 'react';
import { Canvas } from '@/components/Canvas';
import { useCanvas } from '@/hooks/useCanvas';
import type { HandwritingProfile } from '@/lib/types';

// Training data structure
const ALPHABET_LOWER = 'abcdefghijklmnopqrstuvwxyz'.split('');
const ALPHABET_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const COMMON_COMBINATIONS = [
  'aa', 'bb', 'cc', 'dd', 'ee', 'ff', 'gg', 'll', 'mm', 'nn', 'oo', 'pp', 'ss', 'tt',
  'th', 'he', 'in', 'er', 'an', 're', 'on', 'at', 'en', 'nd', 'ti', 'es', 'or', 'te',
  'of', 'ed', 'is', 'it', 'al', 'ar', 'st', 'to', 'nt', 'ng', 'se', 'ha', 'as', 'ou',
  'io', 'le', 've', 'co', 'me', 'de', 'hi', 'ri', 'ro', 'ic', 'ne', 'ea', 'ra', 'ce'
];
const TOP_1000_WORDS = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I', 'it', 'for', 'not',
  'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from',
  // ... (would include all 1000 words in production)
];
const COMMON_PHRASES = [
  'The quick brown fox jumps over the lazy dog',
  'How are you doing today?',
  'Thank you very much',
  'I hope this helps',
  'See you later',
  'Have a great day',
  'What do you think?',
  'Let me know if you need anything'
];

interface TrainingProgress {
  alphabet: number; // out of 260
  combinations: number; // out of 150
  words: number; // out of 1000
  phrases: number; // out of 20
}

export default function TrainPage() {
  const [state, actions, canvasRef] = useCanvas();
  const [trainingPhase, setTrainingPhase] = useState<'alphabet' | 'combinations' | 'words' | 'phrases'>('alphabet');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [samplesPerItem, setSamplesPerItem] = useState(5);
  const [currentSampleCount, setCurrentSampleCount] = useState(0);
  const [progress, setProgress] = useState<TrainingProgress>({
    alphabet: 0,
    combinations: 0,
    words: 0,
    phrases: 0
  });
  const [profileName] = useState('Your Handwriting');
  const [similarityScore] = useState(78);

  // Calculate current training item
  const getCurrentPrompt = () => {
    switch (trainingPhase) {
      case 'alphabet':
        const alphabetList = [...ALPHABET_LOWER, ...ALPHABET_UPPER];
        if (currentIndex < alphabetList.length) {
          return alphabetList[currentIndex];
        }
        return null;
      case 'combinations':
        if (currentIndex < COMMON_COMBINATIONS.length) {
          return COMMON_COMBINATIONS[currentIndex];
        }
        return null;
      case 'words':
        if (currentIndex < TOP_1000_WORDS.length) {
          return TOP_1000_WORDS[currentIndex];
        }
        return null;
      case 'phrases':
        if (currentIndex < COMMON_PHRASES.length) {
          return COMMON_PHRASES[currentIndex];
        }
        return null;
      default:
        return null;
    }
  };

  const currentPrompt = getCurrentPrompt();

  // Calculate total progress
  const totalSamples = progress.alphabet + progress.combinations + progress.words + progress.phrases;
  const totalPossible = 260 + 150 + 1000 + 20; // 1,430
  const overallProgress = Math.round((totalSamples / totalPossible) * 100);

  // Handle training sample submission
  const handleNextWord = () => {
    setCurrentSampleCount(prev => prev + 1);

    // If we've collected enough samples for this item
    if (currentSampleCount + 1 >= samplesPerItem) {
      // Update progress
      setProgress(prev => ({
        ...prev,
        [trainingPhase]: prev[trainingPhase] + samplesPerItem
      }));

      // Move to next item
      setCurrentIndex(prev => prev + 1);
      setCurrentSampleCount(0);

      // Check if we've completed this phase
      const maxIndex = trainingPhase === 'alphabet' ? 52 :
                       trainingPhase === 'combinations' ? COMMON_COMBINATIONS.length :
                       trainingPhase === 'words' ? TOP_1000_WORDS.length :
                       COMMON_PHRASES.length;

      if (currentIndex + 1 >= maxIndex) {
        // Move to next phase
        if (trainingPhase === 'alphabet') {
          setTrainingPhase('combinations');
          setCurrentIndex(0);
          setSamplesPerItem(3); // 3 samples for combinations
        } else if (trainingPhase === 'combinations') {
          setTrainingPhase('words');
          setCurrentIndex(0);
          setSamplesPerItem(1); // 1 sample for common words
        } else if (trainingPhase === 'words') {
          setTrainingPhase('phrases');
          setCurrentIndex(0);
          setSamplesPerItem(1); // 1 sample for phrases
        }
      }
    }

    // Clear canvas for next sample
    actions.clearAll();
  };

  const handleSkip = () => {
    setCurrentIndex(prev => prev + 1);
    setCurrentSampleCount(0);
    actions.clearAll();
  };

  const handleClear = () => {
    actions.clearAll();
  };

  const handleStopTraining = () => {
    window.location.href = '/';
  };

  // Enable typography guides
  if (!state.typographyGuides.enabled) {
    actions.toggleTypographyGuides();
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <i className="fas fa-graduation-cap text-2xl text-blue-600" />
            <h1 className="text-2xl font-semibold text-gray-800">Handwriting AI Trainer</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Profile:</span>
            <span className="font-medium text-gray-800">{profileName}</span>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress Overview:</span>
            <span className="text-sm text-gray-600">{overallProgress}% Complete ({totalSamples}/{totalPossible} samples)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Phase Progress Bars */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">Alphabet</span>
              <span className="text-xs text-gray-500">{Math.round((progress.alphabet / 260) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${(progress.alphabet / 260) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 mt-1">{progress.alphabet}/260</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">Combinations</span>
              <span className="text-xs text-gray-500">{Math.round((progress.combinations / 150) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(progress.combinations / 150) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 mt-1">{progress.combinations}/150</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">Common Words</span>
              <span className="text-xs text-gray-500">{Math.round((progress.words / 1000) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${(progress.words / 1000) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 mt-1">{progress.words}/1000</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">Phrases</span>
              <span className="text-xs text-gray-500">{Math.round((progress.phrases / 20) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-600 h-2 rounded-full transition-all"
                style={{ width: `${(progress.phrases / 20) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 mt-1">{progress.phrases}/20</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden p-6 grid grid-cols-2 gap-6">
        {/* Left Column: Training Canvas */}
        <div className="flex flex-col">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 flex-1 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Current Training:</h2>
              {currentPrompt && (
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  Write: "{currentPrompt}"
                </p>
              )}
              <p className="text-sm text-gray-600 mt-1">
                Sample {currentSampleCount + 1} of {samplesPerItem}
              </p>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 relative">
              <Canvas
                state={state}
                actions={actions}
                canvasRef={canvasRef}
              />
            </div>

            {/* Action Buttons */}
            <div className="px-4 py-3 border-t border-gray-200 flex gap-2">
              <button
                onClick={handleClear}
                className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <i className="fas fa-eraser mr-2" />
                Clear
              </button>
              <button
                onClick={handleSkip}
                className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <i className="fas fa-forward mr-2" />
                Skip
              </button>
              <button
                onClick={handleNextWord}
                disabled={state.drawings.length === 0}
                className={`px-4 py-2 rounded-md transition-colors ${
                  state.drawings.length === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <i className="fas fa-check mr-2" />
                Next Word
              </button>
              <button
                onClick={handleStopTraining}
                className="px-4 py-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors ml-auto"
              >
                <i className="fas fa-stop mr-2" />
                Stop Training
              </button>
            </div>
          </div>

          {/* Training Tips */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mt-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              <i className="fas fa-lightbulb mr-2" />
              Training Tips:
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Write naturally - imperfections are good!</li>
              <li>• Consistent baseline keeps AI grounded</li>
              <li>• More samples = better quality</li>
              <li>• You can return anytime to improve specific letters</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Live Preview & Comparison */}
        <div className="flex flex-col gap-6">
          {/* Live Preview */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 flex-1">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                Live Preview - AI Writing in Your Style:
              </h2>
            </div>
            <div className="p-6">
              <p className="text-gray-500 text-sm mb-4">The quick brown fox jumps over the lazy dog</p>
              <div className="bg-gray-50 rounded-lg p-8 border-2 border-dashed border-gray-300 min-h-[200px] flex items-center justify-center">
                <p className="text-gray-400 text-center">
                  <i className="fas fa-magic text-3xl mb-2 block" />
                  AI rendering will appear here as you train
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-600">Similarity Score:</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${similarityScore}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-green-700">{similarityScore}%</span>
                  <span className="text-xs text-gray-500">(improving!)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-Side Comparison */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                Side-by-Side Comparison (Latest):
              </h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Your Sample:</h3>
                  <div className="bg-gray-50 rounded p-4 h-24 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Write something to see comparison</span>
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    <i className="fas fa-check-circle mr-1" />
                    Match: 85% ✓
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">AI's Attempt:</h3>
                  <div className="bg-gray-50 rounded p-4 h-24 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">AI rendering</span>
                  </div>
                  <p className="text-xs text-orange-600 mt-2">
                    <i className="fas fa-tools mr-1" />
                    Needs work: 'c', 'e'
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="bg-white border-t border-gray-200 px-6 py-3 flex gap-3">
        <button className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
          <i className="fas fa-download mr-2" />
          Export Training Data
        </button>
        <button className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
          <i className="fas fa-user-circle mr-2" />
          Switch Profile
        </button>
        <button
          onClick={handleStopTraining}
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors ml-auto"
        >
          <i className="fas fa-arrow-left mr-2" />
          Back to Canvas
        </button>
      </div>
    </div>
  );
}
