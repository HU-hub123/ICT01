/**
 * 对话模式：基于一次结构化判断的"思考伙伴"对话
 *
 * 与自由聊天不同：每次回答都被约束在判断档案之内（不编数字、不跑题），
 * 并明确告诉用户"这条新信息是否可能改变判断"。
 */
import type { ChatMessage } from "./deepseek";

export interface ChatArchive {
  question: string;
  facts: string[];
  missing: string[];
  angles: { plain: string; name: string }[];
  conflicts: string[];
  conclusion: string[];
  action: string;
  stopCondition: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export function archiveToText(a: ChatArchive): string {
  const line = (label: string, items: string[]) =>
    items.length ? `- ${label}：${items.join("；")}` : `- ${label}：（暂无）`;
  return [
    `问题：${a.question}`,
    line("已知", a.facts),
    line("还缺", a.missing),
    line("看问题的角度", a.angles.map((x) => x.plain).filter(Boolean)),
    line("分歧", a.conflicts),
    line("结论", a.conclusion),
    `- 下一步：${a.action}`,
    `- 停止条件：${a.stopCondition}`,
  ].join("\n");
}

export function chatSystemPrompt(): string {
  return [
    "你是一位思考伙伴，正在和用户对话。系统已经为这个问题做过一次结构化判断，档案见下。",
    "规则：",
    "1. 用大白话，1-3 句，最多 120 字；不要分点、不要长篇大论。",
    "2. 只能依据档案和对话内容回答；档案里没有的数字和事实，不许编造。",
    "3. 如果用户提供了新信息、可能改变判断，就在 reply 里说清它影响哪一条，并把 needsReanalysis 设为 true。",
    "4. 需要澄清时，最多问 1 个问题。",
    "5. 不要提“模型”“提示词”“档案”这些词，像正常人说话。",
    "输出 JSON：{ \"reply\": \"给用户的话\", \"needsReanalysis\": true/false }",
  ].join("\n");
}

export function chatMessages(
  archive: ChatArchive,
  history: ChatTurn[],
  userMessage: string,
  opts?: { justAnalyzed?: boolean; justReanalyzed?: boolean },
): ChatMessage[] {
  const historyText = history
    .slice(-8)
    .map((m) => `${m.role === "user" ? "用户" : "你"}：${m.content}`)
    .join("\n");
  const situation = opts?.justAnalyzed
    ? "【现在的情况】你刚给用户做完一次完整判断。用 1-2 句话说清最关键的一句判断和下一步该做什么，然后停下来等用户回应。"
    : opts?.justReanalyzed
      ? "【现在的情况】用户补充了新信息，判断刚刚重新算过。用 1-2 句话说明哪里变了、下一步该做什么。"
      : "【现在的情况】继续对话。";
  return [
    { role: "system", content: chatSystemPrompt() },
    {
      role: "user",
      content: `【判断档案】\n${archiveToText(archive)}\n\n【最近的对话】\n${historyText || "（无）"}\n\n${situation}\n\n用户刚刚说：${userMessage}`,
    },
  ];
}
