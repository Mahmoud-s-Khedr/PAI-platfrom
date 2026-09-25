import type { Language } from "./types";

export class ApiRequestError extends Error {
  constructor(
    public readonly code: string,
    public readonly status?: number,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "ApiRequestError";
  }
}

export function errorCode(error: unknown): string | null {
  return error instanceof ApiRequestError ? error.code : null;
}

export function isErrorCode(error: unknown, code: string): boolean {
  return errorCode(error) === code;
}

export function localizedErrorMessage(error: unknown, language: Language): string {
  switch (errorCode(error)) {
    case "OFFLINE":
      return language === "ar" ? "لا يوجد اتصال بالإنترنت. تحقّق من اتصالك ثم حاول مرة أخرى." : "You appear to be offline. Check your connection and try again.";
    case "NETWORK_ERROR":
      return language === "ar" ? "تعذّر الاتصال بالمنصة. تحقّق من اتصالك ثم حاول مرة أخرى." : "We could not connect to the platform. Check your connection and try again.";
    case "COURSE_NOT_FOUND":
      return language === "ar" ? "لم نتمكن من العثور على هذا المقرر." : "We could not find this course.";
    case "LESSON_NOT_FOUND":
      return language === "ar" ? "لم نتمكن من العثور على هذا الدرس." : "We could not find this lesson.";
    default:
      return language === "ar" ? "تعذّر تحميل هذه الصفحة الآن. حاول مرة أخرى." : "We could not load this page right now. Please try again.";
  }
}
