import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./layout";
import { LanguageProvider } from "./language";
import { AuthProvider } from "./auth";
import { AdminPage } from "../pages/admin-page";
import { CoursePage } from "../pages/course-page";
import { HomePage } from "../pages/home-page";
import { LessonPage } from "../pages/lesson-page";
import { LoginPage } from "../pages/login-page";

export function App() {
  return <LanguageProvider><AuthProvider><BrowserRouter><Routes><Route element={<Layout />}><Route index element={<HomePage />} /><Route path="login" element={<LoginPage />} /><Route path="admin" element={<AdminPage />} /><Route path="courses/:courseSlug" element={<CoursePage />} /><Route path="courses/:courseSlug/lessons/:lessonSlug" element={<LessonPage />} /><Route path="*" element={<HomePage />} /></Route></Routes></BrowserRouter></AuthProvider></LanguageProvider>;
}
