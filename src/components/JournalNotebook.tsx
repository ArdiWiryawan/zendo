import { useState, useMemo, useRef, useEffect } from "react";
import { useMonkStore } from "../store/useMonkStore";
import { PrimaryButton, SecondaryButton } from "./ui";
import { createId } from "../lib/ids";
import { nowIso } from "../lib/date";
import type { NotebookEntry } from "../types/app";
import { Search, Plus, Pin, PinOff, Trash2, Edit3, ArrowLeft } from "lucide-react";

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

const CATEGORY_HEX: Record<string, string> = {
  cat_pribadi: "#e07c6b",
  cat_karier: "#6b9ac4",
  cat_keuangan: "#6bb48b",
  cat_kesehatan: "#c48bb4",
  cat_hubungan: "#c4a06b",
  cat_spiritual: "#8b9dc4",
  cat_perjalanan: "#6bc4b4",
  cat_kreatif: "#c48b6b",
  cat_lainnya: "#a0a0a0",
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

  if (view === "edit") return (
    <NotebookEditor
      entry={editEntry}
      onBack={() => { setView("list"); setEditEntry(null); }}
    />
  );

  return (
    <div className="space-y-4">
      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setFilterCat(null)}
          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border transition ${
            !filterCat ? "bg-monk-accent-soft border-monk-accent text-monk-accent" : "border-[#2a251e] text-[#68655e] hover:text-[#a48b5e]"
          }`}
        >
          All
        </button>
        {categories.map((cat) => {
          const hex = CATEGORY_HEX[cat.id] ?? "#a0a0a0";
          const isActive = filterCat === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCat(isActive ? null : cat.id)}
              className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border transition flex items-center gap-1.5"
              style={{
                borderColor: isActive ? hex : "#2a251e",
                color: isActive ? hex : "#68655e",
                backgroundColor: isActive ? `${hex}18` : "transparent",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hex }} />
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#68655e]" strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Cari catatan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full min-h-[40px] rounded-lg border border-[#2a251e] bg-[#1f1c17] pl-9 pr-4 text-sm text-[#d4cdc0] placeholder:text-[#68655e] focus:border-[#a48b5e] focus:outline-none"
        />
      </div>

      {/* Entry list */}
      {sorted.length === 0 ? (
        <div className="rounded-lg border border-[#2a251e] bg-[#1a1814] p-10 text-center">
          <p className="font-handwriting text-3xl text-[#4a4640] mb-2">Masih kosong...</p>
          <p className="text-xs text-[#68655e]">Tulis catatan pertamamu.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((entry) => {
            const cat = categories.find((c) => c.id === entry.categoryId);
            const preview = entry.body.replace(/\n/g, " ").slice(0, 100);
            const catHex = CATEGORY_HEX[entry.categoryId] ?? "#a0a0a0";
            return (
              <div
                key={entry.id}
                className="notebook-card p-4 relative"
                style={{ borderLeftColor: catHex, borderLeftWidth: 3 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left"
                    onClick={() => { setEditEntry(entry); setView("edit"); }}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      {entry.isPinned ? <Pin size={11} className="text-[#a48b5e] shrink-0" strokeWidth={1.5} /> : null}
                      <p className="notebook-card-title truncate">{entry.title || "Tanpa judul"}</p>
                    </div>
                    {preview ? (
                      <p className="notebook-card-body line-clamp-2 text-[13px]">{preview}</p>
                    ) : null}
                    <div className="mt-1.5 flex items-center gap-2">
                      {cat ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: catHex, backgroundColor: `${catHex}20` }}
                        >
                          {cat.name}
                        </span>
                      ) : null}
                      <span className="text-[10px] text-[#4a4640]">
                        {new Date(entry.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center shrink-0">
                    <button
                      type="button"
                      onClick={() => store.togglePinNotebookEntry(entry.id)}
                      className="grid h-8 w-8 place-items-center rounded-full text-[#68655e] hover:text-[#a48b5e] hover:bg-[#2a251e] transition"
                    >
                      {entry.isPinned ? <PinOff size={13} strokeWidth={1.5} /> : <Pin size={13} strokeWidth={1.5} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => store.deleteNotebookEntry(entry.id)}
                      className="grid h-8 w-8 place-items-center rounded-full text-[#68655e] hover:text-[#c48b6b] hover:bg-[#2a251e] transition"
                    >
                      <Trash2 size={13} strokeWidth={1.5} />
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
        aria-label="Catatan baru"
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

  useEffect(() => { titleRef.current?.focus(); }, []);

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

  const activeCatHex = CATEGORY_HEX[catId] ?? "#6b9ac4";

  return (
    <div className="space-y-0 pb-8">
      {/* Header bar */}
      <div className="flex items-center justify-between py-3 border-b border-[#2a251e] mb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-[#68655e] hover:text-[#a48b5e] transition text-[11px] uppercase tracking-wider font-mono"
        >
          <ArrowLeft size={13} strokeWidth={1.5} />
          Kembali
        </button>
        <span className="text-[10px] text-[#4a4640] font-mono">
          {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>

      {/* Title — big, handwriting */}
      <input
        ref={titleRef}
        type="text"
        placeholder="Judul catatan..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-transparent font-handwriting text-[1.6rem] leading-tight text-[#e5e2da] placeholder:text-[#4a4640] border-none outline-none focus:outline-none mb-4"
      />

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {categories.map((cat) => {
          const isActive = catId === cat.id;
          const hex = CATEGORY_HEX[cat.id] ?? "#a0a0a0";
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCatId(cat.id)}
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition"
              style={{
                backgroundColor: isActive ? hex : `${hex}20`,
                color: isActive ? "#fff" : hex,
                outline: isActive ? `2px solid ${hex}` : "none",
                outlineOffset: "2px",
              }}
            >
              {cat.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowNewCat(!showNewCat)}
          className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-dashed border-[#2a251e] text-[#68655e] hover:text-[#a48b5e] transition"
        >
          + Baru
        </button>
      </div>

      {showNewCat ? (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Nama kategori..."
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
            Tambah
          </PrimaryButton>
        </div>
      ) : null}

      {/* Writing area — left border matches active category */}
      <div
        className="notebook-card rounded-none p-4"
        style={{ borderLeftWidth: 3, borderLeftColor: activeCatHex }}
      >
        <textarea
          placeholder="Tulis bebas..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full bg-transparent notebook-card-body border-none outline-none resize-none min-h-[360px] pl-4"
          style={{ lineHeight: "2rem" }}
        />
      </div>

      {/* Save / word count row */}
      <div className="flex items-center justify-between pt-4">
        <span className="text-[10px] text-[#4a4640] font-mono">
          {body.trim() ? body.trim().split(/\s+/).length : 0} kata
        </span>
        <PrimaryButton onClick={handleSave} disabled={!title.trim()}>
          Simpan
        </PrimaryButton>
      </div>
    </div>
  );
}
