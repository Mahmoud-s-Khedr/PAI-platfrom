import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./layout";
import { LanguageProvider } from "./language";
import { AuthProvider } from "./auth";
import { AdminPage } from "../pages/admin-page";
import { AdminCoursePage } from "../pages/admin-course-page";
import { AdminLessonPage } from "../pages/admin-lesson-page";
import { AdminQuestionsPage } from "../pages/admin-questions-page";
import { AdminAssetsPage } from "../pages/admin-assets-page";
import { CoursePage } from "../pages/course-page";
import { HomePage } from "../pages/home-page";
import { LessonPage } from "../pages/lesson-page";
import { LoginPage } from "../pages/login-page";

export function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route
                path="admin/courses/:courseId"
                element={<AdminCoursePage />}
              />
              <Route
                path="admin/lessons/:lessonId"
                element={<AdminLessonPage />}
              />
              <Route path="admin/questions" element={<AdminQuestionsPage />} />
              <Route path="admin/assets" element={<AdminAssetsPage />} />
              <Route path="courses/:courseSlug" element={<CoursePage />} />
              <Route
                path="courses/:courseSlug/lessons/:lessonSlug"
                element={<LessonPage />}
              />
              <Route path="*" element={<HomePage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
