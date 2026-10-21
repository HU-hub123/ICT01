import { MODELS } from "@/lib/models-data";

export const runtime = "nodejs";

/** GET /api/models —— 可溯源模型库（30 个精选模型） */
export async function GET() {
  return Response.json({ models: MODELS, count: MODELS.length });
}
