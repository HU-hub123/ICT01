"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AnalysisRecord, PipelineStep } from "@/lib/types";
import { streamAnalyze, saveLedger } from "@/lib/sse-client";
import { MODEL_MAP } from "@/lib/models-data";
import { LayerLegend, LayerBadge } from "./LayerBadge";
import { TaggedList } from "./TaggedList";
import { ArgumentCard } from "./ArgumentCard";
import { TensionSection } from "./TensionSection";
import { ActionCard } from "./ActionCard";
import { TracePanel } from "./TracePanel";
import { DecisionGraph } from "./DecisionGraph";
import { ModelCompareTable } from "./ModelCompareTable";

const DEMO_Q = "一个已经投入 18 个月的产品，留存不温不火，到底该不该继续？";
const DEMO_FACTS =
  "B 端 SaaS 产品，客单价约 3 万元/年，目前月留存约 60%，近三个月无明显提升，团队还想再投入半年。";

const STAGES = [
  "title",
  "typing",
  "running",
  "facts",
  "models",
  "arguments",
  "tension",
  "graph",
  "conclusion",
  "action",
  "trace",
  "save",
  "done",
] as const;
type Stage = (typeof STAGES)[number];

const CAPTIONS: Record<Stage, string> = {
  title: "认知脚手架 · 可溯源思考工作台 —— 让 AI 的思考过程被看见、被检查、被记住、被复盘。",
  typing: "第 1 步：提出一个需要判断的问题。追问时会自动携带上一轮系统自己的回答。",
  running: "五阶段推演进行中（固定顺序、无循环）：事实收口 → 模型匹配 → 独立推演 → 交叉推演 → 综合结论。",
  facts: "① 事实收口：只把你明确说过的话当作事实，其余显式标为「缺失信息」——不替用户猜。",
  models: "② 模型对阵：从检索候选中选 2-4 个，强制至少一对张力模型（这里是：沉没成本 × 路径依赖）。",
  arguments: "③ 各模型独立推演：先打架、不合谋。同样的「已投入」，沉没成本说它是幻觉，路径依赖说它是资产。",
  tension: "④ 交叉推演：冲突点、各自成立条件、贝叶斯式证据检查点——重点不是选最正确的模型。",
  graph: "🗺 决策图：把这次推演的骨架画出来。琥珀虚线 = 张力冲突，图上每个节点都来自真实输出。",
  conclusion: "⑤ 五层标注：事实 / 推断 / 假设 / 缺失信息 / 示例数字——没有依据的数字永远不是推荐阈值。",
  action: "🎯 最小行动 + 事前写下的停止条件：把大决定拆成可验证的一小步。",
  trace: "🔍 溯源回放：为什么选这个模型、喂了什么上下文、模型原始输出是什么——全部留档，拒绝黑盒。",
  save: "📒 存入认知账本：保存的是判断过程，不是聊天记录。之后回填实际结果即可复盘。",
  done: "演示结束 —— 认知脚手架 · 我们保存结论，也保存得到结论的过程。",
};

const REVEAL: { stage: Stage; ms: number }[] = [
  { stage: "facts", ms: 2600 },
  { stage: "models", ms: 2800 },
  { stage: "arguments", ms: 3200 },
  { stage: "tension", ms: 3400 },
  { stage: "graph", ms: 3000 },
  { stage: "conclusion", ms: 3200 },
  { stage: "action", ms: 2600 },
  { stage: "trace", ms: 3400 },
  { stage: "save", ms: 2400 },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

declare global {
  interface Window {
    __DEMO_RECORD_ID?: string;
    __DEMO_DONE?: boolean;
  }
}

export function DemoPlayer() {
  const [stage, setStage] = useState<Stage>("title");
  const [typed, setTyped] = useState("");
  const [statusText, setStatusText] = useState("");
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [record, setRecord] = useState<AnalysisRecord | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const startedRef = useRef(false);

  const stageIndex = STAGES.indexOf(stage);
  const after = useCallback(
    (s: Stage) => STAGES.indexOf(stage) >= STAGES.indexOf(s),
    [stage],
  );

  const scrollTo = useCallback((id: string) => {
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }, []);

  const scrollToTop = useCallback(() => {
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 120);
  }, []);

  const run = useCallback(async () => {
    setStage("running");
    setStatusText("事实收口");
    try {
      const rec = await streamAnalyze(
        { question: DEMO_Q, extraFacts: DEMO_FACTS },
        {
          onStatus: (m) => setStatusText(m),
          onStep: (s) => {
            setSteps((p) => [...p, s]);
            setStatusText(s.title);
          },
        },
      );
      setRecord(rec);
      setStage("facts");
      scrollTo("demo-facts");
      for (const { stage: s, ms } of REVEAL) {
        await sleep(ms);
        setStage(s);
        scrollTo(`demo-${s}`);
        if (s === "save") {
          try {
            const saved = await saveLedger(rec);
            setSavedId(saved.id);
            window.__DEMO_RECORD_ID = saved.id;
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          }
        }
      }
      await sleep(2200);
      setStage("done");
      window.__DEMO_DONE = true;
      scrollTo("demo-done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage("running");
    }
  }, [scrollTo]);

  // 开场动画 + 打字 + 自动开始（ref 防 StrictMode 重复）
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void (async () => {
      await sleep(1600);
      setStage("typing");
      for (let i = 1; i <= DEMO_Q.length; i++) {
        setTyped(DEMO_Q.slice(0, i));
        await sleep(26);
      }
      await sleep(650);
      await run();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const caption =
    stage === "running" ? `推演进行中 · ${statusText || "事实收口"}` : CAPTIONS[stage];

  const models = record?.selections.map((s) => MODEL_MAP[s.modelId]).filter(Boolean) ?? [];

  return (
    <div className="pb-28" data-demo-done={stage === "done" ? "true" : "false"}>
      {/* 标题屏 */}
      {stage === "title" && (
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-5 reveal">
          <p className="text-xs tracking-[0.3em] text-zinc-400">COGNITIVE SCAFFOLD · 演示</p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900">
            认知脚手架
          </h1>
          <p className="text-zinc-500 max-w-xl">
            让 AI 的思考过程被看见、被检查、被记住、被复盘 —— 拒绝黑盒
          </p>
          <p className="text-xs text-zinc-400">
            本演示真实调用 DeepSeek 推理，不是录好的假数据
          </p>
        </div>
      )}

      {/* 工作台（打字 → 运行 → 结果） */}
      {after("typing") && (
        <div className="space-y-4">
          <div className="panel p-4 space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">
                你的问题（一个需要判断的问题）
              </span>
              <div className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white min-h-[76px] leading-6">
                {typed}
                {stage === "typing" && (
                  <span className="inline-block w-0.5 h-4 bg-zinc-800 align-middle animate-pulse" />
                )}
              </div>
            </label>
            <label className="block">
              <span className="text-xs text-zinc-500">补充已确认的事实（可选）</span>
              <div className="mt-1 w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-600 truncate">
                {after("running") || stage === "running" ? DEMO_FACTS : "（可选）"}
              </div>
            </label>
            <div className="flex items-center gap-2">
              <span
                className={`px-4 py-2 rounded-lg text-sm text-white ${
                  stage === "running" ? "bg-zinc-400" : "bg-zinc-900"
                }`}
              >
                {stage === "running" ? "推演中…" : "开始推演"}
              </span>
              <span className="text-xs text-zinc-400">演示模式：自动提问 → 自动推演</span>
            </div>
          </div>

          {/* 运行中 */}
          {stage === "running" && (
            <div className="panel p-4 space-y-2 reveal">
              <p className="text-sm text-zinc-700 flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full border-2 border-zinc-300 border-t-zinc-900 animate-spin" />
                {statusText}
              </p>
              <ol className="space-y-1">
                {steps.map((s) => (
                  <li key={s.key} className="text-xs text-zinc-500 flex gap-2">
                    <span className="text-emerald-600">✓</span>
                    {s.title}（{(s.durationMs / 1000).toFixed(1)}s）
                  </li>
                ))}
              </ol>
              <p className="text-xs text-zinc-400">
                固定五阶段顺序执行（每阶段最多两次模型调用），不存在循环推理。
              </p>
            </div>
          )}

          {error && (
            <div className="panel p-4 border-rose-200 bg-rose-50/60 text-sm text-rose-700 break-all">
              错误：{error}
            </div>
          )}

          {/* 结果分阶段揭示 */}
          {record && (
            <div className="space-y-4">
              {after("facts") && (
                <div id="demo-facts" className="panel p-4 space-y-3 reveal scroll-mt-24">
                  <h2 className="font-semibold text-zinc-900">
                    ① 事实收口：先分清「知道的」和「不知道的」
                  </h2>
                  <p className="text-sm text-zinc-800">
                    <b>核心判断点：</b>
                    {record.factsRecap.coreJudgment}
                  </p>
                  <div>
                    <h3 className="text-sm font-medium text-emerald-700 mb-1">
                      已确认事实（只来自你提供的信息）
                    </h3>
                    <ul className="space-y-1">
                      {record.factsRecap.confirmedFacts.map((f, i) => (
                        <li key={i} className="flex gap-2 items-start text-sm text-zinc-800">
                          <span className="mt-0.5 shrink-0">
                            <LayerBadge layer="fact" />
                          </span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-rose-700 mb-1">
                      缺失信息（会影响结论，但尚未提供）
                    </h3>
                    <ul className="space-y-1">
                      {record.factsRecap.missingInfo.map((f, i) => (
                        <li key={i} className="flex gap-2 items-start text-sm text-zinc-800">
                          <span className="mt-0.5 shrink-0">
                            <LayerBadge layer="missing" />
                          </span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {after("models") && (
                <div id="demo-models" className="panel p-4 space-y-2 reveal scroll-mt-24">
                  <h2 className="font-semibold text-zinc-900">
                    ② 模型对阵：为什么是这几个模型（含检索与选择理由）
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {record.selections.map((sel) => {
                      const m = MODEL_MAP[sel.modelId];
                      if (!m) return null;
                      const inTension = m.tensionWith.some((tid) =>
                        record.selections.some((s2) => s2.modelId === tid),
                      );
                      return (
                        <div key={sel.modelId} className="border border-zinc-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{m.name}</span>
                            <span className="text-xs text-zinc-400">{m.nameEn}</span>
                            {inTension && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                ⚔️ 张力
                              </span>
                            )}
                            {sel.source === "library_tension" && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">
                                库内兜底
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 mt-1 leading-5">
                            选择理由：{sel.reason}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {after("arguments") && (
                <div id="demo-arguments" className="space-y-3 reveal scroll-mt-24">
                  <h2 className="font-semibold text-zinc-900">
                    ③ 各模型独立推演（先打架，不合谋）
                  </h2>
                  {record.arguments.map((a) => (
                    <ArgumentCard key={a.modelId} arg={a} />
                  ))}
                </div>
              )}

              {after("tension") && (
                <div id="demo-tension" className="reveal scroll-mt-24">
                  <TensionSection
                    conflicts={record.conflicts}
                    agreementNote={record.agreementNote}
                    checkpoints={record.checkpoints}
                  />
                </div>
              )}

              {after("graph") && (
                <div id="demo-graph" className="panel p-4 space-y-2 reveal scroll-mt-24">
                  <h2 className="font-semibold text-zinc-900">🗺 决策图：这次推演的骨架</h2>
                  <DecisionGraph record={record} />
                </div>
              )}

              {after("conclusion") && (
                <div id="demo-conclusion" className="panel p-4 space-y-3 reveal scroll-mt-24">
                  <h2 className="font-semibold text-zinc-900">⑤ 综合结论（每句话都标了成色）</h2>
                  <LayerLegend />
                  <TaggedList items={record.conclusion} />
                </div>
              )}

              {after("conclusion") && (
                <div className="reveal">
                  <ModelCompareTable record={record} defaultOpen />
                </div>
              )}

              {after("action") && (
                <div id="demo-action" className="reveal scroll-mt-24">
                  <ActionCard minimalAction={record.minimalAction} />
                </div>
              )}

              {after("trace") && (
                <div id="demo-trace" className="reveal scroll-mt-24">
                  <TracePanel steps={record.steps} defaultOpen />
                </div>
              )}

              {after("save") && (
                <div id="demo-save" className="panel p-4 space-y-2 reveal scroll-mt-24">
                  <h2 className="font-semibold text-zinc-900">📒 存入认知账本</h2>
                  <p className="text-xs text-zinc-500">
                    保存的是「判断过程」（问题、事实、假设、证据、冲突、预测、停止条件），不是聊天记录。
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm">
                      {savedId ? "已保存" : "保存中…"}
                    </span>
                    {savedId && (
                      <Link
                        href={`/ledger/${savedId}`}
                        className="text-sm text-sky-600 underline hover:text-sky-700"
                      >
                        打开账本详情 →
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* 演示结束 */}
              {stage === "done" && (
                <div
                  id="demo-done"
                  className="rounded-xl border border-zinc-900 bg-zinc-900 text-white p-8 text-center space-y-3 reveal scroll-mt-24"
                >
                  <p className="text-xs tracking-[0.3em] text-zinc-400">DEMO COMPLETE</p>
                  <p className="text-2xl font-bold text-white">演示结束</p>
                  <p className="text-sm text-zinc-300">
                    认知脚手架 · 我们保存结论，也保存得到结论的过程
                  </p>
                  <p className="text-xs text-zinc-400">github.com/HU-hub123/ICT01</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 字幕条（始终置底，录屏即解说） */}
      <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
        <div className="mx-auto max-w-5xl px-4 pb-4">
          <div className="rounded-xl bg-zinc-900/90 text-white shadow-xl px-4 py-3 flex items-center gap-3 backdrop-blur">
            <span className="text-[11px] font-mono text-emerald-400 shrink-0 w-14">
              {String(Math.max(1, stageIndex)).padStart(2, "0")}/{String(STAGES.length - 1).padStart(2, "0")}
            </span>
            <p className="text-sm leading-6">{caption}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
