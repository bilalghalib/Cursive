'use client';

import { useState } from 'react';
import { Canvas } from '@/components/Canvas';
import { Toolbar } from '@/components/Toolbar';
import { ChatPanel } from '@/components/ChatPanel';
import { useCanvas } from '@/hooks/useCanvas';
import type { TranscriptionResult } from '@/lib/types';

export default function HomePage() {
  const [state, actions, canvasRef] = useCanvas();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | undefined>();
  const [selectionImageData, setSelectionImageData] = useState<ImageData | null>(null);

  const handleSelectionComplete = (imageData: ImageData | null, transcription?: TranscriptionResult) => {
    if (imageData) {
      setSelectionImageData(imageData);
      setTranscriptionResult(transcription);
      setIsChatOpen(true);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Toolbar
        state={state}
        actions={actions}
      />
      <div className="flex-1 overflow-hidden">
        <Canvas
          state={state}
          actions={actions}
          canvasRef={canvasRef}
          onSelectionComplete={handleSelectionComplete}
        />
      </div>

      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        initialTranscription={transcriptionResult}
        selectionImageData={selectionImageData}
      />
    </div>
  );
}
