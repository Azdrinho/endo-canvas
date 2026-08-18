import { runMagnificGeneration } from "../services/magnificEngine";

// Diagnostic only: proves whether merely IMPORTING magnificEngine.ts
// crashes the function (module-eval time), independent of ever calling
// runMagnificGeneration. Delete once the generate() crash is diagnosed.
export default function handler(req: any, res: any) {
  res.status(200).json({ ok: true, typeofFn: typeof runMagnificGeneration });
}
