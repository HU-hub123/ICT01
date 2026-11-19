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
}

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "ledger.json");

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

  private mutate<T>(fn: (records: AnalysisRecord[]) => T): Promise<T> {
    const run = this.writeChain.then(async () => {
      const records = await this.readAll();
      return fn(records);
    });
    this.writeChain = run.then(() => undefined).catch(() => undefined);
    return run;
  }

  async list(): Promise<AnalysisRecord[]> {
    const records = await this.readAll();
    return records.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async get(id: string): Promise<AnalysisRecord | null> {
    const records = await this.readAll();
    return records.find((r) => r.id === id) ?? null;
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
      if (idx < 0) return null;
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
