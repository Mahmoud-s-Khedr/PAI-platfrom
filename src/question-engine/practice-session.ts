import type { Question } from "../lib/types";

function randomIndex(random: () => number, upperBound: number) {
  return Math.floor(random() * upperBound);
}

/** A Fisher–Yates copy: source question order and D1 data are never mutated. */
export function shuffled<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const replacement = randomIndex(random, index + 1);
    [result[index], result[replacement]] = [result[replacement], result[index]];
  }
  return result;
}

/**
 * Shuffle MCQ choices without losing the answer mapping. The same permutation
 * is applied to Arabic and English choices, so switching language cannot make
 * a correct answer incorrect.
 */
export function shuffleMcqChoices(question: Question, random = Math.random): Question {
  if (question.type !== "mcq" || !question.answer || typeof question.answer !== "object") return question;
  const answer = question.answer as { choices?: { ar?: unknown; en?: unknown }; correctIndex?: unknown };
  const ar = answer.choices?.ar;
  const en = answer.choices?.en;
  const originalCorrectIndex = answer.correctIndex;
  if (!Array.isArray(ar) || !Array.isArray(en) || ar.length !== en.length || !Number.isInteger(originalCorrectIndex)
    || typeof originalCorrectIndex !== "number" || originalCorrectIndex < 0 || originalCorrectIndex >= ar.length) return question;

  const order = shuffled(ar.map((_, index) => index), random);
  const correctIndex = order.indexOf(originalCorrectIndex);
  return {
    ...question,
    answer: {
      ...answer,
      choices: { ar: order.map((index) => ar[index]), en: order.map((index) => en[index]) },
      correctIndex,
    },
  };
}

/** Prepare one immutable practice session with randomized questions and MCQs. */
export function createPracticeSession(questions: readonly Question[], random = Math.random): Question[] {
  return shuffled(questions, random).map((question) => shuffleMcqChoices(question, random));
}
