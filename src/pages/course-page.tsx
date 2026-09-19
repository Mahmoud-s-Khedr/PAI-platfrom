import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, BookOpenCheck, CirclePlay, ListChecks } from "lucide-react";
import { useLanguage } from "../app/language";
import { AsyncView } from "../components/async-view";
import { api } from "../lib/api";
import type { Course, LessonSummary } from "../lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function CoursePage() {
  const { courseSlug = "" } = useParams();
  const { language } = useLanguage();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    setCourse(null); setLessons([]); setError(null);
    void Promise.all([api.course(courseSlug), api.lessons(courseSlug)])
      .then(([loadedCourse, loadedLessons]) => {
        if (!current) return;
        setCourse(loadedCourse);
        setLessons(loadedLessons);
      })
      .catch((reason: unknown) => {
        if (current) setError(reason instanceof Error ? reason.message : "Unable to load course");
      });
    return () => { current = false; };
  }, [courseSlug]);
  return <AsyncView loading={!error && !course} error={error}>{course && <section className="mx-auto max-w-4xl space-y-6"><div className="space-y-3"><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{course.title[language]}</h1><p className="text-lg text-muted-foreground">{course.description[language]}</p></div><Card><CardHeader><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><ListChecks className="size-5" /></span><div><CardTitle>{language === "ar" ? "الدروس" : "Lessons"}</CardTitle><CardDescription>{lessons.length} {language === "ar" ? "دروس متاحة" : "lessons available"}</CardDescription></div></div></CardHeader><CardContent>{lessons.length ? <ol className="space-y-1">{lessons.map((lesson, index) => <li key={lesson.id}><Button variant="ghost" asChild className="h-auto w-full justify-between px-3 py-3 text-start hover:bg-accent"><Link to={`/courses/${course.slug}/lessons/${lesson.slug}`}><span className="flex items-center gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">{index + 1}</span><span className="font-medium">{lesson.title[language]}</span></span><span className="flex items-center gap-2 text-muted-foreground"><CirclePlay className="size-4" /><ArrowRight className="size-4 rtl:rotate-180" /></span></Link></Button>{index < lessons.length - 1 && <Separator />}</li>)}</ol> : <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground"><BookOpenCheck className="size-8" /><p>{language === "ar" ? "لا توجد دروس منشورة بعد." : "There are no published lessons yet."}</p></div>}</CardContent></Card></section>}</AsyncView>;
}
