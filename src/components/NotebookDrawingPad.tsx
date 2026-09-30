import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Brush, Check, Eraser, Grid3x3, Pencil, Trash2, Undo2 } from "lucide-react";
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
  /**
   * Prime the paper with an N-column, N-row guide grid. The prompt for the
   * grid says "draw 25 circles (5x5)" — without the grid on the page that is
   * guesswork. Off by default; only what the question asks for.
   */
  grid?: number;
  /**
   * Fired when the pad is emptied. The stored sketch is gone at this point, so
   * a host that keeps a pointer to it has to let go — otherwise the next save
   * writes the dead pointer back and the drawing returns.
   */
  onCleared?: () => void;
  /**
   * Give the pad the height of the screen instead of a slice of it. Set when
   * the pad *is* the surface (a draw-only answer) rather than one control among
   * several, where the paper would otherwise be letterboxed down to a stamp.
   */
  expand?: boolean;
};

/**
 * Sketchpad for a notebook page.
 *
 * Owns its own bitmap: strokes are replayed so undo and eraser stay exact, and
 * the same replay routine renders the export. Paper stays opaque white so the
 * PNG the notebook stores looks identical on both themes.
 */
export default function NotebookDrawingPad({
  initialDataUrl,
  onSave,
  onCancel,
  hideCancel,
  grid,
  onCleared,
  expand
}: Props) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const backgroundRef = useRef<HTMLImageElement | null>(null);
  // Whether the guide grid is showing. Seeded from the prop so a question that
  // asks for one opens with it already down.
  const [gridOn, setGridOn] = useState(grid !== undefined && grid > 0);
  const gridRef = useRef(gridOn);
  // Committed layer: background plus every finished stroke, painted once.
  // Without it every pointermove replays the whole stroke list, which is what
  // makes a long sketch lag behind the finger.
  const layerRef = useRef<HTMLCanvasElement | null>(null);
  // True while a seeded background is being dropped, so the seed effect does
  // not immediately draw it back.
  const awaitingLayerRef = useRef(false);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(INK_COLORS[0]);
  const [size, setSize] = useState<number>(BRUSH_SIZES[1]);
  const [strokeCount, setStrokeCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [box, setBox] = useState({ width: 0, height: 0 });

  /** The offscreen layer, created on first use. */
  const getLayer = useCallback((): CanvasRenderingContext2D | null => {
    if (!layerRef.current) {
      const el = document.createElement("canvas");
      el.width = DRAW_W;
      el.height = DRAW_H;
      layerRef.current = el;
    }
    return layerRef.current.getContext("2d");
  }, []);

  /**
   * Repaint the committed layer from scratch: paper, then the seeded sketch,
   * then every finished stroke. Only called when those change — never per
   * pointermove.
   */
  const rebuildLayer = useCallback(() => {
    const ctx = getLayer();
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, DRAW_W, DRAW_H);
    const bg = backgroundRef.current;
    if (bg) ctx.drawImage(bg, 0, 0, DRAW_W, DRAW_H);
    if (gridRef.current && grid && grid > 1) drawGrid(ctx, grid);
    for (const stroke of strokesRef.current) paint(ctx, stroke);
  }, [getLayer, grid]);

  /**
   * Show the committed layer, then the live stroke on top. The in-progress
   * stroke is the only thing repainted while the finger moves.
   */
  const redraw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const layer = layerRef.current;
    if (layer) ctx.drawImage(layer, 0, 0);
    else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, DRAW_W, DRAW_H);
    }
    const active = activeStrokeRef.current;
    if (active) paint(ctx, active);
  }, []);

  /** Add one finished stroke to the committed layer, without a full rebuild. */
  const commitStroke = useCallback(
    (stroke: Stroke) => {
      const ctx = getLayer();
      if (!ctx) return;
      paint(ctx, stroke);
    },
    [getLayer]
  );

  /** Drop the in-progress stroke and release the pointer. */
  const resetPointer = useCallback(() => {
    pointerIdRef.current = null;
    activeStrokeRef.current = null;
  }, []);

  // Size the on-screen canvas to the available box. The backing store never
  // changes, so a resize only re-lays-out — no pixels are lost.
  //
  // Runs in a layout effect, before the browser paints: the canvas starts at its
  // intrinsic 1200x1600 CSS size and is clipped by the wrapper until this
  // measures. A touch that arrives in that window maps through the wrong rect
  // and drops ink off the visible paper — which is why drawing used to work or
  // not depending on how fast the first stroke landed.
  useLayoutEffect(() => {
    const measure = () => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setBox((prev) => {
        const next = fitDrawingBox(rect.width, rect.height);
        return next.width === prev.width && next.height === prev.height ? prev : next;
      });
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
    // Clearing dropped the old drawing mid-flight; this run is stale.
    if (awaitingLayerRef.current) {
      awaitingLayerRef.current = false;
      return;
    }
    if (!initialDataUrl) {
      // No seeded sketch (a fresh page, or one whose drawing was deleted):
      // blank paper. Committed strokes, if any, survive the rebuild.
      if (backgroundRef.current) backgroundRef.current = null;
      rebuildLayer();
      redraw();
      return;
    }
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      backgroundRef.current = img;
      rebuildLayer();
      redraw();
    };
    img.onerror = () => {
      if (cancelled) return;
      backgroundRef.current = null;
      rebuildLayer();
      redraw();
    };
    img.src = initialDataUrl;
    return () => {
      cancelled = true;
    };
  }, [initialDataUrl, rebuildLayer, redraw]);

  // Re-seed when the seeded sketch changes; the grid is handled by `toggleGrid`,
  // which owns both the ref and the repaint.
  useEffect(() => {
    gridRef.current = gridOn;
  }, [gridOn]);

  // Toggling the grid repaints the committed layer: the grid belongs *under*
  // the sketch, and toggling off has to erase it from paper that already has
  // strokes burned in — which only a rebuild can do.
  const toggleGrid = () => {
    const next = !gridOn;
    gridRef.current = next;
    setGridOn(next);
    if (!awaitingLayerRef.current) {
      rebuildLayer();
      redraw();
    }
    hapticPress("light");
  };

  const pointFrom = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return toCanvasPoint(event.clientX, event.clientY, rect);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    // A second finger must not hijack a stroke already in progress — but a
    // pointer that was never released (palm contact, the finger sliding off, an
    // OS gesture stealing the pointer) must not lock the pad either. There is
    // no way to tell those apart from here, so a new contact always wins; the
    // interrupted stroke still landed in the layer via pointercancel.
    if (activeStrokeRef.current) endStroke();
    // Outside the browser's real gesture stream (synthetic events, some
    // emulated-input paths) there is no pointer to capture, and the throw would
    // abort the handler before the stroke starts.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* capture is a nicety; the stroke still works without it */
    }
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
    if (!active) {
      // Nothing in progress: a move without a down is a stray sample (the
      // browser can deliver these after a cancelled touch). Ignore it.
      return;
    }
    if (pointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    const point = pointFrom(event);
    if (!shouldAppendPoint(active.points[active.points.length - 1], point)) return;
    active.points.push(point);
    redraw();
  };

  /**
   * Finish the in-progress stroke and commit it into the layer.
   *
   * Deliberately does not check which pointer ended it. Only one stroke can be
   * active (a new contact commits the previous one first), so any up or cancel
   * belongs to the stroke that is running. Gating this on a pointer id is what
   * used to strand the pad: a missed up left an id behind that no later event
   * matched, and every subsequent touch was ignored.
   */
  const endStroke = () => {
    const active = activeStrokeRef.current;
    resetPointer();
    if (!active) return;
    strokesRef.current.push(active);
    commitStroke(active);
    setStrokeCount(strokesRef.current.length);
    redraw();
    hapticPress("light");
  };

  const undo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    setStrokeCount(strokesRef.current.length);
    rebuildLayer();
    redraw();
    hapticPress("light");
  };

  const clearAll = () => {
    strokesRef.current = [];
    resetPointer();
    // The seeded sketch lives in `backgroundRef` until now, so emptying the
    // stroke list is not enough — without this the very next repaint draws the
    // previous drawing straight back, which is why Clear did nothing on a page
    // that had been reopened.
    awaitingLayerRef.current = true;
    backgroundRef.current = null;
    setStrokeCount(0);
    rebuildLayer();
    redraw();
    hapticPress("light");
    onCleared?.();
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

  // A grid on its own is paper to draw on, not a drawing — it must not arm the
  // Save button, or an untouched grid would save a blank sheet.
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
            {color === c ? <Check size={12} className="text-monk-bg drop-shadow" /> : null}
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

        {grid ? (
          <button
            type="button"
            onClick={toggleGrid}
            aria-pressed={gridOn}
            title={t("draw.grid")}
            className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition active:scale-95 ${
              gridOn
                ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
                : "border-monk-border bg-monk-soft text-monk-muted hover:text-monk-text"
            }`}
          >
            <Grid3x3 size={13} />
            <span>{grid}×{grid}</span>
          </button>
        ) : null}
      </div>

      <div
        ref={wrapRef}
        className={`relative w-full overflow-hidden rounded-xl border border-monk-border bg-white ${
          expand ? "h-[58vh] min-h-[320px]" : "h-[42vh] min-h-[220px]"
        }`}
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

/**
 * Faint guide cells across the whole sheet.
 *
 * Drawn into the committed layer so strokes cover it — the grid is scaffolding
 * to draw on, not something that sits on top of the sketch. Light enough to be
 * ignored, strong enough to aim at.
 */
function drawGrid(ctx: CanvasRenderingContext2D, cells: number) {
  const stepX = DRAW_W / cells;
  const stepY = DRAW_H / cells;
  ctx.save();
  ctx.strokeStyle = "#d8d2ca";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 1; i < cells; i += 1) {
    const x = Math.round(i * stepX) + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, DRAW_H);
    const y = Math.round(i * stepY) + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(DRAW_W, y);
  }
  ctx.stroke();
  // Outer frame, one shade darker so the usable area reads as a defined sheet.
  ctx.strokeStyle = "#c4bdb3";
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, DRAW_W - 3, DRAW_H - 3);
  ctx.restore();
}

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
