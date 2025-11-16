'use client';

import { useState } from 'react';
import type { CanvasState, CanvasActions, Tool } from '@/lib/types';
import { UserMenu } from './UserMenu';
import { AuthModal } from './AuthModal';

interface ToolbarProps {
  state: CanvasState;
  actions: CanvasActions;
  onExportJSON?: () => void;
  onExportPDF?: () => void;
  onImportJSON?: (file: File) => void;
  onToggleTheme?: () => void;
}

export function Toolbar({ state, actions, onExportJSON, onExportPDF, onImportJSON, onToggleTheme }: ToolbarProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const tools = [
    { id: 'draw' as Tool, icon: 'fa-pencil-alt', label: 'Draw' },
    { id: 'select' as Tool, icon: 'fa-vector-square', label: 'Select to Chat' },
    { id: 'pan' as Tool, icon: 'fa-hand-paper', label: 'Pan Canvas' },
    { id: 'zoom' as Tool, icon: 'fa-search', label: 'Zoom' },
  ];

  const canUndo = state.undoStack.length > 1;
  const canRedo = state.redoStack.length > 0;

  const handleNewSession = () => {
    if (state.drawings.length > 0 || state.chatHistory.length > 0) {
      if (confirm('Start a new session? This will clear all drawings and conversation history.')) {
        actions.clearAll();
      }
    } else {
      actions.clearAll();
    }
  };

  const handleToggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (onToggleTheme) {
      onToggleTheme();
    }
    // TODO: Implement theme switching
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportJSON) {
      onImportJSON(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 px-4 py-2">
        {/* App Title */}
        <div className="mr-2 font-semibold text-lg text-gray-800">
          Cursive
        </div>

        {/* Drawing tools */}
        <div className="flex gap-1 border-r border-gray-200 pr-2 mr-2">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => actions.setTool(tool.id)}
              className={`
                px-3 py-2 rounded-md transition-colors
                ${state.currentTool === tool.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
              title={tool.label}
            >
              <i className={`fas ${tool.icon}`} />
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 border-r border-gray-200 pr-2 mr-2">
          <button
            onClick={actions.undo}
            disabled={!canUndo}
            className={`
              px-3 py-2 rounded-md transition-colors
              ${canUndo
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }
            `}
            title="Undo (Cmd+Z)"
          >
            <i className="fas fa-undo" />
          </button>
          <button
            onClick={actions.redo}
            disabled={!canRedo}
            className={`
              px-3 py-2 rounded-md transition-colors
              ${canRedo
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }
            `}
            title="Redo (Cmd+Shift+Z)"
          >
            <i className="fas fa-redo" />
          </button>
        </div>

        {/* Utility buttons */}
        <div className="flex gap-1 ml-auto">
          <button
            onClick={handleNewSession}
            className="px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            title="New Session"
          >
            <i className="fas fa-file mr-1" />
            <span className="text-sm hidden sm:inline">New</span>
          </button>

          <button
            onClick={handleToggleTheme}
            className="px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            title="Toggle Theme"
          >
            <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`} />
          </button>

          {/* More dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              title="More Options"
            >
              <i className="fas fa-ellipsis-v" />
            </button>

            {showMoreMenu && (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMoreMenu(false)}
                />

                {/* Dropdown menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onExportJSON?.();
                        setShowMoreMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <i className="fas fa-download w-5" />
                      Export JSON
                    </button>

                    <button
                      onClick={() => {
                        onExportPDF?.();
                        setShowMoreMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <i className="fas fa-file-pdf w-5" />
                      Export PDF
                    </button>

                    <label className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center cursor-pointer">
                      <i className="fas fa-upload w-5" />
                      Import JSON
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileImport}
                        className="hidden"
                      />
                    </label>

                    <div className="border-t border-gray-200 my-1" />

                    <button
                      onClick={() => {
                        actions.clearTextOverlays();
                        setShowMoreMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <i className="fas fa-eraser w-5" />
                      Clear Text Overlays
                    </button>

                    <button
                      onClick={() => {
                        handleNewSession();
                        setShowMoreMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                    >
                      <i className="fas fa-trash-alt w-5" />
                      Clear All
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User menu */}
          <UserMenu onLoginClick={() => setShowAuthModal(true)} />
        </div>
      </div>

      {/* Status bar */}
      {(state.chatHistory.length > 0 || state.textOverlays.length > 0) && (
        <div className="bg-gray-50 px-4 py-1 border-t border-gray-200">
          <div className="flex items-center gap-4 text-xs text-gray-600">
            {state.chatHistory.length > 0 && (
              <span>
                <i className="fas fa-comments mr-1" />
                {state.chatHistory.length} messages
              </span>
            )}
            {state.textOverlays.length > 0 && (
              <span>
                <i className="fas fa-font mr-1" />
                {state.textOverlays.length} text overlays
              </span>
            )}
            {state.drawings.length > 0 && (
              <span>
                <i className="fas fa-pen mr-1" />
                {state.drawings.length} strokes
              </span>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          // Refresh user menu
          window.location.reload();
        }}
      />
    </div>
  );
}
