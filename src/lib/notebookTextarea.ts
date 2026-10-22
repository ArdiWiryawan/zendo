/**
 * Tinggi viewport yang tidak boleh ditempati caret: toolbar aksi editor yang
 * fixed di bawah (≈72px) + safe-area + satu baris teks + margin.
 */
export const EDITOR_SAFE_BOTTOM = 160;

/** Tinggi baru yang perlu ditulis, atau null bila tidak ada perubahan berarti. */
export function nextTextareaHeight(measured: number, current: number): number | null {
  if (!Number.isFinite(measured) || measured <= 0) return null;
  return Math.abs(measured - current) > 1 ? measured : null;
}

/** Berapa piksel window harus digeser agar caret keluar dari zona toolbar. */
export function caretScrollDelta(input: {
  caretBottom: number;
  viewportHeight: number;
  safeBottom: number;
}): number {
  const limit = input.viewportHeight - input.safeBottom;
  const overflow = input.caretBottom - limit;
  return overflow > 0 ? Math.ceil(overflow) : 0;
}

/** Baca tinggi inline yang pernah ditulis ke `el.style.height`. */
export function parseTextareaHeight(styleHeight: string): number {
  const parsed = Number.parseFloat(styleHeight);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

// ── Bagian DOM: mirror measurement ──
//
// Textarea asli TIDAK PERNAH di-collapse (`height: auto`) saat mengukur.
// Collapse membuat dokumen memendek sesaat, posisi scroll window ter-clamp,
// lalu tinggi dipulihkan tanpa memulihkan scroll — itulah lompatan yang
// dilaporkan user ("layar langsung geser ke bawah"). Pengukuran karena itu
// dilakukan pada clone off-screen yang tidak memengaruhi layout dokumen.

type Mirror = { box: HTMLDivElement; marker: HTMLSpanElement };

const mirrors = new WeakMap<HTMLTextAreaElement, Mirror>();

function ensureMirror(el: HTMLTextAreaElement): Mirror {
  const existing = mirrors.get(el);
  if (existing) return existing;

  const box = document.createElement("div");
  box.setAttribute("aria-hidden", "true");
  box.style.position = "absolute";
  box.style.top = "-99999px";
  box.style.left = "0";
  box.style.visibility = "hidden";
  box.style.pointerEvents = "none";
  box.style.overflow = "hidden";
  box.style.zIndex = "-1";
  box.style.margin = "0";

  const computed = window.getComputedStyle(el);
  const number = (value: string) => Number.parseFloat(value || "0") || 0;
  const padLeft = number(computed.paddingLeft);
  const padRight = number(computed.paddingRight);

  // Kotak konten: lebar sama dengan area tulis textarea, sehingga wrapping
  // baris di mirror identik dengan wrapping di textarea.
  box.style.boxSizing = "content-box";
  box.style.border = "0";
  box.style.width = `${Math.max(0, el.clientWidth - padLeft - padRight)}px`;
  box.style.paddingTop = computed.paddingTop;
  box.style.paddingRight = computed.paddingRight;
  box.style.paddingBottom = computed.paddingBottom;
  box.style.paddingLeft = computed.paddingLeft;
  box.style.fontFamily = computed.fontFamily;
  box.style.fontSize = computed.fontSize;
  box.style.fontWeight = computed.fontWeight;
  box.style.fontStyle = computed.fontStyle;
  box.style.lineHeight = computed.lineHeight;
  box.style.letterSpacing = computed.letterSpacing;
  box.style.textTransform = computed.textTransform;
  box.style.textIndent = computed.textIndent;
  box.style.whiteSpace = "pre-wrap";
  box.style.wordBreak = "break-word";
  box.style.overflowWrap = "break-word";

  const marker = document.createElement("span");
  marker.textContent = "\u200b";
  marker.style.display = "inline";

  document.body.appendChild(box);
  const mirror = { box, marker };
  mirrors.set(el, mirror);
  return mirror;
}

function paintMirror(mirror: Mirror, value: string, caret: number) {
  const at = Math.max(0, Math.min(caret, value.length));
  mirror.box.textContent = value.slice(0, at);
  mirror.box.appendChild(mirror.marker);
  mirror.box.appendChild(document.createTextNode(value.slice(at)));
}

/** Ukur tinggi konten + posisi caret relatif terhadap tepi atas kotak isi. */
export function measureTextarea(
  el: HTMLTextAreaElement,
  value: string,
  caret: number
): { height: number; caretTop: number } {
  const mirror = ensureMirror(el);
  paintMirror(mirror, value, caret);

  const minHeight = Number.parseFloat(window.getComputedStyle(el).minHeight || "0") || 0;
  const boxRect = mirror.box.getBoundingClientRect();
  const markerRect = mirror.marker.getBoundingClientRect();

  return {
    height: Math.max(minHeight, mirror.box.scrollHeight),
    caretTop: markerRect.top - boxRect.top
  };
}

/** Ukur ulang lalu tulis tinggi bila berubah. Mengembalikan tinggi terukur. */
export function resizeTextarea(el: HTMLTextAreaElement): number {
  const caret = el.selectionStart ?? el.value.length;
  const { height } = measureTextarea(el, el.value, caret);
  const current = parseTextareaHeight(el.style.height) || el.getBoundingClientRect().height;
  const next = nextTextareaHeight(height, current);
  if (next !== null) el.style.height = `${next}px`;
  return height;
}

/**
 * Satu pengukuran per keystroke: tulis tinggi lalu jaga caret tetap di atas
 * toolbar. Dipisah dari `resizeTextarea` + `keepCaretVisible` supaya mirror
 * tidak dipaint dua kali untuk input yang sama.
 */
export function syncTextarea(el: HTMLTextAreaElement): number {
  const caret = el.selectionStart ?? el.value.length;
  const { height, caretTop } = measureTextarea(el, el.value, caret);
  const current = parseTextareaHeight(el.style.height) || el.getBoundingClientRect().height;
  const next = nextTextareaHeight(height, current);
  if (next !== null) el.style.height = `${next}px`;
  scrollCaretIntoView(el, caretTop);
  return height;
}

/**
 * Jaga caret di atas toolbar bawah. Hanya menggeser bila caret benar-benar
 * melewati zona aman, supaya membaca bagian lain tidak terseret paksa.
 */
function scrollCaretIntoView(el: HTMLTextAreaElement, caretTop: number): void {
  if (typeof window === "undefined") return;
  if (document.activeElement !== el) return;

  const rect = el.getBoundingClientRect();
  const computed = window.getComputedStyle(el);
  const borderTop = Number.parseFloat(computed.borderTopWidth || "0") || 0;
  const lineHeight = Number.parseFloat(computed.lineHeight || "24") || 24;
  const caretBottom = rect.top + borderTop + caretTop + lineHeight;

  const delta = caretScrollDelta({
    caretBottom,
    viewportHeight: window.innerHeight,
    safeBottom: EDITOR_SAFE_BOTTOM
  });
  if (delta > 0) window.scrollBy({ top: delta, behavior: "auto" });
}

/** Versi publik: ukur posisi caret dulu, lalu geser window bila perlu. */
export function keepCaretVisible(el: HTMLTextAreaElement): void {
  if (typeof window === "undefined") return;
  if (document.activeElement !== el) return;
  const caret = el.selectionStart ?? el.value.length;
  const { caretTop } = measureTextarea(el, el.value, caret);
  scrollCaretIntoView(el, caretTop);
}

/** Lepas node mirror saat textarea unmount, agar tidak menumpuk di <body>. */
export function releaseTextareaMirror(el: HTMLTextAreaElement): void {
  const mirror = mirrors.get(el);
  if (!mirror) return;
  mirror.box.remove();
  mirrors.delete(el);
}
