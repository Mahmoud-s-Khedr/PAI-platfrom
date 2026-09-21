import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, BookOpenCheck, CheckCircle2, CirclePlay, ClipboardCheck, ListChecks } from "lucide-react";
import { useLanguage } from "../app/language";
import { AsyncView } from "../components/async-view";
import { api } from "../lib/api";
import type { Course, LessonSummary, Question } from "../lib/types";
import { QuestionPractice } from "../question-engine/question-practice";
import { studentState } from "../storage/student-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function CoursePage() {
  const { courseSlug = "" } = useParams();
  const { language } = useLanguage();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<number[]>(() => studentState.read().completedLessonIds);
  const [courseQuestions, setCourseQuestions] = useState<Question[] | null>(null);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [showPractice, setShowPractice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    setCourse(null); setLessons([]); setCourseQuestions(null); setPracticeError(null); setShowPractice(false); setError(null);
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
  useEffect(() => {
    const refreshCompletion = () => setCompletedLessonIds(studentState.read().completedLessonIds);
    window.addEventListener("focus", refreshCompletion);
    window.addEventListener("storage", refreshCompletion);
    return () => { window.removeEventListener("focus", refreshCompletion); window.removeEventListener("storage", refreshCompletion); };
  }, []);
  const completedLessonIdSet = useMemo(() => new Set(completedLessonIds), [completedLessonIds]);
  const continueLesson = lessons.find((lesson) => !completedLessonIdSet.has(lesson.id)) ?? lessons[0];
  async function openCoursePractice() {
    setShowPractice(true);
    if (courseQuestions || practiceLoading) return;
    setPracticeLoading(true);
    setPracticeError(null);
    try {
      setCourseQuestions(await api.courseQuestions(courseSlug));
    } catch (reason) {
      setPracticeError(reason instanceof Error ? reason.message : "Unable to load course practice");
    } finally {
      setPracticeLoading(false);
    }
  }
  return <AsyncView loading={!error && !course} error={error}>{course && <section className="mx-auto max-w-4xl space-y-6"><div className="space-y-4"><div className="space-y-3"><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{course.title[language]}</h1><p className="text-lg text-muted-foreground">{course.description[language]}</p></div>{lessons.length > 0 && <div className="flex flex-wrap gap-2"><Button asChild><Link to={`/courses/${course.slug}/lessons/${continueLesson.slug}`}><CirclePlay className="size-4" />{language === "ar" ? "متابعة التعلّم" : "Continue learning"}</Link></Button><Button variant="outline" onClick={() => void openCoursePractice()}><ClipboardCheck className="size-4" />{language === "ar" ? "تدريب المقرر" : "Practice this course"}</Button></div>}</div><Card><CardHeader><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><ListChecks className="size-5" /></span><div><CardTitle>{language === "ar" ? "الدروس" : "Lessons"}</CardTitle><CardDescription>{lessons.length} {language === "ar" ? "دروس متاحة" : "lessons available"}</CardDescription></div></div></CardHeader><CardContent>{lessons.length ? <ol className="space-y-1">{lessons.map((lesson, index) => { const complete = completedLessonIdSet.has(lesson.id); return <li key={lesson.id}><Button variant="ghost" asChild className="h-auto w-full justify-between px-3 py-3 text-start hover:bg-accent"><Link to={`/courses/${course.slug}/lessons/${lesson.slug}`}><span className="flex items-center gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">{index + 1}</span><span className="font-medium">{lesson.title[language]}</span></span><span className="flex items-center gap-2 text-muted-foreground">{complete ? <span className="flex items-center gap-1 text-primary"><CheckCircle2 className="size-4" aria-hidden="true" /><span className="text-xs font-medium">{language === "ar" ? "مكتمل" : "Completed"}</span></span> : <CirclePlay className="size-4" />}<ArrowRight className="size-4 rtl:rotate-180" /></span></Link></Button>{index < lessons.length - 1 && <Separator />}</li>; })}</ol> : <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground"><BookOpenCheck className="size-8" /><p>{language === "ar" ? "لا توجد دروس منشورة بعد." : "There are no published lessons yet."}</p></div>}</CardContent></Card>{showPractice && <section className="space-y-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><ClipboardCheck className="size-5" /></span><div><h2 className="text-2xl font-semibold">{language === "ar" ? "تدريب المقرر" : "Course practice"}</h2><p className="text-sm text-muted-foreground">{language === "ar" ? "أسئلة من دروس المقرر ومن أسئلته العامة." : "Questions from the course lessons and course-wide practice."}</p></div></div>{practiceLoading && <Card><CardContent className="py-8 text-center text-muted-foreground">{language === "ar" ? "جارٍ تحميل أسئلة التدريب…" : "Loading practice questions…"}</CardContent></Card>}{practiceError && <p className="text-sm text-destructive" role="alert">{practiceError}</p>}{courseQuestions && <QuestionPractice key={course.slug} questions={courseQuestions} scope="course" />}</section>}</section>}</AsyncView>;
}
