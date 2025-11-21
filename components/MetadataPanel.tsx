'use client';

import { useState } from 'react';
import { Info, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { MoodName, MoodSegment } from '@/lib/moodParser';

interface MetadataPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentMood: MoodName;
  currentIntensity: number;
  timeline: MoodSegment[];
  rawText?: string;
}

export function MetadataPanel({
  isOpen,
  onClose,
  currentMood,
  currentIntensity,
  timeline,
  rawText
}: MetadataPanelProps) {
  const [showRawTags, setShowRawTags] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);

  if (!isOpen) return null;

  const getMoodColor = (mood: MoodName): string => {
    const colors: Record<MoodName, string> = {
      excited: 'text-orange-600 bg-orange-50',
      thoughtful: 'text-purple-600 bg-purple-50',
      calm: 'text-blue-600 bg-blue-50',
      urgent: 'text-red-600 bg-red-50',
      formal: 'text-slate-600 bg-slate-50',
      empathetic: 'text-pink-600 bg-pink-50',
      neutral: 'text-gray-600 bg-gray-50'
    };
    return colors[mood] || colors.neutral;
  };

  const getMoodEmoji = (mood: MoodName): string => {
    const emojis: Record<MoodName, string> = {
      excited: '🎉',
      thoughtful: '💭',
      calm: '😌',
      urgent: '⚡',
      formal: '🎯',
      empathetic: '💙',
      neutral: '📝'
    };
    return emojis[mood] || emojis.neutral;
  };

  const getIntensityLabel = (intensity: number): string => {
    if (intensity < 0.4) return 'Subtle';
    if (intensity < 0.7) return 'Moderate';
    return 'Strong';
  };

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Presentation Metadata</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          aria-label="Close metadata panel"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Current State */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Current State</h4>

          <div className="space-y-3">
            {/* Mood */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Mood</label>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${getMoodColor(currentMood)}`}>
                <span>{getMoodEmoji(currentMood)}</span>
                <span className="capitalize">{currentMood}</span>
              </div>
            </div>

            {/* Intensity */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Intensity</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${currentIntensity * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 w-16">
                  {(currentIntensity * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {getIntensityLabel(currentIntensity)}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="flex items-center justify-between w-full mb-3"
          >
            <h4 className="text-sm font-semibold text-gray-700">
              Mood Timeline ({timeline.length} segments)
            </h4>
            {showTimeline ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {showTimeline && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {timeline.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No mood changes yet</p>
              ) : (
                timeline.map((segment, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 p-2 rounded text-xs ${getMoodColor(segment.mood)}`}
                  >
                    <span>{getMoodEmoji(segment.mood)}</span>
                    <div className="flex-1">
                      <div className="font-medium capitalize">{segment.mood}</div>
                      <div className="text-gray-600">
                        Chars {segment.start}–{segment.end} ({segment.end - segment.start})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {(segment.intensity * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Raw Tags */}
        {rawText && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <button
              onClick={() => setShowRawTags(!showRawTags)}
              className="flex items-center justify-between w-full mb-3"
            >
              <h4 className="text-sm font-semibold text-gray-700">Raw Response</h4>
              {showRawTags ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {showRawTags && (
              <pre className="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto whitespace-pre-wrap break-words font-mono text-gray-700">
                {rawText}
              </pre>
            )}
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">About Living Fonts</h4>
          <p className="text-xs text-blue-700 leading-relaxed">
            This response uses <strong>Living Fonts</strong> - a presentation protocol
            that encodes emotion and emphasis into handwriting. The AI's mood affects
            how the text appears: excited text is energetic and slanted, thoughtful
            text is measured and neat.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Presentation metadata for transparency
        </p>
      </div>
    </div>
  );
}

/**
 * Metadata toggle button for toolbar
 */
export function MetadataToggle({
  isOpen,
  onClick
}: {
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
        ${isOpen
          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }
      `}
      title="Show presentation metadata"
    >
      <Info className="w-4 h-4" />
      <span className="hidden sm:inline">
        {isOpen ? 'Hide' : 'Show'} Metadata
      </span>
    </button>
  );
}
