'use client';

import type { CanvasState, CanvasActions, Tool } from '@/lib/types';

interface ToolbarProps {
  state: CanvasState;
  actions: CanvasActions;
}

export function Toolbar({ state, actions }: ToolbarProps) {
  const tools = [
    { id: 'draw' as Tool, icon: 'fa-pencil-alt', label: 'Draw' },
    { id: 'select' as Tool, icon: 'fa-vector-square', label: 'Select to Chat' },
    { id: 'pan' as Tool, icon: 'fa-hand-paper', label: 'Pan Canvas' },
    { id: 'zoom' as Tool, icon: 'fa-search', label: 'Zoom' },
  ];

  const canUndo = state.undoStack.length > 1;
  const canRedo = state.redoStack.length > 0;

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 px-4 py-2">
        {/* Drawing tools */}
        <div className="flex gap-1 border-r border-gray-200 pr-2">
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
        <div className="flex gap-1">
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
            title="Undo"
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
            title="Redo"
          >
            <i className="fas fa-redo" />
          </button>
        </div>

        {/* Utility buttons */}
        <div className="flex gap-1 ml-auto">
          <button
            onClick={actions.clearAll}
            className="px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            title="Clear Canvas"
          >
            <i className="fas fa-trash-alt mr-1" />
            <span className="text-sm">Clear All</span>
          </button>
          <button
            className="px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            title="Export"
          >
            <i className="fas fa-download mr-1" />
            <span className="text-sm">Export</span>
          </button>
        </div>
      </div>
    </div>
  );
}
