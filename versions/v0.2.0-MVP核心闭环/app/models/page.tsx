import { ModelLibrary } from "@/components/ModelLibrary";

export default function ModelsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-3">
      <h1 className="text-2xl font-bold text-zinc-900">模型库</h1>
      <p className="text-sm text-zinc-500">
        30 个精选思维模型，每个都可溯源（信源 / 谱系 / 适用条件 / 失效边界）。
        模型不是"词条"，而是不同类型的<b>认知操作</b>——每个模型都写明：它要求你执行什么思考动作。
      </p>
      <ModelLibrary />
    </div>
  );
}
