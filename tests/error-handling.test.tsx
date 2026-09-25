// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AsyncView } from "../src/components/async-view";
import { NotFoundView } from "../src/components/not-found-view";
import { ApiRequestError, localizedErrorMessage } from "../src/lib/errors";
import { LanguageProvider } from "../src/app/language";
import { useLanguage } from "../src/app/language";
import { isRenderableQuestion, QuestionPractice } from "../src/question-engine/question-practice";
import { LessonVideo } from "../src/pages/lesson-page";
import type { Question } from "../src/lib/types";
import { studentState } from "../src/storage/student-state";

const question: Question = {
  id: 1, courseId: 1, type: "mcq", difficulty: "easy",
  prompt: { ar: "سؤال", en: "Question" }, explanation: { ar: "شرح", en: "Explanation" },
  answer: { choices: { ar: ["أ"], en: ["A"] }, correctIndex: 0 },
};

function LanguageProbe() {
  const { language } = useLanguage();
  return <p>{language}</p>;
}

describe("student-facing error states", () => {
  it("explains offline failure in Arabic and retries", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(<AsyncView loading={false} error={new ApiRequestError("OFFLINE")} language="ar" onRetry={retry}>content</AsyncView>);
    expect(screen.getByRole("alert")).toHaveTextContent("لا يوجد اتصال بالإنترنت");
    await user.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("renders a course-not-found route with a safe return link", () => {
    render(<MemoryRouter><NotFoundView kind="course" language="en" /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Course not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  });

  it("contains invalid questions rather than attempting to grade them", () => {
    studentState.setLanguage("en");
    const invalid = { ...question, answer: { choices: { ar: ["أ"], en: ["A"] }, correctIndex: 2 } };
    expect(isRenderableQuestion(invalid)).toBe(false);
    render(<LanguageProvider><QuestionPractice questions={[invalid]} /></LanguageProvider>);
    expect(screen.getByRole("alert")).toHaveTextContent("Practice questions are unavailable");
  });

  it("keeps the lesson usable when its video id is missing or invalid", () => {
    render(<LessonVideo videoId="bad$id" title="Lesson" language="en" />);
    expect(screen.getByText("This lesson video is not available right now")).toBeInTheDocument();
    expect(screen.queryByTitle("Lesson")).not.toBeInTheDocument();
  });

  it("preserves Arabic document direction through the language provider", () => {
    studentState.setLanguage("ar");
    render(<LanguageProvider><LanguageProbe /></LanguageProvider>);
    expect(screen.getByText("ar")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("uses understandable localized network copy", () => {
    expect(localizedErrorMessage(new ApiRequestError("NETWORK_ERROR"), "en")).toContain("could not connect");
    expect(localizedErrorMessage(new ApiRequestError("NETWORK_ERROR"), "ar")).toContain("تعذّر الاتصال");
  });
});
