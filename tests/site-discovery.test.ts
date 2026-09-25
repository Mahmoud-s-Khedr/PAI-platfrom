import { describe, expect, it } from "vitest";
import { app } from "../worker";

const env = {
  DB: {
    prepare: () => ({
      all: async () => ({ results: [
        { course_slug: "first-secondary", lesson_slug: "python-basics" },
        { course_slug: "second-secondary", lesson_slug: null },
      ] }),
    }),
  },
} as unknown as Cloudflare.Env;

describe("public site discovery", () => {
  it("serves a restrictive robots file with an absolute sitemap location", async () => {
    const response = await app.request("https://learn.example/robots.txt", undefined, env);
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    await expect(response.text()).resolves.toContain("Sitemap: https://learn.example/sitemap.xml");
    await expect((await app.request("https://learn.example/robots.txt", undefined, env)).text()).resolves.toContain("Disallow: /admin");
    await expect((await app.request("https://learn.example/robots.txt", undefined, env)).text()).resolves.toContain("Disallow: /search");
  });

  it("builds a sitemap from published course and lesson routes", async () => {
    const response = await app.request("https://learn.example/sitemap.xml", undefined, env);
    expect(response.headers.get("Content-Type")).toContain("application/xml");
    const body = await response.text();
    expect(body).toContain("https://learn.example/courses/first-secondary");
    expect(body).toContain("https://learn.example/courses/first-secondary/lessons/python-basics");
    expect(body).toContain("https://learn.example/courses/second-secondary");
  });
});
