import Link from "next/link";
import { MODEL_MAP } from "@/lib/models-data";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  const items = await store.list();
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">认知账本</h1>
        <p className="text-sm text-zinc-500 mt-1">
          这里保存的不是聊天记录，而是"你是怎么得到这个判断的"：问题、事实、假设、证据、冲突、预测与停止条件。
        </p>
      </div>
      {items.length === 0 ? (
        <div className="panel p-10 text-center space-y-3">
          <p className="text-sm text-zinc-500">账本还是空的。去工作台完成第一次推演，把判断过程存下来。</p>
          <Link
            href="/ask"
            className="inline-block px-4 py-2 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-700"
          >
            开始推演
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <Link
              key={r.id}
              href={`/ledger/${r.id}`}
              className="panel p-4 block hover:border-zinc-400 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900 truncate">{r.question}</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {new Date(r.createdAt).toLocaleString("zh-CN")} ·{" "}
                    {r.selections
                      .map((s) => MODEL_MAP[s.modelId]?.name ?? s.modelId)
                      .join("、")}
                    {r.followUpOf ? " · 追问" : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs px-2 py-1 rounded-full ${
                    r.status === "reviewed"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {r.status === "reviewed" ? "已复盘" : "待复盘"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
