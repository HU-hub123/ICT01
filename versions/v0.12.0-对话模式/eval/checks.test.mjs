/**
 * 断言单测（不依赖网络与 API Key）
 * 运行：node --test eval/checks.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  checkStructure,
  checkTension,
  checkExampleNumbers,
  checkMissingGroups,
  checkStopCondition,
  checkOverclaim,
  runChecks,
} from "./checks.mjs";

const MODELS = [
  { id: "sunk-cost", tensionWith: ["path-dependence"] },
  { id: "path-dependence", tensionWith: ["sunk-cost"] },
  { id: "confirmation-bias", tensionWith: ["falsification"] },
];

function makeRecord(overrides = {}) {
  return {
    id: "t1",
    question: "一个已经投入 18 个月的产品，留存 60%，到底该不该继续？",
    extraFacts: "客单价 3 万元/年",
    factsRecap: {
      confirmedFacts: ["产品已投入 18 个月", "月留存约 60%"],
      missingInfo: ["留存口径不清楚", "缺少 CAC/LTV", "缺少行业基准"],
      coreJudgment: "是否继续投入",
    },
    selections: [
      { modelId: "sunk-cost", reason: "历史投入", source: "llm" },
      { modelId: "path-dependence", reason: "积累是否可复用", source: "llm" },
    ],
    arguments: [
      {
        modelId: "sunk-cost",
        conclusion: [{ layer: "inference", text: "已投入的 18 个月不应影响未来决策。" }],
        appliesWhen: "投入不可回收时",
        failsWhen: "投入可部分变现时",
      },
      {
        modelId: "path-dependence",
        conclusion: [{ layer: "inference", text: "若积累可复用，则继续投入有依据。" }],
        appliesWhen: "积累可放大时",
        failsWhen: "结构性变化时",
      },
    ],
    conflicts: [
      {
        between: ["sunk-cost", "path-dependence"],
        statement: "过去投入是否应被忽略",
        resolutionCondition: "看积累是否可复用",
      },
    ],
    agreementNote: "",
    checkpoints: [
      { hypothesis: "留存停滞是产品价值触顶", confirmingEvidence: "分群留存都不高", disconfirmingEvidence: "高活跃用户留存稳定" },
    ],
    conclusion: [
      { layer: "fact", text: "产品已投入 18 个月。" },
      { layer: "inference", text: "若留存停滞源于价值问题，则应停止加投。" },
      { layer: "assumption", text: "假设团队还想再投半年。" },
    ],
    minimalAction: {
      action: "先做分群留存分析",
      stopCondition: "若 8 周内高活跃用户留存仍无改善，则停止追加投入",
      observationWindow: "观察 8 周（仅为示例）",
    },
    steps: [],
    ...overrides,
  };
}

test("合法记录通过全部断言", () => {
  const r = makeRecord();
  const st = checkStructure(r);
  assert.equal(st.ok, true, st.issues.join(";"));
  const t = checkTension(r, MODELS);
  assert.equal(t.ok, true);
  assert.deepEqual(t.pair.sort(), ["path-dependence", "sunk-cost"]);
  assert.deepEqual(checkExampleNumbers(r), []);
  const m = checkMissingGroups(r, [["口径", "定义"], ["CAC", "LTV"], ["基准", "行业"]]);
  assert.equal(m.ok, true);
  assert.equal(checkStopCondition(r).ok, true);
  assert.equal(checkOverclaim(r).ok, true);
});

test("结论缺层或层数不足会失败", () => {
  const r = makeRecord({ conclusion: [{ layer: "inference", text: "只有一句推断。" }] });
  const st = checkStructure(r);
  assert.equal(st.ok, false);
  assert.ok(st.issues.some((i) => i.includes("结论句数")));
});

test("未标注示例的数字会被抓出来", () => {
  const r = makeRecord({
    conclusion: [
      { layer: "inference", text: "留存达到 30% 就应该继续。" },
      { layer: "inference", text: "观察 8 周即可。" },
      { layer: "fact", text: "已投入 18 个月。" },
    ],
  });
  const offenders = checkExampleNumbers(r);
  // 30 与 8 都不在用户输入里、也没有「示例/比如/约」等标注 → 两处都算违规；
  // 18 来自用户输入 → 放行。
  assert.equal(offenders.length, 2);
  const nums = offenders.flatMap((o) => o.numbers);
  assert.ok(nums.includes("30"));
  assert.ok(nums.includes("8"));
  assert.ok(!nums.includes("18"));
});

test("序号、年份、区间、时间点、历史区间、举例不算违规", () => {
  const r = makeRecord({
    conclusion: [
      { layer: "inference", text: "主动列出三个检查点：（1）看口径，（2）看分群，（3）看流失。" },
      { layer: "inference", text: "缺少未来 3-5 年的收入曲线估计。" },
      { layer: "inference", text: "到了 2026 年再评估。" },
      { layer: "inference", text: "留存曲线要看首月、第 3 月、第 12 月是否出现平台期。" },
      { layer: "inference", text: "可以查看过去 6 个月的实际单量。" },
      { layer: "inference", text: "对「划算」的心理阈值（如 6 个月、12 个月）本身也可能是个锚。" },
    ],
  });
  assert.deepEqual(checkExampleNumbers(r), []);
});

test("真正的阈值仍会被抓出来", () => {
  const r = makeRecord({
    conclusion: [
      { layer: "inference", text: "留存达到 30% 就应该继续投入。" },
      { layer: "inference", text: "观察 8 周后必须停止。" },
    ],
  });
  const offenders = checkExampleNumbers(r);
  assert.equal(offenders.length, 2);
});

test("来自用户输入的数字不算违规", () => {
  const r = makeRecord({
    question: "已经投入 18 个月，月留存 60%，该不该继续？",
    extraFacts: "客单价 3 万元/年",
    conclusion: [{ layer: "inference", text: "已投入 18 个月，月留存 60%，客单价 3 万元/年。" }],
  });
  assert.deepEqual(checkExampleNumbers(r), []);
});

test("无张力对会被识别", () => {
  const r = makeRecord({
    selections: [
      { modelId: "sunk-cost", reason: "", source: "llm" },
      { modelId: "confirmation-bias", reason: "", source: "llm" },
    ],
  });
  assert.equal(checkTension(r, MODELS).ok, false);
});

test("缺失信息关键词未命中会失败", () => {
  const r = makeRecord();
  const m = checkMissingGroups(r, [["口径"], ["完全不存在的关键词XYZ"]]);
  assert.equal(m.ok, false);
});

test("空泛停止条件会失败", () => {
  const r = makeRecord({
    minimalAction: { action: "继续观察", stopCondition: "看情况", observationWindow: "" },
  });
  assert.equal(checkStopCondition(r).ok, false);
  assert.equal(checkStructure(r).ok, false);
});

test("过度断言会被识别，但不误伤「不一定」", () => {
  const bad = makeRecord({
    conclusion: [{ layer: "inference", text: "可以保证三个月内一定能回本。" }],
  });
  assert.equal(checkOverclaim(bad).ok, false);

  const neutral = makeRecord({
    conclusion: [
      { layer: "inference", text: "现在不一定是执行问题，也可能是价值问题。" },
      { layer: "inference", text: "两个方案的绝对值差距很大。" },
    ],
  });
  assert.equal(checkOverclaim(neutral).ok, true);
});

test("未提供事实时必须列出足够缺失信息", () => {
  const r = makeRecord({
    extraFacts: "",
    factsRecap: { confirmedFacts: [], missingInfo: ["只有一个"], coreJudgment: "x" },
  });
  const r2 = runChecks(r, { extraFacts: "", expect: {} }, MODELS);
  const chk = r2.checks.find((c) => c.name === "无事实时列出缺失");
  assert.ok(chk && !chk.ok);
});
