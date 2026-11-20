/**
 * 模型 Provider（OpenAI 兼容）
 *
 * - 真实调用，绝不伪造模型效果；
 * - 支持用户自带配置（BYOK）：调用方传入 LLMConfig 时优先使用，否则回落到 .env；
 * - 网络/密钥异常时抛出明确的 LLMError，由上层转为用户可见的错误提示（密钥已脱敏）；
 * - 单步调用：超时 60s + 1 次重试（429/5xx），无迭代循环（防死循环见 pipeline.ts）。
 */

import type { LLMConfig } from "./llm";
import { chatCompletionsUrl, redact } from "./llm";

export class LLMError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

const BASE_URL = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "");
const API_KEY = process.env.DEEPSEEK_API_KEY || "";
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

export function llmStatus(): { configured: boolean; baseUrl: string; model: string } {
  return { configured: API_KEY.length > 0, baseUrl: BASE_URL, model: MODEL };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** 从模型输出中稳健地提取 JSON 对象（容忍 markdown 代码块包裹） */
function extractJSON(content: string): unknown {
  let text = content.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  if (start < 0) throw new LLMError("模型没有返回 JSON 对象");
  // 括号配对扫描
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        return JSON.parse(text.slice(start, i + 1));
      }
    }
  }
  throw new LLMError("模型返回的 JSON 不完整");
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callJSON(
  messages: ChatMessage[],
  opts?: { temperature?: number; maxTokens?: number },
  llm?: LLMConfig | null,
): Promise<unknown> {
  const baseUrl = (llm?.baseUrl || BASE_URL).replace(/\/+$/, "");
  const apiKey = llm?.apiKey || API_KEY;
  const model = llm?.model || MODEL;
  if (!apiKey) {
    throw new LLMError(
      llm
        ? "你还没有为这个模型填写 API Key：点右上角「模型设置」补上后再试。"
        : "未配置 DEEPSEEK_API_KEY：请在项目根目录 .env 中填入真实 Key 后重启服务（.env 不会被提交到 Git），或在「模型设置」里使用你自己的模型。",
    );
  }
  const body = {
    model,
    messages,
    temperature: opts?.temperature ?? 0.3,
    max_tokens: opts?.maxTokens ?? 3000,
    response_format: { type: "json_object" },
  };
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      const res = await fetch(chatCompletionsUrl(baseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new LLMError(`模型服务暂时不可用（HTTP ${res.status}），正在重试…`, res.status);
        await sleep(1500 * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new LLMError(
          redact(`模型调用失败（HTTP ${res.status}）：${text.slice(0, 300)}`, apiKey),
          res.status,
        );
      }
      const data = await res.json();
      const content: string = data?.choices?.[0]?.message?.content ?? "";
      if (!content) throw new LLMError("模型返回了空内容");
      return extractJSON(content);
    } catch (e) {
      lastErr = e;
      if (attempt === 1) {
        const msg = redact(e instanceof Error ? e.message : String(e), apiKey);
        throw e instanceof LLMError ? new LLMError(msg, e.status) : new LLMError(msg);
      }
      await sleep(800);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new LLMError(String(lastErr));
}

/** 连通性测试：发一条最小请求，确认地址 / Key / 模型名可用（失败信息已脱敏） */
export async function testLLM(llm: LLMConfig): Promise<{ ok: boolean; message: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(chatCompletionsUrl(llm.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${llm.apiKey}`,
      },
      body: JSON.stringify({
        model: llm.model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      }),
      signal: controller.signal,
    });
    if (res.ok) return { ok: true, message: "连接成功，模型可用。" };
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      message: redact(`连接失败（HTTP ${res.status}）：${text.slice(0, 200)}`, llm.apiKey),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      message: /abort/i.test(msg)
        ? "连接超时：请检查地址是否可从本机访问。"
        : redact(`连接失败：${msg}`, llm.apiKey),
    };
  } finally {
    clearTimeout(timer);
  }
}
