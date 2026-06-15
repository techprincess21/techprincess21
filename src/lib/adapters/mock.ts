import type { FieldValue, Record } from "@/lib/types";
import { SEED } from "@/lib/seed";
import { loadJson, saveJson } from "@/lib/store";
import type { DataAdapter } from "./types";

// Default adapter: stores all collections as a single JSON blob via the storage
// layer (durable KV when configured, local file otherwise). Reads fresh each
// call so writes from one serverless instance are visible to the next.
//
// This stands in for Jira until the JiraAdapter is switched on. The whole-db
// blob is fine for a small team; at scale we'd shard per collection/record.

type Db = { [collection: string]: Record[] };

const KEY = "db";

async function load(): Promise<Db> {
  return loadJson<Db>(KEY, structuredClone(SEED));
}

async function persist(db: Db): Promise<void> {
  await saveJson(KEY, db);
}

function newId(): string {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export class MockAdapter implements DataAdapter {
  async list(collection: string): Promise<Record[]> {
    const db = await load();
    return db[collection] ?? [];
  }

  async create(collection: string, fields: { [key: string]: FieldValue }): Promise<Record> {
    const db = await load();
    const record: Record = { id: newId(), jiraKey: null, fields };
    db[collection] = [...(db[collection] ?? []), record];
    await persist(db);
    return record;
  }

  async update(
    collection: string,
    id: string,
    fields: { [key: string]: FieldValue }
  ): Promise<Record> {
    const db = await load();
    const list = db[collection] ?? [];
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Record ${id} not found in ${collection}`);
    list[idx] = { ...list[idx], fields: { ...list[idx].fields, ...fields } };
    await persist(db);
    return list[idx];
  }

  async remove(collection: string, id: string): Promise<void> {
    const db = await load();
    db[collection] = (db[collection] ?? []).filter((r) => r.id !== id);
    await persist(db);
  }

  async reorder(collection: string, ids: string[]): Promise<void> {
    const db = await load();
    const list = db[collection] ?? [];
    const pos = new Map(ids.map((id, i) => [id, i]));
    const rank = (id: string) => (pos.has(id) ? (pos.get(id) as number) : Number.MAX_SAFE_INTEGER);
    // Array.prototype.sort is stable, so records absent from `ids` keep order.
    list.sort((a, b) => rank(a.id) - rank(b.id));
    db[collection] = list;
    await persist(db);
  }
}
