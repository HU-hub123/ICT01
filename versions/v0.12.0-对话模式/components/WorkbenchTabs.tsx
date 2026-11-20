"use client";

import { useState } from "react";
import { AskWorkbench } from "./AskWorkbench";
import { ChatWorkbench } from "./ChatWorkbench";

/** 工作台的两种用法：聊天式 / 一次完整判断 */
export function WorkbenchTabs() {
  const [tab, setTab] = useState<"chat" | "one">("chat");

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-full border border-line bg-white/70 p-0.5">
        <button
          type="button"
          onClick={() => setTab("chat")}
          className={`px-4 py-1.5 text-xs rounded-full transition-colors ${
            tab === "chat" ? "bg-brand text-white" : "text-stone-600 hover:text-ink"
          }`}
        >
          聊一聊
        </button>
        <button
          type="button"
          onClick={() => setTab("one")}
          className={`px-4 py-1.5 text-xs rounded-full transition-colors ${
            tab === "one" ? "bg-brand text-white" : "text-stone-600 hover:text-ink"
          }`}
        >
          一次完整判断
        </button>
      </div>

      {tab === "chat" ? <ChatWorkbench /> : <AskWorkbench />}
    </div>
  );
}
