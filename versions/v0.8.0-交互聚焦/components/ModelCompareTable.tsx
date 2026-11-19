import { MODEL_MAP } from "@/lib/models-data";
import { ROLE_LABELS, type AnalysisRecord } from "@/lib/types";

/** 模型并排对照：把各模型的结论、成立条件、失效边界放在同一张表里比较 */
export function ModelCompareTable({
  record,
  defaultOpen = false,
}: {
  record: AnalysisRecord;
  defaultOpen?: boolean;
}) {
  const rows = record.arguments
    .map((a) => ({ model: MODEL_MAP[a.modelId], arg: a }))
    .filter((r) => Boolean(r.model));
  if (rows.length === 0) return null;
  return (
    <details className="panel p-4" open={defaultOpen || undefined}>
      <summary className="cursor-pointer text-sm font-semibold text-ink select-none">
        📊 模型并排对照：结论要点 / 成立条件 / 失效边界（点击展开）
      </summary>
      <div className="overflow-x-auto mt-3">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left text-stone-500 border-b border-line">
              <th className="py-2 pr-3 font-medium whitespace-nowrap">模型</th>
              <th className="py-2 pr-3 font-medium whitespace-nowrap">认知操作</th>
              <th className="py-2 pr-3 font-medium min-w-56">结论要点</th>
              <th className="py-2 pr-3 font-medium min-w-48">成立条件</th>
              <th className="py-2 font-medium min-w-48">失效边界</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ model, arg }) => (
              <tr key={arg.modelId} className="align-top border-b border-line/70 last:border-0">
                <td className="py-2 pr-3 font-medium text-ink whitespace-nowrap">{model!.name}</td>
                <td className="py-2 pr-3 text-stone-500 whitespace-nowrap">
                  {ROLE_LABELS[model!.role]}
                </td>
                <td className="py-2 pr-3 text-stone-700 leading-5">{arg.conclusion[0]?.text ?? "—"}</td>
                <td className="py-2 pr-3 text-emerald-800 leading-5">{arg.appliesWhen}</td>
                <td className="py-2 text-rose-800 leading-5">{arg.failsWhen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
