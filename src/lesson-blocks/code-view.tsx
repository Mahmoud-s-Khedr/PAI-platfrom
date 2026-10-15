import { lazy, Suspense } from "react";
import type { Language } from "../lib/types";
import { CodeFrame } from "./code-frame";

// Prism is loaded only when a lesson contains code; plain code shows until it arrives.
const SyntaxHighlightedCode = lazy(() => import("./syntax-highlighted-code").then((module) => ({ default: module.SyntaxHighlightedCode })));

export function CodeView(props: { code: string; language?: string; interfaceLanguage?: Language }) {
  return <Suspense fallback={<CodeFrame {...props} />}><SyntaxHighlightedCode {...props} /></Suspense>;
}
