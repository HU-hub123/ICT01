"use client";

import { useState } from "react";
import type { PipelineStep } from "@/lib/types";

/**
 * 溯源回放面板：展示"AI 是怎么一步步得出这个答案的"。
 * 每一步都留档了输入摘要与原始结构化输出 —— 防黑盒的核心界面。
 */
export function TracePanel({ steps }: { steps: PipelineStep[] }) {
  const [open, setOpen] = useState(false);
  if (!steps.length) return null;
  return (
    <div className="panel p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left flex items-center justify-between text-sm font-semibold text-zinc-900"
      >
        <span>
          🔍 溯源回放：AI 是怎么一步步得出这个答案的（{steps.length} 个阶段全部留档）
        </span>
        <span className="text-zinc-400 font-normal">{open ? "收起 ▲" : "展开 ▼"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {steps.map((s) => (
            <div key={s.key} className="border border-zinc-200 rounded-lg overflow-hidden">
              <div className="bg-zinc-50 px-3 py-2 flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-800">{s.title}</span>
                <span className="text-zinc-400">
                  {s.status === "error" ? "失败" : `${(s.durationMs / 1000).toFixed(1)}s`}
                </span>
              </div>
              <div className="px-3 py-2 text-xs text-zinc-500 border-b border-zinc-100">
                输入摘要：{s.inputSummary}
              </div>
              <pre className="px-3 py-2 text-xs whitespace-pre-wrap break-all max-h-64 overflow-auto text-zinc-700 bg-white">
                {JSON.stringify(s.output, null, 2)}
              </pre>
              {s.error && (
                <div className="px-3 py-2 text-xs text-rose-600 bg-rose-50">
                  错误：{s.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
