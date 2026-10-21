/**
 * 认知账本存储：适配器接口 + 本地 JSON 文件实现
 *
 * 华为云码道适配点（v0.4.0）：
 * - LedgerStore 是抽象接口，未来可新增 RdsLedgerStore（华为云 RDS PostgreSQL/MySQL）
 *   与 Redis 会话缓存实现，通过环境变量切换，业务代码零改动。
 */

import { promises as fs } from "fs";
import path from "path";
import type { AnalysisRecord, ReviewResult } from "./types";

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

export const store: LedgerStore = new FileLedgerStore();
