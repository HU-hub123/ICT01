"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AnalysisRecord, PipelineStep } from "@/lib/types";
import type { ChatArchive, ChatTurn } from "@/lib/chat";
import { MODEL_MAP } from "@/lib/models-data";
import { getPlain } from "@/lib/plain-explain";
import {
  loadActiveId,
  loadModels,
  persistActiveId,
  persistModels,
  type SavedModel,
} from "@/lib/client-models";
import { ResultModules } from "./ResultModules";
import { ModelSettings } from "./ModelSettings";

type Msg = ChatTurn & { hint?: boolean };

function toArchive(rec: AnalysisRecord): ChatArchive {
  return {
    question: rec.question,
    facts: rec.factsRecap.confirmedFacts,
    missing: rec.factsRecap.missingInfo,
    angles: rec.selections.map((s) => {
      const m = s.model ?? MODEL_MAP[s.modelId];
      return { plain: s.model?.plain || getPlain(s.modelId), name: m?.name ?? s.modelId };
    }),
    conflicts: rec.conflicts.map((c) => c.statement),
    conclusion: rec.conclusion.map((c) => c.text),
    action: rec.minimalAction.action,
    stopCondition: rec.minimalAction.stopCondition,
  };
}

/** 对话模式：先给一份完整判断，然后基于它自然对话 */
export function ChatWorkbench() {
  const [models, setModels] = useState<SavedModel[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [record, setRecord] = useState<AnalysisRecord | null>(null);
  const [showFull, setShowFull] = useState(false);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setModels(loadModels());
    setActiveId(loadActiveId());
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const active = models.find((m) => m.id === activeId);
  const llm = active
    ? { baseUrl: active.baseUrl, apiKey: active.apiKey, model: active.model }
    : undefined;

  function changeModels(list: SavedModel[]) {
    setModels(list);
    persistModels(list);
  }
  function changeActive(id: string | null) {
    setActiveId(id);
    persistActiveId(id);
  }

  async function runAnalysis(
    question: string,
    extraFacts: string | undefined,
    onStatus: (s: string) => void,
  ): Promise<AnalysisRecord> {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, extraFacts, history: [], llm }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.error ?? `请求失败（HTTP ${res.status}）`);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error("响应没有内容");
    const dec = new TextDecoder();
    let buf = "";
    let rec: AnalysisRecord | null = null;
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
        if (ev.type === "status") onStatus(String(ev.message ?? ""));
        else if (ev.type === "record" && ev.record) rec = ev.record;
        else if (ev.type === "error") throw new Error(String(ev.message ?? "分析失败"));
      }
    }
    if (!rec) throw new Error("没有得到结果，请重试");
    return rec;
  }

  async function chatReply(
    rec: AnalysisRecord,
    history: Msg[],
    userMessage: string,
    flags: { justAnalyzed?: boolean; justReanalyzed?: boolean },
  ): Promise<{ reply: string; needsReanalysis: boolean }> {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: history.map((m) => ({ role: m.role, content: m.content })),
        archive: toArchive(rec),
        userMessage,
        justAnalyzed: flags.justAnalyzed === true,
        justReanalyzed: flags.justReanalyzed === true,
        llm,
      }),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok) throw new Error(j?.error ?? `回复失败（HTTP ${res.status}）`);
    return { reply: String(j?.reply ?? ""), needsReanalysis: j?.needsReanalysis === true };
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setError("");
    setBusy(true);
    const history = [...messages, { role: "user" as const, content: text }];
    setMessages(history);
    try {
      let rec = record;
      let justAnalyzed = false;
      setStatus("正在整理你的问题…");
      if (!rec) {
        rec = await runAnalysis(text, undefined, setStatus);
        setRecord(rec);
        justAnalyzed = true;
      }
      const reply = await chatReply(rec, history, text, { justAnalyzed });
      setMessages((m) => [
        ...m,
        { role: "assistant", content: reply.reply, hint: reply.needsReanalysis },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  async function reanalyze() {
    if (!record || busy) return;
    setBusy(true);
    setError("");
    try {
      const extra = messages
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join("；")
        .slice(0, 900);
      setStatus("正在按新信息重算…");
      const rec = await runAnalysis(record.question, extra, setStatus);
      setRecord(rec);
      const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
      const reply = await chatReply(rec, messages, lastUser || "按新信息重新判断", {
        justReanalyzed: true,
      });
      setMessages((m) => [
        ...m,
        { role: "assistant", content: reply.reply, hint: reply.needsReanalysis },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  async function save() {
    if (!record || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record }),
      });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.record?.id) setSavedId(j.record.id);
      else setError(j?.error ?? "保存失败");
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
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

      <div className="panel p-5 space-y-4">
        {messages.length === 0 && (
          <div className="text-sm text-stone-500 leading-7">
            说说你在纠结什么。我会先给你一份完整判断（不是一段泛泛的回答），然后我们可以接着聊——
            补充新情况、追问细节，判断会跟着更新。
          </div>
        )}

        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-sm leading-6 text-white"
                    : "max-w-[85%] rounded-2xl rounded-bl-sm bg-stone-100 px-4 py-2.5 text-sm leading-6 text-ink"
                }
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.hint && (
                  <button
                    type="button"
                    onClick={reanalyze}
                    className="mt-2 text-xs px-2.5 py-1 rounded-full border border-amber-300 text-amber-800 bg-amber-50"
                  >
                    有新信息，按它重新判断 →
                  </button>
                )}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-stone-100 px-4 py-2.5 text-sm text-stone-500 flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full border-2 border-stone-300 border-t-brand animate-spin" />
                {status || "正在想…"}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
            {error}
          </div>
        )}

        {record && (
          <div className="border-t border-line pt-3 space-y-2">
            <p className="text-xs text-stone-400">当前这份判断</p>
            <p className="text-[15px] leading-6 text-ink">
              {record.factsRecap.coreJudgment}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowFull((v) => !v)}
                className="text-xs px-3 py-1.5 rounded-full border border-line text-stone-600 hover:border-stone-300"
              >
                {showFull ? "收起完整判断" : "展开完整判断"}
              </button>
              <button
                type="button"
                onClick={reanalyze}
                disabled={busy}
                className="text-xs px-3 py-1.5 rounded-full border border-line text-stone-600 hover:border-stone-300 disabled:opacity-50"
              >
                按新信息重算
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || !!savedId}
                className="text-xs px-3 py-1.5 rounded-full bg-emerald-700 text-white disabled:opacity-50"
              >
                {saving ? "保存中…" : savedId ? "已存进账本" : "存进认知账本"}
              </button>
              {savedId && (
                <Link href={`/ledger/${savedId}`} className="text-xs text-brand underline">
                  打开 →
                </Link>
              )}
            </div>
            {showFull && <ResultModules record={record} />}
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            disabled={busy}
            placeholder={record ? "接着说，或者补充一个新情况…" : "例如：我在纠结要不要放弃现在这个项目"}
            className="flex-1 px-3 py-2.5 text-sm border border-line rounded-xl bg-white/90 text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="button"
            onClick={send}
            disabled={busy || !input.trim()}
            className="btn-brand px-4 py-2 text-sm disabled:opacity-50"
          >
            发送
          </button>
        </div>
      </div>

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
