import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { runMagnificGeneration } from "./services/magnificEngine";

// Nothing else in this file ever loaded .env into process.env — every
// server-side secret (MAGNIFIC_API_KEY, GEMINI_API_KEY,
// SUPABASE_SERVICE_ROLE_KEY) was silently undefined regardless of what was in
// the file. Node's native loader (20.6+) handles this without adding a
// dotenv dependency. Wrapped in try/catch since production (Vercel) injects
// env vars directly and has no .env file on disk — that's expected there.
try {
  process.loadEnvFile();
} catch {
  // No .env file found — fine in production, where the platform injects env vars directly.
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Proxy route for Magnific AI Image Generation. The actual prompt-building
// and Freepik Magnific generate+poll logic lives in services/magnificEngine.ts
// so it's shared verbatim with the Vercel serverless function at
// api/magnific/generate.ts (Vercel doesn't run this Express app in production —
// only the static build — so that route needs its own entry point importing
// the same engine, otherwise the two would silently drift apart).
app.post("/api/magnific/generate", async (req, res) => {
  try {
    const { theme, brand } = req.body;
    const imageUrl = await runMagnificGeneration(theme, brand);
    return res.json({ imageUrl });
  } catch (err: any) {
    console.error("[Magnific Server] Server-side generation error:", err);
    const status = typeof err?.status === "number" ? err.status : 500;
    return res.status(status).json({ error: err?.message || "Erro interno no servidor." });
  }
});

// Setup Vite development server or serve built bundle
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("[Server] Running in Development Mode. Initializing Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Server] Running in Production Mode. Serving Static Files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback. Express 5 (path-to-regexp v8) rejects the bare "*" route
    // string, so use a middleware catch-all instead to avoid a startup crash.
    app.use((req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] running on http://localhost:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error("[Server] Startup failed:", err);
  process.exit(1);
});
