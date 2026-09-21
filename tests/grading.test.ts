import { describe, expect, it } from "vitest";
import { gradeQuestion } from "../src/question-engine/grading";
import type { Question } from "../src/lib/types";

const common = { id: 1, courseId: 1, prompt: { ar: "س", en: "Q" }, explanation: { ar: "ش", en: "E" }, difficulty: "easy" as const };

describe("question grading", () => {
  it("grades MCQ answers by correct index", () => {
    const question: Question = { ...common, type: "mcq", answer: { correctIndex: 1 } };
    expect(gradeQuestion(question, 1)).toBe(true);
    expect(gradeQuestion(question, 0)).toBe(false);
  });
  it("grades true/false answers", () => {
    const question: Question = { ...common, type: "true_false", answer: { correct: true } };
    expect(gradeQuestion(question, true)).toBe(true);
    expect(gradeQuestion(question, false)).toBe(false);
  });
  it("grades short answers without case or outer-space sensitivity", () => {
    const question: Question = { ...common, type: "short_answer", answer: { acceptedAnswers: ["Python", "بايثون"] } };
    expect(gradeQuestion(question, " python ")).toBe(true);
    expect(gradeQuestion(question, "Java")).toBe(false);
  });
});
