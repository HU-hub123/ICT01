"use client";

/** 用户自带的模型配置：只保存在浏览器 localStorage，服务端不落盘 */
export interface SavedModel {
  id: string;
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

const MODELS_KEY = "cogscaffold.models.v1";
const ACTIVE_KEY = "cogscaffold.active-model.v1";

export function loadModels(): SavedModel[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MODELS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m) => m && typeof m.id === "string" && typeof m.baseUrl === "string")
      .map((m) => ({
        id: String(m.id),
        label: String(m.label || m.model || "我的模型"),
        baseUrl: String(m.baseUrl),
        apiKey: String(m.apiKey ?? ""),
        model: String(m.model ?? ""),
      }));
  } catch {
    return [];
  }
}

export function persistModels(list: SavedModel[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MODELS_KEY, JSON.stringify(list));
  } catch {
    /* 隐私模式等场景忽略 */
  }
}

export function loadActiveId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function persistActiveId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(ACTIVE_KEY, id);
    else window.localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

export function newModelId(): string {
  return `m-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
