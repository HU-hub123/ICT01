/**
 * 推演引擎提示词（全部中文，JSON 输出）
 *
 * 设计要点（回应差评与"防黑盒"核心）：
 * - 数字只能来自用户事实，否则必须标注 example_number；
 * - 每个模型必须给出成立条件与失效边界；
 * - 模型之间必须显式指出冲突点，或说明一致成立的条件；
 * - 追问上下文必须包含上一轮系统自己的回答摘要。
 */

import type { ChatMessage } from "./deepseek";
import type { FactsRecap, HistoryTurn, ModelDef } from "./types";

export const SYSTEM_PROMPT = `你是「认知脚手架」的推演引擎。你的任务不是直接给答案，而是让思考过程可被看见、可被检查、可被记住。

铁律：
1. 只输出合法 JSON，不要输出任何解释性文字。
2. 绝不编造数字。具体数字只能来自用户提供的事实；其余一律标注 layer=example_number，并在文本中注明"仅为说明方法的示例，不是推荐阈值"。
3. 严格区分五层：fact（用户已提供的事实）/ inference（基于模型的推断）/ assumption（尚未验证的假设）/ missing（目前缺失的信息）/ example_number（示例数字）。
4. 每个模型必须给出 appliesWhen（成立条件）与 failsWhen（失效边界）。
5. 模型之间必须显式指出冲突点；若确实没有实质冲突，必须说明"一致成立的条件"与"什么证据出现后会分歧"。
6. 不承诺决策结果，只提供可检查的思考结构。`;

export function factsPrompt(
  question: string,
  extraFacts: string | undefined,
  history: HistoryTurn[],
): ChatMessage[] {
  const historyText =
    history.length > 0
      ? "\n【追问历史（含上一轮系统自己的回答摘要，必须纳入判断）】\n" +
        history
          .map((h, i) => `第${i + 1}轮问题：${h.question}\n第${i + 1}轮系统分析摘要：${h.summary}`)
          .join("\n")
      : "";
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `第一步：事实收口。对下面的问题做信息分层。${historyText}

用户问题：${question}
用户补充信息：${extraFacts || "（无）"}

输出 JSON：
{
  "confirmedFacts": ["只把用户明确说出的事实列出来（数组，可以为空），禁止把常识或猜测当事实"],
  "missingInfo": ["判断该问题目前缺失、且会影响结论的信息（数组），每条说明为什么需要它"],
  "coreJudgment": "一句话概括这个问题真正的判断点是什么"
}`,
    },
  ];
}

export function selectionPrompt(
  question: string,
  facts: FactsRecap,
  candidates: { id: string; name: string; nameEn: string; role: string; definition: string; tensionWith: { id: string; name: string }[] }[],
): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `第二步：从候选模型中选择 2-4 个用于本次推演。

用户问题：${question}
已确认事实：${facts.confirmedFacts.join("；") || "（无）"}
核心判断点：${facts.coreJudgment}

候选模型（来自可溯源模型库的检索结果）：
${candidates
  .map(
    (c) =>
      `- id=${c.id}，名称=${c.name}（${c.nameEn}），认知操作角色=${c.role}，定义=${c.definition}${c.tensionWith.length ? `，张力关系（会与之产生冲突的模型）= ${c.tensionWith.map((t) => t.name).join("、")}` : ""}`,
  )
  .join("\n")}

选择要求：
1. 数量 2-4 个；
2. 【必须】包含至少一对张力模型（候选里标注了"张力关系"的组合），让推演真正发生"打架"；
3. 每个模型给出 selectionReason：为什么该模型适用于这个问题、它撑起哪一段思考。

输出 JSON：
{
  "selected": [{ "modelId": "candidate id", "selectionReason": "为什么选它（含它撑起哪一段思考）" }]
}`,
    },
  ];
}

export function argumentsPrompt(
  question: string,
  facts: FactsRecap,
  models: ModelDef[],
): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `第三步：让每个模型独立推演（先不要互相妥协）。

用户问题：${question}
已确认事实：${facts.confirmedFacts.join("；") || "（无）"}
缺失信息：${facts.missingInfo.join("；") || "（无）"}

需要独立推演的模型：
${models
  .map(
    (m) =>
      `- id=${m.id}，名称=${m.name}，定义=${m.definition}，要求用户执行的动作=${m.scaffoldAction}，库中记载的适用条件=${m.appliesWhen}，失效边界=${m.failsWhen}`,
  )
  .join("\n")}

对每个模型独立给出（哪怕与其他模型结论冲突，也必须如实给出）：
- conclusion：3-6 句推演结论，每句带 layer 标注（fact/inference/assumption/missing/example_number）；
- appliesWhen：结合本问题，该模型在什么条件下成立；
- failsWhen：结合本问题，什么情况下该模型会失效/不适用。

输出 JSON：
{
  "arguments": [{
    "modelId": "...",
    "conclusion": [{ "layer": "inference", "text": "..." }],
    "appliesWhen": "...",
    "failsWhen": "..."
  }]
}`,
    },
  ];
}

export function tensionPrompt(
  question: string,
  models: ModelDef[],
  summaries: { modelId: string; conclusion: string }[],
): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `第四步：交叉推演。找出模型之间的冲突与分歧，并给出证据检查点。

用户问题：${question}

各模型刚才独立得出的结论：
${summaries.map((s) => `- ${s.modelId}：${s.conclusion}`).join("\n")}

要求：
1. conflicts：模型之间真正的冲突点（数组）。每条必须包含：between（两个模型 id 组成的二元数组）、statement（冲突的具体内容）、resolutionCondition（在什么条件下哪一个模型成立——对比的目的不是选"最正确"，而是判断各自在什么条件下成立）。
2. 如果没有实质冲突（结论恰好一致），conflicts 可以为空数组，但 agreementNote 必须明确说明：它们在什么共同条件下才会一致成立、以及出现什么新证据后会产生分歧。
3. checkpoints：1-3 个证据检查点（hypothesis + 支持它的证据 + 会推翻它的证据），用于回答"什么新证据会在多大程度上改变现在的判断"（贝叶斯式检查）。

输出 JSON：
{
  "conflicts": [{ "between": ["modelIdA", "modelIdB"], "statement": "...", "resolutionCondition": "..." }],
  "agreementNote": "若冲突为空必须填写，否则可填''",
  "checkpoints": [{ "hypothesis": "...", "confirmingEvidence": "...", "disconfirmingEvidence": "..." }]
}`,
    },
  ];
}

export function synthesisPrompt(
  question: string,
  facts: FactsRecap,
  argumentSummary: string,
  conflictSummary: string,
  history: HistoryTurn[],
): ChatMessage[] {
  const historyText =
    history.length > 0
      ? "\n【追问历史：上一轮系统自己的回答摘要也一并考虑，避免丢失上文】\n" +
        history.map((h) => `问题：${h.question}\n上轮摘要：${h.summary}`).join("\n")
      : "";
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `第五步：综合结论 + 最小行动。${historyText}

用户问题：${question}
已确认事实：${facts.confirmedFacts.join("；") || "（无）"}
缺失信息：${facts.missingInfo.join("；") || "（无）"}

各模型推演摘要：
${argumentSummary}

交叉推演结果：
${conflictSummary}

要求：
1. conclusion：4-8 句综合结论，每句带 layer 标注。凡是没有数据支撑的具体数字，一律 layer=example_number 并注明"仅为说明方法的示例，不是推荐阈值"。
2. minimalAction：一个最小可执行动作 + 停止条件 + 观察窗口。其中具体数字同样必须标为示例（写进文本，例如"例如观察 8 周——仅为示例"）。

输出 JSON：
{
  "conclusion": [{ "layer": "inference", "text": "..." }],
  "minimalAction": {
    "action": "下一步最小动作",
    "stopCondition": "事前写下的、可检验的停止条件",
    "observationWindow": "观察窗口与预期（数字一律为示例）"
  }
}`,
    },
  ];
}
