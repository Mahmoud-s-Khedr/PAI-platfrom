// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/app/language";
import { PracticeSetup } from "../src/question-engine/practice-setup";
import { studentState } from "../src/storage/student-state";

it("builds a filtered all-matching multi-lesson practice selection", async () => {
  studentState.setLanguage("en");
  const start = vi.fn();
  const user = userEvent.setup();
  render(<LanguageProvider><PracticeSetup loading={false} onStart={start} lessons={[
    { id: 1, courseId: 1, slug: "one", title: { ar: "الأول", en: "One" }, youtubeVideoId: null, sortOrder: 1 },
    { id: 2, courseId: 1, slug: "two", title: { ar: "الثاني", en: "Two" }, youtubeVideoId: null, sortOrder: 2 },
  ]} /></LanguageProvider>);
  await user.click(screen.getByText("Selected lessons"));
  await user.click(screen.getByLabelText("Two"));
  await user.selectOptions(screen.getByLabelText("Difficulty"), "medium");
  await user.selectOptions(screen.getByLabelText("Questions"), "all");
  await user.click(screen.getByRole("button", { name: "Start practice" }));
  expect(start).toHaveBeenCalledWith({ scope: "lessons", lessonIds: [1], options: { difficulty: "medium", limit: undefined, random: false } });
});
