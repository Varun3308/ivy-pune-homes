import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  upstream,
  authenticated,
  refreshSession,
  setSession,
  clearSession,
  ApiError,
} from "./upstream.js";
import { catalog } from "./catalog.js";
const app = express();
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "img-src": ["'self'", "data:"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "script-src": ["'self'"],
      },
    },
  }),
);
app.use(express.json({ limit: "8kb" }));
app.use(cookieParser());
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  // Same-origin browser requests only for state changes; no permissive CORS proxy.
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.get("origin") &&
    new URL(req.get("origin")).host !== req.get("host")
  )
    return res.status(403).json({ error: "Cross-origin request rejected." });
  next();
});
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, configured: Boolean(process.env.IVY_API_KEY) }),
);
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  )
    throw new ApiError(400, "Enter your email and password.");
  const data = await upstream("/auth/login", {
    method: "POST",
    body: { email: email.trim().toLowerCase(), password },
  });
  setSession(res, data);
  res.json({ user: data.user });
});
app.post("/api/refresh", async (req, res) => {
  const data = await refreshSession(req.cookies.ivy_refresh);
  setSession(res, data);
  res.json({ user: data.user });
});
app.post("/api/logout", authenticated, async (req, res) => {
  try {
    await req.ivy("/auth/logout", { method: "POST" });
  } finally {
    clearSession(res);
  }
  res.json({ ok: true });
});
app.get("/api/session", authenticated, (req, res) =>
  res.json({ user: req.user }),
);
app.get("/api/catalog", authenticated, async (req, res) =>
  res.json(await catalog(req.ivy)),
);
app.get("/api/saved", authenticated, (req, res) => res.json(req.saved));
app.post("/api/saved", authenticated, async (req, res) => {
  if (
    typeof req.body?.listing_id !== "string" ||
    !/^[A-Z0-9-]+$/.test(req.body.listing_id)
  )
    throw new ApiError(400, "Choose a valid listing.");
  res
    .status(201)
    .json(
      await req.ivy("/v1/saved", {
        method: "POST",
        body: { listing_id: req.body.listing_id },
      }),
    );
});
app.delete("/api/saved/:id", authenticated, async (req, res) =>
  res.json(
    await req.ivy(`/v1/saved/${encodeURIComponent(req.params.id)}`, {
      method: "DELETE",
    }),
  ),
);
app.get("/api/:collection/:id", authenticated, async (req, res) => {
  if (!["listings", "rentals", "projects"].includes(req.params.collection))
    throw new ApiError(404, "Page not found.");
  res.json(
    await req.ivy(
      `/v1/${req.params.collection}/${encodeURIComponent(req.params.id)}`,
    ),
  );
});
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "API route not found." }),
);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
app.use(express.static(path.join(root, "dist")));
app.get("/{*splat}", (_req, res) =>
  res.sendFile(path.join(root, "dist/index.html")),
);
app.use((error, _req, res, _next) => {
  const status = error.status || 502;
  if (status >= 500) console.error("Request failed:", error.message);
  res
    .status(status)
    .json({
      error:
        status >= 500
          ? "The property service is temporarily unavailable. Please try again."
          : error.message,
    });
});
const port = process.env.PORT || 3000;
if (!process.env.IVY_API_KEY)
  console.warn("Set IVY_API_KEY in .env or your deployment environment.");
app.listen(port, () =>
  console.log(`Ivy Homes running at http://localhost:${port}`),
);
export default app;
