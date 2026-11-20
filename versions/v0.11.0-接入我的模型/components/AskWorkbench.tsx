"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AnalysisRecord, HistoryTurn, PipelineStep } from "@/lib/types";
import {
  loadActiveId,
  loadModels,
  persistActiveId,
  persistModels,
  type SavedModel,
} from "@/lib/client-models";
import { ModelSettings } from "./ModelSettings";
import { ResultModules } from "./ResultModules";
import { SideOracle } from "./SideOracle";

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
  const [models, setModels] = useState<SavedModel[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setModels(loadModels());
    setActiveId(loadActiveId());
  }, []);

  function changeModels(list: SavedModel[]) {
    setModels(list);
    persistModels(list);
  }

  function changeActive(id: string | null) {
    setActiveId(id);
    persistActiveId(id);
  }

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
    setStatus("正在理清…");
    const controller = new AbortController();
    abortRef.current = controller;
    const active = models.find((m) => m.id === activeId);
    let rec: AnalysisRecord | null = null;
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          extraFacts: followUp ? undefined : extraFacts.trim() || undefined,
          history: followUp ? history : [],
          llm: active
            ? { baseUrl: active.baseUrl, apiKey: active.apiKey, model: active.model }
            : undefined,
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
        setError("已取消（这次模型调用已中止）");
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

  return (
    <div className="space-y-4">
      {/* 模型选择 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="flex items-center gap-2 text-xs text-stone-500">
          用哪个模型来想
          <select
            value={activeId ?? ""}
            onChange={(e) => changeActive(e.target.value || null)}
            className="px-2.5 py-1.5 text-xs border border-line rounded-xl bg-white text-ink"
          >
            <option value="">默认（服务端配置）</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="text-xs px-3 py-1.5 rounded-full border border-line text-stone-600 hover:border-stone-300"
        >
          接入我的模型
        </button>
      </div>

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
            className="mt-1 w-full px-3 py-2.5 text-sm border border-line rounded-xl bg-white/90 text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
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
            className="mt-1 w-full px-3 py-2.5 text-sm border border-line rounded-xl bg-white/90 text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={phase === "running"}
            onClick={() => run(question, false)}
            className="btn-brand px-4 py-2 text-sm disabled:opacity-50"
          >
            {phase === "running" ? "正在理清…" : "帮我理一理"}
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
            <span className="inline-block w-3 h-3 rounded-full border-2 border-stone-300 border-t-brand animate-spin" />
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
        </div>
      )}

      {/* 错误 */}
      {phase === "error" && (
        <div className="panel p-5 border-rose-200 bg-rose-50/50 space-y-2">
          <p className="text-sm font-medium text-rose-700">这次没跑通（如实报错，没有编造结果）</p>
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

      {/* 结果：模块卡片 + 浮窗 */}
      {record && (
        <div className="space-y-4">
          <ResultModules record={record} />

          <div className="panel p-5 space-y-3">
            <h2 className="serif text-[15px] font-semibold text-ink">存进认知账本</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={save}
                disabled={saving || !!savedId}
                className="px-4 py-2 rounded-full bg-emerald-700 text-white text-sm disabled:opacity-50 hover:bg-emerald-600"
              >
                {saving ? "保存中…" : savedId ? "已保存" : "保存到认知账本"}
              </button>
              {savedMsg && <span className="text-xs text-emerald-700">{savedMsg}</span>}
              {savedId && (
                <Link
                  href={`/ledger/${savedId}`}
                  className="text-sm text-brand underline hover:text-brand-strong"
                >
                  打开账本详情 →
                </Link>
              )}
            </div>
            <div className="border-t border-line pt-3 space-y-2">
              <p className="text-xs text-stone-400">追问（会自动带上这一轮的回答）</p>
              <div className="flex gap-2">
                <input
                  value={followUpQ}
                  onChange={(e) => setFollowUpQ(e.target.value)}
                  placeholder="例如：如果三个月后留存还在下滑，我该怎么办？"
                  className="flex-1 px-3 py-2 text-sm border border-line rounded-xl bg-white/90 text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
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

          <SideOracle question={record.question} />
        </div>
      )}

      <ModelSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        models={models}
        activeId={activeId}
        onChange={changeModels}
        onActiveChange={changeActive}
      />
    </div>
  );
}
