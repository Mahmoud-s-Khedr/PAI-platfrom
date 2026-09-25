import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowRight, BookOpenCheck, CheckCircle2, CirclePlay, ClipboardCheck, ListChecks, RotateCcw, Search } from "lucide-react";
import { useLanguage } from "../app/language";
import { PageMetadata } from "../app/page-metadata";
import { AsyncView } from "../components/async-view";
import { NotFoundView } from "../components/not-found-view";
import { api } from "../lib/api";
import { isErrorCode, localizedErrorMessage } from "../lib/errors";
import type { Course, LessonSummary, Question } from "../lib/types";
import { QuestionPractice } from "../question-engine/question-practice";
import { PracticeSetup, type PracticeSelection } from "../question-engine/practice-setup";
import { studentState } from "../storage/student-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

export function CoursePage() {
  const { courseSlug = "" } = useParams();
  const location = useLocation();
  const { language } = useLanguage();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [studentProgress, setStudentProgress] = useState(() => studentState.read());
  const [practiceQuestions, setPracticeQuestions] = useState<Question[] | null>(null);
  const [practiceScope, setPracticeScope] = useState<"course" | "lessons">("course");
  const [practiceError, setPracticeError] = useState<unknown | null>(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [showPractice, setShowPractice] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [lessonFilter, setLessonFilter] = useState("");

  useEffect(() => {
    let current = true;
    setCourse(null); setLessons([]); setPracticeQuestions(null); setPracticeError(null); setShowPractice(false); setError(null);
    void Promise.all([api.course(courseSlug), api.lessons(courseSlug)])
      .then(([loadedCourse, loadedLessons]) => {
        if (!current) return;
        setCourse(loadedCourse); setLessons(loadedLessons);
      })
      .catch((reason: unknown) => { if (current) setError(reason); });
    return () => { current = false; };
  }, [courseSlug, loadAttempt]);

  useEffect(() => {
    if (location.hash === "#practice") setShowPractice(true);
  }, [location.hash]);

  useEffect(() => {
    const refreshProgress = () => setStudentProgress(studentState.read());
    window.addEventListener("focus", refreshProgress);
    window.addEventListener("storage", refreshProgress);
    window.addEventListener(studentState.changeEvent, refreshProgress);
    return () => {
      window.removeEventListener("focus", refreshProgress);
      window.removeEventListener("storage", refreshProgress);
      window.removeEventListener(studentState.changeEvent, refreshProgress);
    };
  }, []);

  const completedLessonIdSet = useMemo(() => new Set(studentProgress.completedLessonIds), [studentProgress.completedLessonIds]);
  const resumedLesson = studentProgress.lastOpenedLesson?.courseSlug === courseSlug
    ? lessons.find((lesson) => lesson.id === studentProgress.lastOpenedLesson?.lessonId && lesson.slug === studentProgress.lastOpenedLesson?.lessonSlug)
    : undefined;
  const continueLesson = resumedLesson ?? lessons.find((lesson) => !completedLessonIdSet.has(lesson.id)) ?? lessons[0];
  const completedCount = lessons.filter((lesson) => completedLessonIdSet.has(lesson.id)).length;
  const completion = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;
  const resultTotals = Object.values(studentProgress.questionResults).reduce((total, result) => ({ correct: total.correct + result.correct, incorrect: total.incorrect + result.incorrect }), { correct: 0, incorrect: 0 });
  const attemptTotal = resultTotals.correct + resultTotals.incorrect;
  const accuracy = attemptTotal ? Math.round((resultTotals.correct / attemptTotal) * 100) : null;
  const filteredLessons = useMemo(() => {
    const query = lessonFilter.trim().toLocaleLowerCase();
    if (!query) return lessons;
    return lessons.filter((lesson) => lesson.title.ar.toLocaleLowerCase().includes(query) || lesson.title.en.toLocaleLowerCase().includes(query));
  }, [lessonFilter, lessons]);

  async function startPractice(selection: PracticeSelection) {
    setPracticeLoading(true); setPracticeError(null); setPracticeQuestions(null); setPracticeScope(selection.scope);
    try {
      const questions = selection.scope === "course"
        ? await api.courseQuestions(courseSlug, selection.options)
        : await api.lessonsQuestions(selection.lessonIds, selection.options);
      setPracticeQuestions(questions);
    } catch (reason) {
      setPracticeError(reason);
    } finally {
      setPracticeLoading(false);
    }
  }

  const resetProgress = () => {
    const message = language === "ar" ? "هل تريد مسح تقدّمك ونتائج التدريب المحفوظة على هذا الجهاز؟" : "Clear saved progress and practice results on this device?";
    if (window.confirm(message)) studentState.resetProgress();
  };

  if (isErrorCode(error, "COURSE_NOT_FOUND")) return <NotFoundView kind="course" language={language} />;
  return <><PageMetadata title={course?.title[language]} description={course?.description[language] ?? (language === "ar" ? "تصفّح دروس المقرر وتدرّب عليها." : "Browse course lessons and practice questions.")} language={language} /><AsyncView loading={!error && !course} error={error} language={language} onRetry={() => setLoadAttempt((attempt) => attempt + 1)}>{course && <section className="mx-auto max-w-4xl space-y-6">
    <div className="space-y-4"><div className="space-y-3"><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{course.title[language]}</h1><p className="text-lg text-muted-foreground">{course.description[language]}</p></div>
      {lessons.length > 0 && <div className="flex flex-wrap gap-2"><Button asChild><Link to={`/courses/${course.slug}/lessons/${continueLesson.slug}`}><CirclePlay className="size-4" />{language === "ar" ? "متابعة التعلّم" : "Continue learning"}</Link></Button><Button variant="outline" onClick={() => { setShowPractice(true); setPracticeQuestions(null); setPracticeError(null); }}><ClipboardCheck className="size-4" />{language === "ar" ? "تدريب المقرر" : "Practice this course"}</Button></div>}
    </div>
    {lessons.length > 0 && <Card><CardContent className="space-y-4 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{language === "ar" ? "تقدّمك في المقرر" : "Your course progress"}</p><p className="text-sm text-muted-foreground">{language === "ar" ? `${completedCount} من ${lessons.length} دروس مكتملة` : `${completedCount} of ${lessons.length} lessons completed`}</p></div><Button variant="ghost" size="sm" onClick={resetProgress}><RotateCcw className="size-4" />{language === "ar" ? "إعادة ضبط التقدّم" : "Reset progress"}</Button></div><Progress value={completion} aria-label={language === "ar" ? `إكمال المقرر ${completion}%` : `Course completion ${completion}%`} /><div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground"><span>{language === "ar" ? `الإكمال: ${completion}%` : `Completion: ${completion}%`}</span><span>{language === "ar" ? `الإجابات الصحيحة: ${resultTotals.correct}` : `Correct answers: ${resultTotals.correct}`}</span><span>{language === "ar" ? `الإجابات غير الصحيحة: ${resultTotals.incorrect}` : `Incorrect answers: ${resultTotals.incorrect}`}</span><span>{language === "ar" ? `الدقة: ${accuracy === null ? "—" : `${accuracy}%`}` : `Accuracy: ${accuracy === null ? "—" : `${accuracy}%`}`}</span>{studentProgress.recentMistakeIds.length > 0 && <span>{language === "ar" ? `أسئلة تحتاج مراجعة: ${studentProgress.recentMistakeIds.length}` : `Questions to revisit: ${studentProgress.recentMistakeIds.length}`}</span>}</div></CardContent></Card>}
    <Card><CardHeader className="space-y-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><ListChecks className="size-5" /></span><div><CardTitle>{language === "ar" ? "الدروس" : "Lessons"}</CardTitle><CardDescription>{lessons.length} {language === "ar" ? "دروس متاحة" : "lessons available"}</CardDescription></div></div>{lessons.length > 1 && <div className="relative"><label className="sr-only" htmlFor="lesson-filter">{language === "ar" ? "تصفية الدروس" : "Filter lessons"}</label><Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input id="lesson-filter" className="ps-9" value={lessonFilter} onChange={(event) => setLessonFilter(event.target.value)} placeholder={language === "ar" ? "ابحث في دروس هذا المقرر" : "Filter lessons in this course"} /></div>}</CardHeader><CardContent>{lessons.length ? (filteredLessons.length ? <ol className="space-y-1">{filteredLessons.map((lesson, index) => { const complete = completedLessonIdSet.has(lesson.id); return <li key={lesson.id}><Button variant="ghost" asChild className="h-auto w-full justify-between px-3 py-3 text-start hover:bg-accent"><Link to={`/courses/${course.slug}/lessons/${lesson.slug}`}><span className="flex items-center gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">{lesson.sortOrder}</span><span className="font-medium">{lesson.title[language]}</span></span><span className="flex items-center gap-2 text-muted-foreground">{complete ? <span className="flex items-center gap-1 text-primary"><CheckCircle2 className="size-4" aria-hidden="true" /><span className="text-xs font-medium">{language === "ar" ? "مكتمل" : "Completed"}</span></span> : <CirclePlay className="size-4" />}<ArrowRight className="size-4 rtl:rotate-180" /></span></Link></Button>{index < filteredLessons.length - 1 && <Separator />}</li>; })}</ol> : <p className="py-6 text-center text-sm text-muted-foreground">{language === "ar" ? "لا توجد دروس مطابقة للبحث." : "No lessons match this filter."}</p>) : <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground"><BookOpenCheck className="size-8" /><p>{language === "ar" ? "لا توجد دروس منشورة بعد." : "There are no published lessons yet."}</p></div>}</CardContent></Card>
    {showPractice && <section id="practice" className="space-y-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><ClipboardCheck className="size-5" /></span><div><h2 className="text-2xl font-semibold">{language === "ar" ? "تدريب المقرر" : "Course practice"}</h2><p className="text-sm text-muted-foreground">{language === "ar" ? "اختر الدروس والصعوبة وعدد الأسئلة قبل البدء." : "Choose lessons, difficulty, and question count before starting."}</p></div></div><PracticeSetup lessons={lessons} onStart={(selection) => void startPractice(selection)} loading={practiceLoading} />{practiceError !== null && <div className="flex items-center gap-3" role="alert"><p className="text-sm text-destructive">{localizedErrorMessage(practiceError, language)}</p><Button variant="outline" size="sm" onClick={() => { setPracticeError(null); }}>{language === "ar" ? "حاول مرة أخرى" : "Try again"}</Button></div>}{practiceQuestions && <QuestionPractice key={`${course.slug}-${practiceScope}-${practiceQuestions.map((question) => question.id).join("-")}`} questions={practiceQuestions} scope={practiceScope} />}</section>}
  </section>}</AsyncView></>;
}
