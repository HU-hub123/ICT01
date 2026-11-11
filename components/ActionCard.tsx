import type { MinimalAction } from "@/lib/types";

/** 最小行动 + 事前写下的停止条件（数字一律示例化） */
export function ActionCard({ minimalAction }: { minimalAction: MinimalAction }) {
  return (
    <div className="panel p-5 border-l-4 border-l-emerald-400/70 space-y-2">
      <h2 className="serif text-[15px] font-semibold text-ink">下一步做什么、什么情况下停</h2>
      <p className="text-sm text-stone-800 leading-6">
        <b className="text-emerald-700">先做这一件小事：</b>
        {minimalAction.action}
      </p>
      <p className="text-sm text-stone-800 leading-6">
        <b className="text-rose-700">事先写好的停止条件：</b>
        {minimalAction.stopCondition}
      </p>
      <p className="text-sm text-stone-800 leading-6">
        <b className="text-brand">看多久、看什么：</b>
        {minimalAction.observationWindow}
      </p>
    </div>
  );
}
