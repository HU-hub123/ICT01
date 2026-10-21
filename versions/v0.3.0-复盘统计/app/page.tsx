import Link from "next/link";

const PATH_STEPS = [
  { t: "提出问题", d: "说出一个需要判断的问题；追问时自动携带上一轮系统自己的回答" },
  { t: "事实收口", d: "区分你已确认的事实与目前缺失的信息，绝不替你猜" },
  { t: "模型匹配", d: "从 30 个可溯源模型中选 2-4 个，强制包含至少一对张力模型" },
  { t: "交叉推演", d: "各模型独立推演 → 显式冲突点 → 什么证据会改变判断（有收敛条件，不死循环）" },
  { t: "五层标注 + 最小行动", d: "每句话标注 事实/推断/假设/缺失信息/示例数字；给出最小行动与停止条件" },
  { t: "认知账本与复盘", d: "保存判断过程；事后回填实际结果，看哪个假设被现实推翻" },
];

const DIFFS = [
  {
    t: "真·交叉验证",
    d: "不是「找几个模型共同撑一篇答案」，而是强制模型「打架」：冲突点显式列出，各自在什么条件下成立。",
  },
  {
    t: "五层标注",
    d: "事实 / 推断 / 假设 / 缺失信息 / 示例数字。没有依据的数字永远只以「示例」出现，而不是假装精确的推荐阈值。",
  },
  {
    t: "溯源回放",
    d: "每一步为什么选这个模型、喂了什么上下文、模型原始输出是什么，全部留档可回放——AI 不再黑盒。",
  },
  {
    t: "认知账本",
    d: "保存「你是怎么得到这个判断的」：事实、假设、证据、理由、预测与停止条件；复盘时回填结果，形成长期认知轨迹。",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 space-y-12">
      <section className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900">
          让 AI 的思考过程被看见、被检查、被记住、被复盘
        </h1>
        <p className="text-zinc-500 max-w-2xl mx-auto">
          认知脚手架：从一个需要判断的问题出发，借助多个思维模型交叉推演。结论只是副产品——真正交付的，是
          <b className="text-zinc-700"> AI 是怎么一步步得出这个答案的</b>。
        </p>
        <blockquote className="text-sm text-zinc-500 italic">
          "我们保存了大量结论，却很少保存自己是如何得到这些结论的。"
        </blockquote>
        <div className="flex justify-center gap-3">
          <Link
            href="/ask"
            className="px-5 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700"
          >
            开始推演 →
          </Link>
          <Link
            href="/models"
            className="px-5 py-2.5 rounded-lg border border-zinc-300 text-zinc-700 text-sm font-medium hover:bg-white"
          >
            浏览 30 个可溯源模型
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4 text-center">一次完整的思考路径</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PATH_STEPS.map((s, i) => (
            <div key={s.t} className="panel p-4">
              <p className="text-xs text-zinc-400">0{i + 1}</p>
              <p className="font-medium text-zinc-900 mt-1">{s.t}</p>
              <p className="text-xs text-zinc-500 mt-1 leading-5">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4 text-center">
          与"模型检索问答"的四点不同
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {DIFFS.map((d) => (
            <div key={d.t} className="panel p-4">
              <p className="font-medium text-zinc-900">{d.t}</p>
              <p className="text-xs text-zinc-500 mt-1 leading-5">{d.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-6 text-center space-y-2">
        <p className="text-sm text-zinc-600">
          面向第十一届华为 ICT 大赛创新赛 · 赛题一（基于华为云产品打造 AI 创新应用）
        </p>
        <p className="text-xs text-zinc-400">
          Next.js 全栈 · DeepSeek 真实推理 · 预留华为云码道 CodeArts / RDS / Redis 适配层
        </p>
      </section>
    </div>
  );
}
