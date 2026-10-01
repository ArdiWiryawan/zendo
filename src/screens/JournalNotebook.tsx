import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useBlocker } from "react-router-dom";
import { useMonkStore } from "../store/useMonkStore";
import { PrimaryButton, SecondaryButton, GhostButton, CalmDialog, useCalmToast } from "../components/ui";
import { createId } from "../lib/ids";
import { nowIso, getTodayDateString, addDaysToDate } from "../lib/date";
import type { NotebookCategory, NotebookEntry, ParaType } from "../types/app";
import { Search, Plus, Pin, PinOff, Trash2, ArrowLeft, X, BookOpen, ImagePlus, Camera, Palette, MoreVertical, Pencil, Maximize2, Minimize2, ListTodo, List, ListOrdered, Heading, Bold, Italic, Quote, Crown, Sparkles, Copy, Link2, ArrowRight, FileText, Sun, Moon, Target, PenLine, SlidersHorizontal, Archive, RotateCcw } from "lucide-react";
import { useT, useLanguage, type MessageKey } from "../i18n";
import { hapticPress } from "../lib/haptics";
import { autolistMarker, groupPhotoRuns, renderBodyMarkdown, toPlainExcerpt } from "../lib/notebookMarkdown";
import { deletePageAtIndex, joinPages, removePhotoMarker, trimTrailingBlankPages } from "../lib/notebookPages";
import { IMG_MARKER, compressImage, putImage, getImage, deleteImage, matchImageMarkers } from "../lib/imageStore";
import { InlinePhoto, PhotoLightbox, photoIdsInBody, useObjectUrl } from "../components/NotebookImages";
import { ZendoProModal } from "../components/ZendoProModal";
import NotebookDrawingPad from "../components/NotebookDrawingPad";
import { findBacklinks, findRelatedNotes } from "../lib/notebookLinks";
import { selectActiveGoals } from "../store/selectors";
import {
  NOTEBOOK_DRAFT_KEY,
  clearNotebookDraft,
  readNotebookDraft,
  writeNotebookDraft
} from "../lib/storage";

export type ZenTemplate = {
  id: string;
  titleKey: MessageKey;
  iconName: "sun" | "moon" | "target" | "pen";
  descId: string;
  descEn: string;
  defaultTitle: (lang: string) => string;
  defaultPages: (lang: string) => string[];
  defaultCategory?: string;
  defaultPara?: ParaType;
};

export function TemplateIcon({ name, className = "" }: { name: "sun" | "moon" | "target" | "pen"; className?: string }) {
  if (name === "sun") return <Sun size={15} strokeWidth={1.5} className={className} />;
  if (name === "moon") return <Moon size={15} strokeWidth={1.5} className={className} />;
  if (name === "target") return <Target size={15} strokeWidth={1.5} className={className} />;
  return <PenLine size={15} strokeWidth={1.5} className={className} />;
}

export const ZEN_NOTEBOOK_TEMPLATES: ZenTemplate[] = [
  {
    id: "morning",
    titleKey: "notebook.templateMorningTitle",
    iconName: "sun",
    descId: "Niat hari, fokus tunggal, dan kesiapan pikiran",
    descEn: "Daily intention, single focus, and mental readiness",
    defaultTitle: (lang) => (lang === "id" ? "Refleksi Pagi" : "Morning Intention"),
    defaultPages: (lang) => [
      lang === "id"
        ? `## Niat Pagi
- Fokus Utama: 
- Hambatan yang Diantisipasi: 

## Blok Waktu
- Sesi Inti: 

---
*Fokus pada satu hal dengan tenang.*`
        : `## Morning Intention
- Single Focus: 
- Anticipated Friction: 

## Focus Blocks
- Core Session: 

---
*Stay with one thing in stillness.*`
    ],
    defaultPara: "project"
  },
  {
    id: "evening",
    titleKey: "notebook.templateEveningTitle",
    iconName: "moon",
    descId: "Kemenangan hari ini & persiapan aksi esok",
    descEn: "Wins of the day & tomorrow's first step",
    defaultTitle: (lang) => (lang === "id" ? "Refleksi Petang" : "Evening Reflection"),
    defaultPages: (lang) => [
      lang === "id"
        ? `## Refleksi Petang
- Selesai Hari Ini: 
- Intisari / Pelajaran: 

## Aksi Awal Esok
- Langkah pertama: 

---
*Lepaskan hari ini dengan rasa syukur.*`
        : `## Evening Reflection
- Completed Today: 
- Core Takeaway: 

## Tomorrow's Anchor
- First action: 

---
*Release today with gratitude.*`
    ],
    defaultPara: "area"
  },
  {
    id: "deep_work",
    titleKey: "notebook.templateDeepWorkTitle",
    iconName: "target",
    descId: "Tujuan sesi mendalam & parkir distraksi",
    descEn: "Deep flow objective & distraction parking lot",
    defaultTitle: (lang) => (lang === "id" ? "Deep Work Log" : "Deep Work Log"),
    defaultPages: (lang) => [
      lang === "id"
        ? `## Deep Work
- Tujuan Sesi: 
- Target Output: 

## Parkir Ide & Distraksi
- 

## Temuan
- `
        : `## Deep Work
- Session Objective: 
- Target Output: 

## Distraction Parking Lot
- 

## Key Findings
- `
    ],
    defaultPara: "project"
  },
  {
    id: "project",
    titleKey: "notebook.templateProjectTitle",
    iconName: "target",
    descId: "Hasil yang jelas, konteks, dan langkah berikutnya",
    descEn: "Clear outcome, context, and the next action",
    defaultTitle: (lang) => (lang === "id" ? "Proyek Baru" : "New Project"),
    defaultPages: (lang) => [
      lang === "id"
        ? `## Hasil
-

## Konteks
-

## Tugas
- [ ]

## Catatan
-

## Keputusan
-

## Aksi Berikutnya
- `
        : `## Outcome
-

## Context
-

## Tasks
- [ ]

## Notes
-

## Decisions
-

## Next Action
- `
    ],
    defaultPara: "project"
  },
  {
    id: "area",
    titleKey: "notebook.templateAreaTitle",
    iconName: "pen",
    descId: "Tanggung jawab berkelanjutan yang perlu dijaga",
    descEn: "Ongoing responsibilities worth maintaining",
    defaultTitle: (lang) => (lang === "id" ? "Area Baru" : "New Area"),
    defaultPages: (lang) => [
      lang === "id"
        ? `## Tujuan
-

## Kondisi Saat Ini
-

## Catatan Penting
-

## Sumber Daya
-

## Aksi Berkelanjutan
- `
        : `## Purpose
-

## Current State
-

## Important Notes
-

## Resources
-

## Ongoing Actions
- `
    ],
    defaultPara: "area"
  },
  {
    id: "blank",
    titleKey: "notebook.templateBlankTitle",
    iconName: "pen",
    descId: "Mulai menulis bebas di halaman bersih",
    descEn: "Start freely on a clean blank canvas",
    defaultTitle: (lang) => (lang === "id" ? "Catatan Baru" : "New Note"),
    defaultPages: () => [""]
  }
];

// Category hues resolve through the per-theme tokens in globals.css rather than
// literal hex, so the notebook stays legible in every theme. Built-in categories
// map onto the time-block category hues (also re-declared per theme); user-made
// ones map onto the themed --nb-user-* pool.
const CATEGORY_TOKEN: Record<string, string> = {
  cat_pribadi: "--color-cat-deep",
  cat_karier: "--color-cat-shallow",
  cat_keuangan: "--color-cat-rest",
  cat_kesehatan: "--color-cat-personal",
  cat_hubungan: "--nb-user-5",
  cat_spiritual: "--color-cat-learning",
  cat_perjalanan: "--nb-user-7",
  cat_kreatif: "--nb-user-8",
  cat_lainnya: "--nb-user-6"
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

// Fallback pool for user-created categories. Each id maps to a stable slot via a
// small string hash, so the same category keeps its tint across renders and
// sessions, while new categories land on varied on-palette hues.
const CUSTOM_CATEGORY_TOKENS = [
  "--nb-user-1", "--nb-user-2", "--nb-user-3", "--nb-user-4",
  "--nb-user-5", "--nb-user-6", "--nb-user-7", "--nb-user-8"
];

function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function catToken(id: string): string {
  return CATEGORY_TOKEN[id] ?? CUSTOM_CATEGORY_TOKENS[hashId(id) % CUSTOM_CATEGORY_TOKENS.length];
}

function wordCount(text: string) {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** First {{img:<id>}} marker id in a body, if any (for the list thumbnail). */
function firstPhotoId(body: string): string | null {
  for (const line of body.split("\n")) {
    const m = line.trim().match(IMG_MARKER);
    if (m) return m[1];
  }
  return null;
}

/** Small photo thumbnail in the list card — the note's visual anchor. */
function CardThumb({ id }: { id: string }) {
  const url = useObjectUrl(id);
  if (!url) return null;
  return (
    <div className="nb-thumb shrink-0">
      <img src={url} alt="" loading="lazy" draggable={false} />
    </div>
  );
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
  const toast = useCalmToast();
  const [view, setView] = useState<"list" | "edit" | "read">("list");
  const [editEntry, setEditEntry] = useState<NotebookEntry | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ZenTemplate | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [readEntry, setReadEntry] = useState<NotebookEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [filterPara, setFilterPara] = useState<ParaType | null>(null);
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
    // Archive tab = soft-hide bucket: archivedAt set, plus legacy notes that
    // used the "archive" PARA value before archivedAt existed.
    if (filterPara === "archive") {
      list = list.filter((e) => Boolean(e.archivedAt) || e.paraType === "archive");
    } else {
      // Every other tab (including "All") hides soft-hidden notes.
      list = list.filter((e) => !e.archivedAt);
      if (filterPara) list = list.filter((e) => e.paraType === filterPara);
    }
    if (filterCat) list = list.filter((e) => e.categoryId === filterCat);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.body.toLowerCase().includes(q) ||
          Boolean(e.takeaway && e.takeaway.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return list;
  }, [entries, filterPara, filterCat, searchQuery]);

  const goBackToList = useCallback(() => {
    setView("list");
    setEditEntry(null);
    setSelectedTemplate(null);
    setReadEntry(null);
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
    setSelectedTemplate(null);
    setView("edit");
    onEditingChange?.(true);
  };

  const openNewWithTemplate = (tmpl: ZenTemplate) => {
    setEditEntry(null);
    setSelectedTemplate(tmpl);
    setView("edit");
    onEditingChange?.(true);
  };

  const openEdit = (entry: NotebookEntry) => {
    setEditEntry(entry);
    setSelectedTemplate(null);
    setView("edit");
    onEditingChange?.(true);
  };

  const openRead = (entry: NotebookEntry) => {
    setReadEntry(entry);
    setView("read");
    onEditingChange?.(true);
  };

  const handleDuplicate = (entry: NotebookEntry, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const duplicated = store.duplicateNotebookEntry(entry.id, {
      copySuffix: t("notebook.copySuffix"),
      untitledCopyTitle: t("notebook.untitledCopy")
    });
    if (duplicated) {
      toast.show(t("notebook.duplicateSuccess"));
      hapticPress("light");
    }
  };

  if (view === "edit") {
    return (
      <NotebookEditor
        entry={editEntry}
        initialCategoryId={filterCat ?? undefined}
        initialTemplate={selectedTemplate}
        onBack={goBackToList}
      />
    );
  }

  if (view === "read" && readEntry) {
    const liveEntry = store.notebookEntries.find((e) => e.id === readEntry.id) ?? readEntry;
    return (
      <NotebookEntryDetail
        entry={liveEntry}
        onBack={goBackToList}
        onEdit={() => openEdit(liveEntry)}
        onOpenNote={(target) => setReadEntry(target)}
        onDuplicate={(entryToDup) => {
          const duplicated = store.duplicateNotebookEntry(entryToDup.id, {
            copySuffix: t("notebook.copySuffix"),
            untitledCopyTitle: t("notebook.untitledCopy")
          });
          if (duplicated) {
            toast.show(t("notebook.duplicateSuccess"));
            hapticPress("light");
            setReadEntry(duplicated);
          }
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
              onClick={() => setShowNewModal(true)}
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

      {/* PARA Classification Filter Tabs */}
      <div className="-mx-1 mb-2.5 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-none">
        {(
          [
            { id: null, label: t("notebook.paraAll") },
            { id: "project", label: t("notebook.paraProjects") },
            { id: "area", label: t("notebook.paraAreas") },
            { id: "resource", label: t("notebook.paraResources") },
            { id: "archive", label: t("notebook.paraArchives") },
          ] as const
        ).map((tab) => {
          const active = filterPara === tab.id;
          return (
            <button
              key={tab.id ?? "all"}
              type="button"
              onClick={() => setFilterPara(tab.id as ParaType | null)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition duration-150 active:scale-95 ${
                active
                  ? "bg-monk-accent text-monk-bg shadow-xs"
                  : "bg-monk-soft/70 text-monk-muted hover:bg-monk-soft hover:text-monk-text border border-monk-border/50"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
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
          const token = catToken(cat.id);
          const isActive = filterCat === cat.id;
          const count = entries.filter((e) => e.categoryId === cat.id).length;
          const menuOpen = catMenu?.id === cat.id;
          return (
            <div key={cat.id} className="relative shrink-0">
              <div
                className="flex items-center rounded-full border py-1.5 pl-3 pr-1.5 text-xs font-semibold transition duration-200"
                style={{
                  borderColor: isActive ? `rgb(var(${token}))` : "rgb(var(--color-border))",
                  backgroundColor: isActive
                    ? `rgb(var(${token}) / 0.09)`
                    : "rgb(var(--color-surface))"
                }}
              >
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setFilterCat(isActive ? null : cat.id)}
                  className="flex items-center gap-1.5 text-xs font-semibold active:scale-[0.97]"
                  style={{
                    color: isActive ? `rgb(var(${token}))` : "rgb(var(--color-text-muted))"
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: `rgb(var(${token}))` }}
                  />
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
                  className={`relative grid h-5 w-5 shrink-0 place-items-center rounded-full transition after:absolute after:left-1/2 after:top-1/2 after:h-6 after:w-6 after:-translate-x-1/2 after:-translate-y-1/2 after:content-[''] ${menuOpen ? "bg-monk-soft text-monk-text" : "text-monk-text-soft hover:bg-monk-soft/60 hover:text-monk-text"}`}
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
            {searchQuery || filterCat || filterPara ? t("notebook.empty.notFound") : t("notebook.empty.title")}
          </p>
          <p className="mx-auto mt-2 max-w-[240px] text-sm leading-6 text-monk-muted">
            {searchQuery || filterCat || filterPara
              ? t("notebook.empty.notFoundDesc")
              : t("notebook.empty.desc")}
          </p>
          {!searchQuery && !filterCat && !filterPara ? (
            <PrimaryButton className="mt-6" onClick={openNew}>
              {t("notebook.firstNote")}
            </PrimaryButton>
          ) : (
            <SecondaryButton
              className="mt-6"
              onClick={() => {
                setSearchQuery("");
                setFilterCat(null);
                setFilterPara(null);
              }}
            >
              {t("notebook.resetFilter")}
            </SecondaryButton>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((entry, index) => {
            const token = catToken(entry.categoryId);
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
                  onClick={() => openRead(entry)}
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
                  <div className="flex items-start gap-3">
                    <div className="notebook-card-body min-h-[1.5rem] flex-1 line-clamp-2">
                      {toPlainExcerpt(entry.body, 160) || t("notebook.noBody")}
                    </div>
                    {(() => {
                      const pid = firstPhotoId(entry.body);
                      return pid ? <CardThumb id={pid} /> : null;
                    })()}
                  </div>
                  {entry.takeaway ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs italic font-serif text-monk-accent/90 line-clamp-1">
                      <Sparkles size={11} className="shrink-0 text-monk-accent" />
                      <span className="truncate">{entry.takeaway}</span>
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-monk-text-soft">
                    {entry.archivedAt ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-monk-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-monk-muted border border-monk-border/50">
                        <Archive size={10} strokeWidth={2} className="shrink-0" />
                        {t("notebook.archivedBadge")}
                      </span>
                    ) : null}
                    {entry.paraType ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-monk-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-monk-muted border border-monk-border/50">
                        {entry.paraType === "project" ? t("notebook.paraProjects") :
                         entry.paraType === "area" ? t("notebook.paraAreas") :
                         entry.paraType === "resource" ? t("notebook.paraResources") :
                         t("notebook.paraArchives")}
                      </span>
                    ) : null}
                    {entry.goalId ? (() => {
                      const g = store.goals.find((goal) => goal.id === entry.goalId);
                      return g ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-monk-accent/10 px-2 py-0.5 text-[10px] font-semibold text-monk-accent border border-monk-accent/30">
                          <Target size={10} strokeWidth={2} className="shrink-0" />
                          <span>{g.track ? `${g.track} · ` : ""}{g.title}</span>
                        </span>
                      ) : null;
                    })() : null}
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-semibold uppercase tracking-wide"
                      style={{
                        borderColor: `rgb(var(${token}) / 0.27)`,
                        color: `rgb(var(${token}))`
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: `rgb(var(${token}))` }}
                      />
                      {cat?.name ?? t("notebook.other")}
                    </span>
                    <span className="font-mono">{formatRelative(entry.updatedAt, t, dateLocale)}</span>
                  </div>
                </button>

                <div className="mt-1 flex items-center justify-end gap-0.5 border-t border-monk-border/30 pt-1">
                  <button
                    type="button"
                    aria-label={t("notebook.edit")}
                    onClick={() => openEdit(entry)}
                    className="grid min-h-10 min-w-10 place-items-center rounded-full text-monk-muted transition duration-150 active:scale-95 hover:bg-monk-soft hover:text-monk-accent"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label={t("notebook.duplicate")}
                    onClick={(e) => handleDuplicate(entry, e)}
                    className="grid min-h-10 min-w-10 place-items-center rounded-full text-monk-muted transition duration-150 active:scale-95 hover:bg-monk-soft hover:text-monk-accent"
                  >
                    <Copy size={15} />
                  </button>
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
                    aria-label={entry.archivedAt ? t("notebook.restoreAction") : t("notebook.archiveAction")}
                    onClick={() =>
                      entry.archivedAt
                        ? store.restoreNotebookEntry(entry.id)
                        : store.archiveNotebookEntry(entry.id)
                    }
                    className="grid min-h-10 min-w-10 place-items-center rounded-full text-monk-muted transition duration-150 active:scale-95 hover:bg-monk-soft hover:text-monk-accent"
                  >
                    {entry.archivedAt ? <RotateCcw size={15} /> : <Archive size={15} />}
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
        onClick={() => setShowNewModal(true)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+88px)] right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-monk-accent text-monk-bg shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_26px_rgba(164,139,94,0.4)] transition duration-200 hover:scale-[1.05] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_14px_34px_rgba(164,139,94,0.5)] active:scale-90"
        aria-label={t("notebook.newNoteAria")}
      >
        <Plus size={24} strokeWidth={2} />
      </button>

      {/* Zen New Note Modal */}
      <CalmDialog
        open={showNewModal}
        title={lang === "id" ? "Mulai Menulis" : "Start Note"}
        description={lang === "id" ? "Pilih format lembar atau mulai dari halaman kosong." : "Choose a template or begin with a blank page."}
        confirmLabel={lang === "id" ? "Tutup" : "Close"}
        cancelLabel={lang === "id" ? "Batal" : "Cancel"}
        onConfirm={() => setShowNewModal(false)}
        onCancel={() => setShowNewModal(false)}
      >
        <div className="space-y-2 mt-2">
          {ZEN_NOTEBOOK_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => {
                setShowNewModal(false);
                if (tmpl.id === "blank") {
                  openNew();
                } else {
                  openNewWithTemplate(tmpl);
                }
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-monk-border/60 bg-monk-surface hover:bg-monk-surface-raised hover:border-monk-accent/50 text-left transition active:scale-[0.99] group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-monk-accent/10 border border-monk-accent/20 text-monk-accent group-hover:bg-monk-accent group-hover:text-monk-bg transition shrink-0">
                  <TemplateIcon name={tmpl.iconName} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-monk-text group-hover:text-monk-accent transition truncate">
                    {t(tmpl.titleKey)}
                  </p>
                  <p className="text-[10px] text-monk-muted mt-0.5 truncate">
                    {lang === "id" ? tmpl.descId : tmpl.descEn}
                  </p>
                </div>
              </div>
              <ArrowRight size={13} className="text-monk-muted group-hover:text-monk-accent group-hover:translate-x-0.5 transition shrink-0" />
            </button>
          ))}
        </div>
      </CalmDialog>

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
      {toast.Toast()}
    </div>
  );
}

export function NotebookEntryDetail({
  entry,
  onBack,
  onEdit,
  onDuplicate,
  onOpenNote
}: {
  entry: NotebookEntry;
  onBack: () => void;
  onEdit: () => void;
  onDuplicate?: (entry: NotebookEntry) => void;
  onOpenNote?: (entry: NotebookEntry) => void;
}) {
  const t = useT();
  const lang = useLanguage();
  const dateLocale = lang === "id" ? "id-ID" : "en-US";
  const store = useMonkStore();
  const toast = useCalmToast();
  const [lightbox, setLightbox] = useState<{ ids: string[]; index: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const liveEntry = store.notebookEntries.find((e) => e.id === entry.id) ?? entry;
  const body = liveEntry.body ?? "";
  const cat = store.notebookCategories.find((c) => c.id === liveEntry.categoryId);
  const token = catToken(liveEntry.categoryId);
  const rawPages = liveEntry.pages && liveEntry.pages.length > 0 ? liveEntry.pages : [body];
  const pages = trimTrailingBlankPages(rawPages);
  const words = wordCount(body);

  const backlinks = useMemo(() => findBacklinks(liveEntry, store.notebookEntries), [liveEntry, store.notebookEntries]);
  const relatedNotes = useMemo(() => findRelatedNotes(liveEntry, store.notebookEntries), [liveEntry, store.notebookEntries]);

  const openPhoto = useCallback(
    (id: string) => {
      const ids = photoIdsInBody(body);
      const i = ids.indexOf(id);
      if (i >= 0) setLightbox({ ids, index: i });
    },
    [body]
  );

  const handleToggleTask = useCallback(
    (pageIdx: number, lineIndex: number) => {
      const curPages = liveEntry.pages && liveEntry.pages.length > 0 ? [...liveEntry.pages] : [liveEntry.body ?? ""];
      const targetPage = curPages[pageIdx];
      if (!targetPage) return;
      const lines = targetPage.split("\n");
      const targetLine = lines[lineIndex];
      if (targetLine === undefined) return;

      let nextLine = targetLine;
      if (/^(.*?)\[ \](.*)$/.test(targetLine)) {
        nextLine = targetLine.replace(/\[ \]/, "[x]");
        hapticPress("success");
      } else if (/^(.*?)\[[xX]\](.*)$/.test(targetLine)) {
        nextLine = targetLine.replace(/\[[xX]\]/, "[ ]");
        hapticPress("light");
      }

      if (nextLine !== targetLine) {
        lines[lineIndex] = nextLine;
        curPages[pageIdx] = lines.join("\n");
        const nextBody = joinPages(curPages);
        store.saveNotebookEntry({
          ...liveEntry,
          body: nextBody,
          pages: curPages,
          updatedAt: nowIso()
        });
      }
    },
    [liveEntry, store]
  );

  return (
    <div className="space-y-0 pb-36 scroll-mb-36">
      {/* Top Cover Bar matching Editor */}
      <div className="nb-editor-cover">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-10 items-center gap-1.5 text-xs font-medium text-monk-muted transition hover:text-monk-accent"
        >
          <ArrowLeft size={15} strokeWidth={1.5} />
          {t("notebook.back")}
        </button>
        <div className="flex min-w-0 items-center gap-2">
          {liveEntry.archivedAt ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-monk-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-monk-muted border border-monk-border/50">
              <Archive size={10} strokeWidth={2} className="shrink-0" />
              {t("notebook.archivedBadge")}
            </span>
          ) : null}
          {liveEntry.paraType ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-monk-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-monk-muted border border-monk-border/50">
              {liveEntry.paraType === "project" ? t("notebook.paraProjects") :
               liveEntry.paraType === "area" ? t("notebook.paraAreas") :
               liveEntry.paraType === "resource" ? t("notebook.paraResources") :
               t("notebook.paraArchives")}
            </span>
          ) : null}
          {liveEntry.goalId ? (() => {
            const g = store.goals.find((goal) => goal.id === liveEntry.goalId);
            return g ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-monk-accent/10 px-2 py-0.5 text-[10px] font-semibold text-monk-accent border border-monk-accent/30 shrink-0">
                <Target size={10} strokeWidth={2} className="shrink-0" />
                <span>{g.track ? `${g.track} · ` : ""}{g.title}</span>
              </span>
            ) : null;
          })() : null}
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              borderColor: `rgb(var(${token}) / 0.27)`,
              color: `rgb(var(${token}))`,
              backgroundColor: `rgb(var(${token}) / 0.08)`
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: `rgb(var(${token}))` }}
            />
            {cat?.name ?? t("notebook.other")}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-monk-accent">
            {liveEntry.title || t("notebook.untitled")}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {onDuplicate ? (
            <button
              type="button"
              aria-label={t("notebook.duplicate")}
              onClick={() => onDuplicate(liveEntry)}
              className="grid min-h-10 min-w-10 place-items-center rounded-full text-monk-muted transition duration-150 active:scale-95 hover:bg-monk-soft hover:text-monk-accent"
            >
              <Copy size={14} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onEdit}
            className="flex min-h-10 items-center gap-1.5 rounded-full bg-monk-accent px-3.5 text-xs font-bold text-monk-bg shadow-sm transition active:scale-95 hover:bg-monk-accent/90"
          >
            <Pencil size={13} strokeWidth={2} />
            {t("notebook.edit")}
          </button>
        </div>
      </div>

      {/* Unified Paper Sheet Container */}
      <div
        className="nb-open-page nb-open-enter mt-4 select-text"
        style={
          {
            // Resolved here because --nb-cat feeds `background`, `caret-color`
            // and `border-color`, which have no alpha slot to wrap it in.
            "--nb-cat": `rgb(var(${token}))`
          } as React.CSSProperties
        }
      >
        <h1 className="nb-page-title m-0 select-text">
          {liveEntry.title || t("notebook.untitled")}
        </h1>

        {liveEntry.takeaway ? (
          <div className="mx-4 mb-4 rounded-xl border border-monk-accent/30 bg-monk-soft/25 p-3.5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-monk-accent">
                <Sparkles size={12} />
                {t("notebook.takeawayBadge")}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const today = getTodayDateString();
                    store.createOrUpdateDayPlan(today, {
                      dayType: "goal",
                      mainAction: liveEntry.takeaway
                    });
                    toast.show(t("notebook.todayActionToast"));
                    hapticPress("success");
                  }}
                  className="flex items-center gap-1 rounded-lg border border-monk-accent/40 bg-monk-accent/10 px-2.5 py-1 text-[11px] font-bold text-monk-accent transition hover:bg-monk-accent/20 active:scale-95"
                >
                  <span>{t("notebook.setAsTodayAction")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tomorrow = addDaysToDate(getTodayDateString(), 1);
                    store.createOrUpdateDayPlan(tomorrow, {
                      dayType: "goal",
                      mainAction: liveEntry.takeaway
                    });
                    toast.show(t("notebook.tomorrowActionToast"));
                    hapticPress("success");
                  }}
                  className="flex items-center gap-1 rounded-lg bg-monk-accent px-2.5 py-1 text-[11px] font-bold text-monk-bg transition hover:bg-monk-accent/90 active:scale-95 shadow-xs"
                >
                  <span>{t("notebook.setAsTomorrowAction")}</span>
                </button>
              </div>
            </div>
            <p className="text-sm italic leading-relaxed text-monk-text font-serif">
              "{liveEntry.takeaway}"
            </p>
          </div>
        ) : null}

        {pages.map((pg, i) => (
          <div key={i} className="nb-sheet-stack">
            <div className="nb-page-body-reader select-text">
              {pg.trim() ? (
                groupPhotoRuns(
                  renderBodyMarkdown(
                    pg,
                    openPhoto,
                    false,
                    undefined,
                    (lineIndex) => handleToggleTask(i, lineIndex)
                  )
                )
              ) : (
                <p className="text-monk-muted italic">{t("notebook.noBody")}</p>
              )}
            </div>
            <div className="nb-folio">
              <span>
                {i + 1} / {pages.length}
              </span>
              <span>·</span>
              <span>{t("notebook.words", { n: words })}</span>
              <span>·</span>
              <span>
                {new Date(liveEntry.updatedAt).toLocaleDateString(dateLocale, {
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                })}
              </span>
            </div>
          </div>
        ))}

        {/* Backlinks & Heuristic Related Notes */}
        {(backlinks.length > 0 || relatedNotes.length > 0) && (
          <div className="mt-8 border-t border-monk-border/50 pt-5 px-4 space-y-6">
            {backlinks.length > 0 && (
              <div>
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-monk-text-soft mb-2.5">
                  <Link2 size={13} className="text-monk-accent" />
                  <span>{t("notebook.backlinksTitle")} ({backlinks.length})</span>
                </h4>
                <div className="flex flex-col gap-2">
                  {backlinks.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => (onOpenNote ? onOpenNote(b) : onEdit())}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-monk-border/70 bg-monk-surface/70 hover:bg-monk-surface hover:border-monk-accent/50 p-2.5 px-3 text-xs text-left transition-all active:scale-[0.99] shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="grid h-6 w-6 place-items-center rounded-lg bg-monk-soft text-monk-muted group-hover:text-monk-accent transition shrink-0">
                          <Link2 size={12} />
                        </div>
                        <span className="font-semibold text-monk-text group-hover:text-monk-text truncate">
                          {b.title || t("notebook.untitled")}
                        </span>
                      </div>
                      <ArrowRight size={13} className="text-monk-muted group-hover:text-monk-accent group-hover:translate-x-0.5 transition shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {relatedNotes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-monk-accent">
                    <Sparkles size={13} className="text-monk-accent" />
                    <span>{t("notebook.relatedTitle")}</span>
                  </h4>
                  <span className="font-mono text-[10px] text-monk-muted">
                    {relatedNotes.length} {lang === "id" ? "terhubung" : "connected"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {relatedNotes.map((r) => (
                    <button
                      key={r.note.id}
                      type="button"
                      onClick={() => (onOpenNote ? onOpenNote(r.note) : onEdit())}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-monk-border/70 bg-monk-surface/80 hover:bg-monk-surface hover:border-monk-accent/60 p-3 text-xs text-left transition-all active:scale-[0.99] shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="grid h-7 w-7 place-items-center rounded-lg bg-monk-soft/80 border border-monk-border/40 text-monk-muted group-hover:text-monk-accent group-hover:border-monk-accent/30 transition shrink-0">
                          <FileText size={13} strokeWidth={1.8} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-monk-text group-hover:text-monk-text truncate">
                            {r.note.title || t("notebook.untitled")}
                          </p>
                          {r.note.takeaway ? (
                            <p className="text-[11px] text-monk-muted truncate font-serif italic mt-0.5">
                              "{r.note.takeaway}"
                            </p>
                          ) : (
                            <p className="text-[11px] text-monk-muted/80 mt-0.5 truncate">
                              {toPlainExcerpt(r.note.body, 50) || t("notebook.noBody")}
                            </p>
                          )}
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-monk-muted group-hover:text-monk-accent group-hover:translate-x-0.5 transition shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Floating Bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-monk-border/70 bg-monk-bg/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md shadow-lg">
        <div className="mx-auto flex max-w-[440px] items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-1.5 rounded-xl border border-monk-danger/30 bg-monk-danger/10 px-3 py-2 text-xs font-semibold text-monk-danger hover:bg-monk-danger/20 active:scale-95 transition"
          >
            <Trash2 size={13} strokeWidth={2} />
            <span>{t("notebook.delete")}</span>
          </button>
          <button
            type="button"
            onClick={() =>
              liveEntry.archivedAt
                ? store.restoreNotebookEntry(liveEntry.id)
                : store.archiveNotebookEntry(liveEntry.id)
            }
            className="flex items-center gap-1.5 rounded-xl border border-monk-border bg-monk-surface px-3 py-2 text-xs font-semibold text-monk-text hover:border-monk-accent hover:text-monk-accent active:scale-95 transition shadow-xs"
          >
            {liveEntry.archivedAt ? <RotateCcw size={13} strokeWidth={2} /> : <Archive size={13} strokeWidth={2} />}
            <span>{liveEntry.archivedAt ? t("notebook.restoreAction") : t("notebook.archiveAction")}</span>
          </button>
          <div className="flex items-center gap-2">
            {onDuplicate ? (
              <button
                type="button"
                onClick={() => onDuplicate(liveEntry)}
                className="flex items-center gap-1.5 rounded-xl border border-monk-border bg-monk-surface px-3 py-2 text-xs font-semibold text-monk-text hover:border-monk-accent hover:text-monk-accent active:scale-95 transition shadow-xs"
              >
                <Copy size={13} strokeWidth={2} />
                <span>{t("notebook.duplicate")}</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-2 rounded-xl bg-monk-accent px-5 py-2 text-xs font-bold text-monk-bg shadow-sm hover:bg-monk-accent/90 active:scale-95 transition"
            >
              <Pencil size={14} strokeWidth={2.2} />
              <span>{t("notebook.edit")}</span>
            </button>
          </div>
        </div>
      </div>

      <CalmDialog
        open={deleteConfirm}
        title={t("notebook.delete")}
        description={t("notebook.deleteConfirm", { title: entry.title || t("notebook.thisNote") })}
        confirmLabel={t("dialog.delete")}
        cancelLabel={t("dialog.cancel")}
        danger
        onCancel={() => setDeleteConfirm(false)}
        onConfirm={() => {
          store.deleteNotebookEntry(entry.id);
          setDeleteConfirm(false);
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
      {toast.Toast()}
    </div>
  );
}

export function NotebookEditor({
  entry,
  initialCategoryId,
  initialTemplate,
  onBack
}: {
  entry: NotebookEntry | null;
  initialCategoryId?: string;
  initialTemplate?: ZenTemplate | null;
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
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Autosaved draft: a note being edited is persisted to localStorage on every
  // keystroke (debounced) so a tab close / crash / accidental nav never loses
  // typed text — mirror of the journal's draft pattern. Restore only when the
  // draft is newer than the saved entry (dirty editor beats stored note).
  const entryIdRef = useRef(entry?.id ?? createId("nb_entry"));
  const createdAtRef = useRef(entry?.createdAt ?? nowIso());
  const draftKey = useMemo(() => `${NOTEBOOK_DRAFT_KEY}:${entryIdRef.current}`, []);
  const draft = useMemo(() => readNotebookDraft(draftKey), [draftKey]);
  const draftWins = Boolean(draft && (!entry || new Date(draft.createdAt ?? 0) > new Date(entry.updatedAt)));
  const [title, setTitle] = useState(() => {
    if (draftWins && draft?.title) return draft.title;
    if (entry?.title) return entry.title;
    if (initialTemplate) return initialTemplate.defaultTitle(lang);
    return "";
  });
  const [paraType, setParaType] = useState<ParaType | undefined>(() => {
    if (draftWins) return draft?.paraType;
    if (entry?.paraType) return entry.paraType;
    return initialTemplate?.defaultPara;
  });
  const activeGoals = selectActiveGoals(store);
  const [goalId, setGoalId] = useState<string | undefined>(() => {
    if (draftWins) return draft?.goalId;
    if (entry?.goalId) return entry.goalId;
    return undefined;
  });
  const [takeaway, setTakeaway] = useState<string>(draftWins ? (draft?.takeaway ?? "") : (entry?.takeaway ?? ""));
  const [pages, setPages] = useState<string[]>(() => {
    const raw = draftWins
      ? draft?.pages ?? []
      : entry?.pages && entry.pages.length > 0
        ? entry.pages
        : entry?.body
          ? [entry.body]
          : initialTemplate
            ? initialTemplate.defaultPages(lang)
            : [""];
    return trimTrailingBlankPages(raw);
  });
  // Index of the focused body textarea — photo-insert target and auto-page
  // anchor. Clamped whenever pages shrink (trailing-page collapse).
  const [activePage, setActivePage] = useState(0);

  // Active wiki-link query detection for autocomplete
  const linkMatch = useMemo(() => {
    const activeText = pages[activePage] ?? "";
    const el = bodyRefs.current[activePage];
    const cursor = el?.selectionStart ?? activeText.length;
    const beforeCursor = activeText.slice(0, cursor);
    const m = beforeCursor.match(/(?:^|[^[])\[\[([^\]\n]*)$/);
    if (!m) return null;
    return {
      query: m[1].toLowerCase(),
      fullMatch: m[0],
      matchStart: cursor - m[1].length - 2
    };
  }, [pages, activePage]);

  const linkSuggestions = useMemo(() => {
    if (!linkMatch) return [];
    const q = linkMatch.query;
    return store.notebookEntries
      .filter((e) => e.id !== entryIdRef.current && (!q || e.title.toLowerCase().includes(q)))
      .slice(0, 5);
  }, [linkMatch, store.notebookEntries]);

  const insertLinkSuggestion = (targetTitle: string) => {
    const el = bodyRefs.current[activePage];
    const activeText = pages[activePage] ?? "";
    const cursor = el?.selectionStart ?? activeText.length;
    const beforeCursor = activeText.slice(0, cursor);
    const m = beforeCursor.match(/(?:^|[^[])\[\[([^\]\n]*)$/);
    if (!m) return;
    const matchPrefixIndex = cursor - m[1].length - 2;
    const before = activeText.slice(0, matchPrefixIndex);
    const after = activeText.slice(cursor);
    const inserted = `[[${targetTitle}]] `;
    const nextText = `${before}${inserted}${after}`;
    setPageText(activePage, nextText);
    markDirty();
    requestAnimationFrame(() => {
      if (el) {
        resizeTextarea(el);
        const newPos = before.length + inserted.length;
        el.focus();
        el.setSelectionRange(newPos, newPos);
      }
    });
  };

  const initialCat = useMemo(() => {
    if (draftWins && draft?.categoryId && categories.some((c) => c.id === draft.categoryId)) {
      return draft.categoryId;
    }
    if (entry?.categoryId && categories.some((c) => c.id === entry.categoryId)) {
      return entry.categoryId;
    }
    if (initialCategoryId && categories.some((c) => c.id === initialCategoryId)) {
      return initialCategoryId;
    }
    return categories[0]?.id ?? "cat_lainnya";
  }, [categories, draft, draftWins, entry, initialCategoryId]);

  const [catId, setCatId] = useState(initialCat);

  useEffect(() => {
    if (!categories.some((c) => c.id === catId) && categories.length > 0) {
      setCatId(categories[0]?.id ?? "cat_lainnya");
    }
  }, [categories, catId]);
  const [proModalOpen, setProModalOpen] = useState(false);
  // The page whose sketch is open in the pad, if any. Writing the exported PNG
  // back is async, so the page index is captured here rather than re-read later.
  const [drawingPage, setDrawingPage] = useState<number | null>(null);
  const [drawingSeed, setDrawingSeed] = useState<string | null>(null);
  // The note's current sketch, read live from the store rather than the `entry`
  // prop: the editor holds an entry snapshot, so a sketch saved in this session
  // would otherwise be invisible to a re-open.
  //
  // Both the id AND the page it was saved to come from here — never from the pad's
  // target page. The store is the only place that knows where the previous marker
  // actually landed, and the pad's target page can drift (PWA restore, cursor
  // moved) between opening and saving. Reading the page back is what makes an
  // overwrite strip the old marker instead of stranding it next to the new one.
  const liveDrawing = store.notebookEntries.find((e) => e.id === entryIdRef.current);
  const liveDrawingId = liveDrawing?.drawingImageId;
  const drawingIdRef = useRef<{ id: string; page: number } | undefined>(
    liveDrawingId !== undefined
      ? { id: liveDrawingId, page: liveDrawing?.drawingPageIndex ?? 0 }
      : undefined
  );

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
  const [draftSaved, setDraftSaved] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Existing notes: do not steal focus/scroll. New note: focus title to write.
    if (!entry) titleRef.current?.focus();
    requestAnimationFrame(() => {
      queueResize(titleRef.current);
      for (const el of bodyRefs.current) queueResize(el);
    });
  }, [entry, pages.length]);

  const markDirty = () => setDirty(true);

  // Debounced autosave of the live editor state. Skips the first mount (nothing
  // typed yet) and only persists while something is actually unsaved, so an
  // untouched editor never writes a stale draft over a saved note.
  const draftSkipRef = useRef(true);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (draftSkipRef.current) {
      draftSkipRef.current = false;
      return;
    }
    if (!dirty) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      writeNotebookDraft(draftKey, {
        entryId: entryIdRef.current,
        title,
        pages,
        categoryId: catId,
        isPinned,
        paraType,
        goalId,
        takeaway,
        createdAt: createdAtRef.current
      });
      setDraftSaved(true);
    }, 600);
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [title, pages, catId, isPinned, paraType, goalId, takeaway, dirty, draftKey]);

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

  // Delete a specific page: clean up images on that page, remove from list, and clamp active page.
  const handleDeletePage = useCallback((pageIdx: number) => {
    setPages((prev) => {
      const targetPage = prev[pageIdx] ?? "";
      const photoIds = photoIdsInBody(targetPage);
      for (const imgId of photoIds) {
        void deleteImage(imgId);
      }
      const next = deletePageAtIndex(prev, pageIdx);
      setActivePage((cur) => Math.min(cur, Math.max(0, next.length - 1)));
      return next;
    });
    markDirty();
    hapticPress("light");
  }, []);

  const cleanAllBlankPages = useCallback(() => {
    setPages((prev) => {
      const filtered = prev.filter((p) => p.trim().length > 0 || photoIdsInBody(p).length > 0);
      const next = filtered.length > 0 ? filtered : [""];
      setActivePage((cur) => Math.min(cur, next.length - 1));
      return next;
    });
    markDirty();
    hapticPress("light");
  }, []);


  /**
   * Both photos and sketches land as one `{{img:<id>}}` marker line at the
   * cursor of the captured page. `insertImages` is the single writer so the
   * photo upload path and the sketchpad cannot drift apart.
   */
  const insertImages = useCallback((blobs: Blob[], targetPage: number): Promise<string[]> => {
    if (blobs.length === 0) return Promise.resolve([]);
    const insertPos = bodyRefs.current[targetPage]?.selectionStart;
    const ids: string[] = [];
    return (async () => {
      try {
        for (const blob of blobs) {
          const id = createId("img");
          await putImage(id, blob);
          ids.push(id);
        }
        // Insert each image as a marker line at the textarea cursor so text flows
        // above and below it (Word-like placement). Recompute against the LATEST
        // text of the captured page so edits made during the write are not lost.
        const markers = ids.map((id) => `{{img:${id}}}`).join("\n");
        setPages((prev) => {
          const pageText = prev[targetPage] ?? "";
          const pos = insertPos !== undefined ? Math.min(insertPos, pageText.length) : pageText.length;
          const prefix = pos > 0 && pageText[pos - 1] !== "\n" ? "\n" : "";
          const nextBody = `${pageText.slice(0, pos)}${prefix}${markers}${pos === pageText.length ? "" : "\n"}${pageText.slice(pos)}`;
          return prev.map((p, i) => (i === targetPage ? nextBody : p));
        });
        setImages((prev) => [...prev, ...ids]);
        markDirty();
        requestAnimationFrame(() => {
          const el = bodyRefs.current[targetPage];
          if (el) resizeTextarea(el);
        });
        return ids;
      } catch {
        setPhotoError(t("notebook.photoError"));
        for (const id of ids) void deleteImage(id);
        return [];
      }
    })();
  }, [markDirty, t]);

  useEffect(() => {
    // Seed from the store, and re-run after this session's own save so the pad
    // always opens on what the note actually holds. `drawingPage === null` is a
    // freshly mounted editor that adopted an existing sketch into its ref — the
    // bytes are identical, so re-decoding them would only flash.
    if (!liveDrawingId) return;
    if (drawingIdRef.current?.id === liveDrawingId && drawingPage === null) return;
    drawingIdRef.current = { id: liveDrawingId, page: liveDrawing?.drawingPageIndex ?? 0 };
    let cancelled = false;
    void getImage(liveDrawingId).then((blob) => {
      if (!blob || cancelled) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") setDrawingSeed(reader.result);
      };
      reader.readAsDataURL(blob);
    });
    return () => {
      cancelled = true;
    };
  }, [liveDrawingId, liveDrawing?.drawingPageIndex, drawingPage]);

  /**
   * Open the pad seeded from the note's saved sketch. The page the sketch is
   * written back to is the textarea that has focus — the same target the photo
   * path uses — so `pageIndex` here is only a fallback for a pad opened with no
   * cursor at all.
   */
  const openDrawingPad = useCallback((pageIndex: number) => {
    setDrawingPage(pageIndex);
    hapticPress("light");
  }, []);

  /**
   * A sketch is one per note: the pad is always seeded from the saved drawing,
   * so saving replaces it rather than stacking.
   *
   * The previous marker is swept from EVERY page, not just the pad's target
   * page. It is only guaranteed to sit on `previous.page` (the page the store
   * recorded when it was saved); the pad's target can have drifted since, and an
   * indexed edit there would silently no-op and strand the old marker beside the
   * new drawing. The sweep is id-keyed, so it cannot remove an unrelated image.
   */
  const handleSketchSave = useCallback(
    async (blob: Blob) => {
      if (drawingPage === null) return;
      const previous = drawingIdRef.current;
      // Write back to the focused textarea when there is one — same target
      // `insertImages` uses for photos. Opening the pad moves focus off the
      // textarea, so the usual path is the fallback: the page the previous
      // sketch was saved to. Only a first-ever sketch falls through to the
      // pad's own page.
      const focusedPage = bodyRefs.current.findIndex(
        (el) => el !== null && el === document.activeElement
      );
      const targetPage = focusedPage >= 0 ? focusedPage : previous?.page ?? drawingPage;
      setDrawingPage(null);
      if (previous) {
        setPages((prev) => prev.map((p) => removePhotoMarker(p, previous.id)));
        setImages((prev) => prev.filter((id) => id !== previous.id));
        setDrawingSeed(null);
        void deleteImage(previous.id);
      }
      const ids = await insertImages([blob], targetPage);
      const newId = ids[0];
      if (newId) {
        drawingIdRef.current = { id: newId, page: targetPage };
        store.saveNotebookDrawing(entryIdRef.current, targetPage, newId);
      }
      markDirty();
    },
    [drawingPage, insertImages, markDirty, store]
  );

  const handleAddImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPhotoError("");
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const MAX_BYTES = 10 * 1024 * 1024;
    const FREE_MAX_COUNT = 3;
    const PRO_MAX_COUNT = 30;
    const MAX_COUNT = store.isPro ? PRO_MAX_COUNT : FREE_MAX_COUNT;

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
    if (!store.isPro && images.length + arr.length > FREE_MAX_COUNT) {
      setPhotoError(
        lang === "id"
          ? "Akun gratis dibatasi 3 foto per catatan. Buka Zendo Pro untuk foto & mindmap tanpa batas."
          : "Free tier is limited to 3 photos per note. Upgrade to Zendo Pro for unlimited photo attachments."
      );
      setProModalOpen(true);
      resetInputs();
      return;
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
    void (async () => {
      const targetPage = activePage;
      const blobs: Blob[] = [];
      try {
        for (const file of arr) blobs.push(await compressImage(file));
      } catch {
        setPhotoError(t("notebook.photoError"));
        resetInputs();
        return;
      }
      resetInputs();
      await insertImages(blobs, targetPage);
    })();
  };

  const insertFormatting = (prefix: string, suffix: string = "") => {
    hapticPress("light");
    const targetPage = activePage;
    const el = bodyRefs.current[targetPage];
    const pg = pages[targetPage] ?? "";

    if (!el) {
      const needsNewline = pg.length > 0 && !pg.endsWith("\n");
      const lead = needsNewline ? "\n" : "";
      const nextBody = `${pg}${lead}${prefix}${suffix}`;
      setPages((prev) => prev.map((p, idx) => (idx === targetPage ? nextBody : p)));
      markDirty();
      return;
    }

    const s = el.selectionStart;
    const en = el.selectionEnd;
    const selectedText = pg.slice(s, en);

    let nextText: string;
    let newCursorPos: number;

    if (s !== en) {
      nextText = `${pg.slice(0, s)}${prefix}${selectedText}${suffix}${pg.slice(en)}`;
      newCursorPos = s + prefix.length + selectedText.length + suffix.length;
    } else if (prefix.startsWith("- [ ]") || prefix.startsWith("- ") || prefix.startsWith("1. ") || prefix.startsWith("### ")) {
      const before = pg.slice(0, s);
      const lineStart = before.lastIndexOf("\n") + 1;
      const currentLine = pg.slice(lineStart, s);
      const afterCursor = pg.slice(s);

      if (currentLine.trim() === "") {
        nextText = `${pg.slice(0, lineStart)}${prefix}${afterCursor}`;
        newCursorPos = lineStart + prefix.length;
      } else {
        const needsNewline = s > 0 && pg[s - 1] !== "\n";
        const lead = needsNewline ? "\n" : "";
        nextText = `${pg.slice(0, s)}${lead}${prefix}${afterCursor}`;
        newCursorPos = s + lead.length + prefix.length;
      }
    } else {
      nextText = `${pg.slice(0, s)}${prefix}${suffix}${pg.slice(s)}`;
      newCursorPos = s + prefix.length;
    }

    setPageText(targetPage, nextText);
    markDirty();
    requestAnimationFrame(() => {
      resizeTextarea(el);
      el.focus();
      el.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  const handleSave = useCallback(
    (andBack = true) => {
      const timestamp = nowIso();
      const cleanPages = trimTrailingBlankPages(pages);
      const cleanBody = joinPages(cleanPages);
      store.saveNotebookEntry({
        id: entryIdRef.current,
        title: resolveTitle(),
        body: cleanBody,
        pages: cleanPages,
        categoryId: catId,
        paraType,
        goalId,
        takeaway: takeaway.trim() || undefined,
        tags: entry?.tags ?? [],
        isPinned,
        images,
        createdAt: createdAtRef.current,
        updatedAt: timestamp
      });
      // GC orphaned blobs: ids we tracked but whose {{img:…}} marker line no longer
      // exists in the saved body (marker deleted while editing).
      const referenced = matchImageMarkers(cleanBody);
      for (const imgId of images) {
        if (!referenced.has(imgId)) void deleteImage(imgId);
      }
      setDirty(false);
      setSavedFlash(true);
      clearNotebookDraft(draftKey);
      window.setTimeout(() => setSavedFlash(false), 1200);
      if (andBack) onBack();
    },
    [pages, catId, paraType, goalId, takeaway, entry?.tags, isPinned, images, onBack, resolveTitle, store, draftKey]
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
      if (!/^(\s*)(?:([-*])\s+)?(\[[ xX]\]|[-*]|(?:\d+[.)]))\s*$/.test(line)) return;
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

  const activeCatToken = catToken(catId);
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
            ) : draftSaved && dirty ? (
              <span className="text-monk-text-soft">{t("notebook.draftSaved")}</span>
            ) : dirty ? (
              <span className="flex items-center gap-1 text-monk-warning">
                <span className="h-1.5 w-1.5 rounded-full bg-monk-warning animate-pulse" />
                {t("notebook.unsaved")}
              </span>
            ) : null}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setFocusMode((v) => !v)}
          aria-pressed={focusMode}
          aria-label={focusMode ? t("notebook.exitFocus") : t("notebook.focusMode")}
          className="flex min-h-10 items-center gap-1.5 rounded-full border border-monk-border px-2.5 text-xs font-semibold text-monk-muted transition hover:border-monk-accent hover:text-monk-accent"
        >
          {focusMode ? <Minimize2 size={14} strokeWidth={1.8} /> : <Maximize2 size={14} strokeWidth={1.8} />}
          {focusMode ? t("notebook.exitFocus") : t("notebook.focusMode")}
        </button>
      </div>

      {focusMode ? null : (
        !showDetails ? (
          <div className="flex items-center justify-between gap-2 pb-2 pt-1">
            <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto scrollbar-none">
              {/* Active Category badge */}
              {(() => {
                const activeCat = categories.find((c) => c.id === catId);
                const token = catToken(catId);
                return activeCat ? (
                  <button
                    type="button"
                    onClick={() => setShowDetails(true)}
                    title={t("notebook.collection")}
                    className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition active:scale-95"
                    style={{
                      borderColor: `rgb(var(${token}) / 0.4)`,
                      backgroundColor: `rgb(var(${token}) / 0.08)`,
                      color: `rgb(var(${token}))`
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: `rgb(var(${token}))` }}
                    />
                    <span className="truncate max-w-[120px]">{activeCat.name}</span>
                  </button>
                ) : null;
              })()}

              {/* Active PARA badge if set */}
              {paraType ? (
                <span className="shrink-0 rounded-full bg-monk-soft/80 border border-monk-border/40 px-2 py-0.5 text-[10px] font-semibold text-monk-muted uppercase tracking-wider">
                  {paraType === "project" ? t("notebook.paraProjects") :
                   paraType === "area" ? t("notebook.paraAreas") :
                   paraType === "resource" ? t("notebook.paraResources") :
                   t("notebook.paraArchives")}
                </span>
              ) : null}

              {/* Active Goal badge if set */}
              {goalId ? (() => {
                const g = store.goals.find((goal) => goal.id === goalId);
                return g ? (
                  <span className="shrink-0 flex items-center gap-1 rounded-full bg-monk-accent/10 border border-monk-accent/30 px-2 py-0.5 text-[10px] font-semibold text-monk-accent">
                    <Target size={10} strokeWidth={2} />
                    <span className="truncate max-w-[100px]">{g.title}</span>
                  </span>
                ) : null;
              })() : null}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {/* Pin button */}
              <button
                type="button"
                onClick={() => {
                  setIsPinned((v) => !v);
                  markDirty();
                }}
                aria-pressed={isPinned}
                aria-label={isPinned ? t("notebook.unpin") : t("notebook.pin")}
                className={`flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition ${
                  isPinned
                    ? "border-monk-accent/40 bg-monk-accent-soft text-monk-accent font-semibold"
                    : "border-monk-border text-monk-muted hover:border-monk-accent hover:text-monk-accent"
                }`}
              >
                {isPinned ? <Pin size={11} className="shrink-0" /> : <PinOff size={11} className="shrink-0" />}
                <span className="hidden sm:inline">{isPinned ? t("notebook.pinned") : t("notebook.pin")}</span>
              </button>

              {/* Options toggle */}
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                aria-expanded={showDetails}
                className="flex h-7 items-center gap-1 rounded-full border border-monk-border bg-monk-soft/40 px-2.5 text-xs font-medium text-monk-muted transition hover:border-monk-accent hover:text-monk-accent active:scale-95"
              >
                <SlidersHorizontal size={11} strokeWidth={1.8} />
                <span>{lang === "id" ? "Opsi" : "Options"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-2 space-y-2.5 rounded-2xl border border-monk-border/60 bg-monk-soft/15 p-3">
            <div className="flex items-center justify-between pb-1 border-b border-monk-border/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-monk-muted">
                {lang === "id" ? "Pengaturan Catatan" : "Note Details"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPinned((v) => !v);
                    markDirty();
                  }}
                  aria-pressed={isPinned}
                  className={`flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] font-medium transition ${
                    isPinned
                      ? "border-monk-accent/40 bg-monk-accent-soft text-monk-accent font-semibold"
                      : "border-monk-border text-monk-muted hover:border-monk-accent hover:text-monk-accent"
                  }`}
                >
                  {isPinned ? <Pin size={10} className="shrink-0" /> : <PinOff size={10} className="shrink-0" />}
                  <span>{isPinned ? t("notebook.pinned") : t("notebook.pin")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetails(false)}
                  className="text-[11px] font-semibold text-monk-accent hover:underline px-1 py-0.5"
                >
                  {lang === "id" ? "Tutup" : "Close"}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
              {categories.map((cat) => {
                const token = catToken(cat.id);
                const active = catId === cat.id;
                const menuOpen = catMenu?.id === cat.id;
                return (
                  <div key={cat.id} className="relative shrink-0">
                    <div
                      className="flex h-7 items-center rounded-full border pl-2.5 pr-1 text-xs font-medium transition-all"
                      style={{
                        borderColor: active ? `rgb(var(${token}) / 0.53)` : "rgb(var(--color-border))",
                        backgroundColor: active
                          ? `rgb(var(${token}) / 0.09)`
                          : "rgb(var(--color-surface))",
                        color: active ? `rgb(var(${token}))` : "rgb(var(--color-text-muted))"
                      }}
                    >
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setCatId(cat.id);
                          markDirty();
                        }}
                        className="flex items-center gap-1.5 text-xs font-medium active:scale-[0.97]"
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: active
                              ? `rgb(var(${token}))`
                              : "rgb(var(--color-text-soft))"
                          }}
                        />
                        <span className="whitespace-nowrap">{cat.name}</span>
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
                        className={`ml-1 grid h-4 w-4 place-items-center rounded-full transition ${
                          menuOpen ? "bg-monk-soft text-monk-text" : "text-monk-text-soft hover:bg-monk-soft/60 hover:text-monk-text"
                        }`}
                      >
                        <MoreVertical size={11} strokeWidth={2} />
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
                className="flex h-7 shrink-0 items-center rounded-full border border-dashed border-monk-border px-2.5 text-xs font-medium text-monk-muted hover:border-monk-accent hover:text-monk-accent transition whitespace-nowrap"
              >
                {t("notebook.addCategory")}
              </button>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-monk-muted shrink-0 mr-1">
                {t("notebook.paraLabel")}:
              </span>
              {(
                [
                  { id: "project", label: t("notebook.paraProjects") },
                  { id: "area", label: t("notebook.paraAreas") },
                  { id: "resource", label: t("notebook.paraResources") },
                  { id: "archive", label: t("notebook.paraArchives") },
                ] as const
              ).map((tab) => {
                const active = paraType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setParaType((cur) => (cur === tab.id ? undefined : (tab.id as ParaType)));
                      markDirty();
                    }}
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition active:scale-95 ${
                      active
                        ? "bg-monk-accent text-monk-bg shadow-xs"
                        : "bg-monk-soft/80 text-monk-muted hover:bg-monk-soft hover:text-monk-text border border-monk-border/40"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {activeGoals.length > 0 ? (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-monk-muted mr-1 flex items-center gap-1">
                  <Target size={11} strokeWidth={2} />
                  <span>{t("notebook.goalLabel")}:</span>
                </span>
                {activeGoals.map((g) => {
                  const active = goalId === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setGoalId((cur) => (cur === g.id ? undefined : g.id));
                        markDirty();
                      }}
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition active:scale-95 flex items-center gap-1 ${
                        active
                          ? "bg-monk-accent text-monk-bg shadow-xs font-bold"
                          : "bg-monk-soft/80 text-monk-muted hover:bg-monk-soft hover:text-monk-text border border-monk-border/40"
                      }`}
                    >
                      {g.track ? <span>{g.track}</span> : null}
                      <span className="truncate max-w-[130px]">{g.title}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        )
      )}

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
        <div className="mb-4 rounded-monk border border-monk-danger/30 bg-monk-danger/10 px-3 py-2 text-sm text-monk-danger">
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

      {/* Sleek Zen Markdown Island Toolbar */}
      <div className="mb-3 flex flex-col gap-1 rounded-xl border border-monk-border/60 bg-monk-surface/90 p-1 backdrop-blur-md shadow-xs">
      {/* Row 1 — structure */}
      <div className="flex flex-wrap items-center gap-1">
        {/* Zen Template Picker */}
        <button
          type="button"
          onClick={() => setShowTemplatePicker(true)}
          title={t("notebook.templatesTitle")}
          className="flex h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-monk-accent bg-monk-accent/15 border border-monk-accent/30 transition hover:bg-monk-accent/25 active:scale-95"
        >
          <Sparkles size={13} className="shrink-0 text-monk-accent" />
          <span>{t("notebook.templatesTitle")}</span>
        </button>

        {/* To-Do Checklist */}
        <button
          type="button"
          onClick={() => insertFormatting("- [ ] ")}
          title={t("notebook.todoTooltip")}
          className="flex h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-monk-accent bg-monk-accent/10 transition hover:bg-monk-accent/15 active:scale-95"
        >
          <ListTodo size={14} className="shrink-0 text-monk-accent" />
          <span>{t("notebook.todoLabel")}</span>
        </button>

        {/* Bullet List */}
        <button
          type="button"
          onClick={() => insertFormatting("- ")}
          title={t("notebook.bulletTooltip")}
          className="flex h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-monk-text-soft transition hover:bg-monk-soft/70 hover:text-monk-text active:scale-95"
        >
          <List size={14} className="shrink-0" />
          <span>{t("notebook.bulletLabel")}</span>
        </button>

        {/* Numbered List */}
        <button
          type="button"
          onClick={() => insertFormatting("1. ")}
          title={t("notebook.numberTooltip")}
          className="flex h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-monk-text-soft transition hover:bg-monk-soft/70 hover:text-monk-text active:scale-95"
        >
          <ListOrdered size={14} className="shrink-0" />
          <span>{t("notebook.numberLabel")}</span>
        </button>

        {/* Heading */}
        <button
          type="button"
          onClick={() => insertFormatting("### ")}
          title={t("notebook.headingTooltip")}
          className="flex h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-monk-text-soft transition hover:bg-monk-soft/70 hover:text-monk-text active:scale-95"
        >
          <Heading size={14} className="shrink-0" />
          <span>{t("notebook.headingLabel")}</span>
        </button>
      </div>

      {/* Row 2 — formatting */}
      <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-monk-border/40">
        {/* Bold */}
        <button
          type="button"
          onClick={() => insertFormatting("**", "**")}
          title={t("notebook.boldTooltip")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-monk-text-soft transition hover:bg-monk-soft/70 hover:text-monk-text active:scale-95"
        >
          <Bold size={13} className="shrink-0" />
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => insertFormatting("*", "*")}
          title={t("notebook.italicTooltip")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-monk-text-soft transition hover:bg-monk-soft/70 hover:text-monk-text active:scale-95"
        >
          <Italic size={13} className="shrink-0" />
        </button>

        {/* Quote */}
        <button
          type="button"
          onClick={() => insertFormatting("> ")}
          title={t("notebook.quoteTooltip")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-monk-text-soft transition hover:bg-monk-soft/70 hover:text-monk-text active:scale-95"
        >
          <Quote size={13} className="shrink-0" />
        </button>

        {/* Wiki Link */}
        <button
          type="button"
          onClick={() => insertFormatting("[[", "]]")}
          title={t("notebook.suggestLink")}
          className="flex h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-monk-text-soft transition hover:bg-monk-soft/70 hover:text-monk-text active:scale-95"
        >
          <Link2 size={13} className="shrink-0" />
          <span>[[ ]]</span>
        </button>

        {/* Photo from Gallery */}
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          title={t("notebook.addFromGallery")}
          className="flex h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-monk-text-soft transition hover:bg-monk-soft/70 hover:text-monk-text active:scale-95"
        >
          <ImagePlus size={14} className="shrink-0" />
          <span>{t("notebook.photoLabel")}</span>
        </button>

        {/* Sketchpad — the Creativity & Play pack asks the reader to draw. */}
        <button
          type="button"
          onClick={() => openDrawingPad(activePage)}
          title={t("notebook.drawTitle")}
          className="flex h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-monk-text-soft transition hover:bg-monk-soft/70 hover:text-monk-text active:scale-95"
        >
          <Palette size={14} className="shrink-0" />
          <span>{t("notebook.drawLabel")}</span>
        </button>
      </div>
      </div>

      {drawingPage !== null ? (
        <div className="mb-2.5 rounded-xl border border-monk-accent/40 bg-monk-surface/95 p-3 shadow-sm animate-scale-in">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-monk-accent">
              <Palette size={12} />
              <span>{t("notebook.drawTitle")}</span>
            </span>
            <span className="text-[10px] text-monk-muted">
              {t("notebook.drawPageNote", { n: drawingPage + 1 })}
            </span>
          </div>
          <NotebookDrawingPad
            initialDataUrl={drawingSeed}
            onSave={handleSketchSave}
            onCancel={() => setDrawingPage(null)}
          />
        </div>
      ) : null}

      {/* Wiki-link autocomplete suggestions */}
      {linkSuggestions.length > 0 && (
        <div className="mb-2.5 flex items-center gap-1.5 overflow-x-auto rounded-xl border border-monk-accent/40 bg-monk-surface/95 p-1.5 shadow-sm scrollbar-none animate-scale-in">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-monk-accent pl-1.5 shrink-0">
            <Link2 size={12} />
            <span>{t("notebook.suggestLink")}:</span>
          </span>
          {linkSuggestions.map((sug) => (
            <button
              key={sug.id}
              type="button"
              onClick={() => insertLinkSuggestion(sug.title || t("notebook.untitled"))}
              className="shrink-0 rounded-lg bg-monk-accent/15 px-2.5 py-1 text-xs font-semibold text-monk-accent transition hover:bg-monk-accent hover:text-monk-bg active:scale-95"
            >
              {sug.title || t("notebook.untitled")}
            </button>
          ))}
        </div>
      )}

      <div
        ref={sheetRef}
        className="nb-open-page nb-open-enter"
        style={{ "--nb-cat": `rgb(var(${activeCatToken}))` } as React.CSSProperties}
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
            {/* Sheet Folio Top Header - only show when multiple sheets exist */}
            {pages.length > 1 ? (
              <div className="flex items-center justify-between px-4 py-1.5 border-b border-monk-border/30 bg-monk-soft/20 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-monk-muted">
                  <span
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      activePage === i ? "bg-monk-accent scale-110 shadow-xs" : "bg-monk-text-soft/40"
                    }`}
                  />
                  <span className="font-semibold text-monk-text text-[11px]">
                  {t("notebook.sheetNumber", { n: i + 1 })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeletePage(i)}
                  aria-label={t("notebook.removePage")}
                  title={t("notebook.removePage")}
                  className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-monk-danger/80 transition hover:bg-monk-danger/10 hover:text-monk-danger active:scale-95"
                >
                  <Trash2 size={11} strokeWidth={2} />
                  <span>{t("notebook.deleteSheet")}</span>
                </button>
              </div>
            ) : null}

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
                queueResize(el);
              }}
              className="nb-page-body"
            />
            {photoIdsInBody(pg).length > 0 ? (
              <div className="nb-photo-card pb-2">
                <div
                  className={`nb-photo-grid ${
                    photoIdsInBody(pg).length >= 5
                      ? "g3"
                      : photoIdsInBody(pg).length >= 2
                        ? "g2"
                        : ""
                  }`}
                >
                  {photoIdsInBody(pg).map((imgId) => (
                    <InlinePhoto
                      key={imgId}
                      id={imgId}
                      onOpen={openPhotoInBody}
                      onDelete={handleDeletePhoto}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            <div className="nb-folio flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-monk-muted text-[11px]">
                <span>
                  {t("notebook.pageOf", { current: i + 1, total: pages.length })}
                </span>
              </div>
              {pages.some((p) => p.trim().length === 0) && pages.length > 1 && i === pages.length - 1 ? (
                <button
                  type="button"
                  onClick={cleanAllBlankPages}
                  className="flex items-center gap-1 text-[10px] font-semibold text-monk-accent hover:underline px-2 py-0.5 rounded-md hover:bg-monk-accent-soft transition"
                >
                  <Sparkles size={11} />
                  <span>{lang === "id" ? "Bersihkan Lembar Kosong" : "Clean Empty Sheets"}</span>
                </button>
              ) : null}
            </div>
          </div>
        ))}

        {/* Core Takeaway */}
        <div className="my-3 rounded-xl border border-monk-border/50 bg-monk-soft/25 p-3 transition focus-within:border-monk-accent/50 focus-within:bg-monk-soft/40">
          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-monk-accent/90 mb-1.5">
            <Sparkles size={11} />
            <span>{t("notebook.takeawayLabel")}</span>
          </label>
          <textarea
            rows={1}
            value={takeaway}
            onChange={(e) => {
              setTakeaway(e.target.value);
              markDirty();
              queueResize(e.currentTarget);
            }}
            placeholder={t("notebook.takeawayPlaceholder")}
            className="nb-takeaway-textarea w-full resize-none bg-transparent text-xs italic font-serif leading-relaxed text-monk-text placeholder:text-monk-text-soft/60 focus:outline-none"
          />
        </div>

        <div className="mt-2 mb-3">
          <button
            type="button"
            onClick={() => setPages((prev) => appendPage(prev))}
            className="flex w-full min-h-11 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-monk-border/80 bg-monk-soft/30 py-2.5 text-xs font-bold text-monk-muted transition hover:border-monk-accent hover:bg-monk-accent-soft hover:text-monk-accent active:scale-[0.99]"
          >
            <Plus size={15} strokeWidth={2.2} />
            <span>{t("notebook.addPage")}</span>
          </button>
        </div>

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

      {focusMode ? (
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setFocusMode(false)}
            className="flex min-h-10 items-center gap-1.5 rounded-full border border-monk-border bg-monk-bg/90 px-3 text-xs font-semibold text-monk-text-soft backdrop-blur-md transition hover:border-monk-accent hover:text-monk-accent"
          >
            <Minimize2 size={14} strokeWidth={1.8} />
            {t("notebook.exitFocus")}
          </button>
        </div>
      ) : (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-monk-border/70 bg-monk-bg/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md shadow-lg">
        <div className="mx-auto flex max-w-[440px] items-center justify-between gap-2">
            {entry ? (
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-xl border border-monk-danger/30 bg-monk-danger/10 px-3 py-2 text-xs font-semibold text-monk-danger hover:bg-monk-danger/20 active:scale-95 transition"
                onClick={() => setConfirmKind("delete-editor")}
              >
                <Trash2 size={13} strokeWidth={2} />
                <span>{t("notebook.delete")}</span>
              </button>
            ) : <div />}
            <div className="flex items-center gap-2">
              <SecondaryButton className="!w-auto px-4" onClick={() => handleSave(false)} disabled={!canSave}>
                {t("notebook.save")}
              </SecondaryButton>
              <PrimaryButton className="!w-auto px-5" onClick={() => handleSave(true)} disabled={!canSave}>
                {t("notebook.done")}
              </PrimaryButton>
            </div>
          </div>
      </div>
      )}

      {/* Zen Templates Dialog */}
      <CalmDialog
        open={showTemplatePicker}
        title={t("notebook.templatesTitle")}
        description={t("notebook.templatesSubtitle")}
        confirmLabel={t("dialog.confirm")}
        cancelLabel={t("dialog.cancel")}
        onConfirm={() => setShowTemplatePicker(false)}
        onCancel={() => setShowTemplatePicker(false)}
      >
        <div className="space-y-2 mt-2">
          {ZEN_NOTEBOOK_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => {
                if (!title.trim() || title === t("notebook.untitled")) {
                  setTitle(tmpl.defaultTitle(lang));
                }
                if (tmpl.defaultPara && !paraType) {
                  setParaType(tmpl.defaultPara);
                }
                const tmplPages = tmpl.defaultPages(lang);
                const activePg = pages[activePage] ?? "";
                if (!activePg.trim()) {
                  setPages((prev) => prev.map((p, idx) => (idx === activePage ? tmplPages[0] ?? "" : p)));
                } else {
                  setPages((prev) => [...prev, tmplPages[0] ?? ""]);
                  setActivePage((prev) => prev + 1);
                }
                markDirty();
                setShowTemplatePicker(false);
                hapticPress("light");
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-monk-border/60 bg-monk-surface hover:bg-monk-surface-raised hover:border-monk-accent/50 text-left transition active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-monk-soft border border-monk-border/60 text-monk-accent">
                  <TemplateIcon name={tmpl.iconName} className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-monk-text">{t(tmpl.titleKey)}</p>
                  <p className="text-[10px] text-monk-muted">{lang === "id" ? tmpl.descId : tmpl.descEn}</p>
                </div>
              </div>
              <ArrowRight size={14} className="text-monk-muted" />
            </button>
          ))}
        </div>
      </CalmDialog>

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
          clearNotebookDraft(draftKey);
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
      <ZendoProModal isOpen={proModalOpen} onClose={() => setProModalOpen(false)} />
    </div>
  );
}

