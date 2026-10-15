import type { Language } from "../lib/types";

export interface LastOpenedLesson {
  courseSlug: string;
  lessonSlug: string;
  lessonId: number;
  openedAt: number;
}

export interface QuestionResultCounts {
  correct: number;
  incorrect: number;
}

export interface StudentState {
  language: Language;
  completedLessonIds: number[];
  questionAttempts: Record<string, number>;
  questionResults: Record<string, QuestionResultCounts>;
  recentMistakeIds: number[];
  lastOpenedLesson: LastOpenedLesson | null;
}

const key = "pai-platform.student-state.v1";
const changeEvent = "pai-platform.student-state-change";
const fallback: StudentState = { language: "ar", completedLessonIds: [], questionAttempts: {}, questionResults: {}, recentMistakeIds: [], lastOpenedLesson: null };

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function resultCounts(value: unknown): QuestionResultCounts | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<QuestionResultCounts>;
  return typeof candidate.correct === "number" && Number.isInteger(candidate.correct) && candidate.correct >= 0
    && typeof candidate.incorrect === "number" && Number.isInteger(candidate.incorrect) && candidate.incorrect >= 0
    ? { correct: candidate.correct, incorrect: candidate.incorrect }
    : null;
}

function parseResults(value: unknown): Record<string, QuestionResultCounts> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([id, counts]) => {
    const parsed = resultCounts(counts);
    return parsed ? [[id, parsed]] : [];
  }));
}

function parseLastOpenedLesson(value: unknown): LastOpenedLesson | null {
  if (!value || typeof value !== "object") return null;
  const lesson = value as Partial<LastOpenedLesson>;
  return typeof lesson.courseSlug === "string" && typeof lesson.lessonSlug === "string" && positiveInteger(lesson.lessonId)
    && typeof lesson.openedAt === "number" && Number.isFinite(lesson.openedAt)
    ? { courseSlug: lesson.courseSlug, lessonSlug: lesson.lessonSlug, lessonId: lesson.lessonId, openedAt: lesson.openedAt }
    : null;
}

function read(): StudentState {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? "null") as Partial<StudentState> | null;
    if (!stored) return { ...fallback };
    return {
      language: stored.language === "en" ? "en" : "ar",
      completedLessonIds: Array.isArray(stored.completedLessonIds) ? [...new Set(stored.completedLessonIds.filter(positiveInteger))] : [],
      questionAttempts: stored.questionAttempts && typeof stored.questionAttempts === "object" && !Array.isArray(stored.questionAttempts)
        ? Object.fromEntries(Object.entries(stored.questionAttempts).filter(([, count]) => typeof count === "number" && Number.isInteger(count) && count >= 0)) : {},
      questionResults: parseResults(stored.questionResults),
      recentMistakeIds: Array.isArray(stored.recentMistakeIds) ? [...new Set(stored.recentMistakeIds.filter(positiveInteger))].slice(0, 20) : [],
      lastOpenedLesson: parseLastOpenedLesson(stored.lastOpenedLesson),
    };
  } catch {
    return { ...fallback };
  }
}

function write(state: StudentState) {
  try {
    localStorage.setItem(key, JSON.stringify(state));
    window.dispatchEvent(new Event(changeEvent));
  } catch {
    // Storage can be unavailable or full; the app continues with the current session.
  }
}

// This small interface deliberately isolates localStorage so it can later be backed by IndexedDB.
export const studentState = {
  read,
  setLanguage(language: Language) { write({ ...read(), language }); },
  completeLesson(id: number) {
    const state = read();
    write({ ...state, completedLessonIds: [...new Set([...state.completedLessonIds, id])] });
  },
  uncompleteLesson(id: number) {
    const state = read();
    write({ ...state, completedLessonIds: state.completedLessonIds.filter((completedId) => completedId !== id) });
  },
  openLesson(lesson: Omit<LastOpenedLesson, "openedAt">) {
    if (!positiveInteger(lesson.lessonId) || !lesson.courseSlug || !lesson.lessonSlug) return;
    write({ ...read(), lastOpenedLesson: { ...lesson, openedAt: Date.now() } });
  },
  recordAttempt(questionId: number, correct: boolean) {
    if (!positiveInteger(questionId)) return;
    const state = read();
    const attemptKey = String(questionId);
    const previous = state.questionResults[attemptKey] ?? { correct: 0, incorrect: 0 };
    const questionResults = { ...state.questionResults, [attemptKey]: { correct: previous.correct + (correct ? 1 : 0), incorrect: previous.incorrect + (correct ? 0 : 1) } };
    write({
      ...state,
      questionAttempts: { ...state.questionAttempts, [attemptKey]: (state.questionAttempts[attemptKey] ?? 0) + 1 },
      questionResults,
      recentMistakeIds: correct ? state.recentMistakeIds.filter((id) => id !== questionId) : [questionId, ...state.recentMistakeIds.filter((id) => id !== questionId)].slice(0, 20),
    });
  },
  courseCompletion(lessonIds: number[]) {
    const uniqueLessonIds = [...new Set(lessonIds.filter(positiveInteger))];
    if (!uniqueLessonIds.length) return 0;
    const completed = new Set(read().completedLessonIds);
    return Math.round((uniqueLessonIds.filter((id) => completed.has(id)).length / uniqueLessonIds.length) * 100);
  },
  resetProgress() {
    write({ ...fallback, language: read().language });
  },
  changeEvent,
};
