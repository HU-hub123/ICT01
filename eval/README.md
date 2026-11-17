# eval（评测与回归）

- `cases.json`：6 类 × 4 题 = 24 题评测集，含期望的缺失信息关键词 / 张力要求 / 检查点数量。
- `checks.mjs`：确定性断言（结构、五层、数字示例化、张力对、缺失覆盖、停止条件、过度断言）。
- `checks.test.mjs`：断言单测（`node --test eval/checks.test.mjs`，CI 必跑，不联网）。
- `run-eval.mjs`：对运行中的服务跑全量评测，输出 `reports/report-*.json`。
- `judge.mjs`：可选 LLM 评审（1-5 分），`EVAL_JUDGE=1` 时启用。

详细方法论见 [docs/评测与数据采集方案.md](../docs/评测与数据采集方案.md)。
