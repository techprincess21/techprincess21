import { promises as fs } from "node:fs";
import path from "node:path";
import type { CollectionId, FieldValue, Record } from "@/lib/types";
import { SEED } from "@/lib/seed";
import type { DataAdapter } from "./types";

// In-memory adapter backed by a JSON file so edits survive across requests and
// dev-server reloads. This stands in for Jira until real access is available.

const DATA_DIR = path.join(process.cwd(), ".data");
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
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(cache, null, 2), "utf8");
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
}
