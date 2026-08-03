import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useMonkStore } from "../store/useMonkStore";
import { PrimaryButton, SecondaryButton, GhostButton, CalmDialog } from "../components/ui";
import { createId } from "../lib/ids";
import { nowIso } from "../lib/date";
import type { NotebookEntry } from "../types/app";
import { Search, Plus, Pin, PinOff, Trash2, ArrowLeft, X, BookOpen, ImagePlus, Camera } from "lucide-react";
import { useT, useLanguage, type MessageKey } from "../i18n";
import { autolistMarker, renderBodyMarkdown } from "../lib/notebookMarkdown";
import { compressImage, putImage, deleteImage, matchImageMarkers } from "../lib/imageStore";
import { InlinePhoto, PhotoLightbox, photoIdsInBody } from "../components/NotebookImages";

const CATEGORY_HEX: Record<string, string> = {
  cat_pribadi: "#e07c6b",
  cat_karier: "#6b9ac4",
  cat_keuangan: "#6bb48b",
  cat_kesehatan: "#c48bb4",
  cat_hubungan: "#c4a06b",
  cat_spiritual: "#8b9dc4",
  cat_perjalanan: "#6bc4b4",
  cat_kreatif: "#c48b6b",
  cat_lainnya: "#a0a0a0"
};

// Zendo-palette fallback pool for user-created categories. Each id maps to a
// stable color via a small string hash, so the same category keeps its color
// across renders/sessions but new categories land on varied on-palette hues
// instead of the grey fallback.
const CUSTOM_CATEGORY_PALETTE = [
  "#e07c6b", "#6b9ac4", "#6bb48b", "#c48bb4",
  "#c4a06b", "#8b9dc4", "#6bc4b4", "#c48b6b"
];

function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function catHex(id: string) {
  if (CATEGORY_HEX[id]) return CATEGORY_HEX[id];
  return CUSTOM_CATEGORY_PALETTE[hashId(id) % CUSTOM_CATEGORY_PALETTE.length];
}

function wordCount(text: string) {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

// Auto-grow a single-line textarea (title/body) to its content. Page scrolls;
// no nested textarea scroll region.
function resizeTextarea(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}


type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

function formatRelative(iso: string, t: Translate, locale: string) {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("notebook.rel.justNow");
  if (mins < 60) return t("notebook.rel.m", { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("notebook.rel.h", { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("notebook.rel.d", { n: days });
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export default function JournalNotebook() {
  const store = useMonkStore();
  const t = useT();
  const lang = useLanguage();
  const dateLocale = lang === "id" ? "id-ID" : "en-US";
  const entries = store.notebookEntries;
  const categories = store.notebookCategories;
  const [view, setView] = useState<"list" | "edit">("list");
  const [editEntry, setEditEntry] = useState<NotebookEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [confirmKind, setConfirmKind] = useState<null | "delete-list">(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteTitle, setPendingDeleteTitle] = useState("");

  const sorted = useMemo(() => {
    let list = [...entries];
    if (filterCat) list = list.filter((e) => e.categoryId === filterCat);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) => e.title.toLowerCase().includes(q) || e.body.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return list;
  }, [entries, filterCat, searchQuery]);

  const openNew = () => {
    setEditEntry(null);
    setView("edit");
  };

  const openEdit = (entry: NotebookEntry) => {
    setEditEntry(entry);
    setView("edit");
  };

  if (view === "edit") {
    return (
      <NotebookEditor
        entry={editEntry}
        onBack={() => {
          setView("list");
          setEditEntry(null);
        }}
      />
    );
  }

  const pinnedCount = entries.filter((e) => e.isPinned).length;

  const todayLabel = new Date().toLocaleDateString(dateLocale, {
    year: "numeric",
    month: "long"
  });

  return (
    <div className="relative space-y-4 pb-24">
      <div className="nb-binder">
        <div className="nb-spine" aria-hidden />
        <div className="nb-cover">
          <div>
            <p className="nb-cover-title">{t("notebook.coverTitle")}</p>
            <p className="nb-cover-sub">{todayLabel}</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-monk-text-soft">
              {entries.length === 0
                ? t("notebook.noneYet")
                : pinnedCount
                  ? t("notebook.countPinned", { n: entries.length, p: pinnedCount })
                  : t("notebook.count", { n: entries.length })}
            </p>
            <button
              type="button"
              onClick={openNew}
              className="flex min-h-10 items-center gap-1.5 rounded-full bg-monk-accent px-3.5 text-xs font-bold text-monk-bg shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_12px_rgba(0,0,0,0.35)] transition active:scale-95"
            >
              <Plus size={14} strokeWidth={2} />
              {t("notebook.new")}
            </button>
          </div>
        </div>

        <div className="nb-sheets">

      <div className="relative mb-5">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-monk-text-soft"
          strokeWidth={1.5}
        />
        <input
          type="search"
          placeholder={t("notebook.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full min-h-11 rounded-monk border border-monk-border bg-monk-surface pl-9 pr-10 text-sm text-monk-text placeholder:text-monk-text-soft transition focus:border-monk-accent focus:shadow-[0_0_0_2px_rgba(164,139,94,0.2)] focus:outline-none"
        />
        {searchQuery ? (
          <button
            type="button"
            aria-label={t("notebook.clearSearch")}
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-monk-text-soft hover:text-monk-text"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setFilterCat(null)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition duration-200 active:scale-[0.97] ${
            !filterCat
              ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
              : "border-monk-border text-monk-muted hover:border-monk-border-strong"
          }`}
        >
          {t("notebook.all")}
        </button>
        {categories.map((cat) => {
          const hex = catHex(cat.id);
          const isActive = filterCat === cat.id;
          const count = entries.filter((e) => e.categoryId === cat.id).length;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCat(isActive ? null : cat.id)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition duration-200 active:scale-[0.97]"
              style={{
                borderColor: isActive ? hex : "var(--color-border)",
                color: isActive ? hex : "var(--color-text-muted)",
                backgroundColor: isActive ? `${hex}18` : "var(--color-surface)"
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: hex }} />
              {cat.name}
              {count > 0 ? (
                <span className="font-mono text-[10px] opacity-70">{count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {sorted.length === 0 ? (
        <div className="notebook-empty rounded-monk border border-monk-border bg-monk-surface/60 px-6 py-12 text-center flex flex-col items-center justify-center">
          <BookOpen size={40} className="mb-3 text-monk-text-soft opacity-30" strokeWidth={1.5} />
          <p className="font-handwriting text-3xl text-monk-text-soft/70">
            {searchQuery || filterCat ? t("notebook.empty.notFound") : t("notebook.empty.title")}
          </p>
          <p className="mx-auto mt-2 max-w-[240px] text-sm leading-6 text-monk-muted">
            {searchQuery || filterCat
              ? t("notebook.empty.notFoundDesc")
              : t("notebook.empty.desc")}
          </p>
          {!searchQuery && !filterCat ? (
            <PrimaryButton className="mt-6" onClick={openNew}>
              {t("notebook.firstNote")}
            </PrimaryButton>
          ) : (
            <SecondaryButton
              className="mt-6"
              onClick={() => {
                setSearchQuery("");
                setFilterCat(null);
              }}
            >
              {t("notebook.resetFilter")}
            </SecondaryButton>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((entry, index) => {
            const hex = catHex(entry.categoryId);
            const cat = categories.find((c) => c.id === entry.categoryId);
            return (
              <article
                key={entry.id}
                style={{ "--nb-i": index } as React.CSSProperties}
                className={`nb-sheet group relative overflow-hidden p-4 pb-2.5 ${
                  entry.isPinned ? "ring-1 ring-monk-accent/25" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => openEdit(entry)}
                  className="w-full text-left"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h3 className="notebook-card-title min-w-0 flex-1 pr-2">
                      {entry.title || t("notebook.untitled")}
                    </h3>
                    {entry.isPinned ? (
                      <Pin size={14} className="mt-1 shrink-0 text-monk-accent" strokeWidth={2} />
                    ) : null}
                  </div>
                  <div className="notebook-card-body min-h-[1.5rem]">
                    {entry.body.trim()
                      ? renderBodyMarkdown(entry.body, undefined, true)
                      : t("notebook.noBody")}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-monk-text-soft">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-semibold uppercase tracking-wide"
                      style={{ borderColor: `${hex}44`, color: hex }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: hex }} />
                      {cat?.name ?? t("notebook.other")}
                    </span>
                    <span className="font-mono">{formatRelative(entry.updatedAt, t, dateLocale)}</span>
                    <span className="font-mono opacity-70">{t("notebook.words", { n: wordCount(entry.body) })}</span>
                  </div>
                </button>

                <div className="mt-1 flex items-center justify-end gap-0.5 border-t border-monk-border/30 pt-1">
                  <button
                    type="button"
                    aria-label={entry.isPinned ? t("notebook.unpin") : t("notebook.pin")}
                    onClick={() => store.togglePinNotebookEntry(entry.id)}
                    className="grid min-h-10 min-w-10 place-items-center rounded-full text-monk-muted transition duration-150 active:scale-95 hover:bg-monk-soft hover:text-monk-accent"
                  >
                    {entry.isPinned ? <PinOff size={15} /> : <Pin size={15} />}
                  </button>
                  <button
                    type="button"
                    aria-label={t("notebook.deleteAria")}
                    onClick={() => {
                      setPendingDeleteId(entry.id);
                      setPendingDeleteTitle(entry.title || t("notebook.thisNote"));
                      setConfirmKind("delete-list");
                    }}
                    className="grid min-h-10 min-w-10 place-items-center rounded-full text-monk-muted transition duration-150 active:scale-95 hover:bg-monk-danger-soft hover:text-monk-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
        </div>{/* /nb-sheets */}
      </div>{/* /nb-binder */}

      <button
        type="button"
        onClick={openNew}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+88px)] right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-monk-accent text-monk-bg shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_26px_rgba(164,139,94,0.4)] transition duration-200 hover:scale-[1.05] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_14px_34px_rgba(164,139,94,0.5)] active:scale-90"
        aria-label={t("notebook.newNoteAria")}
      >
        <Plus size={24} strokeWidth={2} />
      </button>

      <CalmDialog
        open={confirmKind === "delete-list"}
        title={t("notebook.delete")}
        description={t("notebook.deleteConfirm", { title: pendingDeleteTitle })}
        confirmLabel={t("dialog.delete")}
        cancelLabel={t("dialog.cancel")}
        danger
        onCancel={() => {
          setConfirmKind(null);
          setPendingDeleteId(null);
        }}
        onConfirm={() => {
          if (pendingDeleteId) store.deleteNotebookEntry(pendingDeleteId);
          setConfirmKind(null);
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}

export function NotebookEditor({
  entry,
  onBack
}: {
  entry: NotebookEntry | null;
  onBack: () => void;
}) {
  const store = useMonkStore();
  const t = useT();
  const lang = useLanguage();
  const dateLocale = lang === "id" ? "id-ID" : "en-US";
  const categories = store.notebookCategories;
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(entry?.title ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  const [catId, setCatId] = useState(entry?.categoryId ?? categories[0]?.id ?? "cat_lainnya");
  const [isPinned, setIsPinned] = useState(entry?.isPinned ?? false);
  const [images, setImages] = useState<string[]>(entry?.images ?? []);
  const [photoError, setPhotoError] = useState("");
  const [lightbox, setLightbox] = useState<{ ids: string[]; index: number } | null>(null);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmKind, setConfirmKind] = useState<"leave" | "delete-editor" | null>(null);
  const entryIdRef = useRef(entry?.id ?? createId("nb_entry"));
  const createdAtRef = useRef(entry?.createdAt ?? nowIso());

  useEffect(() => {
    // Existing notes: do not steal focus/scroll. New note: focus title to write.
    if (!entry) titleRef.current?.focus();
    requestAnimationFrame(() => {
      if (titleRef.current) resizeTextarea(titleRef.current);
      if (bodyRef.current) resizeTextarea(bodyRef.current);
    });
  }, [entry]);

  const markDirty = () => setDirty(true);

  const resolveTitle = useCallback(() => {
    const trimmed = title.trim();
    if (trimmed) return trimmed;
    const firstLine = body
      .split("\n")
      .map((l) => l.trim())
      .find((l) => Boolean(l) && !l.startsWith("{{img:"));
    if (firstLine) return firstLine.slice(0, 80);
    return t("notebook.untitled");
  }, [title, body, t]);

  const resetInputs = () => {
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  // Click an inline photo in the live preview → open lightbox at its position.
  const openPhotoInBody = useCallback(
    (id: string) => {
      const ids = photoIdsInBody(body);
      const i = ids.indexOf(id);
      if (i >= 0) setLightbox({ ids, index: i });
    },
    [body]
  );

  const handleAddImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPhotoError("");
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const MAX_BYTES = 10 * 1024 * 1024;
    const MAX_COUNT = 20;

    const arr = Array.from(files);
    for (const f of arr) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        setPhotoError(t("notebook.photoInvalid"));
        resetInputs();
        return;
      }
      if (f.size > MAX_BYTES) {
        setPhotoError(t("notebook.photoInvalid"));
        resetInputs();
        return;
      }
    }
    if (images.length + arr.length > MAX_COUNT) {
      setPhotoError(t("notebook.photoInvalid"));
      resetInputs();
      return;
    }

    const next: string[] = [];
    try {
      for (const file of arr) {
        const blob = await compressImage(file);
        const id = createId("img");
        await putImage(id, blob);
        next.push(id);
      }
      if (next.length > 0) {
        // Insert each photo as a {{img:<id>}} marker line at the textarea cursor so
        // text flows above and below it (Word-like placement).
        const el = bodyRef.current;
        const pos = el?.selectionStart ?? body.length;
        const markers = next.map((id) => `{{img:${id}}}`).join("\n");
        const prefix = pos > 0 && body[pos - 1] !== "\n" ? "\n" : "";
        const nextBody = `${body.slice(0, pos)}${prefix}${markers}${pos === body.length ? "" : "\n"}${body.slice(pos)}`;
        setBody(nextBody);
        setImages((prev) => [...prev, ...next]);
        markDirty();
        requestAnimationFrame(() => {
          if (el) resizeTextarea(el);
        });
      }
    } catch (err) {
      setPhotoError(t("notebook.photoError"));
      for (const id of next) void deleteImage(id);
    }
    resetInputs();
  };

  const handleSave = useCallback(
    (andBack = true) => {
      const timestamp = nowIso();
      store.saveNotebookEntry({
        id: entryIdRef.current,
        title: resolveTitle(),
        body,
        categoryId: catId,
        tags: entry?.tags ?? [],
        isPinned,
        images,
        createdAt: createdAtRef.current,
        updatedAt: timestamp
      });
      // GC orphaned blobs: ids we tracked but whose {{img:…}} marker line no longer
      // exists in the saved body (marker deleted while editing).
      const referenced = matchImageMarkers(body);
      for (const imgId of images) {
        if (!referenced.has(imgId)) void deleteImage(imgId);
      }
      setDirty(false);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1200);
      if (andBack) onBack();
    },
    [body, catId, entry?.tags, isPinned, images, onBack, resolveTitle, store]
  );

  // Enter-autolist + Backspace-unlist: native-feel list continuation in the
  // textarea. Only setBody + markDirty; save flow untouched.
  const handleBodyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const { selectionStart: s, selectionEnd: en } = el;
    if (s !== en) return; // selection -> default
    const before = body.slice(0, s);
    const lineStart = before.lastIndexOf("\n") + 1;
    const line = body.slice(lineStart, s);

    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      const marker = autolistMarker(line);
      if (marker === null) return; // plain line -> default
      e.preventDefault();
      const next = `${body.slice(0, s)}\n${marker}${body.slice(en)}`;
      setBody(next);
      markDirty();
      requestAnimationFrame(() => {
        resizeTextarea(el);
        const c = s + 1 + marker.length;
        el.setSelectionRange(c, c);
      });
    } else if (e.key === "Backspace") {
      if (s !== lineStart + line.length) return; // not at line end
      if (!/^(\s*)([-*]|(?:\d+[.)])|(?:\[[ xX]\]))\s*$/.test(line)) return;
      e.preventDefault();
      setBody(body.slice(0, lineStart) + body.slice(s));
      markDirty();
      requestAnimationFrame(() => {
        resizeTextarea(el);
        el.setSelectionRange(lineStart, lineStart);
      });
    }
  };

  // Cmd/Ctrl+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSave]);

  const activeCatHex = catHex(catId);
  const words = wordCount(body);
  const canSave = title.trim().length > 0 || body.trim().length > 0;

  const handleBack = () => {
    if (dirty && canSave) {
      setConfirmKind("leave");
      return;
    }
    onBack();
  };

  return (
    <div className="space-y-0 pb-28">
      <div className="nb-editor-cover">
        <button
          type="button"
          onClick={handleBack}
          className="flex min-h-10 items-center gap-1.5 text-xs font-medium text-monk-muted transition hover:text-monk-accent"
        >
          <ArrowLeft size={15} strokeWidth={1.5} />
          {t("notebook.back")}
        </button>
        <div className="flex min-w-0 items-center gap-2 text-[10px] font-mono text-monk-text-soft">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug text-monk-accent">
            {entry ? entry.title || t("notebook.untitled") : t("notebook.newNote")}
          </span>
          <span className="shrink-0 opacity-40">·</span>
          <span role="status" aria-live="polite">
            {savedFlash ? (
              <span className="text-monk-success animate-scale-in">{t("notebook.saved")}</span>
            ) : dirty ? (
              <span className="flex items-center gap-1 text-monk-warning">
                <span className="h-1.5 w-1.5 rounded-full bg-monk-warning animate-pulse" />
                {t("notebook.unsaved")}
              </span>
            ) : null}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-6 pt-3 scrollbar-none">
        {categories.map((cat) => {
          const hex = catHex(cat.id);
          const active = catId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setCatId(cat.id);
                markDirty();
              }}
              className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition duration-200 active:scale-[0.97]"
              style={{
                borderColor: active ? hex : "var(--color-border-strong)",
                color: active ? hex : "var(--color-text-muted)",
                backgroundColor: active ? `${hex}18` : "var(--color-surface)"
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active ? hex : "var(--color-text-soft)" }} />
              {cat.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowNewCat((v) => !v)}
          aria-expanded={showNewCat}
          aria-controls="nb-new-cat"
          className="flex min-h-9 shrink-0 items-center rounded-full border border-dashed border-monk-border px-2.5 text-xs font-semibold text-monk-muted hover:border-monk-accent hover:text-monk-accent"
        >
          {t("notebook.addCategory")}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsPinned((v) => !v);
            markDirty();
          }}
          aria-pressed={isPinned}
          className={`ml-auto flex min-h-9 shrink-0 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold transition ${
            isPinned
              ? "border-monk-accent/40 bg-monk-accent-soft text-monk-accent"
              : "border-monk-border text-monk-muted"
          }`}
        >
          {isPinned ? <Pin size={12} /> : <PinOff size={12} />}
          {isPinned ? t("notebook.pinned") : t("notebook.pin")}
        </button>
      </div>

      {showNewCat ? (
        <div id="nb-new-cat" className="mb-4 flex items-center gap-2">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            aria-label={t("notebook.newCategoryPlaceholder")}
            placeholder={t("notebook.newCategoryPlaceholder")}
            className="min-h-11 flex-1 rounded-monk border border-monk-border bg-monk-surface px-3 text-sm text-monk-text placeholder:text-monk-text-soft focus:border-monk-accent focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newCatName.trim()) {
                store.addNotebookCategory(newCatName.trim());
                setNewCatName("");
                setShowNewCat(false);
              }
            }}
          />
          <PrimaryButton
            className="!w-auto px-4"
            onClick={() => {
              if (!newCatName.trim()) return;
              store.addNotebookCategory(newCatName.trim());
              setNewCatName("");
              setShowNewCat(false);
            }}
          >
            {t("notebook.new")}
          </PrimaryButton>
        </div>
      ) : null}

      {photoError ? (
        <div className="mb-4 rounded-monk border border-monk-danger/30 bg-monk-danger/5 px-3 py-2 text-sm text-monk-danger">
          {photoError}
        </div>
      ) : null}

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void handleAddImages(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={(e) => void handleAddImages(e.target.files)}
      />

      <div className="nb-open-page nb-open-enter" style={{ "--nb-cat": activeCatHex } as React.CSSProperties}>
        <textarea
          ref={titleRef}
          rows={1}
          aria-label={t("notebook.titlePlaceholder")}
          placeholder={t("notebook.titlePlaceholder")}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            markDirty();
            resizeTextarea(e.currentTarget);
          }}
          className="nb-page-title"
        />
        <textarea
          ref={bodyRef}
          aria-label={t("notebook.bodyPlaceholder")}
          placeholder={t("notebook.bodyPlaceholder")}
          value={body}
          onKeyDown={handleBodyKeyDown}
          onChange={(e) => {
            setBody(e.target.value);
            markDirty();
            resizeTextarea(e.currentTarget);
          }}
          className="nb-page-body"
        />
        <div className="nb-folio">
          <span>{t("notebook.words", { n: words })}</span>
          <span>·</span>
          <span>
            {new Date().toLocaleDateString(dateLocale, {
              day: "numeric",
              month: "short",
              year: "numeric"
            })}
          </span>
        </div>
        {/* Photo strip below the text: only the inline photos render here (clickable),
            never the body text — so writing is not duplicated. */}
        {photoIdsInBody(body).length > 0 ? (
          <div className="nb-preview">
            {photoIdsInBody(body).map((id) => (
              <InlinePhoto key={id} id={id} onOpen={openPhotoInBody} />
            ))}
          </div>
        ) : null}
        <div className="nb-photos">
        <div className="nb-photos-actions">
          <button type="button" className="nb-photo-btn" onClick={() => galleryInputRef.current?.click()}>
            <ImagePlus size={15} strokeWidth={1.8} />
            {t("notebook.addFromGallery")}
          </button>
          <button type="button" className="nb-photo-btn" onClick={() => cameraInputRef.current?.click()}>
            <Camera size={15} strokeWidth={1.8} />
            {t("notebook.takePhoto")}
          </button>
        </div>
      </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-monk-border bg-monk-bg/95 px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        <div className="mx-auto flex max-w-[430px] items-center justify-end gap-2">
            {entry ? (
              <GhostButton
                className="text-monk-danger"
                onClick={() => setConfirmKind("delete-editor")}
              >
                {t("notebook.delete")}
              </GhostButton>
            ) : null}
            <SecondaryButton className="!w-auto px-4" onClick={() => handleSave(false)} disabled={!canSave}>
              {t("notebook.save")}
            </SecondaryButton>
            <PrimaryButton className="!w-auto px-5" onClick={() => handleSave(true)} disabled={!canSave}>
              {t("notebook.done")}
            </PrimaryButton>
          </div>
      </div>

      <CalmDialog
        open={confirmKind === "leave"}
        title={t("notebook.save")}
        description={t("notebook.saveBeforeLeave")}
        confirmLabel={t("dialog.confirm")}
        cancelLabel={t("dialog.cancel")}
        onCancel={() => {
          setConfirmKind(null);
          onBack();
        }}
        onConfirm={() => {
          setConfirmKind(null);
          handleSave(true);
        }}
      />
      <CalmDialog
        open={confirmKind === "delete-editor"}
        title={t("notebook.delete")}
        description={t("notebook.deleteConfirm", {
          title: entry?.title || t("notebook.thisNote"),
        })}
        confirmLabel={t("dialog.delete")}
        cancelLabel={t("dialog.cancel")}
        danger
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => {
          if (entry) store.deleteNotebookEntry(entry.id);
          setConfirmKind(null);
          onBack();
        }}
      />
      {lightbox ? (
        <PhotoLightbox
          ids={lightbox.ids}
          index={lightbox.index}
          onNavigate={(i) => setLightbox((s) => (s ? { ...s, index: i } : s))}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </div>
  );
}

