import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useMonkStore } from "../store/useMonkStore";
import { PrimaryButton, SecondaryButton, GhostButton, CalmDialog } from "./ui";
import { createId } from "../lib/ids";
import { nowIso } from "../lib/date";
import type { NotebookEntry } from "../types/app";
import { Search, Plus, Pin, PinOff, Trash2, ArrowLeft, X } from "lucide-react";
import { useT, useLanguage, type MessageKey } from "../i18n";

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

function catHex(id: string) {
  return CATEGORY_HEX[id] ?? "#a48b5e";
}

function wordCount(text: string) {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

function previewBody(body: string, t: Translate, max = 110) {
  const flat = body.replace(/\s+/g, " ").trim();
  if (!flat) return t("notebook.noBody");
  return flat.length > max ? `${flat.slice(0, max).trim()}…` : flat;
}

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

  return (
    <div className="relative space-y-4 pb-24">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-monk-muted">
            {t("notebook.collection")}
          </p>
          <p className="mt-0.5 text-sm text-monk-text-soft">
            {entries.length === 0
              ? t("notebook.noneYet")
              : pinnedCount
                ? t("notebook.countPinned", { n: entries.length, p: pinnedCount })
                : t("notebook.count", { n: entries.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="hidden min-h-10 items-center gap-1.5 rounded-full border border-monk-accent/40 bg-monk-accent-soft px-3 text-xs font-bold text-monk-accent transition active:scale-95 sm:inline-flex"
        >
          <Plus size={14} strokeWidth={2} />
          {t("notebook.new")}
        </button>
      </div>

      <div className="relative">
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
          className="w-full min-h-11 rounded-monk border border-monk-border bg-monk-surface pl-9 pr-10 text-sm text-monk-text placeholder:text-monk-text-soft focus:border-monk-accent focus:outline-none"
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

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setFilterCat(null)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
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
              className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition"
              style={{
                borderColor: isActive ? hex : undefined,
                color: isActive ? hex : undefined,
                backgroundColor: isActive ? `${hex}18` : undefined
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
        <div className="notebook-empty rounded-monk border border-monk-border bg-monk-surface/60 px-6 py-12 text-center">
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
          {sorted.map((entry) => {
            const hex = catHex(entry.categoryId);
            const cat = categories.find((c) => c.id === entry.categoryId);
            return (
              <article
                key={entry.id}
                className="notebook-card group relative overflow-hidden rounded-monk p-4 transition hover:border-monk-border-strong"
                style={{ borderLeftColor: hex }}
              >
                <button
                  type="button"
                  onClick={() => openEdit(entry)}
                  className="w-full text-left"
                >
                  <div className="mb-1.5 flex items-start justify-between gap-3">
                    <h3 className="notebook-card-title min-w-0 flex-1 pr-2">
                      {entry.title || t("notebook.untitled")}
                    </h3>
                    {entry.isPinned ? (
                      <Pin size={14} className="mt-1 shrink-0 text-monk-accent" strokeWidth={2} />
                    ) : null}
                  </div>
                  <p className="notebook-card-body line-clamp-3 min-h-[1.5rem]">
                    {previewBody(entry.body, t)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-monk-text-soft">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-semibold uppercase tracking-wide"
                      style={{ borderColor: `${hex}55`, color: hex }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: hex }} />
                      {cat?.name ?? t("notebook.other")}
                    </span>
                    <span className="font-mono">{formatRelative(entry.updatedAt, t, dateLocale)}</span>
                    <span className="font-mono opacity-70">{t("notebook.words", { n: wordCount(entry.body) })}</span>
                  </div>
                </button>

                <div className="mt-3 flex items-center justify-end gap-1 border-t border-monk-border/40 pt-2">
                  <button
                    type="button"
                    aria-label={entry.isPinned ? t("notebook.unpin") : t("notebook.pin")}
                    onClick={() => store.togglePinNotebookEntry(entry.id)}
                    className="grid min-h-10 min-w-10 place-items-center rounded-full text-monk-muted transition hover:bg-monk-soft hover:text-monk-accent"
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
                    className="grid min-h-10 min-w-10 place-items-center rounded-full text-monk-muted transition hover:bg-monk-danger-soft hover:text-monk-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={openNew}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+88px)] right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-monk-accent text-monk-bg shadow-[0_8px_24px_rgba(164,139,94,0.35)] transition active:scale-90"
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
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState(entry?.title ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  const [catId, setCatId] = useState(entry?.categoryId ?? categories[0]?.id ?? "cat_lainnya");
  const [isPinned, setIsPinned] = useState(entry?.isPinned ?? false);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmKind, setConfirmKind] = useState<"leave" | "delete-editor" | null>(null);
  const entryIdRef = useRef(entry?.id ?? createId("nb_entry"));
  const createdAtRef = useRef(entry?.createdAt ?? nowIso());

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const markDirty = () => setDirty(true);

  const resolveTitle = useCallback(() => {
    const trimmed = title.trim();
    if (trimmed) return trimmed;
    const firstLine = body
      .split("\n")
      .map((l) => l.trim())
      .find(Boolean);
    if (firstLine) return firstLine.slice(0, 80);
    return t("notebook.untitled");
  }, [title, body, t]);

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
        createdAt: createdAtRef.current,
        updatedAt: timestamp
      });
      setDirty(false);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1200);
      if (andBack) onBack();
    },
    [body, catId, entry?.tags, isPinned, onBack, resolveTitle, store]
  );

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
      <div className="mb-4 flex items-center justify-between border-b border-monk-border py-3">
        <button
          type="button"
          onClick={handleBack}
          className="flex min-h-10 items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-monk-muted transition hover:text-monk-accent"
        >
          <ArrowLeft size={13} strokeWidth={1.5} />
          {t("notebook.back")}
        </button>
        <div className="flex items-center gap-2 text-[10px] font-mono text-monk-text-soft">
          {savedFlash ? (
            <span className="text-monk-success">{t("notebook.saved")}</span>
          ) : dirty ? (
            <span className="text-monk-warning">{t("notebook.unsaved")}</span>
          ) : entry ? (
            <span>{formatRelative(entry.updatedAt, t, dateLocale)}</span>
          ) : (
            <span>{t("notebook.newNote")}</span>
          )}
          <span className="opacity-40">·</span>
          <span>
            {new Date().toLocaleDateString(dateLocale, {
              day: "numeric",
              month: "short",
              year: "numeric"
            })}
          </span>
        </div>
      </div>

      <input
        ref={titleRef}
        type="text"
        placeholder={t("notebook.titlePlaceholder")}
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          markDirty();
        }}
        className="mb-3 w-full border-none bg-transparent font-handwriting text-[1.7rem] leading-tight text-monk-text outline-none placeholder:text-monk-text-soft/50 focus:outline-none"
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {categories.map((cat) => {
          const hex = catHex(cat.id);
          const active = catId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCatId(cat.id);
                markDirty();
              }}
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition"
              style={{
                borderColor: active ? hex : undefined,
                color: active ? hex : undefined,
                backgroundColor: active ? `${hex}18` : undefined
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: hex }} />
              {cat.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowNewCat((v) => !v)}
          className="rounded-full border border-dashed border-monk-border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-monk-muted hover:border-monk-accent hover:text-monk-accent"
        >
          {t("notebook.addCategory")}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsPinned((v) => !v);
            markDirty();
          }}
          className={`ml-auto flex min-h-9 items-center gap-1 rounded-full border px-2.5 text-[11px] font-bold uppercase tracking-wider transition ${
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
        <div className="mb-4 flex items-center gap-2">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
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

      <div
        className="notebook-card rounded-monk p-0"
        style={{ borderLeftWidth: 3, borderLeftColor: activeCatHex }}
      >
        <textarea
          ref={bodyRef}
          placeholder={t("notebook.bodyPlaceholder")}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            markDirty();
          }}
          className="notebook-card-body min-h-[min(56vh,420px)] w-full resize-y border-none bg-transparent px-4 py-4 outline-none"
          style={{ lineHeight: "2rem" }}
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-monk-border bg-monk-bg/95 px-6 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[430px] items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-monk-text-soft">
            <span>{t("notebook.words", { n: words })}</span>
            {dirty ? <span className="ml-2 text-monk-warning">· {t("notebook.draft")}</span> : null}
          </div>
          <div className="flex items-center gap-2">
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
    </div>
  );
}
