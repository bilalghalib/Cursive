'use client';

import { Canvas } from '@/components/Canvas';
import { Toolbar } from '@/components/Toolbar';

export default function HomePage() {
  return (
    <div className="flex flex-col h-screen">
      <Toolbar />
      <div className="flex-1 overflow-hidden">
        <Canvas />
      </div>
    </div>
  );
}
