import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Regression test for the Settings-screen legal disclosure. It is source-level
// and DOM-free on purpose: it reads the real files from disk so the disclosure
// cannot silently disappear, drop a translation, ship a broken link, or leave an
// unfinished draft in front of a reader.

const SETTINGS = "src/screens/SettingsScreen.tsx";
const CATALOGS = {
  en: "src/i18n/messages/en.ts",
  id: "src/i18n/messages/id.ts"
} as const;

// Every locale the legal pages must exist in. Static pages ship per language, so
// each locale is a real file tree rather than a query parameter.
const LEGAL_LOCALES = ["en", "id"] as const;

// Static-page path for a locale + document, mirroring legalHref() in Settings.
function legalPage(locale: "en" | "id", doc: "terms" | "privacy"): string {
  return locale === "id" ? `public/id/${doc}.html` : `public/${doc}.html`;
}

function src(path: string): string {
  return readFileSync(path, "utf8");
}

// Reads a page or throws a clear message if an agent deletes it.
function page(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    throw new Error(`missing legal page: ${path}`);
  }
}

// Everything a reader would actually see: HTML comments, <style>/<script>
// bodies, and class/id attributes stripped. TODO(owner) annotations and the
// .placeholder CSS rule are deliberate scaffolding, so they must not trip the
// unfinished-draft scan below.
function readable(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/\b(?:class|id)\s*=\s*"[^"]*"/gi, " ")
    .replace(/\b(?:class|id)\s*=\s*'[^']*'/gi, " ");
}

function headings(html: string, level: 1 | 2 | 3 = 2): string[] {
  const out: string[] = [];
  const re = new RegExp(`<h${level}[^>]*>([\\s\\S]*?)</h${level}>`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push(m[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
  }
  return out;
}

// Anchor ids, in document order. Deep links and the table of contents depend on
// these, so they must be byte-identical across translations.
function anchorIds(html: string): string[] {
  const out: string[] = [];
  const re = /\bid\s*=\s*"([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

// Every internal link target on the page, minus pure in-page fragments.
function internalHrefs(html: string): string[] {
  const out = new Set<string>();
  const re = /\bhref\s*=\s*"(\/[^"]*)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].split("#")[0].split("?")[0];
    if (href) out.add(href);
  }
  return [...out];
}

// A published static link resolves to a real file under public/ (or to the app
// root, which the SPA serves). Anything else is a 404 for the reader.
function linkResolves(href: string): boolean {
  if (href === "/") return true;
  if (!href.endsWith(".html")) return false;
  return existsSync(`public${href}`);
}

// Parses `"key": "value"` entries out of a message catalog module.
function catalog(path: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /^\s*"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src(path))) !== null) map.set(m[1], m[2]);
  return map;
}

// Every i18n key the Settings legal section actually renders.
function settingsLegalKeys(): string[] {
  const found = new Set<string>();
  const re = /["'](settings\.legal[A-Za-z0-9]*)["']/g;
  let m: RegExpExecArray | null;
  const s = src(SETTINGS);
  while ((m = re.exec(s)) !== null) found.add(m[1]);
  return [...found];
}

describe("Settings screen links to both legal destinations", () => {
  const s = src(SETTINGS);

  it("anchors a Terms of Service link and a Privacy Policy link", () => {
    expect(s, "Terms link missing").toMatch(/href=\{legalHref\([^)]*"terms"/);
    expect(s, "Privacy link missing").toMatch(/href=\{legalHref\([^)]*"privacy"/);
  });

  it("resolves the link per UI language instead of a query parameter", () => {
    // The static pages are per-locale files, so the helper must map id -> /id/
    // and en -> the root. A ?lang= parameter would be ignored by the pages.
    expect(s, "legalHref helper missing").toContain("function legalHref");
    expect(s).toContain("/id/${doc}.html");
    expect(s).toContain("/${doc}.html");
    expect(s, "stale ?lang= link").not.toMatch(/\.html\?lang=/);
  });

  it("gives each legal link an accessible name", () => {
    expect(s).toMatch(/aria-label=\{[^}]*settings\.legalTermsAria/);
    expect(s).toMatch(/aria-label=\{[^}]*settings\.legalPrivacyAria/);
    expect(s).toContain("settings.legalTerms");
    expect(s).toContain("settings.legalPrivacy");
  });
});

describe("Settings legal copy is translated in every locale", () => {
  const keys = settingsLegalKeys();
  const en = catalog(CATALOGS.en);
  const id = catalog(CATALOGS.id);

  it("the section actually references legal keys", () => {
    expect(keys.length, "no settings.legal* keys in SettingsScreen").toBeGreaterThan(0);
  });

  for (const key of settingsLegalKeys()) {
    it(`${key} exists in both catalogs`, () => {
      expect(en.has(key), `en missing ${key}`).toBe(true);
      expect(id.has(key), `id missing ${key}`).toBe(true);
    });

    it(`${key} has real Indonesian copy, not an English fallback`, () => {
      expect(en.get(key), `en empty ${key}`).toBeTruthy();
      expect(id.get(key), `id empty ${key}`).toBeTruthy();
      expect(id.get(key), `id leaks English for ${key}`).not.toBe(en.get(key));
    });
  }

  it("every legal key present in one catalog is present in the other", () => {
    for (const key of keys) {
      expect(en.has(key), `en missing ${key}`).toBe(true);
      expect(id.has(key), `id missing ${key}`).toBe(true);
    }
  });
});

describe.each(LEGAL_LOCALES)("%s legal pages", (locale) => {
  const paths = {
    terms: legalPage(locale, "terms"),
    privacy: legalPage(locale, "privacy")
  } as const;

  for (const [doc, path] of Object.entries(paths)) {
    describe(`${doc} (${path})`, () => {
      const html = page(path);

      it("exists with a doctype, a title, and the right lang", () => {
        expect(html, "no doctype").toMatch(/<!doctype html>/i);
        const title = html.match(/<title>\s*([^<]+?)\s*<\/title>/i);
        expect(title?.[1]?.trim(), "no non-empty <title>").toBeTruthy();
        expect(html).toMatch(new RegExp(`<html[^>]*\\blang="${locale}"`, "i"));
      });

      it('carries a "Last updated" line with the pinned date', () => {
        expect(readable(html)).toMatch(/last\s+updated|terakhir\s+diperbarui/i);
        expect(html, "version/date drifted from SettingsScreen").toContain("2026-10-04");
      });

      it("contains no unfinished-draft token in visible prose", () => {
        const body = readable(html);
        expect(body, "bare TODO leak in prose").not.toMatch(/\bTODO\b/);
        expect(body, "lorem ipsum leak").not.toMatch(/lorem/i);
        expect(body, "unfilled [placeholder] visible to the reader").not.toMatch(
          /\[placeholder\]/i
        );
        expect(body, "unfilled {{token}} visible to the reader").not.toMatch(/\{\{[^}]+\}\}/);
      });

      it("every internal link resolves to a page that exists", () => {
        const broken = internalHrefs(html).filter((href) => !linkResolves(href));
        expect(broken, `dead links on ${path}: ${broken.join(", ")}`).toEqual([]);
      });

      it("links to the other document and back to the app", () => {
        const hrefs = internalHrefs(html);
        const other = doc === "terms" ? "privacy" : "terms";
        expect(hrefs).toContain(`/${locale === "id" ? "id/" : ""}${other}.html`);
        expect(hrefs).toContain("/");
      });
    });
  }
});

describe("translations stay structurally in step with the English source", () => {
  for (const doc of ["terms", "privacy"] as const) {
    it(`${doc}: Indonesian has the same section count and anchor ids`, () => {
      const en = page(legalPage("en", doc));
      const id = page(legalPage("id", doc));
      expect(headings(id, 2).length, "h2 count differs").toBe(headings(en, 2).length);
      expect(anchorIds(id), "anchor ids differ — deep links would break").toEqual(
        anchorIds(en)
      );
    });
  }

  it("terms: every numbered clause survives translation", () => {
    const numbers = (html: string) =>
      headings(html, 2)
        .map((h) => h.match(/^\s*(\d{2})\b/)?.[1])
        .filter(Boolean);
    expect(numbers(page(legalPage("id", "terms")))).toEqual(
      numbers(page(legalPage("en", "terms")))
    );
    expect(numbers(page(legalPage("en", "terms"))).length).toBe(14);
  });

  it("privacy: the required disclosures are present in both languages", () => {
    const required = {
      en: [/(what\s+we\s+collect|storage\s+modes)/i, /sharing|third[- ]part/i, /rights/i, /retention|how\s+long/i],
      id: [/data|yang\s+kami/i, /pihak\s+ketiga|berbagi/i, /hak/i, /disimpan|retensi|berapa\s+lama/i]
    } as const;

    for (const locale of LEGAL_LOCALES) {
      const text = headings(page(legalPage(locale, "privacy")), 2).join("\n");
      for (const pattern of required[locale]) {
        expect(text, `${locale} privacy missing ${pattern}`).toMatch(pattern);
      }
    }
  });
});

describe("legal pages cover the required sections", () => {
  it("Terms of Service has an acceptable-use section", () => {
    expect(headings(page(legalPage("en", "terms"))).join("\n")).toMatch(/acceptable\s+use/i);
  });

  it("Terms of Service has a limitation-of-liability section", () => {
    expect(headings(page(legalPage("en", "terms"))).join("\n")).toMatch(
      /limitation\s+of\s+liability/i
    );
  });
});