import { isValidElement, type ComponentPropsWithoutRef, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SyntaxHighlightedCode } from "./syntax-highlighted-code";

const controlCharacters = /[\u0000-\u001F\u007F]/;

/** Only navigation URLs that are safe for a student-facing document are rendered as links. */
export function isAllowedMarkdownUrl(value: string | undefined): value is string {
  if (!value) return false;
  const url = value.trim();
  if (!url || controlCharacters.test(url) || url.startsWith("//") || url.startsWith("\\\\")) return false;

  const protocolMatch = /^([a-zA-Z][a-zA-Z\d+.-]*):/.exec(url);
  if (!protocolMatch) return true;
  return ["http", "https", "mailto"].includes(protocolMatch[1].toLowerCase());
}

function isExternalHttpUrl(href: string) {
  if (!/^https?:/i.test(href)) return false;
  if (typeof window === "undefined") return true;
  try { return new URL(href, window.location.href).origin !== window.location.origin; } catch { return true; }
}

function SafeLink({ href, children, ...props }: ComponentPropsWithoutRef<"a">) {
  if (!isAllowedMarkdownUrl(href)) return <>{children}</>;
  if (isExternalHttpUrl(href)) return <a {...props} href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
  return <a {...props} href={href}>{children}</a>;
}

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return "";
}

function codeLanguage(className: string | undefined) {
  return className?.match(/(?:^|\s)language-([^\s]+)/)?.[1];
}

function MarkdownPre({ children, interfaceLanguage }: ComponentPropsWithoutRef<"pre"> & { interfaceLanguage: "ar" | "en" }) {
  if (isValidElement<{ className?: string; children?: ReactNode }>(children)) {
    return <SyntaxHighlightedCode code={nodeText(children.props.children).replace(/\n$/, "")} language={codeLanguage(children.props.className)} interfaceLanguage={interfaceLanguage} />;
  }
  return <pre>{children}</pre>;
}

function InlineCode({ children, ...props }: ComponentPropsWithoutRef<"code">) {
  return <code {...props} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]" dir="ltr">{children}</code>;
}

export function MarkdownRenderer({ markdown, language }: { markdown: string; language: "ar" | "en" }) {
  return <section className="markdown-content space-y-4 text-[1.05rem] leading-8 text-foreground/90" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
    <Markdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      urlTransform={(url) => isAllowedMarkdownUrl(url) ? url : ""}
      components={{
        h1: ({ children, ...props }) => <h1 {...props} className="mt-8 text-3xl font-bold tracking-tight first:mt-0">{children}</h1>,
        h2: ({ children, ...props }) => <h2 {...props} className="mt-7 text-2xl font-bold tracking-tight first:mt-0">{children}</h2>,
        h3: ({ children, ...props }) => <h3 {...props} className="mt-6 text-xl font-semibold first:mt-0">{children}</h3>,
        p: ({ children, ...props }) => <p {...props}>{children}</p>,
        ul: ({ children, ...props }) => <ul {...props} className="list-disc space-y-1 ps-6 marker:text-primary">{children}</ul>,
        ol: ({ children, ...props }) => <ol {...props} className="list-decimal space-y-1 ps-6 marker:text-primary">{children}</ol>,
        a: SafeLink,
        img: () => null,
        input: ({ type, checked, ...props }) => <input {...props} type={type} checked={checked} disabled aria-label={language === "ar" ? "عنصر قائمة مهام" : "Task list item"} />,
        code: InlineCode,
        pre: ({ children, ...props }) => <MarkdownPre {...props} interfaceLanguage={language}>{children}</MarkdownPre>,
        table: ({ children, ...props }) => <div className="overflow-x-auto rounded-lg border"><table {...props} className="w-full min-w-max border-collapse text-start text-sm">{children}</table></div>,
        th: ({ children, ...props }) => <th {...props} className="border-b bg-muted px-3 py-2 font-semibold">{children}</th>,
        td: ({ children, ...props }) => <td {...props} className="border-b px-3 py-2 align-top">{children}</td>,
      }}
    >
      {markdown}
    </Markdown>
  </section>;
}
