import type { AdminAsset, AdminBlockInput, AdminCourse, AdminCourseInput, AdminDashboard, AdminLesson, AdminLessonBlock, AdminLessonInput, AdminLessonSummary, AdminQuestion, AdminQuestionFilters, AdminQuestionInput, ApiError, AssetKind, AuthUser, Course, Lesson, LessonSummary, Question, QuestionQueryOptions, SessionResponse } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(body?.error.message ?? "Unable to load data");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> { return request<T>(path); }

async function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "POST", headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
}

function patch<T>(path: string, body: unknown): Promise<T> { return request<T>(path, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
function put<T>(path: string, body: unknown): Promise<T> { return request<T>(path, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
function remove(path: string): Promise<void> { return request<void>(path, { method: "DELETE" }); }

async function upload<T>(path: string, body: FormData): Promise<T> { return request<T>(path, { method: "POST", body }); }

function queryString(filters: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== "") params.set(key, String(value));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const api = {
  courses: () => get<Course[]>("/api/courses"),
  course: (slug: string) => get<Course>(`/api/courses/${encodeURIComponent(slug)}`),
  lessons: (courseSlug: string) => get<LessonSummary[]>(`/api/courses/${encodeURIComponent(courseSlug)}/lessons`),
  lesson: (id: number) => get<Lesson>(`/api/lessons/${id}`),
  lessonQuestions: (id: number, options: QuestionQueryOptions = {}) => get<Question[]>(`/api/questions${queryString({ lesson: id, ...options })}`),
  courseQuestions: (slug: string, options: QuestionQueryOptions = {}) => get<Question[]>(`/api/questions${queryString({ course: slug, ...options })}`),
  session: () => get<SessionResponse>("/api/auth/session"),
  passwordLogin: (email: string, password: string) => post<{ user: AuthUser }>("/api/auth/password", { email, password }),
  adminDashboard: () => get<AdminDashboard>("/api/admin/dashboard"),
  adminCourses: () => get<AdminCourse[]>("/api/admin/courses"),
  adminCourse: (id: number) => get<AdminCourse>(`/api/admin/courses/${id}`),
  createAdminCourse: (input: AdminCourseInput) => post<AdminCourse>("/api/admin/courses", input),
  updateAdminCourse: (id: number, input: Partial<AdminCourseInput>) => patch<AdminCourse>(`/api/admin/courses/${id}`, input),
  deleteAdminCourse: (id: number) => remove(`/api/admin/courses/${id}`),
  adminCourseLessons: (courseId: number) => get<AdminLessonSummary[]>(`/api/admin/courses/${courseId}/lessons`),
  adminLesson: (id: number) => get<AdminLesson>(`/api/admin/lessons/${id}`),
  createAdminLesson: (input: AdminLessonInput) => post<AdminLesson>("/api/admin/lessons", input),
  updateAdminLesson: (id: number, input: Partial<AdminLessonInput>) => patch<AdminLesson>(`/api/admin/lessons/${id}`, input),
  archiveAdminLesson: (id: number) => remove(`/api/admin/lessons/${id}`),
  createAdminBlock: (lessonId: number, input: AdminBlockInput) => post<AdminLessonBlock>(`/api/admin/lessons/${lessonId}/blocks`, input),
  updateAdminBlock: (id: number, input: Partial<AdminBlockInput>) => patch<AdminLessonBlock>(`/api/admin/blocks/${id}`, input),
  deleteAdminBlock: (id: number) => remove(`/api/admin/blocks/${id}`),
  reorderAdminBlocks: (lessonId: number, blockIds: number[]) => put<AdminLesson>(`/api/admin/lessons/${lessonId}/blocks/order`, { blockIds }),
  adminQuestions: (filters: AdminQuestionFilters = {}) => get<AdminQuestion[]>(`/api/admin/questions${queryString(filters)}`),
  adminQuestion: (id: number) => get<AdminQuestion>(`/api/admin/questions/${id}`),
  createAdminQuestion: (input: AdminQuestionInput) => post<AdminQuestion>("/api/admin/questions", input),
  updateAdminQuestion: (id: number, input: Partial<AdminQuestionInput>) => patch<AdminQuestion>(`/api/admin/questions/${id}`, input),
  duplicateAdminQuestion: (id: number) => post<AdminQuestion>(`/api/admin/questions/${id}/duplicate`),
  archiveAdminQuestion: (id: number) => remove(`/api/admin/questions/${id}`),
  adminAssets: () => get<AdminAsset[]>("/api/admin/assets"),
  uploadAdminAsset: (kind: AssetKind, file: File) => { const body = new FormData(); body.set("kind", kind); body.set("file", file); return upload<AdminAsset>("/api/admin/assets", body); },
  deleteAdminAsset: (id: number) => remove(`/api/admin/assets/${id}`),
};
