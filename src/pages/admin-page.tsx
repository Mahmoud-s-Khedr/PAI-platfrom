import { useEffect, useState, type FormEvent } from "react";
import { Bot, BookOpen, CircleHelp, FolderCog, Image, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../app/language";
import { AsyncView } from "../components/async-view";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "../lib/api";
import {
  type AdminCourseField,
  type AdminCourseFormErrors,
  validateAdminCourse,
} from "../lib/admin-course-validation";
import type { AdminCourseInput, AdminDashboard } from "../lib/types";
import {
  Field,
  LocalizedFields,
  StatusBadge,
  StatusSelect,
  formatAdminDate,
} from "./admin-shared";

export function AdminPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [courseErrors, setCourseErrors] = useState<AdminCourseFormErrors>({});
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCourse, setNewCourse] = useState<AdminCourseInput>({
    slug: "",
    title: { ar: "", en: "" },
    description: { ar: "", en: "" },
    status: "draft",
    sortOrder: 1,
  });
  useEffect(() => {
    void api
      .adminDashboard()
      .then(setDashboard)
      .catch((reason: unknown) =>
        setLoadError(
          reason instanceof Error
            ? reason.message
            : language === "ar"
              ? "تعذّر تحميل لوحة الإدارة"
              : "Unable to load the admin dashboard",
        ),
      );
  }, [language]);

  function updateNewCourse(
    next: AdminCourseInput,
    changedFields: AdminCourseField[],
  ) {
    setNewCourse(next);
    setCourseErrors((current) => {
      const nextErrors = { ...current };
      changedFields.forEach((field) => delete nextErrors[field]);
      return nextErrors;
    });
    setSubmitError(null);
  }

  async function createCourse(event: FormEvent) {
    event.preventDefault();
    const errors = validateAdminCourse(newCourse, language);
    setCourseErrors(errors);
    setSubmitError(null);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      const course = await api.createAdminCourse(newCourse);
      navigate(`/admin/courses/${course.id}`);
    } catch (reason) {
      setSubmitError(
        reason instanceof Error
          ? reason.message
          : language === "ar"
            ? "تعذّر إنشاء المقرر"
            : "Unable to create course",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <AsyncView loading={!dashboard && !loadError} error={loadError}>
      <section className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              {language === "ar" ? "إدارة المحتوى" : "Content management"}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/agents">
                <Bot className="size-4" />
                {language === "ar" ? "الوكلاء" : "Agents"}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/assets">
                <Image className="size-4" />
                {language === "ar" ? "الوسائط" : "Assets"}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/questions">
                <CircleHelp className="size-4" />
                {language === "ar" ? "بنك الأسئلة" : "Question bank"}
              </Link>
            </Button>
            <Button onClick={() => setCreating(!creating)}>
              <Plus className="size-4" />
              {language === "ar" ? "مقرر جديد" : "New course"}
            </Button>
          </div>
        </div>
        {creating && (
          <Card>
            <CardHeader>
              <CardTitle>
                {language === "ar" ? "إنشاء مقرر" : "Create course"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={createCourse} noValidate>
                {submitError && (
                  <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                    {submitError}
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={language === "ar" ? "المعرّف" : "Slug"} error={courseErrors.slug}>
                    <input
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm aria-invalid:border-destructive"
                      value={newCourse.slug}
                      onChange={(event) => {
                        updateNewCourse(
                          { ...newCourse, slug: event.target.value },
                          ["slug"],
                        );
                      }}
                      aria-invalid={Boolean(courseErrors.slug) || undefined}
                      dir="ltr"
                    />
                  </Field>
                  <Field
                    label={language === "ar" ? "ترتيب العرض" : "Display order"}
                    error={courseErrors.sortOrder}
                  >
                    <input
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm aria-invalid:border-destructive"
                      type="number"
                      min="0"
                      value={newCourse.sortOrder}
                      onChange={(event) => {
                        updateNewCourse(
                          { ...newCourse, sortOrder: Number(event.target.value) },
                          ["sortOrder"],
                        );
                      }}
                      aria-invalid={Boolean(courseErrors.sortOrder) || undefined}
                    />
                  </Field>
                </div>
                <LocalizedFields
                  label={language === "ar" ? "العنوان" : "Title"}
                  value={newCourse.title}
                  onChange={(title) => setNewCourse({ ...newCourse, title })}
                  onFieldChange={(key) => { setCourseErrors((current) => { const next = { ...current }; delete next[`title.${key}` as AdminCourseField]; return next; }); setSubmitError(null); }}
                  errors={{ ar: courseErrors["title.ar"], en: courseErrors["title.en"] }}
                />
                <LocalizedFields
                  label={language === "ar" ? "الوصف" : "Description"}
                  value={newCourse.description}
                  onChange={(description) => setNewCourse({ ...newCourse, description })}
                  onFieldChange={(key) => { setCourseErrors((current) => { const next = { ...current }; delete next[`description.${key}` as AdminCourseField]; return next; }); setSubmitError(null); }}
                  multiline
                  required={false}
                  errors={{ ar: courseErrors["description.ar"], en: courseErrors["description.en"] }}
                />
                <div className="max-w-xs">
                  <Field label={language === "ar" ? "الحالة" : "Status"}>
                    <StatusSelect
                      language={language}
                      value={newCourse.status}
                      onChange={(status) =>
                        setNewCourse({ ...newCourse, status })
                      }
                    />
                  </Field>
                </div>
                <Button disabled={saving}>
                  {saving
                    ? language === "ar"
                      ? "جارٍ الإنشاء…"
                      : "Creating…"
                    : language === "ar"
                      ? "إنشاء المقرر"
                      : "Create course"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
        <div className="space-y-5">
          {dashboard?.courses.map((course) => (
            <Card key={course.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="size-5" />
                      {course.title[language]}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {course.slug} ·{" "}
                      {language === "ar"
                        ? `آخر تحديث ${formatAdminDate(course.updatedAt, language)}`
                        : `Updated ${formatAdminDate(course.updatedAt, language)}`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={course.status} language={language} />
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/admin/courses/${course.id}`}>
                        <FolderCog className="size-4" />
                        {language === "ar" ? "تحرير" : "Edit"}
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3 text-sm">
                    <CircleHelp className="mb-1 size-4 text-muted-foreground" />
                    {language === "ar"
                      ? `${course.questionCount} سؤالًا في المقرر`
                      : `${course.questionCount} course questions`}
                  </div>
                  <div className="rounded-lg border p-3 text-sm">
                    {language === "ar"
                      ? `${course.lessonCount} درس`
                      : `${course.lessonCount} lessons`}
                  </div>
                </div>
                <ul className="divide-y rounded-lg border">
                  {course.lessons.map((lesson) => (
                    <li
                      key={lesson.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-3"
                    >
                      <div>
                        <Link
                          className="font-medium hover:underline"
                          to={`/admin/lessons/${lesson.id}`}
                        >
                          {lesson.title[language]}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {language === "ar"
                            ? `آخر تحديث ${formatAdminDate(lesson.updatedAt, language)}`
                            : `Updated ${formatAdminDate(lesson.updatedAt, language)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {language === "ar"
                            ? `${lesson.directQuestionCount} أسئلة مباشرة`
                            : `${lesson.directQuestionCount} mapped questions`}
                        </span>
                        <StatusBadge
                          status={lesson.status}
                          language={language}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </AsyncView>
  );
}
