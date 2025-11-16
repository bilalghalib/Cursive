'use client';

import { Canvas } from '@/components/Canvas';
import { Toolbar } from '@/components/Toolbar';
import { useCanvas } from '@/hooks/useCanvas';

export default function HomePage() {
  const [state, actions, canvasRef] = useCanvas();

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
        />
      </div>
    </div>
  );
}
