/**
 * 认知账本存储：适配器接口 + 本地 JSON / 华为云 RDS(Postgres) 双实现
 *
 * 切换方式（无需改业务代码）：
 *   LEDGER_STORE=file        默认，本地 JSON 文件（单机/演示）
 *   LEDGER_STORE=postgres    RDS/Postgres，需同时配置 RDS_CONNECTION_STRING
 *
 * 页面与 API 统一通过 `await getStore()` 获取实例。
 */

import { promises as fs } from "fs";
import path from "path";
import type { AnalysisRecord, ReviewResult } from "./types";
import { PostgresLedgerStore, type Queryable } from "./store-postgres";

export interface LedgerStore {
  list(): Promise<AnalysisRecord[]>;
  get(id: string): Promise<AnalysisRecord | null>;
  save(record: AnalysisRecord): Promise<AnalysisRecord>;
  addReview(id: string, review: Omit<ReviewResult, "reviewedAt">): Promise<AnalysisRecord | null>;
  /** 软删除（进回收站），返回是否成功 */
  remove(id: string): Promise<boolean>;
  /** 批量软删除，返回实际进入回收站的条数 */
  removeMany(ids: string[]): Promise<number>;
  /** 全部软删除，返回条数 */
  clear(): Promise<number>;
  /** 回收站（7 天内） */
  listDeleted(): Promise<AnalysisRecord[]>;
  /** 从回收站恢复 */
  restore(id: string): Promise<AnalysisRecord | null>;
  /** 彻底删除单条 */
  purge(id: string): Promise<boolean>;
  /** 清空回收站（彻底删除全部回收站条目） */
  clearTrash(): Promise<number>;
  /** 清理超过 7 天的曾删除记录，返回清理条数 */
  purgeExpired(): Promise<number>;
}

export const TRASH_RETENTION_MS = 7 * 24 * 3600 * 1000;

export function withinTrashRetention(deletedAt?: string): boolean {
  if (!deletedAt) return false;
  return Date.now() - new Date(deletedAt).getTime() <= TRASH_RETENTION_MS;
}

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "ledger.json");
const LOCK = path.join(DATA_DIR, ".ledger.lock");

class FileLedgerStore implements LedgerStore {
  private writeChain: Promise<void> = Promise.resolve();

  private async readAll(): Promise<AnalysisRecord[]> {
    try {
      const raw = await fs.readFile(FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async writeAll(records: AnalysisRecord[]): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(records, null, 2), "utf-8");
    await fs.rename(tmp, FILE);
  }

  /**
   * 跨进程写锁：避免"两个服务器进程各读各写"导致丢失更新。
   * 使用独占创建锁文件；超过 10 秒的陈旧锁会被清理；3 秒抢不到则降级继续（避免死锁）。
   */
  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const deadline = Date.now() + 3000;
    for (;;) {
      try {
        const handle = await fs.open(LOCK, "wx");
        await handle.close();
        break;
      } catch (e) {
        const code = (e as NodeJS.ErrnoException).code;
        if (code !== "EEXIST") throw e;
        try {
          const st = await fs.stat(LOCK);
          if (Date.now() - st.mtimeMs > 10_000) await fs.unlink(LOCK).catch(() => {});
        } catch {
          /* 锁文件刚被释放 */
        }
        if (Date.now() > deadline) break;
        await new Promise((r) => setTimeout(r, 50));
      }
    }
    try {
      return await fn();
    } finally {
      await fs.unlink(LOCK).catch(() => {});
    }
  }

  private mutate<T>(fn: (records: AnalysisRecord[]) => Promise<T> | T): Promise<T> {
    const run = this.writeChain.then(() =>
      this.withLock(async () => {
        const records = await this.readAll();
        return fn(records);
      }),
    );
    this.writeChain = run.then(() => undefined).catch(() => undefined);
    return run;
  }

  async list(): Promise<AnalysisRecord[]> {
    const records = await this.readAll();
    return records
      .filter((r) => !r.deletedAt)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async get(id: string): Promise<AnalysisRecord | null> {
    const records = await this.readAll();
    const rec = records.find((r) => r.id === id);
    return rec && !rec.deletedAt ? rec : null;
  }

  async save(record: AnalysisRecord): Promise<AnalysisRecord> {
    return this.mutate(async (records) => {
      const idx = records.findIndex((r) => r.id === record.id);
      if (idx >= 0) records[idx] = record;
      else records.push(record);
      await this.writeAll(records);
      return record;
    });
  }

  async addReview(
    id: string,
    review: Omit<ReviewResult, "reviewedAt">,
  ): Promise<AnalysisRecord | null> {
    return this.mutate(async (records) => {
      const idx = records.findIndex((r) => r.id === id);
      if (idx < 0 || records[idx].deletedAt) return null;
      const updated: AnalysisRecord = {
        ...records[idx],
        status: "reviewed",
        updatedAt: new Date().toISOString(),
        review: {
          ...review,
          reviewedAt: new Date().toISOString(),
        },
      };
      records[idx] = updated;
      await this.writeAll(records);
      return updated;
    });
  }

  async remove(id: string): Promise<boolean> {
    return this.mutate(async (records) => {
      const rec = records.find((r) => r.id === id);
      if (!rec || rec.deletedAt) return false;
      rec.deletedAt = new Date().toISOString();
      await this.writeAll(records);
      return true;
    });
  }

  async removeMany(ids: string[]): Promise<number> {
    const set = new Set(ids);
    return this.mutate(async (records) => {
      const now = new Date().toISOString();
      let n = 0;
      for (const r of records) {
        if (set.has(r.id) && !r.deletedAt) {
          r.deletedAt = now;
          n += 1;
        }
      }
      if (n > 0) await this.writeAll(records);
      return n;
    });
  }

  async clear(): Promise<number> {
    return this.mutate(async (records) => {
      const now = new Date().toISOString();
      let n = 0;
      for (const r of records) {
        if (!r.deletedAt) {
          r.deletedAt = now;
          n += 1;
        }
      }
      if (n > 0) await this.writeAll(records);
      return n;
    });
  }

  async listDeleted(): Promise<AnalysisRecord[]> {
    await this.purgeExpired();
    const records = await this.readAll();
    return records
      .filter((r) => r.deletedAt && withinTrashRetention(r.deletedAt))
      .sort((a, b) => (a.deletedAt! < b.deletedAt! ? 1 : -1));
  }

  async restore(id: string): Promise<AnalysisRecord | null> {
    return this.mutate(async (records) => {
      const rec = records.find((r) => r.id === id);
      if (!rec || !rec.deletedAt) return null;
      delete rec.deletedAt;
      rec.updatedAt = new Date().toISOString();
      await this.writeAll(records);
      return rec;
    });
  }

  async purge(id: string): Promise<boolean> {
    return this.mutate(async (records) => {
      const idx = records.findIndex((r) => r.id === id && !!r.deletedAt);
      if (idx < 0) return false;
      records.splice(idx, 1);
      await this.writeAll(records);
      return true;
    });
  }

  async clearTrash(): Promise<number> {
    return this.mutate(async (records) => {
      const before = records.length;
      const kept = records.filter((r) => !r.deletedAt);
      if (kept.length !== before) {
        records.length = 0;
        records.push(...kept);
        await this.writeAll(records);
      }
      return before - kept.length;
    });
  }

  async purgeExpired(): Promise<number> {
    return this.mutate(async (records) => {
      const before = records.length;
      const kept = records.filter((r) => !r.deletedAt || withinTrashRetention(r.deletedAt));
      if (kept.length !== before) {
        records.length = 0;
        records.push(...kept);
        await this.writeAll(records);
      }
      return before - kept.length;
    });
  }
}

let cachedStore: Promise<LedgerStore> | null = null;

/** 按环境变量选择存储实现（进程内缓存，Postgres 连接池复用） */
export function getStore(): Promise<LedgerStore> {
  if (!cachedStore) {
    cachedStore = (async (): Promise<LedgerStore> => {
      const usePostgres =
        process.env.LEDGER_STORE === "postgres" && !!process.env.RDS_CONNECTION_STRING;
      if (!usePostgres) return new FileLedgerStore();

      const mod = (await import("pg")) as unknown as { default?: unknown };
      const pg = (mod.default ?? mod) as unknown as {
        Pool: new (opts: { connectionString: string; max?: number }) => unknown;
      };
      const pool = new pg.Pool({
        connectionString: process.env.RDS_CONNECTION_STRING!,
        max: 10,
      });
      const store = new PostgresLedgerStore(pool as Queryable);
      await store.init();
      return store;
    })();
  }
  return cachedStore;
}
