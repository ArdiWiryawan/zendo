# Desain: Konteks Otomatis Note Baru + Perbaikan Lompatan Scroll Notebook

Tanggal: 2026-10-23
Status: disetujui (A1 + B1)
Area: `src/screens/JournalNotebook.tsx`, `src/styles/globals.css`

---

## 1. Latar belakang

Dua masalah pada notebook:

1. **Konteks hilang saat membuat note baru.** Saat user sedang berada di tab PARA
   "Projects" (atau "Areas"/"Resources") lalu menekan tombol tambah, note baru
   tidak mewarisi `paraType`. Filter PARA (`filterPara`) tidak pernah dioper ke
   editor.
2. **Layar melompat saat menulis panjang.** Setiap keystroke, textarea body
   di-collapse ke `height: auto` lalu diukur ulang. Dokumen ikut memendek
   sesaat, posisi scroll window ter-clamp ke bawah, dan setelah tinggi
   dikembalikan posisi scroll tidak dipulihkan. User harus scroll naik manual
   untuk melihat baris yang sedang ditulis.

---

## 2. Akar masalah (bukti kode)

### 2.1 Konteks PARA

- `JournalNotebook` menyimpan `filterPara` (baris ~428) dan `filterCat` (~427).
- Editor menerima `initialCategoryId={filterCat ?? undefined}` (baris 536),
  tetapi **tidak** menerima `paraType` awal apa pun.
- `paraType` di editor hanya berasal dari: draft autosave, entry tersimpan, atau
  `initialTemplate?.defaultPara` (baris 1462-1466). Tanpa template → `undefined`.
- `ZenTemplate.defaultCategory` sudah dideklarasikan (baris 34) tetapi tidak
  pernah dibaca di mana pun — dead field.
- Jalur lain yang selalu jatuh ke kategori pertama (Pribadi):
  - `src/screens/FocusSession.tsx:405` — `store.notebookCategories[0]?.id`.
  - fallback `initialCat` (baris 1547) — `categories[0]?.id ?? "cat_lainnya"`.

Catatan: pewarisan dari chip kategori (`initialCategoryId`) **sudah** ada dan
akan diverifikasi ulang lewat test, bukan diasumsikan rusak.

### 2.2 Lompatan scroll

- `.nb-page-body` (`globals.css:946-968`) memakai `overflow-y: hidden` +
  `min-height: 380px`; tingginya diatur JS.
- `resizeTextarea` (baris 383-386):

  ```ts
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
  ```

  Baris pertama menguncupkan elemen (dari ribuan px ke 380px). Dokumen memendek,
  `window.scrollY` ter-clamp, lalu tinggi dipulihkan tanpa memulihkan scroll.
  Efeknya: viewport tertinggal di bawah, caret di atas.
- Tidak ada satu pun `scrollIntoView` / `scrollBy` / penyimpanan `scrollY` di
  editor (grep bersih).
- Baris aktif juga bisa tertutup toolbar aksi fixed (`:2817`) dan fade bottom nav
  setinggi 186px (`src/components/ui.tsx:81`).
- Dead code: auto-page-break di `handleBodyKeyDown` (baris 2032) memakai
  `el.scrollHeight > el.clientHeight`, yang tidak pernah benar karena tinggi
  selalu disamakan dengan `scrollHeight`.

---

## 3. Desain

### 3.1 Bagian A — pewarisan konteks PARA

**Perubahan data flow:**

```
filterPara (list view)
      │  "archive" dikecualikan: arsip adalah keranjang, bukan tujuan pembuatan
      ▼
<NotebookEditor initialPara={...} />
      ▼
prioritas init paraType:
   draft.paraType > entry.paraType > template.defaultPara > initialPara > undefined
```

**Aturan detail:**

- `filterPara === "archive"` **tidak** diwariskan. Note baru tidak boleh langsung
  masuk arsip.
- Note yang sudah tersimpan selalu menang atas konteks layar (entry > initialPara).
  Membuka note lewat deep-link `?open=<id>` tidak boleh mengubah PARA-nya.
- Draft autosave tetap prioritas tertinggi (perilaku sekarang dipertahankan).
- `defaultCategory` pada `ZenTemplate` dihidupkan: template boleh menentukan
  kategori awal sendiri. Urutan kategori:
  `draft.categoryId > entry.categoryId > template.defaultCategory > initialCategoryId > categories[0]`.
  Tidak ada template bawaan yang memakai field ini saat ini — jadi perilaku
  bawaan tidak berubah, tetapi field tidak lagi mati.
- Pewarisan kategori dari chip (`initialCategoryId`) dipertahankan apa adanya.

**Bentuk implementasi (disarankan):**

- Tambah parameter `initialPara?: ParaType` pada `NotebookEditor`.
- Ekstrak dua resolver murni agar bisa diuji tanpa DOM:
  - `resolveInitialPara({ draft, draftWins, entry, template, initialPara })`
  - `resolveInitialCategoryId({ categories, draft, draftWins, entry, template, initialCategoryId })`
  Taruh di `src/lib/notebookContext.ts` (file baru) supaya `JournalNotebook.tsx`
  tidak makin gemuk.

**Non-tujuan (YAGNI):** tidak menambah `projectId` ke `NotebookEntry`, tidak
mengubah skema persist/sync, tidak menyimpan "konteks terakhir" global.

### 3.2 Bagian B — hilangkan lompatan scroll

**Penggantian `resizeTextarea` dengan mirror measurement.**

Prinsip: **textarea asli tidak pernah di-collapse**; tinggi diukur dari elemen
clone off-screen yang tidak memengaruhi layout dokumen.

- Clone dibuat lazily sekali per textarea (Map/WeakMap dari elemen → mirror),
  ditempel di `<body>` dengan `position: absolute; visibility: hidden;
  pointer-events: none; top: -9999px`, dan menyalin: `font`, `padding`,
  `box-sizing`, lebar efektif (`getBoundingClientRect().width`), `line-height`,
  `letter-spacing`, `white-space`.
- Isi clone = teks textarea. Tinggi terukur = `Math.max(minHeight, mirror.scrollHeight)`.
- `el.style.height` hanya ditulis bila selisihnya > 1px (menghindari reflow
  tanpa perubahan).
- Mirror juga memberi posisi baris caret: clone diberi penanda `<span>` pada
  offset `selectionStart`, `offsetTop` span = posisi caret relatif terhadap
  isi. Dipakai untuk langkah berikut.

**Keep-caret-visible (eksplisit, bukan mengandalkan browser):**

- Setelah resize, jika caret Y absolut (`rect.top + caretOffsetTop`) melewati
  `window.innerHeight - EDITOR_SAFE_BOTTOM`, geser window seperlunya:
  `window.scrollBy({ top: delta, behavior: "auto" })`.
- `EDITOR_SAFE_BOTTOM = 160` (px). Angka ini = tinggi toolbar aksi fixed
  (≈72px, satu baris tombol) + `env(safe-area-inset-bottom)` + satu baris teks
  (24px) + margin. Konstanta diberi nama dan dikomentari di sumber agar tidak
  jadi angka ajaib.
- Geseran hanya dilakukan bila caret keluar zona aman — tidak pernah memaksa
  scroll saat user sengaja melihat bagian lain.

**Perbaikan ikutan:**

- `queueResize` tetap memakai `requestAnimationFrame` (kontrak post-commit).
- Auto-page-break di `handleBodyKeyDown` diperbaiki, bukan dihapus: ganti
  kondisi `el.scrollHeight > el.clientHeight` dengan perbandingan tinggi hasil
  pengukuran mirror terhadap `PAGE_BREAK_THRESHOLD = 1400` (px, ≈ 55 baris
  aturan kertas). Saat ambang terlampaui dan caret berada di halaman terakhir,
  Enter menambah halaman baru alih-alih menumpuk baris di satu halaman panjang.

---

## 4. Edge case

| Kasus | Perilaku |
|---|---|
| Tab "Arsip" + tombol tambah | `paraType` kosong, bukan `archive` |
| Deep-link `?open=<id>` ke note lama | PARA & kategori note menang; konteks tab diabaikan |
| Draft autosave ada dan lebih baru | Draft menang atas semua konteks |
| User menghapus banyak teks | Mirror mengukur ulang → tinggi menyusut; scroll dijaga tidak melompat (caret masih di dalam zona aman) |
| Font web belum termuat saat mount | Mirror diukur ulang pada `document.fonts.ready` |
| Rotasi layar / resize viewport | Resize semua textarea (listener `resize` sekali, di-debounce) |
| IME / komposisi (Android, macOS) | Mirror memakai nilai `value` terkini setelah commit, bukan `e.nativeEvent.isComposing` |
| Teks tanpa spasi panjang (URL) | `overflow-wrap: anywhere` sudah ada; mirror mewarisi `white-space: pre-wrap` |
| Clone mirror bocor | Mirror dihapus saat textarea unmount (`ref` callback + cleanup) |

---

## 5. Testing

**Unit (node, vitest — tanpa DOM):**

- `resolveInitialPara`: entry > template > initialPara; `archive` tidak pernah
  jadi hasil; draft menang; semua kosong → `undefined`.
- `resolveInitialCategoryId`: kategori tak dikenal diabaikan (fallback ke
  `categories[0]`); `initialCategoryId` valid dipakai; entry/draft menang.

**Perilaku (browser manual / Playwright):**

1. Buka notebook → tab **Projects** → tombol tambah → note baru → chip PARA
   menampilkan "Projects"; simpan → editor menampilkan Projects.
2. Buka tab **Karier** → tombol tambah → chip kategori menampilkan "Karier".
3. Buka note yang sudah ada dari deep-link → PARA/kategori tidak berubah.
4. Tulis > 2000 karakter di satu halaman: viewport tidak melompat; baris yang
   sedang diketik selalu berada di atas toolbar bawah.
5. Hapus 80% teks: tinggi halaman menyusut, tidak ada lompatan.

**Regression gate:** `npm test`, `npx tsc --noEmit`, `npm run build`.

---

## 6. Dampak & risiko

- Tidak ada perubahan tipe data persisten (`NotebookEntry`, `NotebookDraft`
  tetap). Tanpa migrasi, tanpa risiko merge sync.
- `JournalNotebook.tsx` sudah 3024 baris; resolver dipindah ke file baru agar
  tidak bertambah panjang. Tidak ada refactor lain di luar lingkup.
- Mirror element menambah satu node per textarea aktif (maksimal = jumlah
  halaman note yang dibuka), dibersihkan saat unmount.
- Risiko utama: pengukuran mirror meleset bila style tidak tersalin lengkap
  (mis. `padding` responsif di breakpoint). Mitigasi: salin computed style
  kunci per pengukuran, plus resize listener.

---

## 7. Di luar lingkup

- `FocusSession.tsx:405` (insight sesi fokus selalu Pribadi) — kandidat
  perbaikan terpisah.
- Menautkan note ke entity `Project` (butuh `projectId` di skema).
- Perubahan bottom nav / fade.
