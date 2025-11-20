'use client';

import { useEffect, useState } from 'react';
import { Send, X } from 'lucide-react';

interface GestureConfirmationProps {
  onSend: () => void;
  onCancel: () => void;
  confidence: number; // 0-1, how confident the gesture detection is
  duration?: number; // Optional auto-confirm duration in ms (default: 500ms)
}

export function GestureConfirmation({
  onSend,
  onCancel,
  confidence,
  duration = 500
}: GestureConfirmationProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    // Countdown timer
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0 && !cancelled) {
        onSend();
      }
    }, 16); // ~60fps for smooth animation

    return () => clearInterval(interval);
  }, [duration, onSend, cancelled]);

  const handleCancel = () => {
    setCancelled(true);
    onCancel();
  };

  const progress = (timeRemaining / duration) * 100;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/10 pointer-events-auto" onClick={handleCancel} />

      {/* Confirmation Card */}
      <div className="relative bg-white rounded-lg shadow-2xl border-2 border-blue-500 p-6 pointer-events-auto animate-scale-in">
        {/* Progress Ring */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
          <svg className="w-20 h-20 -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="4"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 36}`}
              strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
              className="transition-all duration-75 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Send className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center mt-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Send to AI?
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Detected circle gesture ({Math.round(confidence * 100)}% confidence)
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={onSend}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium text-sm"
            >
              <Send className="w-4 h-4" />
              Send Now
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors font-medium text-sm"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>

          {/* Helper text */}
          <p className="text-xs text-gray-500 mt-3">
            Auto-sending in {(timeRemaining / 1000).toFixed(1)}s
          </p>
        </div>
      </div>

      {/* Inline CSS for animation */}
      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.15s ease-out;
        }
      `}</style>
    </div>
  );
}
