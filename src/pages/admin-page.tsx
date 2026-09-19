import { useEffect, useState } from "react";
import { BookOpen, CircleHelp } from "lucide-react";
import { useLanguage } from "../app/language";
import { AsyncView } from "../components/async-view";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../lib/api";
import type { AdminDashboard, ContentStatus } from "../lib/types";

function StatusBadge({ status, language }: { status: ContentStatus; language: "ar" | "en" }) {
  const labels = { draft: { ar: "مسودة", en: "Draft" }, published: { ar: "منشور", en: "Published" }, archived: { ar: "مؤرشف", en: "Archived" } };
  const tone = status === "published" ? "default" : status === "archived" ? "secondary" : "outline";
  return <Badge variant={tone}>{labels[status][language]}</Badge>;
}

function formatDate(value: string, language: "ar" | "en") {
  const date = new Date(value.replace(" ", "T") + "Z");
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function AdminPage() {
  const { language } = useLanguage();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void api.adminDashboard().then(setDashboard).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : language === "ar" ? "تعذّر تحميل لوحة الإدارة" : "Unable to load the admin dashboard")); }, [language]);
  return <AsyncView loading={!dashboard && !error} error={error}><section className="space-y-6"><div><h1 className="text-3xl font-bold">{language === "ar" ? "لوحة الإدارة" : "Admin home"}</h1><p className="mt-1 text-muted-foreground">{language === "ar" ? "ملخص المحتوى وحالته. لا تتوفر أدوات التحرير في هذه المرحلة." : "Content summary and status. Editing is not included in this release."}</p></div><div className="space-y-5">{dashboard?.courses.map((course) => <Card key={course.id}><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><BookOpen className="size-5" />{course.title[language]}</CardTitle><CardDescription className="mt-1">{course.slug} · {language === "ar" ? `آخر تحديث ${formatDate(course.updatedAt, language)}` : `Updated ${formatDate(course.updatedAt, language)}`}</CardDescription></div><StatusBadge status={course.status} language={language} /></div></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border p-3 text-sm"><CircleHelp className="mb-1 size-4 text-muted-foreground" />{language === "ar" ? `${course.questionCount} سؤالًا في المقرر` : `${course.questionCount} course questions`}</div><div className="rounded-lg border p-3 text-sm">{language === "ar" ? `${course.lessonCount} درس` : `${course.lessonCount} lessons`}</div></div><ul className="divide-y rounded-lg border">{course.lessons.map((lesson) => <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 p-3"><div><p className="font-medium">{lesson.title[language]}</p><p className="text-sm text-muted-foreground">{language === "ar" ? `آخر تحديث ${formatDate(lesson.updatedAt, language)}` : `Updated ${formatDate(lesson.updatedAt, language)}`}</p></div><div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">{language === "ar" ? `${lesson.directQuestionCount} أسئلة مباشرة` : `${lesson.directQuestionCount} mapped questions`}</span><StatusBadge status={lesson.status} language={language} /></div></li>)}</ul></CardContent></Card>)}</div></section></AsyncView>;
}
