import { promises as fs } from "node:fs";
import path from "node:path";

// Durable JSON storage with two backends, chosen at runtime:
//
//   • KV (Vercel KV / Upstash Redis) — used when the REST env vars are present.
//     This is what makes boards + data survive serverless cold starts.
//   • Local file (.data/<key>.json) — the dev fallback when KV isn't configured.
//
// Both store/return plain JSON, so callers (config-store, the mock adapter) just
// hand us a value and a key. No external SDK — we call the KV REST API directly.

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");

export function kvEnabled(): boolean {
  return Boolean(KV_URL && KV_TOKEN);
}

export function storageMode(): "kv" | "file" {
  return kvEnabled() ? "kv" : "file";
}

// Run a single Upstash-style REST command, e.g. ["GET", key] or ["SET", key, val].
async function kvCommand(cmd: (string | number)[]): Promise<{ result?: unknown }> {
  const res = await fetch(KV_URL as string, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KV ${cmd[0]} -> ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const NS = "goatsana:";

export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  if (kvEnabled()) {
    try {
      const { result } = await kvCommand(["GET", NS + key]);
      if (typeof result === "string") return JSON.parse(result) as T;
      return fallback;
    } catch {
      return fallback;
    }
  }
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${key}.json`), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveJson(key: string, value: unknown): Promise<void> {
  const data = JSON.stringify(value);
  if (kvEnabled()) {
    try {
      await kvCommand(["SET", NS + key, data]);
    } catch {
      // Best effort — a failed write shouldn't crash the request.
    }
    return;
  }
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(path.join(DATA_DIR, `${key}.json`), data, "utf8");
  } catch {
    // Read-only filesystem (serverless without KV): nothing persists, but the
    // request still succeeds with in-process data.
  }
}

// Append-only event log, used for the audit trail. In KV mode this is a Redis
// list written with LPUSH + LTRIM — atomic, so concurrent events never clobber
// each other (unlike read-modify-write on a JSON blob). In the file fallback
// it's a capped JSON array. Newest entries first.
export async function appendLog(key: string, entry: unknown, cap = 1000): Promise<void> {
  const data = JSON.stringify(entry);
  if (kvEnabled()) {
    try {
      await kvCommand(["LPUSH", NS + key, data]);
      await kvCommand(["LTRIM", NS + key, 0, cap - 1]);
    } catch {
      // Best effort — a failed audit write must never break the user's action.
    }
    return;
  }
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const file = path.join(DATA_DIR, `${key}.json`);
    let arr: unknown[] = [];
    try {
      arr = JSON.parse(await fs.readFile(file, "utf8"));
      if (!Array.isArray(arr)) arr = [];
    } catch {
      arr = [];
    }
    arr.unshift(entry);
    if (arr.length > cap) arr = arr.slice(0, cap);
    await fs.writeFile(file, JSON.stringify(arr), "utf8");
  } catch {
    // Read-only filesystem: nothing persists.
  }
}

export async function readLog<T>(key: string, limit = 200): Promise<T[]> {
  if (kvEnabled()) {
    try {
      const { result } = await kvCommand(["LRANGE", NS + key, 0, limit - 1]);
      if (Array.isArray(result)) return result.map((s) => JSON.parse(String(s)) as T);
      return [];
    } catch {
      return [];
    }
  }
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${key}.json`), "utf8");
    const arr = JSON.parse(raw) as T[];
    return Array.isArray(arr) ? arr.slice(0, limit) : [];
  } catch {
    return [];
  }
}
