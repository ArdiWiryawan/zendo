import { describe, expect, it } from "vitest";
import { autolistMarker, renderBodyMarkdown } from "./notebookMarkdown";
import { renderToStaticMarkup } from "react-dom/server";

function html(body: string): string {
  return renderToStaticMarkup(<>{renderBodyMarkdown(body)}</>);
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
});
