import { llmStatus } from "@/lib/deepseek";
import { runAnalysis } from "@/lib/pipeline";
import type { HistoryTurn } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/analyze —— 核心推演接口（SSE 流式返回）
 *
 * 事件类型：
 * - { type: "status", message }  阶段状态
 * - { type: "step", step }       某个阶段完成（含输入摘要与输出，供溯源回放）
 * - { type: "record", record }   完整分析记录（认知账本快照）
 * - { type: "error", message }   明确错误（绝不伪造输出）
 *
 * 防死循环：流水线为固定五阶段顺序执行（见 lib/pipeline.ts），
 * 每个阶段最多 2 次模型调用（1 正常 + 1 修复），无迭代循环。
 */
export async function POST(req: Request) {
  let body: { question?: string; extraFacts?: string; history?: HistoryTurn[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const question = (body?.question ?? "").trim().slice(0, 500);
  if (!question) {
    return Response.json({ error: "问题不能为空" }, { status: 400 });
  }
  if (!llmStatus().configured) {
    return Response.json(
      {
        error:
          "未配置 DEEPSEEK_API_KEY：请在项目根目录 .env 中填入真实的 DeepSeek API Key 后重启服务（.env 不会被提交到 Git）。",
      },
      { status: 500 },
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
          );
          send({ type: "record", record });
        } catch (e) {
          send({
            type: "error",
            message: e instanceof Error ? e.message : String(e),
          });
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
