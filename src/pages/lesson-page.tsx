import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardCheck, Share2, Undo2 } from "lucide-react";
import { useLanguage } from "../app/language";
import { PageMetadata } from "../app/page-metadata";
import { AsyncView } from "../components/async-view";
import { NotFoundView } from "../components/not-found-view";
import { LessonBlock } from "../lesson-blocks/lesson-block";
import { api } from "../lib/api";
import { isErrorCode } from "../lib/errors";
import type { Language, LessonPageData, LessonSummary } from "../lib/types";
import { QuestionPractice } from "../question-engine/question-practice";
import { studentState } from "../storage/student-state";
import { loadYouTubePlayerApi, youtubeErrorMessage, type YouTubePlayerErrorCode } from "../lib/youtube-player";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

function LessonCompletion({ lessonId, language }: { lessonId: number; language: Language }) {
  const [completed, setCompleted] = useState(() => studentState.read().completedLessonIds.includes(lessonId));
  useEffect(() => {
    const refresh = () => setCompleted(studentState.read().completedLessonIds.includes(lessonId));
    refresh();
    window.addEventListener(studentState.changeEvent, refresh);
    return () => window.removeEventListener(studentState.changeEvent, refresh);
  }, [lessonId]);
  const ar = language === "ar";
  return <Card className={completed ? "border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950" : "border-primary/20 bg-primary/5"}><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><CheckCircle2 className={`mt-0.5 size-5 shrink-0 ${completed ? "text-emerald-600" : "text-primary"}`} aria-hidden="true" /><div role="status"><p className="font-medium">{completed ? (ar ? "أكملت هذا الدرس" : "You completed this lesson") : (ar ? "أنهيت محتوى الدرس؟" : "Finished the lesson content?")}</p><p className="text-sm text-muted-foreground">{completed ? (ar ? "جرّب أسئلة التدريب أو انتقل إلى الدرس التالي." : "Try the practice questions or move on to the next lesson.") : (ar ? "سجّل تقدّمك ثم جرّب أسئلة التدريب." : "Save your progress, then try the practice questions.")}</p></div></div>{completed
    ? <Button variant="outline" onClick={() => studentState.uncompleteLesson(lessonId)}><Undo2 className="size-4" aria-hidden="true" />{ar ? "إلغاء الإكمال" : "Mark as not complete"}</Button>
    : <Button onClick={() => studentState.completeLesson(lessonId)}><Check className="size-4" aria-hidden="true" />{ar ? "وضع علامة كمكتمل" : "Mark lesson complete"}</Button>}</CardContent></Card>;
}

function ShareLesson({ title, language }: { title: string; language: Language }) {
  const [copied, setCopied] = useState(false);
  const ar = language === "ar";
  const url = window.location.href;
  async function share() {
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title, url }); return; } catch (reason) { if (reason instanceof DOMException && reason.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2_000); } catch { setCopied(false); }
  }
  return <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => void share()}><Share2 className="size-4" aria-hidden="true" />{copied ? (ar ? "تم نسخ الرابط" : "Link copied") : (ar ? "مشاركة" : "Share")}</Button><Button variant="outline" size="sm" asChild><a href={`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`} target="_blank" rel="noopener noreferrer">{ar ? "واتساب" : "WhatsApp"}</a></Button></div>;
}

/** The student lesson screen. `preview` renders a draft for the admin without touching student progress. */
export function LessonView({ data, language, lessonHref, courseHref, preview = false }: { data: LessonPageData; language: Language; lessonHref: (lesson: LessonSummary) => string; courseHref: string; preview?: boolean }) {
  const { course, lessons, lesson, questions } = data;
  const lessonIndex = lessons.findIndex((candidate) => candidate.id === lesson.id);
  const previousLesson = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex >= 0 && lessonIndex < lessons.length - 1 ? lessons[lessonIndex + 1] : null;
  return <section className="mx-auto max-w-4xl space-y-7"><Button asChild variant="ghost" className="w-fit px-0 text-muted-foreground hover:bg-transparent hover:text-primary"><Link to={courseHref}><ArrowLeft className="size-4 rtl:rotate-180" />{course.title[language]}</Link></Button><div className="flex flex-wrap items-start justify-between gap-3"><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{lesson.title[language]}</h1>{!preview && <ShareLesson title={lesson.title[language]} language={language} />}</div>
    <LessonVideo key={lesson.id} videoId={lesson.youtubeVideoId} title={lesson.title[language]} language={language} />
    <article className="space-y-6">{lesson.blocks.map((block) => <LessonBlock key={block.id} block={block} />)}</article>
    {!preview && <LessonCompletion lessonId={lesson.id} language={language} />}
    <Separator /><section className="space-y-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><ClipboardCheck className="size-5" /></span><h2 className="text-2xl font-semibold">{language === "ar" ? "اختبر فهمك" : "Check your understanding"}</h2></div><QuestionPractice key={lesson.id} questions={questions} /></section>
    {(previousLesson || nextLesson) && <nav className="flex flex-wrap justify-between gap-3 border-t pt-5" aria-label={language === "ar" ? "التنقل بين الدروس" : "Lesson navigation"}>{previousLesson ? <Button variant="outline" asChild><Link to={lessonHref(previousLesson)}><ArrowLeft className="size-4 rtl:rotate-180" />{language === "ar" ? "الدرس السابق" : "Previous lesson"}</Link></Button> : <span />}{nextLesson ? <Button asChild><Link to={lessonHref(nextLesson)}>{language === "ar" ? "الدرس التالي" : "Next lesson"}<ArrowRight className="size-4 rtl:rotate-180" /></Link></Button> : <span />}</nav>}
  </section>;
}

export function LessonPage() {
  const { courseSlug = "", lessonSlug = "" } = useParams();
  const { language } = useLanguage();
  const [data, setData] = useState<LessonPageData | null>(null);
  const [error, setError] = useState<unknown | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setData(null); setError(null);
    void api.lessonPage(courseSlug, lessonSlug).then((loaded) => {
      if (!current) return;
      studentState.openLesson({ courseSlug, lessonSlug, lessonId: loaded.lesson.id });
      setData(loaded);
    }).catch((reason: unknown) => { if (current) setError(reason); });
    return () => { current = false; };
  }, [courseSlug, lessonSlug, loadAttempt]);
  if (isErrorCode(error, "COURSE_NOT_FOUND")) return <NotFoundView kind="course" language={language} />;
  if (isErrorCode(error, "LESSON_NOT_FOUND")) return <NotFoundView kind="lesson" language={language} courseSlug={courseSlug} />;
  return <><PageMetadata title={data?.lesson.title[language]} description={data ? `${data.lesson.title[language]} — ${data.course.title[language]}` : (language === "ar" ? "درس في البرمجة والذكاء الاصطناعي." : "A programming and artificial intelligence lesson.")} language={language} /><AsyncView loading={!error && !data} error={error} language={language} onRetry={() => setLoadAttempt((attempt) => attempt + 1)}>{data && <LessonView data={data} language={language} courseHref={`/courses/${courseSlug}`} lessonHref={(lesson) => `/courses/${courseSlug}/lessons/${lesson.slug}`} />}</AsyncView></>;
}
