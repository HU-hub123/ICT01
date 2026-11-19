"use client";

import { useState } from "react";
import type { AnalysisRecord } from "@/lib/types";
import { toMarkdown } from "./ExportButtons";

/** 账本全量导出：JSON（完整留档）与 Markdown（复盘文档合集） */
export function ExportAllButton() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function exportAll(kind: "json" | "md") {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/ledger");
      const j = await res.json().catch(() => null);
      const items: AnalysisRecord[] = j?.items ?? [];
      if (items.length === 0) {
        setMsg("账本为空");
        return;
      }
      let content: string;
      let name: string;
      let mime: string;
      if (kind === "json") {
        content = JSON.stringify(items, null, 2);
        name = `认知账本全部-${items.length}条.json`;
        mime = "application/json;charset=utf-8";
      } else {
        content = items.map((r) => toMarkdown(r)).join("\n\n---\n\n");
        name = `认知账本全部-${items.length}条.md`;
        mime = "text/markdown;charset=utf-8";
      }
      const blob = new Blob([content], { type: mime });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      setMsg(`已导出 ${name}`);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        disabled={busy}
        onClick={() => exportAll("json")}
        className="px-3 py-1.5 rounded-lg border border-line text-stone-700 text-xs hover:bg-stone-50 disabled:opacity-50"
      >
        导出全部 JSON
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => exportAll("md")}
        className="px-3 py-1.5 rounded-lg border border-line text-stone-700 text-xs hover:bg-stone-50 disabled:opacity-50"
      >
        导出全部 Markdown
      </button>
      {msg && <span className="text-xs text-emerald-700">{msg}</span>}
    </div>
  );
}
