import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { AsyncView } from "../components/async-view";
import { Button } from "@/components/ui/button";
import { useLanguage } from "../app/language";
import { api } from "../lib/api";
import type { AdminQuestion } from "../lib/types";
import { QuestionStudentPreview } from "./admin-question-preview";

export function AdminQuestionPreviewPage() {
  const { language } = useLanguage();
  const { questionId } = useParams();
  const id = Number(questionId);
  const [question, setQuestion] = useState<AdminQuestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isInteger(id) || id < 1) {
      setError(language === "ar" ? "معرّف السؤال غير صالح" : "Invalid question id");
      return;
    }
    void api.adminQuestion(id).then(setQuestion).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : language === "ar" ? "تعذّر تحميل السؤال." : "Unable to load question."));
  }, [id, language]);

  return <AsyncView loading={!question && !error} error={error}><section className="mx-auto max-w-3xl space-y-6"><div><Button variant="link" className="px-0" asChild><Link to={`/admin/questions/${id}/edit`}><ArrowLeft className="size-4" />{language === "ar" ? "العودة إلى تحرير السؤال" : "Back to editing"}</Link></Button><h1 className="text-3xl font-bold">{language === "ar" ? "معاينة الطالب" : "Student preview"}</h1></div>{question && <QuestionStudentPreview question={question} language={language} />}</section></AsyncView>;
}
