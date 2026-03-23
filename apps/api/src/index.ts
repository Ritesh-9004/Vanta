import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import packagesRouter from "./routes/packages";
import searchRouter from "./routes/search";

const app = new Hono();
const corsOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  "http://localhost:3000",
  "https://vantapm.vercel.app",
  ...corsOrigins,
]);

// ─── Middleware ───────────────────────────────────────────────

app.use("*", logger());
app.use("*", prettyJSON());
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) {
        return "";
      }

      return allowedOrigins.has(origin) ? origin : "";
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Health check ────────────────────────────────────────────

app.get("/", (c) =>
  c.json({
    name: "vanta-registry-api",
    version: "0.1.0",
    status: "ok",
    docs: "/health",
    endpoints: {
      packages: "/packages",
      search: "/search",
    },
  })
);

app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);

// ─── Routes ──────────────────────────────────────────────────

app.route("/packages", packagesRouter);
app.route("/search", searchRouter);

// ─── 404 fallback ────────────────────────────────────────────

app.notFound((c) =>
  c.json(
    {
      error: "not_found",
      message: `Route ${c.req.method} ${c.req.url} not found`,
      status: 404,
    },
    404
  )
);

// ─── Error handler ───────────────────────────────────────────

app.onError((err, c) => {
  console.error("API Error:", err);
  return c.json(
    {
      error: "internal_error",
      message: err.message ?? "An unexpected error occurred",
      status: 500,
    },
    500
  );
});

// ─── Start server ────────────────────────────────────────────

const port = parseInt(process.env.PORT ?? "4000", 10);

console.log(`🚀 Vanta API running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
