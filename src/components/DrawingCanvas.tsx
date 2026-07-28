import { useRef, useState, useEffect, useCallback } from "react";
import { PrimaryButton, GhostButton } from "./ui";
import { Undo, Trash2 } from "lucide-react";

interface Stroke {
  points: { x: number; y: number }[];
}

interface DrawingCanvasProps {
  onDrawComplete: (dataUrl: string) => void;
  initialData?: string;
}

export function DrawingCanvas({ onDrawComplete, initialData }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1a1714";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;
    ctx.strokeStyle = "#e8dcc8";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const stroke of allStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [strokes, currentStroke]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;
    canvas.width = rect.width;
    canvas.height = Math.max(300, rect.height);
    redraw();
  }, []);

  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const pos = getPos(e);
    setCurrentStroke({ points: [pos] });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!currentStroke) return;
    e.preventDefault();
    const pos = getPos(e);
    setCurrentStroke({ points: [...currentStroke.points, pos] });
  };

  const handlePointerUp = () => {
    if (!currentStroke) return;
    setStrokes([...strokes, currentStroke]);
    setCurrentStroke(null);
  };

  const handleUndo = () => {
    setStrokes(strokes.slice(0, -1));
  };

  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke(null);
  };

  const handleDone = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onDrawComplete(dataUrl);
  };

  useEffect(() => {
    if (!initialData || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const ctx = canvasRef.current!.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
    };
    img.src = initialData;
  }, [initialData]);

  return (
    <div className="space-y-3">
      <div className="rounded-monk border border-monk-border overflow-hidden" style={{ touchAction: "none" }}>
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>
      <div className="flex gap-2">
        <GhostButton onClick={handleUndo} className="gap-1.5">
          <Undo size={14} /> Undo
        </GhostButton>
        <GhostButton onClick={handleClear} className="gap-1.5">
          <Trash2 size={14} /> Clear
        </GhostButton>
      </div>
      <PrimaryButton onClick={handleDone} className="w-full">
        Save drawing
      </PrimaryButton>
    </div>
  );
}
