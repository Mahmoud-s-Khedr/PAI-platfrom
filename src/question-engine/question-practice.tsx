import { useEffect, useState } from "react";
import { useLanguage } from "../app/language";
import type { Question } from "../lib/types";
import { studentState } from "../storage/student-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { gradeQuestion } from "./grading";
import { createPracticeSession } from "./practice-session";

type Response = number | boolean | string;
type SessionResults = Record<number, boolean>;
type SessionResponses = Record<number, Response>;

function choices(question: Question, language: "ar" | "en"): string[] {
  if (typeof question.answer !== "object" || question.answer === null) return [];
  const all = (question.answer as { choices?: Record<string, unknown> }).choices?.[language];
  return Array.isArray(all) ? all.filter((choice): choice is string => typeof choice === "string") : [];
}

function hasResponse(question: Question, response: Response): boolean {
  if (question.type === "short_answer") return typeof response === "string" && response.trim().length > 0;
  return typeof response === "number" || typeof response === "boolean";
}

export function isRenderableQuestion(question: Question): boolean {
  if (!question.prompt?.ar || !question.prompt?.en || !question.explanation?.ar || !question.explanation?.en) return false;
  if (typeof question.answer !== "object" || question.answer === null) return false;
  if (question.type === "mcq") {
    const answer = question.answer as { choices?: Record<string, unknown>; correctIndex?: unknown };
    const arChoices = answer.choices?.ar;
    const enChoices = answer.choices?.en;
    return Array.isArray(arChoices) && Array.isArray(enChoices)
      && arChoices.length > 0 && enChoices.length > 0
      && arChoices.every((choice) => typeof choice === "string") && enChoices.every((choice) => typeof choice === "string")
      && Number.isInteger(answer.correctIndex) && Number(answer.correctIndex) >= 0
      && Number(answer.correctIndex) < arChoices.length && Number(answer.correctIndex) < enChoices.length;
  }
  if (question.type === "true_false") return typeof (question.answer as { correct?: unknown }).correct === "boolean";
  if (question.type === "short_answer") {
    const acceptedAnswers = (question.answer as { acceptedAnswers?: unknown }).acceptedAnswers;
    return Array.isArray(acceptedAnswers) && acceptedAnswers.length > 0 && acceptedAnswers.every((answer) => typeof answer === "string");
  }
  return false;
}

export function QuestionPractice({ questions, scope = "lesson" }: { questions: Question[]; scope?: "lesson" | "lessons" | "course" }) {
  const { language } = useLanguage();
  const validQuestions = questions.filter(isRenderableQuestion);
  const invalidCount = questions.length - validQuestions.length;
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>(() => createPracticeSession(validQuestions));
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<SessionResponses>({});
  const [results, setResults] = useState<SessionResults>({});
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    setSessionQuestions(createPracticeSession(validQuestions));
    setIndex(0); setResponses({}); setResults({}); setShowSummary(false);
  // `questions` is the session boundary: a fresh API response starts over.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions]);

  if (!validQuestions.length) {
    if (questions.length) return <Alert variant="destructive" role="alert"><AlertTitle>{language === "ar" ? "لا يمكن عرض أسئلة التدريب" : "Practice questions are unavailable"}</AlertTitle><AlertDescription>{language === "ar" ? "تحتوي أسئلة التدريب على بيانات غير صالحة. يمكنك متابعة محتوى الدرس والمحاولة لاحقًا." : "These practice questions contain invalid data. You can continue with the lesson and try again later."}</AlertDescription></Alert>;
    const emptyMessage = scope === "course"
      ? (language === "ar" ? "لا توجد أسئلة تدريبية متاحة لهذا المقرر بعد." : "No practice questions are available for this course yet.")
      : scope === "lessons"
        ? (language === "ar" ? "لا توجد أسئلة تدريبية متاحة للدروس المحددة بعد." : "No practice questions are available for the selected lessons yet.")
        : (language === "ar" ? "لا توجد أسئلة تدريبية متاحة لهذا الدرس بعد." : "No practice questions are available for this lesson yet.");
    return <Card><CardContent className="py-8 text-center text-muted-foreground">{emptyMessage}</CardContent></Card>;
  }
  const question = sessionQuestions[index];
  const response = responses[question.id] ?? "";
  const result = results[question.id];
  const complete = Object.keys(results).length === sessionQuestions.length;
  const correct = Object.values(results).filter(Boolean).length;
  const incorrect = Object.values(results).filter((value) => !value).length;
  const setResponse = (value: Response) => setResponses((current) => ({ ...current, [question.id]: value }));
  const check = () => {
    if (result !== undefined || !hasResponse(question, response)) return;
    const isCorrect = gradeQuestion(question, response);
    setResults((current) => ({ ...current, [question.id]: isCorrect }));
    studentState.recordAttempt(question.id, isCorrect);
  };
  const restart = (nextQuestions: Question[]) => {
    setSessionQuestions(createPracticeSession(nextQuestions));
    setIndex(0); setResponses({}); setResults({}); setShowSummary(false);
  };

  if (complete && showSummary) return <Card><CardContent className="space-y-5 p-5 sm:p-6"><div className="space-y-1"><h3 className="text-xl font-semibold">{language === "ar" ? "نتيجة الجلسة" : "Session score"}</h3><p className="text-muted-foreground">{language === "ar" ? `${correct} إجابات صحيحة من ${sessionQuestions.length}` : `${correct} correct out of ${sessionQuestions.length}`}</p></div><Progress value={(correct / sessionQuestions.length) * 100} aria-label={language === "ar" ? "نتيجة الجلسة" : "Session score"} /><div className="flex flex-wrap gap-x-5 gap-y-1 text-sm"><span>{language === "ar" ? `صحيحة: ${correct}` : `Correct: ${correct}`}</span><span>{language === "ar" ? `غير صحيحة: ${incorrect}` : `Incorrect: ${incorrect}`}</span></div><div className="flex flex-wrap gap-2">{incorrect > 0 && <Button onClick={() => restart(sessionQuestions.filter((candidate) => results[candidate.id] === false))}>{language === "ar" ? "أعد الأسئلة غير الصحيحة" : "Retry incorrect questions"}</Button>}<Button variant="outline" onClick={() => restart(validQuestions)}>{language === "ar" ? "ابدأ جلسة جديدة" : "Start a new session"}</Button></div></CardContent></Card>;

  return <div className="space-y-3">{invalidCount > 0 && <Alert role="status"><AlertDescription>{language === "ar" ? "تم إخفاء سؤال تدريب غير صالح." : "An invalid practice question was hidden."}</AlertDescription></Alert>}<Card><CardContent className="space-y-6 p-5 sm:p-6"><div className="space-y-2"><div className="text-end text-sm text-muted-foreground">{index + 1} / {sessionQuestions.length}</div><Progress value={((index + 1) / sessionQuestions.length) * 100} /></div><h3 className="text-lg font-semibold leading-relaxed">{question.prompt[language]}</h3>
    {question.type === "mcq" && <RadioGroup value={typeof response === "number" ? String(response) : undefined} onValueChange={(value) => setResponse(Number(value))} disabled={result !== undefined}>{choices(question, language).map((choice, choiceIndex) => <label key={`${choice}-${choiceIndex}`} htmlFor={`question-${question.id}-${choiceIndex}`} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5"><RadioGroupItem value={String(choiceIndex)} id={`question-${question.id}-${choiceIndex}`} />{choice}</label>)}</RadioGroup>}
    {question.type === "true_false" && <RadioGroup value={typeof response === "boolean" ? String(response) : undefined} onValueChange={(value) => setResponse(value === "true")} disabled={result !== undefined}>{[[true, language === "ar" ? "صح" : "True"], [false, language === "ar" ? "خطأ" : "False"]].map(([value, label]) => <label key={String(value)} htmlFor={`question-${question.id}-${value}`} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5"><RadioGroupItem value={String(value)} id={`question-${question.id}-${value}`} />{label}</label>)}</RadioGroup>}
    {question.type === "short_answer" && <Input aria-label={language === "ar" ? "إجابتك" : "Your answer"} value={typeof response === "string" ? response : ""} onChange={(event) => setResponse(event.target.value)} disabled={result !== undefined} />}
    <div className="flex flex-wrap gap-2"><Button onClick={check} disabled={result !== undefined || !hasResponse(question, response)}>{language === "ar" ? "تحقق" : "Check answer"}</Button><Button variant="outline" onClick={() => setIndex((current) => current - 1)} disabled={index === 0}>{language === "ar" ? "السؤال السابق" : "Previous question"}</Button><Button variant="outline" onClick={() => setIndex((current) => current + 1)} disabled={result === undefined || index === sessionQuestions.length - 1}>{language === "ar" ? "السؤال التالي" : "Next question"}</Button>{complete && <Button onClick={() => setShowSummary(true)}>{language === "ar" ? "عرض النتيجة" : "View session score"}</Button>}</div>
    {result !== undefined && <Alert className={result ? "border-success/30 bg-success/10 text-success-foreground" : "border-destructive/30 bg-destructive/10 text-destructive"}><AlertTitle>{result ? (language === "ar" ? "إجابة صحيحة" : "Correct") : (language === "ar" ? "حاول مرة أخرى" : "Try again")}</AlertTitle><AlertDescription>{question.explanation[language]}</AlertDescription></Alert>}
  </CardContent></Card></div>;
}
