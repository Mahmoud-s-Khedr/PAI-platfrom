import type { Language } from "../lib/types";

interface StudentState {
  language: Language;
  completedLessonIds: number[];
  questionAttempts: Record<string, number>;
}

const key = "pai-platform.student-state.v1";
const fallback: StudentState = { language: "ar", completedLessonIds: [], questionAttempts: {} };

function read(): StudentState {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? "null") as Partial<StudentState> | null;
    if (!stored) return fallback;
    return {
      language: stored.language === "en" ? "en" : "ar",
      completedLessonIds: Array.isArray(stored.completedLessonIds) ? stored.completedLessonIds.filter(Number.isInteger) : [],
      questionAttempts: stored.questionAttempts && typeof stored.questionAttempts === "object" ? stored.questionAttempts : {},
    };
  } catch {
    return fallback;
  }
}

function write(state: StudentState) {
  localStorage.setItem(key, JSON.stringify(state));
}

// This small interface deliberately isolates localStorage so it can later be backed by IndexedDB.
export const studentState = {
  read,
  setLanguage(language: Language) { write({ ...read(), language }); },
  completeLesson(id: number) {
    const state = read();
    write({ ...state, completedLessonIds: [...new Set([...state.completedLessonIds, id])] });
  },
  recordAttempt(questionId: number) {
    const state = read();
    const attemptKey = String(questionId);
    write({ ...state, questionAttempts: { ...state.questionAttempts, [attemptKey]: (state.questionAttempts[attemptKey] ?? 0) + 1 } });
  },
};
