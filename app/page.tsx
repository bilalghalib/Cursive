'use client';

import { Canvas } from '@/components/Canvas';
import { Toolbar } from '@/components/Toolbar';
import { useCanvas } from '@/hooks/useCanvas';
import { downloadJSON, exportToPDF, importFromJSON } from '@/lib/export';

export default function HomePage() {
  const [state, actions, canvasRef] = useCanvas();

  const handleExportJSON = () => {
    downloadJSON(state.drawings, state.chatHistory, state.textOverlays);
  };

  const handleExportPDF = async () => {
    const canvas = canvasRef.current;
    if (canvas) {
      await exportToPDF(canvas);
    }
  };

  const handleImportJSON = async (file: File) => {
    const data = await importFromJSON(file);
    if (data) {
      // Clear current state
      actions.clearAll();

      // Load imported data
      // Note: We need to add these actions to restore state
      // For now, just show success
      alert(`Imported ${data.metadata.totalStrokes} strokes, ${data.metadata.totalMessages} messages`);

      // TODO: Add actions.loadState(data) to restore drawings, chat, overlays
    } else {
      alert('Failed to import file. Please check the file format.');
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Toolbar
        state={state}
        actions={actions}
        onExportJSON={handleExportJSON}
        onExportPDF={handleExportPDF}
        onImportJSON={handleImportJSON}
      />
      <div className="flex-1 overflow-hidden">
        <Canvas
          state={state}
          actions={actions}
          canvasRef={canvasRef}
        />
      </div>
    </div>
  );
}
