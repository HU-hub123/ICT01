/**
 * 大白话解释与学科分类（v0.6.0）
 *
 * 设计目标（回应用户要求"不要过度显示专业名词，显示也要有解释"）：
 * - 界面上优先展示一句大白话；
 * - 学术定义、信源等放在"展开详解"里；
 * - 领域分类用于模型库筛选（哲学 / 概率与统计 / 经济 / 心理 / 系统）。
 */

export type Discipline = "philosophy" | "statistics" | "economics" | "psychology" | "systems";

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  philosophy: "哲学",
  statistics: "概率与统计",
  economics: "经济与决策",
  psychology: "心理与认知",
  systems: "系统与动态",
};

/** 每个模型一句大白话（界面主展示） */
export const PLAIN: Record<string, string> = {
  "sunk-cost": "已经花掉的钱和时间，追不回来，别让它继续绑架你接下来的决定。",
  "escalation-of-commitment": "越亏越不肯停，往往是在跟自己证明「我没做错」。",
  "concorde-effect": "大项目收不了手，多半是因为「都投这么多了」。",
  "survivorship-bias": "只看活下来的成功者，等于把失败者藏起来了。",
  "confirmation-bias": "人会下意识地只找支持自己的证据。",
  anchoring: "第一个出现的数字，会悄悄把你后面的判断拽过去。",
  "hindsight-bias": "事后回看，谁都会觉得「我早就知道」。",
  "path-dependence": "早年的选择会越滚越大，今天的局面大半是历史攒出来的。",
  "learning-curve": "做得越多越熟练，效率会慢慢上来。",
  compounding: "小的好处反复累积，时间长了差距惊人。",
  "second-order-effects": "每个决定都有「然后呢」，间接后果常比直接后果大。",
  "network-effects": "用的人越多，这东西越好用。",
  "regression-to-mean": "极端表现之后往往自然回归平常，未必是谁做了干预。",
  "bayesian-updating": "有了新证据，就该按新证据调整原来的判断。",
  "counterfactual-thinking": "用「如果当初怎样」做个对照，才分得清多少是选择、多少是运气。",
  premortem: "行动前先设想失败，把可能的坑提前写下来。",
  "mvp-experiment": "别一次押上全部，先用最小代价验证核心假设。",
  falsification: "先说清楚「什么情况能证明我错」，才知道这事可不可检验。",
  "red-team": "专门找个人唱反调，比全是赞同的安全得多。",
  "base-rate": "先看这类事通常的发生率，再谈具体个案。",
  "expected-value": "算期望：每种结果乘上可能性再加起来，看值不值。",
  "tail-risk": "平均没事不代表安全，极少数极端情况可能直接掀桌。",
  "time-discounting": "人天生把眼前的好处看得过重，远期收益要主动折回来算。",
  "opportunity-cost": "每做一个选择，都在放弃另一个更好的可能。",
  "real-options": "不确定的时候，先花小钱买「以后还能改主意」的权利。",
  "exit-criteria": "动手之前先写死什么条件下必须停，免得到时候心软。",
  "decision-tree": "把选择和可能结果画成树，一层层倒推哪个更划算。",
  "feedback-loops": "结果会反过来影响原因，形成「越…越…」的循环。",
  "tipping-point": "有些事过了某个临界点，就会突然变天。",
  "problem-framing": "很多问题解不开，是因为一开始就问错了。",
  "control-dichotomy": "先分清哪些能改、哪些不能改，力气别浪费在不能改的地方。",
  "socratic-questioning": "不停追问「你凭什么这么想」，直到问题露出真面目。",
  "golden-mean": "两个极端之间，通常有一个恰到好处的度。",
  "occams-razor": "两种解释都成立时，先按简单的那个来。",
  "veil-of-ignorance": "换位思考：如果你可能站在任何一方，你会定什么规则？",
  "pragmatist-test": "别纠结「本质上对不对」，先看它用起来有没有效果。",
  "law-of-large-numbers": "次数够多，平均才会稳定；几次成败看不出规律。",
  "simpsons-paradox": "分组看都在变好，合起来却可能变差——人群比例在捣鬼。",
  "hypothesis-testing": "先假设没变化，再看数据像不像意外；像意外不等于一定有效。",
  "confidence-interval": "别只记一个数，要记一个范围：真实值大概在里面。",
  "monte-carlo": "算不清就随机模拟一万遍，看结果都落在哪。",
  "gamblers-fallacy": "连开五次大，下一次也不会因此更可能开小。",
};

export const DISCIPLINE: Record<string, Discipline> = {
  "sunk-cost": "psychology",
  "escalation-of-commitment": "psychology",
  "concorde-effect": "psychology",
  "survivorship-bias": "statistics",
  "confirmation-bias": "psychology",
  anchoring: "psychology",
  "hindsight-bias": "psychology",
  "path-dependence": "economics",
  "learning-curve": "economics",
  compounding: "economics",
  "second-order-effects": "systems",
  "network-effects": "economics",
  "regression-to-mean": "statistics",
  "bayesian-updating": "statistics",
  "counterfactual-thinking": "psychology",
  premortem: "psychology",
  "mvp-experiment": "economics",
  falsification: "philosophy",
  "red-team": "systems",
  "base-rate": "statistics",
  "expected-value": "statistics",
  "tail-risk": "statistics",
  "time-discounting": "economics",
  "opportunity-cost": "economics",
  "real-options": "economics",
  "exit-criteria": "economics",
  "decision-tree": "statistics",
  "feedback-loops": "systems",
  "tipping-point": "systems",
  "problem-framing": "philosophy",
  "control-dichotomy": "philosophy",
  "socratic-questioning": "philosophy",
  "golden-mean": "philosophy",
  "occams-razor": "philosophy",
  "veil-of-ignorance": "philosophy",
  "pragmatist-test": "philosophy",
  "law-of-large-numbers": "statistics",
  "simpsons-paradox": "statistics",
  "hypothesis-testing": "statistics",
  "confidence-interval": "statistics",
  "monte-carlo": "statistics",
  "gamblers-fallacy": "statistics",
};

export function getPlain(modelId: string): string {
  return PLAIN[modelId] ?? "";
}

export function getDiscipline(modelId: string): Discipline {
  return DISCIPLINE[modelId] ?? "psychology";
}
