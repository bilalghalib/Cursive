'use client';

import { Canvas } from '@/components/Canvas';
import { useCanvas } from '@/hooks/useCanvas';

export default function HomePage() {
  const [state, actions, canvasRef] = useCanvas();

  return (
    <div className="h-screen">
      <Canvas
        state={state}
        actions={actions}
        canvasRef={canvasRef}
      />
    </div>
  );
}
