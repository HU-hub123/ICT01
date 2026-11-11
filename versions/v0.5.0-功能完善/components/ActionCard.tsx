import type { MinimalAction } from "@/lib/types";

/** 最小行动 + 事前写下的停止条件（回应"数字无依据"差评：数字一律示例化） */
export function ActionCard({ minimalAction }: { minimalAction: MinimalAction }) {
  return (
    <div className="panel p-4 border-l-4 border-l-emerald-400 space-y-2">
      <h2 className="font-semibold text-zinc-900">🎯 最小行动与停止条件</h2>
      <p className="text-sm text-zinc-800 leading-6">
        <b className="text-emerald-700">下一步最小动作：</b>
        {minimalAction.action}
      </p>
      <p className="text-sm text-zinc-800 leading-6">
        <b className="text-rose-700">事前写下的停止条件：</b>
        {minimalAction.stopCondition}
      </p>
      <p className="text-sm text-zinc-800 leading-6">
        <b className="text-sky-700">观察窗口与预期：</b>
        {minimalAction.observationWindow}
      </p>
    </div>
  );
}
