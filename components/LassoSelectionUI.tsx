'use client';

import { Sparkles, Trash2, X } from 'lucide-react';
import type { LassoSelection } from '@/lib/types';

interface LassoSelectionUIProps {
  selection: LassoSelection;
  onAskAI: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function LassoSelectionUI({
  selection,
  onAskAI,
  onDelete,
  onClear
}: LassoSelectionUIProps) {
  const { bounds } = selection;

  // Position toolbar below selection with some padding
  const toolbarY = bounds.y + bounds.height + 10;
  const toolbarX = bounds.x;

  return (
    <>
      {/* Selection bounding box with subtle glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: bounds.x,
          top: bounds.y,
          width: bounds.width,
          height: bounds.height,
          border: '2px dashed #3b82f6',
          borderRadius: '4px',
          backgroundColor: 'rgba(59, 130, 246, 0.05)',
          boxShadow: '0 0 12px rgba(59, 130, 246, 0.3)'
        }}
      >
        {/* Resize handles (corners) */}
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white pointer-events-auto cursor-nwse-resize" />
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white pointer-events-auto cursor-nesw-resize" />
        <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white pointer-events-auto cursor-nesw-resize" />
        <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white pointer-events-auto cursor-nwse-resize" />
      </div>

      {/* Toolbar below selection */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: toolbarX,
          top: toolbarY,
          zIndex: 1000
        }}
      >
        <div className="flex items-center gap-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2">
          {/* Ask AI button (primary action) */}
          <button
            onClick={onAskAI}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium text-sm shadow-sm"
            title="Send to AI"
          >
            <Sparkles className="w-4 h-4" />
            Ask AI
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-300" />

          {/* Delete button */}
          <button
            onClick={onDelete}
            className="p-2 hover:bg-red-50 rounded-md transition-colors"
            title="Delete selected strokes"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-300" />

          {/* Clear selection button */}
          <button
            onClick={onClear}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Clear selection"
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        {/* Selection info */}
        <div className="mt-2 text-xs text-gray-600 bg-white px-2 py-1 rounded shadow-sm border border-gray-200">
          {selection.selectedStrokes.length} stroke{selection.selectedStrokes.length !== 1 ? 's' : ''} selected
        </div>
      </div>
    </>
  );
}
