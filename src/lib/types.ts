export type Language = "ar" | "en";
export type ContentStatus = "draft" | "published" | "archived";
export type LessonBlockType = "rich-text" | "image" | "code" | "callout" | "interactive";
export type QuestionType = "mcq" | "true_false" | "short_answer";

export interface LocalizedText {
  ar: string;
  en: string;
}

export interface Course {
  id: number;
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  sortOrder: number;
}

export interface LessonSummary {
  id: number;
  courseId: number;
  slug: string;
  title: LocalizedText;
  youtubeVideoId: string | null;
  sortOrder: number;
}

export interface LessonBlock {
  id: number;
  type: LessonBlockType | string;
  data: unknown;
}

export interface Lesson extends LessonSummary {
  blocks: LessonBlock[];
}

export interface Question {
  id: number;
  courseId: number;
  type: QuestionType;
  prompt: LocalizedText;
  answer: unknown;
  explanation: LocalizedText;
  difficulty: string;
}

export interface ApiError {
  error: { code: string; message: string };
}

export type UserRole = "admin" | "student";

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface SessionResponse {
  user: AuthUser | null;
}

/** Content-management representations are only returned by protected admin APIs. */
export interface AdminCourse extends Course {
  status: ContentStatus;
  lessonCount: number;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLessonBlock extends LessonBlock {
  sortOrder: number;
}

export interface AdminLessonSummary extends LessonSummary {
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLesson extends AdminLessonSummary {
  blocks: AdminLessonBlock[];
}

export interface AdminQuestion extends Question {
  status: ContentStatus;
  lessonIds: number[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminDashboardLesson extends AdminLessonSummary {
  directQuestionCount: number;
}

export interface AdminDashboardCourse extends AdminCourse {
  lessons: AdminDashboardLesson[];
}

export interface AdminDashboard {
  courses: AdminDashboardCourse[];
}
