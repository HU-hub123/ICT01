/**
 * 模型检索：确定性的关键词匹配 + 张力对保障
 *
 * 设计要点：
 * 1. 检索过程完全可解释（命中哪些标签），作为溯源回放的依据；
 * 2. 若候选模型之间没有张力对，自动按库中 tensionWith 关系补入一个张力伙伴，
 *    保证"交叉推演"不是同一论证的重复。
 */

import { MODELS } from "./models-data";
import type { ModelDef } from "./types";

export interface RankedModel {
  model: ModelDef;
  score: number;
  matchedTags: string[];
}

export function retrieveCandidates(question: string, limit = 8): RankedModel[] {
  const q = question.toLowerCase();
  const ranked: RankedModel[] = MODELS.map((model) => {
    const matchedTags = model.tags.filter((t) =>
      q.includes(t.toLowerCase()),
    );
    let score = matchedTags.length * 2;
    if (q.includes(model.name) || q.includes(model.nameEn.toLowerCase())) {
      score += 3;
    }
    return { model, score, matchedTags };
  }).sort((a, b) => b.score - a.score);

  const top: RankedModel[] = ranked.filter((r) => r.score > 0);
  const fallback: RankedModel[] = ranked.filter((r) => r.score === 0);
  const candidates: RankedModel[] = [
    ...top.slice(0, limit),
    ...fallback.slice(0, Math.max(0, limit - top.length)),
  ];

  // 张力对保障：候选前 4 名里必须有至少一对 tensionWith 关系
  const firstFour = candidates.slice(0, Math.min(4, candidates.length));
  const hasTension = firstFour.some((r) =>
    r.model.tensionWith.some((tid) =>
      firstFour.some((r2) => r2.model.id === tid),
    ),
  );
  if (!hasTension && candidates.length > 0) {
    for (const r of candidates) {
      const partner = r.model.tensionWith
        .map((id) => ranked.find((x) => x.model.id === id))
        .find(Boolean);
      if (partner && !candidates.includes(partner)) {
        candidates.splice(Math.min(4, candidates.length), 0, partner);
        break;
      }
    }
  }
  return candidates.slice(0, limit);
}

/** 简述候选检索依据（进入流水线留档与前端展示） */
export function retrievalNotes(
  ranked: RankedModel[],
): { modelId: string; matchedTags: string[]; score: number }[] {
  return ranked.map((r) => ({
    modelId: r.model.id,
    matchedTags: r.matchedTags,
    score: r.score,
  }));
}
