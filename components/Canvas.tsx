'use client';

import { useRef, useEffect, useState } from 'react';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

type Tool = 'draw' | 'select' | 'pan' | 'zoom';

interface CanvasProps {
  notebookId?: string;
  readOnly?: boolean;
}

export function Canvas({ notebookId, readOnly = false }: CanvasProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<Tool>('draw');
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [drawings, setDrawings] = useState<Stroke[]>([]);
  
  // Transform state
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  
  // Undo/redo
  const [undoStack, setUndoStack] = useState<Stroke[][]>([[]]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctxRef.current = ctx;

    // Set canvas size
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      // Redraw after resize
      redrawCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Configure drawing context
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fill background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Redraw canvas
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Apply transformations
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(scale, scale);

    // Draw all strokes
    drawings.forEach(stroke => {
      drawStroke(stroke);
    });

    // Draw current stroke
    if (currentStroke.length > 0) {
      drawStroke({
        points: currentStroke,
        color: '#000000',
        width: 2
      });
    }

    ctx.restore();
  };

  // Draw a stroke
  const drawStroke = (stroke: Stroke) => {
    const ctx = ctxRef.current;
    if (!ctx || stroke.points.length === 0) return;

    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;

    const firstPoint = stroke.points[0];
    ctx.moveTo(firstPoint.x, firstPoint.y);

    for (let i = 1; i < stroke.points.length; i++) {
      const point = stroke.points[i];
      ctx.lineTo(point.x, point.y);
    }

    ctx.stroke();
  };

  // Redraw when drawings change
  useEffect(() => {
    redrawCanvas();
  }, [drawings, currentStroke, scale, panX, panY]);

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panX) / scale;
    const y = (e.clientY - rect.top - panY) / scale;

    if (currentTool === 'draw') {
      setIsDrawing(true);
      setCurrentStroke([{ x, y }]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || currentTool !== 'draw') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panX) / scale;
    const y = (e.clientY - rect.top - panY) / scale;

    setCurrentStroke(prev => [...prev, { x, y }]);
  };

  const handlePointerUp = () => {
    if (isDrawing && currentStroke.length > 0) {
      // Save stroke to drawings
      const newStroke: Stroke = {
        points: currentStroke,
        color: '#000000',
        width: 2
      };

      setDrawings(prev => {
        const newDrawings = [...prev, newStroke];
        // Update undo stack
        setUndoStack(stack => [...stack, newDrawings]);
        setRedoStack([]);
        return newDrawings;
      });

      setCurrentStroke([]);
    }

    setIsDrawing(false);
  };

  return (
    <div className="relative w-full h-full bg-white">
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOut={handlePointerUp}
      />
    </div>
  );
}
