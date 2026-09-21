import type { ReactNode } from "react";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import Prism from "prismjs";
import { Button } from "@/components/ui/button";
import type { Language } from "../lib/types";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-python";
import "prismjs/components/prism-typescript";

const languageAliases: Record<string, string> = {
  py: "python",
  python: "python",
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  json: "json",
  html: "markup",
  css: "css",
  bash: "bash",
  sh: "bash",
  shell: "bash",
};

const languageLabels: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  json: "JSON",
  markup: "HTML",
  css: "CSS",
  bash: "Bash",
};

export function normalizedCodeLanguage(language: string | undefined): string | null {
  return language ? languageAliases[language.trim().toLowerCase()] ?? null : null;
}

export function SyntaxHighlightedCode({ code, language, interfaceLanguage = "en" }: { code: string; language?: string; interfaceLanguage?: Language }) {
  const [copied, setCopied] = useState(false);
  const normalizedLanguage = normalizedCodeLanguage(language);
  const label = normalizedLanguage ? languageLabels[normalizedLanguage] : undefined;
  const copyLabel = interfaceLanguage === "ar" ? "نسخ الرمز البرمجي" : "Copy code";

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  }

  const content: ReactNode = normalizedLanguage ? (
    <Highlight prism={Prism} theme={themes.nightOwl} code={code} language={normalizedLanguage}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <code className="block min-w-max">
          {tokens.map((line, lineIndex) => (
            <span key={lineIndex} {...getLineProps({ line })}>
              {line.map((token, tokenIndex) => <span key={tokenIndex} {...getTokenProps({ token })} />)}
              {"\n"}
            </span>
          ))}
        </code>
      )}
    </Highlight>
  ) : <code className="block min-w-max">{code}</code>;

  return <div className="overflow-hidden rounded-xl bg-slate-950 text-sm text-slate-100 shadow-sm" dir="ltr">
    <div className="flex items-center justify-between border-b border-slate-700/80 px-2 py-1.5 text-xs font-medium tracking-wide text-slate-300">{label ? <span className="px-2">{label}</span> : <span />}<Button type="button" size="sm" variant="ghost" className="text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => void copyCode()} aria-label={copyLabel} title={copyLabel}>{copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}<span>{copied ? (interfaceLanguage === "ar" ? "تم النسخ" : "Copied") : (interfaceLanguage === "ar" ? "نسخ" : "Copy")}</span></Button></div>
    <pre className="overflow-x-auto p-4 leading-6">{content}</pre>
  </div>;
}
