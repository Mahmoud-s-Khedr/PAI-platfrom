import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AsyncView } from "../components/async-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "../app/language";
import { api } from "../lib/api";
import type { AdminCourse, AdminCourseInput, AdminLessonSummary } from "../lib/types";
import { Field, LocalizedFields, StatusBadge, StatusSelect, adminCopy, formatAdminDate } from "./admin-shared";
import { validateAdminCourse, type FormErrors } from "../lib/admin-validation";

function formFromCourse(course: AdminCourse): AdminCourseInput {
  return { slug: course.slug, title: course.title, description: course.description, status: course.status, sortOrder: course.sortOrder };
}

export function AdminCoursePage() {
  const { language } = useLanguage();
  const { courseId } = useParams();
  const navigate = useNavigate();
  const id = Number(courseId);
  const [course, setCourse] = useState<AdminCourse | null>(null);
  const [lessons, setLessons] = useState<AdminLessonSummary[]>([]);
  const [form, setForm] = useState<AdminCourseInput | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!Number.isInteger(id) || id < 1) { setLoadError(language === "ar" ? "معرّف المقرر غير صالح" : "Invalid course id"); return; }
    void Promise.all([api.adminCourse(id), api.adminCourseLessons(id)]).then(([loadedCourse, loadedLessons]) => { setCourse(loadedCourse); setLessons(loadedLessons); setForm(formFromCourse(loadedCourse)); }).catch((reason: unknown) => setLoadError(reason instanceof Error ? reason.message : "Unable to load course"));
  }, [id, language]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    const validation = validateAdminCourse(form, language); setErrors(validation);
    if (Object.keys(validation).length) return;
    setSaving(true); setActionError(null);
    try { const updated = await api.updateAdminCourse(id, form); setCourse(updated); setForm(formFromCourse(updated)); }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : language === "ar" ? "تعذّر حفظ المقرر." : "Unable to save course."); }
    finally { setSaving(false); }
  }

  async function createLesson() {
    if (!course) return;
    setSaving(true); setActionError(null);
    try {
      const nextOrder = Math.max(0, ...lessons.map((lesson) => lesson.sortOrder)) + 1;
      const lesson = await api.createAdminLesson({ courseId: course.id, slug: `new-lesson-${Date.now()}`, title: { ar: "درس جديد", en: "New lesson" }, youtubeVideoId: null, status: "draft", sortOrder: nextOrder });
      navigate(`/admin/lessons/${lesson.id}`);
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : language === "ar" ? "تعذّر إنشاء الدرس." : "Unable to create lesson."); }
    finally { setSaving(false); }
  }

  async function removeCourse() {
    if (!course || !window.confirm(language === "ar"
      ? "سيؤدي حذف المقرر نهائيًا إلى حذف دروسه وكتل المحتوى والأسئلة المرتبطة به. لا يمكن التراجع. متابعة؟"
      : "This permanently deletes the course, its lessons, content blocks, and questions. This cannot be undone. Continue?")) return;
    setSaving(true); setActionError(null);
    try {
      await api.deleteAdminCourse(course.id);
      navigate("/admin");
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : language === "ar" ? "تعذّر حذف المقرر." : "Unable to delete course."); }
    finally { setSaving(false); }
  }

  return (
    <AsyncView loading={!course && !loadError} error={loadError}>
      <section className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button variant="link" className="px-0" asChild>
              <Link to="/admin"><ArrowLeft className="size-4" />{adminCopy[language].back}</Link>
            </Button>
            <h1 className="text-3xl font-bold">{course?.title[language]}</h1>
          </div>
          {course && <StatusBadge status={course.status} language={language} />}
        </div>
        {form && <Card>
          <CardHeader><CardTitle>{language === "ar" ? "بيانات المقرر" : "Course details"}</CardTitle><CardDescription>{course?.updatedAt && `${language === "ar" ? "آخر تحديث" : "Last updated"}: ${formatAdminDate(course.updatedAt, language)}`}</CardDescription></CardHeader>
          <CardContent><form className="space-y-5" onSubmit={save} noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={adminCopy[language].slug} error={errors.slug}><Input value={form.slug} dir="ltr" onChange={(event) => { setForm({ ...form, slug: event.target.value }); setErrors(({ slug, ...rest }) => rest); }} required /></Field>
              <Field label={adminCopy[language].order} error={errors.sortOrder}><Input type="number" min="0" value={form.sortOrder} onChange={(event) => { setForm({ ...form, sortOrder: Number(event.target.value) }); setErrors(({ sortOrder, ...rest }) => rest); }} required /></Field>
            </div>
            <LocalizedFields label={language === "ar" ? "العنوان" : "Title"} value={form.title} onChange={(title) => setForm({ ...form, title })} onFieldChange={(key) => setErrors(({ [`title.${key}`]: _, ...rest }) => rest)} errors={{ ar: errors["title.ar"], en: errors["title.en"] }} />
            <LocalizedFields label={language === "ar" ? "الوصف" : "Description"} value={form.description} onChange={(description) => setForm({ ...form, description })} onFieldChange={(key) => setErrors(({ [`description.${key}`]: _, ...rest }) => rest)} multiline required={false} errors={{ ar: errors["description.ar"], en: errors["description.en"] }} />
            <div className="max-w-xs"><Field label={adminCopy[language].status}><StatusSelect language={language} value={form.status} onChange={(status) => setForm({ ...form, status })} /></Field></div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={saving}>{saving ? adminCopy[language].saving : adminCopy[language].save}</Button>
              <Button type="button" variant="destructive" disabled={saving} onClick={() => void removeCourse()}>
                <Trash2 className="size-4" />{language === "ar" ? "حذف المقرر" : "Delete course"}
              </Button>
            </div>
            {actionError && <p className="text-sm text-destructive" role="alert">{actionError}</p>}
            <p className="text-sm text-muted-foreground">{language === "ar" ? "الحذف نهائي ويشمل الدروس وكتل المحتوى والأسئلة المرتبطة." : "Deletion is permanent and includes its lessons, content blocks, and questions."}</p>
          </form></CardContent>
        </Card>}
        <Card>
          <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{language === "ar" ? "الدروس" : "Lessons"}</CardTitle><Button onClick={createLesson} disabled={saving || !course}><Plus className="size-4" />{language === "ar" ? "درس جديد" : "New lesson"}</Button></div></CardHeader>
          <CardContent>{lessons.length ? <ul className="divide-y rounded-lg border">{lessons.map((lesson) => <li className="flex flex-wrap items-center justify-between gap-3 p-3" key={lesson.id}><div><Link to={`/admin/lessons/${lesson.id}`} className="font-medium hover:underline">{lesson.title[language]}</Link><p className="text-sm text-muted-foreground">{lesson.slug} · {language === "ar" ? "ترتيب" : "Order"} {lesson.sortOrder}</p></div><div className="flex items-center gap-3"><span className="text-sm text-muted-foreground">{formatAdminDate(lesson.updatedAt, language)}</span><StatusBadge status={lesson.status} language={language} /></div></li>)}</ul> : <p className="text-sm text-muted-foreground">{language === "ar" ? "لا توجد دروس في هذا المقرر بعد." : "There are no lessons in this course yet."}</p>}</CardContent>
        </Card>
      </section>
    </AsyncView>
  );
}
