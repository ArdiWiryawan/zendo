import { describe, expect, it } from "vitest";
import { autolistMarker, groupPhotoRuns, renderBodyMarkdown } from "./notebookMarkdown";
import { renderToStaticMarkup } from "react-dom/server";

function html(body: string): string {
  return renderToStaticMarkup(<>{renderBodyMarkdown(body)}</>);
}

function htmlGrouped(body: string): string {
  return renderToStaticMarkup(<>{groupPhotoRuns(renderBodyMarkdown(body))}</>);
}

describe("autolistMarker", () => {
  it("continues bullets", () => {
    expect(autolistMarker("- x")).toBe("- ");
    expect(autolistMarker("* x")).toBe("* ");
  });
  it("continues numbered lists with increment", () => {
    expect(autolistMarker("3. x")).toBe("4. ");
    expect(autolistMarker("9) x")).toBe("10) ");
  });
  it("continues tasks", () => {
    expect(autolistMarker("[ ] x")).toBe("[ ] ");
    expect(autolistMarker("[x] x")).toBe("[ ] ");
  });
  it("preserves indentation", () => {
    expect(autolistMarker("  - x")).toBe("  - ");
  });
  it("returns empty marker to end an empty item", () => {
    expect(autolistMarker("- ")).toBe("");
    expect(autolistMarker("1. ")).toBe("");
  });
  it("returns null for plain lines and bare markers", () => {
    expect(autolistMarker("plain")).toBeNull();
    expect(autolistMarker("-")).toBeNull();
    expect(autolistMarker("1.")).toBeNull();
  });
});

describe("renderBodyMarkdown", () => {
  it("groups consecutive bullets into one list", () => {
    const out = html("- a\n- b");
    expect(out).toContain("<ul");
    expect(out.match(/<li/g)?.length).toBe(2);
  });
  it("auto-increments numbered lists from first declared number", () => {
    expect(html("2. a\n9. b")).toContain(">2. a<");
    expect(html("2. a\n9. b")).toContain(">3. b<");
  });
  it("renumbers 2.2.2. into 2.3.4.", () => {
    const out = html("2. a\n2. b\n2. c");
    expect(out).toContain(">2. a<");
    expect(out).toContain(">3. b<");
    expect(out).toContain(">4. c<");
  });
  it("renders task items checked/unchecked", () => {
    const out = html("[x] done\n[ ] todo");
    expect(out).toContain('class="md-task-box checked"');
    expect(out).toContain('class="md-task-box"');
  });
  it("renders headings in handwriting class", () => {
    const out = html("### Hi");
    expect(out).toContain('<h3 class="md-heading font-handwriting">');
    expect(out).toContain(">Hi<");
  });
  it("splits lists on blank lines", () => {
    const out = html("- a\n\n- b");
    expect(out.match(/<ul/g)?.length).toBe(2);
  });
  it("renders bare markers as plain text", () => {
    expect(html("-")).toContain("<p");
    expect(html("1.")).toContain("<p");
  });
  it("returns empty for empty body", () => {
    expect(renderBodyMarkdown("")).toHaveLength(0);
  });
  it("renders a plain line as a paragraph", () => {
    expect(html("just words")).toContain('<p class="md-para">');
  });
  it("closes lists on heading and reopens after", () => {
    const out = html("- a\n### T\n- b");
    expect(out).toContain("<h3");
    expect(out.match(/<ul/g)?.length).toBe(2);
  });
  it("renders a {{img:…}} marker line as an inline photo button", () => {
    const out = html("text\n{{img:abc123}}\nmore");
    expect(out).toContain('class="nb-inline-photo"');
    expect(out).toContain('data-photo-id="abc123"');
  });
  it("keeps a photo marker out of list/paragraph nodes", () => {
    const out = html("{{img:xyz99}}\nplain");
    expect(out).toContain('class="nb-inline-photo"');
    expect(out).toContain('<p class="md-para">');
  });
  it("renders multiple photos in order above and below text", () => {
    const out = html("first\n{{img:a}}\nsecond\n{{img:b}}\nlast");
    expect(out.indexOf("first")).toBeLessThan(out.indexOf("nb-inline-photo"));
    const first = out.indexOf("nb-inline-photo");
    const second = out.indexOf("nb-inline-photo", first + 1);
    expect(second).toBeGreaterThan(first);
    expect(out.indexOf("nb-inline-photo", second + 1)).toBe(-1); // exactly two
  });
  it("collapses marker lines entirely when omitPhotos (list/cover mode)", () => {
    const out = renderToStaticMarkup(
      <>{renderBodyMarkdown("first\n{{img:a}}\nsecond", undefined, true)}</>
    );
    expect(out).not.toContain("nb-inline-photo");
    expect(out).toContain("first");
    expect(out).toContain("second");
  });
  it("renders inline strong/em/del/code in one paragraph", () => {
    const out = html("**b** *i* ~~s~~ `c`");
    expect(out).toContain("<strong>");
    expect(out).toContain("<em>");
    expect(out).toContain("<del>");
    expect(out).toContain('<code class="md-code-inline">');
    expect(out).toContain(">c<");
  });
  it("keeps inline code raw (no markdown inside backticks)", () => {
    const out = html("`**not bold**`");
    expect(out).not.toContain("<strong>");
    expect(out).toContain('<code class="md-code-inline">**not bold**</code>');
  });
  it("renders safe links and neutralizes dangerous schemes", () => {
    const safe = html("[x](https://a.b)");
    expect(safe).toContain('<a href="https://a.b" target="_blank" rel="noreferrer noopener">');
    const bad = html("[x](javascript:alert(1))");
    expect(bad).not.toContain("<a");
    expect(bad).toContain(">x<");
  });
  it("groups consecutive blockquote lines and splits on blank lines", () => {
    const one = html("> a\n> b");
    expect(one.match(/<blockquote/g)?.length).toBe(1);
    expect(one.match(/<p/g)?.length).toBe(2);
    const split = html("> a\n\nplain");
    expect(split.match(/<blockquote/g)?.length).toBe(1);
    expect(split).toContain("<p");
  });
  it("renders fenced code raw, suppressing photos and headings inside", () => {
    const out = html("```js\na\n{{img:x}}\n# h\n```");
    expect(out).toContain('<pre class="md-code">');
    expect(out).toContain("{{img:x}}");
    expect(out).toContain("# h");
    expect(out).not.toContain("nb-inline-photo");
    expect(out).not.toContain("<h");
  });
  it("consumes an unclosed fence to EOF", () => {
    const out = html("```\n{{img:x}}\n**b**");
    expect(out).toContain('<pre class="md-code">');
    expect(out).toContain("**b**");
    expect(out).not.toContain("<strong>");
    expect(out).not.toContain("nb-inline-photo");
  });
  it("renders hr for ---, ***, and * * *", () => {
    expect(html("---")).toContain("md-hr");
    expect(html("***")).toContain("md-hr");
    expect(html("* * *")).toContain("md-hr");
    expect(html("* * *").match(/md-hr/g)?.length).toBe(1);
  });
  it("renders a pipe table with header, separator, and body", () => {
    const out = html("| a | b |\n|---|---|\n| 1 | 2 |");
    expect(out).toContain('<table class="md-table">');
    expect(out).toContain("<thead>");
    expect(out).toContain("<tbody>");
    expect(out.match(/<th /g)?.length).toBe(2);
    expect(out.match(/<td /g)?.length).toBe(2);
  });
  it("renders heading depth from # to ######", () => {
    expect(html("# H")).toContain("<h1");
    expect(html("## H")).toContain("<h2");
    expect(html("### H")).toContain('<h3 class="md-heading font-handwriting">');
    expect(html("###### H")).toContain("<h6");
  });
  it("renders inline markdown inside list items and headings", () => {
    const li = html("- **bold**");
    expect(li).toContain("<ul");
    expect(li).toContain("<strong>");
    const h = html("### **head**");
    expect(h).toContain('<h3 class="md-heading font-handwriting">');
    expect(h).toContain("<strong>");
  });
  it("keeps - * x literal inside a list item", () => {
    const out = html("- * x");
    expect(out).toContain("<ul");
    expect(out).toContain("<li>");
    expect(out).toContain("<li>* x</li>");
    expect(out).not.toContain("<em>");
  });
  it("renders inline markdown inside table cells", () => {
    const out = html("| **x** |\n|---|\n| y |");
    expect(out).toContain("<th ");
    expect(out).toContain("<strong>");
    expect(out).toContain(">y</td>");
  });
});

describe("groupPhotoRuns", () => {
  it("wraps 2–4 consecutive photos in a g2 grid", () => {
    const out = htmlGrouped("a\n{{img:x}}\n{{img:y}}\nb");
    expect(out).toContain('class="nb-photo-grid g2"');
    expect(out.match(/nb-inline-photo/g)?.length).toBe(2);
  });
  it("wraps 5+ consecutive photos in a g3 grid", () => {
    const out = htmlGrouped("{{img:a}}\n{{img:b}}\n{{img:c}}\n{{img:d}}\n{{img:e}}");
    expect(out).toContain('class="nb-photo-grid g3"');
    expect(out.match(/nb-inline-photo/g)?.length).toBe(5);
  });
  it("text between photos splits into separate grids", () => {
    const out = htmlGrouped("{{img:a}}\n{{img:b}}\ntext\n{{img:c}}\n{{img:d}}");
    expect(out.match(/nb-photo-grid/g)?.length).toBe(2);
    expect(out.match(/nb-inline-photo/g)?.length).toBe(4);
  });
  it("leaves a single photo unwrapped (hero)", () => {
    const out = htmlGrouped("a\n{{img:x}}\nb");
    expect(out).not.toContain("nb-photo-grid");
    expect(out).toContain("nb-inline-photo");
  });
  it("adds a delete chip only when onDeletePhoto is provided", () => {
    const withDel = renderToStaticMarkup(
      <>{renderBodyMarkdown("{{img:a}}", undefined, false, () => {})}</>
    );
    const withoutDel = html("{{img:a}}");
    expect(withDel).toContain("nb-photo-del");
    expect(withoutDel).not.toContain("nb-photo-del");
  });
});
