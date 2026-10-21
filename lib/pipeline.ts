/**
 * 推演流水线：固定五阶段的顺序执行，无迭代循环
 *
 * 防死循环的工程保证：
 * - 阶段数固定（事实收口 → 模型选择 → 独立推演 → 交叉推演 → 综合结论）；
 * - 每个阶段最多调用模型 2 次（1 次正常 + 1 次 JSON 修复）；
 * - 任何一步失败即终止并返回明确错误，绝不伪造输出；
 * - 张力对由"确定性检索 + 库内张力关系"兜底，不依赖模型自觉。
 */

import { randomUUID } from "crypto";
import { MODEL_MAP } from "./models-data";
import { retrieveCandidates } from "./retrieval";
import { callJSON, LLMError } from "./deepseek";
import {
  argumentsPrompt,
  factsPrompt,
  selectionPrompt,
  synthesisPrompt,
  tensionPrompt,
} from "./prompts";
import type {
  AnalysisRecord,
  ConflictPoint,
  EvidenceCheckpoint,
  FactsRecap,
  HistoryTurn,
  LayerKind,
  MinimalAction,
  ModelArgument,
  ModelSelection,
  PipelineStep,
  TaggedSentence,
} from "./types";

const VALID_LAYERS: LayerKind[] = ["fact", "inference", "assumption", "missing", "example_number"];

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => asString(x)).filter((s) => s.length > 0);
}

function asTagged(v: unknown): TaggedSentence[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      if (typeof x !== "object" || x === null) return null;
      const obj = x as Record<string, unknown>;
      const layer = VALID_LAYERS.includes(obj.layer as LayerKind)
        ? (obj.layer as LayerKind)
        : "inference";
      const text = asString(obj.text);
      return text ? { layer, text } : null;
    })
    .filter((x): x is TaggedSentence => x !== null);
}

interface StepContext {
  steps: PipelineStep[];
  push(key: string, title: string, inputSummary: string, fn: () => Promise<unknown>): Promise<unknown>;
}

function makeContext(
  steps: PipelineStep[],
  onStep?: (step: PipelineStep) => void,
): StepContext {
  return {
    steps,
    async push(key, title, inputSummary, fn) {
      const t0 = Date.now();
      try {
        const output = await fn();
        const step: PipelineStep = {
          key,
          title,
          status: "done",
          durationMs: Date.now() - t0,
          inputSummary,
          output,
        };
        steps.push(step);
        onStep?.(step);
        return output;
      } catch (e) {
        const step: PipelineStep = {
          key,
          title,
          status: "error",
          durationMs: Date.now() - t0,
          inputSummary,
          output: null,
          error: e instanceof Error ? e.message : String(e),
        };
        steps.push(step);
        onStep?.(step);
        throw e;
      }
    },
  };
}

/** 模型输出不符合 JSON 契约时，用错误信息做一次修复调用 */
async function callWithRepair(
  build: (repairNote?: string) => Parameters<typeof callJSON>[0],
): Promise<unknown> {
  try {
    return await callJSON(build());
  } catch (e) {
    if (e instanceof LLMError) {
      // 网络/密钥错误直接抛出（不伪造）
      if (/HTTP \d|未配置|网络|fetch|abort|超时/i.test(e.message)) throw e;
    }
    const note = `上一次输出无法解析为要求的 JSON，请严格按 JSON 契约重新输出，不要输出任何非 JSON 文字。`;
    return callJSON(build(note));
  }
}

function summarize(record: Omit<AnalysisRecord, "id" | "createdAt" | "updatedAt" | "steps" | "status">): string {
  const conclusion = record.conclusion.map((c) => c.text).join("；");
  return `事实：${record.factsRecap.confirmedFacts.join("；") || "无"}。结论：${conclusion}。最小行动：${record.minimalAction.action}。`;
}

export async function runAnalysis(
  input: {
    question: string;
    extraFacts?: string;
    history?: HistoryTurn[];
  },
  onStep?: (step: PipelineStep) => void,
): Promise<AnalysisRecord> {
  const { question, extraFacts, history = [] } = input;
  const steps: PipelineStep[] = [];
  const ctx = makeContext(steps, onStep);

  // ---------- 第 1 阶段：事实收口 ----------
  const factsRaw = (await ctx.push("facts_recap", "事实收口：区分事实与缺失信息", "输入：问题 + 补充信息 + 追问历史（含上一轮系统回答摘要）", () =>
    callWithRepair((note) => factsPrompt(question, extraFacts, history).map((m, i) =>
      i === 1 && note ? { ...m, content: `${m.content}\n\n【修复要求】${note}` } : m,
    )),
  )) as Record<string, unknown>;
  const factsRecap: FactsRecap = {
    confirmedFacts: asStringArray(factsRaw?.confirmedFacts),
    missingInfo: asStringArray(factsRaw?.missingInfo),
    coreJudgment: asString(factsRaw?.coreJudgment, question),
  };

  // ---------- 第 2 阶段：模型选择（检索 + LLM 选择，张力对兜底） ----------
  const ranked = retrieveCandidates(question, 8);
  const candidates = ranked.map((r) => ({
    id: r.model.id,
    name: r.model.name,
    nameEn: r.model.nameEn,
    role: r.model.role,
    definition: r.model.definition,
    tensionWith: r.model.tensionWith
      .map((tid) => ({ id: tid, name: MODEL_MAP[tid]?.name ?? tid }))
      .filter((t) => MODEL_MAP[t.id] !== undefined),
  }));
  const selectionRaw = (await ctx.push(
    "model_select",
    "模型匹配：从检索候选中选 2-4 个（含张力对）",
    `检索依据：${ranked.map((r) => `${r.model.name}（命中 ${r.matchedTags.length ? r.matchedTags.join("/") : "无关键词，兜底候选"}）`).join("、")}`,
    () =>
      callWithRepair((note) =>
        selectionPrompt(question, factsRecap, candidates).map((m, i) =>
          i === 1 && note ? { ...m, content: `${m.content}\n\n【修复要求】${note}` } : m,
        ),
      ),
  )) as Record<string, unknown>;
  let selections: ModelSelection[] = [];
  {
    const rawSel = Array.isArray(selectionRaw?.selected) ? selectionRaw.selected : [];
    selections = rawSel
      .map((s) => {
        const obj = s as Record<string, unknown>;
        const modelId = asString(obj?.modelId);
        return MODEL_MAP[modelId]
          ? { modelId, reason: asString(obj?.selectionReason, "模型适用于该问题的判断点"), source: "llm" as const }
          : null;
      })
      .filter((s): s is ModelSelection => s !== null)
      .slice(0, 4);
  }
  if (selections.length < 2) {
    // 确定性兜底：LLM 选择失败时，直接取检索前 3 个
    for (const r of ranked) {
      if (!selections.some((s) => s.modelId === r.model.id)) {
        selections.push({
          modelId: r.model.id,
          reason: `确定性兜底：检索命中 ${r.matchedTags.join("、") || "无关键词"}`,
          source: "library_tension",
        });
      }
      if (selections.length >= 3) break;
    }
  }
  // 张力对兜底：已选模型之间若无张力关系，按库内张力关系补入伙伴
  {
    const hasTension = selections.some((s) =>
      MODEL_MAP[s.modelId].tensionWith.some((tid) => selections.some((x) => x.modelId === tid)),
    );
    if (!hasTension) {
      for (const s of selections) {
        const partnerId = MODEL_MAP[s.modelId].tensionWith.find(
          (tid) => !selections.some((x) => x.modelId === tid),
        );
        if (partnerId) {
          selections.push({
            modelId: partnerId,
            reason: `张力兜底：库内与「${MODEL_MAP[s.modelId].name}」存在张力关系，补入以保证真正交叉推演`,
            source: "library_tension",
          });
          break;
        }
      }
    }
  }
  const selectedModels = selections.map((s) => MODEL_MAP[s.modelId]);

  // ---------- 第 3 阶段：各模型独立推演 ----------
  const argsRaw = (await ctx.push(
    "arguments",
    `独立推演：${selectedModels.map((m) => m.name).join("、")} 各自给出结论`,
    "输入：问题 + 事实收口结果 + 各模型定义/动作/适用条件/失效边界",
    () =>
      callWithRepair((note) =>
        argumentsPrompt(question, factsRecap, selectedModels).map((m, i) =>
          i === 1 && note ? { ...m, content: `${m.content}\n\n【修复要求】${note}` } : m,
        ),
      ),
  )) as Record<string, unknown>;
  let modelArgs: ModelArgument[] = [];
  {
    const raw = Array.isArray(argsRaw?.arguments) ? argsRaw.arguments : [];
    modelArgs = raw
      .map((a) => {
        const obj = a as Record<string, unknown>;
        const modelId = asString(obj?.modelId);
        if (!MODEL_MAP[modelId]) return null;
        return {
          modelId,
          conclusion: asTagged(obj?.conclusion),
          appliesWhen: asString(obj?.appliesWhen, MODEL_MAP[modelId].appliesWhen),
          failsWhen: asString(obj?.failsWhen, MODEL_MAP[modelId].failsWhen),
        };
      })
      .filter((a): a is ModelArgument => a !== null);
  }
  // 缺失的模型用库内定义兜底（结论为空时明确标注，不伪造）
  for (const m of selectedModels) {
    if (!modelArgs.some((a) => a.modelId === m.id)) {
      modelArgs.push({
        modelId: m.id,
        conclusion: [
          { layer: "missing", text: `该模型本轮未能给出可解析的推演结论（模型输出异常），请以模型库定义与适用条件为准，必要时重试。` },
        ],
        appliesWhen: m.appliesWhen,
        failsWhen: m.failsWhen,
      });
    }
  }

  // ---------- 第 4 阶段：交叉推演 ----------
  const tensionRaw = (await ctx.push(
    "tension",
    "交叉推演：显式找出模型冲突与证据检查点",
    `输入：各模型独立结论（${modelArgs.map((a) => MODEL_MAP[a.modelId].name).join("、")}）`,
    () =>
      callWithRepair((note) =>
        tensionPrompt(
          question,
          selectedModels,
          modelArgs.map((a) => ({
            modelId: a.modelId,
            conclusion: a.conclusion.map((c) => c.text).join("；") || "（无结论）",
          })),
        ).map((m, i) => (i === 1 && note ? { ...m, content: `${m.content}\n\n【修复要求】${note}` } : m)),
      ),
  )) as Record<string, unknown>;
  const conflicts: ConflictPoint[] = (
    Array.isArray(tensionRaw?.conflicts) ? tensionRaw.conflicts : []
  )
    .map((c) => {
      const obj = c as Record<string, unknown>;
      const betweenRaw = Array.isArray(obj?.between) ? obj.between.map(asString) : [];
      const between = betweenRaw.length === 2 ? (betweenRaw as [string, string]) : null;
      if (!between) return null;
      return {
        between,
        statement: asString(obj?.statement),
        resolutionCondition: asString(obj?.resolutionCondition),
      };
    })
    .filter((c): c is ConflictPoint => c !== null && c.statement.length > 0);
  const checkpoints: EvidenceCheckpoint[] = (
    Array.isArray(tensionRaw?.checkpoints) ? tensionRaw.checkpoints : []
  )
    .map((c) => {
      const obj = c as Record<string, unknown>;
      const hypothesis = asString(obj?.hypothesis);
      return hypothesis
        ? {
            hypothesis,
            confirmingEvidence: asString(obj?.confirmingEvidence),
            disconfirmingEvidence: asString(obj?.disconfirmingEvidence),
          }
        : null;
    })
    .filter((c): c is EvidenceCheckpoint => c !== null)
    .slice(0, 3);
  const agreementNote = asString(tensionRaw?.agreementNote);

  // ---------- 第 5 阶段：综合结论 + 最小行动 ----------
  const synthRaw = (await ctx.push(
    "synthesis",
    "综合结论（五层标注）与最小行动",
    "输入：问题 + 事实收口 + 各模型推演摘要 + 冲突/证据检查点 + 追问历史",
    () =>
      callWithRepair((note) =>
        synthesisPrompt(
          question,
          factsRecap,
          modelArgs
            .map((a) => `${MODEL_MAP[a.modelId].name}：${a.conclusion.map((c) => c.text).join("；")}`)
            .join("\n"),
          [
            conflicts.map((c) => `冲突：${c.statement}（成立条件：${c.resolutionCondition}）`).join("\n"),
            agreementNote ? `一致说明：${agreementNote}` : "",
            checkpoints.map((c) => `检查点：${c.hypothesis}｜支持证据：${c.confirmingEvidence}｜推翻证据：${c.disconfirmingEvidence}`).join("\n"),
          ]
            .filter(Boolean)
            .join("\n"),
          history,
        ).map((m, i) => (i === 1 && note ? { ...m, content: `${m.content}\n\n【修复要求】${note}` } : m)),
      ),
  )) as Record<string, unknown>;
  const conclusion: TaggedSentence[] = asTagged(synthRaw?.conclusion);
  const maRaw = (synthRaw?.minimalAction ?? {}) as Record<string, unknown>;
  const minimalAction: MinimalAction = {
    action: asString(maRaw?.action, "（模型未给出可解析的最小行动，请结合上文自行拟定下一步）"),
    stopCondition: asString(maRaw?.stopCondition, "（未给出，建议事前设定可检验的停止条件）"),
    observationWindow: asString(maRaw?.observationWindow, "（未给出）"),
  };

  const now = new Date().toISOString();
  const base: Omit<AnalysisRecord, "id" | "createdAt" | "updatedAt" | "steps" | "status"> = {
    question,
    extraFacts: extraFacts || undefined,
    factsRecap,
    selections,
    arguments: modelArgs,
    conflicts,
    agreementNote,
    checkpoints,
    conclusion,
    minimalAction,
  };
  const record: AnalysisRecord = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    steps,
    status: "open",
    ...base,
  };

  // 供追问使用：上一轮系统自己的回答摘要（修复"追问丢失上文"的 bug）
  record.summary = summarize(base);

  return record;
}

export function recordSummary(r: AnalysisRecord): string {
  const conclusion = r.conclusion.map((c) => c.text).join("；");
  return `事实：${r.factsRecap.confirmedFacts.join("；") || "无"}。结论：${conclusion}。最小行动：${r.minimalAction.action}。`;
}
