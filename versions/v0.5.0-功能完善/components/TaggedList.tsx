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
    return <p className="text-sm text-zinc-400">{emptyText}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((s, i) => (
        <li key={i} className="flex gap-2 items-start text-sm leading-6 text-zinc-800">
          <span className="mt-0.5 shrink-0">
            <LayerBadge layer={s.layer} />
          </span>
          <span>{s.text}</span>
        </li>
      ))}
    </ul>
  );
}
