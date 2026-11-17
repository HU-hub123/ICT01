import { DemoPlayer } from "@/components/DemoPlayer";

export const metadata = {
  title: "演示模式 · 认知脚手架",
  description: "自动播放一次完整的推演：从提问到认知账本，界面自带解说字幕。",
};

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <p className="text-xs text-stone-400 mb-2">
        演示模式 · 自动播放 · 真实调用 DeepSeek 推理（非预录数据）
      </p>
      <DemoPlayer />
    </div>
  );
}
