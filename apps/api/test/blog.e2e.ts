import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { STARTER_POSTS, type BlogArticle, type BlogPostRecord, type BlogSummary } from "@myvisa/shared";
import { type Harness, type Session, as, signIn, startHarness } from "./harness";

describe("blog", () => {
  let h: Harness;
  let manager: Session;
  let agent: Session;
  const post = { slug: "georgia-in-winter", titleAr: "جورجيا في الشتاء", bodyAr: "## لماذا الشتاء؟\nثلوج غوداوري وأسعار أهدأ من الصيف بكثير.", tags: ["georgia"], status: "DRAFT" };

  beforeAll(async () => {
    h = await startHarness();
    manager = await signIn(h, "MANAGER");
    agent = await signIn(h, "AGENT");
  }, 60_000);
  afterAll(() => h.close());

  it("the seed publishes the starter guides; articles carry both languages", async () => {
    const list = (await h.http.get("/api/v1/blog").expect(200)).body as BlogSummary[];
    expect(list.map((p) => p.slug).sort()).toEqual(STARTER_POSTS.map((p) => p.slug).sort());
    expect(list[0]!.publishedAt >= list[1]!.publishedAt).toBe(true);
    const article = (await h.http.get("/api/v1/blog/visa-photo-guide").expect(200)).body as BlogArticle;
    expect(article.body.ar).toContain("خلفية بيضاء");
    expect(article.body.en).toContain("background");
    expect(article.readingMinutes.ar).toBeGreaterThan(0);
    await h.http.get("/api/v1/blog/nope").expect(404);
  });

  it("managers write; drafts stay private until published; the publish date sticks", async () => {
    await h.http.post("/api/v1/admin/blog").set(as(agent)).send(post).expect(403);
    await h.http.get("/api/v1/admin/blog").set(as(agent)).expect(200);
    const draft = (await h.http.post("/api/v1/admin/blog").set(as(manager)).send(post).expect(201)).body as BlogPostRecord;
    expect(draft.publishedAt).toBeNull();
    await h.http.get(`/api/v1/blog/${post.slug}`).expect(404);
    expect((await h.http.post("/api/v1/admin/blog").set(as(manager)).send(post).expect(409)).body.code).toBe("slug_taken");
    // English needs both a title and a body.
    await h.http.put(`/api/v1/admin/blog/${draft.id}`).set(as(manager)).send({ ...post, titleEn: "Georgia in winter" }).expect(422);

    const live = (await h.http.put(`/api/v1/admin/blog/${draft.id}`).set(as(manager)).send({ ...post, status: "PUBLISHED" }).expect(200)).body as BlogPostRecord;
    expect(live.publishedAt).not.toBeNull();
    await h.http.get(`/api/v1/blog/${post.slug}`).expect(200);
    const edited = (await h.http.put(`/api/v1/admin/blog/${draft.id}`).set(as(manager)).send({ ...post, status: "PUBLISHED", titleAr: "جورجيا شتاءً" }).expect(200)).body as BlogPostRecord;
    expect(edited.publishedAt).toBe(live.publishedAt);
    expect(((await h.http.get("/api/v1/blog")).body as BlogSummary[]).some((p) => p.title.ar === "جورجيا شتاءً")).toBe(true);

    await h.http.delete(`/api/v1/admin/blog/${draft.id}`).set(as(manager)).expect(204);
    await h.http.get(`/api/v1/blog/${post.slug}`).expect(404);
    expect(await h.prisma.auditLog.count({ where: { action: { startsWith: "blog." } } })).toBe(4);
  });
});
