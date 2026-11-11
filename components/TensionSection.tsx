import { MODEL_MAP } from "@/lib/models-data";
import type { AnalysisRecord } from "@/lib/types";

/** 交叉推演区：冲突点（各自何时成立）+ 可检验的猜想 */
export function TensionSection({
  conflicts,
  agreementNote,
  checkpoints,
}: Pick<AnalysisRecord, "conflicts" | "agreementNote" | "checkpoints">) {
  return (
    <div className="panel p-5 space-y-4">
      <h2 className="serif text-[15px] font-semibold text-ink">④ 让角度之间互相质询</h2>
      <p className="text-xs text-stone-400">
        这里不是要选出「最正确」的模型，而是看清每个角度在什么条件下成立。
      </p>

      {conflicts.length === 0 ? (
        <p className="text-sm text-stone-700 bg-stone-50/60 border border-line rounded-xl p-3 leading-6">
          这次几个角度没有直接冲突。<b>它们共同成立的条件：</b>
          {agreementNote || "（未说明）"}
        </p>
      ) : (
        <div className="space-y-2">
          {conflicts.map((c, i) => (
            <div
              key={i}
              className="border border-amber-200/70 bg-amber-50/40 rounded-xl p-3 text-sm space-y-1"
            >
              <p className="font-medium text-amber-900">
                冲突 {i + 1}：{c.between.map((id) => MODEL_MAP[id]?.name ?? id).join(" × ")}
              </p>
              <p className="text-stone-800 leading-6">{c.statement}</p>
              <p className="text-xs text-stone-600 leading-5">
                <b>各自在什么情况下成立：</b>
                {c.resolutionCondition || "（未说明）"}
              </p>
            </div>
          ))}
          {agreementNote && <p className="text-xs text-stone-500">其余部分的一致说明：{agreementNote}</p>}
        </div>
      )}

      {checkpoints.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-stone-700">
            可以检验的猜想（什么新证据会改变判断）
          </h3>
          {checkpoints.map((c, i) => (
            <div key={i} className="border border-line rounded-xl p-3 text-sm space-y-1 bg-white/60">
              <p className="text-stone-800 leading-6">
                <b>猜想 {i + 1}：</b>
                {c.hypothesis}
              </p>
              <p className="text-emerald-700 text-xs">✅ 支持它的证据：{c.confirmingEvidence || "—"}</p>
              <p className="text-rose-700 text-xs">❌ 推翻它的证据：{c.disconfirmingEvidence || "—"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
