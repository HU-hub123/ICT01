import type { AnalysisRecord, PipelineStep } from "./types";

export interface AnalyzeHandlers {
  onStatus?: (msg: string) => void;
  onStep?: (step: PipelineStep) => void;
  onRecord?: (record: AnalysisRecord) => void;
}

/** 共享 SSE 客户端：解析 /api/analyze 的流式事件 */
export async function streamAnalyze(
  body: { question: string; extraFacts?: string; history?: { question: string; summary: string }[] },
  handlers: AnalyzeHandlers,
  signal?: AbortSignal,
): Promise<AnalysisRecord> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    throw new Error(j?.error ?? `请求失败（HTTP ${res.status}）`);
  }
  if (!res.body) throw new Error("响应没有内容");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let rec: AnalysisRecord | null = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      let ev: { type?: string; message?: string; step?: PipelineStep; record?: AnalysisRecord };
      try {
        ev = JSON.parse(line.slice(5).trim());
      } catch {
        continue;
      }
      if (ev.type === "status") handlers.onStatus?.(String(ev.message ?? ""));
      else if (ev.type === "step" && ev.step) handlers.onStep?.(ev.step);
      else if (ev.type === "record" && ev.record) {
        rec = ev.record;
        handlers.onRecord?.(rec);
      } else if (ev.type === "error") {
        throw new Error(String(ev.message ?? "推演失败"));
      }
    }
  }
  if (!rec) throw new Error("推演未返回结果（响应中断），请重试");
  return rec;
}

/** 保存一笔认知账本 */
export async function saveLedger(record: AnalysisRecord): Promise<AnalysisRecord> {
  const res = await fetch("/api/ledger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ record }),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.record) throw new Error(j?.error ?? "保存失败，请重试");
  return j.record as AnalysisRecord;
}
