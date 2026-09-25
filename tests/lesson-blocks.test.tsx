// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "../src/app/language";
import { CalloutBlock } from "../src/lesson-blocks/lesson-block";
import { studentState } from "../src/storage/student-state";

function renderCallout(language: "ar" | "en", tone: string) {
  studentState.setLanguage(language);
  return render(
    <LanguageProvider>
      <CalloutBlock data={{ tone, ar: "محتوى عربي", en: "English content" }} />
    </LanguageProvider>,
  );
}

afterEach(() => {
  localStorage.clear();
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

describe("lesson callouts", () => {
  it.each([
    ["key-concept", "Key concept"],
    ["note", "Note"],
    ["tip", "Tip"],
    ["warning", "Warning"],
    ["example", "Example"],
  ])("renders the %s variant with an English label", (tone, label) => {
    renderCallout("en", tone);
    const callout = screen.getByRole("note");
    expect(callout).toHaveAttribute("data-callout-tone", tone);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(callout).toHaveTextContent("English content");
  });

  it("uses Arabic labels and retains RTL document direction", () => {
    renderCallout("ar", "tip");
    expect(document.documentElement).toHaveAttribute("lang", "ar");
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    expect(screen.getByText("نصيحة")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("محتوى عربي");
  });

  it("falls back safely to a note for an unrecognized stored tone", () => {
    renderCallout("en", "legacy-tone");
    expect(screen.getByRole("note")).toHaveAttribute("data-callout-tone", "note");
    expect(screen.getByText("Note")).toBeInTheDocument();
  });
});
