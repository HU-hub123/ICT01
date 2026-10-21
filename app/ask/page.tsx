import { AskWorkbench } from "@/components/AskWorkbench";

export default function AskPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-2">
      <h1 className="text-2xl font-bold text-zinc-900">工作台</h1>
      <p className="text-sm text-zinc-500">
        提出一个需要判断的问题。结论只是副产品——真正交付的是可溯源、可回放的思考过程。
      </p>
      <AskWorkbench />
    </div>
  );
}
