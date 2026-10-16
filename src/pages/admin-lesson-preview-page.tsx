import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Eye } from "lucide-react";
import { useLanguage } from "../app/language";
import { AsyncView } from "../components/async-view";
import { api } from "../lib/api";
import type { LessonPageData } from "../lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./admin-shared";
import { LessonView } from "./lesson-page";

/** Renders any lesson exactly as a student would see it, without recording progress. */
export function AdminLessonPreviewPage() {
  const { lessonId = "" } = useParams();
  const { language } = useLanguage();
  const [data, setData] = useState<LessonPageData | null>(null);
  const [error, setError] = useState<unknown | null>(null);
  useEffect(() => {
    let current = true;
    setData(null); setError(null);
    void api.adminLessonPreview(Number(lessonId)).then((loaded) => { if (current) setData(loaded); }).catch((reason: unknown) => { if (current) setError(reason); });
    return () => { current = false; };
  }, [lessonId]);
  const lesson = data?.lesson as (LessonPageData["lesson"] & { status?: "draft" | "published" | "archived" }) | undefined;
  return <AsyncView loading={!error && !data} error={error} language={language}>{data && <div className="space-y-6">
    <Alert className="mx-auto max-w-4xl"><AlertDescription className="flex flex-wrap items-center justify-between gap-3"><span className="flex items-center gap-2"><Eye className="size-4" aria-hidden="true" />{language === "ar" ? "معاينة كما يراها الطالب. لا يُسجَّل أي تقدّم." : "Previewing as a student. No progress is recorded."}{lesson?.status && <StatusBadge status={lesson.status} language={language} />}</span><Button size="sm" variant="outline" asChild><Link to={`/admin/lessons/${lessonId}`}>{language === "ar" ? "العودة إلى المحرر" : "Back to editor"}</Link></Button></AlertDescription></Alert>
    <LessonView data={data} language={language} preview courseHref={`/admin/courses/${data.course.id}`} lessonHref={(item) => `/admin/lessons/${item.id}/preview`} />
  </div>}</AsyncView>;
}
