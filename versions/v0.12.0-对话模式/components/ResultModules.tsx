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
  facts: "我的判断",
  angles: "换个角度看",
  tension: "分歧在哪",
  conclusion: "结论",
  action: "下一步",
  process: "完整过程",
};

function truncate(s: string, n: number): string {
  const t = (s || "").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/**
 * 结果区：默认只给关键点（大字），细节由用户点开浮窗再看。
 * 面向用户用大白话，不堆术语和模型名称。
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
    record.selections.find((s) => s.modelId === id)?.model?.plain || getPlain(id) || "";

  const firstAngle = record.selections[0] ? plainOf(record.selections[0].modelId) : "";
  const firstInference =
    record.conclusion.find((s) => s.layer === "inference")?.text || record.conclusion[0]?.text || "";
  const busyPairs = record.selections.filter((s) => {
    const m = s.model ?? MODEL_MAP[s.modelId];
    return m ? m.tensionWith.some((tid) => record.selections.some((x) => x.modelId === tid)) : false;
  }).length;
  const seconds = Math.round(record.steps.reduce((sum, x) => sum + x.durationMs, 0) / 1000);

  const keys: Record<Exclude<ModuleKey, "process">, string> = {
    facts: truncate(record.factsRecap.coreJudgment, 80),
    angles: firstAngle
      ? `${truncate(firstAngle, 34)}…（共 ${record.selections.length} 个角度）`
      : "这次没有选出角度",
    tension: record.conflicts.length ? `${record.conflicts.length} 处看法不一致` : "这次没有分歧",
    conclusion: truncate(firstInference, 90),
    action: truncate(record.minimalAction.action, 84),
  };

  const subs: Partial<Record<Exclude<ModuleKey, "process">, string>> = {
    facts: `已知 ${record.factsRecap.confirmedFacts.length} 条 · 还缺 ${record.factsRecap.missingInfo.length} 条`,
    angles: busyPairs > 0 ? `${busyPairs} 组看法正好相反` : "几个角度能互相补位",
    tension: "点开看两边各自什么时候成立",
    conclusion: `${record.conclusion.length} 句话，每句标了可信度`,
    action: `停在什么条件下：${truncate(record.minimalAction.stopCondition, 34)}`,
  };

  const cards: Exclude<ModuleKey, "process">[] = ["facts", "angles", "tension", "conclusion", "action"];

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((k) => (
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
              点开看细节 →
            </p>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen("process")}
          className="panel p-5 text-left space-y-2 hover:border-brand/40 transition-colors group"
        >
          <p className="text-[11px] tracking-wide text-stone-400">{LABELS.process}</p>
          <p className="text-[17px] leading-7 text-ink">
            {record.steps.length} 步都留了记录
          </p>
          <p className="text-xs text-stone-400">
            用时约 {seconds} 秒 · {record.selections.length} 个角度 · {record.conclusion.length} 句结论
          </p>
          <p className="text-xs text-brand opacity-0 group-hover:opacity-100 transition-opacity">
            回看每一步 →
          </p>
        </button>
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
                  <p className="text-xs text-emerald-700 mb-1">你说过的</p>
                  <ul className="space-y-1.5">
                    {record.factsRecap.confirmedFacts.length === 0 && (
                      <li className="text-sm text-stone-400">（没有提供额外信息）</li>
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
                  <p className="text-xs text-rose-700 mb-1">还需要知道的</p>
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
              <div className="space-y-3">
                {record.selections.map((sel) => {
                  const m = sel.model ?? MODEL_MAP[sel.modelId];
                  if (!m) return null;
                  const inTension = m.tensionWith.some((tid) =>
                    record.selections.some((s2) => s2.modelId === tid),
                  );
                  return (
                    <div key={sel.modelId} className="border border-line rounded-xl p-3 bg-white/70 space-y-1">
                      <p className="text-[15px] leading-7 text-ink">{plainOf(sel.modelId)}</p>
                      <p className="text-xs text-stone-400">
                        依据：{m.name}
                        {inTension && <span className="ml-2 text-amber-700">· 和另一个角度正好相反</span>}
                      </p>
                      <p className="text-xs text-stone-400 leading-5">它在这里负责：{sel.reason}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {open === "tension" && (
              <div className="space-y-3">
                {record.conflicts.length === 0 ? (
                  <p className="text-sm leading-6 text-stone-700">
                    这次几个角度的结论方向一致。它们共同成立的条件是：{record.agreementNote || "（没有额外说明）"}
                  </p>
                ) : (
                  record.conflicts.map((c, i) => (
                    <div key={i} className="border border-amber-200/70 bg-amber-50/40 rounded-xl p-3 space-y-1">
                      <p className="text-[15px] leading-7 text-stone-800">{c.statement}</p>
                      <p className="text-xs text-stone-600 leading-5">
                        各自什么时候成立：{c.resolutionCondition}
                      </p>
                      <p className="text-[11px] text-stone-400">
                        依据：{c.between.map((id) => nameOf(id)).join(" × ")}
                      </p>
                    </div>
                  ))
                )}
                <div className="space-y-2">
                  <p className="text-xs text-stone-500">看到什么就改判</p>
                  {record.checkpoints.map((cp, i) => (
                    <div key={i} className="border border-line rounded-xl p-3 text-sm space-y-1 bg-white/70">
                      <p className="text-stone-800 leading-6">{cp.hypothesis}</p>
                      <p className="text-emerald-700 text-xs">✅ 支持它的：{cp.confirmingEvidence}</p>
                      <p className="text-rose-700 text-xs">❌ 推翻它的：{cp.disconfirmingEvidence}</p>
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
                  <span className="text-rose-700 font-medium">出现这个就停：</span>
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
