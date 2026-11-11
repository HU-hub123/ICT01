import { MODEL_MAP } from "@/lib/models-data";
import type { AnalysisRecord } from "@/lib/types";

/** 交叉推演区：冲突点（各在什么条件下成立）+ 证据检查点 */
export function TensionSection({
  conflicts,
  agreementNote,
  checkpoints,
}: Pick<AnalysisRecord, "conflicts" | "agreementNote" | "checkpoints">) {
  return (
    <div className="panel p-4 space-y-4">
      <h2 className="font-semibold text-zinc-900">
        ⚔️ 交叉推演：模型在哪里冲突、各自在什么条件下成立
      </h2>

      {conflicts.length === 0 ? (
        <p className="text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg p-3">
          模型之间没有实质冲突。<b>一致成立的条件：</b>
          {agreementNote || "（未说明）"}
        </p>
      ) : (
        <div className="space-y-2">
          {conflicts.map((c, i) => (
            <div
              key={i}
              className="border border-amber-200 bg-amber-50/60 rounded-lg p-3 text-sm space-y-1"
            >
              <p className="font-medium text-amber-900">
                冲突 {i + 1}：{c.between.map((id) => MODEL_MAP[id]?.name ?? id).join(" × ")}
              </p>
              <p className="text-zinc-800">{c.statement}</p>
              <p className="text-xs text-zinc-600">
                <b>各自在什么条件下成立：</b>
                {c.resolutionCondition || "（未说明）"}
              </p>
            </div>
          ))}
          {agreementNote && (
            <p className="text-xs text-zinc-500">其余部分的一致说明：{agreementNote}</p>
          )}
        </div>
      )}

      {checkpoints.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-800">
            🧪 证据检查点：什么新证据会改变现在的判断（贝叶斯式）
          </h3>
          {checkpoints.map((c, i) => (
            <div key={i} className="border border-zinc-200 rounded-lg p-3 text-sm space-y-1">
              <p className="font-medium text-zinc-800">
                假设 {i + 1}：{c.hypothesis}
              </p>
              <p className="text-emerald-700 text-xs">✅ 支持证据：{c.confirmingEvidence || "—"}</p>
              <p className="text-rose-700 text-xs">❌ 推翻证据：{c.disconfirmingEvidence || "—"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
