import { Input } from "@/components/ui/input";
import type { AdminQuestionInput, QuestionType } from "../lib/types";

export const questionLabels: Record<QuestionType, { ar: string; en: string }> = {
  mcq: { ar: "اختيار من متعدد", en: "Multiple choice" },
  true_false: { ar: "صح أو خطأ", en: "True / false" },
  short_answer: { ar: "إجابة قصيرة", en: "Short answer" },
};

export function QuestionStudentPreview({ question, language }: { question: Pick<AdminQuestionInput, "type" | "prompt" | "answer">; language: "ar" | "en" }) {
  const answer = question.answer && typeof question.answer === "object" ? question.answer as Record<string, unknown> : {};
  const choices = answer.choices && typeof answer.choices === "object" ? (answer.choices as Record<string, unknown>)[language] : [];
  return <section className="space-y-5 rounded-xl border bg-card p-5 shadow-sm" aria-label={language === "ar" ? "معاينة السؤال" : "Question preview"}>
    <div><p className="text-sm font-medium text-muted-foreground">{questionLabels[question.type][language]}</p><p className="mt-2 text-xl font-semibold leading-relaxed">{question.prompt[language]}</p></div>
    {question.type === "mcq" && Array.isArray(choices) && <div className="grid gap-2">{choices.map((choice, index) => <label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background p-3 text-sm" key={index}><input type="radio" name="student-preview-answer" />{typeof choice === "string" ? choice : ""}</label>)}</div>}
    {question.type === "true_false" && <div className="grid gap-2 sm:grid-cols-2"><label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background p-3 text-sm"><input type="radio" name="student-preview-answer" />{language === "ar" ? "صح" : "True"}</label><label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background p-3 text-sm"><input type="radio" name="student-preview-answer" />{language === "ar" ? "خطأ" : "False"}</label></div>}
    {question.type === "short_answer" && <Input aria-label={language === "ar" ? "إجابة الطالب" : "Student answer"} placeholder={language === "ar" ? "اكتب إجابتك هنا" : "Type your answer"} />}
  </section>;
}
