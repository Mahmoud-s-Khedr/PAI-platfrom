import { useState, type ComponentType } from "react";
import type { LessonBlock as Block } from "../lib/types";
import { BinaryConverter, PythonPlayground } from "../interactives/registry";
import { registeredInteractiveComponentIds } from "../interactives/component-ids";
import { useLanguage } from "../app/language";
import { AlertTriangle, BookOpenCheck, Download, FileText, Lightbulb, NotebookPen, type LucideIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarkdownRenderer } from "./markdown-renderer";
import { CodeView } from "./code-view";
import { calloutTones, type CalloutTone, type Language } from "../lib/types";

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function text(data: unknown, language: "ar" | "en") { return isRecord(data) && typeof data[language] === "string" ? data[language] : ""; }

export function RichTextBlock({ data }: { data: unknown }) {
  const { language } = useLanguage();
  return <MarkdownRenderer markdown={text(data, language)} language={language} />;
}

export function ImageBlock({ data }: { data: unknown }) {
  const { language } = useLanguage();
  const [unavailable, setUnavailable] = useState(false);
  if (!isRecord(data) || typeof data.src !== "string" || !data.src.trim()) return <BlockIssue message={language === "ar" ? "لا يحتوي هذا الجزء على صورة صالحة." : "This section does not contain a valid image."} />;
  if (unavailable) return <BlockIssue message={language === "ar" ? "تعذّر تحميل صورة هذا الدرس. يمكنك متابعة بقية الدرس." : "This lesson image could not be loaded. You can continue with the rest of the lesson."} />;
  return <figure className="overflow-hidden rounded-xl border bg-card"><img className="w-full" src={data.src} alt={text(data.alt, language)} onError={() => setUnavailable(true)} /><figcaption className="px-4 py-3 text-sm text-muted-foreground">{text(data.caption, language)}</figcaption></figure>;
}

export function FileBlock({ data }: { data: unknown }) {
  const { language } = useLanguage();
  if (!isRecord(data) || !Number.isInteger(data.assetId) || Number(data.assetId) < 1) {
    return <BlockIssue message={language === "ar" ? "كتلة الملف غير صالحة." : "File block is malformed."} />;
  }
  const title = text(data.title, language);
  if (!title) {
    return <BlockIssue message={language === "ar" ? "كتلة الملف لا تحتوي على عنوان." : "File block has no title."} />;
  }
  const description = text(data.description, language);
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex min-w-0 items-start gap-3">
          <FileText className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h3 className="font-semibold">{title}</h3>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <Button asChild>
          <a href={`/api/assets/${data.assetId}`} download>
            <Download className="size-4" />
            {language === "ar" ? "تنزيل الملف" : "Download file"}
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

export function CodeBlock({ data }: { data: unknown }) {
  const { language } = useLanguage();
  if (!isRecord(data) || typeof data.code !== "string") return <BlockIssue message={language === "ar" ? "جزء الكود غير صالح." : "Code block is malformed."} />;
  return <CodeView code={data.code} language={typeof data.language === "string" ? data.language : undefined} interfaceLanguage={language} />;
}

export function CalloutBlock({ data }: { data: unknown }) {
  const { language } = useLanguage();
  const tone = calloutTone(data);
  const style = calloutStyles[tone];
  const Icon = style.icon;
  return (
    <Alert role="note" className={style.className} data-callout-tone={tone}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="mb-1 font-medium leading-none tracking-tight">{style.label[language]}</p>
          <AlertDescription>{text(data, language)}</AlertDescription>
        </div>
      </div>
    </Alert>
  );
}

const calloutStyles: Record<CalloutTone, { label: Record<Language, string>; icon: LucideIcon; className: string }> = {
  "key-concept": { label: { ar: "مفهوم أساسي", en: "Key concept" }, icon: BookOpenCheck, className: "border-primary/25 bg-primary/5 text-foreground" },
  note: { label: { ar: "ملاحظة", en: "Note" }, icon: NotebookPen, className: "border-slate-400/30 bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50" },
  tip: { label: { ar: "نصيحة", en: "Tip" }, icon: Lightbulb, className: "border-amber-500/30 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-50" },
  warning: { label: { ar: "تنبيه", en: "Warning" }, icon: AlertTriangle, className: "border-destructive/35 bg-destructive/10 text-foreground" },
  example: { label: { ar: "مثال", en: "Example" }, icon: FileText, className: "border-emerald-600/30 bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50" },
};

function calloutTone(data: unknown): CalloutTone {
  if (!isRecord(data)) return "note";
  return calloutTones.includes(data.tone as CalloutTone) ? data.tone as CalloutTone : "note";
}

const interactiveRegistry: Record<(typeof registeredInteractiveComponentIds)[number], ComponentType<{ props: Record<string, unknown> }>> = {
  "binary-converter": BinaryConverter,
  "python-playground": PythonPlayground,
};

export function isSupportedLessonBlockType(type: string): boolean {
  return ["rich-text", "image", "file", "code", "callout", "interactive"].includes(type);
}

export function InteractiveBlock({ data }: { data: unknown }) {
  const { language } = useLanguage();
  if (!isRecord(data) || typeof data.component !== "string") return <BlockIssue message={language === "ar" ? "النشاط التفاعلي غير صالح." : "Interactive block is malformed."} />;
  const Component = registeredInteractiveComponentIds.includes(data.component as (typeof registeredInteractiveComponentIds)[number]) ? interactiveRegistry[data.component as (typeof registeredInteractiveComponentIds)[number]] : undefined;
  if (!Component) return <BlockIssue message={language === "ar" ? "هذا النشاط التفاعلي غير متاح حاليًا." : "This interactive activity is not available right now."} />;
  return <Card><CardContent className="p-5"><Component props={isRecord(data.props) ? data.props : {}} /></CardContent></Card>;
}

export function BlockIssue({ message }: { message: string }) { return <Alert className="border-amber-200 bg-amber-50 text-amber-900" role="status"><AlertDescription>{message}</AlertDescription></Alert>; }

export function LessonBlock({ block }: { block: Block }) {
  const { language } = useLanguage();
  if (!isSupportedLessonBlockType(block.type)) return <BlockIssue message={language === "ar" ? "جزء من محتوى الدرس غير مدعوم. يمكنك متابعة بقية الدرس." : "Part of this lesson is not supported. You can continue with the rest of the lesson."} />;
  switch (block.type) {
    case "rich-text": return <RichTextBlock data={block.data} />;
    case "image": return <ImageBlock data={block.data} />;
    case "file": return <FileBlock data={block.data} />;
    case "code": return <CodeBlock data={block.data} />;
    case "callout": return <CalloutBlock data={block.data} />;
    case "interactive": return <InteractiveBlock data={block.data} />;
    default: return <BlockIssue message={language === "ar" ? "جزء من محتوى الدرس غير مدعوم. يمكنك متابعة بقية الدرس." : "Part of this lesson is not supported. You can continue with the rest of the lesson."} />;
  }
}
