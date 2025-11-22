'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle, Book, FileText, Edit2, Check, X, MoreVertical, Eye, EyeOff, Download, Upload, Trash2 } from 'lucide-react';
import type { Page, CanvasState, CanvasActions } from '@/lib/types';

interface TopBarProps {
  pages: Page[];
  currentPageId: string;
  state: CanvasState;
  actions: CanvasActions;
  onPageChange: (pageId: string) => void;
  onPageTitleUpdate: (pageId: string, title: string) => void;
  onHelpClick?: () => void;
}

export function TopBar({
  pages,
  currentPageId,
  state,
  actions,
  onPageChange,
  onPageTitleUpdate,
  onHelpClick
}: TopBarProps) {
  const [showNotebooks, setShowNotebooks] = useState(false);
  const [showPages, setShowPages] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editingNotebookId, setEditingNotebookId] = useState<string | null>(null);
  const [editNotebookTitle, setEditNotebookTitle] = useState('');

  const currentNotebook = state.notebooks.find(n => n.id === state.currentNotebookId);
  const currentPage = pages.find(p => p.id === currentPageId);

  // Get pages for current notebook only
  const currentNotebookPages = pages.filter(p => p.notebookId === state.currentNotebookId);
  const currentPageNumber = currentNotebookPages.findIndex(p => p.id === currentPageId) + 1;

  const handleStartEdit = (page: Page) => {
    setEditingPageId(page.id);
    setEditTitle(page.title || '');
  };

  const handleSaveEdit = () => {
    if (editingPageId) {
      onPageTitleUpdate(editingPageId, editTitle.trim());
      setEditingPageId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingPageId(null);
    setEditTitle('');
  };

  const handleStartNotebookEdit = (notebookId: string, title: string) => {
    setEditingNotebookId(notebookId);
    setEditNotebookTitle(title);
  };

  const handleSaveNotebookEdit = () => {
    if (editingNotebookId) {
      actions.updateNotebookTitle(editingNotebookId, editNotebookTitle.trim());
      setEditingNotebookId(null);
    }
  };

  const handleCancelNotebookEdit = () => {
    setEditingNotebookId(null);
    setEditNotebookTitle('');
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
      {/* Left: Cursive Brand, Notebook & Page */}
      <div className="flex items-center gap-3">
        {/* Brand */}
        <div className="font-['Caveat'] text-2xl font-bold text-gray-800 mr-2">
          Cursive
        </div>

        <div className="w-px h-5 bg-gray-300" />
        {/* Notebook Selector */}
        <div className="relative">
          <button
            onClick={() => setShowNotebooks(!showNotebooks)}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors text-sm font-medium text-gray-700"
          >
            <Book className="w-4 h-4" />
            <span>{currentNotebook?.title || 'My Notebook'}</span>
            <ChevronDown className="w-3 h-3 text-gray-500" />
          </button>

          {/* Notebook Dropdown */}
          {showNotebooks && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[250px] max-h-[400px] overflow-y-auto z-50">
              {/* Add New Notebook Button */}
              <button
                onClick={() => {
                  actions.addNotebook();
                  setShowNotebooks(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-b border-gray-200 font-medium"
              >
                <span className="text-lg">+</span>
                <span>Add New Notebook</span>
              </button>

              {state.notebooks.map((notebook) => {
                const isEditing = editingNotebookId === notebook.id;
                const isCurrent = notebook.id === state.currentNotebookId;

                return (
                  <div
                    key={notebook.id}
                    className={`
                      flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors
                      ${isCurrent ? 'bg-blue-50' : ''}
                    `}
                  >
                    {isEditing ? (
                      // Edit mode
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editNotebookTitle}
                          onChange={(e) => setEditNotebookTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNotebookEdit();
                            if (e.key === 'Escape') handleCancelNotebookEdit();
                          }}
                          placeholder="Notebook title"
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveNotebookEdit}
                          className="p-1 hover:bg-green-100 rounded transition-colors"
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </button>
                        <button
                          onClick={handleCancelNotebookEdit}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    ) : (
                      // View mode
                      <>
                        <button
                          onClick={() => {
                            actions.goToNotebook(notebook.id);
                            setShowNotebooks(false);
                          }}
                          className="flex-1 text-left text-sm"
                        >
                          <div className="font-medium text-gray-900">
                            {notebook.title}
                            {isCurrent && <span className="text-blue-600 ml-2">•</span>}
                          </div>
                          {notebook.description && (
                            <div className="text-xs text-gray-600">{notebook.description}</div>
                          )}
                        </button>
                        <button
                          onClick={() => handleStartNotebookEdit(notebook.id, notebook.title)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Edit notebook title"
                        >
                          <Edit2 className="w-3 h-3 text-gray-500" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-gray-300" />

        {/* Page Selector */}
        <div className="relative">
          <button
            onClick={() => setShowPages(!showPages)}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors text-sm text-gray-700"
          >
            <FileText className="w-4 h-4" />
            <span>
              Page {currentPageNumber}
              {currentPage?.title && `: ${currentPage.title}`}
            </span>
            <ChevronDown className="w-3 h-3 text-gray-500" />
          </button>

          {/* Pages Dropdown */}
          {showPages && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[250px] max-h-[400px] overflow-y-auto z-50">
              {/* Add New Page Button */}
              <button
                onClick={() => {
                  actions.addPage();
                  setShowPages(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-b border-gray-200 font-medium"
              >
                <span className="text-lg">+</span>
                <span>Add New Page</span>
              </button>

              {currentNotebookPages.map((page, index) => {
                const isEditing = editingPageId === page.id;
                const isCurrent = page.id === currentPageId;

                return (
                  <div
                    key={page.id}
                    className={`
                      flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors
                      ${isCurrent ? 'bg-blue-50' : ''}
                    `}
                  >
                    {isEditing ? (
                      // Edit mode
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          placeholder={`Page ${index + 1}`}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="p-1 hover:bg-green-100 rounded transition-colors"
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    ) : (
                      // View mode
                      <>
                        <button
                          onClick={() => {
                            onPageChange(page.id);
                            setShowPages(false);
                          }}
                          className="flex-1 text-left text-sm"
                        >
                          <div className="font-medium text-gray-900">
                            Page {index + 1}
                            {isCurrent && <span className="text-blue-600 ml-2">•</span>}
                          </div>
                          {page.title && (
                            <div className="text-xs text-gray-600">{page.title}</div>
                          )}
                        </button>
                        <button
                          onClick={() => handleStartEdit(page)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Edit page title"
                        >
                          <Edit2 className="w-3 h-3 text-gray-500" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Settings & Help */}
      <div className="flex items-center gap-2">
        {/* Settings Menu */}
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Settings"
          >
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>

          {showSettings && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[200px] z-50">
              {/* Hide AI Toggle */}
              <button
                onClick={() => {
                  actions.toggleHideAIResponses();
                  setShowSettings(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
              >
                {state.hideAIResponses ? (
                  <Eye className="w-4 h-4 text-gray-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-600" />
                )}
                <span>
                  {state.hideAIResponses ? 'Show AI Responses' : 'Hide AI Responses'}
                </span>
              </button>

              <div className="border-t border-gray-200 my-1" />

              {/* Export/Import (placeholders for now) */}
              <button
                onClick={() => {
                  alert('Export feature coming soon!');
                  setShowSettings(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
              >
                <Download className="w-4 h-4 text-gray-600" />
                <span>Export Page</span>
              </button>

              <div className="border-t border-gray-200 my-1" />

              {/* Clear All */}
              <button
                onClick={() => {
                  if (confirm('Clear all content on this page?')) {
                    actions.clearAll();
                    setShowSettings(false);
                  }
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 flex items-center gap-3 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All</span>
              </button>
            </div>
          )}
        </div>

        {/* Help */}
        <button
          onClick={onHelpClick}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Help & Gestures"
        >
          <HelpCircle className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Click outside to close dropdowns */}
      {(showNotebooks || showPages || showSettings) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowNotebooks(false);
            setShowPages(false);
            setShowSettings(false);
          }}
        />
      )}
    </div>
  );
}
