import { Hono } from "hono";
import { db, schema } from "../db";
import { sql, or, ilike, desc, asc, and } from "drizzle-orm";
import { z } from "zod";
import type { PackageSummary } from "@vanta/types";

const search = new Hono();

const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  framework: z.string().optional(),
  platform: z.string().optional(),
  category: z.string().optional(),
  min_quality: z.coerce.number().min(0).max(100).optional(),
  sort: z
    .enum(["quality", "downloads", "updated", "relevance"])
    .default("relevance"),
  page: z.coerce.number().min(1).default(1),
  per_page: z.coerce.number().min(1).max(100).default(20),
});

search.get("/", async (c) => {
  const rawQuery = c.req.query();

  if (!rawQuery.q) {
    return c.json(
      {
        error: "missing_query",
        message: "Search query is required: ?q=your+search+term",
        status: 400,
      },
      400
    );
  }

  const query = searchQuerySchema.parse(rawQuery);
  const { q, framework, platform, category, min_quality, sort, page, per_page } = query;
  const offset = (page - 1) * per_page;

  // Build conditions
  const searchCondition = or(
    ilike(schema.packages.name, `%${q}%`),
    ilike(schema.packages.display_name, `%${q}%`),
    ilike(schema.packages.description, `%${q}%`),
    ilike(schema.packages.search_text, `%${q}%`)
  );

  const conditions = [searchCondition];

  if (category) {
    conditions.push(sql`${schema.packages.category} = ${category}`);
  }
  if (min_quality !== undefined) {
    conditions.push(sql`${schema.packages.quality_score} >= ${min_quality}`);
  }
  if (framework) {
    conditions.push(
      sql`${schema.packages.frameworks} @> ${JSON.stringify([framework])}::jsonb`
    );
  }
  if (platform) {
    conditions.push(
      sql`${schema.packages.platforms} @> ${JSON.stringify([platform])}::jsonb`
    );
  }

  const whereClause = and(...conditions);

  // Sort: relevance uses quality score as a proxy
  const orderBy =
    sort === "relevance" || sort === "quality"
      ? desc(schema.packages.quality_score)
      : sort === "downloads"
        ? desc(schema.packages.downloads_monthly)
        : desc(schema.packages.updated_at);

  const [results, countResult] = await Promise.all([
    db
      .select()
      .from(schema.packages)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(per_page)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.packages)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;

  const data: PackageSummary[] = results.map((pkg) => ({
    name: pkg.name,
    display_name: pkg.display_name,
    description: pkg.description,
    category: pkg.category as PackageSummary["category"],
    frameworks: (pkg.frameworks ?? []) as PackageSummary["frameworks"],
    platforms: (pkg.platforms ?? []) as PackageSummary["platforms"],
    latest_version: pkg.latest_version ?? "0.0.0",
    quality_score: pkg.quality_score,
    memory:
      pkg.memory_flash_kb != null && pkg.memory_ram_kb != null
        ? { flash_kb: pkg.memory_flash_kb, ram_kb: pkg.memory_ram_kb }
        : undefined,
    downloads_monthly: pkg.downloads_monthly,
    stars: pkg.stars,
    updated_at: pkg.updated_at.toISOString(),
    publisher_name: "",
    is_verified: false,
  }));

  return c.json({
    data,
    total,
    page,
    per_page,
    total_pages: Math.ceil(total / per_page),
    query: q,
  });
});

export default search;
