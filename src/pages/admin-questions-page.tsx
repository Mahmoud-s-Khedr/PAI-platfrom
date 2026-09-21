import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Copy, Eye, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { AsyncView } from "../components/async-view";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "../app/language";
import { api } from "../lib/api";
import type {
  AdminCourse,
  AdminLessonSummary,
  AdminQuestion,
  AdminQuestionFilters,
  AdminQuestionInput,
  ContentStatus,
  QuestionType,
  QuestionDifficulty,
} from "../lib/types";
import {
  Field,
  LocalizedFields,
  StatusBadge,
  StatusSelect,
  adminCopy,
  formatAdminDate,
} from "./admin-shared";

const questionLabels = {
  mcq: { ar: "اختيار من متعدد", en: "Multiple choice" },
  true_false: { ar: "صح أو خطأ", en: "True / false" },
  short_answer: { ar: "إجابة قصيرة", en: "Short answer" },
} as const;
const questionTypes: QuestionType[] = ["mcq", "true_false", "short_answer"];

function defaultAnswer(type: QuestionType): unknown {
  if (type === "mcq")
    return { choices: { ar: [""], en: [""] }, correctIndex: 0 };
  if (type === "true_false") return { correct: true };
  return { acceptedAnswers: [""] };
}

function blankQuestion(courseId = 0): AdminQuestionInput {
  return {
    courseId,
    type: "mcq",
    prompt: { ar: "", en: "" },
    answer: defaultAnswer("mcq"),
    explanation: { ar: "", en: "" },
    difficulty: "easy",
    status: "draft",
    lessonIds: [],
  };
}

function inputFromQuestion(question: AdminQuestion): AdminQuestionInput {
  return {
    courseId: question.courseId,
    type: question.type,
    prompt: question.prompt,
    answer: question.answer,
    explanation: question.explanation,
    difficulty: question.difficulty,
    status: question.status,
    lessonIds: question.lessonIds,
  };
}

function QuestionPreview({
  input,
  answerJson,
  language,
}: {
  input: AdminQuestionInput;
  answerJson: string;
  language: "ar" | "en";
}) {
  let answer: unknown;
  try {
    answer = JSON.parse(answerJson);
  } catch {
    return (
      <p className="text-sm text-destructive">
        {language === "ar"
          ? "أصلح JSON للإجابة لإظهار المعاينة."
          : "Fix the answer JSON to show a preview."}
      </p>
    );
  }
  const record =
    answer && typeof answer === "object"
      ? (answer as Record<string, unknown>)
      : {};
  const choices =
    record.choices && typeof record.choices === "object"
      ? (record.choices as Record<string, unknown>)[language]
      : [];
  return (
    <section
      className="space-y-3 rounded-lg border bg-muted/20 p-4"
      aria-label={language === "ar" ? "معاينة السؤال" : "Question preview"}
    >
      <p className="text-sm font-semibold">
        {language === "ar" ? "معاينة الطالب" : "Student preview"}
      </p>
      <p className="text-lg font-medium">{input.prompt[language]}</p>
      {input.type === "mcq" && Array.isArray(choices) && (
        <ul className="grid gap-2">
          {choices.map((choice, index) => (
            <li
              className="rounded-md border bg-background p-3 text-sm"
              key={index}
            >
              {typeof choice === "string" ? choice : ""}
            </li>
          ))}
        </ul>
      )}
      {input.type === "true_false" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-md border bg-background p-3 text-sm">
            {language === "ar" ? "صح" : "True"}
          </div>
          <div className="rounded-md border bg-background p-3 text-sm">
            {language === "ar" ? "خطأ" : "False"}
          </div>
        </div>
      )}
      {input.type === "short_answer" && (
        <Input
          disabled
          aria-label={language === "ar" ? "إجابة الطالب" : "Student answer"}
        />
      )}
      {input.explanation[language] && (
        <p className="border-t pt-3 text-sm text-muted-foreground">
          {input.explanation[language]}
        </p>
      )}
    </section>
  );
}

export function AdminQuestionsPage() {
  const { language } = useLanguage();
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [filters, setFilters] = useState<AdminQuestionFilters>({});
  const [activeFilters, setActiveFilters] = useState<AdminQuestionFilters>({});
  const [filterLessons, setFilterLessons] = useState<AdminLessonSummary[]>([]);
  const [editorLessons, setEditorLessons] = useState<AdminLessonSummary[]>([]);
  const [question, setQuestion] = useState<AdminQuestionInput | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [answerJson, setAnswerJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  useEffect(() => {
    void api
      .adminCourses()
      .then(setCourses)
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error ? reason.message : "Unable to load courses",
        ),
      );
  }, []);
  useEffect(() => {
    setLoading(true);
    void api
      .adminQuestions(activeFilters)
      .then(setQuestions)
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error ? reason.message : "Unable to load questions",
        ),
      )
      .finally(() => setLoading(false));
  }, [activeFilters]);
  useEffect(() => {
    const courseId = filters.courseId;
    if (!courseId) {
      setFilterLessons([]);
      return;
    }
    void api
      .adminCourseLessons(courseId)
      .then(setFilterLessons)
      .catch(() => setFilterLessons([]));
  }, [filters.courseId]);
  useEffect(() => {
    const courseId = question?.courseId;
    if (!courseId) {
      setEditorLessons([]);
      return;
    }
    void api
      .adminCourseLessons(courseId)
      .then(setEditorLessons)
      .catch(() => setEditorLessons([]));
  }, [question?.courseId]);

  function openEditor(selected?: AdminQuestion) {
    const input = selected
      ? inputFromQuestion(selected)
      : blankQuestion(courses[0]?.id ?? 0);
    setQuestion(input);
    setEditingId(selected?.id ?? null);
    setAnswerJson(JSON.stringify(input.answer, null, 2));
    setError(null);
    setShowPreview(false);
  }
  function changeType(type: QuestionType) {
    if (!question) return;
    const answer = defaultAnswer(type);
    setQuestion({ ...question, type, answer });
    setAnswerJson(JSON.stringify(answer, null, 2));
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!question) return;
    let answer: unknown;
    try {
      answer = JSON.parse(answerJson);
    } catch {
      setError(
        language === "ar"
          ? "الإجابة يجب أن تكون JSON صالحًا"
          : "Answer must be valid JSON",
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = { ...question, answer };
      const updated = editingId
        ? await api.updateAdminQuestion(editingId, input)
        : await api.createAdminQuestion(input);
      setQuestions((current) =>
        editingId
          ? current.map((item) => (item.id === updated.id ? updated : item))
          : [updated, ...current],
      );
      setQuestion(inputFromQuestion(updated));
      setEditingId(updated.id);
      setAnswerJson(JSON.stringify(updated.answer, null, 2));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to save question",
      );
    } finally {
      setSaving(false);
    }
  }
  async function duplicate(id: number) {
    setSaving(true);
    setError(null);
    try {
      const copy = await api.duplicateAdminQuestion(id);
      setQuestions((current) => [copy, ...current]);
      openEditor(copy);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to duplicate question",
      );
    } finally {
      setSaving(false);
    }
  }
  async function archive(id: number) {
    if (
      !window.confirm(
        language === "ar"
          ? "هل تريد أرشفة هذا السؤال؟"
          : "Archive this question?",
      )
    )
      return;
    setSaving(true);
    setError(null);
    try {
      await api.archiveAdminQuestion(id);
      setQuestions((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status: "archived" } : item,
        ),
      );
      if (editingId === id)
        setQuestion((current) =>
          current ? { ...current, status: "archived" } : current,
        );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to archive question",
      );
    } finally {
      setSaving(false);
    }
  }
  function submitFilters(event: FormEvent) {
    event.preventDefault();
    setActiveFilters({
      ...filters,
      search: filters.search?.trim() || undefined,
      lessonId: filters.lessonId || undefined,
      courseId: filters.courseId || undefined,
      type: filters.type || undefined,
      difficulty: filters.difficulty,
      status: filters.status || undefined,
    });
  }
  return (
    <AsyncView
      loading={loading && !questions.length && !error}
      error={error && !question ? error : null}
    >
      <section className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button variant="link" className="px-0" asChild>
              <Link to="/admin">
                <ArrowLeft className="size-4" />
                {adminCopy[language].back}
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">
              {language === "ar" ? "بنك الأسئلة" : "Question bank"}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {language === "ar"
                ? "ابحث في الأسئلة وأنشئ المسودات وانشرها."
                : "Search questions, author drafts, and publish them."}
            </p>
          </div>
          <Button onClick={() => openEditor()} disabled={!courses.length}>
            <Plus className="size-4" />
            {language === "ar" ? "سؤال جديد" : "New question"}
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {language === "ar" ? "بحث وتصفية" : "Search and filter"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 md:grid-cols-3"
              onSubmit={submitFilters}
            >
              <Field
                label={language === "ar" ? "بحث في نص السؤال" : "Search prompt"}
              >
                <Input
                  value={filters.search ?? ""}
                  onChange={(event) =>
                    setFilters({ ...filters, search: event.target.value })
                  }
                />
              </Field>
              <Field label={language === "ar" ? "المقرر" : "Course"}>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={filters.courseId ?? ""}
                  onChange={(event) =>
                    setFilters({
                      ...filters,
                      courseId: event.target.value
                        ? Number(event.target.value)
                        : undefined,
                      lessonId: undefined,
                    })
                  }
                >
                  <option value="">
                    {language === "ar" ? "كل المقررات" : "All courses"}
                  </option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title[language]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={language === "ar" ? "الدرس" : "Lesson"}>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={filters.lessonId ?? ""}
                  onChange={(event) =>
                    setFilters({
                      ...filters,
                      lessonId: event.target.value
                        ? Number(event.target.value)
                        : undefined,
                    })
                  }
                  disabled={!filters.courseId}
                >
                  <option value="">
                    {language === "ar" ? "كل الدروس" : "All lessons"}
                  </option>
                  {filterLessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title[language]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={language === "ar" ? "النوع" : "Type"}>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={filters.type ?? ""}
                  onChange={(event) =>
                    setFilters({
                      ...filters,
                      type: (event.target.value as QuestionType) || undefined,
                    })
                  }
                >
                  <option value="">
                    {language === "ar" ? "كل الأنواع" : "All types"}
                  </option>
                  {questionTypes.map((type) => (
                    <option key={type} value={type}>
                      {questionLabels[type][language]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={language === "ar" ? "الصعوبة" : "Difficulty"}>
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={filters.difficulty ?? ""} onChange={(event) => setFilters({ ...filters, difficulty: (event.target.value as QuestionDifficulty) || undefined })}>
                  <option value="">{language === "ar" ? "كل المستويات" : "All difficulties"}</option><option value="easy">{language === "ar" ? "سهل" : "Easy"}</option><option value="medium">{language === "ar" ? "متوسط" : "Medium"}</option><option value="hard">{language === "ar" ? "صعب" : "Hard"}</option>
                </select>
              </Field>
              <Field label={language === "ar" ? "الحالة" : "Status"}>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={filters.status ?? ""}
                  onChange={(event) =>
                    setFilters({
                      ...filters,
                      status:
                        (event.target.value as ContentStatus) || undefined,
                    })
                  }
                >
                  <option value="">
                    {language === "ar" ? "كل الحالات" : "All statuses"}
                  </option>
                  <option value="draft">
                    {language === "ar" ? "مسودة" : "Draft"}
                  </option>
                  <option value="published">
                    {language === "ar" ? "منشور" : "Published"}
                  </option>
                  <option value="archived">
                    {language === "ar" ? "مؤرشف" : "Archived"}
                  </option>
                </select>
              </Field>
              <Button className="self-end">
                {language === "ar" ? "تطبيق" : "Apply"}
              </Button>
            </form>
          </CardContent>
        </Card>
        {question && (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingId
                  ? language === "ar"
                    ? "تحرير السؤال"
                    : "Edit question"
                  : language === "ar"
                    ? "سؤال جديد"
                    : "New question"}
              </CardTitle>
              <CardDescription>
                {language === "ar"
                  ? "تُربط الأسئلة بلا درس لتكون على مستوى المقرر بالكامل."
                  : "Leave every lesson unchecked to make the question course-wide."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={save}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label={language === "ar" ? "المقرر" : "Course"}>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                      value={question.courseId}
                      onChange={(event) =>
                        setQuestion({
                          ...question,
                          courseId: Number(event.target.value),
                          lessonIds: [],
                        })
                      }
                      required
                    >
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title[language]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={language === "ar" ? "النوع" : "Type"}>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                      value={question.type}
                      onChange={(event) =>
                        changeType(event.target.value as QuestionType)
                      }
                    >
                      {questionTypes.map((type) => (
                        <option key={type} value={type}>
                          {questionLabels[type][language]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={language === "ar" ? "الصعوبة" : "Difficulty"}>
                    <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={question.difficulty} onChange={(event) => setQuestion({ ...question, difficulty: event.target.value as QuestionDifficulty })}>
                      <option value="easy">{language === "ar" ? "سهل" : "Easy"}</option><option value="medium">{language === "ar" ? "متوسط" : "Medium"}</option><option value="hard">{language === "ar" ? "صعب" : "Hard"}</option>
                    </select>
                  </Field>
                </div>
                <LocalizedFields
                  label={language === "ar" ? "نص السؤال" : "Question prompt"}
                  value={question.prompt}
                  onChange={(prompt) => setQuestion({ ...question, prompt })}
                  multiline
                />
                <Field
                  label={language === "ar" ? "الإجابة (JSON)" : "Answer (JSON)"}
                >
                  <Textarea
                    dir="ltr"
                    className="min-h-36 font-mono"
                    value={answerJson}
                    onChange={(event) => setAnswerJson(event.target.value)}
                    required
                  />
                </Field>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPreview((visible) => !visible)}
                >
                  <Eye className="size-4" />
                  {language === "ar" ? "معاينة السؤال" : "Preview question"}
                </Button>
                {showPreview && (
                  <QuestionPreview
                    input={question}
                    answerJson={answerJson}
                    language={language}
                  />
                )}
                <LocalizedFields
                  label={language === "ar" ? "الشرح" : "Explanation"}
                  value={question.explanation}
                  onChange={(explanation) =>
                    setQuestion({ ...question, explanation })
                  }
                  multiline
                />
                <fieldset className="grid gap-2">
                  <legend className="text-sm font-medium">
                    {language === "ar" ? "الدروس المرتبطة" : "Mapped lessons"}
                  </legend>
                  {editorLessons.length ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {editorLessons.map((lesson) => (
                        <label
                          className="flex items-center gap-2 rounded-md border p-2 text-sm"
                          key={lesson.id}
                        >
                          <input
                            type="checkbox"
                            checked={question.lessonIds.includes(lesson.id)}
                            onChange={(event) =>
                              setQuestion({
                                ...question,
                                lessonIds: event.target.checked
                                  ? [...question.lessonIds, lesson.id]
                                  : question.lessonIds.filter(
                                      (id) => id !== lesson.id,
                                    ),
                              })
                            }
                          />
                          {lesson.title[language]}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {language === "ar"
                        ? "لا توجد دروس في هذا المقرر؛ سيكون السؤال على مستوى المقرر."
                        : "This course has no lessons; the question will be course-wide."}
                    </p>
                  )}
                </fieldset>
                <div className="max-w-xs">
                  <Field label={adminCopy[language].status}>
                    <StatusSelect
                      language={language}
                      value={question.status}
                      onChange={(status) =>
                        setQuestion({ ...question, status })
                      }
                    />
                  </Field>
                </div>
                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button disabled={saving}>
                    {saving
                      ? adminCopy[language].saving
                      : adminCopy[language].save}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setQuestion(null);
                      setEditingId(null);
                      setError(null);
                    }}
                  >
                    {adminCopy[language].cancel}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>
              {language === "ar"
                ? `النتائج (${questions.length})`
                : `Results (${questions.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {questions.length ? (
              <ul className="divide-y rounded-lg border">
                {questions.map((item) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 p-3"
                    key={item.id}
                  >
                    <button
                      className="min-w-0 text-start"
                      type="button"
                      onClick={() => openEditor(item)}
                    >
                      <p className="truncate font-medium">
                        {item.prompt[language]}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {questionLabels[item.type][language]} ·{" "}
                        {item.difficulty} ·{" "}
                        {formatAdminDate(item.updatedAt, language)}
                      </p>
                    </button>
                    <div className="flex items-center gap-1">
                      <StatusBadge status={item.status} language={language} />
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={
                          language === "ar"
                            ? "نسخ السؤال"
                            : "Duplicate question"
                        }
                        disabled={saving}
                        onClick={() => void duplicate(item.id)}
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={
                          language === "ar"
                            ? "أرشفة السؤال"
                            : "Archive question"
                        }
                        disabled={saving || item.status === "archived"}
                        onClick={() => void archive(item.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {language === "ar"
                  ? "لا توجد أسئلة مطابقة."
                  : "No questions match these filters."}
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </AsyncView>
  );
}
