"use client";

import { useState } from "react";
import type { AnalysisRecord } from "@/lib/types";

/** 账本导出：JSON（完整留档）与 Markdown（可阅读的复盘文档） */
export function ExportButtons({ record }: { record: AnalysisRecord }) {
  const [msg, setMsg] = useState("");
  function download(name: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    setMsg(`已导出 ${name}`);
  }
  const base = `认知账本-${record.id.slice(0, 8)}`;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => download(`${base}.json`, JSON.stringify(record, null, 2), "application/json;charset=utf-8")}
        className="px-3 py-1.5 rounded-lg border border-line text-stone-700 text-xs hover:bg-stone-50"
      >
        导出 JSON（完整留档）
      </button>
      <button
        type="button"
        onClick={() => download(`${base}.md`, toMarkdown(record), "text/markdown;charset=utf-8")}
        className="px-3 py-1.5 rounded-lg border border-line text-stone-700 text-xs hover:bg-stone-50"
      >
        导出 Markdown（复盘文档）
      </button>
      {msg && <span className="text-xs text-emerald-700">{msg}</span>}
    </div>
  );
}

export function toMarkdown(r: AnalysisRecord): string {
  const lines: string[] = [];
  lines.push(`# 认知账本：${r.question}`, "");
  lines.push(`- 时间：${new Date(r.createdAt).toLocaleString("zh-CN")}`);
  lines.push(`- 状态：${r.status === "reviewed" ? "已复盘" : "待复盘"}`);
  lines.push("", "## ① 事实收口", "");
  lines.push(`核心判断点：${r.factsRecap.coreJudgment}`, "");
  lines.push(`已确认事实：`);
  for (const f of r.factsRecap.confirmedFacts) lines.push(`- ${f}`);
  lines.push("", `缺失信息：`);
  for (const f of r.factsRecap.missingInfo) lines.push(`- ${f}`);
  lines.push("", "## ② 模型对阵", "");
  for (const s of r.selections) lines.push(`- ${s.modelId}（${s.source === "llm" ? "模型选择" : "库内张力兜底"}）：${s.reason}`);
  lines.push("", "## ③ 各模型独立推演", "");
  for (const a of r.arguments) {
    lines.push(`### ${a.modelId}`, "");
    for (const c of a.conclusion) lines.push(`- [${c.layer}] ${c.text}`);
    lines.push("", `- 成立条件：${a.appliesWhen}`, `- 失效边界：${a.failsWhen}`, "");
  }
  lines.push("## ④ 交叉推演", "");
  for (const c of r.conflicts) lines.push(`- 冲突（${c.between.join(" × ")}）：${c.statement}`, `  - 各自成立条件：${c.resolutionCondition}`);
  if (r.agreementNote) lines.push(`- 一致说明：${r.agreementNote}`);
  for (const cp of r.checkpoints) {
    lines.push(`- 检查点：${cp.hypothesis}`, `  - 支持证据：${cp.confirmingEvidence}`, `  - 推翻证据：${cp.disconfirmingEvidence}`);
  }
  lines.push("", "## ⑤ 综合结论（五层标注）", "");
  for (const c of r.conclusion) lines.push(`- [${c.layer}] ${c.text}`);
  lines.push("", "## 🎯 最小行动", "");
  lines.push(`- 动作：${r.minimalAction.action}`, `- 停止条件：${r.minimalAction.stopCondition}`, `- 观察窗口：${r.minimalAction.observationWindow}`);
  if (r.review) {
    lines.push("", "## 复盘", "");
    lines.push(`- 实际结果：${r.review.actualOutcome}`);
    lines.push(`- 被推翻的假设：${r.review.overturnedAssumptions.join("；") || "（无）"}`);
    lines.push(`- 被确认的假设：${r.review.confirmedAssumptions.join("；") || "（无）"}`);
    if (r.review.lesson) lines.push(`- 教训：${r.review.lesson}`);
  }
  lines.push("", "---", "", "由「认知脚手架 · 可溯源思考工作台」生成：保存结论，也保存得到结论的过程。");
  return lines.join("\n");
}
