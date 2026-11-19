import { jsonResponse } from "@/lib/http";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

/** GET /api/ledger/trash —— 回收站列表（7 天内） */
export async function GET() {
  const store = await getStore();
  const items = await store.listDeleted();
  return jsonResponse({ items });
}

/** POST /api/ledger/trash —— 恢复一条（body: {id}） */
export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const id = String(body?.id ?? "");
  if (!id) return jsonResponse({ error: "请提供要恢复的记录 id" }, 400);
  const store = await getStore();
  const record = await store.restore(id);
  if (!record) return jsonResponse({ error: "未找到该回收站条目" }, 404);
  return jsonResponse({ record });
}

/** DELETE /api/ledger/trash —— 彻底删除一条（{id}）或清空（{all:true}） */
export async function DELETE(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const store = await getStore();
  if (body?.all === true) {
    const deleted = await store.clearTrash();
    return jsonResponse({ deleted });
  }
  const id = String(body?.id ?? "");
  if (!id) return jsonResponse({ error: "请提供要彻底删除的记录 id" }, 400);
  const ok = await store.purge(id);
  if (!ok) return jsonResponse({ error: "未找到该回收站条目" }, 404);
  return jsonResponse({ deleted: true });
}
