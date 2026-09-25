// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "../src/app/language";
import { api } from "../src/lib/api";
import { HomePage } from "../src/pages/home-page";
import { CoursePage } from "../src/pages/course-page";
import { LessonPage } from "../src/pages/lesson-page";
import { studentState } from "../src/storage/student-state";
import type { Course, Lesson, LessonSummary, Question } from "../src/lib/types";

vi.mock("../src/lib/api", () => ({
  api: {
    courses: vi.fn(), course: vi.fn(), lessons: vi.fn(), lesson: vi.fn(),
    lessonQuestions: vi.fn(), lessonsQuestions: vi.fn(), courseQuestions: vi.fn(),
  },
}));

const course: Course = {
  id: 1, slug: "first-secondary", title: { ar: "الصف الأول", en: "First Secondary" },
  description: { ar: "وصف عربي", en: "English description" }, sortOrder: 1,
};
const lessons: LessonSummary[] = [
  { id: 1, courseId: 1, slug: "python-basics", title: { ar: "أساسيات بايثون", en: "Python basics" }, youtubeVideoId: null, sortOrder: 1 },
  { id: 2, courseId: 1, slug: "python-next", title: { ar: "التالي", en: "Next lesson" }, youtubeVideoId: null, sortOrder: 2 },
];
const lesson: Lesson = { ...lessons[0], blocks: [{ id: 1, type: "callout", data: { tone: "key-concept", ar: "مفهوم مهم", en: "Important concept" } }] };
const questions: Question[] = [{
  id: 1, courseId: 1, type: "true_false", difficulty: "easy", prompt: { ar: "سؤال", en: "Question" },
  answer: { correct: true }, explanation: { ar: "شرح", en: "Explanation" },
}];

function setLanguage(language: "ar" | "en") {
  localStorage.clear();
  studentState.setLanguage(language);
}

function renderCourse() {
  return render(<LanguageProvider><MemoryRouter initialEntries={["/courses/first-secondary"]}><Routes><Route path="/courses/:courseSlug" element={<CoursePage />} /></Routes></MemoryRouter></LanguageProvider>);
}

function renderLesson() {
  return render(<LanguageProvider><MemoryRouter initialEntries={["/courses/first-secondary/lessons/python-basics"]}><Routes><Route path="/courses/:courseSlug/lessons/:lessonSlug" element={<LessonPage />} /></Routes></MemoryRouter></LanguageProvider>);
}

beforeEach(() => {
  vi.mocked(api.courses).mockResolvedValue([course]);
  vi.mocked(api.course).mockResolvedValue(course);
  vi.mocked(api.lessons).mockResolvedValue(lessons);
  vi.mocked(api.lesson).mockResolvedValue(lesson);
  vi.mocked(api.lessonQuestions).mockResolvedValue(questions);
});

describe.each([
  ["en", "Programming & Artificial Intelligence", "First Secondary", "Python basics", "Key concept"],
  ["ar", "البرمجة والذكاء الاصطناعي", "الصف الأول", "أساسيات بايثون", "مفهوم أساسي"],
] as const)("student screens in %s", (language, homeTitle, courseTitle, lessonTitle, calloutTitle) => {
  it("renders the home page with localized course data", async () => {
    setLanguage(language);
    render(<LanguageProvider><MemoryRouter><HomePage /></MemoryRouter></LanguageProvider>);
    expect(await screen.findByRole("heading", { name: homeTitle })).toBeInTheDocument();
    expect(screen.getByText(courseTitle)).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("lang", language);
    expect(document.documentElement).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
  });

  it("renders the course page and its responsive lesson action", async () => {
    setLanguage(language);
    renderCourse();
    expect(await screen.findByRole("heading", { name: courseTitle })).toBeInTheDocument();
    expect(screen.getByText(lessonTitle)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: language === "ar" ? "متابعة التعلّم" : "Continue learning" })).toHaveAttribute("href", "/courses/first-secondary/lessons/python-basics");
  });

  it("renders the lesson, practice entry point, and localized callout", async () => {
    setLanguage(language);
    renderLesson();
    expect(await screen.findByRole("heading", { name: lessonTitle })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(calloutTitle);
    expect(screen.getByRole("button", { name: language === "ar" ? "وضع علامة كمكتمل" : "Mark lesson complete" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: language === "ar" ? "التنقل بين الدروس" : "Lesson navigation" })).toHaveClass("flex-wrap");
  });
});
