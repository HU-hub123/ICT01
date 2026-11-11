import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 生产构建输出 .next + 完整 node_modules，由 Dockerfile 多阶段构建打包 */
  // 关闭开发模式左下角的指示器（演示录制需要干净的界面）
  devIndicators: false,
};

export default nextConfig;
