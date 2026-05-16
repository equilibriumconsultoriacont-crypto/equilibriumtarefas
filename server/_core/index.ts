import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  const app = express();

  // ── Trust Railway's proxy ──────────────────────────────────────────────────
  app.set("trust proxy", 1);

  // ── Security headers ───────────────────────────────────────────────────────
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // ── Body parser ────────────────────────────────────────────────────────────
  app.use(express.json({ limit: "10mb" })); // reduced from 50mb for security
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // ── Health endpoints (no auth needed) ─────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      memory: process.memoryUsage().heapUsed,
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/health/db", async (_req, res) => {
    try {
      const { checkDbHealth } = await import("../db");
      const result = await checkDbHealth();
      res.status(result.ok ? 200 : 503).json(result);
    } catch (err: any) {
      res.status(503).json({ ok: false, error: err?.message });
    }
  });

  // ── Manus integrations (gracefully disabled if not configured) ─────────────
  try { registerStorageProxy(app); } catch {}
  try { registerOAuthRoutes(app); } catch {}

  // ── tRPC ───────────────────────────────────────────────────────────────────
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error, path }) => {
        if (error.code !== "UNAUTHORIZED" && error.code !== "FORBIDDEN") {
          console.error(`[tRPC] Error on ${path}:`, error.message);
        }
      },
    })
  );

  // ── Static / Vite ──────────────────────────────────────────────────────────
  if (process.env.NODE_ENV === "development") {
    const server = createServer(app);
    await setupVite(app, server);
    const port = parseInt(process.env.PORT || "8080");
    server.listen(port, () => console.log(`Server running on http://localhost:${port}/`));
  } else {
    serveStatic(app);
    const port = parseInt(process.env.PORT || "8080");
    app.listen(port, () => console.log(`Server running on http://localhost:${port}/`));
  }
}

startServer().catch((err) => {
  console.error("[Fatal] Server failed to start:", err);
  process.exit(1);
});
