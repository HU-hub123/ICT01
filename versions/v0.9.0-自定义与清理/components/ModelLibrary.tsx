"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MODELS } from "@/lib/models-data";
import {
  DISCIPLINE_LABELS,
  getDiscipline,
  type Discipline,
} from "@/lib/plain-explain";
import { ROLE_LABELS, ROLE_NOTES, type ModelDef, type OpRole } from "@/lib/types";
import { ModelCard } from "./ModelCard";

const ROLE_KEYS = Object.keys(ROLE_LABELS) as OpRole[];
const DISCIPLINE_KEYS = Object.keys(DISCIPLINE_LABELS) as Discipline[];

/** 模型库浏览器：筛选 + 搜索 + 添加/删除自定义模型 */
export function ModelLibrary({
  usage,
  models,
}: {
  usage?: Record<string, number>;
  models?: ModelDef[];
}) {
  const router = useRouter();
  const all = models ?? MODELS;
  const [role, setRole] = useState<OpRole | "all">("all");
  const [discipline, setDiscipline] = useState<Discipline | "all">("all");
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [name, setName] = useState("");
  const [plain, setPlain] = useState("");
  const [newRole, setNewRole] = useState<OpRole>("check_bias");
  const [tags, setTags] = useState("");
  const [appliesWhen, setAppliesWhen] = useState("");
  const [failsWhen, setFailsWhen] = useState("");
  const [tensionWith, setTensionWith] = useState<string[]>([]);

  const filtered = all.filter(
    (m) =>
      (role === "all" || m.role === role) &&
      (discipline === "all" || getDiscipline(m.id) === discipline) &&
      (!q.trim() ||
        m.name.includes(q.trim()) ||
        m.nameEn.toLowerCase().includes(q.trim().toLowerCase()) ||
        m.tags.some((t) => t.includes(q.trim()))),
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      const res = await fetch("/api/models/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          plain,
          role: newRole,
          tags,
          appliesWhen,
          failsWhen,
          tensionWith,
        }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(j?.error ?? `保存失败（HTTP ${res.status}）`);
        return;
      }
      setName("");
      setPlain("");
      setTags("");
      setAppliesWhen("");
      setFailsWhen("");
      setTensionWith([]);
      setShowForm(false);
      router.refresh();
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function removeModel(id: string) {
    if (!window.confirm("删除这个自定义模型？（已保存的历史判断不受影响）")) return;
    const res = await fetch(`/api/models/custom/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      alert(j?.error ?? `删除失败（HTTP ${res.status}）`);
      return;
    }
    router.refresh();
  }

  const chip = (active: boolean) =>
    `px-3 py-1 rounded-full text-xs border transition-colors ${
      active
        ? "bg-brand text-white border-brand"
        : "bg-white/60 text-stone-600 border-line hover:border-stone-300"
    }`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] text-stone-400 mr-1">看问题的方式</span>
          <button type="button" onClick={() => setRole("all")} className={chip(role === "all")}>
            全部
          </button>
          {ROLE_KEYS.map((r) => (
            <button key={r} type="button" onClick={() => setRole(r)} className={chip(role === r)}>
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="px-3.5 py-1.5 rounded-full border border-brand/40 text-brand text-xs hover:bg-brand-soft/60"
        >
          {showForm ? "收起" : "＋ 添加模型"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="panel p-5 space-y-3">
          <p className="text-sm text-stone-500">
            添加你自己的思维模型。名称为必填，大白话解释会直接显示在卡片上；关键词用于让它在推演中被检索到。
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-stone-600">名称 *</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                placeholder="例如：最小可逆原则"
                className="mt-1 w-full px-3 py-2 text-sm border border-line rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">看问题的方式 *</span>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as OpRole)}
                className="mt-1 w-full px-3 py-2 text-sm border border-line rounded-xl bg-white"
              >
                {ROLE_KEYS.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}（{ROLE_NOTES[r]}）
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-stone-600">一句话解释 *（大白话，最多 160 字）</span>
            <input
              value={plain}
              onChange={(e) => setPlain(e.target.value)}
              maxLength={160}
              placeholder="例如：先问这件事能不能小成本撤回，再决定要不要押上全部。"
              className="mt-1 w-full px-3 py-2 text-sm border border-line rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <label className="block text-sm">
            <span className="text-stone-600">关键词（逗号分隔，用于检索命中）</span>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="例如：可逆, 退路, 试错, 最小代价"
              className="mt-1 w-full px-3 py-2 text-sm border border-line rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-stone-600">什么时候适用（可选）</span>
              <input
                value={appliesWhen}
                onChange={(e) => setAppliesWhen(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-line rounded-xl bg-white"
              />
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">什么时候不适用（可选）</span>
              <input
                value={failsWhen}
                onChange={(e) => setFailsWhen(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-line rounded-xl bg-white"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-stone-600">会与哪些角度冲突（可选，可多选）</span>
            <select
              multiple
              size={4}
              value={tensionWith}
              onChange={(e) =>
                setTensionWith(Array.from(e.target.selectedOptions).map((o) => o.value))
              }
              className="mt-1 w-full px-3 py-2 text-sm border border-line rounded-xl bg-white"
            >
              {all.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          {err && <p className="text-xs text-rose-600">{err}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-brand px-4 py-2 text-sm disabled:opacity-50"
            >
              {saving ? "保存中…" : "保存到模型库"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-full border border-line text-stone-600 text-sm"
            >
              取消
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[11px] text-stone-400 mr-1">领域</span>
        <button
          type="button"
          onClick={() => setDiscipline("all")}
          className={chip(discipline === "all")}
        >
          全部
        </button>
        {DISCIPLINE_KEYS.map((d) => (
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
          className="w-full sm:w-64 px-3 py-1.5 text-sm border border-line rounded-xl bg-white/90 text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>
      <p className="text-xs text-stone-400">
        共 {filtered.length} 个模型（其中自定义 {filtered.filter((m) => m.custom).length} 个）。卡片先给一句大白话；点「展开详解」才看定义、适用范围、失效边界与来源。
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((m) => (
          <ModelCard
            key={m.id}
            model={m}
            usedCount={usage?.[m.id] ?? 0}
            onDelete={m.custom ? () => removeModel(m.id) : undefined}
          />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-stone-400 py-8 text-center">没有匹配的模型</p>
      )}
    </div>
  );
}
