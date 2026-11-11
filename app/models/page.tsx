import { ModelLibrary } from "@/components/ModelLibrary";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  const records = await store.list();
  const usage: Record<string, number> = {};
  for (const r of records) {
    for (const sel of r.selections) {
      usage[sel.modelId] = (usage[sel.modelId] ?? 0) + 1;
    }
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-3">
      <h1 className="serif text-2xl font-bold text-ink">模型库</h1>
      <p className="text-sm text-stone-500 leading-6">
        42 个模型，分五类：心理与认知、概率与统计、经济与决策、哲学、系统与动态。
        每个都先给一句<b className="text-stone-700">大白话</b>，想深究再展开看定义、边界与来源——不要求你记住术语。
      </p>
      <ModelLibrary usage={usage} />
    </div>
  );
}
