import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Eye } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AsyncView } from "../components/async-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "../app/language";
import { api } from "../lib/api";
import type { AdminCourse, AdminLessonSummary, AdminQuestion, AdminQuestionInput, QuestionDifficulty, QuestionType } from "../lib/types";
import { validateAdminQuestion, type FormErrors } from "../lib/admin-validation";
import { Field, LocalizedFields, StatusSelect, adminCopy } from "./admin-shared";
import { QuestionAnswerFields } from "./admin-question-answer-fields";
import { questionLabels } from "./admin-question-preview";

const questionTypes: QuestionType[] = ["mcq", "true_false", "short_answer"];
function defaultAnswer(type: QuestionType): unknown { return type === "mcq" ? { choices: { ar: [""], en: [""] }, correctIndex: 0 } : type === "true_false" ? { correct: true } : { acceptedAnswers: [""] }; }
function blankQuestion(courseId = 0): AdminQuestionInput { return { courseId, type: "mcq", prompt: { ar: "", en: "" }, answer: defaultAnswer("mcq"), explanation: { ar: "", en: "" }, difficulty: "easy", status: "draft", lessonIds: [] }; }
function inputFromQuestion(question: AdminQuestion): AdminQuestionInput { return { courseId: question.courseId, type: question.type, prompt: question.prompt, answer: question.answer, explanation: question.explanation, difficulty: question.difficulty, status: question.status, lessonIds: question.lessonIds }; }

export function AdminQuestionEditorPage() {
  const { language } = useLanguage();
  const { questionId } = useParams();
  const navigate = useNavigate();
  const isNew = questionId === undefined || questionId === "new";
  const id = Number(questionId);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [lessons, setLessons] = useState<AdminLessonSummary[]>([]);
  const [question, setQuestion] = useState<AdminQuestionInput | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew && (!Number.isInteger(id) || id < 1)) { setLoadError(language === "ar" ? "معرّف السؤال غير صالح" : "Invalid question id"); return; }
    setLoadError(null);
    void Promise.all([api.adminCourses(), isNew ? Promise.resolve(null) : api.adminQuestion(id)])
      .then(([loadedCourses, loadedQuestion]) => { setCourses(loadedCourses); setQuestion(loadedQuestion ? inputFromQuestion(loadedQuestion) : blankQuestion(loadedCourses[0]?.id ?? 0)); })
      .catch((reason: unknown) => setLoadError(reason instanceof Error ? reason.message : language === "ar" ? "تعذّر تحميل السؤال." : "Unable to load question."));
  }, [id, isNew, language]);

  useEffect(() => {
    if (!question?.courseId) { setLessons([]); return; }
    void api.adminCourseLessons(question.courseId).then(setLessons).catch(() => setLessons([]));
  }, [question?.courseId]);

  function updateQuestion(next: AdminQuestionInput) { setQuestion(next); setActionError(null); }
  function changeType(type: QuestionType) { if (!question) return; updateQuestion({ ...question, type, answer: defaultAnswer(type) }); setErrors(({ answer: _answer, ...rest }) => rest); }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!question) return;
    const validation = validateAdminQuestion(question, language); setErrors(validation);
    if (Object.keys(validation).length) return;
    setSaving(true); setActionError(null);
    try {
      const saved = isNew ? await api.createAdminQuestion(question) : await api.updateAdminQuestion(id, question);
      navigate(`/admin/questions/${saved.id}/edit`, { replace: true });
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : language === "ar" ? "تعذّر حفظ السؤال." : "Unable to save question."); }
    finally { setSaving(false); }
  }

  return <AsyncView loading={!question && !loadError} error={loadError}><section className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><Button variant="link" className="px-0" asChild><Link to="/admin/questions"><ArrowLeft className="size-4" />{language === "ar" ? "العودة إلى بنك الأسئلة" : "Back to question bank"}</Link></Button><h1 className="text-3xl font-bold">{isNew ? language === "ar" ? "سؤال جديد" : "New question" : language === "ar" ? "تحرير السؤال" : "Edit question"}</h1></div>
      {!isNew && <Button variant="outline" asChild><Link to={`/admin/questions/${id}/preview`}><Eye className="size-4" />{language === "ar" ? "معاينة الطالب" : "Student preview"}</Link></Button>}</div>
    {question && <Card><CardHeader><CardTitle>{language === "ar" ? "تفاصيل السؤال" : "Question details"}</CardTitle><CardDescription>{language === "ar" ? "اربط السؤال بالدروس المناسبة، أو اتركها فارغة ليظهر على مستوى المقرر بالكامل." : "Map the question to relevant lessons, or leave them clear to use it across the course."}</CardDescription></CardHeader><CardContent><form className="space-y-7" onSubmit={save} noValidate>
      <div className="grid gap-3 sm:grid-cols-3"><Field label={language === "ar" ? "المقرر" : "Course"} error={errors.courseId}><select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={question.courseId} onChange={(event) => { updateQuestion({ ...question, courseId: Number(event.target.value), lessonIds: [] }); setErrors(({ courseId, lessonIds, ...rest }) => rest); }} required>{courses.map((course) => <option key={course.id} value={course.id}>{course.title[language]}</option>)}</select></Field>
        <Field label={language === "ar" ? "النوع" : "Type"}><select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={question.type} onChange={(event) => changeType(event.target.value as QuestionType)}>{questionTypes.map((type) => <option key={type} value={type}>{questionLabels[type][language]}</option>)}</select></Field>
        <Field label={language === "ar" ? "الصعوبة" : "Difficulty"}><select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={question.difficulty} onChange={(event) => updateQuestion({ ...question, difficulty: event.target.value as QuestionDifficulty })}><option value="easy">{language === "ar" ? "سهل" : "Easy"}</option><option value="medium">{language === "ar" ? "متوسط" : "Medium"}</option><option value="hard">{language === "ar" ? "صعب" : "Hard"}</option></select></Field></div>
      <LocalizedFields label={language === "ar" ? "نص السؤال" : "Question prompt"} value={question.prompt} onChange={(prompt) => updateQuestion({ ...question, prompt })} onFieldChange={(key) => setErrors(({ [`prompt.${key}`]: _, ...rest }) => rest)} multiline errors={{ ar: errors["prompt.ar"], en: errors["prompt.en"] }} />
      <QuestionAnswerFields question={question} onChange={(answer) => { updateQuestion({ ...question, answer }); setErrors(({ answer: _answer, ...rest }) => rest); }} language={language} error={errors.answer} />
      <LocalizedFields label={language === "ar" ? "الشرح بعد الإجابة" : "Explanation after answering"} value={question.explanation} onChange={(explanation) => updateQuestion({ ...question, explanation })} onFieldChange={(key) => setErrors(({ [`explanation.${key}`]: _, ...rest }) => rest)} multiline errors={{ ar: errors["explanation.ar"], en: errors["explanation.en"] }} />
      <fieldset className="grid gap-2" aria-invalid={Boolean(errors.lessonIds) || undefined}><legend className="text-sm font-medium">{language === "ar" ? "الدروس المرتبطة" : "Mapped lessons"}</legend>{lessons.length ? <div className="grid gap-2 sm:grid-cols-2">{lessons.map((lesson) => <label className="flex items-center gap-2 rounded-md border p-2 text-sm" key={lesson.id}><input type="checkbox" checked={question.lessonIds.includes(lesson.id)} onChange={(event) => { updateQuestion({ ...question, lessonIds: event.target.checked ? [...question.lessonIds, lesson.id] : question.lessonIds.filter((lessonId) => lessonId !== lesson.id) }); setErrors(({ lessonIds, ...rest }) => rest); }} />{lesson.title[language]}</label>)}</div> : <p className="text-sm text-muted-foreground">{language === "ar" ? "لا توجد دروس في هذا المقرر؛ سيكون السؤال على مستوى المقرر." : "This course has no lessons, so the question will be course-wide."}</p>}</fieldset>{errors.lessonIds && <p className="text-sm text-destructive" role="alert">{errors.lessonIds}</p>}
      <div className="max-w-xs"><Field label={adminCopy[language].status}><StatusSelect language={language} value={question.status} onChange={(status) => updateQuestion({ ...question, status })} /></Field></div>
      {actionError && <p className="text-sm text-destructive" role="alert">{actionError}</p>}<div className="flex flex-wrap gap-2"><Button disabled={saving}>{saving ? adminCopy[language].saving : isNew ? language === "ar" ? "إنشاء السؤال" : "Create question" : adminCopy[language].save}</Button><Button type="button" variant="outline" asChild><Link to="/admin/questions">{adminCopy[language].cancel}</Link></Button></div>
    </form></CardContent></Card>}
  </section></AsyncView>;
}
