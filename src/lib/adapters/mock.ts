import { promises as fs } from "node:fs";
import path from "node:path";
import type { CollectionId, FieldValue, Record } from "@/lib/types";
import { SEED } from "@/lib/seed";
import type { DataAdapter } from "./types";

// In-memory adapter backed by a JSON file so edits survive across requests and
// dev-server reloads. This stands in for Jira until real access is available.

// Persist under .data locally. On read-only/serverless filesystems (e.g.
// Vercel), fall back to a writable temp dir; if even that fails, we keep data
// in memory for the life of the process (resets on cold start — fine for a
// demo, and a non-issue once the Jira adapter is live).
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

type Db = { [K in CollectionId]: Record[] };

let cache: Db | null = null;

async function load(): Promise<Db> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    cache = JSON.parse(raw) as Db;
  } catch {
    // First run: seed from the spreadsheet snapshot.
    cache = structuredClone(SEED);
    await persist();
  }
  return cache!;
}

async function persist(): Promise<void> {
  if (!cache) return;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch {
    // Read-only filesystem: keep working from the in-memory cache.
  }
}

function newId(): string {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export class MockAdapter implements DataAdapter {
  async list(collection: CollectionId): Promise<Record[]> {
    const db = await load();
    return db[collection] ?? [];
  }

  async create(collection: CollectionId, fields: { [key: string]: FieldValue }): Promise<Record> {
    const db = await load();
    const record: Record = { id: newId(), jiraKey: null, fields };
    db[collection] = [...(db[collection] ?? []), record];
    await persist();
    return record;
  }

  async update(
    collection: CollectionId,
    id: string,
    fields: { [key: string]: FieldValue }
  ): Promise<Record> {
    const db = await load();
    const list = db[collection] ?? [];
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Record ${id} not found in ${collection}`);
    list[idx] = { ...list[idx], fields: { ...list[idx].fields, ...fields } };
    await persist();
    return list[idx];
  }

  async remove(collection: CollectionId, id: string): Promise<void> {
    const db = await load();
    db[collection] = (db[collection] ?? []).filter((r) => r.id !== id);
    await persist();
  }

  async reorder(collection: CollectionId, ids: string[]): Promise<void> {
    const db = await load();
    const list = db[collection] ?? [];
    const pos = new Map(ids.map((id, i) => [id, i]));
    const rank = (id: string) => (pos.has(id) ? (pos.get(id) as number) : Number.MAX_SAFE_INTEGER);
    // Array.prototype.sort is stable, so records absent from `ids` keep order.
    list.sort((a, b) => rank(a.id) - rank(b.id));
    db[collection] = list;
    await persist();
  }
}
