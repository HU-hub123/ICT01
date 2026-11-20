"use client";

import { useMemo } from "react";
import { castHexagram } from "@/lib/hexagrams";

const YI_POOL = ["梳理", "静观", "求证", "缓行", "深谈", "复盘", "留白", "补数据"];
const JI_POOL = ["急断", "追高", "意气", "轻信", "贪快", "硬撑", "多疑"];

const MOON_NAMES = ["新月", "娥眉月", "上弦月", "盈凸月", "满月", "亏凸月", "下弦月", "残月"];

const ZODIAC: [number, number, string][] = [
  [1, 20, "水瓶"], [2, 19, "双鱼"], [3, 21, "白羊"], [4, 20, "金牛"],
  [5, 21, "双子"], [6, 22, "巨蟹"], [7, 23, "狮子"], [8, 23, "处女"],
  [9, 23, "天秤"], [10, 24, "天蝎"], [11, 23, "射手"], [12, 22, "摩羯"],
];

function zodiacOf(d: Date): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  let cur = "摩羯"; // 1 月 1 日～1 月 19 日仍属摩羯
  for (const [mm, dd, name] of ZODIAC) {
    if (m > mm || (m === mm && day >= dd)) cur = name;
  }
  return cur;
}

function moonPhase(d: Date): { name: string; frac: number } {
  // 以 2000-01-06 18:14 UTC 为平均新月基准
  const base = Date.UTC(2000, 0, 6, 18, 14, 0);
  const days = (d.getTime() - base) / 86400000;
  const cycle = 29.530588853;
  const age = ((days % cycle) + cycle) % cycle;
  const idx = Math.floor(((age / cycle) * 8 + 0.5) % 8);
  return { name: MOON_NAMES[idx], frac: age / cycle };
}

function pick<T>(pool: T[], seed: number, n: number): T[] {
  const out: T[] = [];
  let s = seed;
  while (out.length < n && out.length < pool.length) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const item = pool[s % pool.length];
    if (!out.includes(item)) out.push(item);
  }
  return out;
}

/**
 * 旁参 · 换一个角度看（黄历 / 星象 / 六爻）
 *
 * 定位：辅助模块，默认折叠、放在结果最底部；不参与上文任何判断。
 * 内容由「问题 + 今天日期」确定性生成，并明确标注仅供换视角参照。
 */
export function SideOracle({ question }: { question: string }) {
  const data = useMemo(() => {
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const seed = castHexagram(question, dateKey);
    const cast = seed;
    const week = ["日", "一", "二", "三", "四", "五", "六"][now.getDay()];
    const moon = moonPhase(now);
    const yi = pick(YI_POOL, cast.hexagram.n * 31 + now.getDate(), 2);
    const ji = pick(JI_POOL, cast.hexagram.n * 17 + now.getMonth(), 2);
    return {
      date: `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日`,
      week: `星期${week}`,
      moon: moon.name,
      zodiac: zodiacOf(now),
      cast,
      yi,
      ji,
    };
  }, [question]);

  return (
    <details className="panel p-4">
      <summary className="cursor-pointer text-sm text-stone-500 select-none">
        🖋 旁参 · 换一个角度看（黄历 / 星象 / 六爻）
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs leading-5">
        <div className="rounded-lg border border-stone-200/70 bg-stone-50/40 p-3 space-y-1">
          <p className="text-[11px] tracking-wide text-stone-400">今日一页</p>
          <p className="text-stone-700">
            {data.date} · {data.week} · 月相 {data.moon}
          </p>
          <p className="text-stone-600">
            <span className="text-emerald-700">宜</span> {data.yi.join(" / ")}
          </p>
          <p className="text-stone-600">
            <span className="text-rose-700">忌</span> {data.ji.join(" / ")}
          </p>
        </div>
        <div className="rounded-lg border border-stone-200/70 bg-stone-50/40 p-3 space-y-1">
          <p className="text-[11px] tracking-wide text-stone-400">星象</p>
          <p className="text-stone-700">太阳落在 {data.zodiac}</p>
          <p className="text-stone-500">月有盈亏，事有节奏——不必拿满月的力气去做新月的事。</p>
        </div>
        <div className="rounded-lg border border-stone-200/70 bg-stone-50/40 p-3 space-y-1">
          <p className="text-[11px] tracking-wide text-stone-400">六爻 · 随手一卦</p>
          <p className="text-stone-700">
            {data.cast.hexagram.name} · {data.cast.hexagram.image}
          </p>
          <p className="text-lg tracking-[0.35em] text-stone-500" aria-hidden>
            {[...data.cast.lines].reverse().map((yang) => (yang ? "▬" : "▭")).join(" ")}
          </p>
          <p className="text-stone-600">{data.cast.hexagram.hint}</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-stone-400">
        这一页由「你的问题 + 今天的日期」生成，只借来换换视角：不参与上面的推演，也不构成任何判断依据。
      </p>
    </details>
  );
}
