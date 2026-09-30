import { useCallback, useEffect, useRef, useState } from "react";
import { Brush, Check, Eraser, Pencil, Trash2, Undo2 } from "lucide-react";
import { GhostButton, PrimaryButton } from "../components/ui";
import { useT } from "../i18n";
import { hapticPress } from "../lib/haptics";
import { DRAW_H, DRAW_W, fitDrawingBox, shouldAppendPoint, toCanvasPoint } from "../lib/drawing";

/** Graphite, then a spread of pigment. Ink stays dark enough to read on paper. */
const INK_COLORS = [
  "#2f2a26",
  "#8b5e3c",
  "#c2410c",
  "#b8860b",
  "#2f6f4e",
  "#2f5d8b",
  "#6d4b8b",
  "#b03a5b"
] as const;

const BRUSH_SIZES = [3, 7, 16] as const;

/** Rough text-handling controls: hand-drawn, soft edge, solid edge. */
type Tool = "pen" | "brush" | "marker";

type Props = {
  /** Backing-store PNG, or null when the page is blank. */
  initialDataUrl: string | null;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
  /**
   * Drop the Cancel button. For a draw-only answer the pad is the whole
   * answer surface, so cancelling would leave nothing behind.
   */
  hideCancel?: boolean;
};

/**
 * Sketchpad for a notebook page.
 *
 * Owns its own bitmap: strokes are replayed so undo and eraser stay exact, and
 * the same replay routine renders the export. Paper stays opaque white so the
 * PNG the notebook stores looks identical on both themes.
 */
export default function NotebookDrawingPad({ initialDataUrl, onSave, onCancel, hideCancel }: Props) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const backgroundRef = useRef<HTMLImageElement | null>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(INK_COLORS[0]);
  const [size, setSize] = useState<number>(BRUSH_SIZES[1]);
  const [strokeCount, setStrokeCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [box, setBox] = useState({ width: 0, height: 0 });

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, DRAW_W, DRAW_H);
    const bg = backgroundRef.current;
    if (bg) ctx.drawImage(bg, 0, 0, DRAW_W, DRAW_H);
    for (const stroke of strokesRef.current) paint(ctx, stroke);
    const active = activeStrokeRef.current;
    if (active) paint(ctx, active);
  }, []);

  // Size the on-screen canvas to the available box. The backing store never
  // changes, so a resize only re-lays-out — no pixels are lost.
  useEffect(() => {
    const measure = () => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setBox(fitDrawingBox(rect.width, rect.height));
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (wrapRef.current) observer.observe(wrapRef.current);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Seed from the saved sketch, then paint. If it has not decoded yet the stroke
  // list is still authoritative for anything drawn in the meantime.
  useEffect(() => {
    let cancelled = false;
    if (!initialDataUrl) {
      redraw();
      return;
    }
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      backgroundRef.current = img;
      redraw();
    };
    img.onerror = () => {
      if (!cancelled) redraw();
    };
    img.src = initialDataUrl;
    return () => {
      cancelled = true;
    };
  }, [initialDataUrl, redraw]);

  const pointFrom = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return toCanvasPoint(event.clientX, event.clientY, rect);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerIdRef.current = event.pointerId;
    const point = pointFrom(event);
    activeStrokeRef.current = {
      tool,
      color,
      width: tool === "marker" ? size * 3 : tool === "brush" ? size * 1.8 : size,
      points: [point]
    };
    redraw();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const active = activeStrokeRef.current;
    if (!active || pointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    const point = pointFrom(event);
    if (!shouldAppendPoint(active.points[active.points.length - 1], point)) return;
    active.points.push(point);
    redraw();
  };

  const endStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const active = activeStrokeRef.current;
    if (!active || pointerIdRef.current !== event.pointerId) return;
    pointerIdRef.current = null;
    activeStrokeRef.current = null;
    strokesRef.current.push(active);
    setStrokeCount(strokesRef.current.length);
    redraw();
    hapticPress("light");
  };

  const undo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    setStrokeCount(strokesRef.current.length);
    redraw();
    hapticPress("light");
  };

  const clearAll = () => {
    strokesRef.current = [];
    activeStrokeRef.current = null;
    setStrokeCount(0);
    redraw();
    hapticPress("light");
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || saving) return;
    setSaving(true);
    canvas.toBlob(
      (blob) => {
        setSaving(false);
        if (!blob) return;
        hapticPress("medium");
        onSave(blob);
      },
      "image/png"
    );
  };

  const hasContent = strokeCount > 0 || !!initialDataUrl;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {(
          [
            { id: "pen", icon: Pencil, label: t("draw.toolPen") },
            { id: "brush", icon: Brush, label: t("draw.toolBrush") },
            { id: "marker", icon: Eraser, label: t("draw.toolMarker") }
          ] as const
        ).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTool(id)}
            aria-pressed={tool === id}
            className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition active:scale-95 ${
              tool === id
                ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
                : "border-monk-border bg-monk-soft text-monk-muted hover:text-monk-text"
            }`}
          >
            <Icon size={13} />
            <span>{label}</span>
          </button>
        ))}

        <div className="h-5 w-px bg-monk-border/60 mx-0.5" />

        {BRUSH_SIZES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSize(s)}
            aria-pressed={size === s}
            aria-label={`${t("draw.brushSize")} ${s}`}
            className={`grid h-8 w-8 place-items-center rounded-lg border transition active:scale-95 ${
              size === s
                ? "border-monk-accent bg-monk-accent-soft"
                : "border-monk-border bg-monk-soft hover:border-monk-border-strong"
            }`}
          >
            <span
              className="rounded-full bg-monk-text"
              style={{ width: Math.min(14, 3 + s * 0.6), height: Math.min(14, 3 + s * 0.6) }}
            />
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {INK_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-pressed={color === c}
            aria-label={`${t("draw.colorLabel")} ${c}`}
            className={`grid h-7 w-7 place-items-center rounded-full border-2 transition active:scale-90 ${
              color === c ? "border-monk-accent" : "border-monk-border/70"
            }`}
            style={{ backgroundColor: c }}
          >
            {color === c ? <Check size={12} className="text-white drop-shadow" /> : null}
          </button>
        ))}

        <div className="h-5 w-px bg-monk-border/60 mx-0.5" />

        <button
          type="button"
          onClick={undo}
          disabled={strokeCount === 0}
          title={t("draw.undo")}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-monk-border bg-monk-soft px-2.5 text-xs font-semibold text-monk-muted transition active:scale-95 enabled:hover:text-monk-text disabled:opacity-40"
        >
          <Undo2 size={13} />
          <span>{t("draw.undo")}</span>
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={!hasContent}
          title={t("draw.clear")}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-monk-border bg-monk-soft px-2.5 text-xs font-semibold text-monk-muted transition active:scale-95 enabled:hover:text-monk-danger disabled:opacity-40"
        >
          <Trash2 size={13} />
          <span>{t("draw.clear")}</span>
        </button>
      </div>

      <div
        ref={wrapRef}
        className="relative h-[42vh] min-h-[220px] w-full overflow-hidden rounded-xl border border-monk-border bg-white"
      >
        <canvas
          ref={canvasRef}
          width={DRAW_W}
          height={DRAW_H}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 touch-none select-none"
          style={{ width: box.width || undefined, height: box.height || undefined }}
        />
        {!hasContent ? (
          <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] text-monk-muted">
            {t("draw.emptyHint")}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {hideCancel ? null : (
          <GhostButton className="flex-1" onClick={onCancel}>
            {t("draw.cancel")}
          </GhostButton>
        )}
        <PrimaryButton className="flex-1" onClick={handleSave} disabled={!hasContent || saving}>
          {saving ? t("draw.saving") : t("draw.save")}
        </PrimaryButton>
      </div>
    </div>
  );
}

type Stroke = {
  tool: Tool;
  color: string;
  width: number;
  points: { x: number; y: number }[];
};

function paint(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const { points } = stroke;
  if (points.length === 0) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;

  // A marker reads as a highlighter: soft edge, translucent so overlaps darken.
  if (stroke.tool === "marker") {
    ctx.globalAlpha = 0.35;
    ctx.shadowBlur = stroke.width * 0.4;
    ctx.shadowColor = stroke.color;
  } else if (stroke.tool === "brush") {
    // Slight softening separates it from the hard pencil edge.
    ctx.shadowBlur = Math.max(1, stroke.width * 0.18);
    ctx.shadowColor = stroke.color;
  }

  if (points.length === 1) {
    // A tap is a dot, not a zero-length line (which paints nothing).
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, stroke.width / 2, 0, Math.PI * 2);
    ctx.fillStyle = stroke.color;
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i += 1) {
    // Quadratic midpoint smoothing: raw pointer samples are angular, and a
    // sketchpad that draws visible corners feels broken.
    const mid = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 };
    ctx.quadraticCurveTo(points[i].x, points[i].y, mid.x, mid.y);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
  ctx.restore();
}
