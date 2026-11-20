import { DemoPlayer } from "@/components/DemoPlayer";

export const metadata = {
  title: "演示 · 认知脚手架",
  description: "自动播放一次完整的推演：从提问到认知账本。真实调用模型，不是预录数据。",
};

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <p className="text-xs text-stone-400 mb-2">自动播放 · 真实调用模型</p>
      <DemoPlayer />
    </div>
  );
}
