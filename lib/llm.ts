/**
 * 用户自带的模型配置（BYOK：Bring Your Own Key）
 *
 * 约定：
 * - 只支持 OpenAI 兼容接口（DeepSeek / 华为云 MaaS / Ollama / OpenRouter / 硅基流动 等）；
 * - 配置由浏览器保存在 localStorage，随每次请求放在 body.llm 里；
 * - 服务端只在本次请求内使用，不落盘、不写日志；错误信息统一脱敏。
 */
export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  label?: string;
}

export function sanitizeLLM(input: unknown): LLMConfig | null {
  const o = (input ?? {}) as Record<string, unknown>;
  const baseUrl = String(o.baseUrl ?? "")
    .trim()
    .replace(/\/+$/, "");
  const apiKey = String(o.apiKey ?? "").trim();
  const model = String(o.model ?? "").trim();
  if (!baseUrl || !apiKey || !model) return null;
  if (!/^https?:\/\//i.test(baseUrl)) return null;
  if (baseUrl.length > 300 || apiKey.length > 400 || model.length > 120) return null;
  return { baseUrl, apiKey, model };
}

/** 把密钥替换成 ***，避免进入错误提示、SSE 与日志 */
export function redact(text: string, secret?: string): string {
  if (!secret || secret.length < 6) return text;
  return text.split(secret).join("***");
}

/** 拼接 OpenAI 兼容端点（兼容 baseUrl 自带 /v1 的情况） */
export function chatCompletionsUrl(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  if (/\/v\d+$/i.test(base)) return `${base}/chat/completions`;
  return `${base}/v1/chat/completions`;
}
