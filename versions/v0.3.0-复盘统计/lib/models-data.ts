/**
 * 内置思维模型库（精选 30 个，可溯源）
 *
 * 每个模型包含：
 * - role: 认知操作角色（发现问题/生成解释/验证假设/判断概率/比较选择/检查偏差/分析动态）
 * - scaffoldAction: 该模型要求用户执行的思考动作（Scaffold Role）
 * - appliesWhen / failsWhen: 成立条件与失效边界
 * - tensionWith: 与之产生张力的模型（用于强制交叉推演）
 * - lineage: 谱系关系
 * - sources: 信源（书籍/论文/百科，可溯源）
 */

import type { ModelDef } from "./types";

export const MODELS: ModelDef[] = [
  {
    id: "sunk-cost",
    name: "沉没成本谬误",
    nameEn: "Sunk Cost Fallacy",
    role: "check_bias",
    scaffoldAction:
      "把已经不可追回的投入先拿掉，只比较“从今天开始”的未来收益与成本，再决定是否继续。",
    definition:
      "已发生且无法收回的投入（金钱、时间、情感）不应影响当前决策；决策只应取决于未来的边际收益与成本。",
    appliesWhen: "需要判断“要不要继续投入”，且已有部分投入无法收回时。",
    failsWhen:
      "投入仍可部分变现、或具有信号价值（声誉、学习），且未来前景确实依赖已建成的资产时，简单“清零”会误判。",
    tags: ["沉没成本", "继续投入", "止损", "放弃", "已经投入", "要不要继续"],
    tensionWith: ["path-dependence", "learning-curve", "real-options"],
    lineage:
      "与承诺升级、协和效应同属“过去投入绑架未来决策”这一认知机制的不同表现；与路径依赖、实物期权视角相对立。",
    sources: [
      {
        label: "Arkes & Blumer (1985), The psychology of sunk cost, OBHDP",
        kind: "paper",
        url: "https://doi.org/10.1016/0749-5978(85)90049-4",
      },
      { label: "Kahneman《思考，快与慢》(2011)", kind: "book" },
      {
        label: "Wikipedia: Sunk cost",
        kind: "encyclopedia",
        url: "https://en.wikipedia.org/wiki/Sunk_cost",
      },
    ],
  },
  {
    id: "escalation-of-commitment",
    name: "承诺升级",
    nameEn: "Escalation of Commitment",
    role: "check_bias",
    scaffoldAction:
      "把“继续投入”当作一个需要重新立项的新决策：如果这个项目是别人今天刚提给我的，我会不会投？",
    definition:
      "面对负面反馈时，决策者反而继续追加投入，以证明先前决策的正确性。",
    appliesWhen: "项目出现负反馈，但你或团队感到“已经走到这一步，不能停”时。",
    failsWhen: "负反馈只是短期波动、且项目临近关键里程碑时，一律撤退同样可能错误。",
    tags: ["承诺升级", "追加投入", "骑虎难下", "证明自己", "越陷越深"],
    tensionWith: ["exit-criteria", "sunk-cost"],
    lineage: "与沉没成本谬误、协和效应同族；常与“自我辩护”动机绑定。",
    sources: [
      {
        label: "Staw (1976), Knee-deep in the big muddy, OBHDP",
        kind: "paper",
        url: "https://doi.org/10.1016/0030-5073(76)90005-2",
      },
      {
        label: "Bazerman & Moore《Judgment in Managerial Decision Making》",
        kind: "book",
      },
    ],
  },
  {
    id: "concorde-effect",
    name: "协和效应",
    nameEn: "Concorde Effect",
    role: "check_bias",
    scaffoldAction:
      "问自己：如果当初没有投入任何成本，我今天还会启动这件事吗？答案是不会，就停。",
    definition:
      "以协和式超音速客机命名的沉没成本变体：明知经济上不可行，仍因巨额已投入而坚持完成。",
    appliesWhen: "大型长期项目明知前景恶化，仍被“不能浪费已投入”驱动时。",
    failsWhen: "项目存在外部约束（合同、监管、战略价值）时，纯经济逻辑不完整。",
    tags: ["协和效应", "骑虎难下", "大项目", "收不了手"],
    tensionWith: ["exit-criteria"],
    lineage: "沉没成本谬误在大项目上的命名变体。",
    sources: [
      {
        label: "Wikipedia: Concorde fallacy",
        kind: "encyclopedia",
        url: "https://en.wikipedia.org/wiki/Sunk_cost#Concorde_effect",
      },
      { label: "英法协和式超音速客机项目案例", kind: "article" },
    ],
  },
  {
    id: "survivorship-bias",
    name: "幸存者偏差",
    nameEn: "Survivorship Bias",
    role: "check_bias",
    scaffoldAction:
      "先问“失败者样本在哪”：把没有活下来、没有被看到的那部分样本补进统计，再下结论。",
    definition:
      "只依据“存活下来/被看见”的样本下结论，忽略了被淘汰样本携带的信息。",
    appliesWhen: "从成功案例、榜单、畅销书里归纳规律时。",
    failsWhen: "研究对象本身没有“淘汰”过程（如全体历史数据）时。",
    tags: ["幸存者偏差", "成功学", "榜单", "案例归纳", "沉默的证据"],
    tensionWith: ["base-rate"],
    lineage: "选择性偏差（selection bias）家族。",
    sources: [
      { label: "Taleb《随机漫步的傻瓜》(2001)", kind: "book" },
      {
        label: "Abraham Wald 二战飞机装甲案例",
        kind: "article",
        url: "https://en.wikipedia.org/wiki/Survivorship_bias",
      },
    ],
  },
  {
    id: "confirmation-bias",
    name: "确认偏差",
    nameEn: "Confirmation Bias",
    role: "check_bias",
    scaffoldAction:
      "主动列出三个“如果我是错的，会看到什么”，然后去找反例，而不是找支持。",
    definition:
      "人们倾向于搜寻、解释、记忆支持既有信念的信息，忽略相反证据。",
    appliesWhen: "你对一个问题已有倾向或立场，开始“找依据”时。",
    failsWhen: "已主动引入对立信息源与证伪检验时，该偏差被部分控制。",
    tags: ["确认偏差", "找证据", "立场", "只听想听的", "偏见"],
    tensionWith: ["falsification", "bayesian-updating", "premortem"],
    lineage: "与动机性推理同族；与贝叶斯更新互为镜像。",
    sources: [
      {
        label: "Wason (1960), 2-4-6 推理实验, QJEP",
        kind: "paper",
        url: "https://doi.org/10.1080/17470216008416717",
      },
      { label: "Kahneman《思考，快与慢》(2011)", kind: "book" },
    ],
  },
  {
    id: "anchoring",
    name: "锚定效应",
    nameEn: "Anchoring",
    role: "check_bias",
    scaffoldAction:
      "把第一个出现的数字标为“锚”，然后只依据独立数据重新估计一遍，看两次结果差多少。",
    definition:
      "初始出现的数值会不成比例地影响后续估计，即使它明显无关。",
    appliesWhen: "接触过价格、估值、预算、时间预期等具体数字之后再做判断时。",
    failsWhen: "决策者对该领域有强经验基准、且被明确提示忽略锚点时，影响减弱。",
    tags: ["锚定", "初始报价", "估值", "预算", "数字影响"],
    tensionWith: ["base-rate"],
    lineage: "启发式与偏差家族（Tversky & Kahneman）。",
    sources: [
      {
        label: "Tversky & Kahneman (1974), Judgment under Uncertainty, Science",
        kind: "paper",
        url: "https://doi.org/10.1126/science.185.4157.1124",
      },
    ],
  },
  {
    id: "hindsight-bias",
    name: "事后诸葛偏差",
    nameEn: "Hindsight Bias",
    role: "check_bias",
    scaffoldAction:
      "复盘时先写下“当时我认为会发生什么”，再对比实际；禁止用结果倒推“我早就知道”。",
    definition: "事件发生后，人们高估自己事前预测到它的程度（“我早就知道”）。",
    appliesWhen: "复盘失败、意外结果、评估他人决策时。",
    failsWhen:
      "有当时的书面记录（预测日志）做对照时，偏差可被显著削弱——这正是认知账本存在的理由。",
    tags: ["事后诸葛", "复盘", "我早就知道", "事后聪明", "归因"],
    tensionWith: ["premortem"],
    lineage: "与记忆重构机制相关；事前验尸是其预防性镜像。",
    sources: [
      {
        label: "Fischhoff (1975), Hindsight ≠ foresight, JEP:HPP",
        kind: "paper",
        url: "https://doi.org/10.1037/0096-1523.1.3.288",
      },
      { label: "Kahneman《思考，快与慢》(2011)", kind: "book" },
    ],
  },
  {
    id: "path-dependence",
    name: "路径依赖",
    nameEn: "Path Dependence",
    role: "generate_explanation",
    scaffoldAction:
      "画出“今天的状态是哪些历史选择积累出来的”，区分哪些积累是可复用资产、哪些只是惯性。",
    definition:
      "历史选择会锁定后续选项：早期的小差异经由自我强化机制（学习、规模、兼容）放大为长期结构差异。",
    appliesWhen: "存量优势可能随历史积累不断放大（用户习惯、技能、生态兼容）时。",
    failsWhen: "环境发生结构性变化、或存在可低成本绕过历史包袱的新技术时，惯性会被打破。",
    tags: ["路径依赖", "历史积累", "惯性", "锁定", "存量"],
    tensionWith: ["sunk-cost", "real-options"],
    lineage:
      "与沉没成本谬误构成真张力：同样的“已投入”，一个说是幻觉、一个说是资产。",
    sources: [
      {
        label: "Paul David (1985), Clio and the Economics of QWERTY, AER",
        kind: "paper",
        url: "https://doi.org/10.2307/1805621",
      },
      {
        label: "W. Brian Arthur (1989), Increasing Returns and Path Dependence, EJ",
        kind: "paper",
        url: "https://doi.org/10.2307/2234072",
      },
    ],
  },
  {
    id: "learning-curve",
    name: "学习曲线",
    nameEn: "Learning Curve",
    role: "generate_explanation",
    scaffoldAction:
      "把“当前效率低”拆成两部分：是学习积累未到位（会改善），还是结构性劣势（不会改善），各列证据。",
    definition:
      "随着累计产量/练习增加，单位成本或效率按可预测速率改善（经验曲线）。",
    appliesWhen: "效率或留存随累计使用量变化、且存在技能/工艺积累机制时。",
    failsWhen: "改善来自随机波动或外部因素（均值回归）、或已进入平台期时。",
    tags: ["学习曲线", "熟能生巧", "积累", "效率提升", "爬坡"],
    tensionWith: ["sunk-cost", "regression-to-mean"],
    lineage: "与均值回归构成“真提升 vs 假改善”的判读张力。",
    sources: [
      {
        label: "Wright (1936), Factors Affecting the Cost of Airplanes",
        kind: "paper",
        url: "https://doi.org/10.2514/8.155",
      },
      {
        label: "Boston Consulting Group 经验曲线概念 (1966)",
        kind: "article",
        url: "https://en.wikipedia.org/wiki/Experience_curve_effects",
      },
    ],
  },
  {
    id: "compounding",
    name: "复利效应",
    nameEn: "Compounding",
    role: "generate_explanation",
    scaffoldAction:
      "把一个小改进乘以时间/复利系数，估算“坚持下去”的终值；也用它反向检验“现在放弃”的机会成本。",
    definition: "增长会自我累积（收益产生收益），长期看，微小持续改进带来非线性回报。",
    appliesWhen: "回报可再投入（资金、技能、内容、用户增长）时。",
    failsWhen: "增长率不可持续、存在天花板或衰减机制（均值回归、平台期）时。",
    tags: ["复利", "长期主义", "积累", "增长", "坚持"],
    tensionWith: [],
    lineage: "与学习曲线、路径依赖同属“积累类”解释模型。",
    sources: [
      { label: "Munger《穷查理宝典》(2005)", kind: "book" },
      { label: "巴菲特致股东信（复利论述）", kind: "article" },
    ],
  },
  {
    id: "second-order-effects",
    name: "二阶效应",
    nameEn: "Second-Order Effects",
    role: "generate_explanation",
    scaffoldAction:
      "每个方案至少追问一层“然后呢”：除了直接效果，谁会被间接影响、会做出什么反应。",
    definition:
      "决策不仅有一阶直接后果，还会触发他人反应与系统调整，二阶后果常与直觉相反。",
    appliesWhen: "方案会影响他人激励、市场、生态系统时。",
    failsWhen: "链式推演过长会退化为空想，应只推 1-2 层并标注为假设。",
    tags: ["二阶效应", "然后呢", "连锁反应", "副作用", "间接影响"],
    tensionWith: [],
    lineage: "系统思考家族。",
    sources: [
      { label: "Munger《穷查理宝典》(2005)", kind: "book" },
      {
        label: "Hayek (1945), The Use of Knowledge in Society, AER",
        kind: "paper",
        url: "https://doi.org/10.2307/1809376",
      },
    ],
  },
  {
    id: "network-effects",
    name: "网络效应",
    nameEn: "Network Effects",
    role: "generate_explanation",
    scaffoldAction:
      "判断“产品价值是否随用户数上升”：列出每个新用户给存量用户带来的增量价值。",
    definition:
      "产品或服务的价值随使用者数量增加而上升（直接/间接/双边网络效应）。",
    appliesWhen: "评估产品增长、平台、社区、通讯类产品时。",
    failsWhen: "网络拥挤、质量稀释（反网络效应），或多归属成本低使规模不构成壁垒时。",
    tags: ["网络效应", "平台", "用户增长", "生态", "壁垒"],
    tensionWith: [],
    lineage: "与路径依赖、临界点密切联动。",
    sources: [
      { label: "Shapiro & Varian《Information Rules》(1999)", kind: "book" },
      {
        label: "Wikipedia: Metcalfe's law",
        kind: "encyclopedia",
        url: "https://en.wikipedia.org/wiki/Metcalfe%27s_law",
      },
    ],
  },
  {
    id: "regression-to-mean",
    name: "均值回归",
    nameEn: "Regression to the Mean",
    role: "generate_explanation",
    scaffoldAction:
      "任何“改善/恶化”都要先问一句：这在多大程度上只是向长期均值的回归，而不是干预的效果？",
    definition:
      "极端表现倾向于向平均水平回归；极端值多半伴随测量噪声或暂时性因素。",
    appliesWhen: "解读连续观察中的异常波动（留存、成绩、业绩）时。",
    failsWhen: "系统发生结构性变化（相变）时，均值本身在移动。",
    tags: ["均值回归", "波动", "偶然", "假改善", "统计"],
    tensionWith: ["learning-curve", "tipping-point"],
    lineage: "与学习曲线构成“改善是积累还是回归”的核心张力。",
    sources: [
      {
        label: "Galton (1886), Regression towards mediocrity",
        kind: "paper",
        url: "https://doi.org/10.2307/2841583",
      },
      { label: "Kahneman《思考，快与慢》(2011)", kind: "book" },
    ],
  },
  {
    id: "bayesian-updating",
    name: "贝叶斯更新",
    nameEn: "Bayesian Updating",
    role: "verify_hypothesis",
    scaffoldAction:
      "写下先验概率（我现在认为的可能性），再对新证据逐条问：这条证据应该把概率往哪边、改多少？",
    definition: "用新证据按贝叶斯规则更新信念：后验 ∝ 先验 × 证据似然。",
    appliesWhen: "有初始判断、且新证据陆续到来，需要量化“新证据改变多少判断”时。",
    failsWhen: "证据本身不可靠、或先验被锚定过强拒绝更新（确认偏差）时。",
    tags: ["贝叶斯", "先验", "新证据", "概率更新", "改变判断"],
    tensionWith: ["confirmation-bias"],
    lineage: "与确认偏差互为镜像；“什么证据会改变我的判断”是其操作化形式。",
    sources: [
      { label: "Bayes (1763), An Essay towards solving a Problem", kind: "paper" },
      { label: "McElreath《Statistical Rethinking》(2020)", kind: "book" },
    ],
  },
  {
    id: "counterfactual-thinking",
    name: "反事实思维",
    nameEn: "Counterfactual Thinking",
    role: "verify_hypothesis",
    scaffoldAction:
      "构造“如果当初选了另一条路，现在会怎样”的最小对照版本，检验当前结果有多少归因于选择本身。",
    definition: "通过想象与事实相反的替代情景，分离因果与运气。",
    appliesWhen: "需要评估某个决策的因果贡献、或比较“做了 vs 没做”时。",
    failsWhen: "反事实构造过于随意（无数可能世界）、沦为“事后诸葛”时。",
    tags: ["反事实", "如果当初", "对照", "因果", "归因"],
    tensionWith: [],
    lineage: "与事前验尸共用一个“替代世界”工具，方向相反。",
    sources: [
      {
        label: "Roese (1997), Counterfactual thinking, Psychological Bulletin",
        kind: "paper",
        url: "https://doi.org/10.1037/0033-2909.121.1.133",
      },
    ],
  },
  {
    id: "premortem",
    name: "事前验尸",
    nameEn: "Premortem",
    role: "verify_hypothesis",
    scaffoldAction:
      "假设项目已经失败一年了，写一段“死因报告”，再从报告反推现在要防什么。",
    definition:
      "在行动前预先想象失败已经发生并解释原因，以暴露计划中的盲点（Prospective Hindsight）。",
    appliesWhen: "启动重要计划、投资、项目前，团队信心很高时。",
    failsWhen: "只停在“想象灾难”而不转化为前置检查清单时。",
    tags: ["事前验尸", "死因报告", "防失败", "计划", "盲点"],
    tensionWith: ["hindsight-bias"],
    lineage: "与事后诸葛偏差互为镜像：一个是事前想象的失败，一个是事后高估的预见。",
    sources: [
      {
        label: "Gary Klein (2007), Performing a Project Premortem, HBR",
        kind: "article",
        url: "https://hbr.org/2007/09/performing-a-project-premortem",
      },
    ],
  },
  {
    id: "mvp-experiment",
    name: "最小可行实验",
    nameEn: "Minimum Viable Experiment",
    role: "verify_hypothesis",
    scaffoldAction:
      "把“要不要上”翻译成“花最小成本可以验证什么假设”，设计一个最小实验并预设判定标准。",
    definition:
      "以最小成本构建可运行的实验对象，验证价值/增长假设（Build-Measure-Learn）。",
    appliesWhen: "假设可被小成本实验证伪、决策可逆时。",
    failsWhen: "实验成本高、周期长、或决策不可逆时，应改用其他估值工具。",
    tags: ["最小可行", "实验", "验证", "MVP", "试错"],
    tensionWith: ["real-options"],
    lineage: "精益创业家族；与实物期权共享“小成本保留选择权”的思想。",
    sources: [{ label: "Eric Ries《精益创业》(2011)", kind: "book" }],
  },
  {
    id: "falsification",
    name: "证伪检验",
    nameEn: "Falsification",
    role: "verify_hypothesis",
    scaffoldAction:
      "明确写出“什么观察结果会证明我是错的”，并把它设为一个可以检验的停止条件。",
    definition: "科学陈述必须有可证伪性：能被观察推翻的命题才有信息量。",
    appliesWhen: "判断一个说法是否可检验、或设计验证方案时。",
    failsWhen: "命题不可检验（价值判断、定义问题）时，证伪标准不适用。",
    tags: ["证伪", "可检验", "什么能证明我错", "科学方法"],
    tensionWith: ["confirmation-bias"],
    lineage: "波普尔批判理性主义；“证据检查点”是该模型的产品化形式。",
    sources: [{ label: "Popper《猜想与反驳》(1963)", kind: "book" }],
  },
  {
    id: "red-team",
    name: "红队反向推演",
    nameEn: "Red Team",
    role: "verify_hypothesis",
    scaffoldAction:
      "扮演最希望方案失败的对手，用对手最强的论据攻击方案，再决定方案是否需要加固或放弃。",
    definition: "成立独立于执行团队的反方，系统性寻找方案弱点（源自军事红队）。",
    appliesWhen: "决策影响大、执行团队同质且高度一致时。",
    failsWhen: "红队只是走过场、没有否决权时，只会制造虚假安全感。",
    tags: ["红队", "唱反调", "反对派", "攻击方案", "压力测试"],
    tensionWith: [],
    lineage: "与魔鬼代言人、事前验尸同族。",
    sources: [{ label: "Micah Zenko《Red Team》(2015)", kind: "book" }],
  },
  {
    id: "base-rate",
    name: "基本比率",
    nameEn: "Base Rate",
    role: "judge_probability",
    scaffoldAction:
      "先问“这类事情的平均发生率是多少”，把个案细节叠加上去，而不是让细节淹没基础概率。",
    definition: "判断个体概率时，应从总体基础概率出发，再用具体信息修正。",
    appliesWhen: "有个案生动信息、且存在可得的总体统计时。",
    failsWhen: "总体统计与当前个案不属同一参考类时，基础概率会误导。",
    tags: ["基本比率", "先验概率", "平均发生率", "统计"],
    tensionWith: ["anchoring", "survivorship-bias"],
    lineage: "与贝叶斯更新共用“先验”概念。",
    sources: [
      {
        label: "Kahneman & Tversky (1973), On the psychology of prediction",
        kind: "paper",
        url: "https://doi.org/10.1037/h0034747",
      },
      { label: "Kahneman《思考，快与慢》(2011)", kind: "book" },
    ],
  },
  {
    id: "expected-value",
    name: "期望值分析",
    nameEn: "Expected Value",
    role: "judge_probability",
    scaffoldAction:
      "列出每个选项的可能结果×概率，计算期望值；并单独看“最坏结果我是否承受得起”。",
    definition: "期望值 = 各结果的价值 × 概率之和；长期决策按期望值而非单次结果评估。",
    appliesWhen: "可列出主要结果及其概率/价值，且决策会重复发生时。",
    failsWhen: "概率无法估计、或单次决策的最坏结果不可承受（尾部风险主导）时。",
    tags: ["期望值", "概率", "收益", "风险", "算账"],
    tensionWith: ["tail-risk"],
    lineage: "与尾部风险构成“均值 vs 极端”张力。",
    sources: [
      { label: "Pascal《思想录》赌注论证 (1670)", kind: "book" },
      { label: "Taleb《随机漫步的傻瓜》(2001)", kind: "book" },
    ],
  },
  {
    id: "tail-risk",
    name: "尾部风险",
    nameEn: "Tail Risk",
    role: "judge_probability",
    scaffoldAction:
      "不看平均，只看分布最坏的 1%：极端结果一旦发生能否承受，是否需要为它单独上保险或改方案。",
    definition: "分布尾部的极端稀有事件，其影响常超过所有常规波动之和（黑天鹅）。",
    appliesWhen: "后果不可逆、分布肥尾（金融、安全、供应链）时。",
    failsWhen: "为极低概率事件过度防御、成本高于其期望损失时。",
    tags: ["尾部风险", "黑天鹅", "极端情况", "最坏结果", "保险"],
    tensionWith: ["expected-value"],
    lineage: "与均值回归构成“平均世界 vs 极端世界”的认知光谱。",
    sources: [{ label: "Taleb《黑天鹅》(2007)", kind: "book" }],
  },
  {
    id: "time-discounting",
    name: "时间折现",
    nameEn: "Time Discounting",
    role: "judge_probability",
    scaffoldAction:
      "把未来收益/成本按折现率换算成今天的价值再比较，并检查自己是否把“短期痛”看得过重、“长期利”看得过轻。",
    definition: "人们倾向于对远期收益/成本打折，且折扣往往过大（现时偏差）。",
    appliesWhen: "比较“立即的小回报 vs 延迟的大回报”、评估长期投入时。",
    failsWhen: "折现率设定随意、或对象是价值判断（如健康、亲情）时，纯折现会误导。",
    tags: ["折现", "短视", "拖延", "长期", "及时行乐"],
    tensionWith: [],
    lineage: "与复利效应是同一枚硬币的两面。",
    sources: [
      {
        label: "Frederick et al. (2002), Time Discounting and Time Preference, JEL",
        kind: "paper",
        url: "https://doi.org/10.1257/002205102320161311",
      },
    ],
  },
  {
    id: "opportunity-cost",
    name: "机会成本",
    nameEn: "Opportunity Cost",
    role: "compare_options",
    scaffoldAction:
      "每做一个选择，明确写下“被放弃的最好替代方案是什么”，并把它计入成本。",
    definition: "成本是所放弃的最好替代用途的价值，而不是账面支出。",
    appliesWhen: "资源（时间、钱、精力）有多个备选用途时。",
    failsWhen: "替代用途不可比（不可通约的价值）时，精确量化反而失真。",
    tags: ["机会成本", "放弃", "替代方案", "时间成本", "选择"],
    tensionWith: [],
    lineage: "经济学核心概念；与沉没成本恰好相对：一个看放弃的未来，一个看沉没的过去。",
    sources: [
      {
        label: "Ferraro & Taylor (2005), Do Economists Recognize an Opportunity Cost?",
        kind: "paper",
        url: "https://doi.org/10.1257/089533005775201146",
      },
      { label: "Mankiw《经济学原理》", kind: "book" },
    ],
  },
  {
    id: "real-options",
    name: "实物期权",
    nameEn: "Real Options",
    role: "compare_options",
    scaffoldAction:
      "把“大决定”拆成“先买一个小期权”：花小成本保留未来再决定的权利，并明确何时行使、何时放弃。",
    definition:
      "将金融期权思想用于实物投资：在不确定下，延迟、分阶段、小步投入本身有价值。",
    appliesWhen: "不确定性高、决策可逆、可以小成本保留选择权时。",
    failsWhen: "窗口期会关闭、或“等待”本身的成本超过期权价值时。",
    tags: ["实物期权", "期权", "小成本试", "分阶段", "保留选择权"],
    tensionWith: ["sunk-cost", "mvp-experiment"],
    lineage: "与最小可行实验共享“分阶段投入”逻辑；与沉没成本视角对立。",
    sources: [
      {
        label: "Myers (1977), Determinants of Corporate Borrowing, JFE",
        kind: "paper",
        url: "https://doi.org/10.1016/0304-405X(77)90015-0",
      },
      { label: "Dixit & Pindyck《Investment under Uncertainty》(1994)", kind: "book" },
    ],
  },
  {
    id: "exit-criteria",
    name: "终止标准",
    nameEn: "Exit Criteria",
    role: "compare_options",
    scaffoldAction:
      "在开始之前写下具体的退出条件（什么指标、什么时间窗、什么水平），达到即执行，不用再开会。",
    definition:
      "事前设定的可检验退出条件，用于对抗“继续下去”的惯性（Stop-Loss / Pivot-or-Persevere）。",
    appliesWhen: "投入不可逆、且“何时停”将由情绪决定时。",
    failsWhen: "标准定得过窄/过宽，或没有绑定观察窗口，就失去约束力。",
    tags: ["终止标准", "止损", "退出条件", "什么时候停", "放弃"],
    tensionWith: ["escalation-of-commitment", "concorde-effect"],
    lineage: "与证伪检验共享“预设可检验条件”的思想；沉没成本谬误的解药。",
    sources: [
      { label: "Annie Duke《Quit》(2022)", kind: "book" },
      { label: "Eric Ries《精益创业》Pivot-or-Persevere", kind: "book" },
    ],
  },
  {
    id: "decision-tree",
    name: "决策树",
    nameEn: "Decision Tree",
    role: "compare_options",
    scaffoldAction:
      "把决策画成树：决策节点（我能选什么）、机会节点（会发生什么、概率多少）、终端价值，再倒推最优路径。",
    definition: "用树状图结构化多阶段决策，结合概率与价值倒推（Rollback）最优选择。",
    appliesWhen: "决策有明确阶段、分支与可估概率时。",
    failsWhen: "分支过多导致虚假精确、概率纯属猜测时，树会“看起来很理性”但无信息量。",
    tags: ["决策树", "分支", "倒推", "路径", "结构化决策"],
    tensionWith: [],
    lineage: "与期望值分析共用概率-价值框架。",
    sources: [{ label: "Raiffa《Decision Analysis》(1968)", kind: "book" }],
  },
  {
    id: "feedback-loops",
    name: "反馈回路",
    nameEn: "Feedback Loops",
    role: "analyze_dynamics",
    scaffoldAction:
      "画出回路：结果如何反过来强化或抑制原因（正/负反馈），判断系统是自我放大还是自我校正。",
    definition: "系统的输出会回流为输入，形成强化（正反馈）或平衡（负反馈）回路。",
    appliesWhen: "现象随时间自我强化或自我抑制（口碑、恐慌、通胀、生态）时。",
    failsWhen: "把一次性的因果误读成回路、或忽略回路间的延迟时。",
    tags: ["反馈回路", "正反馈", "负反馈", "循环", "系统"],
    tensionWith: ["regression-to-mean"],
    lineage: "系统动力学家族；与临界点联动。",
    sources: [
      { label: "Meadows《Thinking in Systems》(2008)", kind: "book" },
      { label: "Forrester 系统动力学", kind: "course" },
    ],
  },
  {
    id: "tipping-point",
    name: "临界点",
    nameEn: "Tipping Point",
    role: "analyze_dynamics",
    scaffoldAction:
      "判断系统是否接近阈值：超过某个临界值后行为会不可逆地切换到新状态，找出最接近的先行指标。",
    definition: "系统在临界阈值附近发生非线性的、常不可逆的状态跃迁。",
    appliesWhen: "现象可能突然爆发（采用率、舆论、生态突变）且观察到加速信号时。",
    failsWhen: "把普通波动误读为临界点、或线性外推忽视阈值时。",
    tags: ["临界点", "引爆点", "阈值", "突变", "转折"],
    tensionWith: ["regression-to-mean"],
    lineage: "与均值回归构成“线性世界 vs 非线性世界”张力。",
    sources: [
      { label: "Gladwell《引爆点》(2000)", kind: "book" },
      {
        label: "Schelling (1971), Dynamic Models of Segregation",
        kind: "paper",
        url: "https://doi.org/10.1080/0022250X.1971.9989794",
      },
    ],
  },
  {
    id: "problem-framing",
    name: "问题框定",
    nameEn: "Problem Framing",
    role: "find_problem",
    scaffoldAction:
      "在解问题之前先问“这到底是什么问题”：用三种不同方式重新表述问题，看答案是否跟着改变。",
    definition: "问题的表述方式（框架）决定了解空间；多数“解不开”其实是“问错了”。",
    appliesWhen: "讨论陷入僵局、答案互相矛盾、或“大家都同意但就是没进展”时。",
    failsWhen: "问题定义清晰且约束真实时，反复重构只是拖延。",
    tags: ["问题框定", "换个问法", "定义问题", "重构", "前提"],
    tensionWith: [],
    lineage: "设计思维与决策科学交汇处。",
    sources: [
      {
        label: "Rittel & Webber (1973), Dilemmas in a General Theory of Planning",
        kind: "paper",
        url: "https://doi.org/10.1007/BF01405730",
      },
    ],
  },
];

export const MODEL_MAP: Record<string, ModelDef> = Object.fromEntries(
  MODELS.map((m) => [m.id, m]),
);

/** 按认知操作角色分组 */
export const MODELS_BY_ROLE = MODELS.reduce<Record<string, ModelDef[]>>(
  (acc, m) => {
    (acc[m.role] ??= []).push(m);
    return acc;
  },
  {},
);
