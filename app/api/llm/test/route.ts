import { jsonResponse } from "@/lib/http";
import { sanitizeLLM } from "@/lib/llm";
import { testLLM } from "@/lib/deepseek";

export const runtime = "nodejs";

/**
 * POST /api/llm/test —— 测试用户自带的模型是否可用
 * body: { baseUrl, apiKey, model }
 * Key 只在本次请求内使用，不记录、不回显。
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "请求体不是合法 JSON" }, 400);
  }
  const llm = sanitizeLLM(body);
  if (!llm) {
    return jsonResponse({ error: "配置不完整：需要 http/https 地址、API Key 和模型名。" }, 400);
  }
  const result = await testLLM(llm);
  return jsonResponse(result);
}
