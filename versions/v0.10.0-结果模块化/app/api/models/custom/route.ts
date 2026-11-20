import { jsonResponse } from "@/lib/http";
import { customModelStore } from "@/lib/custom-models";
import { getAllModels } from "@/lib/models-all";
import type { OpRole } from "@/lib/types";

export const runtime = "nodejs";

/** GET /api/models/custom —— 用户自定义模型列表 */
export async function GET() {
  const models = await customModelStore.list();
  return jsonResponse({ models });
}

/** POST /api/models/custom —— 新增一个自定义模型 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "请求体不是合法 JSON" }, 400);
  }

  const all = await getAllModels();
  const validIds = new Set(all.map((m) => m.id));
  const tensionRaw = Array.isArray(body?.tensionWith) ? body.tensionWith.map(String) : [];
  const tagsRaw = Array.isArray(body?.tags)
    ? body.tags.map(String)
    : typeof body?.tags === "string"
      ? body.tags.split(/[,，、\s]+/)
      : [];

  try {
    const model = await customModelStore.add({
      name: String(body?.name ?? ""),
      nameEn: String(body?.nameEn ?? ""),
      role: String(body?.role ?? "") as OpRole,
      plain: String(body?.plain ?? ""),
      definition: String(body?.definition ?? ""),
      scaffoldAction: String(body?.scaffoldAction ?? ""),
      appliesWhen: String(body?.appliesWhen ?? ""),
      failsWhen: String(body?.failsWhen ?? ""),
      tags: tagsRaw.filter(Boolean),
      tensionWith: tensionRaw.filter((id) => validIds.has(id)),
    });
    return jsonResponse({ model }, 201);
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
}
