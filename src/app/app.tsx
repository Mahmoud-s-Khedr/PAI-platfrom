import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./layout";
import { LanguageProvider } from "./language";
import { AuthProvider } from "./auth";
import { HomePage } from "../pages/home-page";

// Student pages beyond home and every admin page load on demand to keep the first download small.
const AdminPage = lazy(() => import("../pages/admin-page").then((module) => ({ default: module.AdminPage })));
const AdminCoursePage = lazy(() => import("../pages/admin-course-page").then((module) => ({ default: module.AdminCoursePage })));
const AdminLessonPage = lazy(() => import("../pages/admin-lesson-page").then((module) => ({ default: module.AdminLessonPage })));
const AdminQuestionsPage = lazy(() => import("../pages/admin-questions-page").then((module) => ({ default: module.AdminQuestionsPage })));
const AdminQuestionEditorPage = lazy(() => import("../pages/admin-question-editor-page").then((module) => ({ default: module.AdminQuestionEditorPage })));
const AdminQuestionPreviewPage = lazy(() => import("../pages/admin-question-preview-page").then((module) => ({ default: module.AdminQuestionPreviewPage })));
const AdminAssetsPage = lazy(() => import("../pages/admin-assets-page").then((module) => ({ default: module.AdminAssetsPage })));
const CoursePage = lazy(() => import("../pages/course-page").then((module) => ({ default: module.CoursePage })));
const LessonPage = lazy(() => import("../pages/lesson-page").then((module) => ({ default: module.LessonPage })));
const LoginPage = lazy(() => import("../pages/login-page").then((module) => ({ default: module.LoginPage })));
const SearchPage = lazy(() => import("../pages/search-page").then((module) => ({ default: module.SearchPage })));
const PageNotFound = lazy(() => import("../pages/page-not-found").then((module) => ({ default: module.PageNotFound })));

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
