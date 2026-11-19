/**
 * Postgres（华为云 RDS）账本适配器
 *
 * 与 FileLedgerStore 实现同一接口，切换只需环境变量：
 *   LEDGER_STORE=postgres
 *   RDS_CONNECTION_STRING=postgres://user:pass@host:5432/db
 *
 * 测试：用 pg-mem 在内存里跑同一套 SQL（见 tests/store.test.mjs）。
 */
import type { AnalysisRecord, ReviewResult } from "./types";
import type { LedgerStore } from "./store";

export interface Queryable {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS ledger (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)`;

const CREATE_INDEX = `CREATE INDEX IF NOT EXISTS ledger_created_at_idx ON ledger (created_at DESC)`;

export class PostgresLedgerStore implements LedgerStore {
  private db: Queryable;

  constructor(db: Queryable) {
    this.db = db;
  }

  /** 兼容两种驱动：真实 pg 返回已解析对象；部分测试替身返回字符串 */
  private toRecord(value: unknown): AnalysisRecord {
    return (typeof value === "string" ? JSON.parse(value) : value) as AnalysisRecord;
  }

  async init(): Promise<void> {
    await this.db.query(CREATE_TABLE);
    try {
      await this.db.query(CREATE_INDEX);
    } catch {
      // 索引创建失败（权限/测试替身不支持）不影响读写
    }
  }

  async list(): Promise<AnalysisRecord[]> {
    const r = await this.db.query(`SELECT data FROM ledger ORDER BY created_at DESC`);
    return r.rows.map((row) => this.toRecord(row.data));
  }

  async get(id: string): Promise<AnalysisRecord | null> {
    const r = await this.db.query(`SELECT data FROM ledger WHERE id = $1`, [id]);
    const row = r.rows[0];
    return row ? this.toRecord(row.data) : null;
  }

  async save(record: AnalysisRecord): Promise<AnalysisRecord> {
    const payload = JSON.stringify(record);
    // 先 UPDATE 再 INSERT：兼容不同 PG 驱动/测试替身，避免依赖 ON CONFLICT 语法
    const updated = await this.db.query(
      `UPDATE ledger SET data = $2, status = $3, updated_at = now() WHERE id = $1 RETURNING id`,
      [record.id, payload, record.status],
    );
    if (updated.rows.length > 0) return record;
    try {
      await this.db.query(
        `INSERT INTO ledger (id, data, status, updated_at) VALUES ($1, $2, $3, now())`,
        [record.id, payload, record.status],
      );
    } catch {
      // 并发插入撞主键：补一次更新
      await this.db.query(
        `UPDATE ledger SET data = $2, status = $3, updated_at = now() WHERE id = $1`,
        [record.id, payload, record.status],
      );
    }
    return record;
  }

  async addReview(
    id: string,
    review: Omit<ReviewResult, "reviewedAt">,
  ): Promise<AnalysisRecord | null> {
    const current = await this.get(id);
    if (!current) return null;
    const now = new Date().toISOString();
    const updated: AnalysisRecord = {
      ...current,
      status: "reviewed",
      updatedAt: now,
      review: { ...review, reviewedAt: now },
    };
    await this.save(updated);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const r = await this.db.query(`DELETE FROM ledger WHERE id = $1 RETURNING id`, [id]);
    return r.rows.length > 0;
  }

  async removeMany(ids: string[]): Promise<number> {
    const clean = [...new Set(ids.filter(Boolean))];
    if (clean.length === 0) return 0;
    const placeholders = clean.map((_, i) => `$${i + 1}`).join(", ");
    const r = await this.db.query(
      `DELETE FROM ledger WHERE id IN (${placeholders}) RETURNING id`,
      clean,
    );
    return r.rows.length;
  }

  async clear(): Promise<number> {
    const r = await this.db.query(`DELETE FROM ledger RETURNING id`);
    return r.rows.length;
  }
}
