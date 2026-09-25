export type Language = "ar" | "en";
export type ContentStatus = "draft" | "published" | "archived";
export type LessonBlockType = "rich-text" | "image" | "file" | "code" | "callout" | "interactive";
export type QuestionType = "mcq" | "true_false" | "short_answer";
export type QuestionDifficulty = "easy" | "medium" | "hard";
export type AssetKind = "image" | "worksheet" | "dataset" | "resource";

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
  difficulty: QuestionDifficulty;
}

/** Optional controls for a public practice-question request. */
export interface QuestionQueryOptions {
  difficulty?: QuestionDifficulty;
  limit?: number;
  random?: boolean;
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

/** Request shapes for the protected content-management API. */
export interface AdminCourseInput {
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  status: ContentStatus;
  sortOrder: number;
}

export interface AdminLessonInput {
  courseId: number;
  slug: string;
  title: LocalizedText;
  youtubeVideoId: string | null;
  status: ContentStatus;
  sortOrder: number;
}

export interface AdminBlockInput {
  type: LessonBlockType;
  data: unknown;
  sortOrder: number;
}

export interface AdminQuestionInput {
  courseId: number;
  type: QuestionType;
  prompt: LocalizedText;
  answer: unknown;
  explanation: LocalizedText;
  difficulty: QuestionDifficulty;
  status: ContentStatus;
  lessonIds: number[];
}

export interface AdminQuestionFilters {
  search?: string;
  courseId?: number;
  lessonId?: number;
  type?: QuestionType;
  difficulty?: QuestionDifficulty;
  status?: ContentStatus;
}

/** Metadata is stored in D1; the binary is held only in the private R2 bucket. */
export interface AdminAsset {
  id: number;
  kind: AssetKind;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
  linkedBlockCount: number;
}
