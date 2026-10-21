"use client";

import { useState } from "react";
import Link from "next/link";
import type { AnalysisRecord, HistoryTurn, PipelineStep } from "@/lib/types";
import { MODEL_MAP } from "@/lib/models-data";
import { LayerLegend, LayerBadge } from "./LayerBadge";
import { TaggedList } from "./TaggedList";
import { ArgumentCard } from "./ArgumentCard";
import { TensionSection } from "./TensionSection";
import { ActionCard } from "./ActionCard";
import { TracePanel } from "./TracePanel";

const DEMO_QUESTIONS = [
  "一个已经投入 18 个月的产品，留存不温不火，到底该不该继续？",
  "两份 offer 都不错：一份钱多但成长慢，一份钱少但成长快，怎么选？",
  "我想从零开始做一个 AI 学习类产品，值得做吗？",
];

type Phase = "idle" | "running" | "done" | "error";

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
    setStatus("推演开始：事实收口");
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
          else if (ev.type === "step" && ev.step) setSteps((p) => [...p, ev.step]);
          else if (ev.type === "record" && ev.record) {
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
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }

  async function save() {
    if (!record || saving) return;
    setSaving(true);
    setSavedMsg("");
    try {
      const toSave: AnalysisRecord =
        isFollowUp && parentSavedId
          ? { ...record, followUpOf: parentSavedId }
          : record;
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

  return (
    <div className="space-y-4">
      {/* 输入区 */}
      <div className="panel p-4 space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">你的问题（一个需要判断的问题）</span>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            placeholder="例如：一个已经投入 18 个月的产品，留存不温不火，到底该不该继续？"
            className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">补充已确认的事实（可选；不填则系统会显式列出缺失信息，而不是替你猜）</span>
          <input
            value={extraFacts}
            onChange={(e) => setExtraFacts(e.target.value)}
            placeholder="例如：B 端产品，客单价 3 万/年，目前月留存约 60%……"
            className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={phase === "running"}
            onClick={() => run(question, false)}
            className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm disabled:opacity-50 hover:bg-zinc-700"
          >
            {phase === "running" ? "推演中…" : "开始推演"}
          </button>
          <span className="text-xs text-zinc-400">示例：</span>
          {DEMO_QUESTIONS.map((d) => (
            <button
              key={d}
              type="button"
              disabled={phase === "running"}
              onClick={() => setQuestion(d)}
              className="text-xs px-2 py-1 rounded border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
            >
              {d.slice(0, 18)}…
            </button>
          ))}
        </div>
      </div>

      {/* 运行中：阶段进度 */}
      {phase === "running" && (
        <div className="panel p-4 space-y-2">
          <p className="text-sm text-zinc-700 flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-zinc-300 border-t-zinc-900 animate-spin" />
            {status}
          </p>
          <ol className="space-y-1">
            {steps.map((s) => (
              <li key={s.key} className="text-xs text-zinc-500 flex gap-2">
                <span className="text-emerald-600">✓</span>
                {s.title}（{(s.durationMs / 1000).toFixed(1)}s）
              </li>
            ))}
          </ol>
          <p className="text-xs text-zinc-400">
            固定五阶段顺序执行（每阶段最多两次模型调用），不存在循环推理；任何一步失败都会明确报错，不伪造输出。
          </p>
        </div>
      )}

      {/* 错误 */}
      {phase === "error" && (
        <div className="panel p-4 border-rose-200 bg-rose-50/60 space-y-2">
          <p className="text-sm font-medium text-rose-700">推演失败（已如实报错，未伪造任何结果）</p>
          <p className="text-sm text-rose-600 break-all">{error}</p>
          <button
            type="button"
            onClick={() => run(question, false)}
            className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 text-sm hover:bg-rose-100"
          >
            重试
          </button>
        </div>
      )}

      {/* 追问链 */}
      {chain.length > 0 && (
        <div className="panel p-4 space-y-2">
          <p className="text-sm font-medium text-zinc-700">追问链（每一轮都携带上一轮系统自己的回答，不会丢失上文）</p>
          {chain.map((r) => (
            <p key={r.id} className="text-xs text-zinc-500">
              · {r.question.slice(0, 50)}…（已纳入本轮上下文）
            </p>
          ))}
        </div>
      )}

      {/* 结果 */}
      {record && (
        <div className="space-y-4">
          <div className="panel p-4 space-y-3">
            <h2 className="font-semibold text-zinc-900">① 事实收口：先分清"知道的"和"不知道的"</h2>
            <p className="text-sm text-zinc-800">
              <b>核心判断点：</b>
              {record.factsRecap.coreJudgment}
            </p>
            <div>
              <h3 className="text-sm font-medium text-emerald-700 mb-1">已确认事实（只来自你提供的信息）</h3>
              {record.factsRecap.confirmedFacts.length ? (
                <ul className="space-y-1">
                  {record.factsRecap.confirmedFacts.map((f, i) => (
                    <li key={i} className="flex gap-2 items-start text-sm text-zinc-800">
                      <span className="mt-0.5 shrink-0"><LayerBadge layer="fact" /></span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-400">
                  （你没有提供额外事实，以下推演全部建立在假设与推断之上，已在文中逐句标注）
                </p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-rose-700 mb-1">缺失信息（会影响结论，但尚未提供）</h3>
              {record.factsRecap.missingInfo.length ? (
                <ul className="space-y-1">
                  {record.factsRecap.missingInfo.map((f, i) => (
                    <li key={i} className="flex gap-2 items-start text-sm text-zinc-800">
                      <span className="mt-0.5 shrink-0"><LayerBadge layer="missing" /></span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-400">（未识别到关键缺失信息）</p>
              )}
            </div>
          </div>

          <div className="panel p-4 space-y-2">
            <h2 className="font-semibold text-zinc-900">② 模型对阵：为什么是这几个模型（含检索与选择理由）</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {record.selections.map((sel) => {
                const m = MODEL_MAP[sel.modelId];
                if (!m) return null;
                const inTension = m.tensionWith.some((tid) =>
                  record.selections.some((s2) => s2.modelId === tid),
                );
                return (
                  <div key={sel.modelId} className="border border-zinc-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{m.name}</span>
                      <span className="text-xs text-zinc-400">{m.nameEn}</span>
                      {inTension && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          ⚔️ 张力
                        </span>
                      )}
                      {sel.source === "library_tension" && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">
                          库内兜底
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 leading-5">选择理由：{sel.reason}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold text-zinc-900">③ 各模型独立推演（先打架，不合谋）</h2>
            {record.arguments.map((a) => (
              <ArgumentCard key={a.modelId} arg={a} />
            ))}
          </div>

          <TensionSection
            conflicts={record.conflicts}
            agreementNote={record.agreementNote}
            checkpoints={record.checkpoints}
          />

          <div className="panel p-4 space-y-3">
            <h2 className="font-semibold text-zinc-900">⑤ 综合结论（每句话都标了成色）</h2>
            <LayerLegend />
            <TaggedList items={record.conclusion} />
          </div>

          <ActionCard minimalAction={record.minimalAction} />

          <TracePanel steps={record.steps} />

          <div className="panel p-4 space-y-3">
            <h2 className="font-semibold text-zinc-900">📒 存入认知账本</h2>
            <p className="text-xs text-zinc-500">
              保存的是"判断过程"（问题、事实、假设、证据、冲突、预测、停止条件），不是聊天记录。之后可回来填写实际结果，复盘哪个假设被推翻。
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={save}
                disabled={saving || !!savedId}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-50 hover:bg-emerald-500"
              >
                {saving ? "保存中…" : savedId ? "已保存" : "保存到认知账本"}
              </button>
              {savedMsg && <span className="text-xs text-emerald-700">{savedMsg}</span>}
              {savedId && (
                <Link
                  href={`/ledger/${savedId}`}
                  className="text-sm text-sky-600 underline hover:text-sky-700"
                >
                  打开账本详情 →
                </Link>
              )}
            </div>
            <div className="border-t border-zinc-100 pt-3 space-y-2">
              <p className="text-xs text-zinc-500">
                追问（将自动携带本轮系统自己的回答摘要与全部历史，修复"追问丢上文"问题）
              </p>
              <div className="flex gap-2">
                <input
                  value={followUpQ}
                  onChange={(e) => setFollowUpQ(e.target.value)}
                  placeholder="例如：那如果三个月后留存还在下滑，我该怎么办？"
                  className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
                />
                <button
                  type="button"
                  disabled={phase === "running" || !followUpQ.trim()}
                  onClick={() => run(followUpQ, true)}
                  className="px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 text-sm disabled:opacity-50 hover:bg-zinc-50"
                >
                  追问
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
