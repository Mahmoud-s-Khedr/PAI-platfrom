import { useEffect, useState, type FormEvent } from "react";
import { BookOpen, CircleHelp, FolderCog, Image, Plus } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);
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
        setError(
          reason instanceof Error
            ? reason.message
            : language === "ar"
              ? "تعذّر تحميل لوحة الإدارة"
              : "Unable to load the admin dashboard",
        ),
      );
  }, [language]);
  async function createCourse(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const course = await api.createAdminCourse(newCourse);
      navigate(`/admin/courses/${course.id}`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to create course",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <AsyncView loading={!dashboard && !error} error={error}>
      <section className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              {language === "ar" ? "إدارة المحتوى" : "Content management"}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {language === "ar"
                ? "أدر المقررات والدروس وبنك الأسئلة المنشور والمسودات."
                : "Manage courses, lessons, published content, and drafts."}
            </p>
          </div>
          <div className="flex gap-2">
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
              <form className="space-y-4" onSubmit={createCourse}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={language === "ar" ? "المعرّف" : "Slug"}>
                    <input
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                      value={newCourse.slug}
                      onChange={(event) =>
                        setNewCourse({ ...newCourse, slug: event.target.value })
                      }
                      required
                      dir="ltr"
                    />
                  </Field>
                  <Field
                    label={language === "ar" ? "ترتيب العرض" : "Display order"}
                  >
                    <input
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                      type="number"
                      min="0"
                      value={newCourse.sortOrder}
                      onChange={(event) =>
                        setNewCourse({
                          ...newCourse,
                          sortOrder: Number(event.target.value),
                        })
                      }
                      required
                    />
                  </Field>
                </div>
                <LocalizedFields
                  label={language === "ar" ? "العنوان" : "Title"}
                  value={newCourse.title}
                  onChange={(title) => setNewCourse({ ...newCourse, title })}
                />
                <LocalizedFields
                  label={language === "ar" ? "الوصف" : "Description"}
                  value={newCourse.description}
                  onChange={(description) =>
                    setNewCourse({ ...newCourse, description })
                  }
                  multiline
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
