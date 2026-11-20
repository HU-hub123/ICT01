/**
 * 存储与限流单测（不依赖真实数据库/网络）
 * 运行：node --test tests/store.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import RedisMock from "ioredis-mock";
import { PostgresLedgerStore } from "../lib/store-postgres.ts";
import { MemoryLimiter, RedisLimiter } from "../lib/rate-limit.ts";

function makeRecord(id = "rec-1") {
  return {
    id,
    createdAt: "2026-11-17T10:00:00.000Z",
    updatedAt: "2026-11-17T10:00:00.000Z",
    question: "该不该继续投入？",
    factsRecap: { confirmedFacts: ["已投入 18 个月"], missingInfo: ["缺 CAC"], coreJudgment: "继续与否" },
    selections: [{ modelId: "sunk-cost", reason: "历史投入", source: "llm" }],
    arguments: [],
    conflicts: [],
    agreementNote: "",
    checkpoints: [],
    conclusion: [{ layer: "inference", text: "应看未来收益。" }],
    minimalAction: { action: "补数据", stopCondition: "若 8 周无改善则停", observationWindow: "8 周" },
    steps: [],
    status: "open",
  };
}

test("Postgres 账本：初始化 / 保存 / 列表 / 复盘 / 覆盖", async () => {
  const mem = newDb();
  const pg = mem.adapters.createPg();
  const pool = new pg.Pool();
  const store = new PostgresLedgerStore(pool);
  await store.init();

  const rec = makeRecord();
  await store.save(rec);

  const list = await store.list();
  assert.equal(list.length, 1);
  assert.deepEqual(list[0].question, rec.question);

  const got = await store.get(rec.id);
  assert.equal(got.id, rec.id);

  const reviewed = await store.addReview(rec.id, {
    actualOutcome: "8 周后仍无改善",
    overturnedAssumptions: ["留存停滞是执行问题"],
    confirmedAssumptions: [],
    lesson: "先补口径再判断",
  });
  assert.equal(reviewed.status, "reviewed");
  assert.equal(reviewed.review.actualOutcome, "8 周后仍无改善");

  const again = await store.get(rec.id);
  assert.equal(again.status, "reviewed");
  assert.equal(again.review.overturnedAssumptions.length, 1);

  // upsert：同一 id 不重复，内容被覆盖
  await store.save({ ...rec, question: "改过的问题" });
  const list2 = await store.list();
  assert.equal(list2.length, 1);
  assert.equal(list2[0].question, "改过的问题");

  // 不存在的 id
  assert.equal(await store.get("nope"), null);
  assert.equal(
    await store.addReview("nope", {
      actualOutcome: "x",
      overturnedAssumptions: [],
      confirmedAssumptions: [],
      lesson: "",
    }),
    null,
  );

  // 软删除：进回收站 → 恢复 → 再删 → 清理过期
  await store.save(makeRecord("r2"));
  await store.save(makeRecord("r3"));
  assert.equal(await store.removeMany(["r2", "missing"]), 1);
  assert.equal((await store.list()).length, 2); // rec-1 + r3（r2 已在回收站）
  const trash = await store.listDeleted();
  assert.equal(trash.length, 1);
  assert.equal(trash[0].id, "r2");
  assert.equal(await store.get("r2"), null); // 回收站条目按 id 查不到

  const restored = await store.restore("r2");
  assert.equal(restored.id, "r2");
  assert.equal((await store.list()).length, 3);

  // 全部删除 → 回收站 3 条 → 清空回收站
  assert.equal(await store.clear(), 3);
  assert.equal((await store.list()).length, 0);
  assert.equal((await store.listDeleted()).length, 3);
  assert.equal(await store.clearTrash(), 3);
  assert.equal((await store.listDeleted()).length, 0);

  // 超过 7 天的回收站条目会被自动清理
  const old = makeRecord("old");
  old.deletedAt = new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString();
  await store.save(old);
  await store.purgeExpired();
  assert.equal((await store.listDeleted()).length, 0);
});

test("内存限流：同一 key 计数递增", async () => {
  const limiter = new MemoryLimiter();
  const a = await limiter.hit("1.2.3.4");
  const b = await limiter.hit("1.2.3.4");
  assert.equal(a.allowed, true);
  assert.equal(a.count, 1);
  assert.equal(b.count, 2);
  const other = await limiter.hit("5.6.7.8");
  assert.equal(other.count, 1);
});

test("Redis 限流：用 ioredis-mock 计数；异常时降级到内存", async () => {
  const mock = new RedisMock();
  const limiter = new RedisLimiter(mock, new MemoryLimiter());
  const a = await limiter.hit("k1");
  const b = await limiter.hit("k1");
  assert.equal(a.allowed, true);
  assert.equal(a.count, 1);
  assert.equal(b.count, 2);

  const broken = new RedisLimiter(
    {
      incr() {
        throw new Error("redis down");
      },
      async expire() {
        return 1;
      },
    },
    new MemoryLimiter(),
  );
  const r = await broken.hit("k2");
  assert.equal(r.allowed, true);
  assert.equal(r.count, 1);
});
