import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./layout";
import { LanguageProvider } from "./language";
import { AuthProvider } from "./auth";
import { AdminPage } from "../pages/admin-page";
import { AdminCoursePage } from "../pages/admin-course-page";
import { AdminLessonPage } from "../pages/admin-lesson-page";
import { AdminQuestionsPage } from "../pages/admin-questions-page";
import { AdminQuestionEditorPage } from "../pages/admin-question-editor-page";
import { AdminQuestionPreviewPage } from "../pages/admin-question-preview-page";
import { AdminAssetsPage } from "../pages/admin-assets-page";
import { CoursePage } from "../pages/course-page";
import { HomePage } from "../pages/home-page";
import { LessonPage } from "../pages/lesson-page";
import { LoginPage } from "../pages/login-page";
import { SearchPage } from "../pages/search-page";
import { PageNotFound } from "../pages/page-not-found";

export function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="search" element={<SearchPage />} />
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
              <Route path="admin/questions/new" element={<AdminQuestionEditorPage />} />
              <Route path="admin/questions/:questionId/edit" element={<AdminQuestionEditorPage />} />
              <Route path="admin/questions/:questionId/preview" element={<AdminQuestionPreviewPage />} />
              <Route path="admin/assets" element={<AdminAssetsPage />} />
              <Route path="courses/:courseSlug" element={<CoursePage />} />
              <Route
                path="courses/:courseSlug/lessons/:lessonSlug"
                element={<LessonPage />}
              />
              <Route path="*" element={<PageNotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
