import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, ClipboardCheck, Search } from "lucide-react";
import { useLanguage } from "../app/language";
import { PageMetadata } from "../app/page-metadata";
import { AsyncView } from "../components/async-view";
import { api } from "../lib/api";
import type { SearchResults } from "../lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const emptyResults: SearchResults = { courses: [], lessons: [], questions: [] };

export function SearchPage() {
  const { language } = useLanguage();
  const [params, setParams] = useSearchParams();
  const initialQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const nextQuery = params.get("q")?.trim() ?? "";
    setQuery(nextQuery);
    if (nextQuery.length < 2) {
      setResults(null); setError(null); setLoading(false);
      return;
    }
    let current = true;
    setLoading(true); setError(null);
    void api.search(nextQuery).then((response) => {
      if (current) setResults(response);
    }).catch((reason: unknown) => {
      if (current) setError(reason);
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => { current = false; };
  }, [params]);

  const copy = language === "ar"
    ? { title: "البحث", description: "ابحث في المقررات والدروس والمفاهيم وأسئلة التدريب المنشورة.", label: "ابحث عن درس أو مفهوم أو سؤال", button: "بحث", courses: "المقررات", lessons: "الدروس والمفاهيم", questions: "أسئلة التدريب", noResults: "لم نجد نتائج مطابقة.", hint: "اكتب حرفين على الأقل للبحث في المحتوى المنشور.", practice: "فتح تدريب المقرر", question: "سؤال تدريب" }
    : { title: "Search", description: "Search published courses, lessons, concepts, and practice questions.", label: "Search for a lesson, concept, or question", button: "Search", courses: "Courses", lessons: "Lessons and concepts", questions: "Practice questions", noResults: "No matching results found.", hint: "Enter at least two characters to search published content.", practice: "Open course practice", question: "Practice question" };
  const shown = results ?? emptyResults;
  const hasResults = shown.courses.length + shown.lessons.length + shown.questions.length > 0;

  function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = query.trim();
    setParams(normalized ? { q: normalized } : {});
  }

  return <section className="mx-auto max-w-4xl space-y-7"><PageMetadata title={copy.title} description={copy.description} language={language} noIndex /><div className="space-y-2"><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1><p className="text-muted-foreground">{copy.description}</p></div><form className="flex flex-col gap-3 sm:flex-row" onSubmit={submit}><label className="sr-only" htmlFor="site-search">{copy.label}</label><Input id="site-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.label} minLength={2} maxLength={100} autoComplete="off" /><Button type="submit"><Search className="size-4" />{copy.button}</Button></form>{params.get("q")?.trim().length ? <AsyncView loading={loading} error={error} language={language} onRetry={() => setParams({ q: params.get("q") ?? "" })}>{!loading && !error && (hasResults ? <div className="space-y-6"><SearchSection title={copy.courses} count={shown.courses.length}>{shown.courses.map((course) => <SearchCard key={course.id} icon={<BookOpen className="size-5" />} title={course.title[language]} description={course.description[language]} to={`/courses/${course.slug}`} action={language === "ar" ? "فتح المقرر" : "Open course"} />)}</SearchSection><SearchSection title={copy.lessons} count={shown.lessons.length}>{shown.lessons.map((lesson) => <SearchCard key={lesson.id} icon={<BookOpen className="size-5" />} title={lesson.title[language]} description={lesson.courseTitle[language]} to={`/courses/${lesson.courseSlug}/lessons/${lesson.slug}`} action={language === "ar" ? "فتح الدرس" : "Open lesson"} />)}</SearchSection><SearchSection title={copy.questions} count={shown.questions.length}>{shown.questions.map((question) => <SearchCard key={question.id} icon={<ClipboardCheck className="size-5" />} title={question.prompt[language]} description={`${copy.question} · ${question.courseTitle[language]}`} to={`/courses/${question.courseSlug}#practice`} action={copy.practice} />)}</SearchSection></div> : <Card><CardContent className="py-8 text-center text-muted-foreground">{copy.noResults}</CardContent></Card>)}</AsyncView> : <Card><CardContent className="py-8 text-center text-muted-foreground">{copy.hint}</CardContent></Card>}</section>;
}

function SearchSection({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (!count) return null;
  return <section className="space-y-3" aria-label={title}><h2 className="text-xl font-semibold">{title}</h2><div className="grid gap-3">{children}</div></section>;
}

function SearchCard({ icon, title, description, to, action }: { icon: ReactNode; title: string; description: string; to: string; action: string }) {
  return <Card><CardHeader className="gap-3 sm:flex-row sm:items-start"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span><div className="min-w-0 space-y-1"><CardTitle className="text-base">{title}</CardTitle><CardDescription>{description}</CardDescription><Link className="inline-flex pt-1 text-sm font-medium text-primary hover:underline" to={to}>{action}</Link></div></CardHeader></Card>;
}
