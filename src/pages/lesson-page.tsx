import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck } from "lucide-react";
import { useLanguage } from "../app/language";
import { AsyncView } from "../components/async-view";
import { NotFoundView } from "../components/not-found-view";
import { LessonBlock } from "../lesson-blocks/lesson-block";
import { api } from "../lib/api";
import { ApiRequestError, isErrorCode } from "../lib/errors";
import type { Course, Lesson, LessonSummary, Question } from "../lib/types";
import { QuestionPractice } from "../question-engine/question-practice";
import { studentState } from "../storage/student-state";
import { loadYouTubePlayerApi, youtubeErrorMessage, type YouTubePlayerErrorCode } from "../lib/youtube-player";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function LessonVideo({ videoId, title, language }: { videoId: string | null; title: string; language: "ar" | "en" }) {
  const validVideoId = typeof videoId === "string" && /^[A-Za-z0-9_-]{11}$/.test(videoId);
  const target = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<YouTubePlayerErrorCode | "load" | null>(validVideoId ? null : "load");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!validVideoId || !target.current) return;
    let disposed = false;
    let player: { destroy: () => void } | undefined;
    setError(null); setReady(false);
    void loadYouTubePlayerApi().then((YT) => {
      if (disposed || !target.current) return;
      player = new YT.Player(target.current, {
        videoId,
        host: "https://www.youtube-nocookie.com",
        width: "100%",
        height: "100%",
        playerVars: { origin: window.location.origin, rel: 0 },
        events: {
          onReady: () => { if (!disposed) setReady(true); },
          onError: (event) => { if (!disposed) setError(event.data); },
        },
      });
    }).catch(() => { if (!disposed) setError("load"); });
    return () => { disposed = true; player?.destroy(); };
  }, [videoId, validVideoId]);
  if (error !== null) return <Card className="border-dashed"><CardContent className="space-y-2 py-6 text-center"><p className="font-medium">{language === "ar" ? "فيديو الدرس غير متاح حاليًا" : "This lesson video is not available right now"}</p><p className="text-sm text-muted-foreground">{error === "load" ? (language === "ar" ? "تعذّر تحميل مشغّل الفيديو. يمكنك متابعة المادة والأنشطة التعليمية أدناه." : "The video player could not be loaded. You can continue with the study material and activities below.") : youtubeErrorMessage(error, language)}</p></CardContent></Card>;
  return <Card className="overflow-hidden"><CardContent className="p-0"><div className="relative aspect-video bg-muted" aria-label={title}>{!ready && <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">{language === "ar" ? "جارٍ تحميل الفيديو…" : "Loading video…"}</p>}<div ref={target} className="size-full" /></div></CardContent></Card>;
}

export function LessonPage() {
  const { courseSlug = "", lessonSlug = "" } = useParams();
  const { language } = useLanguage();
  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<unknown | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setCourse(null); setLesson(null); setLessons([]); setQuestions([]); setError(null);
    void api.course(courseSlug).then(async (loadedCourse) => {
      const lessons = await api.lessons(courseSlug);
      const summary = lessons.find((candidate: LessonSummary) => candidate.slug === lessonSlug);
      if (!summary) throw new ApiRequestError("LESSON_NOT_FOUND", 404);
      const loadedLesson = await api.lesson(summary.id);
      const loadedQuestions = await api.lessonQuestions(summary.id);
      if (!current) return;
      studentState.openLesson({ courseSlug, lessonSlug, lessonId: loadedLesson.id });
      setCourse(loadedCourse); setLessons(lessons); setLesson(loadedLesson); setQuestions(loadedQuestions);
    }).catch((reason: unknown) => { if (current) setError(reason); });
    return () => { current = false; };
  }, [courseSlug, lessonSlug, loadAttempt]);
  const lessonIndex = lessons.findIndex((candidate) => candidate.id === lesson?.id);
  const previousLesson = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex >= 0 && lessonIndex < lessons.length - 1 ? lessons[lessonIndex + 1] : null;
  if (isErrorCode(error, "COURSE_NOT_FOUND")) return <NotFoundView kind="course" language={language} />;
  if (isErrorCode(error, "LESSON_NOT_FOUND")) return <NotFoundView kind="lesson" language={language} courseSlug={courseSlug} />;
  return <AsyncView loading={!error && !lesson} error={error} language={language} onRetry={() => setLoadAttempt((attempt) => attempt + 1)}>{lesson && <section className="mx-auto max-w-4xl space-y-7"><Button asChild variant="ghost" className="w-fit px-0 text-muted-foreground hover:bg-transparent hover:text-primary"><Link to={`/courses/${courseSlug}`}><ArrowLeft className="size-4 rtl:rotate-180" />{course?.title[language] ?? (language === "ar" ? "المقرر" : "Course")}</Link></Button><div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{lesson.title[language]}</h1></div>
    <LessonVideo key={lesson.id} videoId={lesson.youtubeVideoId} title={lesson.title[language]} language={language} />
    <article className="space-y-6">{lesson.blocks.map((block) => <LessonBlock key={block.id} block={block} />)}</article>
    <Card className="border-primary/20 bg-primary/5"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="font-medium">{language === "ar" ? "أنهيت محتوى الدرس؟" : "Finished the lesson content?"}</p><p className="text-sm text-muted-foreground">{language === "ar" ? "سجّل تقدّمك ثم جرّب أسئلة التدريب." : "Save your progress, then try the practice questions."}</p></div></div><Button onClick={() => studentState.completeLesson(lesson.id)}>{language === "ar" ? "وضع علامة كمكتمل" : "Mark lesson complete"}</Button></CardContent></Card>
    <Separator /><section className="space-y-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><ClipboardCheck className="size-5" /></span><h2 className="text-2xl font-semibold">{language === "ar" ? "اختبر فهمك" : "Check your understanding"}</h2></div><QuestionPractice key={lesson.id} questions={questions} /></section>
    {(previousLesson || nextLesson) && <nav className="flex flex-wrap justify-between gap-3 border-t pt-5" aria-label={language === "ar" ? "التنقل بين الدروس" : "Lesson navigation"}>{previousLesson ? <Button variant="outline" asChild><Link to={`/courses/${courseSlug}/lessons/${previousLesson.slug}`}><ArrowLeft className="size-4 rtl:rotate-180" />{language === "ar" ? "الدرس السابق" : "Previous lesson"}</Link></Button> : <span />}{nextLesson ? <Button asChild><Link to={`/courses/${courseSlug}/lessons/${nextLesson.slug}`}>{language === "ar" ? "الدرس التالي" : "Next lesson"}<ArrowRight className="size-4 rtl:rotate-180" /></Link></Button> : <span />}</nav>}
  </section>}</AsyncView>;
}
