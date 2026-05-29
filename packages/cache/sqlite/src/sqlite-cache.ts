import { mkdir } from "node:fs/promises";
import path from "node:path";
import { WorkItemSchema, type WorkItem } from "@workcue/core";

export interface WriteWorkItemsToCacheOptions {
  dbPath: string;
  items: WorkItem[];
  sourceCounts?: Record<string, number>;
  syncedAt?: string;
}

export interface ReadWorkItemsFromCacheOptions {
  dbPath: string;
}

export interface WorkCueCacheWriteResult {
  dbPath: string;
  itemCount: number;
  syncedAt: string;
}

interface WorkItemRow {
  payload: string;
}

export async function writeWorkItemsToCache(options: WriteWorkItemsToCacheOptions): Promise<WorkCueCacheWriteResult> {
  const { DatabaseSync } = await import("node:sqlite");
  const syncedAt = options.syncedAt ?? new Date().toISOString();
  await mkdir(path.dirname(path.resolve(options.dbPath)), { recursive: true });

  const db = new DatabaseSync(options.dbPath);
  try {
    initializeDatabase(db);
    db.exec("BEGIN");
    db.exec("DELETE FROM work_items");

    const insert = db.prepare(`
      INSERT INTO work_items (
        id,
        source,
        source_id,
        status,
        title,
        payload,
        synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of options.items) {
      insert.run(item.id, item.source, item.sourceId, item.status, item.title, JSON.stringify(item), syncedAt);
    }

    const upsertMetadata = db.prepare(`
      INSERT INTO sync_metadata (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    upsertMetadata.run("synced_at", syncedAt);
    upsertMetadata.run("item_count", String(options.items.length));
    upsertMetadata.run("source_counts", JSON.stringify(options.sourceCounts ?? {}));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }

  return {
    dbPath: options.dbPath,
    itemCount: options.items.length,
    syncedAt
  };
}

export async function readWorkItemsFromCache(options: ReadWorkItemsFromCacheOptions): Promise<WorkItem[]> {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(options.dbPath, { readOnly: true });
  try {
    const rows = db.prepare("SELECT payload FROM work_items ORDER BY source, source_id").all() as unknown as WorkItemRow[];
    return rows.map((row) => WorkItemSchema.parse(JSON.parse(row.payload)));
  } finally {
    db.close();
  }
}

function initializeDatabase(db: { exec(sql: string): void }): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS work_items (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_id TEXT NOT NULL,
      status TEXT NOT NULL,
      title TEXT NOT NULL,
      payload TEXT NOT NULL,
      synced_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_work_items_source ON work_items(source);
    CREATE INDEX IF NOT EXISTS idx_work_items_status ON work_items(status);

    CREATE TABLE IF NOT EXISTS sync_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
