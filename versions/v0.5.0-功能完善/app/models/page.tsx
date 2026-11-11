import { ModelLibrary } from "@/components/ModelLibrary";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  // 统计每个模型在历史推演（认知账本）中的使用次数
  const records = await store.list();
  const usage: Record<string, number> = {};
  for (const r of records) {
    for (const sel of r.selections) {
      usage[sel.modelId] = (usage[sel.modelId] ?? 0) + 1;
    }
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-3">
      <h1 className="text-2xl font-bold text-zinc-900">模型库</h1>
      <p className="text-sm text-zinc-500">
        30 个精选思维模型，每个都可溯源（信源 / 谱系 / 适用条件 / 失效边界）。
        模型不是「词条」，而是不同类型的<b>认知操作</b>——每个模型都写明：它要求你执行什么思考动作。
      </p>
      <ModelLibrary usage={usage} />
    </div>
  );
}
