import { useState } from "react";
import { useLanguage } from "../app/language";
import type { Question } from "../lib/types";
import { studentState } from "../storage/student-state";
import { gradeQuestion } from "./grading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

function choices(question: Question, language: "ar" | "en"): string[] {
  if (typeof question.answer !== "object" || question.answer === null) return [];
  const all = (question.answer as { choices?: Record<string, unknown> }).choices?.[language];
  return Array.isArray(all) ? all.filter((choice): choice is string => typeof choice === "string") : [];
}

export function QuestionPractice({ questions, scope = "lesson" }: { questions: Question[]; scope?: "lesson" | "course" }) {
  const { language } = useLanguage();
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState<number | boolean | string>("");
  const [result, setResult] = useState<boolean | null>(null);
  if (!questions.length) {
    const emptyMessage = scope === "course"
      ? (language === "ar" ? "لا توجد أسئلة تدريبية متاحة لهذا المقرر بعد." : "No practice questions are available for this course yet.")
      : (language === "ar" ? "لا توجد أسئلة تدريبية متاحة لهذا الدرس بعد." : "No practice questions are available for this lesson yet.");
    return <Card><CardContent className="py-8 text-center text-muted-foreground">{emptyMessage}</CardContent></Card>;
  }
  const question = questions[index];
  const check = () => { setResult(gradeQuestion(question, response)); studentState.recordAttempt(question.id); };
  const next = () => { setIndex((index + 1) % questions.length); setResponse(""); setResult(null); };
  return <Card><CardContent className="space-y-6 p-5 sm:p-6"><div className="space-y-2"><div className="text-end text-sm text-muted-foreground">{index + 1} / {questions.length}</div><Progress value={((index + 1) / questions.length) * 100} /></div><h3 className="text-lg font-semibold leading-relaxed">{question.prompt[language]}</h3>
    {question.type === "mcq" && <RadioGroup value={typeof response === "number" ? String(response) : undefined} onValueChange={(value) => setResponse(Number(value))}>{choices(question, language).map((choice, choiceIndex) => <label key={choice} htmlFor={`question-${question.id}-${choiceIndex}`} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5"><RadioGroupItem value={String(choiceIndex)} id={`question-${question.id}-${choiceIndex}`} />{choice}</label>)}</RadioGroup>}
    {question.type === "true_false" && <RadioGroup value={typeof response === "boolean" ? String(response) : undefined} onValueChange={(value) => setResponse(value === "true")}>{[[true, language === "ar" ? "صح" : "True"], [false, language === "ar" ? "خطأ" : "False"]].map(([value, label]) => <label key={String(value)} htmlFor={`question-${question.id}-${value}`} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5"><RadioGroupItem value={String(value)} id={`question-${question.id}-${value}`} />{label}</label>)}</RadioGroup>}
    {question.type === "short_answer" && <Input aria-label={language === "ar" ? "إجابتك" : "Your answer"} value={typeof response === "string" ? response : ""} onChange={(event) => setResponse(event.target.value)} />}
    <div className="flex flex-wrap gap-2"><Button onClick={check}>{language === "ar" ? "تحقق" : "Check answer"}</Button><Button variant="outline" onClick={next}>{language === "ar" ? "السؤال التالي" : "Next question"}</Button></div>
    {result !== null && <Alert className={result ? "border-success/30 bg-success/10 text-success-foreground" : "border-destructive/30 bg-destructive/10 text-destructive"}><AlertTitle>{result ? (language === "ar" ? "إجابة صحيحة" : "Correct") : (language === "ar" ? "حاول مرة أخرى" : "Try again")}</AlertTitle><AlertDescription>{question.explanation[language]}</AlertDescription></Alert>}
  </CardContent></Card>;
}
