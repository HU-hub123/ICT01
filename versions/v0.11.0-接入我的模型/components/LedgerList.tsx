"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AnalysisRecord } from "@/lib/types";
import { DeleteRecordButton } from "./DeleteRecordButton";

/** 账本列表：支持勾选批量删除与一键清空 */
export function LedgerList({ items }: { items: AnalysisRecord[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"" | "bulk" | "all">("");

  const allSelected = items.length > 0 && selected.size === items.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  }

  async function bulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!window.confirm(`将选中的 ${ids.length} 条移到回收站？7 天内可恢复。`)) return;
    setBusy("bulk");
    try {
      const res = await fetch("/api/ledger", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        alert(j?.error ?? `删除失败（HTTP ${res.status}）`);
        return;
      }
      setSelected(new Set());
      router.refresh();
    } finally {
      setBusy("");
    }
  }

  async function clearAll() {
    if (items.length === 0) return;
    if (!window.confirm(`将全部 ${items.length} 条移到回收站？7 天内可恢复。`)) return;
    setBusy("all");
    try {
      const res = await fetch("/api/ledger", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        alert(j?.error ?? `清空失败（HTTP ${res.status}）`);
        return;
      }
      setSelected(new Set());
      router.refresh();
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="flex items-center gap-2 text-xs text-stone-500 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="size-4 accent-brand"
          />
          全选（{items.length} 条）
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={bulkDelete}
            disabled={selected.size === 0 || busy !== ""}
            className="text-xs px-3 py-1.5 rounded-full border border-line text-stone-600 hover:border-rose-200 hover:text-rose-600 disabled:opacity-40"
          >
            {busy === "bulk" ? "删除中…" : `删除选中${selected.size > 0 ? `（${selected.size}）` : ""}`}
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={busy !== ""}
            className="text-xs px-3 py-1.5 rounded-full border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-40"
          >
            {busy === "all" ? "处理中…" : "全部删除"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((r) => {
          const firstInference = (r.conclusion || []).find((s) => s.layer === "inference");
          const summary = firstInference?.text || r.conclusion?.[0]?.text || "";
          return (
            <div key={r.id} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={selected.has(r.id)}
                onChange={() => toggle(r.id)}
                aria-label={`选择：${r.question}`}
                className="mt-6 size-4 accent-brand shrink-0"
              />
              <Link
                href={`/ledger/${r.id}`}
                className="panel p-5 flex-1 min-w-0 block hover:border-brand/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-[16px] font-medium leading-6 text-ink">{r.question}</p>
                    {summary && (
                      <p className="text-sm text-stone-500 leading-6 line-clamp-2">{summary}</p>
                    )}
                    <p className="text-xs text-stone-400">
                      {new Date(r.createdAt).toLocaleDateString("zh-CN")}
                      {r.followUpOf ? " · 追问" : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs px-2.5 py-1 rounded-full ${
                      r.status === "reviewed"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {r.status === "reviewed" ? "已复盘" : "待复盘"}
                  </span>
                </div>
              </Link>
              <div className="pt-5">
                <DeleteRecordButton id={r.id} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
