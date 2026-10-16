export type Language = "ar" | "en";
export type ContentStatus = "draft" | "published" | "archived";
export type LessonBlockType = "rich-text" | "image" | "file" | "code" | "callout" | "interactive";
/** The intentionally small set of student-facing lesson callout styles. */
export const calloutTones = ["key-concept", "note", "tip", "warning", "example"] as const;
export type CalloutTone = (typeof calloutTones)[number];
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

/** Everything the student lesson screen needs, loaded in one request. */
export interface LessonPageData {
  course: Course;
  lessons: LessonSummary[];
  lesson: Lesson;
  questions: Question[];
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

/** Public, navigation-oriented search results never expose a question answer. */
export interface SearchLessonResult extends LessonSummary {
  courseSlug: string;
  courseTitle: LocalizedText;
}

export interface SearchQuestionResult {
  id: number;
  courseSlug: string;
  courseTitle: LocalizedText;
  prompt: LocalizedText;
  difficulty: QuestionDifficulty;
}

export interface SearchResults {
  courses: Course[];
  lessons: SearchLessonResult[];
  questions: SearchQuestionResult[];
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

/** A revocable MCP token for one of the teacher's AI agents. The secret is never returned after creation. */
export interface AgentToken {
  id: number;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface CreatedAgentToken {
  /** Plaintext `pai_agent_…` token; shown only in this response. */
  token: string;
  agent: AgentToken;
}

export interface AuditEntry {
  id: number;
  actorType: "admin" | "agent";
  actorId: number;
  actorName: string;
  action: string;
  entityType: string;
  entityId: number | null;
  summary: string;
  createdAt: string;
}
