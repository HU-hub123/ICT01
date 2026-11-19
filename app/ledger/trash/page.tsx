import Link from "next/link";
import { getStore } from "@/lib/store";
import { ClearTrashButton, TrashActions } from "@/components/TrashActions";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const store = await getStore();
  const items = await store.listDeleted();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
      <div className="space-y-1">
        <Link href="/ledger" className="text-xs text-brand hover:underline">
          ← 返回账本
        </Link>
        <h1 className="serif text-2xl font-bold text-ink">回收站</h1>
        <p className="text-sm text-stone-500">
          删除的判断会保留 7 天，期间可以恢复；超过 7 天自动清除。
        </p>
      </div>

      {items.length === 0 ? (
        <div className="panel p-10 text-center space-y-2">
          <p className="text-sm text-stone-500">回收站是空的。</p>
          <Link href="/ledger" className="text-sm text-brand underline">
            回账本看看 →
          </Link>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <ClearTrashButton count={items.length} />
          </div>
          <div className="space-y-3">
            {items.map((r) => {
              const deletedAt = r.deletedAt ? new Date(r.deletedAt) : null;
              const expireAt = deletedAt
                ? new Date(deletedAt.getTime() + 7 * 24 * 3600 * 1000)
                : null;
              const daysLeft = expireAt
                ? Math.max(0, Math.ceil((expireAt.getTime() - Date.now()) / (24 * 3600 * 1000)))
                : 0;
              return (
                <div key={r.id} className="panel p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-medium leading-6 text-ink">{r.question}</p>
                    <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-500">
                      {daysLeft} 天后清除
                    </span>
                  </div>
                  <p className="text-xs text-stone-400">
                    删除于 {deletedAt?.toLocaleString("zh-CN")}
                  </p>
                  <TrashActions id={r.id} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
