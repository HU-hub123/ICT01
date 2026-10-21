import { MODEL_MAP } from "@/lib/models-data";
import { ROLE_LABELS, type ModelDef } from "@/lib/types";

/** 模型库卡片：完整展示可溯源信息 */
export function ModelCard({ model, usedCount }: { model: ModelDef; usedCount?: number }) {
  return (
    <div className="panel p-4 space-y-2 flex flex-col">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-semibold text-zinc-900">{model.name}</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
          {ROLE_LABELS[model.role]}
        </span>
        <span className="text-xs text-zinc-400">{model.nameEn}</span>
        {usedCount !== undefined && usedCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">
            你的推演用过 ×{usedCount}
          </span>
        )}
      </div>
      <p className="text-sm text-zinc-700 leading-6">{model.definition}</p>
      <p className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-lg p-2 leading-5">
        🧭 思考动作：{model.scaffoldAction}
      </p>
      <div className="text-xs space-y-1 text-zinc-600 leading-5">
        <p>
          <span className="text-emerald-700 font-medium">适用：</span>
          {model.appliesWhen}
        </p>
        <p>
          <span className="text-rose-700 font-medium">失效：</span>
          {model.failsWhen}
        </p>
        <p>
          <span className="font-medium text-zinc-500">谱系：</span>
          {model.lineage}
        </p>
        <p>
          <span className="font-medium text-zinc-500">张力对：</span>
          {model.tensionWith.length
            ? model.tensionWith.map((id) => MODEL_MAP[id]?.name ?? id).join("、")
            : "—"}
        </p>
        <p className="pt-1 border-t border-zinc-100">
          <span className="font-medium text-zinc-500">信源：</span>
          {model.sources.map((s, i) => (
            <span key={s.label}>
              {i > 0 && "；"}
              {s.url ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-zinc-300 hover:text-zinc-900"
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
    </div>
  );
}
