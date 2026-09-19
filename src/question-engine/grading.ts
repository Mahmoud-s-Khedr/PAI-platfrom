import type { Question } from "../lib/types";

function record(value: unknown): Record<string, unknown> | null { return typeof value === "object" && value !== null ? value as Record<string, unknown> : null; }
function normalized(value: string) { return value.trim().toLocaleLowerCase(); }

export function gradeQuestion(question: Question, response: number | boolean | string): boolean {
  const answer = record(question.answer);
  if (!answer) return false;
  if (question.type === "mcq") return typeof response === "number" && response === answer.correctIndex;
  if (question.type === "true_false") return typeof response === "boolean" && response === answer.correct;
  if (question.type === "short_answer" && typeof response === "string" && Array.isArray(answer.acceptedAnswers)) {
    return answer.acceptedAnswers.some((expected) => typeof expected === "string" && normalized(expected) === normalized(response));
  }
  return false;
}
