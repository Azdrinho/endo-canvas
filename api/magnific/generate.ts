import { runMagnificGeneration } from "../../services/magnificEngine";

// Vercel serverless function for /api/magnific/generate.
//
// The project deploys to Vercel as a static Vite build — server.ts (the
// Express app used for local dev) never runs in production, so without this
// file the endpoint simply didn't exist there and every request 404'd, no
// matter how correct the Magnific API key or model slug were. Vercel
// auto-detects any file under /api as its own serverless function
// regardless of the framework preset, so this is the actual production
// entry point; it shares the generation/polling logic in
// services/magnificEngine.ts with server.ts so the two can't drift apart.
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { theme, brand } = req.body || {};
    const imageUrl = await runMagnificGeneration(theme, brand);
    res.status(200).json({ imageUrl });
  } catch (err: any) {
    console.error("[Magnific API] Server-side generation error:", err);
    const status = typeof err?.status === "number" ? err.status : 500;
    res.status(status).json({ error: err?.message || "Erro interno no servidor." });
  }
}

// Magnific generation involves an LLM prompt-refinement call plus up to ~45s
// of polling — comfortably inside Vercel's Node function limits, but give it
// explicit headroom instead of relying on the (shorter) platform default.
export const config = {
  maxDuration: 60,
};
