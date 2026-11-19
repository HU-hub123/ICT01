import { jsonResponse } from "@/lib/http";
import { getAllModels } from "@/lib/models-all";

export const runtime = "nodejs";

/** GET /api/models —— 可溯源模型库（内置 + 用户自定义） */
export async function GET() {
  const models = await getAllModels();
  return jsonResponse({
    models,
    count: models.length,
    customCount: models.filter((m) => m.custom).length,
  });
}
