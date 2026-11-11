import { MODEL_MAP } from "@/lib/models-data";
import { DISCIPLINE_LABELS, getDiscipline, getPlain } from "@/lib/plain-explain";
import { ROLE_LABELS, ROLE_NOTES, type ModelDef } from "@/lib/types";

/** 模型卡片：先给一句大白话，详解收进「展开」里 */
export function ModelCard({ model, usedCount }: { model: ModelDef; usedCount?: number }) {
  return (
    <div className="panel p-4 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="serif font-semibold text-ink text-[15px]">{model.name}</h3>
        <span
          className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600"
          title={ROLE_NOTES[model.role]}
        >
          {ROLE_LABELS[model.role]}
        </span>
        <span className="text-[11px] text-stone-400">{DISCIPLINE_LABELS[getDiscipline(model.id)]}</span>
        {usedCount !== undefined && usedCount > 0 && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-soft text-brand">
            你的推演用过 ×{usedCount}
          </span>
        )}
      </div>
      <p className="text-sm text-stone-700 leading-6">
        {getPlain(model.id) || model.definition}
      </p>
      <details className="text-xs text-stone-500">
        <summary className="cursor-pointer select-none text-stone-400 hover:text-stone-600">
          展开详解（定义 / 动作 / 适用 / 失效 / 谱系 / 信源）
        </summary>
        <div className="mt-2 space-y-1.5 leading-5">
          <p>
            <b className="text-stone-600">定义：</b>
            {model.definition}
          </p>
          <p className="text-amber-900 bg-amber-50/60 border border-amber-100/60 rounded-lg p-2">
            🧭 它要求你做的动作：{model.scaffoldAction}
          </p>
          <p>
            <span className="text-emerald-700 font-medium">什么时候适用：</span>
            {model.appliesWhen}
          </p>
          <p>
            <span className="text-rose-700 font-medium">什么时候不适用：</span>
            {model.failsWhen}
          </p>
          <p>
            <span className="font-medium text-stone-500">谱系：</span>
            {model.lineage}
          </p>
          <p>
            <span className="font-medium text-stone-500">会与哪些角度冲突：</span>
            {model.tensionWith.length
              ? model.tensionWith.map((id) => MODEL_MAP[id]?.name ?? id).join("、")
              : "—"}
          </p>
          <p className="pt-1 border-t border-line text-[11px] text-stone-400">
            <span className="font-medium">来源：</span>
            {model.sources.map((s, i) => (
              <span key={s.label}>
                {i > 0 && "；"}
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-stone-300 hover:text-stone-700"
                  >
                    {s.label}
                  </a>
                ) : (
                  s.label
                )}
              </span>
            ))}
          </p>
        </div>
      </details>
    </div>
  );
}
