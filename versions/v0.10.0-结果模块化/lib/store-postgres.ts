/**
 * Postgres（华为云 RDS）账本适配器
 *
 * 与 FileLedgerStore 实现同一接口：软删除（deletedAt）→ 回收站 7 天 → 彻底删除。
 * 切换：LEDGER_STORE=postgres + RDS_CONNECTION_STRING=...
 * 测试：pg-mem 在内存里跑同一套 SQL（见 tests/store.test.mjs）。
 */
import type { AnalysisRecord, ReviewResult } from "./types";
import type { LedgerStore } from "./store";

/** 与 store.ts 保持一致的回收站保留期（7 天）；本地定义避免运行时跨文件依赖 */
const TRASH_RETENTION_MS = 7 * 24 * 3600 * 1000;

function withinTrashRetention(deletedAt?: string): boolean {
  if (!deletedAt) return false;
  return Date.now() - new Date(deletedAt).getTime() <= TRASH_RETENTION_MS;
}

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

  private async allRecords(): Promise<AnalysisRecord[]> {
    const r = await this.db.query(`SELECT data FROM ledger ORDER BY created_at DESC`);
    return r.rows.map((row) => this.toRecord(row.data));
  }

  private async getRaw(id: string): Promise<AnalysisRecord | null> {
    const r = await this.db.query(`SELECT data FROM ledger WHERE id = $1`, [id]);
    const row = r.rows[0];
    return row ? this.toRecord(row.data) : null;
  }

  async list(): Promise<AnalysisRecord[]> {
    const all = await this.allRecords();
    return all.filter((r) => !r.deletedAt).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async get(id: string): Promise<AnalysisRecord | null> {
    const rec = await this.getRaw(id);
    return rec && !rec.deletedAt ? rec : null;
  }

  async save(record: AnalysisRecord): Promise<AnalysisRecord> {
    const payload = JSON.stringify(record);
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
    const rec = await this.getRaw(id);
    if (!rec || rec.deletedAt) return false;
    await this.save({ ...rec, deletedAt: new Date().toISOString() });
    return true;
  }

  async removeMany(ids: string[]): Promise<number> {
    let n = 0;
    for (const id of [...new Set(ids)]) {
      const rec = await this.getRaw(id);
      if (rec && !rec.deletedAt) {
        await this.save({ ...rec, deletedAt: new Date().toISOString() });
        n += 1;
      }
    }
    return n;
  }

  async clear(): Promise<number> {
    const all = await this.list();
    let n = 0;
    const now = new Date().toISOString();
    for (const rec of all) {
      await this.save({ ...rec, deletedAt: now });
      n += 1;
    }
    return n;
  }

  async listDeleted(): Promise<AnalysisRecord[]> {
    await this.purgeExpired();
    const all = await this.allRecords();
    return all
      .filter((r) => r.deletedAt && withinTrashRetention(r.deletedAt))
      .sort((a, b) => (a.deletedAt! < b.deletedAt! ? 1 : -1));
  }

  async restore(id: string): Promise<AnalysisRecord | null> {
    const rec = await this.getRaw(id);
    if (!rec || !rec.deletedAt) return null;
    delete rec.deletedAt;
    rec.updatedAt = new Date().toISOString();
    await this.save(rec);
    return rec;
  }

  async purge(id: string): Promise<boolean> {
    const rec = await this.getRaw(id);
    if (!rec || !rec.deletedAt) return false;
    const r = await this.db.query(`DELETE FROM ledger WHERE id = $1 RETURNING id`, [id]);
    return r.rows.length > 0;
  }

  async clearTrash(): Promise<number> {
    const all = await this.allRecords();
    const ids = all.filter((r) => r.deletedAt).map((r) => r.id);
    if (ids.length === 0) return 0;
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
    const r = await this.db.query(
      `DELETE FROM ledger WHERE id IN (${placeholders}) RETURNING id`,
      ids,
    );
    return r.rows.length;
  }

  async purgeExpired(): Promise<number> {
    const all = await this.allRecords();
    const expired = all.filter((r) => r.deletedAt && !withinTrashRetention(r.deletedAt));
    if (expired.length === 0) return 0;
    const ids = expired.map((r) => r.id);
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
    const r = await this.db.query(
      `DELETE FROM ledger WHERE id IN (${placeholders}) RETURNING id`,
      ids,
    );
    return r.rows.length;
  }
}
