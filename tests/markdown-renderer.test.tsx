import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarkdownRenderer } from "../src/lesson-blocks/markdown-renderer";
import { SyntaxHighlightedCode } from "../src/lesson-blocks/syntax-highlighted-code";

function render(markdown: string, language: "ar" | "en" = "en") {
  return renderToStaticMarkup(<MarkdownRenderer markdown={markdown} language={language} />);
}

describe("MarkdownRenderer", () => {
  it("renders the supported CommonMark and GFM constructs", () => {
    const markup = render("# Heading\n\nA **bold** and *italic* [link](/courses/one) with `inline`.\n\n- first\n- [x] finished\n\n1. next");
    expect(markup).toContain("<h1");
    expect(markup).toContain("Heading</h1>");
    expect(markup).toContain("<strong>bold</strong>");
    expect(markup).toContain("<em>italic</em>");
    expect(markup).toContain('href="/courses/one"');
    expect(markup).toContain("<code");
    expect(markup).toContain("<ul");
    expect(markup).toContain('type="checkbox"');
    expect(markup).toContain("<ol");
  });

  it("keeps Arabic content RTL and wraps tables for narrow containers", () => {
    const markup = render("# عنوان\n\n| العمود | القيمة |\n| --- | --- |\n| مثال | ١ |", "ar");
    expect(markup).toContain('dir="rtl"');
    expect(markup).toContain('lang="ar"');
    expect(markup).toContain("overflow-x-auto");
    expect(markup).toContain("<table");
    expect(markup).toContain("العمود");
  });

  it("highlights supported code fences and safely leaves unknown languages as text", () => {
    const python = render("```python\nprint('safe')\n```");
    const unknown = render("```not-a-language\n<unsafe>\n```");
    expect(python).toContain("Python");
    expect(python).toContain("print");
    expect(unknown).toContain("&lt;unsafe&gt;");
    expect(unknown).not.toContain("<unsafe>");
  });

  it.each([
    ["python", "Python"], ["javascript", "JavaScript"], ["typescript", "TypeScript"], ["json", "JSON"],
    ["html", "HTML"], ["css", "CSS"], ["bash", "Bash"],
  ])("recognizes the %s code language", (language, label) => {
    expect(renderToStaticMarkup(<SyntaxHighlightedCode code="sample" language={language} />)).toContain(label);
  });

  it("does not turn HTML, unsafe URLs, or Markdown images into active content", () => {
    const markup = render("<script>alert(1)</script>\n\n[unsafe](javascript:alert(1))\n\n![ignored](https://example.com/image.png)");
    expect(markup).not.toContain("<script");
    expect(markup).not.toContain("javascript:");
    expect(markup).not.toContain("<img");
    expect(markup).not.toContain("example.com/image.png");
    expect(markup).toContain("unsafe");
  });

  it("opens external HTTP links safely and leaves relative links in the current tab", () => {
    const markup = render("[external](https://example.com) [relative](/courses/one)");
    expect(markup).toContain('href="https://example.com" target="_blank" rel="noopener noreferrer"');
    expect(markup).toContain('href="/courses/one"');
    expect(markup).not.toContain('href="/courses/one" target=');
  });
});
