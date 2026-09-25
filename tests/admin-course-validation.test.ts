import { describe, expect, it } from "vitest";
import { validateAdminCourse } from "../src/lib/admin-course-validation";
import type { AdminCourseInput } from "../src/lib/types";

const validCourse: AdminCourseInput = {
  slug: "intro-to-programming",
  title: { ar: "مقدمة في البرمجة", en: "Introduction to programming" },
  description: { ar: "", en: "" },
  status: "draft",
  sortOrder: 1,
};

describe("validateAdminCourse", () => {
  it("identifies each invalid create-course field before submission", () => {
    expect(validateAdminCourse({
      ...validCourse,
      slug: "Invalid Slug",
      sortOrder: Number.NaN,
      title: { ar: " ", en: "" },
      description: { ar: "a".repeat(20_001), en: "" },
    }, "en")).toEqual({
      slug: "Use lowercase letters, numbers, and hyphens only, with no spaces.",
      sortOrder: "Enter a whole number from 0 to 1,000,000.",
      "title.ar": "Enter the Arabic course title.",
      "title.en": "Enter the English course title.",
      "description.ar": "This field must be 20,000 characters or fewer.",
    });
  });

  it("accepts valid optional descriptions", () => {
    expect(validateAdminCourse(validCourse, "en")).toEqual({});
  });
});
