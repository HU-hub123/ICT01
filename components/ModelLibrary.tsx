"use client";

import { useState } from "react";
import { MODELS } from "@/lib/models-data";
import {
  DISCIPLINE_LABELS,
  getDiscipline,
  type Discipline,
} from "@/lib/plain-explain";
import { ROLE_LABELS, type OpRole } from "@/lib/types";
import { ModelCard } from "./ModelCard";

/** 模型库浏览器：按认知操作 / 领域筛选 + 关键词搜索；usage 为历史推演使用次数 */
export function ModelLibrary({ usage }: { usage?: Record<string, number> }) {
  const [role, setRole] = useState<OpRole | "all">("all");
  const [discipline, setDiscipline] = useState<Discipline | "all">("all");
  const [q, setQ] = useState("");
  const roles = Object.keys(ROLE_LABELS) as OpRole[];
  const disciplines = Object.keys(DISCIPLINE_LABELS) as Discipline[];

  const filtered = MODELS.filter(
    (m) =>
      (role === "all" || m.role === role) &&
      (discipline === "all" || getDiscipline(m.id) === discipline) &&
      (!q.trim() ||
        m.name.includes(q.trim()) ||
        m.nameEn.toLowerCase().includes(q.trim().toLowerCase()) ||
        m.tags.some((t) => t.includes(q.trim()))),
  );

  const chip = (active: boolean) =>
    `px-3 py-1 rounded-full text-xs border transition-colors ${
      active
        ? "bg-brand text-white border-stone-800"
        : "bg-white/60 text-stone-600 border-line hover:border-stone-300"
    }`;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] text-stone-400 mr-1">看问题的方式</span>
          <button type="button" onClick={() => setRole("all")} className={chip(role === "all")}>
            全部
          </button>
          {roles.map((r) => (
            <button key={r} type="button" onClick={() => setRole(r)} className={chip(role === r)}>
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] text-stone-400 mr-1">领域</span>
          <button
            type="button"
            onClick={() => setDiscipline("all")}
            className={chip(discipline === "all")}
          >
            全部
          </button>
          {disciplines.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDiscipline(d)}
              className={chip(discipline === d)}
            >
              {DISCIPLINE_LABELS[d]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索模型 / 关键词"
            className="w-full sm:w-64 px-3 py-1.5 text-sm border border-line rounded-xl bg-white/90 text-ink focus:outline-none focus:ring-2 focus:ring-stone-300/60"
          />
        </div>
      </div>
      <p className="text-xs text-stone-400">
        共 {filtered.length} 个模型。卡片上先给一句大白话；点「展开详解」才看定义、适用范围、失效边界与来源。
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((m) => (
          <ModelCard key={m.id} model={m} usedCount={usage?.[m.id] ?? 0} />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-stone-400 py-8 text-center">没有匹配的模型</p>
      )}
    </div>
  );
}
