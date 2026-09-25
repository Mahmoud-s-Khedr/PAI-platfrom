// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../src/app/language";
import { SearchPage } from "../src/pages/search-page";
import { PageNotFound } from "../src/pages/page-not-found";
import { studentState } from "../src/storage/student-state";

vi.mock("../src/lib/api", () => ({
  api: { search: vi.fn().mockResolvedValue({
    courses: [],
    lessons: [{ id: 1, courseId: 1, slug: "python-basics", title: { ar: "أساسيات بايثون", en: "Python basics" }, youtubeVideoId: null, sortOrder: 1, courseSlug: "first-secondary", courseTitle: { ar: "الأول", en: "First Secondary" } }],
    questions: [{ id: 4, courseSlug: "first-secondary", courseTitle: { ar: "الأول", en: "First Secondary" }, prompt: { ar: "ما هي بايثون؟", en: "What is Python?" }, difficulty: "easy" }],
  }) },
}));

describe("public navigation", () => {
  beforeEach(() => {
    localStorage.clear();
    studentState.setLanguage("en");
  });

  it("renders bounded search results as routes rather than exposing answers", async () => {
    render(<LanguageProvider><MemoryRouter initialEntries={["/search?q=python"]}><SearchPage /></MemoryRouter></LanguageProvider>);
    expect(await screen.findByRole("link", { name: "Open lesson" })).toHaveAttribute("href", "/courses/first-secondary/lessons/python-basics");
    expect(screen.getByRole("link", { name: "Open course practice" })).toHaveAttribute("href", "/courses/first-secondary#practice");
  });

  it("renders a dedicated 404 view with recovery routes", () => {
    render(<LanguageProvider><MemoryRouter><PageNotFound /></MemoryRouter></LanguageProvider>);
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Search the platform" })).toHaveAttribute("href", "/search");
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex,follow");
  });
});
