// Minimal diagnostic function with zero imports/dependencies, used to isolate
// whether Vercel is picking up files under /api as serverless functions at
// all, versus the failure being specific to the Magnific/Gemini function's
// code or dependencies.
export default function handler(req: any, res: any) {
  res.status(200).json({ ok: true, now: new Date().toISOString() });
}
