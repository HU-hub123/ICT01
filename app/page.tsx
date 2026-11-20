import Link from "next/link";
import { AskWorkbench } from "@/components/AskWorkbench";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const store = await getStore();
  const recent = (await store.list()).slice(0, 3);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="serif text-2xl font-bold text-ink">你现在在犹豫什么？</h1>
        <p className="text-sm text-stone-500">
          说出来就好。我会先把已知和未知分开，再从几个不同角度帮你看一遍，最后落到一个能马上做的动作。
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
              <div key={r.id} className="flex items-center gap-2">
                <Link
                  href={`/ledger/${r.id}`}
                  className="panel p-4 flex-1 min-w-0 block hover:border-brand/40 transition-colors"
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
                <DeleteRecordButton id={r.id} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
