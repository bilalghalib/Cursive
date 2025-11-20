'use client';

import { useState } from 'react';
import { Send, X, FileText } from 'lucide-react';
import type { Page } from '@/lib/types';

interface MultiPageSelectorProps {
  pages: Page[];
  currentPageId: string;
  onSend: (pageIds: string[]) => void;
  onCancel: () => void;
}

export function MultiPageSelector({
  pages,
  currentPageId,
  onSend,
  onCancel
}: MultiPageSelectorProps) {
  // Start with current page selected
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(
    new Set([currentPageId])
  );

  const togglePage = (pageId: string) => {
    const newSelected = new Set(selectedPageIds);
    if (newSelected.has(pageId)) {
      // Don't allow deselecting the current page (where lasso was drawn)
      if (pageId !== currentPageId) {
        newSelected.delete(pageId);
      }
    } else {
      newSelected.add(pageId);
    }
    setSelectedPageIds(newSelected);
  };

  const handleSend = () => {
    onSend(Array.from(selectedPageIds));
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 pointer-events-auto" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-2xl border border-gray-200 p-6 max-w-md w-full pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Send to AI
          </h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-sm text-gray-600 mb-4">
          Select which pages to include in your question to AI:
        </p>

        {/* Page list */}
        <div className="max-h-64 overflow-y-auto mb-4 space-y-2">
          {pages.map((page, index) => {
            const isSelected = selectedPageIds.has(page.id);
            const isCurrent = page.id === currentPageId;

            return (
              <button
                key={page.id}
                onClick={() => togglePage(page.id)}
                disabled={isCurrent}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-md border-2 transition-all
                  ${isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                  }
                  ${isCurrent ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {/* Checkbox */}
                <div className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                  ${isSelected
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 bg-white'
                  }
                `}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Page icon */}
                <FileText className="w-4 h-4 text-gray-500" />

                {/* Page info */}
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900">
                    Page {index + 1}
                    {isCurrent && <span className="text-blue-600 ml-2">(current)</span>}
                  </div>
                  {page.title && (
                    <div className="text-sm text-gray-600">
                      {page.title}
                    </div>
                  )}
                </div>

                {/* Page details */}
                <div className="text-xs text-gray-500">
                  {page.size}
                </div>
              </button>
            );
          })}
        </div>

        {/* Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
          <p className="text-sm text-blue-900">
            <strong>{selectedPageIds.size}</strong> page{selectedPageIds.size !== 1 ? 's' : ''} will be sent to AI
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
          >
            <Send className="w-4 h-4" />
            Send to AI
          </button>
        </div>
      </div>
    </div>
  );
}
