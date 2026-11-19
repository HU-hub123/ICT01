import { MODEL_MAP } from "@/lib/models-data";
import type { AnalysisRecord } from "@/lib/types";

/**
 * 决策图：把一次推演的骨架画出来（问题 → 事实/缺失 → 模型 → 冲突 → 结论 → 行动）。
 *
 * 设计原则（防黑盒）：
 * - 图上的每个节点都来自本次推演的真实输出，不画任何"看起来精确"的虚构结构；
 * - 琥珀色虚线 = 张力冲突（模型之间在打架），实线 = 推演流；
 * - 节点只做摘要，详情仍在下方逐条呈现。
 */
export function DecisionGraph({ record }: { record: AnalysisRecord }) {
  const models = record.selections
    .map((s) => MODEL_MAP[s.modelId])
    .filter((m): m is NonNullable<typeof m> => Boolean(m));
  if (models.length === 0) return null;

  const W = 960;
  const q = { x: W / 2 - 280, y: 14, w: 560, h: 58 };
  const factW = 250;
  const factGap = 24;
  const factsTotal = factW * 2 + factGap;
  const fLeft = { x: W / 2 - factsTotal / 2, y: 98, w: factW, h: 80 };
  const fRight = { x: W / 2 - factsTotal / 2 + factW + factGap, y: 98, w: factW, h: 80 };

  const boxW = 190;
  const boxGap = 34;
  const totalW = models.length * boxW + (models.length - 1) * boxGap;
  const startX = (W - totalW) / 2;
  const modelY = 214;
  const modelH = 96;
  const modelBoxes = models.map((m, i) => ({
    model: m,
    x: startX + i * (boxW + boxGap),
    y: modelY,
    w: boxW,
    h: modelH,
  }));

  const hasConflicts = record.conflicts.length > 0;
  const conflictBox = hasConflicts ? { x: W / 2 - 300, y: 366, w: 600, h: 64 } : null;
  const conclY = hasConflicts ? 458 : 366;
  const concl = { x: W / 2 - 380, y: conclY, w: 760, h: 70 };
  const action = { x: W / 2 - 380, y: conclY + 88, w: 760, h: 66 };
  const H = action.y + action.h + 16;

  const cx = (b: { x: number; w: number }) => b.x + b.w / 2;
  const edge = (x1: number, y1: number, x2: number, y2: number) => {
    const dy = Math.max(18, (y2 - y1) / 2);
    return `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
  };

  const tensionPairs = record.conflicts
    .map((c) => {
      const ia = models.findIndex((m) => m.id === c.between[0]);
      const ib = models.findIndex((m) => m.id === c.between[1]);
      return ia >= 0 && ib >= 0
        ? { a: modelBoxes[ia], b: modelBoxes[ib], statement: c.statement }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="决策图">
        <defs>
          <marker
            id="dg-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#a1a1aa" />
          </marker>
          <marker
            id="dg-arrow-amber"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
          </marker>
        </defs>

        {/* 推演流：问题 → 事实/缺失 */}
        <path d={edge(cx(q), q.y + q.h, cx(fLeft), fLeft.y)} stroke="#d4d4d8" strokeWidth="1.5" fill="none" markerEnd="url(#dg-arrow)" />
        <path d={edge(cx(q), q.y + q.h, cx(fRight), fRight.y)} stroke="#d4d4d8" strokeWidth="1.5" fill="none" markerEnd="url(#dg-arrow)" />

        {/* 事实/缺失 → 各模型 */}
        {modelBoxes.map((mb, i) => (
          <path
            key={`f-${i}`}
            d={edge(W / 2, fLeft.y + fLeft.h, cx(mb), mb.y)}
            stroke="#d4d4d8"
            strokeWidth="1.5"
            fill="none"
            markerEnd="url(#dg-arrow)"
          />
        ))}

        {/* 张力冲突：模型之间打架（琥珀色虚线） */}
        {tensionPairs.map((tp, i) => {
          const x1 = tp.a.x + tp.a.w;
          const x2 = tp.b.x;
          const y = modelY + modelH / 2;
          const mx = (x1 + x2) / 2;
          return (
            <g key={`t-${i}`}>
              <path
                d={`M ${x1} ${y} Q ${mx} ${y - 34} ${x2} ${y}`}
                stroke="#f59e0b"
                strokeWidth="1.8"
                strokeDasharray="5 4"
                fill="none"
                markerEnd="url(#dg-arrow-amber)"
              />
              <text x={mx} y={y - 38} textAnchor="middle" fontSize="12" fill="#b45309">
                ⚔ 张力
              </text>
            </g>
          );
        })}

        {/* 模型 → 冲突 / 结论 */}
        {modelBoxes.map((mb, i) => {
          const target = conflictBox ?? concl;
          return (
            <path
              key={`m-${i}`}
              d={edge(cx(mb), mb.y + mb.h, cx(target), target.y)}
              stroke={conflictBox ? "#f59e0b" : "#d4d4d8"}
              strokeWidth="1.5"
              fill="none"
              markerEnd={conflictBox ? "url(#dg-arrow-amber)" : "url(#dg-arrow)"}
            />
          );
        })}

        {/* 冲突 → 结论 → 行动 */}
        {conflictBox && (
          <path
            d={edge(cx(conflictBox), conflictBox.y + conflictBox.h, cx(concl), concl.y)}
            stroke="#d4d4d8"
            strokeWidth="1.5"
            fill="none"
            markerEnd="url(#dg-arrow)"
          />
        )}
        <path
          d={edge(cx(concl), concl.y + concl.h, cx(action), action.y)}
          stroke="#d4d4d8"
          strokeWidth="1.5"
          fill="none"
          markerEnd="url(#dg-arrow)"
        />

        {/* 节点 */}
        <Node box={q}>
          <p className="text-[11px] font-semibold tracking-wide text-stone-400">问题</p>
          <p className="text-[13px] text-ink leading-snug line-clamp-2">{record.question}</p>
        </Node>
        <Node box={fLeft} tone="emerald">
          <p className="text-[11px] font-semibold text-emerald-700">
            已确认事实 · {record.factsRecap.confirmedFacts.length} 条
          </p>
          <p className="text-[12px] text-stone-700 leading-snug line-clamp-2">
            {record.factsRecap.confirmedFacts.slice(0, 2).join("；") || "（未提供，推演建立在标注过的假设上）"}
          </p>
        </Node>
        <Node box={fRight} tone="rose">
          <p className="text-[11px] font-semibold text-rose-700">
            缺失信息 · {record.factsRecap.missingInfo.length} 条
          </p>
          <p className="text-[12px] text-stone-700 leading-snug line-clamp-2">
            {record.factsRecap.missingInfo.slice(0, 2).join("；") || "（未识别到）"}
          </p>
        </Node>
        {modelBoxes.map((mb) => (
          <Node key={mb.model.id} box={mb}>
            <p className="text-[13px] font-semibold text-ink">{mb.model.name}</p>
            <p className="text-[11px] text-stone-400">{mb.model.nameEn}</p>
          </Node>
        ))}
        {conflictBox && (
          <Node box={conflictBox} tone="amber">
            <p className="text-[12px] font-semibold text-amber-800">
              ⚔ 冲突点 ×{record.conflicts.length}（各自在什么条件下成立）
            </p>
            <p className="text-[12px] text-stone-700 leading-snug line-clamp-1">
              {record.conflicts[0]?.statement}
            </p>
          </Node>
        )}
        <Node box={concl} tone="sky">
          <p className="text-[12px] font-semibold text-brand">⑤ 综合结论（五层标注）</p>
          <p className="text-[12px] text-stone-700 leading-snug line-clamp-2">
            {record.conclusion[0]?.text}
          </p>
        </Node>
        <Node box={action}>
          <p className="text-[12px] font-semibold text-emerald-700">🎯 最小行动 + 停止条件</p>
          <p className="text-[12px] text-stone-700 leading-snug line-clamp-2">
            {record.minimalAction.action}
          </p>
        </Node>
      </svg>
      <p className="text-xs text-stone-400">
        图由本次推演的真实输出生成：实线 = 推演流；琥珀虚线 = 张力冲突。节点仅做摘要，完整内容见下方。
      </p>
    </div>
  );
}

function Node({
  box,
  tone = "neutral",
  children,
}: {
  box: { x: number; y: number; w: number; h: number };
  tone?: "neutral" | "emerald" | "rose" | "amber" | "sky";
  children: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    neutral: "border-line bg-white",
    emerald: "border-emerald-200 bg-emerald-50/70",
    rose: "border-rose-200 bg-rose-50/70",
    amber: "border-amber-200 bg-amber-50/70",
    sky: "border-sky-200 bg-brand-soft/70",
  };
  return (
    <foreignObject x={box.x} y={box.y} width={box.w} height={box.h}>
      <div
        className={`h-full w-full rounded-lg border px-3 py-2 space-y-0.5 overflow-hidden ${styles[tone]}`}
        style={{ fontFamily: "inherit" }}
      >
        {children}
      </div>
    </foreignObject>
  );
}
