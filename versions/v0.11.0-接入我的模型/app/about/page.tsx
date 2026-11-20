import Link from "next/link";

const STEPS = [
  { t: "提出问题", d: "说出一件正在犹豫的事；追问时，系统会带着上一轮的回答继续。" },
  { t: "分清事实与缺口", d: "你亲口说过的才算事实，其余标成「缺失信息」，不替你做假设。" },
  { t: "挑几个角度", d: "从 42 个模型里挑 2-4 个，其中至少一对会互相打架。" },
  { t: "让角度互相质询", d: "先各自说话，再摆出冲突点：各自在什么条件下成立。" },
  { t: "收束成判断", d: "每句话标出成色：事实、推断、假设、缺信息、示例数字。" },
  { t: "存进账本再复盘", d: "把判断过程存下来；事后回填结果，看哪个假设被推翻。" },
];

const DIFFS = [
  { t: "它会和你「对着想」", d: "不是找几个模型一起撑一篇答案，而是故意让角度之间互相打架，冲突点摊开给你看。" },
  { t: "每句话都标了成色", d: "事实、推断、假设、缺失信息、示例数字——一眼分得清哪句有底、哪句只是猜。" },
  { t: "数字不装精确", d: "没有依据的数字一律标明「仅为示例，不是推荐阈值」，不拿漂亮数字壮胆。" },
  { t: "过程可以回放", d: "为什么选这个角度、喂了什么上下文、模型原话是什么，全都留着，随时能翻。" },
  { t: "判断过程能存下来", d: "存的不是聊天记录，是问题、事实、假设、证据、预测与停止条件；以后回填结果即可复盘。" },
  { t: "术语都配大白话", d: "每个模型先给一句人话；想深究再展开看定义、边界、来源。也有一页「旁参」换换视角。" },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-10">
      <section className="space-y-3">
        <p className="text-[11px] tracking-[0.3em] text-stone-400">关于</p>
        <h1 className="serif text-3xl font-bold text-ink">一个帮你想清楚的工具</h1>
        <p className="text-stone-500 leading-7">
          从一个正在犹豫的问题出发，借几个角度互相质询。结论只是副产品——
          真正留下的，是「它是怎么想到这一步的」，以及你自己下一步怎么做。
        </p>
        <p className="text-sm text-stone-400 italic">
          「我们保存了大量结论，却很少保存自己是如何得到这些结论的。」
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href="/" className="btn-brand px-5 py-2.5 text-sm font-medium">
            开始一次推演
          </Link>
          <Link
            href="/demo"
            className="px-5 py-2.5 rounded-full border border-line bg-white/60 text-stone-700 text-sm font-medium hover:border-brand/40 hover:text-brand"
          >
            看自动演示
          </Link>
        </div>
      </section>

      <section>
        <h2 className="serif text-lg font-semibold text-ink mb-3">一次推演，六步走</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <div key={s.t} className="panel p-4">
              <p className="serif text-xs text-stone-300">{String(i + 1).padStart(2, "0")}</p>
              <p className="font-medium text-ink mt-1">{s.t}</p>
              <p className="text-sm text-stone-500 mt-1 leading-6">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="serif text-lg font-semibold text-ink mb-3">它和「问 AI 要个答案」不一样的地方</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {DIFFS.map((d) => (
            <div key={d.t} className="panel p-4">
              <p className="font-medium text-ink">{d.t}</p>
              <p className="text-sm text-stone-500 mt-1 leading-6">{d.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-5 text-sm text-stone-500 leading-7">
        <p>
          技术上是 Next.js 全栈 + 真实 DeepSeek 推理；账本可切换本地文件或 Postgres（RDS），
          限流可接 Redis。评测与数据采集方案、模型库说明都在仓库文档里。
        </p>
        <p className="mt-2">
          <a
            href="https://github.com/HU-hub123/ICT01"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline"
          >
            github.com/HU-hub123/ICT01
          </a>
        </p>
      </section>
    </div>
  );
}
