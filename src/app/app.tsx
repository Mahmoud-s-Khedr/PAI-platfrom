import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./layout";
import { LanguageProvider } from "./language";
import { CoursePage } from "../pages/course-page";
import { HomePage } from "../pages/home-page";
import { LessonPage } from "../pages/lesson-page";

export function App() {
  return <LanguageProvider><BrowserRouter><Routes><Route element={<Layout />}><Route index element={<HomePage />} /><Route path="courses/:courseSlug" element={<CoursePage />} /><Route path="courses/:courseSlug/lessons/:lessonSlug" element={<LessonPage />} /><Route path="*" element={<HomePage />} /></Route></Routes></BrowserRouter></LanguageProvider>;
}
