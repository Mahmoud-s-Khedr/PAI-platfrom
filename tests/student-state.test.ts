import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { studentState } from "../src/storage/student-state";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => { values.set(key, value); },
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
  vi.stubGlobal("window", new EventTarget());
});

afterEach(() => vi.unstubAllGlobals());

describe("student state", () => {
  it("persists resume data, answer outcomes, mistakes, and completion locally", () => {
    studentState.openLesson({ courseSlug: "first", lessonSlug: "binary", lessonId: 4 });
    studentState.completeLesson(4);
    studentState.recordAttempt(9, false);
    studentState.recordAttempt(9, true);

    expect(studentState.read()).toMatchObject({
      completedLessonIds: [4],
      lastOpenedLesson: { courseSlug: "first", lessonSlug: "binary", lessonId: 4 },
      questionAttempts: { "9": 2 },
      questionResults: { "9": { correct: 1, incorrect: 1 } },
      recentMistakeIds: [],
    });
    expect(studentState.courseCompletion([4, 5, 6])).toBe(33);
  });

  it("resets progress without discarding the language preference", () => {
    studentState.setLanguage("en");
    studentState.completeLesson(4);
    studentState.recordAttempt(9, false);
    studentState.resetProgress();

    expect(studentState.read()).toEqual({ language: "en", completedLessonIds: [], questionAttempts: {}, questionResults: {}, recentMistakeIds: [], lastOpenedLesson: null });
  });

  it("can undo a lesson completion", () => {
    studentState.completeLesson(4);
    studentState.completeLesson(5);
    studentState.uncompleteLesson(4);
    expect(studentState.read().completedLessonIds).toEqual([5]);
  });
});
