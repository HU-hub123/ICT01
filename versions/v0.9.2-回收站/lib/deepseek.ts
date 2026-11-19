/**
 * DeepSeek Provider（OpenAI 兼容）
 *
 * - 真实调用，绝不伪造模型效果；
 * - 网络/密钥异常时抛出明确的 LLMError，由上层转为用户可见的错误提示；
 * - 单步调用：超时 60s + 1 次重试（429/5xx），无迭代循环（防死循环见 pipeline.ts）。
 */

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
): Promise<unknown> {
  if (!API_KEY) {
    throw new LLMError(
      "未配置 DEEPSEEK_API_KEY：请在项目根目录 .env 中填入真实 Key 后重启服务（.env 不会被提交到 Git）。",
    );
  }
  const body = {
    model: MODEL,
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
      const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
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
        throw new LLMError(`模型调用失败（HTTP ${res.status}）：${text.slice(0, 300)}`, res.status);
      }
      const data = await res.json();
      const content: string = data?.choices?.[0]?.message?.content ?? "";
      if (!content) throw new LLMError("模型返回了空内容");
      return extractJSON(content);
    } catch (e) {
      lastErr = e;
      if (attempt === 1) throw e instanceof LLMError ? e : new LLMError(String((e as Error)?.message ?? e));
      await sleep(800);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new LLMError(String(lastErr));
}
