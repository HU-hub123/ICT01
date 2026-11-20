import { callJSON } from "@/lib/deepseek";
import { chatMessages, type ChatArchive, type ChatTurn } from "@/lib/chat";
import { jsonResponse } from "@/lib/http";
import { redact, sanitizeLLM, type LLMConfig } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 120;

function asStringArray(v: unknown, max = 8): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean).slice(0, max);
}

function parseArchive(v: unknown): ChatArchive | null {
  const o = (v ?? {}) as Record<string, unknown>;
  const question = String(o.question ?? "").trim().slice(0, 500);
  if (!question) return null;
  const angles = Array.isArray(o.angles)
    ? o.angles
        .map((a) => {
          const x = (a ?? {}) as Record<string, unknown>;
          return { plain: String(x.plain ?? ""), name: String(x.name ?? "") };
        })
        .slice(0, 6)
    : [];
  return {
    question,
    facts: asStringArray(o.facts),
    missing: asStringArray(o.missing),
    angles,
    conflicts: asStringArray(o.conflicts, 4),
    conclusion: asStringArray(o.conclusion, 6),
    action: String(o.action ?? ""),
    stopCondition: String(o.stopCondition ?? ""),
  };
}

/**
 * POST /api/chat —— 对话模式的一次回复
 * body: { messages: ChatTurn[], archive, userMessage, justAnalyzed?, llm? }
 * 返回: { reply, needsReanalysis }
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "请求体不是合法 JSON" }, 400);
  }

  const userMessage = String(body?.userMessage ?? "").trim().slice(0, 1000);
  if (!userMessage) return jsonResponse({ error: "消息不能为空" }, 400);

  const archive = parseArchive(body?.archive);
  if (!archive) return jsonResponse({ error: "缺少判断档案，请先完成一次判断" }, 400);

  const history: ChatTurn[] = Array.isArray(body?.messages)
    ? (body.messages as Record<string, unknown>[])
        .map((m) => ({
          role: m?.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: String(m?.content ?? "").slice(0, 1500),
        }))
        .filter((m) => m.content.length > 0)
        .slice(-10)
    : [];

  const llm: LLMConfig | null =
    body?.llm === undefined || body?.llm === null ? null : sanitizeLLM(body.llm);
  if (body?.llm !== undefined && body?.llm !== null && !llm) {
    return jsonResponse({ error: "模型配置不完整，请在「接入我的模型」里补全。" }, 400);
  }

  try {
    const raw = (await callJSON(
      chatMessages(archive, history, userMessage, {
        justAnalyzed: body?.justAnalyzed === true,
        justReanalyzed: body?.justReanalyzed === true,
      }),
      { temperature: 0.5, maxTokens: 800 },
      llm,
    )) as Record<string, unknown>;
    const reply = String(raw?.reply ?? "").trim();
    if (!reply) return jsonResponse({ error: "模型没有给出回复，请重试。" }, 502);
    return jsonResponse({
      reply,
      needsReanalysis: raw?.needsReanalysis === true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse(
      { error: llm ? redact(msg, llm.apiKey) : msg },
      502,
    );
  }
}
