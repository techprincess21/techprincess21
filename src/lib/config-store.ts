import { promises as fs } from "node:fs";
import path from "node:path";
import { VIEWS } from "@/lib/views";

// Per-board customization store.
//
// Marketers need to tailor the dropdowns to each launch — e.g. a launch with no
// CKO shouldn't show "Post-CKO" as a time period. This store holds, per view,
// the option lists for each select column (overriding the code defaults), plus
// a shared list of people for owner autocomplete.
//
// Mock-backed today (a JSON file). With Jira live, much of this maps onto Jira's
// own field/option configuration — but keeping an app-level layer means teams
// can customize their board without needing Jira admin rights.

export interface AppConfig {
  // options[viewId][columnKey] = string[]
  options: { [viewId: string]: { [columnKey: string]: string[] } };
  people: string[];
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

const DEFAULT_PEOPLE = [
  "Abby Jacobs", "Bill Emmett", "Felicia Dorng", "Rachael Dula", "Joanna Zheng",
  "Sabrina Schipper", "Alexandra Gates", "Connor Loudon", "Mariano Romano",
  "Emily Walters", "Marie Hill", "Rachael King", "Carlo Tarantini",
  "Mickey", "Nate", "Alex", "Desi", "Judith", "Holly",
];

function defaultConfig(): AppConfig {
  const options: AppConfig["options"] = {};
  for (const view of VIEWS) {
    const cols: { [columnKey: string]: string[] } = {};
    for (const col of view.columns) {
      if (col.type === "select") cols[col.key] = [...(col.options ?? [])];
    }
    options[view.id] = cols;
  }
  return { options, people: [...DEFAULT_PEOPLE] };
}

let cache: AppConfig | null = null;

export async function getConfig(): Promise<AppConfig> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf8");
    const saved = JSON.parse(raw) as AppConfig;
    // Merge defaults so newly added views/columns always have a baseline.
    const base = defaultConfig();
    cache = {
      options: { ...base.options, ...saved.options },
      people: saved.people?.length ? saved.people : base.people,
    };
  } catch {
    cache = defaultConfig();
    await persist();
  }
  return cache;
}

async function persist(): Promise<void> {
  if (!cache) return;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(CONFIG_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch {
    // read-only fs (serverless): keep in-memory
  }
}

export async function setColumnOptions(
  viewId: string,
  columnKey: string,
  opts: string[]
): Promise<AppConfig> {
  const cfg = await getConfig();
  cfg.options[viewId] = { ...(cfg.options[viewId] ?? {}), [columnKey]: opts };
  await persist();
  return cfg;
}

export async function setPeople(people: string[]): Promise<AppConfig> {
  const cfg = await getConfig();
  cfg.people = people;
  await persist();
  return cfg;
}
