import type { AdminCourseInput } from "./types";
import { validateAdminCourse as validate } from "./admin-validation";

export type AdminCourseField =
  | "slug"
  | "sortOrder"
  | "title.ar"
  | "title.en"
  | "description.ar"
  | "description.en";

export type AdminCourseFormErrors = Partial<Record<AdminCourseField, string>>;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateAdminCourse(input: AdminCourseInput, language: "ar" | "en"): AdminCourseFormErrors {
  const errors = validate(input, language);
  if (language === "en") {
    if (errors.slug === "Enter a slug.") errors.slug = "Enter a course slug.";
    if (errors["title.ar"] === "Enter the Arabic title.") errors["title.ar"] = "Enter the Arabic course title.";
    if (errors["title.en"] === "Enter the English title.") errors["title.en"] = "Enter the English course title.";
  }
  return errors as AdminCourseFormErrors;
}
