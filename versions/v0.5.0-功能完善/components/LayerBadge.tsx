import { LAYER_LABELS, LAYER_NOTES, type LayerKind } from "@/lib/types";

const STYLES: Record<LayerKind, string> = {
  fact: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inference: "bg-sky-50 text-sky-700 border-sky-200",
  assumption: "bg-amber-50 text-amber-700 border-amber-200",
  missing: "bg-rose-50 text-rose-700 border-rose-200",
  example_number: "bg-violet-50 text-violet-700 border-violet-200",
};

export function LayerBadge({ layer }: { layer: LayerKind }) {
  return (
    <span
      title={LAYER_NOTES[layer]}
      className={`inline-block px-1.5 py-0.5 rounded text-xs border whitespace-nowrap ${STYLES[layer]}`}
    >
      {LAYER_LABELS[layer]}
    </span>
  );
}

/** 五层标注图例（挂在结论区顶部，告诉用户每句话的成色） */
export function LayerLegend() {
  const layers: LayerKind[] = ["fact", "inference", "assumption", "missing", "example_number"];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
      <span className="font-medium">语句成色：</span>
      {layers.map((l) => (
        <span key={l} className="inline-flex items-center gap-1">
          <LayerBadge layer={l} />
          <span>{LAYER_NOTES[l]}</span>
        </span>
      ))}
    </div>
  );
}
