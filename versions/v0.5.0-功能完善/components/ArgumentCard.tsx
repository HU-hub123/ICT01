import { MODEL_MAP } from "@/lib/models-data";
import { ROLE_LABELS, type ModelArgument } from "@/lib/types";
import { TaggedList } from "./TaggedList";

/** 单个模型的独立推演卡：结论 + 成立条件 + 失效边界 + 要求用户执行的动作 */
export function ArgumentCard({ arg }: { arg: ModelArgument }) {
  const m = MODEL_MAP[arg.modelId];
  if (!m) return null;
  return (
    <div className="panel p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-semibold text-zinc-900">{m.name}</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
          {ROLE_LABELS[m.role]}
        </span>
        <span className="text-xs text-zinc-400">{m.nameEn}</span>
      </div>
      <p className="text-xs text-zinc-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
        🧭 该模型要求你执行的动作：{m.scaffoldAction}
      </p>
      <TaggedList items={arg.conclusion} />
      <div className="grid sm:grid-cols-2 gap-2 text-xs leading-5">
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2 text-zinc-700">
          <b className="text-emerald-800">成立条件：</b>
          {arg.appliesWhen}
        </div>
        <div className="bg-rose-50/60 border border-rose-100 rounded-lg p-2 text-zinc-700">
          <b className="text-rose-800">失效边界：</b>
          {arg.failsWhen}
        </div>
      </div>
    </div>
  );
}
