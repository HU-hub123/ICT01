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
    return Response.json({ error: "未找到该认知账本条目" }, { status: 404 });
  }
  return Response.json({ record });
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
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const actualOutcome = (body?.actualOutcome ?? "").trim();
  if (!actualOutcome) {
    return Response.json({ error: "请先填写实际结果" }, { status: 400 });
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
    return Response.json({ error: "未找到该认知账本条目" }, { status: 404 });
  }
  return Response.json({ record: updated });
}
