import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";
import { useLanguage } from "../app/language";
import { PageMetadata } from "../app/page-metadata";
import { AsyncView } from "../components/async-view";
import { api } from "../lib/api";
import type { Course } from "../lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function HomePage() {
  const { language } = useLanguage();
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<unknown | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    setCourses([]); setError(null);
    void api.courses().then(setCourses).catch(setError);
  }, [loadAttempt]);
  const title = language === "ar" ? "البرمجة والذكاء الاصطناعي" : "Programming & Artificial Intelligence";
  const description = language === "ar" ? "منصة لتعلّم البرمجة والذكاء الاصطناعي لطلاب المرحلة الثانوية في مصر." : "A programming and artificial intelligence learning platform for Egyptian secondary students.";
  return <><PageMetadata title={title} description={description} language={language} /><AsyncView loading={!error && !courses.length} error={error} language={language} onRetry={() => setLoadAttempt((attempt) => attempt + 1)}><section className="space-y-8"><div className="max-w-3xl space-y-4"><h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">{title}</h1><p className="max-w-2xl text-lg text-muted-foreground">{language === "ar" ? "اختر صفك للبدء." : "Choose your grade to begin."}</p></div><div className="grid gap-5 md:grid-cols-2">{courses.map((course) => <Card key={course.id} className="group flex h-full flex-col transition-all hover:-translate-y-1 hover:shadow-md"><CardHeader><div className="mb-2 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><BookOpen className="size-5" /></div><CardTitle className="text-xl">{course.title[language]}</CardTitle><CardDescription>{course.description[language]}</CardDescription></CardHeader><CardContent className="flex-1" /><CardFooter><Button asChild className="w-full"><Link to={`/courses/${course.slug}`}>{language === "ar" ? "عرض الدروس" : "View lessons"}<ArrowRight className="size-4 rtl:rotate-180" /></Link></Button></CardFooter></Card>)}</div></section></AsyncView></>;
}
