import { describe, expect, it } from "vitest";
import { createPracticeSession, shuffleMcqChoices } from "../src/question-engine/practice-session";
import type { Question } from "../src/lib/types";

const mcq: Question = {
  id: 1, courseId: 1, type: "mcq", difficulty: "easy",
  prompt: { ar: "س", en: "Q" }, explanation: { ar: "ش", en: "E" },
  answer: { choices: { ar: ["أ", "ب", "ج"], en: ["A", "B", "C"] }, correctIndex: 1 },
};

describe("practice session randomization", () => {
  it("shuffles Arabic and English MCQ choices with one answer-preserving permutation", () => {
    const shuffled = shuffleMcqChoices(mcq, () => 0);
    expect(shuffled).not.toBe(mcq);
    expect(shuffled.answer).toEqual({ choices: { ar: ["ب", "ج", "أ"], en: ["B", "C", "A"] }, correctIndex: 0 });
    expect(mcq.answer).toEqual({ choices: { ar: ["أ", "ب", "ج"], en: ["A", "B", "C"] }, correctIndex: 1 });
  });

  it("creates a reordered immutable session without changing the source list", () => {
    const second = { ...mcq, id: 2 };
    const session = createPracticeSession([mcq, second], () => 0);
    expect(session.map((question) => question.id)).toEqual([2, 1]);
    expect(session).not.toEqual([mcq, second]);
  });
});
