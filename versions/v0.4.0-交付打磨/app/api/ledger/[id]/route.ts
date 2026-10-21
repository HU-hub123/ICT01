import { jsonResponse } from "@/lib/http";
import { store } from "@/lib/store";

export const runtime = "nodejs";

/** GET /api/ledger/[id] —— 单笔账本详情 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const record = await store.get(id);
  if (!record) {
    return jsonResponse({ error: "未找到该认知账本条目" }, 404);
  }
  return jsonResponse({ record });
}

/** POST /api/ledger/[id] —— 提交复盘（实际结果 → 推翻/确认假设） */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: {
    actualOutcome?: string;
    overturnedAssumptions?: string[];
    confirmedAssumptions?: string[];
    lesson?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "请求体不是合法 JSON" }, 400);
  }
  const actualOutcome = (body?.actualOutcome ?? "").trim();
  if (!actualOutcome) {
    return jsonResponse({ error: "请先填写实际结果" }, 400);
  }
  const updated = await store.addReview(id, {
    actualOutcome,
    overturnedAssumptions: Array.isArray(body?.overturnedAssumptions)
      ? body.overturnedAssumptions.filter((s) => s.trim())
      : [],
    confirmedAssumptions: Array.isArray(body?.confirmedAssumptions)
      ? body.confirmedAssumptions.filter((s) => s.trim())
      : [],
    lesson: (body?.lesson ?? "").trim(),
  });
  if (!updated) {
    return jsonResponse({ error: "未找到该认知账本条目" }, 404);
  }
  return jsonResponse({ record: updated });
}
