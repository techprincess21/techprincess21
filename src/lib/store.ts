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
