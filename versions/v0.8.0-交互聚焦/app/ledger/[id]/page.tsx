import Link from "next/link";
import { notFound } from "next/navigation";
import { MODEL_MAP } from "@/lib/models-data";
import { getPlain } from "@/lib/plain-explain";
import { getStore } from "@/lib/store";
import { LayerBadge } from "@/components/LayerBadge";
import { ArgumentCard } from "@/components/ArgumentCard";
import { TensionSection } from "@/components/TensionSection";
import { TracePanel } from "@/components/TracePanel";
import { ReviewForm } from "@/components/ReviewForm";
import { DecisionGraph } from "@/components/DecisionGraph";
import { ModelCompareTable } from "@/components/ModelCompareTable";
import { ExportButtons } from "@/components/ExportButtons";
import { SideOracle } from "@/components/SideOracle";
import type { TaggedSentence } from "@/lib/types";

export const dynamic = "force-dynamic";

function SentenceList({ items, size }: { items: TaggedSentence[]; size: "lg" | "sm" }) {
  return (
    <ul className="space-y-2.5">
      {items.map((s, i) => (
        <li
          key={i}
          className={`flex gap-2 items-start ${
            size === "lg" ? "text-[16px] leading-7 text-ink" : "text-sm leading-6 text-stone-700"
          }`}
        >
          <span className="mt-1.5 shrink-0">
            <LayerBadge layer={s.layer} />
          </span>
          <span>{s.text}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function LedgerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = await getStore();
  const record = await store.get(id);
  if (!record) notFound();
  const all = await store.list();
  const children = all.filter((r) => r.followUpOf === record.id);
  const parent = record.followUpOf ? all.find((r) => r.id === record.followUpOf) : null;

  const conclusions = record.conclusion || [];
  const inference = conclusions.filter((s) => s.layer === "inference");
  const head = (inference.length > 0 ? inference : conclusions).slice(0, 2);
  const rest = conclusions.filter((s) => !head.includes(s));
  const reviewed = record.status === "reviewed" && record.review;
  const seenAt = new Date(record.createdAt).toLocaleString("zh-CN");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-5">
      {/* 头部 */}
      <div className="space-y-2">
        <p className="text-xs text-stone-400">
          {seenAt} · {reviewed ? "已复盘" : "待复盘"}
          {parent && (
            <>
              {" · "}
              <Link href={`/ledger/${parent.id}`} className="text-brand hover:underline">
                上一轮追问
              </Link>
            </>
          )}
          {children.length > 0 && (
            <>
              {" · "}
              <Link href={`/ledger/${children[children.length - 1].id}`} className="text-brand hover:underline">
                最新追问
              </Link>
            </>
          )}
        </p>
        <h1 className="serif text-2xl font-bold leading-snug text-ink">{record.question}</h1>
        {record.extraFacts && <p className="text-sm text-stone-500">补充：{record.extraFacts}</p>}
        <ExportButtons record={record} />
      </div>

      {/* 重点 1：判断点 */}
      <section className="panel p-5 space-y-1">
        <p className="text-xs text-stone-400">真正的判断点</p>
        <p className="text-[17px] leading-8 text-ink">{record.factsRecap.coreJudgment}</p>
      </section>

      {/* 重点 2：结论 */}
      <section className="panel p-5 space-y-3">
        <p className="text-xs text-stone-400">结论要点（每句都标了成色）</p>
        <SentenceList items={head} size="lg" />
        {rest.length > 0 && (
          <details>
            <summary className="cursor-pointer text-xs text-brand select-none">
              展开其余 {rest.length} 句结论
            </summary>
            <div className="mt-2">
              <SentenceList items={rest} size="sm" />
            </div>
          </details>
        )}
      </section>

      {/* 重点 3：行动 */}
      <section className="panel p-5 space-y-2.5">
        <p className="text-xs text-stone-400">下一步</p>
        <p className="text-[16px] leading-7 text-ink">{record.minimalAction.action}</p>
        <p className="text-sm leading-6 text-stone-600">
          <b className="text-rose-700">停止条件：</b>
          {record.minimalAction.stopCondition}
        </p>
        <p className="text-sm leading-6 text-stone-600">
          <b className="text-sky-700">看多久、看什么：</b>
          {record.minimalAction.observationWindow}
        </p>
      </section>

      {/* 重点 4：复盘 */}
      {reviewed ? (
        <section className="panel p-5 space-y-2 border-emerald-200/70">
          <p className="text-xs text-emerald-700">
            ✅ 复盘（{new Date(record.review!.reviewedAt).toLocaleDateString("zh-CN")}）
          </p>
          <p className="text-[16px] leading-7 text-ink">{record.review!.actualOutcome}</p>
          <p className="text-sm text-rose-700 leading-6">
            <b>被推翻的假设：</b>
            {record.review!.overturnedAssumptions.join("；") || "（未填写）"}
          </p>
          <p className="text-sm text-emerald-700 leading-6">
            <b>被确认的假设：</b>
            {record.review!.confirmedAssumptions.join("；") || "（未填写）"}
          </p>
          {record.review!.lesson && (
            <p className="text-sm leading-6 text-stone-700 bg-stone-50 border border-line rounded-xl p-3">
              <b>教训：</b>
              {record.review!.lesson}
            </p>
          )}
        </section>
      ) : (
        <ReviewForm recordId={record.id} />
      )}

      {/* 折叠：完整推演 */}
      <details className="panel p-5">
        <summary className="cursor-pointer text-sm font-medium text-ink select-none">
          完整推演（事实与缺口 · 各角度论证 · 冲突 · 关系图 · 对照表 · 溯源回放）
        </summary>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <h2 className="serif text-[15px] font-semibold text-ink">事实与缺口</h2>
            <p className="text-xs text-emerald-700 leading-5">
              已确认事实：
              {record.factsRecap.confirmedFacts.join("；") || "（无，全部推演建立在标注过的假设上）"}
            </p>
            <p className="text-xs text-rose-700 leading-5">
              缺失信息：
              {record.factsRecap.missingInfo.join("；") || "（未识别到）"}
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="serif text-[15px] font-semibold text-ink">这几个角度</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {record.selections.map((sel) => {
                const m = MODEL_MAP[sel.modelId];
                if (!m) return null;
                const inTension = m.tensionWith.some((tid) =>
                  record.selections.some((s2) => s2.modelId === tid),
                );
                return (
                  <div key={sel.modelId} className="border border-line rounded-xl p-3 bg-white/60">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-stone-900">{m.name}</span>
                      {inTension && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-800">
                          ⚔️ 张力
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-600 mt-1 leading-5">{getPlain(m.id)}</p>
                    <p className="text-[11px] text-stone-400 mt-1 leading-5">{sel.reason}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {record.arguments.map((a) => (
            <ArgumentCard key={a.modelId} arg={a} />
          ))}

          <TensionSection
            conflicts={record.conflicts}
            agreementNote={record.agreementNote}
            checkpoints={record.checkpoints}
          />

          <div className="space-y-2">
            <h2 className="serif text-[15px] font-semibold text-ink">推演关系图</h2>
            <DecisionGraph record={record} />
          </div>

          <ModelCompareTable record={record} />
          <TracePanel steps={record.steps} />
        </div>
      </details>

      <SideOracle question={record.question} />
    </div>
  );
}
