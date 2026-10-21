import { jsonResponse } from "@/lib/http";
import { store } from "@/lib/store";
import type { AnalysisRecord } from "@/lib/types";

export const runtime = "nodejs";

/** GET /api/ledger —— 认知账本列表（按时间倒序） */
export async function GET() {
  const records = await store.list();
  return jsonResponse({ items: records });
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
  const saved = await store.save(record);
  return jsonResponse({ record: saved });
}
