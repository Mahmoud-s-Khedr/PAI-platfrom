import { Hono } from "hono";
import { z } from "zod";
import { findPublishedCourse, findPublishedLesson, findPublishedLessonBySlug, listPublishedCourses, listPublishedLessons, listQuestionsForCourse, listQuestionsForLessons, searchPublishedContent } from "../db/content";
import { errorResponse } from "../lib/http";
import type { LessonPageData, QuestionQueryOptions } from "../../src/lib/types";

type Bindings = Cloudflare.Env;
const content = new Hono<{ Bindings: Bindings }>();
const positiveInteger = z.coerce.number().int().positive();
const questionLimit = z.coerce.number().int().min(1).max(100);
const questionDifficulty = z.enum(["easy", "medium", "hard"]);
const searchQuery = z.string().trim().min(2).max(100);

content.get("/courses", async (c) => c.json(await listPublishedCourses(c.env.DB)));

content.get("/search", async (c) => {
  const parsed = searchQuery.safeParse(c.req.query("q"));
  if (!parsed.success) return errorResponse(c, 400, "INVALID_SEARCH_QUERY", "Search must contain 2 to 100 characters");
  return c.json(await searchPublishedContent(c.env.DB, parsed.data));
});

content.get("/courses/:slug", async (c) => {
  const course = await findPublishedCourse(c.env.DB, c.req.param("slug"));
  return course ? c.json(course) : errorResponse(c, 404, "COURSE_NOT_FOUND", "Course not found");
});

content.get("/courses/:slug/lessons", async (c) => {
  const course = await findPublishedCourse(c.env.DB, c.req.param("slug"));
  if (!course) return errorResponse(c, 404, "COURSE_NOT_FOUND", "Course not found");
  return c.json(await listPublishedLessons(c.env.DB, course.id));
});

// One request for the student lesson screen instead of four sequential round trips.
content.get("/courses/:slug/lessons/:lessonSlug", async (c) => {
  const course = await findPublishedCourse(c.env.DB, c.req.param("slug"));
  if (!course) return errorResponse(c, 404, "COURSE_NOT_FOUND", "Course not found");
  const summary = await findPublishedLessonBySlug(c.env.DB, course.id, c.req.param("lessonSlug"));
  if (!summary) return errorResponse(c, 404, "LESSON_NOT_FOUND", "Lesson not found");
  const [lessons, lesson, questions] = await Promise.all([
    listPublishedLessons(c.env.DB, course.id),
    findPublishedLesson(c.env.DB, summary.id),
    listQuestionsForLessons(c.env.DB, [summary.id]),
  ]);
  if (!lesson) return errorResponse(c, 404, "LESSON_NOT_FOUND", "Lesson not found");
  const data: LessonPageData = { course, lessons, lesson, questions };
  return c.json(data);
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
  const rawDifficulty = c.req.query("difficulty");
  const parsedDifficulty = rawDifficulty === undefined ? undefined : questionDifficulty.safeParse(rawDifficulty);
  if (parsedDifficulty && !parsedDifficulty.success) {
    return errorResponse(c, 400, "INVALID_QUESTION_DIFFICULTY", "Difficulty must be easy, medium, or hard");
  }
  const rawLimit = c.req.query("limit");
  const parsedLimit = rawLimit === undefined ? undefined : questionLimit.safeParse(rawLimit);
  if (parsedLimit && !parsedLimit.success) {
    return errorResponse(c, 400, "INVALID_QUESTION_LIMIT", "Question limit must be an integer from 1 to 100");
  }
  const rawRandom = c.req.query("random");
  if (rawRandom !== undefined && rawRandom !== "true" && rawRandom !== "false") {
    return errorResponse(c, 400, "INVALID_QUESTION_RANDOM", "Random must be true or false");
  }
  const options: QuestionQueryOptions = {
    difficulty: parsedDifficulty?.data,
    limit: parsedLimit?.data,
    random: rawRandom === "true",
  };
  if (options.random && !options.limit) {
    return errorResponse(c, 400, "QUESTION_RANDOM_REQUIRES_LIMIT", "Random question selection requires a limit");
  }
  if (courseSlug) {
    const course = await findPublishedCourse(c.env.DB, courseSlug);
    if (!course) return errorResponse(c, 404, "COURSE_NOT_FOUND", "Course not found");
    return c.json(await listQuestionsForCourse(c.env.DB, course.id, options));
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
  return c.json(await listQuestionsForLessons(c.env.DB, [...new Set(ids)], options));
});

export { content };
