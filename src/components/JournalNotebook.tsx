import { useState, useMemo, useRef, useEffect } from "react";
import { useMonkStore } from "../store/useMonkStore";
import { Card, PrimaryButton, SecondaryButton, TextInput, Textarea, EmptyState, GhostButton } from "./ui";
import { createId } from "../lib/ids";
import { nowIso } from "../lib/date";
import type { NotebookEntry, NotebookCategory } from "../types/app";
import {
  Search,
  Plus,
  Pin,
  PinOff,
  Trash2,
  Edit3,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  cat_pribadi: "bg-[#e07c6b]",
  cat_karier: "bg-[#6b9ac4]",
  cat_keuangan: "bg-[#6bb48b]",
  cat_kesehatan: "bg-[#c48bb4]",
  cat_hubungan: "bg-[#c4a06b]",
  cat_spiritual: "bg-[#8b9dc4]",
  cat_perjalanan: "bg-[#6bc4b4]",
  cat_kreatif: "bg-[#c48b6b]",
  cat_lainnya: "bg-[#a0a0a0]",
};

export default function JournalNotebook() {
  const store = useMonkStore();
  const entries = store.notebookEntries;
  const categories = store.notebookCategories;
  const [view, setView] = useState<"list" | "edit">("list");
  const [editEntry, setEditEntry] = useState<NotebookEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCat, setFilterCat] = useState<string | null>(null);

  const sorted = useMemo(() => {
    let list = [...entries];
    if (filterCat) list = list.filter((e) => e.categoryId === filterCat);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e) => e.title.toLowerCase().includes(q) || e.body.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return list;
  }, [entries, filterCat, searchQuery]);

  if (view === "edit") return <NotebookEditor entry={editEntry} onBack={() => { setView("list"); setEditEntry(null); }} />;

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "Unknown";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };

  return (
    <div className="space-y-4">
      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setFilterCat(null)}
          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border transition ${
            !filterCat ? "bg-monk-accent-soft border-monk-accent text-monk-accent" : "bg-monk-soft border-monk-border text-monk-muted"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setFilterCat(filterCat === cat.id ? null : cat.id)}
            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border transition flex items-center gap-1.5 ${
              filterCat === cat.id ? "border-monk-accent text-monk-accent" : "border-monk-border text-monk-muted"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat.id] ?? "bg-current"}`} />
            {cat.name}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#68655e]" strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Search notebook..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full min-h-[40px] rounded-lg border border-[#2a251e] bg-[#1f1c17] pl-9 pr-4 text-sm text-[#d4cdc0] placeholder:text-[#68655e] focus:border-[#a48b5e] focus:outline-none"
        />
      </div>

      {/* Entry list */}
      {sorted.length === 0 ? (
        <div className="rounded-lg border border-[#2a251e] bg-[#1f1c17] p-8 text-center">
          <p className="font-handwriting text-2xl text-[#68655e]">Still empty...</p>
          <p className="mt-2 text-sm text-[#68655e]">Start writing your first note.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((entry) => {
            const cat = categories.find((c) => c.id === entry.categoryId);
            const preview = entry.body.replace(/\n/g, " ").slice(0, 120);
            const catColor = CATEGORY_COLORS[entry.categoryId] ?? "bg-[#a0a0a0]";
            return (
              <div key={entry.id} className="notebook-card p-4 relative overflow-hidden">
                {/* Category color stripe on left */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${catColor}`} />

                <div className="flex items-start justify-between gap-3 pl-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {entry.isPinned ? <Pin size={12} className="text-[#a48b5e]" strokeWidth={1.5} /> : null}
                      <p className="notebook-card-title truncate">{entry.title || "Untitled"}</p>
                    </div>
                    <p className="notebook-card-body mt-0.5 line-clamp-3">{preview}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      {cat ? <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white ${catColor}`}>{cat.name}</span> : null}
                      <span className="text-[10px] text-[#68655e]">{new Date(entry.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => { store.togglePinNotebookEntry(entry.id); }}
                      className="grid h-8 w-8 place-items-center rounded-full text-[#68655e] hover:text-[#a48b5e] hover:bg-[#2a251e] transition"
                    >
                      {entry.isPinned ? <PinOff size={14} strokeWidth={1.5} /> : <Pin size={14} strokeWidth={1.5} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditEntry(entry); setView("edit"); }}
                      className="grid h-8 w-8 place-items-center rounded-full text-[#68655e] hover:text-[#a48b5e] hover:bg-[#2a251e] transition"
                    >
                      <Edit3 size={14} strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { store.deleteNotebookEntry(entry.id); }}
                      className="grid h-8 w-8 place-items-center rounded-full text-[#c48b6b] hover:bg-[#2a251e] transition"
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={() => {
          const firstCat = categories[0];
          setEditEntry({
            id: createId("nb_entry"),
            title: "",
            body: "",
            categoryId: firstCat?.id ?? "cat_lainnya",
            tags: [],
            isPinned: false,
            createdAt: nowIso(),
            updatedAt: nowIso(),
          });
          setView("edit");
        }}
        className="fixed bottom-24 right-6 grid h-14 w-14 place-items-center rounded-full bg-[#a48b5e] text-white shadow-lg hover:bg-[#a48b5e]/90 active:scale-90 transition z-40"
        aria-label="New notebook entry"
      >
        <Plus size={24} strokeWidth={2} />
      </button>
    </div>
  );
}

export function NotebookEditor({ entry, onBack }: { entry: NotebookEntry | null; onBack: () => void }) {
  const store = useMonkStore();
  const categories = store.notebookCategories;
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(entry?.title ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  const [catId, setCatId] = useState(entry?.categoryId ?? categories[0]?.id ?? "cat_lainnya");
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const handleSave = () => {
    const timestamp = nowIso();
    store.saveNotebookEntry({
      id: entry?.id ?? createId("nb_entry"),
      title: title.trim(),
      body,
      categoryId: catId,
      tags: entry?.tags ?? [],
      isPinned: entry?.isPinned ?? false,
      createdAt: entry?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
    onBack();
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <input
        ref={titleRef}
        type="text"
        placeholder="Entry title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-transparent font-handwriting text-2xl text-[#e5e2da] placeholder:text-[#68655e] border-none outline-none focus:outline-none"
      />

      {/* Category tabs as colored sticky notes */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => {
          const isActive = catId === cat.id;
          const color = CATEGORY_COLORS[cat.id] ?? "bg-[#a0a0a0]";
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCatId(cat.id)}
              className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white transition ${color} ${isActive ? "ring-2 ring-offset-1 ring-offset-[#1a1814] ring-[#a48b5e]" : "opacity-70 hover:opacity-100"}`}
            >
              {cat.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowNewCat(!showNewCat)}
          className="rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-dashed border-[#2a251e] text-[#68655e] hover:text-[#a48b5e]"
        >
          + New
        </button>
      </div>

      {showNewCat ? (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Category name..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="flex-1 rounded-lg border border-[#2a251e] bg-[#1f1c17] px-3 py-2 text-sm text-[#d4cdc0] placeholder:text-[#68655e] focus:border-[#a48b5e] focus:outline-none"
          />
          <PrimaryButton
            className="shrink-0"
            onClick={() => {
              if (newCatName.trim()) {
                store.addNotebookCategory(newCatName.trim());
                setNewCatName("");
                setShowNewCat(false);
              }
            }}
          >
            Add
          </PrimaryButton>
        </div>
      ) : null}

      {/* Writing area — ruled paper */}
      <div className="notebook-card p-4">
        <textarea
          placeholder="Write whatever is on your mind..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full bg-transparent notebook-card-body border-none outline-none resize-none min-h-[350px]"
          style={{ lineHeight: "2rem", backgroundImage: "none" }}
        />
      </div>

      <div className="flex gap-3 pb-8">
        <SecondaryButton onClick={onBack} className="flex-1">Cancel</SecondaryButton>
        <PrimaryButton
          onClick={handleSave}
          disabled={!title.trim()}
          className="flex-1">Save Entry
        </PrimaryButton>
      </div>
    </div>
  );
}