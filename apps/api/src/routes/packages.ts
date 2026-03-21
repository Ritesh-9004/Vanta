import { Hono } from "hono";
import { db, schema } from "../db";
import { eq, desc, asc, sql, ilike, or, and, inArray } from "drizzle-orm";
import { z } from "zod";
import type { PackageSummary, Package as PackageType } from "@vanta/types";

const packages = new Hono();

// ─── GET /packages — paginated list ─────────────────────────

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  per_page: z.coerce.number().min(1).max(100).default(20),
  sort: z
    .enum(["quality", "downloads", "updated", "name"])
    .default("quality"),
  order: z.enum(["asc", "desc"]).default("desc"),
  framework: z.string().optional(),
  platform: z.string().optional(),
  category: z.string().optional(),
  min_quality: z.coerce.number().min(0).max(100).optional(),
});

packages.get("/", async (c) => {
  const query = listQuerySchema.parse(c.req.query());
  const { page, per_page, sort, order, framework, platform, category, min_quality } = query;
  const offset = (page - 1) * per_page;

  // Build WHERE conditions
  const conditions = [];
  if (category) {
    conditions.push(eq(schema.packages.category, category));
  }
  if (min_quality !== undefined) {
    conditions.push(sql`${schema.packages.quality_score} >= ${min_quality}`);
  }
  if (framework) {
    conditions.push(sql`${schema.packages.frameworks} @> ${JSON.stringify([framework])}::jsonb`);
  }
  if (platform) {
    conditions.push(sql`${schema.packages.platforms} @> ${JSON.stringify([platform])}::jsonb`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Sort mapping
  const sortColumn = {
    quality: schema.packages.quality_score,
    downloads: schema.packages.downloads_monthly,
    updated: schema.packages.updated_at,
    name: schema.packages.name,
  }[sort];

  const orderFn = order === "asc" ? asc : desc;

  // Query
  const [results, countResult] = await Promise.all([
    db
      .select()
      .from(schema.packages)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(per_page)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.packages)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;

  // Fetch publishers for the batch
  const publisherIds = results
    .map((pkg) => pkg.publisher_id)
    .filter((id) => id != null) as number[];
  const publishers =
    publisherIds.length > 0
      ? await db
          .select()
          .from(schema.publishers)
          .where(inArray(schema.publishers.id, publisherIds))
      : [];
  const publisherMap = new Map(publishers.map((p) => [p.id, p.display_name]));

  // Map to summary type
  const data: PackageSummary[] = results.map((pkg) => ({
    name: pkg.name,
    display_name: pkg.display_name,
    description: pkg.description,
    category: pkg.category as PackageSummary["category"],
    frameworks: (pkg.frameworks ?? []) as PackageSummary["frameworks"],
    platforms: (pkg.platforms ?? []) as PackageSummary["platforms"],
    latest_version: pkg.latest_version ?? "0.0.0",
    quality_score: pkg.quality_score,
    memory: pkg.memory_flash_kb != null && pkg.memory_ram_kb != null
      ? { flash_kb: pkg.memory_flash_kb, ram_kb: pkg.memory_ram_kb }
      : undefined,
    downloads_monthly: pkg.downloads_monthly,
    stars: pkg.stars,
    updated_at: pkg.updated_at.toISOString(),
    publisher_name: pkg.publisher_id ? (publisherMap.get(pkg.publisher_id) || "unknown") : "unknown",
    is_verified: false,
  }));

  return c.json({
    data,
    total,
    page,
    per_page,
    total_pages: Math.ceil(total / per_page),
  });
});

// ─── GET /packages/stats — aggregate stats ─────────────────

packages.get("/stats", async (c) => {
  const [pkgCountResult, packageMetaRows] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.packages),
      db
        .select({
          platforms: schema.packages.platforms,
          frameworks: schema.packages.frameworks,
        })
        .from(schema.packages),
    ]);

  const packagesCount = pkgCountResult[0]?.count ?? 0;

  const platformSet = new Set<string>();
  const frameworkSet = new Set<string>();

  for (const row of packageMetaRows) {
    for (const platform of (row.platforms ?? []) as string[]) {
      platformSet.add(platform);
    }
    for (const framework of (row.frameworks ?? []) as string[]) {
      frameworkSet.add(framework);
    }
  }

  const platformsCount = platformSet.size;
  const frameworksCount = frameworkSet.size;

  return c.json({
    packages: packagesCount,
    platforms: platformsCount,
    frameworks: frameworksCount,
  });
});

// ─── GET /packages/:name — full package detail ──────────────

packages.get("/:name", async (c) => {
  const name = c.req.param("name");

  const pkg = await db.query.packages.findFirst({
    where: eq(schema.packages.name, name),
  });

  if (!pkg) {
    return c.json(
      {
        error: "not_found",
        message: `Package "${name}" not found`,
        status: 404,
        suggestion: `Try searching: GET /search?q=${name}`,
      },
      404
    );
  }

  // Fetch versions
  const pkgVersions = await db
    .select()
    .from(schema.versions)
    .where(eq(schema.versions.package_id, pkg.id))
    .orderBy(desc(schema.versions.published_at));

  // Fetch compatibility
  const compat = await db
    .select()
    .from(schema.compatibility)
    .where(eq(schema.compatibility.package_id, pkg.id));

  // Fetch publisher
  let publisher = null;
  if (pkg.publisher_id) {
    publisher = await db.query.publishers.findFirst({
      where: eq(schema.publishers.id, pkg.publisher_id),
    });
  }

  return c.json({
    name: pkg.name,
    display_name: pkg.display_name,
    description: pkg.description,
    repository: pkg.repository,
    homepage: pkg.homepage,
    license: pkg.license,
    category: pkg.category,
    frameworks: pkg.frameworks,
    platforms: pkg.platforms,
    peripherals: pkg.peripherals,
    sensors: pkg.sensors,
    components: pkg.components,
    latest_version: pkg.latest_version,
    versions: pkgVersions.map((v) => ({
      version: v.version,
      published_at: v.published_at.toISOString(),
      checksum_sha256: v.checksum_sha256,
      tarball_url: v.tarball_url,
      memory: v.memory,
      dependencies: v.dependencies,
      idf_version: v.idf_version,
    })),
    quality_score: pkg.quality_score,
    quality_breakdown: pkg.quality_breakdown,
    compatibility: compat.map((comp) => ({
      platform: comp.platform,
      status: comp.status,
      tested_version: comp.tested_version,
      notes: comp.notes,
    })),
    memory:
      pkg.memory_flash_kb != null && pkg.memory_ram_kb != null
        ? { flash_kb: pkg.memory_flash_kb, ram_kb: pkg.memory_ram_kb }
        : undefined,
    downloads_total: pkg.downloads_total,
    downloads_monthly: pkg.downloads_monthly,
    stars: pkg.stars,
    publisher: publisher
      ? {
          name: publisher.name,
          display_name: publisher.display_name,
          domain: publisher.domain,
          is_verified: publisher.is_verified,
          avatar_url: publisher.avatar_url,
        }
      : { name: "unknown", display_name: "Unknown", is_verified: false },
    created_at: pkg.created_at.toISOString(),
    updated_at: pkg.updated_at.toISOString(),
  });
});

export default packages;
