"use client";

import { useState } from "react";
import { MODELS } from "@/lib/models-data";
import { ROLE_LABELS, type OpRole } from "@/lib/types";
import { ModelCard } from "./ModelCard";

/** 模型库浏览器：按认知操作角色筛选 + 关键词搜索；usage 为历史推演使用次数 */
export function ModelLibrary({ usage }: { usage?: Record<string, number> }) {
  const [role, setRole] = useState<OpRole | "all">("all");
  const [q, setQ] = useState("");
  const roles = Object.keys(ROLE_LABELS) as OpRole[];

  const filtered = MODELS.filter(
    (m) =>
      (role === "all" || m.role === role) &&
      (!q.trim() ||
        m.name.includes(q.trim()) ||
        m.nameEn.toLowerCase().includes(q.trim().toLowerCase()) ||
        m.tags.some((t) => t.includes(q.trim()))),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setRole("all")}
            className={`px-3 py-1 rounded-full text-xs border ${
              role === "all"
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
            }`}
          >
            全部（{MODELS.length}）
          </button>
          {roles.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`px-3 py-1 rounded-full text-xs border ${
                role === r
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
              }`}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索模型 / 关键词"
          className="w-full sm:w-56 px-3 py-1.5 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
        />
      </div>
      <p className="text-xs text-zinc-400">
        共 {filtered.length} 个模型。每个模型都标注了：它撑起哪一段思考（认知操作角色）、要求你执行什么动作、在什么条件下成立与失效、与哪些模型存在张力。
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((m) => (
          <ModelCard key={m.id} model={m} usedCount={usage?.[m.id] ?? 0} />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-zinc-400 py-8 text-center">没有匹配的模型</p>
      )}
    </div>
  );
}
