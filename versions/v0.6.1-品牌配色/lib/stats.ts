/**
 * 复盘统计：从认知账本计算"长期认知轨迹"
 *
 * 回应差评第 9 条的长期价值：
 * "半年后回看：当时为什么相信？哪个假设被现实推翻？
 *  我常在哪类问题上判断错误？我是否反复因某种偏差做选择？"
 */

import { MODEL_MAP } from "./models-data";
import type { AnalysisRecord } from "./types";

export interface LedgerStats {
  total: number;
  reviewed: number;
  open: number;
  /** 被推翻的假设总数 */
  overturnedTotal: number;
  /** 被确认的假设总数 */
  confirmedTotal: number;
  /** 推翻率 = 推翻 / (推翻+确认)；没有数据时为 null */
  netOverturnRate: number | null;
  /** 已复盘条目中最常出现的模型 */
  topModels: { modelId: string; name: string; count: number }[];
  /** 已复盘条目中最常出现的"检查偏差"类模型（常犯偏差信号） */
  topBiasModels: { modelId: string; name: string; count: number }[];
  /** 教训时间线 */
  lessons: { id: string; question: string; reviewedAt: string; lesson: string }[];
  /** 复盘时间线（实际结果） */
  timeline: { id: string; question: string; reviewedAt: string; actualOutcome: string }[];
}

export function computeStats(records: AnalysisRecord[]): LedgerStats {
  const reviewed = records.filter((r) => r.status === "reviewed" && r.review);
  const overturnedTotal = reviewed.reduce(
    (s, r) => s + (r.review?.overturnedAssumptions.length ?? 0),
    0,
  );
  const confirmedTotal = reviewed.reduce(
    (s, r) => s + (r.review?.confirmedAssumptions.length ?? 0),
    0,
  );

  const counts = new Map<string, number>();
  for (const r of reviewed) {
    for (const sel of r.selections) {
      counts.set(sel.modelId, (counts.get(sel.modelId) ?? 0) + 1);
    }
  }

  const sorted = [...counts.entries()]
    .map(([modelId, count]) => ({
      modelId,
      name: MODEL_MAP[modelId]?.name ?? modelId,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const topModels = sorted.slice(0, 5);
  const topBiasModels = sorted
    .filter((m) => MODEL_MAP[m.modelId]?.role === "check_bias")
    .slice(0, 5);

  const lessons = reviewed
    .filter((r) => (r.review?.lesson ?? "").trim().length > 0)
    .sort((a, b) => (a.review!.reviewedAt < b.review!.reviewedAt ? 1 : -1))
    .map((r) => ({
      id: r.id,
      question: r.question,
      reviewedAt: r.review!.reviewedAt,
      lesson: r.review!.lesson,
    }));

  const timeline = reviewed
    .sort((a, b) => (a.review!.reviewedAt < b.review!.reviewedAt ? 1 : -1))
    .map((r) => ({
      id: r.id,
      question: r.question,
      reviewedAt: r.review!.reviewedAt,
      actualOutcome: r.review!.actualOutcome,
    }));

  return {
    total: records.length,
    reviewed: reviewed.length,
    open: records.length - reviewed.length,
    overturnedTotal,
    confirmedTotal,
    netOverturnRate:
      overturnedTotal + confirmedTotal > 0
        ? overturnedTotal / (overturnedTotal + confirmedTotal)
        : null,
    topModels,
    topBiasModels,
    lessons,
    timeline,
  };
}
