"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 复盘表单：把"实际结果"填回来，推翻或确认当初的假设。
 * 这是认知账本区别于聊天记录的最后一环：判断被现实检验。
 */
export function ReviewForm({ recordId }: { recordId: string }) {
  const router = useRouter();
  const [actualOutcome, setActualOutcome] = useState("");
  const [overturned, setOverturned] = useState("");
  const [confirmed, setConfirmed] = useState("");
  const [lesson, setLesson] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setErr("");
    const res = await fetch(`/api/ledger/${recordId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actualOutcome,
        overturnedAssumptions: overturned.split(/[\n,，]/).filter((s) => s.trim()),
        confirmedAssumptions: confirmed.split(/[\n,，]/).filter((s) => s.trim()),
        lesson,
      }),
    });
    if (res.ok) {
      setState("done");
      router.refresh();
    } else {
      const j = await res.json().catch(() => null);
      setErr(j?.error ?? "保存失败，请重试");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="panel p-4 text-sm text-emerald-700 border-emerald-200">
        ✅ 复盘已记录。半年后回看时，你会看到：当时为什么相信、哪个假设被现实推翻。
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="panel p-4 space-y-3">
      <h2 className="font-semibold text-zinc-900">📒 复盘：现实结果回填（认知账本闭环）</h2>
      <label className="block text-sm">
        <span className="text-zinc-600">实际发生了什么（与当时的预期对照）*</span>
        <textarea
          required
          value={actualOutcome}
          onChange={(e) => setActualOutcome(e.target.value)}
          rows={3}
          className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
          placeholder="例如：8 周后留存没有达到当时设定的停止线，我在第 9 周停止了投入……"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-rose-700">被推翻的假设（每行一个）</span>
          <textarea
            value={overturned}
            onChange={(e) => setOverturned(e.target.value)}
            rows={3}
            className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </label>
        <label className="block text-sm">
          <span className="text-emerald-700">被确认的假设（每行一个）</span>
          <textarea
            value={confirmed}
            onChange={(e) => setConfirmed(e.target.value)}
            rows={3}
            className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-zinc-600">这次学到的教训（写给自己半年后看）</span>
        <textarea
          value={lesson}
          onChange={(e) => setLesson(e.target.value)}
          rows={2}
          className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
        />
      </label>
      {err && <p className="text-xs text-rose-600">{err}</p>}
      <button
        type="submit"
        disabled={state === "saving"}
        className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm disabled:opacity-50 hover:bg-zinc-700"
      >
        {state === "saving" ? "保存中…" : "提交复盘"}
      </button>
    </form>
  );
}
