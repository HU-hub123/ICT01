import { MODEL_MAP } from "@/lib/models-data";
import { getPlain } from "@/lib/plain-explain";
import { ROLE_LABELS, ROLE_NOTES, type ModelArgument } from "@/lib/types";
import { TaggedList } from "./TaggedList";

/** 单个模型的独立推演：先给大白话，再给结论与边界 */
export function ArgumentCard({ arg }: { arg: ModelArgument }) {
  const m = MODEL_MAP[arg.modelId];
  if (!m) return null;
  return (
    <div className="panel p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="serif font-semibold text-ink text-[15px]">{m.name}</h3>
        <span
          className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600"
          title={ROLE_NOTES[m.role]}
        >
          {ROLE_LABELS[m.role]}
        </span>
        <span className="text-[11px] text-stone-400">{m.nameEn}</span>
      </div>
      <p className="text-xs text-stone-600 bg-stone-50/70 border border-line/70 rounded-lg p-2 leading-5">
        一句话：{getPlain(m.id)}
      </p>
      <p className="text-xs text-amber-900 bg-amber-50/60 border border-amber-100/60 rounded-lg p-2 leading-5">
        🧭 它要求你做的动作：{m.scaffoldAction}
      </p>
      <TaggedList items={arg.conclusion} />
      <div className="grid sm:grid-cols-2 gap-2 text-xs leading-5">
        <div className="bg-emerald-50/50 border border-emerald-100/70 rounded-lg p-2 text-stone-700">
          <b className="text-emerald-800">什么时候适用：</b>
          {arg.appliesWhen}
        </div>
        <div className="bg-rose-50/50 border border-rose-100/70 rounded-lg p-2 text-stone-700">
          <b className="text-rose-800">什么时候不适用：</b>
          {arg.failsWhen}
        </div>
      </div>
    </div>
  );
}
