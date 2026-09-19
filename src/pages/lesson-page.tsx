import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ClipboardCheck } from "lucide-react";
import { useLanguage } from "../app/language";
import { AsyncView } from "../components/async-view";
import { LessonBlock } from "../lesson-blocks/lesson-block";
import { api } from "../lib/api";
import type { Course, Lesson, LessonSummary, Question } from "../lib/types";
import { QuestionPractice } from "../question-engine/question-practice";
import { studentState } from "../storage/student-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function LessonPage() {
  const { courseSlug = "", lessonSlug = "" } = useParams();
  const { language } = useLanguage();
  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    setCourse(null); setLesson(null); setQuestions([]); setError(null);
    void api.course(courseSlug).then(async (loadedCourse) => {
      const lessons = await api.lessons(courseSlug);
      const summary = lessons.find((candidate: LessonSummary) => candidate.slug === lessonSlug);
      if (!summary) throw new Error("Lesson not found");
      const loadedLesson = await api.lesson(summary.id);
      const loadedQuestions = await api.lessonQuestions(summary.id);
      if (!current) return;
      setCourse(loadedCourse); setLesson(loadedLesson); setQuestions(loadedQuestions);
    }).catch((reason: unknown) => {
      if (current) setError(reason instanceof Error ? reason.message : "Unable to load lesson");
    });
    return () => { current = false; };
  }, [courseSlug, lessonSlug]);
  return <AsyncView loading={!error && !lesson} error={error}>{lesson && <section className="mx-auto max-w-4xl space-y-7"><Button asChild variant="ghost" className="w-fit px-0 text-muted-foreground hover:bg-transparent hover:text-primary"><Link to={`/courses/${courseSlug}`}><ArrowLeft className="size-4 rtl:rotate-180" />{course?.title[language] ?? "Course"}</Link></Button><div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{lesson.title[language]}</h1></div>
    {lesson.youtubeVideoId && <Card className="overflow-hidden"><CardContent className="p-0"><div className="aspect-video bg-muted"><iframe className="size-full" title={lesson.title[language]} src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(lesson.youtubeVideoId)}`} allowFullScreen /></div></CardContent></Card>}
    <article className="space-y-6">{lesson.blocks.map((block) => <LessonBlock key={block.id} block={block} />)}</article>
    <Card className="border-primary/20 bg-primary/5"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="font-medium">{language === "ar" ? "أنهيت محتوى الدرس؟" : "Finished the lesson content?"}</p><p className="text-sm text-muted-foreground">{language === "ar" ? "سجّل تقدّمك ثم جرّب أسئلة التدريب." : "Save your progress, then try the practice questions."}</p></div></div><Button onClick={() => studentState.completeLesson(lesson.id)}>{language === "ar" ? "وضع علامة كمكتمل" : "Mark lesson complete"}</Button></CardContent></Card>
    <Separator /><section className="space-y-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><ClipboardCheck className="size-5" /></span><h2 className="text-2xl font-semibold">{language === "ar" ? "اختبر فهمك" : "Check your understanding"}</h2></div><QuestionPractice key={lesson.id} questions={questions} /></section>
  </section>}</AsyncView>;
}
