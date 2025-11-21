'use client';

import { useState } from 'react';
import type { InteractionMetadata } from '@/lib/types';

interface InteractionInfoProps {
  metadata: InteractionMetadata;
  onClose: () => void;
}

export function InteractionInfoModal({ metadata, onClose }: InteractionInfoProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
         onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            AI Interaction Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">

          {/* Why This Matters */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-1">
              🔍 Transparency in Action
            </h3>
            <p className="text-xs text-purple-800 dark:text-purple-200">
              Cursive believes AI should be transparent. This shows you exactly what was sent to Claude and what it responded with.
            </p>
          </div>

          {/* Timestamp */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              When
            </h3>
            <p className="text-gray-900 dark:text-white">
              {new Date(metadata.timestamp).toLocaleString()}
            </p>
          </div>

          {/* User Input */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              What You Sent
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-sans">
                {metadata.userInput}
              </pre>
            </div>
          </div>

          {/* AI Response */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              What Claude Responded
            </h3>
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <pre className="text-sm text-purple-900 dark:text-purple-100 whitespace-pre-wrap font-sans">
                {metadata.aiResponse}
              </pre>
            </div>
          </div>

          {/* Model Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Model
              </h3>
              <p className="text-gray-900 dark:text-white font-mono text-sm">
                {metadata.model}
              </p>
            </div>

            {metadata.tokensUsed && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Tokens Used
                </h3>
                <p className="text-gray-900 dark:text-white">
                  {metadata.tokensUsed.toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* System Prompt */}
          {metadata.systemPrompt && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                System Prompt Used
              </h3>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <pre className="text-xs text-blue-900 dark:text-blue-100 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                  {metadata.systemPrompt}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Info icon button that shows interaction metadata when clicked
 */
interface InfoIconProps {
  metadata: InteractionMetadata;
  className?: string;
}

export function InteractionInfoIcon({ metadata, className = '' }: InfoIconProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300
                    transition-colors ${className}`}
        title="View interaction details"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {showModal && (
        <InteractionInfoModal metadata={metadata} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
