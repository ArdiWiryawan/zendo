# Notebook Context & Scroll Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Note baru mewarisi konteks PARA/kategori dari tab notebook yang sedang aktif, dan menulis teks panjang tidak lagi melompatkan viewport.

**Architecture:** Dua unit murni baru (`notebookContext.ts`, `notebookTextarea.ts`) menampung logika resolusi konteks dan matematika ukur-tinggi/scroll, supaya `JournalNotebook.tsx` cukup memanggilnya. Pengukuran tinggi textarea memakai elemen mirror off-screen sehingga textarea asli tidak pernah di-collapse.

**Tech Stack:** React 18, TypeScript 5.7, Vite 6, Zustand 5, Vitest 4 (environment `node` — tanpa jsdom).

## Global Constraints

> **Revisi saat eksekusi (2026-10-23):** auto-page-break DIHAPUS, bukan
> diperbaiki. Verifikasi browser menunjukkan auto-page-break sendiri
> menyumbang lompatan 517px dalam satu keystroke (halaman baru disisipkan di
> bawah caret). Karena tujuan fitur ini menghilangkan lompatan, halaman baru
> hanya dibuat lewat tombol "Tambah Halaman". `PAGE_BREAK_THRESHOLD` tidak
> dipakai. Task 2 Step 3 di bawah tetap historis; konstanta itu tidak
> diimplementasikan.

- Line ending file: LF. Path di tool: forward slash.
- Test runner: `npx vitest run <path>`. Tipe check: `npx tsc -b --noEmit`.
- Environment test `node`; **tidak ada jsdom**. Semua fungsi yang diuji harus bebas DOM.
- `EDITOR_SAFE_BOTTOM = 160`, `PAGE_BREAK_THRESHOLD = 1400` — nilai dari spec, jangan diubah.
- Tidak ada perubahan skema `NotebookEntry`/`NotebookDraft`, tidak ada migrasi.
- Jangan menyentuh 30 file modified + 4 untracked yang sudah ada di working tree (kerjaan lain).
- `filterPara === "archive"` tidak boleh diwariskan.

---

## File Structure

| File | Status | Tanggung jawab |
|---|---|---|
| `src/lib/notebookContext.ts` | baru | Resolusi murni PARA + kategori awal note |
| `src/lib/notebookContext.test.ts` | baru | Unit test resolver |
| `src/lib/notebookTextarea.ts` | baru | Matematika tinggi/caret + mirror measurement DOM |
| `src/lib/notebookTextarea.test.ts` | baru | Unit test fungsi murni |
| `src/screens/JournalNotebook.tsx` | modifikasi | Wiring: prop `initialPara`, resolver, resize baru, page-break |

---

### Task 1: Resolver konteks note baru

**Files:**
- Create: `src/lib/notebookContext.ts`
- Test: `src/lib/notebookContext.test.ts`

**Interfaces:**
- Produces:
  - `type NotebookContextSources`
  - `resolveInitialPara(sources: NotebookContextSources): ParaType | undefined`
  - `resolveInitialCategoryId(sources: NotebookContextSources): string`

- [ ] **Step 1: Tulis test yang gagal**

`src/lib/notebookContext.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveInitialCategoryId, resolveInitialPara } from "./notebookContext";

const categories = [{ id: "cat_pribadi" }, { id: "cat_karier" }, { id: "cat_baru" }];

const base = {
  categories,
  fallbackCategoryId: "cat_lainnya"
};

describe("resolveInitialPara", () => {
  it("memakai tab aktif saat tidak ada draft, entry, atau template", () => {
    expect(resolveInitialPara({ ...base, initialPara: "project" })).toBe("project");
  });

  it("template menang atas tab aktif", () => {
    expect(
      resolveInitialPara({ ...base, initialPara: "project", template: { defaultPara: "area" } })
    ).toBe("area");
  });

  it("entry tersimpan menang atas template dan tab", () => {
    expect(
      resolveInitialPara({
        ...base,
        initialPara: "project",
        template: { defaultPara: "area" },
        entry: { paraType: "resource" }
      })
    ).toBe("resource");
  });

  it("draft menang hanya ketika draftWins true", () => {
    const sources = {
      ...base,
      initialPara: "project" as const,
      draft: { paraType: "area" as const },
      draftWins: true
    };
    expect(resolveInitialPara(sources)).toBe("area");
    expect(resolveInitialPara({ ...sources, draftWins: false })).toBe("project");
  });

  it("mengembalikan undefined saat semua sumber kosong", () => {
    expect(resolveInitialPara(base)).toBeUndefined();
  });
});

describe("resolveInitialCategoryId", () => {
  it("memakai kategori dari tab aktif", () => {
    expect(resolveInitialCategoryId({ ...base, initialCategoryId: "cat_karier" })).toBe("cat_karier");
  });

  it("mengabaikan kategori yang tidak ada di daftar", () => {
    expect(resolveInitialCategoryId({ ...base, initialCategoryId: "cat_hilang" })).toBe("cat_pribadi");
  });

  it("template.defaultCategory dipakai bila valid", () => {
    expect(
      resolveInitialCategoryId({ ...base, initialCategoryId: "cat_karier", template: { defaultCategory: "cat_baru" } })
    ).toBe("cat_baru");
  });

  it("entry tersimpan menang atas tab", () => {
    expect(
      resolveInitialCategoryId({ ...base, initialCategoryId: "cat_karier", entry: { categoryId: "cat_pribadi" } })
    ).toBe("cat_pribadi");
  });

  it("draft menang hanya ketika draftWins true", () => {
    const sources = {
      ...base,
      initialCategoryId: "cat_karier",
      draft: { categoryId: "cat_baru" },
      draftWins: true
    };
    expect(resolveInitialCategoryId(sources)).toBe("cat_baru");
    expect(resolveInitialCategoryId({ ...sources, draftWins: false })).toBe("cat_karier");
  });

  it("jatuh ke kategori pertama, lalu fallback bila daftar kosong", () => {
    expect(resolveInitialCategoryId(base)).toBe("cat_pribadi");
    expect(resolveInitialCategoryId({ ...base, categories: [] })).toBe("cat_lainnya");
  });
});
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npx vitest run src/lib/notebookContext.test.ts`
Expected: FAIL — "Failed to resolve import ./notebookContext".

- [ ] **Step 3: Implementasi**

`src/lib/notebookContext.ts`:

```ts
import type { NotebookCategory, NotebookEntry, ParaType } from "../types/app";

/**
 * Sumber konteks untuk note yang SEDANG DIBUAT.
 *
 * Urutan prioritas sengaja tetap: draft autosave (teks yang belum tersimpan)
 * mengalahkan entry tersimpan, entry mengalahkan template, template mengalahkan
 * tab yang sedang dibuka. Note yang sudah ada tidak boleh berubah PARA/kategori
 * hanya karena user membukanya dari tab lain.
 */
export type NotebookContextSources = {
  /** Draft editor di localStorage. Hanya berlaku bila `draftWins`. */
  draft?: { paraType?: ParaType; categoryId?: string } | null;
  /** True bila draft lebih baru daripada entry tersimpan. */
  draftWins?: boolean;
  /** Note yang sedang diedit (null untuk note baru). */
  entry?: Pick<NotebookEntry, "paraType" | "categoryId"> | null;
  /** Template yang dipilih dari dialog "Mulai Menulis". */
  template?: { defaultPara?: ParaType; defaultCategory?: string } | null;
  /** Konteks layar: tab PARA yang sedang difilter. */
  initialPara?: ParaType;
  /** Konteks layar: chip kategori yang sedang difilter. */
  initialCategoryId?: string;
  /** Kategori yang benar-benar ada di store; id asing harus diabaikan. */
  categories: Pick<NotebookCategory, "id">[];
  /** Fallback terakhir bila daftar kategori kosong. */
  fallbackCategoryId: string;
};

export function resolveInitialPara(sources: NotebookContextSources): ParaType | undefined {
  if (sources.draftWins && sources.draft?.paraType) return sources.draft.paraType;
  if (sources.entry?.paraType) return sources.entry.paraType;
  if (sources.template?.defaultPara) return sources.template.defaultPara;
  return sources.initialPara;
}

export function resolveInitialCategoryId(sources: NotebookContextSources): string {
  const known = (id: string | undefined): id is string =>
    Boolean(id) && sources.categories.some((c) => c.id === id);

  if (sources.draftWins && known(sources.draft?.categoryId)) return sources.draft!.categoryId!;
  if (known(sources.entry?.categoryId)) return sources.entry!.categoryId!;
  if (known(sources.template?.defaultCategory)) return sources.template!.defaultCategory!;
  if (known(sources.initialCategoryId)) return sources.initialCategoryId!;
  return sources.categories[0]?.id ?? sources.fallbackCategoryId;
}
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `npx vitest run src/lib/notebookContext.test.ts`
Expected: PASS — 11 test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notebookContext.ts src/lib/notebookContext.test.ts
git commit -m "feat(notebook): pure resolver for initial PARA and category"
```

---

### Task 2: Matematika tinggi & scroll (bagian murni)

**Files:**
- Create: `src/lib/notebookTextarea.ts`
- Test: `src/lib/notebookTextarea.test.ts`

**Interfaces:**
- Produces (dipakai Task 4):
  - `EDITOR_SAFE_BOTTOM: 160`
  - `PAGE_BREAK_THRESHOLD: 1400`
  - `nextTextareaHeight(measured: number, current: number): number | null`
  - `caretScrollDelta(input: { caretBottom: number; viewportHeight: number; safeBottom: number }): number`
  - `parseTextareaHeight(styleHeight: string): number`

- [ ] **Step 1: Tulis test yang gagal**

`src/lib/notebookTextarea.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  EDITOR_SAFE_BOTTOM,
  PAGE_BREAK_THRESHOLD,
  caretScrollDelta,
  nextTextareaHeight,
  parseTextareaHeight
} from "./notebookTextarea";

describe("nextTextareaHeight", () => {
  it("mengembalikan tinggi baru saat selisih lebih dari 1px", () => {
    expect(nextTextareaHeight(420, 380)).toBe(420);
    expect(nextTextareaHeight(300, 380)).toBe(300);
  });

  it("tidak menulis apa pun saat selisih <= 1px", () => {
    expect(nextTextareaHeight(380.4, 380)).toBeNull();
    expect(nextTextareaHeight(380, 380)).toBeNull();
  });

  it("mengabaikan pengukuran tidak masuk akal", () => {
    expect(nextTextareaHeight(Number.NaN, 380)).toBeNull();
    expect(nextTextareaHeight(0, 380)).toBeNull();
    expect(nextTextareaHeight(-10, 380)).toBeNull();
  });
});

describe("caretScrollDelta", () => {
  it("tidak menggeser saat caret di dalam zona aman", () => {
    expect(
      caretScrollDelta({ caretBottom: 600, viewportHeight: 800, safeBottom: EDITOR_SAFE_BOTTOM })
    ).toBe(0);
  });

  it("menggeser sebesar kelebihan saat caret menembus toolbar bawah", () => {
    // 800 - 160 = 640 batas aman; caretBottom 700 -> geser 60.
    expect(
      caretScrollDelta({ caretBottom: 700, viewportHeight: 800, safeBottom: EDITOR_SAFE_BOTTOM })
    ).toBe(60);
  });

  it("membulatkan ke atas agar caret tidak tersisa setengah piksel di zona terlarang", () => {
    expect(
      caretScrollDelta({ caretBottom: 640.2, viewportHeight: 800, safeBottom: EDITOR_SAFE_BOTTOM })
    ).toBe(1);
  });
});

describe("parseTextareaHeight", () => {
  it("membaca tinggi px inline", () => {
    expect(parseTextareaHeight("1400px")).toBe(1400);
    expect(parseTextareaHeight("380.5px")).toBe(380.5);
  });

  it("mengembalikan 0 untuk nilai kosong atau tidak valid", () => {
    expect(parseTextareaHeight("")).toBe(0);
    expect(parseTextareaHeight("auto")).toBe(0);
  });
});

describe("konstanta", () => {
  it("sesuai spec", () => {
    expect(EDITOR_SAFE_BOTTOM).toBe(160);
    expect(PAGE_BREAK_THRESHOLD).toBe(1400);
  });
});
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npx vitest run src/lib/notebookTextarea.test.ts`
Expected: FAIL — modul belum ada.

- [ ] **Step 3: Implementasi bagian murni**

`src/lib/notebookTextarea.ts` (bagian DOM ditambahkan di Task 4):

```ts
/**
 * Tinggi viewport yang tidak boleh ditempati caret: toolbar aksi editor yang
 * fixed di bawah (≈72px) + safe-area + satu baris teks + margin.
 */
export const EDITOR_SAFE_BOTTOM = 160;

/**
 * Ambang tinggi satu halaman sebelum Enter memecah ke halaman baru. 1400px
 * ≈ 55 baris aturan kertas (25px/baris) — cukup panjang untuk satu ide, tapi
 * tidak sampai membuat satu halaman setinggi beberapa layar.
 */
export const PAGE_BREAK_THRESHOLD = 1400;

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
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `npx vitest run src/lib/notebookTextarea.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notebookTextarea.ts src/lib/notebookTextarea.test.ts
git commit -m "feat(notebook): pure height and caret-scroll math"
```

---

### Task 3: Wiring konteks ke editor

**Files:**
- Modify: `src/screens/JournalNotebook.tsx`

**Interfaces:**
- Consumes: `resolveInitialPara`, `resolveInitialCategoryId` dari `../lib/notebookContext`.
- Produces: prop `initialPara?: ParaType` pada `NotebookEditor`.

- [ ] **Step 1: Tambah import**

Di blok import `JournalNotebook.tsx` (dekat import `notebookPages`):

```ts
import { resolveInitialCategoryId, resolveInitialPara } from "../lib/notebookContext";
```

- [ ] **Step 2: Oper konteks tab dari list view**

Ganti pemanggilan editor di baris ~532-540 menjadi:

```tsx
  if (view === "edit") {
    return (
      <NotebookEditor
        entry={editEntry}
        initialCategoryId={filterCat ?? undefined}
        // Arsip adalah keranjang, bukan tujuan pembuatan: note baru tidak boleh
        // lahir langsung tersembunyi.
        initialPara={filterPara === "archive" ? undefined : filterPara ?? undefined}
        initialTemplate={selectedTemplate}
        onBack={goBackToList}
      />
    );
  }
```

- [ ] **Step 3: Perluas signature editor**

Ganti baris 1423-1433 menjadi:

```tsx
export function NotebookEditor({
  entry,
  initialCategoryId,
  initialPara,
  initialTemplate,
  onBack
}: {
  entry: NotebookEntry | null;
  initialCategoryId?: string;
  initialPara?: ParaType;
  initialTemplate?: ZenTemplate | null;
  onBack: () => void;
}) {
```

- [ ] **Step 4: Ganti init `paraType` dengan resolver**

Ganti blok baris 1462-1466 menjadi:

```tsx
  const [paraType, setParaType] = useState<ParaType | undefined>(() =>
    resolveInitialPara({
      draft: draft ? { paraType: draft.paraType } : null,
      draftWins,
      entry,
      template: initialTemplate,
      initialPara
    })
  );
```

- [ ] **Step 5: Ganti blok `initialCat`**

Ganti baris 1537-1548 menjadi:

```tsx
  const initialCat = useMemo(
    () =>
      resolveInitialCategoryId({
        draft: draft ? { categoryId: draft.categoryId } : null,
        draftWins,
        entry,
        template: initialTemplate,
        initialCategoryId,
        categories,
        fallbackCategoryId: "cat_lainnya"
      }),
    [categories, draft, draftWins, entry, initialTemplate, initialCategoryId]
  );
```

- [ ] **Step 6: Verifikasi tipe**

Run: `npx tsc -b --noEmit`
Expected: tidak ada error baru.

- [ ] **Step 7: Commit**

```bash
git add src/screens/JournalNotebook.tsx
git commit -m "feat(notebook): new notes inherit PARA and category from the active tab"
```

---

### Task 4: Mirror measurement + keep-caret-visible + page break

**Files:**
- Modify: `src/lib/notebookTextarea.ts` (tambah bagian DOM)
- Modify: `src/screens/JournalNotebook.tsx`

**Interfaces:**
- Consumes: `nextTextareaHeight`, `caretScrollDelta`, `parseTextareaHeight`, `PAGE_BREAK_THRESHOLD`.
- Produces:
  - `resizeTextarea(el: HTMLTextAreaElement): number` — ukur & tulis tinggi, kembalikan tinggi terukur.
  - `keepCaretVisible(el: HTMLTextAreaElement): void`
  - `releaseTextareaMirror(el: HTMLTextAreaElement): void`

- [ ] **Step 1: Tambah bagian DOM ke `src/lib/notebookTextarea.ts`**

```ts
// ── Bagian DOM: mirror measurement ──
//
// Textarea asli TIDAK PERNAH di-collapse (`height:auto`) saat mengukur: collapse
// membuat dokumen memendek sesaat, posisi scroll window ter-clamp, lalu tinggi
// dipulihkan tanpa memulihkan scroll — itulah lompatan yang dilaporkan user.
// Pengukuran dilakukan pada clone off-screen yang tidak memengaruhi layout.

type Mirror = { box: HTMLDivElement; marker: HTMLSpanElement };

const mirrors = new WeakMap<HTMLTextAreaElement, Mirror>();

const MIRRORED_STYLES = [
  "boxSizing",
  "width",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "letterSpacing",
  "lineHeight",
  "textTransform",
  "textIndent",
  "whiteSpace",
  "wordBreak",
  "overflowWrap"
] as const;

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

  const marker = document.createElement("span");
  marker.textContent = "\u200b";

  const computed = window.getComputedStyle(el);
  for (const prop of MIRRORED_STYLES) {
    box.style[prop as never] = computed[prop as never];
  }
  // Lebar dari kotak konten textarea; border sudah dipisah di atas.
  const rectWidth = el.getBoundingClientRect().width;
  const borders =
    Number.parseFloat(computed.borderLeftWidth || "0") +
    Number.parseFloat(computed.borderRightWidth || "0");
  box.style.width = `${Math.max(0, Math.round(rectWidth - borders))}px`;
  box.style.whiteSpace = "pre-wrap";
  box.style.wordBreak = "break-word";

  document.body.appendChild(box);
  const mirror = { box, marker };
  mirrors.set(el, mirror);
  return mirror;
}

function paintMirror(mirror: Mirror, value: string, caret: number) {
  mirror.box.textContent = value.slice(0, caret);
  mirror.box.appendChild(mirror.marker);
  mirror.box.appendChild(document.createTextNode(value.slice(caret)));
}

/** Ukur tinggi konten + posisi caret relatif terhadap kotak isi textarea. */
export function measureTextarea(
  el: HTMLTextAreaElement,
  value: string,
  caret: number
): { height: number; caretTop: number } {
  const mirror = ensureMirror(el);
  paintMirror(mirror, value, caret);
  const minHeight = Number.parseFloat(window.getComputedStyle(el).minHeight || "0") || 0;
  return {
    height: Math.max(minHeight, mirror.box.scrollHeight),
    caretTop: mirror.marker.offsetTop
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
 * Jaga caret di atas toolbar bawah. Hanya menggeser bila caret benar-benar
 * melewati zona aman, supaya membaca bagian lain tidak terseret paksa.
 */
export function keepCaretVisible(el: HTMLTextAreaElement): void {
  if (document.activeElement !== el) return;
  const caret = el.selectionStart ?? el.value.length;
  const { caretTop } = measureTextarea(el, el.value, caret);
  const rect = el.getBoundingClientRect();
  const borderTop = Number.parseFloat(window.getComputedStyle(el).borderTopWidth || "0") || 0;
  const caretBottom = rect.top + borderTop + caretTop + 24; // 24px = line-height body
  const delta = caretScrollDelta({
    caretBottom,
    viewportHeight: window.innerHeight,
    safeBottom: EDITOR_SAFE_BOTTOM
  });
  if (delta > 0) window.scrollBy({ top: delta, behavior: "auto" });
}

/** Bersihkan node mirror saat textarea unmount. */
export function releaseTextareaMirror(el: HTMLTextAreaElement): void {
  const mirror = mirrors.get(el);
  if (!mirror) return;
  mirror.box.remove();
  mirrors.delete(el);
}
```

- [ ] **Step 2: Hapus `resizeTextarea` lokal di layar**

Hapus fungsi `resizeTextarea` lama (baris 381-386) dan ganti import:

```ts
import {
  PAGE_BREAK_THRESHOLD,
  keepCaretVisible,
  parseTextareaHeight,
  releaseTextareaMirror,
  resizeTextarea
} from "../lib/notebookTextarea";
```

`queueResize` (baris ~391) menjadi:

```ts
function queueResize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  requestAnimationFrame(() => {
    resizeTextarea(el);
    keepCaretVisible(el);
  });
}
```

- [ ] **Step 3: Hapus auto-page-break**

Ganti baris 2029-2036 menjadi (auto-page-break dibuang; halaman baru hanya
lewat tombol "Tambah Halaman"):

```ts
      if (marker === null) return; // plain line -> default Enter
```

- [ ] **Step 4: Lepas mirror saat unmount**

Tambahkan sebelum `return (` di akhir `NotebookEditor` (dekat efek draft guard):

```tsx
  // Mirror pengukur adalah node di <body>; lepaskan agar tidak menumpuk setiap
  // kali editor dibuka-tutup.
  useEffect(() => {
    const refs = bodyRefs;
    return () => {
      for (const el of refs.current) if (el) releaseTextareaMirror(el);
    };
  }, []);
```

- [ ] **Step 5: Ukur ulang setelah font siap & saat viewport berubah**

Tambahkan setelah efek di Step 4:

```tsx
  useEffect(() => {
    const remeasure = () => {
      for (const el of bodyRefs.current) if (el) resizeTextarea(el);
    };
    void document.fonts?.ready.then(remeasure);
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(remeasure, 120);
    };
    window.addEventListener("resize", onResize);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [pages.length]);
```

- [ ] **Step 6: Verifikasi tipe + seluruh test**

Run: `npx tsc -b --noEmit && npx vitest run`
Expected: tsc bersih, semua test PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/notebookTextarea.ts src/screens/JournalNotebook.tsx
git commit -m "fix(notebook): stop viewport jumping while typing long pages"
```

---

### Task 5: Verifikasi perilaku di browser

**Files:** tidak ada perubahan kode (kecuali bug ditemukan).

- [ ] **Step 1: Jalankan dev server**

```bash
npm run dev
```

- [ ] **Step 2: Cek pewarisan konteks**

1. Buka `/notebook`, klik tab PARA **Projects**, klik tombol tambah, pilih halaman kosong.
2. Chip di editor harus menampilkan **Projects**. Simpan → kartu note menampilkan badge Projects.
3. Ulangi dari chip kategori **Karier** → chip kategori di editor = **Karier**.
4. Buka note lama lewat `/notebook?open=<id>` → PARA/kategorinya tidak berubah.

- [ ] **Step 3: Cek lompatan scroll**

1. Buat note baru, tempel > 2000 karakter ke satu halaman.
2. Saat menulis di bagian bawah: viewport tidak melompat ke bawah, baris aktif tetap di atas toolbar.
3. Hapus 80% teks: tinggi halaman menyusut, tidak ada lompatan.

- [ ] **Step 4: Build produksi**

```bash
npm run build
```
Expected: sukses tanpa warning baru.

---

## Self-Review

**Spec coverage:**
- `initialPara` dari `filterPara`, `archive` dikecualikan → Task 3 Step 2.
- Prioritas draft > entry > template > tab (PARA & kategori) → Task 1.
- `ZenTemplate.defaultCategory` hidup → Task 1 + Task 3 Step 5.
- Mirror measurement (tanpa `height:auto`) → Task 4 Step 1.
- Keep-caret-visible + `EDITOR_SAFE_BOTTOM` → Task 4 Step 1.
- Auto-page-break berbasis `PAGE_BREAK_THRESHOLD` → Task 4 Step 3.
- Font-ready & viewport resize re-measure → Task 4 Step 5.
- Mirror cleanup → Task 4 Step 4.
- Unit test resolver & math → Task 1, Task 2.
- Verifikasi browser → Task 5.

**Placeholder scan:** tidak ada TBD/TODO; semua langkah berisi kode atau perintah nyata.

**Type consistency:** `resolveInitialPara`/`resolveInitialCategoryId` didefinisikan Task 1 dan dipakai Task 3; `resizeTextarea`/`keepCaretVisible`/`parseTextareaHeight`/`PAGE_BREAK_THRESHOLD` didefinisikan Task 2 & 4 dan dipakai Task 4 Step 2-3. Nama prop `initialPara` konsisten di Task 3 Step 2-3.
