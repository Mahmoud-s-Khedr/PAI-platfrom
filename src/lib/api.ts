import type { AdminDashboard, ApiError, AuthUser, Course, Lesson, LessonSummary, Question, SessionResponse } from "./types";

async function get<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(body?.error.message ?? "Unable to load data");
  }
  return response.json() as Promise<T>;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, { method: "POST", headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(result?.error.message ?? "Unable to complete request");
  }
  return response.json() as Promise<T>;
}

export const api = {
  courses: () => get<Course[]>("/api/courses"),
  course: (slug: string) => get<Course>(`/api/courses/${encodeURIComponent(slug)}`),
  lessons: (courseSlug: string) => get<LessonSummary[]>(`/api/courses/${encodeURIComponent(courseSlug)}/lessons`),
  lesson: (id: number) => get<Lesson>(`/api/lessons/${id}`),
  lessonQuestions: (id: number) => get<Question[]>(`/api/questions?lesson=${id}`),
  session: () => get<SessionResponse>("/api/auth/session"),
  passwordLogin: (email: string, password: string) => post<{ user: AuthUser }>("/api/auth/password", { email, password }),
  adminDashboard: () => get<AdminDashboard>("/api/admin/dashboard"),
};
