import Link from "next/link";
import { notFound } from "next/navigation";
import { MODEL_MAP } from "@/lib/models-data";
import { store } from "@/lib/store";
import { LayerLegend } from "@/components/LayerBadge";
import { TaggedList } from "@/components/TaggedList";
import { ArgumentCard } from "@/components/ArgumentCard";
import { TensionSection } from "@/components/TensionSection";
import { ActionCard } from "@/components/ActionCard";
import { TracePanel } from "@/components/TracePanel";
import { ReviewForm } from "@/components/ReviewForm";

export const dynamic = "force-dynamic";

export default async function LedgerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await store.get(id);
  if (!record) notFound();

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
      </div>

      <div className="panel p-4 space-y-2">
        <h2 className="font-semibold text-zinc-900">① 事实收口</h2>
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
        <h2 className="font-semibold text-zinc-900">② 模型对阵（检索与选择理由）</h2>
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
                  {inTension && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      ⚔️ 张力
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1 leading-5">{sel.reason}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-zinc-900">③ 各模型独立推演</h2>
        {record.arguments.map((a) => (
          <ArgumentCard key={a.modelId} arg={a} />
        ))}
      </div>

      <TensionSection
        conflicts={record.conflicts}
        agreementNote={record.agreementNote}
        checkpoints={record.checkpoints}
      />

      <div className="panel p-4 space-y-3">
        <h2 className="font-semibold text-zinc-900">⑤ 综合结论（五层标注）</h2>
        <LayerLegend />
        <TaggedList items={record.conclusion} />
      </div>

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
    </div>
  );
}
