/**
 * 评测运行器：对 /api/analyze 跑评测集，输出报告并按阈值退出。
 *
 * 用法：
 *   node eval/run-eval.mjs                 # 默认 http://localhost:3100
 *   BASE_URL=http://localhost:3200 LIMIT=6 node eval/run-eval.mjs
 *   PASS_MIN=0.8 CASES_MIN=0.6 node eval/run-eval.mjs
 *
 * 依赖：目标服务已启动且 .env 配置了 DEEPSEEK_API_KEY（真实推理，不做 mock）。
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runChecks } from "./checks.mjs";
import { judgeRecord } from "./judge.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || "http://localhost:3100";
const LIMIT = Number(process.env.LIMIT || 0);
const PASS_MIN = Number(process.env.PASS_MIN || 0.8);
const CASES_MIN = Number(process.env.CASES_MIN || 0.6);
const JUDGE = process.env.EVAL_JUDGE === "1";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

async function analyze(kase) {
  const res = await fetch(`${BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: kase.question, extraFacts: kase.extraFacts || undefined }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    throw new Error(j?.error || `HTTP ${res.status}`);
  }
  if (!res.body) throw new Error("无响应体");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let record = null;
  let error = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      let ev;
      try {
        ev = JSON.parse(line.slice(5).trim());
      } catch {
        continue;
      }
      if (ev.type === "record") record = ev.record;
      else if (ev.type === "error") error = ev.message;
    }
  }
  if (error) throw new Error(error);
  if (!record) throw new Error("未返回 record");
  return record;
}

async function main() {
  const casesRaw = JSON.parse(await readFile(path.join(here, "cases.json"), "utf8"));
  let cases = casesRaw.cases;
  if (LIMIT > 0) cases = cases.slice(0, LIMIT);

  const modelsRes = await getJSON(`${BASE}/api/models`);
  const models = modelsRes.models || [];

  const report = {
    startedAt: new Date().toISOString(),
    base: BASE,
    limit: LIMIT,
    cases: [],
    summary: {},
  };

  for (const kase of cases) {
    const started = Date.now();
    const row = { id: kase.id, category: kase.category, question: kase.question, checks: [], passed: 0, total: 0, ms: 0, judge: null, error: null };
    try {
      const record = await analyze(kase);
      const r = runChecks(record, kase, models);
      row.checks = r.checks;
      row.passed = r.passed;
      row.total = r.total;
      row.ms = Date.now() - started;
      if (JUDGE) {
        try {
          row.judge = await judgeRecord(kase, record);
        } catch (e) {
          row.judge = { error: String(e?.message || e) };
        }
      }
      console.log(
        `${kase.id.padEnd(10)} ${(row.passed + "/" + row.total).padEnd(6)} ${(row.ms / 1000).toFixed(1)}s  ${row.checks.filter((c) => !c.ok).map((c) => c.name).join("、") || "OK"}`,
      );
    } catch (e) {
      row.error = String(e?.message || e);
      console.log(`${kase.id.padEnd(10)} FAIL   ${row.error}`);
    }
    report.cases.push(row);
    await sleep(1500); // 给上游限流留余量
  }

  const okChecks = report.cases.reduce((s, c) => s + (c.passed || 0), 0);
  const allChecks = report.cases.reduce((s, c) => s + (c.total || 0), 0);
  const okCases = report.cases.filter((c) => c.total > 0 && c.passed === c.total).length;
  const checkRate = allChecks ? okChecks / allChecks : 0;
  const caseRate = report.cases.length ? okCases / report.cases.length : 0;

  // 各检查项通过率
  const byName = new Map();
  for (const c of report.cases) {
    for (const ch of c.checks) {
      const cur = byName.get(ch.name) || { pass: 0, total: 0 };
      cur.total += 1;
      if (ch.ok) cur.pass += 1;
      byName.set(ch.name, cur);
    }
  }
  const checkStats = [...byName.entries()].map(([name, v]) => ({ name, pass: v.pass, total: v.total, rate: v.pass / v.total }));

  const judgeScores = report.cases.map((c) => c.judge?.overall).filter((x) => typeof x === "number");
  const judgeAvg = judgeScores.length ? judgeScores.reduce((a, b) => a + b, 0) / judgeScores.length : null;

  report.summary = {
    cases: report.cases.length,
    casesAllPass: okCases,
    caseRate,
    checkRate,
    checkStats,
    judgeAvg,
    thresholds: { PASS_MIN, CASES_MIN },
  };
  report.finishedAt = new Date().toISOString();

  await mkdir(path.join(here, "reports"), { recursive: true });
  const out = path.join(here, "reports", `report-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await writeFile(out, JSON.stringify(report, null, 2), "utf8");

  console.log("\n==== 评测汇总 ====");
  console.log(`用例：${report.cases.length}，全通过用例：${okCases}（${(caseRate * 100).toFixed(1)}%）`);
  console.log(`断言通过率：${(checkRate * 100).toFixed(1)}%（${okChecks}/${allChecks}）`);
  for (const s of checkStats) console.log(`  - ${s.name}: ${(s.rate * 100).toFixed(0)}%（${s.pass}/${s.total}）`);
  if (judgeAvg !== null) console.log(`LLM 评审均分：${judgeAvg.toFixed(2)} / 5`);
  console.log(`报告已写入：${out}`);

  const pass = checkRate >= PASS_MIN && caseRate >= CASES_MIN;
  console.log(pass ? "RESULT: PASS" : "RESULT: FAIL");
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error("评测运行失败：", e);
  process.exit(2);
});
