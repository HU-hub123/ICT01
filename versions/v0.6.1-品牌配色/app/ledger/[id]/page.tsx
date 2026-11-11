import Link from "next/link";
import { notFound } from "next/navigation";
import { MODEL_MAP } from "@/lib/models-data";
import { getPlain } from "@/lib/plain-explain";
import { store } from "@/lib/store";
import { LayerLegend } from "@/components/LayerBadge";
import { TaggedList } from "@/components/TaggedList";
import { ArgumentCard } from "@/components/ArgumentCard";
import { TensionSection } from "@/components/TensionSection";
import { ActionCard } from "@/components/ActionCard";
import { TracePanel } from "@/components/TracePanel";
import { ReviewForm } from "@/components/ReviewForm";
import { DecisionGraph } from "@/components/DecisionGraph";
import { ModelCompareTable } from "@/components/ModelCompareTable";
import { ExportButtons } from "@/components/ExportButtons";
import { SideOracle } from "@/components/SideOracle";

export const dynamic = "force-dynamic";

export default async function LedgerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await store.get(id);
  if (!record) notFound();
  const all = await store.list();
  const children = all.filter((r) => r.followUpOf === record.id);
  const parent = record.followUpOf ? all.find((r) => r.id === record.followUpOf) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
      <div className="space-y-1">
        <p className="text-xs text-zinc-400">
          {new Date(record.createdAt).toLocaleString("zh-CN")} ·{" "}
          {record.status === "reviewed" ? "已复盘" : "待复盘"}
          {record.followUpOf && (
            <>
              {" · "}
              <Link href={`/ledger/${record.followUpOf}`} className="underline">
                查看上一轮
              </Link>
            </>
          )}
        </p>
        <h1 className="text-xl font-bold text-zinc-900">{record.question}</h1>
        {record.extraFacts && (
          <p className="text-sm text-zinc-600">补充信息：{record.extraFacts}</p>
        )}
        <div className="pt-2 space-y-1">
          {parent && (
            <p className="text-xs text-zinc-500">
              上一轮追问：
              <Link href={`/ledger/${parent.id}`} className="text-sky-600 underline">
                {parent.question.slice(0, 40)}…
              </Link>
            </p>
          )}
          {children.length > 0 && (
            <p className="text-xs text-zinc-500">
              后续追问：
              {children.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && "；"}
                  <Link href={`/ledger/${c.id}`} className="text-sky-600 underline">
                    {c.question.slice(0, 24)}…
                  </Link>
                </span>
              ))}
            </p>
          )}
          <ExportButtons record={record} />
        </div>
      </div>

      <div className="panel p-4 space-y-2">
        <h2 className="serif text-[15px] font-semibold text-ink">
          ① 先把「知道的」和「不知道的」分开
        </h2>
        <p className="text-sm text-zinc-800">
          <b>核心判断点：</b>
          {record.factsRecap.coreJudgment}
        </p>
        <p className="text-xs text-emerald-700">
          已确认事实：{record.factsRecap.confirmedFacts.join("；") || "（无，全部推演建立在标注过的假设之上）"}
        </p>
        <p className="text-xs text-rose-700">
          缺失信息：{record.factsRecap.missingInfo.join("；") || "（未识别到）"}
        </p>
      </div>

      <div className="panel p-4 space-y-2">
        <h2 className="serif text-[15px] font-semibold text-ink">② 挑几个角度来看</h2>
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
                      ⚔️ 和另一个角度有张力
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

      <div className="space-y-3">
        <h2 className="serif text-[15px] font-semibold text-ink">③ 让每个角度独立说话</h2>
        {record.arguments.map((a) => (
          <ArgumentCard key={a.modelId} arg={a} />
        ))}
      </div>

      <TensionSection
        conflicts={record.conflicts}
        agreementNote={record.agreementNote}
        checkpoints={record.checkpoints}
      />

      <div className="panel p-4 space-y-2">
        <h2 className="serif text-[15px] font-semibold text-ink">推演关系图</h2>
        <DecisionGraph record={record} />
      </div>

      <div className="panel p-4 space-y-3">
        <h2 className="serif text-[15px] font-semibold text-ink">⑤ 收束成一句能行动的判断</h2>
        <LayerLegend />
        <TaggedList items={record.conclusion} />
      </div>

      <ModelCompareTable record={record} />

      <ActionCard minimalAction={record.minimalAction} />

      <TracePanel steps={record.steps} />

      {record.review ? (
        <div className="panel p-4 space-y-3 border-emerald-200">
          <h2 className="font-semibold text-emerald-700">
            ✅ 复盘结果（{new Date(record.review.reviewedAt).toLocaleString("zh-CN")}）
          </h2>
          <p className="text-sm text-zinc-800">
            <b>实际发生：</b>
            {record.review.actualOutcome}
          </p>
          <p className="text-xs text-rose-700">
            被推翻的假设：{record.review.overturnedAssumptions.join("；") || "（未填写）"}
          </p>
          <p className="text-xs text-emerald-700">
            被确认的假设：{record.review.confirmedAssumptions.join("；") || "（未填写）"}
          </p>
          {record.review.lesson && (
            <p className="text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg p-3">
              <b>教训：</b>
              {record.review.lesson}
            </p>
          )}
        </div>
      ) : (
        <ReviewForm recordId={record.id} />
      )}

      <SideOracle question={record.question} />
    </div>
  );
}
