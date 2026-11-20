"use client";

import { useEffect, useState } from "react";
import type { AnalysisRecord } from "@/lib/types";
import { MODEL_MAP } from "@/lib/models-data";
import { getPlain } from "@/lib/plain-explain";
import { LayerBadge } from "./LayerBadge";
import { DecisionGraph } from "./DecisionGraph";
import { ModelCompareTable } from "./ModelCompareTable";
import { TracePanel } from "./TracePanel";

type ModuleKey = "facts" | "angles" | "tension" | "conclusion" | "action" | "process";

const LABELS: Record<ModuleKey, string> = {
  facts: "判断点与缺口",
  angles: "看问题的角度",
  tension: "互相质询",
  conclusion: "结论要点",
  action: "下一步",
  process: "过程",
};

function truncate(s: string, n: number): string {
  const t = (s || "").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/**
 * 推演结果：模块化卡片（关键点大字）＋ 点击浮窗看细节。
 * 默认只显示摘要，细节由用户自己决定是否展开。
 */
export function ResultModules({ record }: { record: AnalysisRecord }) {
  const [open, setOpen] = useState<ModuleKey | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const nameOf = (id: string) =>
    record.selections.find((s) => s.modelId === id)?.model?.name ??
    MODEL_MAP[id]?.name ??
    id;

  const plainOf = (id: string) =>
    record.selections.find((s) => s.modelId === id)?.model?.plain || getPlain(id);

  const firstInference =
    record.conclusion.find((s) => s.layer === "inference")?.text || record.conclusion[0]?.text || "";

  const seconds = Math.round(record.steps.reduce((s, x) => s + x.durationMs, 0) / 1000);

  const busyPairs = record.selections.filter((s) =>
    s.model ? s.model.tensionWith.some((tid) => record.selections.some((x) => x.modelId === tid)) : false,
  ).length;

  const keys: Record<ModuleKey, string> = {
    facts: truncate(record.factsRecap.coreJudgment, 70),
    angles: record.selections.map((s) => nameOf(s.modelId)).join(" × "),
    tension: record.conflicts.length
      ? `${record.conflicts.length} 处：${truncate(record.conflicts[0].statement, 42)}`
      : "这次没有直接冲突",
    conclusion: truncate(firstInference, 90),
    action: truncate(record.minimalAction.action, 84),
    process: `${record.steps.length} 步 · 约 ${seconds} 秒 · 每步留档`,
  };

  const subs: Partial<Record<ModuleKey, string>> = {
    facts: `已知 ${record.factsRecap.confirmedFacts.length} 条 · 缺口 ${record.factsRecap.missingInfo.length} 条`,
    angles: `${record.selections.length} 个角度${busyPairs > 0 ? "，其中含对立角度" : ""}`,
    tension: `${record.conflicts.length} 处冲突 · ${record.checkpoints.length} 个可检验猜想`,
    conclusion: `${record.conclusion.length} 句结论，每句标了可信度`,
    action: "做什么、什么条件下停，都已提前写下",
    process: "每一步的输入与耗时都可回溯",
  };

  const order: ModuleKey[] = ["facts", "angles", "tension", "conclusion", "action", "process"];

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {order.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setOpen(k)}
            className="panel p-5 text-left space-y-2 hover:border-brand/40 transition-colors group"
          >
            <p className="text-[11px] tracking-wide text-stone-400">{LABELS[k]}</p>
            <p className="text-[17px] leading-7 text-ink">{keys[k]}</p>
            {subs[k] && <p className="text-xs text-stone-400">{subs[k]}</p>}
            <p className="text-xs text-brand opacity-0 group-hover:opacity-100 transition-opacity">
              看细节 →
            </p>
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
          aria-label={LABELS[open]}
        >
          <div
            className="bg-white rounded-2xl border border-line shadow-2xl w-full max-w-2xl max-h-[82vh] overflow-y-auto p-6 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="serif text-lg font-semibold text-ink">{LABELS[open]}</h2>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="text-xs px-2.5 py-1 rounded-full border border-line text-stone-500 hover:bg-stone-50"
              >
                关闭
              </button>
            </div>

            {open === "facts" && (
              <div className="space-y-3">
                <p className="text-[15px] leading-7 text-ink">{record.factsRecap.coreJudgment}</p>
                <div>
                  <p className="text-xs text-emerald-700 mb-1">已确认事实</p>
                  <ul className="space-y-1.5">
                    {record.factsRecap.confirmedFacts.length === 0 && (
                      <li className="text-sm text-stone-400">（没有提供额外事实）</li>
                    )}
                    {record.factsRecap.confirmedFacts.map((f, i) => (
                      <li key={i} className="flex gap-2 items-start text-sm leading-6 text-stone-800">
                        <span className="mt-0.5 shrink-0">
                          <LayerBadge layer="fact" />
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-rose-700 mb-1">还缺的信息</p>
                  <ul className="space-y-1.5">
                    {record.factsRecap.missingInfo.map((f, i) => (
                      <li key={i} className="flex gap-2 items-start text-sm leading-6 text-stone-800">
                        <span className="mt-0.5 shrink-0">
                          <LayerBadge layer="missing" />
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {open === "angles" && (
              <div className="space-y-2">
                {record.selections.map((sel) => {
                  const m = sel.model ?? MODEL_MAP[sel.modelId];
                  if (!m) return null;
                  const inTension = m.tensionWith.some((tid) =>
                    record.selections.some((s2) => s2.modelId === tid),
                  );
                  return (
                    <div key={sel.modelId} className="border border-line rounded-xl p-3 bg-white/70">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-ink">{m.name}</span>
                        {inTension && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-800">
                            ⚔️ 张力
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-stone-600 mt-1 leading-6">{plainOf(sel.modelId)}</p>
                      <p className="text-xs text-stone-400 mt-1 leading-5">为什么选它：{sel.reason}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {open === "tension" && (
              <div className="space-y-3">
                {record.conflicts.length === 0 ? (
                  <p className="text-sm leading-6 text-stone-700">
                    这次没有直接冲突。共同成立的条件：{record.agreementNote || "（未说明）"}
                  </p>
                ) : (
                  record.conflicts.map((c, i) => (
                    <div key={i} className="border border-amber-200/70 bg-amber-50/40 rounded-xl p-3 space-y-1">
                      <p className="text-sm font-medium text-amber-900">
                        {c.between.map((id) => nameOf(id)).join(" × ")}
                      </p>
                      <p className="text-sm text-stone-800 leading-6">{c.statement}</p>
                      <p className="text-xs text-stone-600 leading-5">
                        各自何时成立：{c.resolutionCondition}
                      </p>
                    </div>
                  ))
                )}
                <div className="space-y-2">
                  <p className="text-xs text-stone-500">可以检验的猜想</p>
                  {record.checkpoints.map((cp, i) => (
                    <div key={i} className="border border-line rounded-xl p-3 text-sm space-y-1 bg-white/70">
                      <p className="text-stone-800 leading-6">{cp.hypothesis}</p>
                      <p className="text-emerald-700 text-xs">✅ {cp.confirmingEvidence}</p>
                      <p className="text-rose-700 text-xs">❌ {cp.disconfirmingEvidence}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {open === "conclusion" && (
              <ul className="space-y-2.5">
                {record.conclusion.map((s, i) => (
                  <li key={i} className="flex gap-2 items-start text-[15px] leading-7 text-ink">
                    <span className="mt-1.5 shrink-0">
                      <LayerBadge layer={s.layer} />
                    </span>
                    <span>{s.text}</span>
                  </li>
                ))}
              </ul>
            )}

            {open === "action" && (
              <div className="space-y-3 text-[15px] leading-7 text-ink">
                <p>
                  <span className="text-emerald-700 font-medium">先做：</span>
                  {record.minimalAction.action}
                </p>
                <p>
                  <span className="text-rose-700 font-medium">停止条件：</span>
                  {record.minimalAction.stopCondition}
                </p>
                <p>
                  <span className="text-sky-700 font-medium">看多久：</span>
                  {record.minimalAction.observationWindow}
                </p>
              </div>
            )}

            {open === "process" && (
              <div className="space-y-4">
                <DecisionGraph record={record} />
                <ModelCompareTable record={record} />
                <TracePanel steps={record.steps} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
