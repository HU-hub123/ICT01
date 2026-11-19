/**
 * 合并后的模型库（内置 42 个 + 用户自定义）
 * 服务端使用：检索、推演、模型库页面、/api/models。
 */
import { MODELS } from "./models-data";
import { customModelStore } from "./custom-models";
import type { ModelDef, ModelLite } from "./types";

export async function getAllModels(): Promise<ModelDef[]> {
  const custom = await customModelStore.list();
  return [...MODELS, ...custom];
}

export async function getModelMap(): Promise<Record<string, ModelDef>> {
  return Object.fromEntries((await getAllModels()).map((m) => [m.id, m]));
}

export function toLite(m: ModelDef): ModelLite {
  return {
    id: m.id,
    name: m.name,
    nameEn: m.nameEn,
    role: m.role,
    scaffoldAction: m.scaffoldAction,
    definition: m.definition,
    tensionWith: m.tensionWith,
    plain: m.plain,
  };
}
