"use client";

import { useEffect, useState } from "react";
import type { SavedModel } from "@/lib/client-models";
import { newModelId } from "@/lib/client-models";

const PRESETS: { label: string; baseUrl: string; model: string }[] = [
  { label: "DeepSeek", baseUrl: "https://api.deepseek.com", model: "deepseek-chat" },
  { label: "华为云 MaaS", baseUrl: "", model: "" },
  { label: "Ollama（本机）", baseUrl: "http://localhost:11434/v1", model: "llama3.1" },
  { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "deepseek/deepseek-chat" },
];

/** 「我的模型」设置：浏览器本地保存；支持多个、可测试连通性 */
export function ModelSettings({
  open,
  onClose,
  models,
  activeId,
  onChange,
  onActiveChange,
}: {
  open: boolean;
  onClose: () => void;
  models: SavedModel[];
  activeId: string | null;
  onChange: (list: SavedModel[]) => void;
  onActiveChange: (id: string | null) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setEditingId(null);
      setLabel("");
      setBaseUrl("");
      setApiKey("");
      setModel("");
      setTestMsg("");
      setErr("");
    }
  }, [open]);

  if (!open) return null;

  function applyPreset(p: (typeof PRESETS)[number]) {
    setBaseUrl(p.baseUrl);
    setModel(p.model);
    setLabel(p.label);
    if (!p.baseUrl) setTestMsg("请把控制台里的调用地址（以 /v1 结尾）和模型名填进来。");
    else setTestMsg("");
  }

  function edit(m: SavedModel) {
    setEditingId(m.id);
    setLabel(m.label);
    setBaseUrl(m.baseUrl);
    setApiKey(m.apiKey);
    setModel(m.model);
    setTestMsg("");
    setErr("");
  }

  async function test() {
    setErr("");
    setTestMsg("");
    if (!baseUrl.trim() || !apiKey.trim() || !model.trim()) {
      setErr("先填完地址、Key 和模型名再测试。");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/llm/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl, apiKey, model }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) setErr(j?.error ?? `测试失败（HTTP ${res.status}）`);
      else setTestMsg(j?.message ?? (j?.ok ? "连接成功" : "连接失败"));
    } catch (e) {
      setErr(String(e));
    } finally {
      setTesting(false);
    }
  }

  function save() {
    setErr("");
    if (!baseUrl.trim() || !apiKey.trim() || !model.trim()) {
      setErr("地址、API Key、模型名都要填。");
      return;
    }
    if (!/^https?:\/\//i.test(baseUrl.trim())) {
      setErr("地址要以 http:// 或 https:// 开头。");
      return;
    }
    const item: SavedModel = {
      id: editingId ?? newModelId(),
      label: label.trim() || model.trim(),
      baseUrl: baseUrl.trim().replace(/\/+$/, ""),
      apiKey: apiKey.trim(),
      model: model.trim(),
    };
    const next = editingId
      ? models.map((m) => (m.id === editingId ? item : m))
      : [...models, item];
    onChange(next);
    if (!activeId) onActiveChange(item.id);
    setEditingId(null);
    setLabel("");
    setBaseUrl("");
    setApiKey("");
    setModel("");
    setTestMsg("已保存。");
  }

  function remove(id: string) {
    if (!window.confirm("删除这个模型配置？（不影响已保存的判断）")) return;
    onChange(models.filter((m) => m.id !== id));
    if (activeId === id) onActiveChange(null);
    if (editingId === id) setEditingId(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="模型设置"
    >
      <div
        className="bg-white rounded-2xl border border-line shadow-2xl w-full max-w-2xl max-h-[86vh] overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="serif text-lg font-semibold text-ink">我的模型</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-2.5 py-1 rounded-full border border-line text-stone-500 hover:bg-stone-50"
          >
            关闭
          </button>
        </div>

        <p className="text-xs text-stone-500 leading-5">
          填你自己的模型（任何 OpenAI 兼容接口都行）。Key 只保存在这台设备的浏览器里，只随请求临时使用，服务器不保存、不写日志。
        </p>

        {models.length > 0 && (
          <div className="space-y-2">
            {models.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 border border-line rounded-xl px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink truncate">
                    {m.label}
                    {activeId === m.id && (
                      <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-brand-soft text-brand">
                        使用中
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-stone-400 truncate">
                    {m.baseUrl} · {m.model}
                  </p>
                </div>
                {activeId !== m.id && (
                  <button
                    type="button"
                    onClick={() => onActiveChange(m.id)}
                    className="text-xs px-2 py-1 rounded-full border border-line text-stone-600 hover:border-stone-300"
                  >
                    使用
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => edit(m)}
                  className="text-xs px-2 py-1 rounded-full border border-line text-stone-600 hover:border-stone-300"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => remove(m.id)}
                  className="text-xs px-2 py-1 rounded-full border border-line text-stone-400 hover:text-rose-600 hover:border-rose-200"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-line pt-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-stone-400">快速填充：</span>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-xs px-2.5 py-1 rounded-full border border-line bg-white/70 text-stone-600 hover:border-stone-300"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-stone-600">给它起个名字</span>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="例如：我的 DeepSeek"
                className="mt-1 w-full px-3 py-2 text-sm border border-line rounded-xl bg-white"
              />
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">模型名</span>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="例如：deepseek-chat"
                className="mt-1 w-full px-3 py-2 text-sm border border-line rounded-xl bg-white"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-stone-600">接口地址（OpenAI 兼容，通常以 /v1 结尾）</span>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.deepseek.com"
              className="mt-1 w-full px-3 py-2 text-sm border border-line rounded-xl bg-white"
            />
          </label>
          <label className="block text-sm">
            <span className="text-stone-600">API Key</span>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type="password"
              placeholder="sk-…"
              className="mt-1 w-full px-3 py-2 text-sm border border-line rounded-xl bg-white"
            />
          </label>

          {err && <p className="text-xs text-rose-600">{err}</p>}
          {testMsg && <p className="text-xs text-emerald-700">{testMsg}</p>}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={test}
              disabled={testing}
              className="px-3.5 py-1.5 rounded-full border border-line text-stone-700 text-xs hover:border-stone-300 disabled:opacity-50"
            >
              {testing ? "测试中…" : "测试连接"}
            </button>
            <button
              type="button"
              onClick={save}
              className="btn-brand px-4 py-1.5 text-xs"
            >
              {editingId ? "保存修改" : "添加模型"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
