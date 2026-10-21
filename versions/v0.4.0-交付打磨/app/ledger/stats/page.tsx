import Link from "next/link";
import { MODEL_MAP } from "@/lib/models-data";
import { computeStats } from "@/lib/stats";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const records = await store.list();
  const s = computeStats(records);

  const cards = [
    { label: "账本条目", value: String(s.total) },
    { label: "已复盘", value: String(s.reviewed) },
    { label: "待复盘", value: String(s.open) },
    {
      label: "假设推翻率",
      value: s.netOverturnRate === null ? "—" : `${Math.round(s.netOverturnRate * 100)}%`,
      note: "被推翻 ÷（被推翻 + 被确认）",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">复盘统计 · 长期认知轨迹</h1>
        <p className="text-sm text-zinc-500 mt-1">
          半年后回来看这里：当时为什么相信、哪个假设被现实推翻、哪种偏差反复出现。
          数据只来自你自己提交的复盘，不推断、不虚构。
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="panel p-4">
            <p className="text-xs text-zinc-400">{c.label}</p>
            <p className="text-2xl font-bold text-zinc-900 mt-1">{c.value}</p>
            {c.note && <p className="text-xs text-zinc-400 mt-1">{c.note}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel p-4 space-y-2">
          <h2 className="font-semibold text-zinc-900 text-sm">已复盘判断中最常出现的模型</h2>
          {s.topModels.length === 0 ? (
            <p className="text-xs text-zinc-400">
              暂无数据。完成一次复盘后，这里会显示你最常借助的模型。
            </p>
          ) : (
            <ul className="space-y-1.5">
              {s.topModels.map((m) => (
                <li key={m.modelId} className="flex justify-between text-sm">
                  <Link href="/models" className="text-zinc-700 hover:underline">
                    {m.name}
                  </Link>
                  <span className="text-zinc-400 text-xs">×{m.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel p-4 space-y-2">
          <h2 className="font-semibold text-zinc-900 text-sm">
            ⚠️ 常犯偏差信号（已复盘判断中反复出现的「检查偏差」类模型）
          </h2>
          {s.topBiasModels.length === 0 ? (
            <p className="text-xs text-zinc-400">
              暂无数据。如果同一种偏差反复出现在你的判断里，它会在这里被点出来。
            </p>
          ) : (
            <ul className="space-y-1.5">
              {s.topBiasModels.map((m) => (
                <li key={m.modelId} className="flex justify-between text-sm">
                  <span className="text-amber-800">
                    {m.name}
                    {MODEL_MAP[m.modelId]?.tensionWith.length
                      ? `（解药：${MODEL_MAP[m.modelId].tensionWith
                          .map((id) => MODEL_MAP[id]?.name ?? id)
                          .join("、")}）`
                      : ""}
                  </span>
                  <span className="text-zinc-400 text-xs">×{m.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="panel p-4 space-y-3">
        <h2 className="font-semibold text-zinc-900 text-sm">复盘时间线（实际结果）</h2>
        {s.timeline.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-xs text-zinc-400">
              还没有复盘记录。判断的价值要等到现实结果回填之后才真正落地。
            </p>
            <Link
              href="/ledger"
              className="inline-block text-sm text-sky-600 underline"
            >
              去账本找到「待复盘」条目，回填实际结果 →
            </Link>
          </div>
        ) : (
          <ol className="space-y-3">
            {s.timeline.map((t) => (
              <li key={t.id} className="border-l-2 border-emerald-200 pl-4 text-sm space-y-1">
                <p className="text-xs text-zinc-400">
                  {new Date(t.reviewedAt).toLocaleString("zh-CN")}
                </p>
                <Link href={`/ledger/${t.id}`} className="font-medium text-zinc-800 hover:underline">
                  {t.question}
                </Link>
                <p className="text-zinc-600 text-xs leading-5">{t.actualOutcome}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="panel p-4 space-y-3">
        <h2 className="font-semibold text-zinc-900 text-sm">写给自己的教训</h2>
        {s.lessons.length === 0 ? (
          <p className="text-xs text-zinc-400">
            暂无。复盘时写下「这次学到的教训」，它会累积在这里，成为你自己的判断手册。
          </p>
        ) : (
          <ul className="space-y-3">
            {s.lessons.map((l) => (
              <li key={l.id} className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-sm space-y-1">
                <p className="text-xs text-zinc-400">
                  {new Date(l.reviewedAt).toLocaleString("zh-CN")} ·{" "}
                  <Link href={`/ledger/${l.id}`} className="hover:underline">
                    {l.question.slice(0, 40)}…
                  </Link>
                </p>
                <p className="text-zinc-700 leading-6">{l.lesson}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
