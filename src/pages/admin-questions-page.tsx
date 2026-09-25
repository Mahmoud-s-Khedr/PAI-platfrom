import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Copy, Eye, Pencil, Plus, Trash2, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AsyncView } from "../components/async-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "../app/language";
import { api } from "../lib/api";
import type { AdminCourse, AdminLessonSummary, AdminQuestion, AdminQuestionFilters, ContentStatus, QuestionDifficulty, QuestionType } from "../lib/types";
import { Field, StatusBadge, adminCopy, formatAdminDate } from "./admin-shared";
import { questionLabels } from "./admin-question-preview";

const questionTypes: QuestionType[] = ["mcq", "true_false", "short_answer"];

export function AdminQuestionsPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [filters, setFilters] = useState<AdminQuestionFilters>({});
  const [activeFilters, setActiveFilters] = useState<AdminQuestionFilters>({});
  const [lessons, setLessons] = useState<AdminLessonSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void api.adminCourses().then(setCourses).catch((reason: unknown) => setLoadError(reason instanceof Error ? reason.message : "Unable to load courses")); }, []);
  useEffect(() => { setLoading(true); void api.adminQuestions(activeFilters).then(setQuestions).catch((reason: unknown) => setLoadError(reason instanceof Error ? reason.message : "Unable to load questions")).finally(() => setLoading(false)); }, [activeFilters]);
  useEffect(() => { if (!filters.courseId) { setLessons([]); return; } void api.adminCourseLessons(filters.courseId).then(setLessons).catch(() => setLessons([])); }, [filters.courseId]);

  function submitFilters(event: FormEvent) { event.preventDefault(); setActiveFilters({ ...filters, search: filters.search?.trim() || undefined, lessonId: filters.lessonId || undefined, courseId: filters.courseId || undefined, type: filters.type || undefined, difficulty: filters.difficulty || undefined, status: filters.status || undefined }); }
  function clearFilters() { setFilters({}); setActiveFilters({}); }
  async function duplicate(id: number) { setSaving(true); setActionError(null); try { const copy = await api.duplicateAdminQuestion(id); navigate(`/admin/questions/${copy.id}/edit`); } catch (reason) { setActionError(reason instanceof Error ? reason.message : language === "ar" ? "تعذّر نسخ السؤال." : "Unable to duplicate question."); } finally { setSaving(false); } }
  async function archive(id: number) { if (!window.confirm(language === "ar" ? "هل تريد أرشفة هذا السؤال؟" : "Archive this question?")) return; setSaving(true); setActionError(null); try { await api.archiveAdminQuestion(id); setQuestions((current) => current.map((item) => item.id === id ? { ...item, status: "archived" } : item)); } catch (reason) { setActionError(reason instanceof Error ? reason.message : language === "ar" ? "تعذّر أرشفة السؤال." : "Unable to archive question."); } finally { setSaving(false); } }

  return <AsyncView loading={loading && !questions.length && !loadError} error={loadError}><section className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><Button variant="link" className="px-0" asChild><Link to="/admin"><ArrowLeft className="size-4" />{adminCopy[language].back}</Link></Button><h1 className="text-3xl font-bold">{language === "ar" ? "بنك الأسئلة" : "Question bank"}</h1></div>{courses.length ? <Button asChild><Link to="/admin/questions/new"><Plus className="size-4" />{language === "ar" ? "سؤال جديد" : "New question"}</Link></Button> : <Button disabled><Plus className="size-4" />{language === "ar" ? "سؤال جديد" : "New question"}</Button>}</div>
    {actionError && <p className="text-sm text-destructive" role="alert">{actionError}</p>}
    <Card><CardHeader><CardTitle className="text-lg">{language === "ar" ? "بحث وتصفية" : "Search and filter"}</CardTitle></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-3" onSubmit={submitFilters}>
      <Field label={language === "ar" ? "بحث في نص السؤال" : "Search prompt"}><Input value={filters.search ?? ""} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></Field>
      <Field label={language === "ar" ? "المقرر" : "Course"}><select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={filters.courseId ?? ""} onChange={(event) => setFilters({ ...filters, courseId: event.target.value ? Number(event.target.value) : undefined, lessonId: undefined })}><option value="">{language === "ar" ? "كل المقررات" : "All courses"}</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title[language]}</option>)}</select></Field>
      <Field label={language === "ar" ? "الدرس" : "Lesson"}><select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={filters.lessonId ?? ""} onChange={(event) => setFilters({ ...filters, lessonId: event.target.value ? Number(event.target.value) : undefined })} disabled={!filters.courseId}><option value="">{language === "ar" ? "كل الدروس" : "All lessons"}</option>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title[language]}</option>)}</select></Field>
      <Field label={language === "ar" ? "النوع" : "Type"}><select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={filters.type ?? ""} onChange={(event) => setFilters({ ...filters, type: (event.target.value as QuestionType) || undefined })}><option value="">{language === "ar" ? "كل الأنواع" : "All types"}</option>{questionTypes.map((type) => <option key={type} value={type}>{questionLabels[type][language]}</option>)}</select></Field>
      <Field label={language === "ar" ? "الصعوبة" : "Difficulty"}><select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={filters.difficulty ?? ""} onChange={(event) => setFilters({ ...filters, difficulty: (event.target.value as QuestionDifficulty) || undefined })}><option value="">{language === "ar" ? "كل المستويات" : "All difficulties"}</option><option value="easy">{language === "ar" ? "سهل" : "Easy"}</option><option value="medium">{language === "ar" ? "متوسط" : "Medium"}</option><option value="hard">{language === "ar" ? "صعب" : "Hard"}</option></select></Field>
      <Field label={language === "ar" ? "الحالة" : "Status"}><select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={filters.status ?? ""} onChange={(event) => setFilters({ ...filters, status: (event.target.value as ContentStatus) || undefined })}><option value="">{language === "ar" ? "كل الحالات" : "All statuses"}</option><option value="draft">{language === "ar" ? "مسودة" : "Draft"}</option><option value="published">{language === "ar" ? "منشور" : "Published"}</option><option value="archived">{language === "ar" ? "مؤرشف" : "Archived"}</option></select></Field>
      <div className="flex self-end gap-2"><Button>{language === "ar" ? "تطبيق" : "Apply"}</Button><Button type="button" variant="outline" onClick={clearFilters}><X className="size-4" />{language === "ar" ? "مسح" : "Clear"}</Button></div>
    </form></CardContent></Card>
    <Card><CardHeader><CardTitle>{language === "ar" ? `النتائج (${questions.length})` : `Results (${questions.length})`}</CardTitle></CardHeader><CardContent>{questions.length ? <ul className="divide-y rounded-lg border">{questions.map((item) => <li className="flex flex-wrap items-center justify-between gap-3 p-3" key={item.id}><div className="min-w-0"><Link to={`/admin/questions/${item.id}/edit`} className="block truncate font-medium hover:underline">{item.prompt[language]}</Link><p className="text-sm text-muted-foreground">{questionLabels[item.type][language]} · {item.difficulty} · {formatAdminDate(item.updatedAt, language)}</p></div><div className="flex items-center gap-1"><StatusBadge status={item.status} language={language} /><Button size="icon" variant="ghost" asChild><Link to={`/admin/questions/${item.id}/preview`} aria-label={language === "ar" ? "معاينة السؤال" : "Preview question"}><Eye className="size-4" /></Link></Button><Button size="icon" variant="ghost" asChild><Link to={`/admin/questions/${item.id}/edit`} aria-label={language === "ar" ? "تحرير السؤال" : "Edit question"}><Pencil className="size-4" /></Link></Button><Button size="icon" variant="ghost" aria-label={language === "ar" ? "نسخ السؤال" : "Duplicate question"} disabled={saving} onClick={() => void duplicate(item.id)}><Copy className="size-4" /></Button><Button size="icon" variant="ghost" aria-label={language === "ar" ? "أرشفة السؤال" : "Archive question"} disabled={saving || item.status === "archived"} onClick={() => void archive(item.id)}><Trash2 className="size-4" /></Button></div></li>)}</ul> : <p className="text-sm text-muted-foreground">{language === "ar" ? "لا توجد أسئلة مطابقة." : "No questions match these filters."}</p>}</CardContent></Card>
  </section></AsyncView>;
}
