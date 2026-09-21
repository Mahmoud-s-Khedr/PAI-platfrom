import type { ChangeEvent, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ContentStatus, LocalizedText } from "../lib/types";

export const adminCopy = {
  ar: { back: "العودة إلى الإدارة", save: "حفظ التغييرات", saving: "جارٍ الحفظ…", slug: "المعرّف", order: "الترتيب", status: "الحالة", arabic: "العربية", english: "English", required: "مطلوب", updated: "آخر تحديث", create: "إنشاء", cancel: "إلغاء", archive: "أرشفة" },
  en: { back: "Back to admin", save: "Save changes", saving: "Saving…", slug: "Slug", order: "Order", status: "Status", arabic: "Arabic", english: "English", required: "Required", updated: "Last updated", create: "Create", cancel: "Cancel", archive: "Archive" },
} as const;

export function StatusBadge({ status, language }: { status: ContentStatus; language: "ar" | "en" }) {
  const labels = { draft: { ar: "مسودة", en: "Draft" }, published: { ar: "منشور", en: "Published" }, archived: { ar: "مؤرشف", en: "Archived" } };
  return <Badge variant={status === "published" ? "default" : status === "archived" ? "secondary" : "outline"}>{labels[status][language]}</Badge>;
}

export function formatAdminDate(value: string, language: "ar" | "en") {
  const date = new Date(value.replace(" ", "T") + "Z");
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium">{label}{children}</label>;
}

export function StatusSelect({ value, onChange, language }: { value: ContentStatus; onChange: (value: ContentStatus) => void; language: "ar" | "en" }) {
  return <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" value={value} onChange={(event) => onChange(event.target.value as ContentStatus)} aria-label={adminCopy[language].status}>
    <option value="draft">{language === "ar" ? "مسودة" : "Draft"}</option><option value="published">{language === "ar" ? "منشور" : "Published"}</option><option value="archived">{language === "ar" ? "مؤرشف" : "Archived"}</option>
  </select>;
}

export function LocalizedFields({ value, onChange, label, multiline = false, required = true }: { value: LocalizedText; onChange: (value: LocalizedText) => void; label: string; multiline?: boolean; required?: boolean }) {
  const change = (key: keyof LocalizedText) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...value, [key]: event.target.value });
  const Control = multiline ? Textarea : Input;
  return <fieldset className="grid gap-3"><legend className="text-sm font-medium">{label}</legend><div className="grid gap-3 sm:grid-cols-2"><Field label={`${adminCopy.ar.arabic} / Arabic`}><Control value={value.ar} onChange={change("ar")} dir="rtl" lang="ar" required={required} /></Field><Field label={adminCopy.en.english}><Control value={value.en} onChange={change("en")} dir="ltr" lang="en" required={required} /></Field></div></fieldset>;
}
