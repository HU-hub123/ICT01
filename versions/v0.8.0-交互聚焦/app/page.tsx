import Link from "next/link";
import { AskWorkbench } from "@/components/AskWorkbench";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const store = await getStore();
  const recent = (await store.list()).slice(0, 3);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="serif text-2xl font-bold text-ink">想清楚一件事</h1>
        <p className="text-sm text-stone-500">
          说出一个正在犹豫的问题。系统会把事实、缺口和几个角度摊开，最后收束成一个可以行动的判断。
        </p>
      </div>

      <AskWorkbench />

      {recent.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="serif text-[15px] font-semibold text-ink">最近的判断</h2>
            <Link href="/ledger" className="text-xs text-brand hover:underline">
              全部账本 →
            </Link>
          </div>
          <div className="space-y-2">
            {recent.map((r) => (
              <Link
                key={r.id}
                href={`/ledger/${r.id}`}
                className="panel p-4 block hover:border-brand/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] text-ink truncate">{r.question}</p>
                    <p className="text-xs text-stone-400 mt-1">
                      {new Date(r.createdAt).toLocaleDateString("zh-CN")} ·{" "}
                      {r.status === "reviewed" ? "已复盘" : "待复盘"}
                    </p>
                  </div>
                  <span className="text-brand text-sm shrink-0">→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
