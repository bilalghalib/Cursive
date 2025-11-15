'use client';

import { useState } from 'react';

type Tool = 'draw' | 'select' | 'pan' | 'zoom';

interface ToolbarProps {
  onToolChange?: (tool: Tool) => void;
}

export function Toolbar({ onToolChange }: ToolbarProps) {
  const [activeTool, setActiveTool] = useState<Tool>('draw');

  const handleToolClick = (tool: Tool) => {
    setActiveTool(tool);
    onToolChange?.(tool);
  };

  const tools = [
    { id: 'draw' as Tool, icon: 'fa-pencil-alt', label: 'Draw' },
    { id: 'select' as Tool, icon: 'fa-vector-square', label: 'Select to Chat' },
    { id: 'pan' as Tool, icon: 'fa-hand-paper', label: 'Pan Canvas' },
    { id: 'zoom' as Tool, icon: 'fa-search', label: 'Zoom' },
  ];

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 px-4 py-2">
        {/* Drawing tools */}
        <div className="flex gap-1 border-r border-gray-200 pr-2">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              className={`
                px-3 py-2 rounded-md transition-colors
                ${activeTool === tool.id
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
            className="px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            title="Undo"
          >
            <i className="fas fa-undo" />
          </button>
          <button
            className="px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            title="Redo"
          >
            <i className="fas fa-redo" />
          </button>
        </div>

        {/* Utility buttons */}
        <div className="flex gap-1 ml-auto">
          <button
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
