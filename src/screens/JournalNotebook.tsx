import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useBlocker } from "react-router-dom";
import { useMonkStore } from "../store/useMonkStore";
import { PrimaryButton, SecondaryButton, GhostButton, CalmDialog } from "../components/ui";
import { createId } from "../lib/ids";
import { nowIso } from "../lib/date";
import type { NotebookCategory, NotebookEntry } from "../types/app";
import { Search, Plus, Pin, PinOff, Trash2, ArrowLeft, X, BookOpen, ImagePlus, Camera, MoreVertical, Pencil } from "lucide-react";
import { useT, useLanguage, type MessageKey } from "../i18n";
import { autolistMarker, groupPhotoRuns, renderBodyMarkdown } from "../lib/notebookMarkdown";
import { joinPages, removePhotoMarker } from "../lib/notebookPages";
import { compressImage, putImage, deleteImage, matchImageMarkers } from "../lib/imageStore";
import { PhotoLightbox, photoIdsInBody } from "../components/NotebookImages";

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

// Same palette used to color category chips; the kebab menu for a category
// lives in a fixed-position panel, so it must sit above the binder sheet
// stacking contexts (nb-sheet has its own z-index).
const KEBAB_Z = 45;

// Unmount the kebab menu on outside pointerdown, Escape and scroll — while
// staying mounted while the menu is open so its own clicks don't close it.
function useKebabDismiss(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [open, onClose]);
  return ref;
}

// Kebab menu on a category chip: Rename + Delete. Positioned by its trigger
// button's offset within the component (fixed coordinates are computed in the
// parent). Reuses CalmDialog patterns for the confirm; rename edits inline.
function CategoryMenu({
  trigger,
  cat,
  count,
  open,
  canDelete,
  onClose,
  onRename,
  onDelete
}: {
  trigger: HTMLElement | null;
  cat: NotebookCategory;
  count: number;
  open: boolean;
  canDelete: boolean;
  onClose: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const t = useT();
  const ref = useKebabDismiss(open, onClose);
  if (!open) return null;
  const rect = trigger?.getBoundingClientRect();
  const left = rect ? Math.min(Math.max(rect.left, 12), window.innerWidth - 172) : 12;
  const top = rect ? rect.bottom + 6 : 60;
  return (
    <div
      ref={ref}
      role="menu"
      className="fixed min-w-[160px] rounded-monk-lg border border-monk-border bg-monk-surface p-1 shadow-calm"
      style={{ left, top, zIndex: KEBAB_Z }}
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => onRename(cat.name)}
        className="flex w-full min-h-10 items-center gap-2 rounded-monk px-3 text-sm text-monk-text transition hover:bg-monk-soft"
      >
        <Pencil size={14} strokeWidth={1.5} />
        {t("notebook.renameCategory")}
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={!canDelete}
        onClick={onDelete}
        className="flex w-full min-h-10 items-center gap-2 rounded-monk px-3 text-sm text-monk-danger transition hover:bg-monk-danger-soft disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Trash2 size={14} strokeWidth={1.5} />
        {t("notebook.deleteCategory", { n: count })}
      </button>
    </div>
  );
}

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

// Resize after the new text has been committed to the DOM (rAF post-commit).
// Doing it synchronously in onChange measures the OLD value, so a wrapped 2nd
// line (or the tail of the body) would clip — the original occlusion bug.
function queueResize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  requestAnimationFrame(() => resizeTextarea(el));
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

export default function JournalNotebook({ onEditingChange, initialEntryId }: { onEditingChange?: (editing: boolean) => void; initialEntryId?: string }) {
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
  const [confirmKind, setConfirmKind] = useState<null | "delete-list" | "delete-cat">(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteTitle, setPendingDeleteTitle] = useState("");
  const [catMenu, setCatMenu] = useState<{ id: string; anchor: HTMLElement | null } | null>(null);
  const [renameCat, setRenameCat] = useState<{ id: string; name: string } | null>(null);
  const [pendingDeleteCat, setPendingDeleteCat] = useState<{ id: string; name: string } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep-link from Library: ?open=<entryId> opens that note's editor directly.
  useEffect(() => {
    const openId = initialEntryId ?? searchParams.get("open");
    if (!openId || view !== "list") return;
    const target = entries.find((e) => e.id === openId);
    if (!target) return;
    openEdit(target);
    const next = new URLSearchParams(searchParams);
    next.delete("open");
    setSearchParams(next, { replace: true });
  }, [initialEntryId, searchParams, view, entries]);

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

  const goBackToList = useCallback(() => {
    setView("list");
    setEditEntry(null);
    onEditingChange?.(false);
  }, [onEditingChange]);

  // Intercept browser/OS back button while in edit view: push a history entry so
  // popstate fires on back; NotebookEditor's own popstate listener (which knows
  // the dirty state) routes it through the save/discard confirm dialog.
  useEffect(() => {
    if (view !== "edit") return;
    window.history.pushState({ nbEdit: true }, "");
  }, [view]);

  const openNew = () => {
    setEditEntry(null);
    setView("edit");
    onEditingChange?.(true);
  };

  const openEdit = (entry: NotebookEntry) => {
    setEditEntry(entry);
    setView("edit");
    onEditingChange?.(true);
  };

  if (view === "edit") {
    return (
      <NotebookEditor
        entry={editEntry}
        onBack={goBackToList}
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
            className="absolute right-2 top-1/2 grid min-h-10 min-w-10 -translate-y-1/2 place-items-center text-monk-text-soft hover:text-monk-text"
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
          const menuOpen = catMenu?.id === cat.id;
          return (
            <div key={cat.id} className="relative shrink-0">
              <div
                className="flex items-center rounded-full border py-1.5 pl-3 pr-1.5 text-xs font-semibold transition duration-200"
                style={{
                  borderColor: isActive ? hex : "var(--color-border)",
                  backgroundColor: isActive ? `${hex}18` : "var(--color-surface)"
                }}
              >
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setFilterCat(isActive ? null : cat.id)}
                  className="flex items-center gap-1.5 text-xs font-semibold active:scale-[0.97]"
                  style={{
                    color: isActive ? hex : "var(--color-text-muted)"
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: hex }} />
                  {cat.name}
                  {count > 0 ? (
                    <span className="font-mono text-[10px] opacity-70">{count}</span>
                  ) : null}
                </button>
                <button
                  type="button"
                  aria-label={t("notebook.categoryMenu", { name: cat.name })}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCatMenu((cur) => (cur?.id === cat.id ? null : { id: cat.id, anchor: e.currentTarget }));
                  }}
                  className={`grid h-5 w-5 place-items-center rounded-full transition ${menuOpen ? "bg-monk-soft text-monk-text" : "text-monk-text-soft hover:bg-monk-soft/60 hover:text-monk-text"}`}
                >
                  <MoreVertical size={12} strokeWidth={2} />
                </button>
              </div>
              <CategoryMenu
                trigger={catMenu?.anchor ?? null}
                cat={cat}
                count={count}
                open={menuOpen}
                canDelete={categories.length > 1}
                onClose={() => setCatMenu(null)}
                onRename={(name) => {
                  setCatMenu(null);
                  setRenameCat({ id: cat.id, name });
                }}
                onDelete={() => {
                  setCatMenu(null);
                  setPendingDeleteCat({ id: cat.id, name: cat.name });
                }}
              />
            </div>
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
                  <div className="notebook-card-body min-h-[1.5rem] line-clamp-2">
                    {entry.body.trim()
                      ? entry.body.replace(/\{\{img:[^}]+\}\}/g, "").trim().split("\n").find(l => l.trim()) ?? t("notebook.noBody")
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
      <CalmDialog
        open={Boolean(renameCat)}
        title={t("notebook.renameCategory")}
        cancelLabel={t("dialog.cancel")}
        confirmLabel={t("dialog.confirm")}
        confirmDisabled={!(renameCat?.name.trim())}
        onCancel={() => setRenameCat(null)}
        onConfirm={() => {
          if (renameCat?.name.trim()) store.renameNotebookCategory(renameCat.id, renameCat.name.trim());
          setRenameCat(null);
        }}
      >
        <input
          type="text"
          value={renameCat?.name ?? ""}
          onChange={(e) => setRenameCat((cur) => (cur ? { ...cur, name: e.target.value } : cur))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && renameCat?.name.trim()) {
              store.renameNotebookCategory(renameCat.id, renameCat.name.trim());
              setRenameCat(null);
            }
          }}
          aria-label={t("notebook.newCategoryPlaceholder")}
          placeholder={t("notebook.newCategoryPlaceholder")}
          className="min-h-11 w-full rounded-monk border border-monk-border bg-monk-surface px-3 text-sm text-monk-text placeholder:text-monk-text-soft focus:border-monk-accent focus:outline-none"
        />
      </CalmDialog>
      <CalmDialog
        open={Boolean(pendingDeleteCat)}
        title={t("notebook.deleteCategoryTitle")}
        description={t("notebook.deleteCategoryConfirm", {
          name: pendingDeleteCat?.name ?? "",
          n: pendingDeleteCat ? entries.filter((e) => e.categoryId === pendingDeleteCat.id).length : 0
        })}
        confirmLabel={t("dialog.delete")}
        cancelLabel={t("dialog.cancel")}
        danger
        onCancel={() => setPendingDeleteCat(null)}
        onConfirm={() => {
          if (pendingDeleteCat) store.deleteNotebookCategory(pendingDeleteCat.id);
          if (filterCat === pendingDeleteCat?.id) setFilterCat(null);
          setPendingDeleteCat(null);
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
  const entriesInCat = (catId: string) => store.notebookEntries.filter((e) => e.categoryId === catId).length;
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const bodyRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const sheetRef = useRef<HTMLDivElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(entry?.title ?? "");
  const [pages, setPages] = useState<string[]>(entry?.pages && entry.pages.length > 0 ? entry.pages : [entry?.body ?? ""]);
  // Index of the focused body textarea — photo-insert target and auto-page
  // anchor. Clamped whenever pages shrink (trailing-page collapse).
  const [activePage, setActivePage] = useState(0);
  const [catId, setCatId] = useState(entry?.categoryId ?? categories[0]?.id ?? "cat_lainnya");

  // Flat join of ALL pages: single surface for GC, lightbox ordering and the
  // saved `body` field — search/list/GC keep working unchanged.
  const allBody = joinPages(pages);

  const setPageText = (i: number, v: string) =>
    setPages((prev) => prev.map((p, idx) => (idx === i ? v : p)));
  const setBodyRef = (i: number) => (el: HTMLTextAreaElement | null) => {
    bodyRefs.current[i] = el;
  };
  const [isPinned, setIsPinned] = useState(entry?.isPinned ?? false);
  const [images, setImages] = useState<string[]>(entry?.images ?? []);
  const [photoError, setPhotoError] = useState("");
  const [lightbox, setLightbox] = useState<{ ids: string[]; index: number } | null>(null);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmKind, setConfirmKind] = useState<"leave" | "delete-editor" | "delete-cat-editor" | null>(null);
  const [catMenu, setCatMenu] = useState<{ id: string; anchor: HTMLElement | null } | null>(null);
  const [renameCat, setRenameCat] = useState<{ id: string; name: string } | null>(null);
  const [pendingDeleteCat, setPendingDeleteCat] = useState<{ id: string; name: string } | null>(null);
  const entryIdRef = useRef(entry?.id ?? createId("nb_entry"));
  const createdAtRef = useRef(entry?.createdAt ?? nowIso());

  useEffect(() => {
    // Existing notes: do not steal focus/scroll. New note: focus title to write.
    if (!entry) titleRef.current?.focus();
    requestAnimationFrame(() => {
      queueResize(titleRef.current);
      for (const el of bodyRefs.current) queueResize(el);
    });
  }, [entry, pages.length]);

  const markDirty = () => setDirty(true);

  const resolveTitle = useCallback(() => {
    const trimmed = title.trim();
    if (trimmed) return trimmed;
    const firstLine = allBody
      .split("\n")
      .map((l) => l.trim())
      .find((l) => Boolean(l) && !l.startsWith("{{img:"));
    if (firstLine) {
      // Strip leading markdown markers so a note starting with #, - or > doesn't
      // show raw syntax as its title.
      return firstLine.replace(/^(#{1,6}\s+|>\s?|[-*]\s+|\[\s*[xX]?\]\s+)/, "").slice(0, 80);
    }
    return t("notebook.untitled");
  }, [title, allBody, t]);

  const resetInputs = () => {
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  // Click an inline photo in the live preview → open lightbox at its position.
  const openPhotoInBody = useCallback(
    (id: string) => {
      const ids = photoIdsInBody(allBody);
      const i = ids.indexOf(id);
      if (i >= 0) setLightbox({ ids, index: i });
    },
    [allBody]
  );

  // Delete a photo: strip its marker line from every page, drop the id from the
  // images cache and free the blob immediately (save-GC double-delete is a
  // harmless no-op on a missing key).
  const handleDeletePhoto = useCallback(
    (id: string) => {
      setPages((prev) => prev.map((p) => removePhotoMarker(p, id)));
      setImages((prev) => prev.filter((i) => i !== id));
      void deleteImage(id);
      markDirty();
      setLightbox((lb) => {
        if (!lb) return lb;
        const remaining = lb.ids.filter((i) => i !== id);
        if (remaining.length === 0) return null;
        const idx = Math.min(lb.index, remaining.length - 1);
        return { ids: remaining, index: idx };
      });
    },
    []
  );

  // Append a fresh page and move focus into it (rAF so the textarea is mounted
  // and its height has settled before resize/focus).
  const appendPage = (prev: string[]) => {
    const next = [...prev, ""];
    setActivePage(next.length - 1);
    markDirty();
    requestAnimationFrame(() => {
      const el = bodyRefs.current[next.length - 1];
      queueResize(el);
      el?.focus();
    });
    return next;
  };

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

    // Capture the insertion target synchronously: the compress/put loop below is
    // async, and re-reading activePage/selectionStart afterwards would target a
    // page the user has switched to meanwhile (or clobber keystrokes typed
    // during the upload).
    const targetPage = activePage;
    const insertPos = bodyRefs.current[activePage]?.selectionStart;

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
        // text flows above and below it (Word-like placement). Recompute against
        // the LATEST text of the captured page so no edits made during the upload
        // are lost.
        const markers = next.map((id) => `{{img:${id}}}`).join("\n");
        setPages((prev) => {
          const pageText = prev[targetPage] ?? "";
          const pos = insertPos !== undefined ? Math.min(insertPos, pageText.length) : pageText.length;
          const prefix = pos > 0 && pageText[pos - 1] !== "\n" ? "\n" : "";
          const nextBody = `${pageText.slice(0, pos)}${prefix}${markers}${pos === pageText.length ? "" : "\n"}${pageText.slice(pos)}`;
          return prev.map((p, i) => (i === targetPage ? nextBody : p));
        });
        setImages((prev) => [...prev, ...next]);
        markDirty();
        requestAnimationFrame(() => {
          const el = bodyRefs.current[targetPage];
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
        body: allBody,
        pages,
        categoryId: catId,
        tags: entry?.tags ?? [],
        isPinned,
        images,
        createdAt: createdAtRef.current,
        updatedAt: timestamp
      });
      // GC orphaned blobs: ids we tracked but whose {{img:…}} marker line no longer
      // exists in the saved body (marker deleted while editing).
      const referenced = matchImageMarkers(allBody);
      for (const imgId of images) {
        if (!referenced.has(imgId)) void deleteImage(imgId);
      }
      setDirty(false);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1200);
      if (andBack) onBack();
    },
    [allBody, pages, catId, entry?.tags, isPinned, images, onBack, resolveTitle, store]
  );

  // Enter-autolist + Backspace-unlist: native-feel list continuation in the
  // textarea, keyed per page. Only setPageText + markDirty; save flow untouched.
  // Plain Enter on a FULL last page (non-list line) appends a new page instead of
  // inserting an invisible wrapped line the reader can't see.
  const handleBodyKeyDown = (i: number) => (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const pg = pages[i];
    const { selectionStart: s, selectionEnd: en } = el;
    if (s !== en) return; // selection -> default
    const before = pg.slice(0, s);
    const lineStart = before.lastIndexOf("\n") + 1;
    const line = pg.slice(lineStart, s);

    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      const marker = autolistMarker(line);
      if (marker === null) {
        // Plain line: auto-add only when the page is physically full AND it is
        // the last page (never split mid-note) AND not composing (IME).
        if (i === pages.length - 1 && el.scrollHeight > el.clientHeight && !e.nativeEvent.isComposing) {
          e.preventDefault();
          setPages((prev) => appendPage(prev));
        }
        return; // otherwise default Enter
      }
      e.preventDefault();
      const next = `${pg.slice(0, s)}\n${marker}${pg.slice(en)}`;
      setPageText(i, next);
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
      setPageText(i, pg.slice(0, lineStart) + pg.slice(s));
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
  const words = pages.reduce((n, p) => n + wordCount(p), 0);
  // Save gate must consider ALL pages, not just the page in view: a note whose
  // content lives on another page but whose current page is empty would
  // otherwise be permanently unsaveable.
  const canSave = title.trim().length > 0 || allBody.trim().length > 0;

  const handleBack = () => {
    if (dirty && canSave) {
      setConfirmKind("leave");
      return;
    }
    onBack();
  };

  // Browser/OS back button while editing must route through the dirty check too
  // (the parent only pushes history state; the dirty confirm lives here).
  const handleBackRef = useRef(handleBack);
  useEffect(() => {
    handleBackRef.current = handleBack;
  });
  useEffect(() => {
    const handler = () => handleBackRef.current();
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  // Draft guard — typed text must never be silently lost:
  //  * beforeunload (close tab/reload) shows the browser's native "leave site?"
  //    prompt while dirty.
  //  * route-level useBlocker intercepts in-app navigation (bottom nav, library
  //    link) while dirty and routes it through the same save/discard dialog the
  //    internal back button uses. Mirror of JournalEntryScreen's guard.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome requires returnValue to be set to show the prompt.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const leaveRef = useRef(false);
  const blocker = useBlocker(() => dirty && canSave);
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (leaveRef.current) {
      // Deliberate nav via <Link>/navigate with leaveRef set: treat as "discard"
      // without a dialog (mirror of JournalEntryScreen's shortcut-nav behavior).
      leaveRef.current = false;
      blocker.proceed?.();
      return;
    }
    setConfirmKind("leave");
  }, [blocker.state, blocker.proceed]);

  return (
    <div className="space-y-0 pb-36 scroll-mb-36">
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
          const menuOpen = catMenu?.id === cat.id;
          return (
            <div key={cat.id} className="relative shrink-0">
              <div
                className="flex min-h-9 items-center rounded-full border py-1.5 pl-2.5 pr-1.5 text-xs font-semibold transition duration-200"
                style={{
                  borderColor: active ? hex : "var(--color-border-strong)",
                  backgroundColor: active ? `${hex}18` : "var(--color-surface)"
                }}
              >
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setCatId(cat.id);
                    markDirty();
                  }}
                  className="flex min-h-9 items-center gap-1.5 text-xs font-semibold active:scale-[0.97]"
                  style={{ color: active ? hex : "var(--color-text-muted)" }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active ? hex : "var(--color-text-soft)" }} />
                  {cat.name}
                </button>
                <button
                  type="button"
                  aria-label={t("notebook.categoryMenu", { name: cat.name })}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCatMenu((cur) => (cur?.id === cat.id ? null : { id: cat.id, anchor: e.currentTarget }));
                  }}
                  className={`grid h-5 w-5 place-items-center rounded-full transition ${menuOpen ? "bg-monk-soft text-monk-text" : "text-monk-text-soft hover:bg-monk-soft/60 hover:text-monk-text"}`}
                >
                  <MoreVertical size={12} strokeWidth={2} />
                </button>
              </div>
              <CategoryMenu
                trigger={catMenu?.anchor ?? null}
                cat={cat}
                count={entriesInCat(cat.id)}
                open={menuOpen}
                canDelete={categories.length > 1}
                onClose={() => setCatMenu(null)}
                onRename={(name) => {
                  setCatMenu(null);
                  setRenameCat({ id: cat.id, name });
                }}
                onDelete={() => {
                  setCatMenu(null);
                  setPendingDeleteCat({ id: cat.id, name: cat.name });
                  setConfirmKind("delete-cat-editor");
                }}
              />
            </div>
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

      <div
        ref={sheetRef}
        className="nb-open-page nb-open-enter"
        style={{ "--nb-cat": activeCatHex } as React.CSSProperties}
      >
        <textarea
          ref={titleRef}
          rows={1}
          aria-label={t("notebook.titlePlaceholder")}
          placeholder={t("notebook.titlePlaceholder")}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            markDirty();
            queueResize(e.currentTarget);
          }}
          className="nb-page-title"
        />
        {pages.map((pg, i) => (
          <div key={i} className="nb-sheet-stack">
            <textarea
              ref={setBodyRef(i)}
              aria-label={t("notebook.bodyPlaceholder")}
              placeholder={t("notebook.bodyPlaceholder")}
              value={pg}
              onKeyDown={handleBodyKeyDown(i)}
              onFocus={() => setActivePage(i)}
              onChange={(e) => {
                const el = e.currentTarget;
                const v = e.target.value;
                setPageText(i, v);
                markDirty();
                // Trailing empty page collapses back into the previous one so a
                // blank sheet never lingers at the end of the stack.
                if (v.trim() === "" && i === pages.length - 1 && pages.length > 1) {
                  setPages((prev) => prev.slice(0, -1));
                  setActivePage((cur) => Math.min(cur, Math.max(0, pages.length - 2)));
                  return;
                }
                // Full-page detection runs BEFORE auto-grow resize: at this point
                // the box is still at its previous height, so scrollHeight (real
                // content height) vs clientHeight (previous box height) tells us
                // the content has overflowed the page's visible area. After
                // resizeTextarea sets height = scrollHeight the two are equal and
                // "full" can't be detected. An empty sheet reports 1-line content
                // (< 432px min-height), so it never appends.
                queueResize(el);
                if (i === pages.length - 1 && el.scrollHeight > el.clientHeight) {
                  setPages((prev) => appendPage(prev));
                }
              }}
              className="nb-page-body"
            />
            {groupPhotoRuns(renderBodyMarkdown(pg, openPhotoInBody, false, handleDeletePhoto))}
            <div className="nb-folio">
              <span>
                {i + 1} / {pages.length}
              </span>
              <span>·</span>
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
          </div>
        ))}
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
          if (blocker.state === "blocked") blocker.proceed?.();
          else onBack();
        }}
        onConfirm={() => {
          setConfirmKind(null);
          if (blocker.state === "blocked") {
            // Save (without navigating) first — unlike the journal, the notebook
            // has no autosave, so "Save" on a blocked nav must persist the text.
            handleSave(false);
            blocker.proceed?.();
          } else {
            handleSave(true);
          }
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
      <CalmDialog
        open={Boolean(renameCat)}
        title={t("notebook.renameCategory")}
        cancelLabel={t("dialog.cancel")}
        confirmLabel={t("dialog.confirm")}
        confirmDisabled={!(renameCat?.name.trim())}
        onCancel={() => setRenameCat(null)}
        onConfirm={() => {
          if (renameCat?.name.trim()) store.renameNotebookCategory(renameCat.id, renameCat.name.trim());
          setRenameCat(null);
        }}
      >
        <input
          type="text"
          value={renameCat?.name ?? ""}
          onChange={(e) => setRenameCat((cur) => (cur ? { ...cur, name: e.target.value } : cur))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && renameCat?.name.trim()) {
              store.renameNotebookCategory(renameCat.id, renameCat.name.trim());
              setRenameCat(null);
            }
          }}
          aria-label={t("notebook.newCategoryPlaceholder")}
          placeholder={t("notebook.newCategoryPlaceholder")}
          className="min-h-11 w-full rounded-monk border border-monk-border bg-monk-surface px-3 text-sm text-monk-text placeholder:text-monk-text-soft focus:border-monk-accent focus:outline-none"
        />
      </CalmDialog>
      <CalmDialog
        open={confirmKind === "delete-cat-editor"}
        title={t("notebook.deleteCategoryTitle")}
        description={t("notebook.deleteCategoryConfirm", {
          name: pendingDeleteCat?.name ?? "",
          n: pendingDeleteCat ? entriesInCat(pendingDeleteCat.id) : 0
        })}
        confirmLabel={t("dialog.delete")}
        cancelLabel={t("dialog.cancel")}
        danger
        onCancel={() => {
          setConfirmKind(null);
          setPendingDeleteCat(null);
        }}
        onConfirm={() => {
          if (pendingDeleteCat) {
            store.deleteNotebookCategory(pendingDeleteCat.id);
            // The entry being edited must not keep a dangling categoryId: point
            // the local selection at the fallback so the next save stays valid.
            if (catId === pendingDeleteCat.id) {
              const fallback =
                store.notebookCategories.find((c) => c.id === "cat_lainnya") ??
                store.notebookCategories.find((c) => c.id !== pendingDeleteCat.id);
              if (fallback) setCatId(fallback.id);
            }
          }
          setConfirmKind(null);
          setPendingDeleteCat(null);
        }}
      />
      {lightbox ? (
        <PhotoLightbox
          ids={lightbox.ids}
          index={lightbox.index}
          onNavigate={(i) => setLightbox((s) => (s ? { ...s, index: i } : s))}
          onClose={() => setLightbox(null)}
          onDelete={handleDeletePhoto}
        />
      ) : null}
    </div>
  );
}

