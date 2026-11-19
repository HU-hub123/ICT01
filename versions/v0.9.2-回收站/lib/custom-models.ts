/**
 * 用户自定义思维模型（追加到模型库）
 *
 * 存储：data/custom-models.json（与账本同目录；接入 RDS 时可另建表，接口不变）
 * 约束：名称与大白话必填；关键词用于检索命中；张力对只能指向已有模型。
 */
import { promises as fs } from "fs";
import path from "path";
import type { ModelDef, OpRole } from "./types";
import { ROLE_LABELS } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "custom-models.json");

export interface CustomModelInput {
  name: string;
  nameEn?: string;
  role: OpRole;
  plain: string;
  definition?: string;
  scaffoldAction?: string;
  appliesWhen?: string;
  failsWhen?: string;
  tags?: string[];
  tensionWith?: string[];
}

function newId(): string {
  return `custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function cleanTags(input?: string[]): string[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.map((t) => String(t).trim()).filter(Boolean))].slice(0, 10);
}

function toModelDef(input: CustomModelInput): ModelDef {
  const name = (input.name || "").trim();
  if (!name) throw new Error("模型名称不能为空");
  if (name.length > 30) throw new Error("模型名称不能超过 30 个字");
  const plain = (input.plain || "").trim();
  if (!plain) throw new Error("请用一句话解释这个模型（大白话）");
  if (plain.length > 160) throw new Error("大白话解释不能超过 160 个字");
  const role = input.role;
  if (!role || !(role in ROLE_LABELS)) throw new Error("认知操作角色不合法");
  const tags = cleanTags(input.tags);
  return {
    id: newId(),
    name,
    nameEn: (input.nameEn || "").trim() || name,
    role,
    scaffoldAction: (input.scaffoldAction || "").trim() || plain,
    definition: (input.definition || "").trim() || plain,
    appliesWhen: (input.appliesWhen || "").trim() || "（未填写）",
    failsWhen: (input.failsWhen || "").trim() || "（未填写）",
    tags: tags.length > 0 ? tags : [name],
    tensionWith: Array.isArray(input.tensionWith)
      ? [...new Set(input.tensionWith.map(String))]
      : [],
    lineage: "用户自定义",
    sources: [{ label: "用户自定义条目", kind: "article" }],
    custom: true,
    plain,
  };
}

class CustomModelStore {
  private chain: Promise<void> = Promise.resolve();

  private async readAll(): Promise<ModelDef[]> {
    try {
      const raw = await fs.readFile(FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async writeAll(list: ModelDef[]): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(list, null, 2), "utf-8");
    await fs.rename(tmp, FILE);
  }

  private mutate<T>(fn: (list: ModelDef[]) => T): Promise<T> {
    const run = this.chain.then(async () => {
      const list = await this.readAll();
      return fn(list);
    });
    this.chain = run.then(() => undefined).catch(() => undefined);
    return run;
  }

  async list(): Promise<ModelDef[]> {
    return this.readAll();
  }

  async add(input: CustomModelInput): Promise<ModelDef> {
    return this.mutate(async (list) => {
      const model = toModelDef(input);
      list.push(model);
      await this.writeAll(list);
      return model;
    });
  }

  async remove(id: string): Promise<boolean> {
    return this.mutate(async (list) => {
      const idx = list.findIndex((m) => m.id === id);
      if (idx < 0) return false;
      list.splice(idx, 1);
      await this.writeAll(list);
      return true;
    });
  }
}

export const customModelStore = new CustomModelStore();
