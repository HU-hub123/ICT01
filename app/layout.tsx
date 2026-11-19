import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "认知脚手架 · 可溯源思考工作台",
  description:
    "让 AI 的思考过程被看见、被检查、被记住、被复盘 —— 拒绝黑盒。多模型交叉验证、五层标注、溯源回放与认知账本。",
};

const nav = [
  { href: "/", label: "工作台" },
  { href: "/models", label: "模型库" },
  { href: "/ledger", label: "认知账本" },
  { href: "/ledger/stats", label: "复盘统计" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased min-h-screen flex flex-col">
        <header className="border-b border-line bg-paper/85 backdrop-blur sticky top-0 z-40">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-semibold text-ink whitespace-nowrap">
              <span className="serif text-[15px]">认知脚手架</span>
            </Link>
            <nav className="flex items-center gap-0.5 text-sm overflow-x-auto whitespace-nowrap ml-2">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="px-3 py-1.5 rounded-lg text-stone-600 hover:text-brand hover:bg-brand-soft/70 transition-colors"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line py-5 text-xs text-stone-400">
          <div className="mx-auto max-w-6xl px-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span>认知脚手架 · 保存结论，也保存得到结论的过程</span>
            <span className="text-stone-300">|</span>
            <Link href="/about" className="hover:text-stone-600">
              关于
            </Link>
            <Link href="/demo" className="hover:text-stone-600">
              演示
            </Link>
            <Link href="/models" className="hover:text-stone-600">
              模型库
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
