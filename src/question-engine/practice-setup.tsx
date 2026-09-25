import { useState } from "react";
import { useLanguage } from "../app/language";
import type { LessonSummary, QuestionDifficulty, QuestionQueryOptions } from "../lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type PracticeScope = "course" | "lessons";

export interface PracticeSelection {
  scope: PracticeScope;
  lessonIds: number[];
  options: QuestionQueryOptions;
}

export function PracticeSetup({ lessons, onStart, loading }: {
  lessons: LessonSummary[];
  onStart: (selection: PracticeSelection) => void;
  loading: boolean;
}) {
  const { language } = useLanguage();
  const [scope, setScope] = useState<PracticeScope>("course");
  const [lessonIds, setLessonIds] = useState<number[]>(() => lessons.map((lesson) => lesson.id));
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | "all">("all");
  const [count, setCount] = useState<"5" | "10" | "20" | "50" | "all">("20");
  const toggleLesson = (lessonId: number) => setLessonIds((current) => current.includes(lessonId)
    ? current.filter((id) => id !== lessonId)
    : [...current, lessonId]);
  const selectedLessonsValid = scope !== "lessons" || lessonIds.length > 0;
  const options: QuestionQueryOptions = {
    difficulty: difficulty === "all" ? undefined : difficulty,
    limit: count === "all" ? undefined : Number(count),
    random: count !== "all",
  };

  return <Card><CardContent className="space-y-6 p-5 sm:p-6">
    <fieldset className="space-y-3"><legend className="font-medium">{language === "ar" ? "نطاق التدريب" : "Practice scope"}</legend>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"><input type="radio" name="practice-scope" checked={scope === "course"} onChange={() => setScope("course")} /><span><span className="block font-medium">{language === "ar" ? "كل أسئلة المقرر" : "All course questions"}</span><span className="text-sm text-muted-foreground">{language === "ar" ? "يشمل أسئلة الدروس والأسئلة العامة للمقرر." : "Includes lesson-mapped and course-wide questions."}</span></span></label>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"><input type="radio" name="practice-scope" checked={scope === "lessons"} onChange={() => setScope("lessons")} /><span><span className="block font-medium">{language === "ar" ? "دروس محددة" : "Selected lessons"}</span><span className="text-sm text-muted-foreground">{language === "ar" ? "اختر درسًا واحدًا أو أكثر." : "Choose one or more lessons."}</span></span></label>
    </fieldset>
    {scope === "lessons" && <fieldset className="space-y-2"><legend className="font-medium">{language === "ar" ? "الدروس" : "Lessons"}</legend>
      {lessons.map((lesson) => <label key={lesson.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent"><input type="checkbox" checked={lessonIds.includes(lesson.id)} onChange={() => toggleLesson(lesson.id)} /><span>{lesson.title[language]}</span></label>)}
      {!lessonIds.length && <p className="text-sm text-destructive" role="alert">{language === "ar" ? "اختر درسًا واحدًا على الأقل." : "Select at least one lesson."}</p>}
    </fieldset>}
    <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">{language === "ar" ? "الصعوبة" : "Difficulty"}<select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={difficulty} onChange={(event) => setDifficulty(event.target.value as QuestionDifficulty | "all")}><option value="all">{language === "ar" ? "كل المستويات" : "All levels"}</option><option value="easy">{language === "ar" ? "سهل" : "Easy"}</option><option value="medium">{language === "ar" ? "متوسط" : "Medium"}</option><option value="hard">{language === "ar" ? "صعب" : "Hard"}</option></select></label>
      <label className="grid gap-2 text-sm font-medium">{language === "ar" ? "عدد الأسئلة" : "Questions"}<select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={count} onChange={(event) => setCount(event.target.value as typeof count)}><option value="5">5</option><option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="all">{language === "ar" ? "كل الأسئلة المطابقة" : "All matching questions"}</option></select></label>
    </div>
    <p className="text-sm text-muted-foreground">{language === "ar" ? "يُغيَّر ترتيب الأسئلة وخيارات الاختيار من متعدد لكل جلسة." : "Question and multiple-choice option order are randomized for each session."}</p>
    <Button onClick={() => onStart({ scope, lessonIds, options })} disabled={loading || !selectedLessonsValid}>{loading ? (language === "ar" ? "جارٍ بدء التدريب…" : "Starting practice…") : (language === "ar" ? "ابدأ التدريب" : "Start practice")}</Button>
  </CardContent></Card>;
}
