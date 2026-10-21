/**
 * 核心数据模型 —— 认知脚手架 · 可溯源思考工作台
 *
 * 设计原则（对应 PRD 的"防黑盒"核心）：
 * 1. 每条输出语句都带 layer（五层标注），数字默认是示例；
 * 2. 整个推演过程（steps）全部留档，支持溯源回放；
 * 3. 认知账本保存"判断过程"，而不是聊天记录。
 */

/** 五层标注：区分一句话的"成色"，是防黑盒的核心机制之一 */
export type LayerKind =
  | "fact" // 用户已提供的事实
  | "inference" // 系统基于模型做出的推断
  | "assumption" // 尚未得到验证的假设
  | "missing" // 目前缺失的信息
  | "example_number"; // 仅为说明方法而举的例子，不是推荐阈值

/** 认知操作角色：这个模型在思考中承担什么动作（回应差评第 5 条） */
export type OpRole =
  | "find_problem" // 发现问题
  | "generate_explanation" // 生成解释
  | "verify_hypothesis" // 验证假设
  | "judge_probability" // 判断概率
  | "compare_options" // 比较选择
  | "check_bias" // 检查偏差
  | "analyze_dynamics"; // 分析动态系统

export const LAYER_LABELS: Record<LayerKind, string> = {
  fact: "事实",
  inference: "推断",
  assumption: "假设",
  missing: "缺失信息",
  example_number: "示例数字",
};

export const LAYER_NOTES: Record<LayerKind, string> = {
  fact: "来自你提供的信息",
  inference: "系统基于模型的推演",
  assumption: "尚未验证的假设",
  missing: "目前缺失、需要补充的信息",
  example_number: "仅为说明方法的示例，不是推荐阈值",
};

export const ROLE_LABELS: Record<OpRole, string> = {
  find_problem: "发现问题",
  generate_explanation: "生成解释",
  verify_hypothesis: "验证假设",
  judge_probability: "判断概率",
  compare_options: "比较选择",
  check_bias: "检查偏差",
  analyze_dynamics: "分析动态",
};

export interface SourceRef {
  label: string;
  kind: "book" | "paper" | "encyclopedia" | "course" | "article" | "talk";
  url?: string;
}

/** 模型库条目：可溯源，带认知操作角色与"要求用户执行的动作" */
export interface ModelDef {
  id: string;
  name: string;
  nameEn: string;
  role: OpRole;
  /** Scaffold Role：这个模型现在要求你执行什么思考动作 */
  scaffoldAction: string;
  definition: string;
  appliesWhen: string;
  failsWhen: string;
  tags: string[];
  /** 与之产生张力的模型 id（用于强制交叉推演） */
  tensionWith: string[];
  /** 谱系关系：与哪些概念同源/衍生/相关 */
  lineage: string;
  sources: SourceRef[];
}

export interface TaggedSentence {
  layer: LayerKind;
  text: string;
}

/** 第一步：事实收口 */
export interface FactsRecap {
  confirmedFacts: string[];
  missingInfo: string[];
  coreJudgment: string;
}

/** 第二步：模型选择（含检索/选择理由，供溯源） */
export interface ModelSelection {
  modelId: string;
  reason: string;
  source: "llm" | "library_tension";
}

/** 第三步：各模型独立推演 */
export interface ModelArgument {
  modelId: string;
  conclusion: TaggedSentence[];
  appliesWhen: string;
  failsWhen: string;
}

/** 第四步：交叉推演 */
export interface ConflictPoint {
  between: [string, string];
  statement: string;
  resolutionCondition: string;
}

export interface EvidenceCheckpoint {
  hypothesis: string;
  confirmingEvidence: string;
  disconfirmingEvidence: string;
}

/** 第五步：综合结论 + 最小行动 */
export interface MinimalAction {
  action: string;
  stopCondition: string;
  observationWindow: string;
}

/** 推演流水线步骤留档（溯源回放的数据源） */
export interface PipelineStep {
  key: string;
  title: string;
  status: "done" | "error";
  durationMs: number;
  /** 该步骤喂给模型/引擎的输入摘要（含历史上下文时可见，修复"追问丢失上一轮回答"的 bug） */
  inputSummary: string;
  output: unknown;
  error?: string;
}

export interface ReviewResult {
  actualOutcome: string;
  overturnedAssumptions: string[];
  confirmedAssumptions: string[];
  lesson: string;
  reviewedAt: string;
}

/** 认知账本条目：一次完整判断过程的快照 */
export interface AnalysisRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  question: string;
  extraFacts?: string;
  /** 追问链条：上一笔账本条目 id */
  followUpOf?: string;
  factsRecap: FactsRecap;
  selections: ModelSelection[];
  arguments: ModelArgument[];
  conflicts: ConflictPoint[];
  /** 当模型之间没有实质冲突时，必须明确说明"一致成立的条件"与"什么情况下会分歧" */
  agreementNote: string;
  checkpoints: EvidenceCheckpoint[];
  conclusion: TaggedSentence[];
  minimalAction: MinimalAction;
  steps: PipelineStep[];
  status: "open" | "reviewed";
  /** 本轮系统回答摘要：追问时作为"上一轮自己的回答"喂回上下文（修复差评第 1 条 bug） */
  summary?: string;
  review?: ReviewResult;
}

/** 追问上下文：包含上一轮系统自己的回答摘要（修复差评第 1 条 bug） */
export interface HistoryTurn {
  question: string;
  summary: string;
}

export const STORAGE_VERSION = 1;
