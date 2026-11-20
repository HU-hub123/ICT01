import { jsonResponse } from "@/lib/http";
import { customModelStore } from "@/lib/custom-models";

export const runtime = "nodejs";

/** DELETE /api/models/custom/[id] —— 删除自定义模型（内置模型不可删） */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id.startsWith("custom-")) {
    return jsonResponse({ error: "内置模型不可删除" }, 400);
  }
  const ok = await customModelStore.remove(id);
  if (!ok) {
    return jsonResponse({ error: "未找到该自定义模型" }, 404);
  }
  return jsonResponse({ deleted: true });
}
