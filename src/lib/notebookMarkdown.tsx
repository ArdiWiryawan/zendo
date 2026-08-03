import type { ReactNode } from "react";
import { InlinePhoto, type PhotoOpenHandler } from "../components/NotebookImages";

/**
 * Markdown-lite for the notebook. Line-based, one regex per type, no markdown
 * library, no dangerouslySetInnerHTML (React nodes only). Plain text IS valid
 * markdown, so existing string bodies persist/search unchanged.
 */

const AUTOLIST = /^(\s*)([-*]|(?:\d+[.)])|(?:\[[ xX]\]))(\s+)(.*)$/;
const EMPTY_MARKER = /^(\s*)([-*]|(?:\d+[.)])|(?:\[[ xX]\]))\s*$/;

/** Marker to insert when Enter is pressed on a list line. Empty content ends the list. */
export function autolistMarker(line: string): string | null {
  const m = AUTOLIST.exec(line);
  if (!m) return null;
  if (!m[4]) return ""; // marker alone -> end list
  const indent = m[1];
  const tok = m[2];
  if (tok === "-" || tok === "*") return `${indent}${tok} `;
  if (tok[0] === "[") return `${indent}[ ] `;
  const delim = tok.includes(")") ? ")" : ".";
  return `${indent}${parseInt(tok, 10) + 1}${delim} `;
}

type ListKind = "ul" | "ol" | "task";

const HEADING = /^#{1,6}\s+(.*)$/;
const TASK = /^\[([ xX])\]\s+(.*)$/;
const BULLET = /^[-*]\s+(.*)$/;
const ORDERED = /^(\d+)[.)]\s+(.*)$/;
const IMG = /^{{img:([0-9A-Za-z_-]+)}}$/;

/** Render a notebook as a React node group. Consecutive same-kind lines group into one list. */
export function renderBodyMarkdown(
  body: string,
  onOpenPhoto?: PhotoOpenHandler,
  omitPhotos = false
): ReactNode[] {
  const out: ReactNode[] = [];
  let open: { type: ListKind; items: Array<{ text: string; checked?: boolean }> } | null = null;
  let num = 1;

  const close = () => {
    if (!open) return;
    const key = out.length;
    if (open.type === "ol") {
      out.push(
        <ol key={key} className="md-list">
          {open.items.map((i, k) => (
            <li key={k}>{i.text}</li>
          ))}
        </ol>
      );
    } else if (open.type === "task") {
      out.push(
        <ul key={key} className="md-list">
          {open.items.map((i, k) => (
            <li key={k}>
              <span className={`md-task-box${i.checked ? " checked" : ""}`} aria-hidden />
              {i.text}
            </li>
          ))}
        </ul>
      );
    } else {
      out.push(
        <ul key={key} className="md-list">
          {open.items.map((i, k) => (
            <li key={k}>{i.text}</li>
          ))}
        </ul>
      );
    }
    open = null;
  };

  for (const raw of body.split("\n")) {
    const t = raw.trim();
    const im = IMG.exec(t);
    const h = HEADING.exec(t);
    const tk = TASK.exec(t);
    const b = BULLET.exec(t);
    const o = ORDERED.exec(t);
    if (im) {
      close();
      // In list/preview mode (omitPhotos) the marker line collapses entirely so a
      // photo never acts as the note's thumbnail or cover.
      if (!omitPhotos) {
        out.push(
          <InlinePhoto
            key={`img-${im[1]}-${out.length}`}
            id={im[1]}
            onOpen={onOpenPhoto ?? (() => {})}
          />
        );
      }
      continue;
    }
    if (h) {
      close();
      out.push(
        <h3 key={out.length} className="md-heading font-handwriting">
          {h[1]}
        </h3>
      );
    } else if (tk) {
      if (open?.type !== "task") {
        close();
        open = { type: "task", items: [] };
      }
      open.items.push({ text: tk[2], checked: tk[1] !== " " });
    } else if (b) {
      if (open?.type !== "ul") {
        close();
        open = { type: "ul", items: [] };
      }
      open.items.push({ text: b[1] });
    } else if (o) {
      if (open?.type !== "ol") {
        close();
        open = { type: "ol", items: [] };
        num = parseInt(o[1], 10);
      }
      open.items.push({ text: `${num}. ${o[2]}` });
      num++;
    } else {
      close();
      if (t) {
        out.push(
          <p key={out.length} className="md-para">
            {raw}
          </p>
        );
      }
    }
  }
  close();
  return out;
}

/** True when a render node is an inline photo block from a {{img:…}} marker line. */
function isInlinePhotoNode(node: ReactNode): boolean {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    (node as { type: unknown }).type === InlinePhoto
  );
}

/**
 * Group runs of ≥2 consecutive inline photos into a compact in-page grid so a
 * note with many photos doesn't become a tall full-width stack.
 *   - 2–4 consecutive → .nb-photo-grid.g2 (2 columns)
 *   - 5+            → .nb-photo-grid.g3 (3 columns)
 * A single photo or any text line between photos breaks the run (stays unwrapped
 * = hero full-width). Pure transform of renderBodyMarkdown output; never mutates.
 */
export function groupPhotoRuns(nodes: ReactNode[]): ReactNode[] {
  const out: ReactNode[] = [];
  let run: ReactNode[] = [];
  const flush = () => {
    if (run.length === 0) return;
    if (run.length >= 2) {
      out.push(
        <div key={`pg-${out.length}`} className={`nb-photo-grid ${run.length >= 5 ? "g3" : "g2"}`}>
          {run}
        </div>
      );
    } else {
      out.push(run[0]);
    }
    run = [];
  };
  for (const node of nodes) {
    if (isInlinePhotoNode(node)) {
      run.push(node);
    } else {
      flush();
      out.push(node);
    }
  }
  flush();
  return out;
}
