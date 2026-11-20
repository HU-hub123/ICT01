import { jsonResponse } from "@/lib/http";
import { getStore } from "@/lib/store";
import type { AnalysisRecord } from "@/lib/types";

export const runtime = "nodejs";

/** GET /api/ledger —— 认知账本列表（按时间倒序） */
export async function GET() {
  const store = await getStore();
  const records = await store.list();
  return jsonResponse({ items: records });
}

/** DELETE /api/ledger —— 批量删除（{ids:[...]}）或清空（{all:true}） */
export async function DELETE(req: Request) {
  let body: { ids?: unknown; all?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const store = await getStore();
  if (body?.all === true) {
    const deleted = await store.clear();
    return jsonResponse({ deleted });
  }
  const ids = Array.isArray(body?.ids)
    ? body.ids.map((x) => String(x)).filter(Boolean)
    : [];
  if (ids.length === 0) {
    return jsonResponse({ error: "请提供要删除的记录 id" }, 400);
  }
  const deleted = await store.removeMany(ids);
  return jsonResponse({ deleted });
}

/** POST /api/ledger —— 保存一笔认知账本（判断过程快照） */
export async function POST(req: Request) {
  let body: { record?: AnalysisRecord };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "请求体不是合法 JSON" }, 400);
  }
  const record = body?.record;
  if (
    !record ||
    typeof record.id !== "string" ||
    typeof record.question !== "string" ||
    !Array.isArray(record.selections) ||
    !Array.isArray(record.arguments) ||
    !Array.isArray(record.conclusion) ||
    !record.minimalAction ||
    !Array.isArray(record.steps)
  ) {
    return jsonResponse({ error: "记录结构不完整，无法保存" }, 400);
  }
  const store = await getStore();
  const saved = await store.save(record);
  return jsonResponse({ record: saved });
}
