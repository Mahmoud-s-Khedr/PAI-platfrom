import { Hono } from "hono";
import { z } from "zod";
import { findPublishedCourse, findPublishedLesson, listPublishedCourses, listPublishedLessons, listQuestionsForCourse, listQuestionsForLessons } from "../db/content";
import { errorResponse } from "../lib/http";

type Bindings = Cloudflare.Env;
const content = new Hono<{ Bindings: Bindings }>();
const positiveInteger = z.coerce.number().int().positive();

content.get("/courses", async (c) => c.json(await listPublishedCourses(c.env.DB)));

content.get("/courses/:slug", async (c) => {
  const course = await findPublishedCourse(c.env.DB, c.req.param("slug"));
  return course ? c.json(course) : errorResponse(c, 404, "COURSE_NOT_FOUND", "Course not found");
});

content.get("/courses/:slug/lessons", async (c) => {
  const course = await findPublishedCourse(c.env.DB, c.req.param("slug"));
  if (!course) return errorResponse(c, 404, "COURSE_NOT_FOUND", "Course not found");
  return c.json(await listPublishedLessons(c.env.DB, course.id));
});

content.get("/lessons/:id", async (c) => {
  const parsed = positiveInteger.safeParse(c.req.param("id"));
  if (!parsed.success) return errorResponse(c, 400, "INVALID_LESSON_ID", "Lesson id must be a positive integer");
  const lesson = await findPublishedLesson(c.env.DB, parsed.data);
  return lesson ? c.json(lesson) : errorResponse(c, 404, "LESSON_NOT_FOUND", "Lesson not found");
});

content.get("/questions", async (c) => {
  const lesson = c.req.query("lesson");
  const lessons = c.req.query("lessons");
  const courseSlug = c.req.query("course");
  const scopeCount = [lesson, lessons, courseSlug].filter(Boolean).length;
  if (scopeCount !== 1) {
    return errorResponse(c, 400, "INVALID_QUESTION_SCOPE", "Provide exactly one of lesson, lessons, or course");
  }
  if (courseSlug) {
    const course = await findPublishedCourse(c.env.DB, courseSlug);
    if (!course) return errorResponse(c, 404, "COURSE_NOT_FOUND", "Course not found");
    return c.json(await listQuestionsForCourse(c.env.DB, course.id));
  }
  const rawIds = lesson ? [lesson] : lessons!.split(",");
  const ids: number[] = [];
  for (const value of rawIds) {
    const parsed = positiveInteger.safeParse(value);
    if (!parsed.success) {
      return errorResponse(c, 400, "INVALID_LESSON_ID", "Lesson ids must be comma-separated positive integers");
    }
    ids.push(parsed.data);
  }
  return c.json(await listQuestionsForLessons(c.env.DB, [...new Set(ids)]));
});

export { content };
