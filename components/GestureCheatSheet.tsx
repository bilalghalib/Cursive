'use client';

import { X } from 'lucide-react';

interface GestureCheatSheetProps {
  onClose: () => void;
}

export function GestureCheatSheet({ onClose }: GestureCheatSheetProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm">
      {/* Semi-transparent overlay so users can see canvas underneath */}
      <div className="bg-white/95 rounded-lg shadow-2xl border-2 border-gray-300 p-6 max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Gestures & Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Gestures */}
        <div className="space-y-4">
          {/* Draw */}
          <div className="flex items-start gap-3">
            <div className="text-3xl">✏️</div>
            <div>
              <div className="font-semibold text-gray-900">Write & Draw</div>
              <div className="text-sm text-gray-600">
                Just start writing or drawing naturally. No tool switching needed.
              </div>
            </div>
          </div>

          {/* Single Circle */}
          <div className="flex items-start gap-3">
            <div className="text-3xl">⭕</div>
            <div>
              <div className="font-semibold text-gray-900">Circle → Select</div>
              <div className="text-sm text-gray-600">
                Draw a <strong>fast circle around content</strong> to select it.
                <br />
                Toolbar appears with "Ask AI" button.
              </div>
            </div>
          </div>

          {/* Double Circle */}
          <div className="flex items-start gap-3">
            <div className="text-3xl">⭕⭕</div>
            <div>
              <div className="font-semibold text-gray-900">Double Circle → Send All</div>
              <div className="text-sm text-gray-600">
                Draw <strong>two fast circles</strong> (within 1 second) to instantly send all new content to AI.
              </div>
            </div>
          </div>

          {/* Cancel */}
          <div className="flex items-start gap-3">
            <div className="text-3xl">✗</div>
            <div>
              <div className="font-semibold text-gray-900">Cancel Selection</div>
              <div className="text-sm text-gray-600">
                Click the ✗ button to cancel selection. Circle becomes a regular drawing.
              </div>
            </div>
          </div>

          {/* Navigate Pages */}
          <div className="flex items-start gap-3">
            <div className="text-3xl">↔️</div>
            <div>
              <div className="font-semibold text-gray-900">Navigate Pages</div>
              <div className="text-sm text-gray-600">
                <strong>Swipe left/right</strong> to move between pages (coming soon).
                <br />
                Or use the page dropdown in the top bar.
              </div>
            </div>
          </div>

          {/* Undo/Redo */}
          <div className="flex items-start gap-3">
            <div className="text-3xl">⌨️</div>
            <div>
              <div className="font-semibold text-gray-900">Keyboard Shortcuts</div>
              <div className="text-sm text-gray-600">
                <strong>Cmd/Ctrl + Z:</strong> Undo
                <br />
                <strong>Cmd/Ctrl + Shift + Z:</strong> Redo
                <br />
                <strong>?</strong> (press ? key): Show this help
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Press <strong>?</strong> anytime to see this help again
          </p>
        </div>
      </div>
    </div>
  );
}
