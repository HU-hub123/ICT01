/**
 * LLM 评审（可选）：对单条推演记录按 1-5 分打分。
 * 只在实际评测时启用（EVAL_JUDGE=1），需要真实 DEEPSEEK_API_KEY。
 */
const BASE = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "");
const KEY = process.env.DEEPSEEK_API_KEY || "";
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

function compact(record) {
  const sel = (record.selections || []).map((s) => `${s.modelId}: ${s.reason || ""}`).join("\n");
  const conf = (record.conflicts || []).map((c) => `[${c.between.join("×")}] ${c.statement}（成立条件：${c.resolutionCondition}）`).join("\n");
  const cp = (record.checkpoints || []).map((c) => `假设：${c.hypothesis}｜支持：${c.confirmingEvidence}｜推翻：${c.disconfirmingEvidence}`).join("\n");
  const con = (record.conclusion || []).map((s) => `[${s.layer}] ${s.text}`).join("\n");
  return [
    `问题：${record.question}`,
    `补充事实：${record.extraFacts || "（无）"}`,
    `已确认事实：${(record.factsRecap?.confirmedFacts || []).join("；") || "（无）"}`,
    `缺失信息：${(record.factsRecap?.missingInfo || []).join("；") || "（无）"}`,
    `选中的模型：\n${sel}`,
    `冲突：\n${conf || "（无）"}`,
    `检查点：\n${cp || "（无）"}`,
    `结论：\n${con || "（无）"}`,
    `最小行动：${record.minimalAction?.action || ""}`,
    `停止条件：${record.minimalAction?.stopCondition || ""}`,
    `观察窗口：${record.minimalAction?.observationWindow || ""}`,
  ].join("\n\n");
}

export async function judgeRecord(kase, record) {
  if (!KEY) throw new Error("未配置 DEEPSEEK_API_KEY");
  const system =
    "你是严格的产品评审。根据一份「多模型交叉推演」的输出，按 1-5 分打分。只输出 JSON。评分标准：5=优秀、3=合格、1=很差。不要因为文本长就给高分。";
  const user = `请评审以下推演（用户问题类别：${kase?.category || "未知"}）：

${compact(record)}

打分维度（各 1-5 分）：
- facts_separation：事实、推断、假设、缺失信息是否被清楚区分（有没有把猜测写成事实）
- missing_info_value：列出的缺失信息是否真的影响结论（而不是凑数）
- conflict_quality：冲突是否真实存在、是否说明了各自成立条件（而不是同一论证的重复）
- actionability：最小行动与停止条件是否具体、可检验
- overall：综合分
另外用一句话指出最大的问题（comment）。

输出 JSON：{"facts_separation":n,"missing_info_value":n,"conflict_quality":n,"actionability":n,"overall":n,"comment":"..."}`;

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`评审调用失败 HTTP ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "{}";
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { overall: null, comment: "评审输出无法解析" };
  }
  return parsed;
}
