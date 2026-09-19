import type { ComponentType } from "react";
import type { LessonBlock as Block } from "../lib/types";
import { BinaryConverter, PythonPlayground } from "../interactives/registry";
import { useLanguage } from "../app/language";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function text(data: unknown, language: "ar" | "en") { return isRecord(data) && typeof data[language] === "string" ? data[language] : ""; }

export function RichTextBlock({ data }: { data: unknown }) {
  const { language } = useLanguage();
  // Markdown is treated as text and never injected as HTML; this keeps authored content safe in Phase 1.
  return <section className="space-y-4 text-[1.05rem] leading-8 text-foreground/90">{text(data, language).split("\n").filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</section>;
}

export function ImageBlock({ data }: { data: unknown }) {
  const { language } = useLanguage();
  if (!isRecord(data) || typeof data.src !== "string") return <BlockIssue message="Image block has no image source." />;
  return <figure className="overflow-hidden rounded-xl border bg-card"><img className="w-full" src={data.src} alt={text(data.alt, language)} /><figcaption className="px-4 py-3 text-sm text-muted-foreground">{text(data.caption, language)}</figcaption></figure>;
}

export function CodeBlock({ data }: { data: unknown }) {
  if (!isRecord(data) || typeof data.code !== "string") return <BlockIssue message="Code block is malformed." />;
  return <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-100 shadow-sm" dir="ltr"><code className={typeof data.language === "string" ? `language-${data.language}` : undefined}>{data.code}</code></pre>;
}

export function CalloutBlock({ data }: { data: unknown }) {
  const { language } = useLanguage();
  return <Alert className="border-primary/25 bg-primary/5 text-foreground"><AlertDescription>{text(data, language)}</AlertDescription></Alert>;
}

const interactiveRegistry: Record<string, ComponentType<{ props: Record<string, unknown> }>> = {
  "binary-converter": BinaryConverter,
  "python-playground": PythonPlayground,
};

export function isSupportedLessonBlockType(type: string): boolean {
  return ["rich-text", "image", "code", "callout", "interactive"].includes(type);
}

export function InteractiveBlock({ data }: { data: unknown }) {
  if (!isRecord(data) || typeof data.component !== "string") return <BlockIssue message="Interactive block is malformed." />;
  const Component = interactiveRegistry[data.component];
  if (!Component) return <BlockIssue message={`Interactive “${data.component}” is not available yet.`} />;
  return <Card><CardContent className="p-5"><Component props={isRecord(data.props) ? data.props : {}} /></CardContent></Card>;
}

export function BlockIssue({ message }: { message: string }) { return <Alert className="border-amber-200 bg-amber-50 text-amber-900" role="status"><AlertDescription>{message}</AlertDescription></Alert>; }

export function LessonBlock({ block }: { block: Block }) {
  if (!isSupportedLessonBlockType(block.type)) return <BlockIssue message={`Unsupported lesson block type: ${block.type}`} />;
  switch (block.type) {
    case "rich-text": return <RichTextBlock data={block.data} />;
    case "image": return <ImageBlock data={block.data} />;
    case "code": return <CodeBlock data={block.data} />;
    case "callout": return <CalloutBlock data={block.data} />;
    case "interactive": return <InteractiveBlock data={block.data} />;
    default: return <BlockIssue message={`Unsupported lesson block type: ${block.type}`} />;
  }
}
