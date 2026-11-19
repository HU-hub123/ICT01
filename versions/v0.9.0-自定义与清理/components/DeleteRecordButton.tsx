"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** 删除一笔认知账本（带二次确认） */
export function DeleteRecordButton({
  id,
  label = "删除",
  className,
}: {
  id: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function del(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    if (!window.confirm("删除这笔判断？账本记录不可恢复。")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/ledger/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        alert(j?.error ?? `删除失败（HTTP ${res.status}）`);
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
      onClick={del}
      disabled={busy}
      className={
        className ??
        "text-xs px-2.5 py-1 rounded-full border border-line text-stone-400 hover:text-rose-600 hover:border-rose-200 disabled:opacity-40"
      }
    >
      {busy ? "删除中…" : label}
    </button>
  );
}
