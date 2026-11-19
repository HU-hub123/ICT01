import Link from "next/link";
import { LedgerList } from "@/components/LedgerList";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  const store = await getStore();
  const items = await store.list();
  const trashCount = (await store.listDeleted()).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="serif text-2xl font-bold text-ink">认知账本</h1>
          <p className="text-sm text-stone-500 mt-1">
            这里存的是判断过程：当时的问题、确认的事实、关键假设、以及事后发生了什么。
          </p>
        </div>
        <Link
          href="/ledger/trash"
          className="text-xs px-3 py-1.5 rounded-full border border-line text-stone-500 hover:border-stone-300 shrink-0"
        >
          回收站（{trashCount}）
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="panel p-10 text-center space-y-3">
          <p className="text-sm text-stone-500">账本还是空的。去工作台完成第一次推演，把判断过程存下来。</p>
          <Link href="/" className="btn-brand inline-block px-4 py-2 text-sm">
            开始推演
          </Link>
        </div>
      ) : (
        <LedgerList items={items} />
      )}
    </div>
  );
}
