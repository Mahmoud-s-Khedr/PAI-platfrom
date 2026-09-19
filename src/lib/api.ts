import type { ApiError, Course, Lesson, LessonSummary, Question } from "./types";

async function get<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(body?.error.message ?? "Unable to load data");
  }
  return response.json() as Promise<T>;
}

export const api = {
  courses: () => get<Course[]>("/api/courses"),
  course: (slug: string) => get<Course>(`/api/courses/${encodeURIComponent(slug)}`),
  lessons: (courseSlug: string) => get<LessonSummary[]>(`/api/courses/${encodeURIComponent(courseSlug)}/lessons`),
  lesson: (id: number) => get<Lesson>(`/api/lessons/${id}`),
  lessonQuestions: (id: number) => get<Question[]>(`/api/questions?lesson=${id}`),
};
