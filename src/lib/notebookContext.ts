import type { NotebookCategory, ParaType } from "../types/app";

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
  entry?: { paraType?: ParaType; categoryId?: string } | null;
  /** Template yang dipilih dari dialog "Mulai Menulis". */
  template?: { defaultPara?: ParaType; defaultCategory?: string } | null;
  /** Konteks layar: tab PARA yang sedang difilter. */
  initialPara?: ParaType;
  /** Konteks layar: chip kategori yang sedang difilter. */
  initialCategoryId?: string;
  /** Kategori yang benar-benar ada di store; id asing harus diabaikan. */
  categories?: Pick<NotebookCategory, "id">[];
  /** Fallback terakhir bila daftar kategori kosong. */
  fallbackCategoryId?: string;
};

export function resolveInitialPara(sources: NotebookContextSources): ParaType | undefined {
  if (sources.draftWins && sources.draft?.paraType) return sources.draft.paraType;
  // Note yang sudah ada selalu memakai PARA-nya sendiri — termasuk "belum
  // diberi PARA". Tanpa early return ini, membuka note lama dari tab Projects
  // akan diam-diam memberinya label Projects saat disimpan.
  if (sources.entry) return sources.entry.paraType;
  if (sources.template?.defaultPara) return sources.template.defaultPara;
  return sources.initialPara;
}

export function resolveInitialCategoryId(sources: NotebookContextSources): string {
  const categories = sources.categories ?? [];
  const known = (id: string | undefined): boolean =>
    Boolean(id) && categories.some((c) => c.id === id);

  const draftCat = sources.draft?.categoryId;
  if (sources.draftWins && known(draftCat)) return draftCat as string;

  const entryCat = sources.entry?.categoryId;
  if (known(entryCat)) return entryCat as string;

  const templateCat = sources.template?.defaultCategory;
  if (known(templateCat)) return templateCat as string;

  if (known(sources.initialCategoryId)) return sources.initialCategoryId as string;

  return categories[0]?.id ?? sources.fallbackCategoryId ?? "cat_lainnya";
}
