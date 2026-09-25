import { Link } from "react-router-dom";
import type { Language } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function NotFoundView({ kind, language, courseSlug }: { kind: "course" | "lesson"; language: Language; courseSlug?: string }) {
  const isCourse = kind === "course";
  const title = language === "ar" ? (isCourse ? "المقرر غير موجود" : "الدرس غير موجود") : (isCourse ? "Course not found" : "Lesson not found");
  const message = language === "ar"
    ? (isCourse ? "قد يكون الرابط غير صحيح أو أن هذا المقرر لم يعد منشورًا." : "قد يكون الرابط غير صحيح أو أن هذا الدرس لم يعد منشورًا.")
    : (isCourse ? "The link may be incorrect, or this course is no longer published." : "The link may be incorrect, or this lesson is no longer published.");
  return <Card className="mx-auto max-w-2xl"><CardContent className="space-y-4 py-10 text-center"><h1 className="text-2xl font-semibold">{title}</h1><p className="text-muted-foreground">{message}</p><Button asChild><Link to={courseSlug ? `/courses/${courseSlug}` : "/"}>{language === "ar" ? (courseSlug ? "العودة إلى المقرر" : "العودة إلى الصفحة الرئيسية") : (courseSlug ? "Back to course" : "Back to home")}</Link></Button></CardContent></Card>;
}
