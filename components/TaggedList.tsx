import type { TaggedSentence } from "@/lib/types";
import { LayerBadge } from "./LayerBadge";

export function TaggedList({
  items,
  emptyText = "（无内容）",
}: {
  items: TaggedSentence[];
  emptyText?: string;
}) {
  if (!items.length) {
    return <p className="text-sm text-stone-400">{emptyText}</p>;
  }
  return (
    <ul className="space-y-2.5">
      {items.map((s, i) => (
        <li key={i} className="flex gap-2 items-start text-[15px] leading-7 text-ink">
          <span className="mt-1.5 shrink-0">
            <LayerBadge layer={s.layer} />
          </span>
          <span>{s.text}</span>
        </li>
      ))}
    </ul>
  );
}
