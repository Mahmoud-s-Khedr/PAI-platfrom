import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { AdminQuestionInput, LocalizedText } from "../lib/types";
import { Field } from "./admin-shared";

type Language = "ar" | "en";

function localizedChoices(answer: unknown): { choices: LocalizedText[]; correctIndex: number } {
  const value = answer && typeof answer === "object" ? answer as Record<string, unknown> : {};
  const choices = value.choices && typeof value.choices === "object" ? value.choices as Record<string, unknown> : {};
  const ar = Array.isArray(choices.ar) ? choices.ar : [];
  const en = Array.isArray(choices.en) ? choices.en : [];
  const length = Math.max(1, ar.length, en.length);
  const correctIndex = typeof value.correctIndex === "number" && Number.isInteger(value.correctIndex) && value.correctIndex >= 0 && value.correctIndex < length ? value.correctIndex : 0;
  return {
    choices: Array.from({ length }, (_, index) => ({
      ar: typeof ar[index] === "string" ? ar[index] : "",
      en: typeof en[index] === "string" ? en[index] : "",
    })),
    correctIndex,
  };
}

function shortAnswers(answer: unknown): string[] {
  const value = answer && typeof answer === "object" ? answer as Record<string, unknown> : {};
  const answers = Array.isArray(value.acceptedAnswers) ? value.acceptedAnswers.filter((item): item is string => typeof item === "string") : [];
  return answers.length ? answers : [""];
}

export function QuestionAnswerFields({ question, onChange, language, error }: { question: AdminQuestionInput; onChange: (answer: unknown) => void; language: Language; error?: string }) {
  const text = language === "ar" ? {
    answers: "الإجابات", correct: "الإجابة الصحيحة", choice: "الخيار", remove: "حذف الخيار", add: "إضافة خيار", arabic: "العربية / Arabic", english: "English", true: "صح", false: "خطأ", accepted: "الإجابات المقبولة", acceptedHint: "أضف أي صيغة ينبغي اعتبارها صحيحة.", removeAnswer: "حذف الإجابة", addAnswer: "إضافة إجابة مقبولة",
  } : {
    answers: "Answers", correct: "Correct answer", choice: "Choice", remove: "Remove choice", add: "Add choice", arabic: "Arabic / العربية", english: "English", true: "True", false: "False", accepted: "Accepted answers", acceptedHint: "Add every wording that should be marked correct.", removeAnswer: "Remove answer", addAnswer: "Add accepted answer",
  };

  if (question.type === "true_false") {
    const value = question.answer && typeof question.answer === "object" ? question.answer as Record<string, unknown> : {};
    const correct = typeof value.correct === "boolean" ? value.correct : true;
    return <fieldset className="grid gap-3"><legend className="text-sm font-medium">{text.correct}</legend><RadioGroup value={String(correct)} onValueChange={(next) => onChange({ correct: next === "true" })} className="grid gap-2 sm:grid-cols-2">
      {[true, false].map((option) => <label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background p-3 text-sm font-medium has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5" key={String(option)}><RadioGroupItem value={String(option)} />{option ? text.true : text.false}</label>)}
    </RadioGroup>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}</fieldset>;
  }

  if (question.type === "short_answer") {
    const answers = shortAnswers(question.answer);
    return <fieldset className="grid gap-3"><legend className="text-sm font-medium">{text.accepted}</legend><p className="text-sm text-muted-foreground">{text.acceptedHint}</p><div className="grid gap-2">{answers.map((answer, index) => <div className="flex gap-2" key={index}><Input value={answer} onChange={(event) => onChange({ acceptedAnswers: answers.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} aria-label={`${text.accepted} ${index + 1}`} /><Button type="button" size="icon" variant="outline" onClick={() => onChange({ acceptedAnswers: answers.length === 1 ? [""] : answers.filter((_, itemIndex) => itemIndex !== index) })} aria-label={text.removeAnswer} disabled={answers.length === 1}><Minus className="size-4" /></Button></div>)}</div>
      <Button type="button" variant="outline" className="w-fit" onClick={() => onChange({ acceptedAnswers: [...answers, ""] })} disabled={answers.length >= 50}><Plus className="size-4" />{text.addAnswer}</Button>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}</fieldset>;
  }

  const { choices, correctIndex } = localizedChoices(question.answer);
  function updateChoice(index: number, languageKey: keyof LocalizedText, value: string) {
    const next = choices.map((choice, choiceIndex) => choiceIndex === index ? { ...choice, [languageKey]: value } : choice);
    onChange({ choices: { ar: next.map((choice) => choice.ar), en: next.map((choice) => choice.en) }, correctIndex });
  }
  function updateCorrect(nextCorrect: number) { onChange({ choices: { ar: choices.map((choice) => choice.ar), en: choices.map((choice) => choice.en) }, correctIndex: nextCorrect }); }
  function removeChoice(index: number) {
    const next = choices.filter((_, choiceIndex) => choiceIndex !== index);
    onChange({ choices: { ar: next.map((choice) => choice.ar), en: next.map((choice) => choice.en) }, correctIndex: Math.min(correctIndex > index ? correctIndex - 1 : correctIndex, next.length - 1) });
  }
  function addChoice() { const next = [...choices, { ar: "", en: "" }]; onChange({ choices: { ar: next.map((choice) => choice.ar), en: next.map((choice) => choice.en) }, correctIndex }); }

  return <fieldset className="grid gap-3"><legend className="text-sm font-medium">{text.answers}</legend><RadioGroup value={String(correctIndex)} onValueChange={(value) => updateCorrect(Number(value))} className="grid gap-3">
    {choices.map((choice, index) => <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end" key={index}><label className="flex cursor-pointer items-center gap-2 self-center text-sm font-medium"><RadioGroupItem value={String(index)} aria-label={`${text.correct}: ${text.choice} ${index + 1}`} />{index + 1}</label><Field label={text.arabic}><Input dir="rtl" lang="ar" value={choice.ar} onChange={(event) => updateChoice(index, "ar", event.target.value)} /></Field><Field label={text.english}><Input dir="ltr" lang="en" value={choice.en} onChange={(event) => updateChoice(index, "en", event.target.value)} /></Field><Button type="button" size="icon" variant="outline" onClick={() => removeChoice(index)} aria-label={text.remove} disabled={choices.length === 1}><Minus className="size-4" /></Button></div>)}
  </RadioGroup><Button type="button" variant="outline" className="w-fit" onClick={addChoice} disabled={choices.length >= 20}><Plus className="size-4" />{text.add}</Button>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}</fieldset>;
}
