import Link from "next/link";
import { MODEL_MAP } from "@/lib/models-data";
import { computeStats } from "@/lib/stats";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const store = await getStore();
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
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <h1 className="serif text-2xl font-bold text-ink">复盘统计</h1>
        <p className="text-sm text-stone-500 mt-1">
          只看你自己提交的复盘，不推断、不虚构。用得越久，这里的轨迹越清楚。
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="panel p-4">
            <p className="text-xs text-stone-400">{c.label}</p>
            <p className="text-3xl font-bold text-ink mt-1">{c.value}</p>
            {c.note && <p className="text-[11px] text-stone-400 mt-1 leading-4">{c.note}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel p-5 space-y-2">
          <h2 className="text-sm font-semibold text-ink">最常借助的角度</h2>
          {s.topModels.length === 0 ? (
            <p className="text-sm text-stone-400">暂无数据，完成一次复盘后出现。</p>
          ) : (
            <ul className="space-y-2">
              {s.topModels.map((m) => (
                <li key={m.modelId} className="flex justify-between text-[15px]">
                  <Link href="/models" className="text-stone-700 hover:text-brand">
                    {m.name}
                  </Link>
                  <span className="text-stone-400 text-xs">×{m.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel p-5 space-y-2">
          <h2 className="text-sm font-semibold text-ink">反复出现的偏差</h2>
          {s.topBiasModels.length === 0 ? (
            <p className="text-sm text-stone-400">暂无数据。同一种偏差反复出现时，会在这里被点出来。</p>
          ) : (
            <ul className="space-y-2">
              {s.topBiasModels.map((m) => (
                <li key={m.modelId} className="flex justify-between text-[15px]">
                  <span className="text-amber-800">
                    {m.name}
                    {MODEL_MAP[m.modelId]?.tensionWith.length
                      ? `（解药：${MODEL_MAP[m.modelId].tensionWith
                          .map((id) => MODEL_MAP[id]?.name ?? id)
                          .join("、")}）`
                      : ""}
                  </span>
                  <span className="text-stone-400 text-xs">×{m.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="panel p-5 space-y-3">
        <h2 className="text-sm font-semibold text-ink">复盘时间线</h2>
        {s.timeline.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-sm text-stone-400">还没有复盘记录。判断的价值要等现实结果回填之后才落地。</p>
            <Link href="/ledger" className="inline-block text-sm text-brand underline">
              去账本找到「待复盘」条目 →
            </Link>
          </div>
        ) : (
          <ol className="space-y-4">
            {s.timeline.map((t) => (
              <li key={t.id} className="border-l-2 border-emerald-200 pl-4 space-y-1">
                <p className="text-xs text-stone-400">{new Date(t.reviewedAt).toLocaleDateString("zh-CN")}</p>
                <Link href={`/ledger/${t.id}`} className="text-[15px] font-medium text-ink hover:text-brand">
                  {t.question}
                </Link>
                <p className="text-sm text-stone-600 leading-6">{t.actualOutcome}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="panel p-5 space-y-3">
        <h2 className="text-sm font-semibold text-ink">写给自己的教训</h2>
        {s.lessons.length === 0 ? (
          <p className="text-sm text-stone-400">暂无。复盘时写下「这次学到的教训」，会累积在这里。</p>
        ) : (
          <ul className="space-y-3">
            {s.lessons.map((l) => (
              <li key={l.id} className="bg-stone-50 border border-line rounded-xl p-3 space-y-1">
                <p className="text-xs text-stone-400">
                  {new Date(l.reviewedAt).toLocaleDateString("zh-CN")} ·{" "}
                  <Link href={`/ledger/${l.id}`} className="hover:text-brand">
                    {l.question.slice(0, 30)}…
                  </Link>
                </p>
                <p className="text-sm text-stone-700 leading-6">{l.lesson}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
