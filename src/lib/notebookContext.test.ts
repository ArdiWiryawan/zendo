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

  it("note lama tanpa PARA tidak menyerap tab yang sedang dibuka", () => {
    expect(resolveInitialPara({ ...base, initialPara: "project", entry: {} })).toBeUndefined();
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
