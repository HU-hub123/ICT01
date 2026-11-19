import Link from "next/link";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  const store = await getStore();
  const items = await store.list();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
      <div>
        <h1 className="serif text-2xl font-bold text-ink">认知账本</h1>
        <p className="text-sm text-stone-500 mt-1">
          这里存的是判断过程：当时的问题、确认的事实、关键假设、以及事后发生了什么。
        </p>
      </div>

      {items.length === 0 ? (
        <div className="panel p-10 text-center space-y-3">
          <p className="text-sm text-stone-500">账本还是空的。去工作台完成第一次推演，把判断过程存下来。</p>
          <Link href="/" className="btn-brand inline-block px-4 py-2 text-sm">
            开始推演
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => {
            const firstInference = (r.conclusion || []).find((s) => s.layer === "inference");
            const summary = firstInference?.text || r.conclusion?.[0]?.text || "";
            return (
              <div key={r.id} className="flex items-start gap-2">
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
                <DeleteRecordButton id={r.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
