"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { AnalysisRecord, HistoryTurn, PipelineStep } from "@/lib/types";
import { MODEL_MAP } from "@/lib/models-data";
import { getPlain } from "@/lib/plain-explain";
import { LayerLegend, LayerBadge } from "./LayerBadge";
import { TaggedList } from "./TaggedList";
import { ArgumentCard } from "./ArgumentCard";
import { TensionSection } from "./TensionSection";
import { ActionCard } from "./ActionCard";
import { TracePanel } from "./TracePanel";
import { DecisionGraph } from "./DecisionGraph";
import { ModelCompareTable } from "./ModelCompareTable";
import { SideOracle } from "./SideOracle";

const DEMO_QUESTIONS = [
  "一个已经投入 18 个月的产品，留存不温不火，到底该不该继续？",
  "两份 offer 都不错：一份钱多但成长慢，一份钱少但成长快，怎么选？",
  "我想从零开始做一个 AI 学习类产品，值得做吗？",
];

type Phase = "idle" | "running" | "done" | "error";
type Detail = "brief" | "full";

export function AskWorkbench() {
  const [question, setQuestion] = useState("");
  const [extraFacts, setExtraFacts] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [record, setRecord] = useState<AnalysisRecord | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryTurn[]>([]);
  const [chain, setChain] = useState<AnalysisRecord[]>([]);
  const [followUpQ, setFollowUpQ] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [parentSavedId, setParentSavedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail>("brief");
  const [showAllMissing, setShowAllMissing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function run(q: string, followUp: boolean) {
    const trimmed = q.trim();
    if (!trimmed || phase === "running") return;
    setIsFollowUp(followUp);
    setPhase("running");
    setError("");
    setSteps([]);
    setRecord(null);
    setSavedId(null);
    setSavedMsg("");
    setDetail("brief");
    setShowAllMissing(false);
    setStatus("推演开始：事实收口");
    const controller = new AbortController();
    abortRef.current = controller;
    let rec: AnalysisRecord | null = null;
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          extraFacts: followUp ? undefined : extraFacts.trim() || undefined,
          history: followUp ? history : [],
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `请求失败（HTTP ${res.status}）`);
      }
      if (!res.body) throw new Error("响应没有内容");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          let ev: { type?: string; message?: string; step?: PipelineStep; record?: AnalysisRecord };
          try {
            ev = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }
          if (ev.type === "status") setStatus(String(ev.message ?? ""));
          else if (ev.type === "step" && ev.step) {
            const step = ev.step;
            setSteps((p) => [...p, step]);
          } else if (ev.type === "record" && ev.record) {
            rec = ev.record;
            setRecord(rec);
            setPhase("done");
          } else if (ev.type === "error") {
            throw new Error(String(ev.message ?? "推演失败"));
          }
        }
      }
      if (!rec) throw new Error("推演未返回结果（响应中断），请重试");
      setHistory((h) => [...h, { question: trimmed, summary: rec!.summary ?? "" }]);
      if (followUp) setChain((c) => [...c, rec!]);
    } catch (e) {
      if (controller.signal.aborted) {
        setError("已取消推演（该次模型调用已中止）");
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
      setPhase("error");
    }
  }

  async function save() {
    if (!record || saving) return;
    setSaving(true);
    setSavedMsg("");
    try {
      const toSave: AnalysisRecord =
        isFollowUp && parentSavedId ? { ...record, followUpOf: parentSavedId } : record;
      const res = await fetch("/api/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record: toSave }),
      });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.record?.id) {
        setSavedId(j.record.id);
        if (!isFollowUp) setParentSavedId(j.record.id);
        setSavedMsg("已存入认知账本");
      } else {
        setSavedMsg(j?.error ?? "保存失败，请重试");
      }
    } catch (e) {
      setSavedMsg(String(e));
    } finally {
      setSaving(false);
    }
  }

  const missing = record?.factsRecap.missingInfo ?? [];
  const shownMissing = showAllMissing ? missing : missing.slice(0, 3);
  const conflicts = record?.conflicts ?? [];
  const checkpoints = record?.checkpoints ?? [];

  return (
    <div className="space-y-4">
      {/* 输入区 */}
      <div className="panel p-5 space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            你的问题<span className="text-stone-400 font-normal">（一个需要做判断的问题）</span>
          </span>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            placeholder="例如：一个已经投入 18 个月的产品，留存不温不火，到底该不该继续？"
            className="mt-1 w-full px-3 py-2.5 text-sm border border-line rounded-xl bg-white/90 text-ink focus:outline-none focus:ring-2 focus:ring-stone-300/60"
          />
        </label>
        <label className="block">
          <span className="text-xs text-stone-500">
            补充你已确认的事实（可不填；不填的话，系统会把缺的信息列出来，而不是替你猜）
          </span>
          <input
            value={extraFacts}
            onChange={(e) => setExtraFacts(e.target.value)}
            placeholder="例如：B 端产品，客单价 3 万/年，目前月留存约 60%……"
            className="mt-1 w-full px-3 py-2.5 text-sm border border-line rounded-xl bg-white/90 text-ink focus:outline-none focus:ring-2 focus:ring-stone-300/60"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={phase === "running"}
            onClick={() => run(question, false)}
            className="px-4 py-2 rounded-full bg-brand text-white text-sm disabled:opacity-50 hover:bg-[#3b58f0] transition-colors"
          >
            {phase === "running" ? "推演中…" : "开始推演"}
          </button>
          <span className="text-xs text-stone-400">试试：</span>
          {DEMO_QUESTIONS.map((d) => (
            <button
              key={d}
              type="button"
              disabled={phase === "running"}
              onClick={() => setQuestion(d)}
              className="text-xs px-2.5 py-1 rounded-full border border-line bg-white/60 text-stone-600 hover:border-stone-300"
            >
              {d.slice(0, 16)}…
            </button>
          ))}
        </div>
      </div>

      {/* 运行中 */}
      {phase === "running" && (
        <div className="panel p-5 space-y-2">
          <p className="text-sm text-stone-700 flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-stone-300 border-t-stone-700 animate-spin" />
            {status}
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="ml-auto text-xs px-2 py-1 rounded-full border border-line text-stone-500 hover:bg-stone-50"
            >
              取消
            </button>
          </p>
          <ol className="space-y-1">
            {steps.map((s) => (
              <li key={s.key} className="text-xs text-stone-500 flex gap-2">
                <span className="text-emerald-600">✓</span>
                {s.title}（{(s.durationMs / 1000).toFixed(1)}s）
              </li>
            ))}
          </ol>
          <p className="text-xs text-stone-400">
            五个步骤依次执行（每步最多问模型两次），不会反复绕圈；任何一步失败都会如实报错。
          </p>
        </div>
      )}

      {/* 错误 */}
      {phase === "error" && (
        <div className="panel p-5 border-rose-200 bg-rose-50/50 space-y-2">
          <p className="text-sm font-medium text-rose-700">推演失败（已如实报错，没有编造结果）</p>
          <p className="text-sm text-rose-600 break-all">{error}</p>
          <button
            type="button"
            onClick={() => run(question, false)}
            className="px-3 py-1.5 rounded-full border border-rose-300 text-rose-700 text-sm hover:bg-rose-100"
          >
            重试
          </button>
        </div>
      )}

      {/* 追问链 */}
      {chain.length > 0 && (
        <div className="panel p-4 space-y-1">
          <p className="text-sm text-stone-700">追问记录（每一次都带着上一轮的回答）</p>
          {chain.map((r) => (
            <p key={r.id} className="text-xs text-stone-500">
              · {r.question.slice(0, 50)}…
            </p>
          ))}
        </div>
      )}

      {/* 结果 */}
      {record && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-stone-500">
              一张判断的「简明版」。细节都在，需要时再展开。
            </p>
            <button
              type="button"
              onClick={() => setDetail(detail === "brief" ? "full" : "brief")}
              className="px-3.5 py-1.5 rounded-full border border-line bg-white/70 text-stone-600 text-xs hover:border-stone-300"
            >
              {detail === "brief" ? "展开完整推演 ▾" : "收起到简明版 ▴"}
            </button>
          </div>

          <section className="panel p-5 space-y-3">
            <h2 className="serif text-[15px] font-semibold text-ink">
              ① 先把「知道的」和「不知道的」分开
            </h2>
            <p className="text-xs text-stone-400">
              事实收口：只把你说过的话当作事实；其余标成「缺失信息」，不替你猜。
            </p>
            <p className="text-sm text-stone-800 leading-6">
              <b>真正的判断点：</b>
              {record.factsRecap.coreJudgment}
            </p>
            <div>
              <h3 className="text-xs font-medium text-emerald-700 mb-1">你提供的事实</h3>
              {record.factsRecap.confirmedFacts.length ? (
                <ul className="space-y-1">
                  {record.factsRecap.confirmedFacts.map((f, i) => (
                    <li key={i} className="flex gap-2 items-start text-sm text-stone-800 leading-6">
                      <span className="mt-0.5 shrink-0">
                        <LayerBadge layer="fact" />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-stone-400">
                  你没提供额外事实，下面的推演全部建立在被标注的假设上。
                </p>
              )}
            </div>
            <div>
              <h3 className="text-xs font-medium text-rose-700 mb-1">还缺的信息（会影响结论）</h3>
              {missing.length ? (
                <ul className="space-y-1">
                  {shownMissing.map((f, i) => (
                    <li key={i} className="flex gap-2 items-start text-sm text-stone-800 leading-6">
                      <span className="mt-0.5 shrink-0">
                        <LayerBadge layer="missing" />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-stone-400">（没有识别到关键缺失）</p>
              )}
              {missing.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllMissing((v) => !v)}
                  className="mt-2 text-xs text-brand underline"
                >
                  {showAllMissing ? "收起" : `还有 ${missing.length - 3} 条，展开看看`}
                </button>
              )}
            </div>
          </section>

          <section className="panel p-5 space-y-2">
            <h2 className="serif text-[15px] font-semibold text-ink">② 挑几个角度来看</h2>
            <p className="text-xs text-stone-400">
              模型匹配：从 42 个可溯源模型里选 2-4 个，其中至少有一对会「互相打架」——这样推演才有意义。
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {record.selections.map((sel) => {
                const m = MODEL_MAP[sel.modelId];
                if (!m) return null;
                const inTension = m.tensionWith.some((tid) =>
                  record.selections.some((s2) => s2.modelId === tid),
                );
                return (
                  <div key={sel.modelId} className="border border-line rounded-xl p-3 bg-white/60">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-stone-900">{m.name}</span>
                      {inTension && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-800">
                          ⚔️ 和另一个角度有张力
                        </span>
                      )}
                      {sel.source === "library_tension" && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">
                          补入
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-600 mt-1 leading-5">{getPlain(m.id)}</p>
                    {detail === "full" && (
                      <p className="text-[11px] text-stone-400 mt-1 leading-5">
                        为什么选它：{sel.reason}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {detail === "full" && (
            <div className="space-y-3">
              <h2 className="serif text-[15px] font-semibold text-ink px-1">
                ③ 让每个角度独立说话
              </h2>
              <p className="text-xs text-stone-400 px-1">
                每个模型先各自推演，不互相妥协——冲突要到下一步才处理。
              </p>
              {record.arguments.map((a) => (
                <ArgumentCard key={a.modelId} arg={a} />
              ))}
            </div>
          )}

          <section className="panel p-5 space-y-3">
            <h2 className="serif text-[15px] font-semibold text-ink">
              ④ 让角度之间互相质询
            </h2>
            <p className="text-xs text-stone-400">
              交叉推演：冲突点不是要分出输赢，而是看各自在什么条件下成立；再问「什么证据会改变判断」。
            </p>
            {conflicts.length === 0 ? (
              <p className="text-sm text-stone-700 leading-6">
                这次几个角度没有直接冲突。它们共同成立的条件：{record.agreementNote || "（未说明）"}
              </p>
            ) : (
              <div className="space-y-2">
                {conflicts.slice(0, detail === "brief" ? 1 : conflicts.length).map((c, i) => (
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
                {detail === "brief" && conflicts.length > 1 && (
                  <p className="text-xs text-stone-400">
                    另 {conflicts.length - 1} 处冲突在「完整推演」里。
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-stone-700">
                可以检验的猜想（什么证据会改变判断）
              </h3>
              {(detail === "brief" ? checkpoints.slice(0, 1) : checkpoints).map((cp, i) => (
                <div key={i} className="border border-line rounded-xl p-3 text-sm space-y-1 bg-white/60">
                  <p className="text-stone-800 leading-6">
                    <b>猜想 {i + 1}：</b>
                    {cp.hypothesis}
                  </p>
                  <p className="text-emerald-700 text-xs">✅ 支持它的证据：{cp.confirmingEvidence || "—"}</p>
                  <p className="text-rose-700 text-xs">❌ 推翻它的证据：{cp.disconfirmingEvidence || "—"}</p>
                </div>
              ))}
              {detail === "brief" && checkpoints.length > 1 && (
                <p className="text-xs text-stone-400">其余 {checkpoints.length - 1} 条在「完整推演」里。</p>
              )}
            </div>
          </section>

          <section className="panel p-5 space-y-3">
            <h2 className="serif text-[15px] font-semibold text-ink">
              ⑤ 收束成一句能行动的判断
            </h2>
            <p className="text-xs text-stone-400">
              综合结论：每句话都标了「成色」——是事实、是推断、还是假设，一眼能看出来。
            </p>
            <LayerLegend />
            <TaggedList items={record.conclusion} />
          </section>

          <ActionCard minimalAction={record.minimalAction} />

          {detail === "full" && (
            <div className="space-y-4">
              <div className="panel p-5 space-y-2">
                <h2 className="serif text-[15px] font-semibold text-ink">推演关系图</h2>
                <p className="text-xs text-stone-400">
                  把这次推演的骨架画出来：实线是推演流，琥珀虚线是两个角度在打架。
                </p>
                <DecisionGraph record={record} />
              </div>
              <ModelCompareTable record={record} />
              <TracePanel steps={record.steps} />
            </div>
          )}

          <div className="panel p-5 space-y-3">
            <h2 className="serif text-[15px] font-semibold text-ink">📒 存进认知账本</h2>
            <p className="text-xs text-stone-400">
              存的是「判断过程」（问题、事实、假设、证据、冲突、预测、停止条件），不是聊天记录。之后可以回填结果，看哪个假设被推翻。
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={save}
                disabled={saving || !!savedId}
                className="px-4 py-2 rounded-full bg-brand text-white text-sm disabled:opacity-50 hover:bg-[#3b58f0]"
              >
                {saving ? "保存中…" : savedId ? "已保存" : "保存到认知账本"}
              </button>
              {savedMsg && <span className="text-xs text-emerald-700">{savedMsg}</span>}
              {savedId && (
                <Link
                  href={`/ledger/${savedId}`}
                  className="text-sm text-brand underline hover:text-brand"
                >
                  打开账本详情 →
                </Link>
              )}
            </div>
            <div className="border-t border-line pt-3 space-y-2">
              <p className="text-xs text-stone-400">
                追问（会自动带上这一轮的回答，不会把上文弄丢）
              </p>
              <div className="flex gap-2">
                <input
                  value={followUpQ}
                  onChange={(e) => setFollowUpQ(e.target.value)}
                  placeholder="例如：如果三个月后留存还在下滑，我该怎么办？"
                  className="flex-1 px-3 py-2 text-sm border border-line rounded-xl bg-white/90 text-ink focus:outline-none focus:ring-2 focus:ring-stone-300/60"
                />
                <button
                  type="button"
                  disabled={phase === "running" || !followUpQ.trim()}
                  onClick={() => run(followUpQ, true)}
                  className="px-4 py-2 rounded-full border border-line bg-white/70 text-stone-700 text-sm disabled:opacity-50 hover:border-stone-300"
                >
                  追问
                </button>
              </div>
            </div>
          </div>

          {/* 旁参：小单元，默认折叠，不参与判断 */}
          <SideOracle question={record.question} />
        </div>
      )}
    </div>
  );
}
