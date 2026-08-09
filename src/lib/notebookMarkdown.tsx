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

const HEADING = /^(#{1,6})\s+(.*)$/;
const TASK = /^\[([ xX])\]\s+(.*)$/;
const BULLET = /^[-*]\s+(.*)$/;
const ORDERED = /^(\d+)[.)]\s+(.*)$/;
const IMG = /^{{img:([0-9A-Za-z_-]+)}}$/;
const FENCE_OPEN = /^```(\S*)\s*$/;
const FENCE_CLOSE = /^```\s*$/;
const HR = /^\s*((?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/;
const BLOCKQUOTE = /^>\s?(.*)$/;
const TABLE_ROW = /^\s*\|?[^|\n]+\|/;
const TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

/** Inline markdown: **strong**, *em*, ~~del~~, `code`, [label](url). */
const INLINE =
  /(\*\*([^*]+?)\*\*)|(\*([^\s*](?:[^*]*[^\s*])?)\*)|(~~([^~]+?)~~)|(`([^`]+?)`)|(\[([^\]\n]+?)\]\(([^)\s]+)\))/g;

/** Only http/https/mailto survive; everything else (incl. javascript:) renders as text. */
function sanitizeHref(url: string): string | null {
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(url);
  if (!scheme) return null;
  const proto = scheme[1].toLowerCase();
  return proto === "http" || proto === "https" || proto === "mailto" ? url : null;
}

/** Scan one text run into inline React nodes. matchAll clones the /g regex, so lastIndex is never an issue. */
function inlineMd(text: string, key: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    const idx = m.index ?? 0;
    if (idx > last) nodes.push(text.slice(last, idx));
    const k = `${key}-${i++}`;
    if (m[2] !== undefined) {
      nodes.push(<strong key={k}>{inlineMd(m[2], k)}</strong>);
    } else if (m[4] !== undefined) {
      nodes.push(<em key={k}>{inlineMd(m[4], k)}</em>);
    } else if (m[6] !== undefined) {
      nodes.push(<del key={k}>{inlineMd(m[6], k)}</del>);
    } else if (m[8] !== undefined) {
      nodes.push(
        <code key={k} className="md-code-inline">
          {m[8]}
        </code>
      );
    } else if (m[10] !== undefined) {
      const href = sanitizeHref(m[11]);
      nodes.push(
        href ? (
          <a key={k} href={href} target="_blank" rel="noreferrer noopener">
            {inlineMd(m[10], k)}
          </a>
        ) : (
          <span key={k}>{inlineMd(m[10], k)}</span>
        )
      );
    }
    last = idx + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Split a pipe-table row into trimmed cells (no escaping, documented subset). */
function splitCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

const HEADING_TAGS = { 1: "h1", 2: "h2", 3: "h3", 4: "h4", 5: "h5", 6: "h6" } as const;

/** Render a notebook as a React node group. Consecutive same-kind lines group into one list. */
export function renderBodyMarkdown(
  body: string,
  onOpenPhoto?: PhotoOpenHandler,
  omitPhotos = false,
  onDeletePhoto?: (id: string) => void
): ReactNode[] {
  const out: ReactNode[] = [];
  if (!body) return out;

  let open: { type: ListKind; items: Array<{ text: string; checked?: boolean }> } | null = null;
  let bq: string[] | null = null;
  let num = 1;

  const closeBq = () => {
    if (!bq) return;
    const key = out.length;
    out.push(
      <blockquote key={key} className="md-quote">
        {bq.map((line, i) => (
          <p key={i} className="md-para">
            {inlineMd(line || " ", `bq-${i}`)}
          </p>
        ))}
      </blockquote>
    );
    bq = null;
  };

  const close = () => {
    closeBq();
    if (!open) return;
    const key = out.length;
    if (open.type === "ol") {
      out.push(
        <ol key={key} className="md-list">
          {open.items.map((i, k) => (
            <li key={k}>{inlineMd(i.text, `li-${k}`)}</li>
          ))}
        </ol>
      );
    } else if (open.type === "task") {
      out.push(
        <ul key={key} className="md-list">
          {open.items.map((i, k) => (
            <li key={k}>
              <span className={`md-task-box${i.checked ? " checked" : ""}`} aria-hidden />
              {inlineMd(i.text, `li-${k}`)}
            </li>
          ))}
        </ul>
      );
    } else {
      out.push(
        <ul key={key} className="md-list">
          {open.items.map((i, k) => (
            <li key={k}>{inlineMd(i.text, `li-${k}`)}</li>
          ))}
        </ul>
      );
    }
    open = null;
  };

  const lines = body.split("\n");
  for (let idx = 0; idx < lines.length; idx++) {
    const raw = lines[idx];
    const t = raw.trim();

    // Fence — raw lines, no trim/inline/photo/heading processing until close or EOF.
    const fo = FENCE_OPEN.exec(t);
    if (fo) {
      close();
      const code: string[] = [];
      idx++;
      while (idx < lines.length && !FENCE_CLOSE.exec(lines[idx].trim())) {
        code.push(lines[idx]);
        idx++;
      }
      out.push(
        <pre key={out.length} className="md-code">
          <code>{code.join("\n")}</code>
        </pre>
      );
      continue;
    }

    const im = IMG.exec(t);
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
            onDelete={onDeletePhoto}
          />
        );
      }
      continue;
    }

    // HR before BULLET so *** / * * * don't fall to list/paragraph.
    const hr = HR.exec(t);
    if (hr) {
      close();
      out.push(<hr key={out.length} className="md-hr" />);
      continue;
    }

    // Table lookahead: current line is a pipe row AND next line is a separator.
    const tr = TABLE_ROW.exec(t);
    if (tr && idx + 1 < lines.length && TABLE_SEP.exec(lines[idx + 1].trim())) {
      close();
      const headerCells = splitCells(t);
      const alignCells = splitCells(lines[idx + 1].trim());
      const rows: string[][] = [];
      idx += 2;
      while (idx < lines.length && lines[idx].trim() !== "") {
        rows.push(splitCells(lines[idx]));
        idx++;
      }
      const align = (i: number): React.CSSProperties["textAlign"] => {
        const c = alignCells[i] ?? "";
        if (c.startsWith(":") && c.endsWith(":")) return "center";
        if (c.endsWith(":")) return "right";
        return "left";
      };
      out.push(
        <table key={out.length} className="md-table">
          <thead>
            <tr>
              {headerCells.map((c, i) => (
                <th key={i} style={{ textAlign: align(i) }}>
                  {inlineMd(c, `th-${i}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, ci) => (
                  <td key={ci} style={{ textAlign: align(ci) }}>
                    {inlineMd(c, `td-${ri}-${ci}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
      continue;
    }

    // Blockquote — consecutive quote lines group into one blockquote.
    const bqLine = BLOCKQUOTE.exec(t);
    if (bqLine) {
      if (!bq) {
        close();
        bq = [];
      }
      bq.push(bqLine[1]);
      continue;
    }
    if (bq) closeBq();

    const h = HEADING.exec(t);
    if (h) {
      close();
      const Tag = HEADING_TAGS[Math.min(h[1].length, 6) as 1 | 2 | 3 | 4 | 5 | 6];
      out.push(
        <Tag key={out.length} className="md-heading font-handwriting">
          {inlineMd(h[2], `h-${out.length}`)}
        </Tag>
      );
      continue;
    }

    const tk = TASK.exec(t);
    const b = BULLET.exec(t);
    const o = ORDERED.exec(t);
    if (tk) {
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
      out.push(
        <p key={out.length} className="md-para">
          {inlineMd(raw || " ", `p-${out.length}`)}
        </p>
      );
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
