/**
 * 认知脚手架 · 确定性断言检查
 *
 * 设计原则：
 * - 只检查「可机检」的东西：结构完整性、五层标注、示例数字合规、张力对、缺失信息覆盖、停止条件可检验、过度断言；
 * - 不判断"内容好不好"（那交给人工或 LLM 评审，见 eval/judge.mjs）；
 * - 不依赖被测系统内部代码，只吃 /api/analyze 的 JSON 输出 + /api/models 的模型库。

引号内为可配置阈值，默认值见文件末尾 DEFAULTS。
 */

const LAYERS = new Set(["fact", "inference", "assumption", "missing", "example_number"]);

export const DEFAULTS = {
  minConclusion: 3,
  minDistinctLayers: 2,
  minStopConditionLen: 12,
  maxMissingInfoWhenNoFacts: 0, // 只用于检查「没给事实时缺失信息是否被列出」
  minMissingWhenNoFacts: 3,
};

/** 数字示例化检查：无依据的数字必须被显式标注为示例 */
export function checkExampleNumbers(record) {
  const allowed = new Set();
  const source = `${record.question || ""} ${record.extraFacts || ""}`;
  for (const m of source.matchAll(/\d+(?:\.\d+)?/g)) allowed.add(m[0]);

  const texts = [];
  for (const s of record.conclusion || []) texts.push(s.text || "");
  for (const a of record.arguments || []) {
    for (const s of a.conclusion || []) texts.push(s.text || "");
  }
  const hasExampleFlag = (t) =>
    /示例|比如|例如|如[「"“]|仅|假设|约|大约|左右|示意|举例/.test(t);

  /** 归一化：去掉序号、年份、区间、序数、时间点标记、历史数据区间、举例式数字——这些不是"精确数字断言" */
  const normalize = (t) =>
    t
      .replace(/[（(]\s*\d{1,2}\s*[）)]/g, " ")
      .replace(/(^|\s)\d{1,2}[、.)]\s*/g, " ")
      .replace(/第\s*\d+\s*(个|条|步|次|轮|位|月|年|周|天)/g, " ")
      .replace(/(19|20)\d{2}\s*年/g, " ")
      .replace(/\d+(?:\.\d+)?\s*[-–~至到]\s*\d+(?:\.\d+)?/g, " ")
      // 历史数据请求（过去 6 个月、近 12 个月）
      .replace(/(过去|近|最近|前)\s*\d+(?:\.\d+)?\s*(个)?(月|年|周|天)/g, " ")
      // 举例式表达（如 6 个月、12 个月）——注意排除「如果…」这种条件句
      .replace(/如(?!果)[^。；;，,）)]*/g, " ")
      .replace(/例如[^。；;，,）)]*/g, " ");

  const offenders = [];
  for (const t of texts) {
    const clean = normalize(t);
    const nums = [...clean.matchAll(/\d+(?:\.\d+)?/g)].map((m) => m[0]);
    if (nums.length === 0) continue;
    if (hasExampleFlag(t)) continue;
    const unverified = nums.filter((n) => !allowed.has(n));
    if (unverified.length > 0) offenders.push({ text: t.slice(0, 80), numbers: unverified });
  }
  return offenders;
}

/** 张力对检查：选中的模型之间必须至少有一对库内 tensionWith 关系 */
export function checkTension(record, models) {
  const ids = (record.selections || []).map((s) => s.modelId);
  const map = new Map(models.map((m) => [m.id, m]));
  for (const a of ids) {
    const ma = map.get(a);
    if (!ma) continue;
    for (const b of ids) {
      if (a === b) continue;
      if ((ma.tensionWith || []).includes(b)) return { ok: true, pair: [a, b] };
    }
  }
  return { ok: false, pair: null };
}

/** 缺失信息关键词覆盖：expect.missingGroups 每组至少命中一个词 */
export function checkMissingGroups(record, groups = []) {
  const text = (record.factsRecap?.missingInfo || []).join("；");
  const results = groups.map((group) => ({
    group,
    hit: group.some((kw) => text.includes(kw)),
  }));
  return {
    ok: results.every((r) => r.hit),
    results,
  };
}

/** 停止条件是否可检验（含阈值/触发词，而不是空话） */
export function checkStopCondition(record) {
  const s = record.minimalAction?.stopCondition || "";
  const measurable = /若|如果|当|达到|低于|高于|超过|连续|出现|未|无法|没有|触发|低于|下降/.test(s);
  return {
    ok: s.length >= DEFAULTS.minStopConditionLen && measurable,
    text: s.slice(0, 100),
  };
}

/** 过度断言检查：结论里不允许出现绝对化断言（注意排除「不一定」「绝对值」等中性用法） */
export function checkOverclaim(record) {
  const text = (record.conclusion || []).map((s) => s.text || "").join("；");
  const patterns = [
    /(?<!不)一定(会|能|可以|成功|有效|正确)/,
    /必然(会|是|导致|成功)/,
    /保证(能|会|成功|不会)/,
    /稳赚|百分之百|绝对(会|能|可以|正确|成功|赢)/,
    /肯定(会|能|可以)/,
  ];
  for (const re of patterns) {
    const m = re.exec(text);
    if (m) return { ok: false, hit: m[0] };
  }
  return { ok: true, hit: null };
}

/** 结构完整性 */
export function checkStructure(record) {
  const issues = [];
  const fr = record.factsRecap || {};
  if (!Array.isArray(fr.confirmedFacts)) issues.push("confirmedFacts 不是数组");
  if (!Array.isArray(fr.missingInfo)) issues.push("missingInfo 不是数组");
  if (typeof fr.coreJudgment !== "string" || !fr.coreJudgment) issues.push("coreJudgment 缺失");

  const selections = record.selections || [];
  if (selections.length < 2 || selections.length > 4) issues.push(`selection 数量 ${selections.length}（应为 2-4）`);

  const conclusion = record.conclusion || [];
  const layers = conclusion.map((s) => s.layer);
  if (conclusion.length < DEFAULTS.minConclusion) issues.push(`结论句数 ${conclusion.length} < ${DEFAULTS.minConclusion}`);
  const badLayers = layers.filter((l) => !LAYERS.has(l));
  if (badLayers.length) issues.push(`非法 layer: ${badLayers.join(",")}`);
  const distinct = new Set(layers);
  if (distinct.size < DEFAULTS.minDistinctLayers) issues.push(`layer 种类 ${distinct.size} < ${DEFAULTS.minDistinctLayers}`);
  if (!distinct.has("inference")) issues.push("结论缺少 inference 层");

  const ma = record.minimalAction || {};
  if (!ma.action) issues.push("minimalAction.action 缺失");
  if (!ma.observationWindow) issues.push("minimalAction.observationWindow 缺失");

  const conflicts = record.conflicts || [];
  const agreement = record.agreementNote || "";
  if (conflicts.length === 0 && agreement.length < 10) issues.push("无冲突且无一致说明");

  const checkpoints = record.checkpoints || [];
  if (checkpoints.length === 0) issues.push("缺少证据检查点");

  return { ok: issues.length === 0, issues };
}

/** 汇总：跑完所有断言，返回 {checks, passed, total} */
export function runChecks(record, kase, models) {
  const checks = [];
  const add = (name, ok, detail = "") => checks.push({ name, ok, detail });

  const st = checkStructure(record);
  add("结构完整", st.ok, st.issues.join("; "));

  const tensionRequired = kase?.expect?.tensionRequired !== false;
  const tension = checkTension(record, models);
  add("张力对存在", !tensionRequired || tension.ok, tension.ok ? tension.pair.join(" × ") : "未找到张力对");

  const missing = checkMissingGroups(record, kase?.expect?.missingGroups || []);
  add(
    "缺失信息覆盖",
    missing.ok,
    missing.results.filter((r) => !r.hit).map((r) => `未命中: ${r.group.join("/")}`).join("; "),
  );

  const offenders = checkExampleNumbers(record);
  add(
    "数字示例化",
    offenders.length === 0,
    offenders.length ? offenders.slice(0, 2).map((o) => `「${o.text}…」中出现未标注数字: ${o.numbers.join(",")}`).join(" | ") : "",
  );

  const stop = checkStopCondition(record);
  add("停止条件可检验", stop.ok, stop.ok ? "" : `过短或缺少触发词：${stop.text}`);

  const over = checkOverclaim(record);
  add("无过度断言", over.ok, over.ok ? "" : `出现了「${over.hit}」`);

  const minCheckpoints = kase?.expect?.minCheckpoints ?? 1;
  const cpOk = (record.checkpoints || []).length >= minCheckpoints;
  add("证据检查点数量", cpOk, cpOk ? "" : `少于此题要求的 ${minCheckpoints} 条`);

  if (!kase?.extraFacts) {
    const n = (record.factsRecap?.missingInfo || []).length;
    add("无事实时列出缺失", n >= DEFAULTS.minMissingWhenNoFacts, `缺失信息 ${n} 条`);
  }

  return {
    checks,
    passed: checks.filter((c) => c.ok).length,
    total: checks.length,
  };
}
