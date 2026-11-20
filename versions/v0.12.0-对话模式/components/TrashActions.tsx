"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** 回收站操作：恢复 / 彻底删除 / 清空 */
export function TrashActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "restore" | "purge">("");

  async function restore() {
    setBusy("restore");
    try {
      const res = await fetch("/api/ledger/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        alert(j?.error ?? `恢复失败（HTTP ${res.status}）`);
        return;
      }
      router.refresh();
    } finally {
      setBusy("");
    }
  }

  async function purge() {
    if (!window.confirm("彻底删除这一条？不可恢复。")) return;
    setBusy("purge");
    try {
      const res = await fetch("/api/ledger/trash", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        alert(j?.error ?? `删除失败（HTTP ${res.status}）`);
        return;
      }
      router.refresh();
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={restore}
        disabled={busy !== ""}
        className="text-xs px-2.5 py-1 rounded-full border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
      >
        {busy === "restore" ? "恢复中…" : "恢复"}
      </button>
      <button
        type="button"
        onClick={purge}
        disabled={busy !== ""}
        className="text-xs px-2.5 py-1 rounded-full border border-line text-stone-400 hover:text-rose-600 hover:border-rose-200 disabled:opacity-40"
      >
        {busy === "purge" ? "删除中…" : "彻底删除"}
      </button>
    </div>
  );
}

/** 清空回收站 */
export function ClearTrashButton({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function clear() {
    if (!window.confirm(`彻底删除回收站里的 ${count} 条记录？不可恢复。`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ledger/trash", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        alert(j?.error ?? `清空失败（HTTP ${res.status}）`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={clear}
      disabled={busy}
      className="text-xs px-3 py-1.5 rounded-full border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-40"
    >
      {busy ? "清空中…" : "清空回收站"}
    </button>
  );
}
