import { llmStatus } from "@/lib/deepseek";
import { jsonResponse } from "@/lib/http";
import { redact, sanitizeLLM, type LLMConfig } from "@/lib/llm";
import { runAnalysis } from "@/lib/pipeline";
import { checkRateLimit } from "@/lib/rate-limit";
import type { HistoryTurn } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/analyze —— 核心推演接口（SSE 流式返回）
 *
 * body: { question, extraFacts?, history?, llm? }
 * llm 为用户自带的 OpenAI 兼容模型配置（浏览器 localStorage → 每次请求携带），
 * 只在本次请求内使用，不落盘、不写日志。
 *
 * 事件类型：
 * - { type: "status", message }  阶段状态
 * - { type: "step", step }       某个阶段完成（含输入摘要与输出，供溯源回放）
 * - { type: "record", record }   完整分析记录（认知账本快照）
 * - { type: "error", message }   明确错误（绝不伪造输出；密钥已脱敏）
 */
export async function POST(req: Request) {
  let body: {
    question?: string;
    extraFacts?: string;
    history?: HistoryTurn[];
    llm?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "请求体不是合法 JSON" }, 400);
  }
  const question = (body?.question ?? "").trim().slice(0, 500);
  if (!question) {
    return jsonResponse({ error: "问题不能为空" }, 400);
  }
  const hasLLMField = body?.llm !== undefined && body?.llm !== null;
  const llm: LLMConfig | null = hasLLMField ? sanitizeLLM(body.llm) : null;
  if (hasLLMField && !llm) {
    return jsonResponse(
      { error: "模型配置不完整：需要同时填写接口地址（http/https）、API Key 和模型名。" },
      400,
    );
  }
  if (!llm && !llmStatus().configured) {
    return jsonResponse(
      {
        error:
          "还没有可用的模型：请点右上角「模型设置」填你自己的模型（地址 + Key + 模型名），或让部署者在 .env 里配置 DEEPSEEK_API_KEY。",
      },
      500,
    );
  }

  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const rate = await checkRateLimit(ip);
  if (!rate.allowed) {
    return jsonResponse(
      {
        error: `请求过于频繁：每小时最多 ${rate.limit} 次推演（当前第 ${rate.count} 次），请稍后再试。`,
      },
      429,
    );
  }

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = (o: unknown) => {
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
        } catch {
          // 客户端断开时忽略
        }
      };
      void (async () => {
        try {
          send({ type: "status", message: "推演开始：事实收口" });
          const record = await runAnalysis(
            {
              question,
              extraFacts: body?.extraFacts,
              history: Array.isArray(body?.history) ? body.history.slice(-5) : [],
            },
            (step) => send({ type: "step", step }),
            llm,
          );
          send({ type: "record", record });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          send({ type: "error", message: llm ? redact(msg, llm.apiKey) : msg });
        } finally {
          try {
            controller.close();
          } catch {
            // 已关闭则忽略
          }
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
