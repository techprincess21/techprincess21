import { promises as fs } from "node:fs";
import path from "node:path";
import { VIEWS } from "@/lib/views";
import { DEFAULT_ROLES, DEFAULT_USER_ROLES } from "@/lib/rbac";
import type { ConfigAutomation } from "@/lib/playbooks";

// Per-board customization store.
//
// Marketers need to tailor boards to each launch without code: the dropdown
// choices per column, the order of columns, the order of tabs, the chip colors,
// and a shared list of people for owner autocomplete.
//
// Mock-backed today (a JSON file). With Jira live, much of this maps onto Jira's
// own field/option configuration — but keeping an app-level layer means teams
// can customize their board without needing Jira admin rights.

export interface AppConfig {
  options: { [viewId: string]: { [columnKey: string]: string[] } };
  columnOrder: { [viewId: string]: string[] };
  tabOrder: string[];
  colors: { [viewId: string]: { [columnKey: string]: { [value: string]: string } } };
  people: string[];
  roles: { [role: string]: string[] };
  userRoles: { [userId: string]: string };
  // Admin-added users (beyond the built-in demo identities), assignable to roles.
  users: { id: string; name: string }[];
  // Automation builder overrides: per work type, per team -> target project /
  // assignees. Empty = use the code-defined playbook defaults.
  playbooks: { [workType: string]: { [team: string]: { project?: string; assignees?: string } } };
  // User-created automations (added in the Automations builder).
  automations: ConfigAutomation[];
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
  const columnOrder: AppConfig["columnOrder"] = {};
  for (const view of VIEWS) {
    const cols: { [columnKey: string]: string[] } = {};
    for (const col of view.columns) {
      if (col.type === "select") cols[col.key] = [...(col.options ?? [])];
    }
    options[view.id] = cols;
    columnOrder[view.id] = view.columns.map((c) => c.key);
  }
  return {
    options,
    columnOrder,
    tabOrder: VIEWS.map((v) => v.id),
    colors: {},
    people: [...DEFAULT_PEOPLE],
    roles: structuredClone(DEFAULT_ROLES),
    userRoles: { ...DEFAULT_USER_ROLES },
    users: [],
    playbooks: {},
    automations: [],
  };
}

let cache: AppConfig | null = null;

export async function getConfig(): Promise<AppConfig> {
  if (cache) return cache;
  const base = defaultConfig();
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf8");
    const saved = JSON.parse(raw) as Partial<AppConfig>;
    cache = {
      options: { ...base.options, ...(saved.options ?? {}) },
      columnOrder: { ...base.columnOrder, ...(saved.columnOrder ?? {}) },
      tabOrder: saved.tabOrder?.length ? saved.tabOrder : base.tabOrder,
      colors: saved.colors ?? {},
      people: saved.people?.length ? saved.people : base.people,
      roles: { ...base.roles, ...(saved.roles ?? {}) },
      userRoles: { ...base.userRoles, ...(saved.userRoles ?? {}) },
      users: saved.users ?? [],
      playbooks: saved.playbooks ?? {},
      automations: saved.automations ?? [],
    };
  } catch {
    cache = base;
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

export async function setColumnOptions(viewId: string, columnKey: string, opts: string[]) {
  const cfg = await getConfig();
  cfg.options[viewId] = { ...(cfg.options[viewId] ?? {}), [columnKey]: opts };
  await persist();
  return cfg;
}

export async function setColumnOrder(viewId: string, keys: string[]) {
  const cfg = await getConfig();
  cfg.columnOrder[viewId] = keys;
  await persist();
  return cfg;
}

export async function setTabOrder(ids: string[]) {
  const cfg = await getConfig();
  cfg.tabOrder = ids;
  await persist();
  return cfg;
}

export async function setColor(viewId: string, columnKey: string, value: string, hex: string | null) {
  const cfg = await getConfig();
  const forView = cfg.colors[viewId] ?? {};
  const forCol = { ...(forView[columnKey] ?? {}) };
  if (hex) forCol[value] = hex;
  else delete forCol[value];
  cfg.colors[viewId] = { ...forView, [columnKey]: forCol };
  await persist();
  return cfg;
}

export async function setPeople(people: string[]) {
  const cfg = await getConfig();
  cfg.people = people;
  await persist();
  return cfg;
}

export async function setRole(role: string, permissions: string[]) {
  const cfg = await getConfig();
  cfg.roles[role] = permissions;
  await persist();
  return cfg;
}

export async function setUserRole(userId: string, role: string) {
  const cfg = await getConfig();
  cfg.userRoles[userId] = role;
  await persist();
  return cfg;
}

export async function addUser(name: string, role = "Viewer") {
  const cfg = await getConfig();
  const id = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  cfg.users = [...cfg.users, { id, name }];
  cfg.userRoles[id] = role;
  await persist();
  return cfg;
}

export async function removeUser(id: string) {
  const cfg = await getConfig();
  cfg.users = cfg.users.filter((u) => u.id !== id);
  delete cfg.userRoles[id];
  await persist();
  return cfg;
}

export async function setPlaybookOverride(
  workType: string,
  team: string,
  override: { project?: string; assignees?: string }
) {
  const cfg = await getConfig();
  const wt = cfg.playbooks[workType] ?? {};
  wt[team] = { ...(wt[team] ?? {}), ...override };
  cfg.playbooks[workType] = wt;
  await persist();
  return cfg;
}

export async function addAutomation(automation: ConfigAutomation) {
  const cfg = await getConfig();
  cfg.automations = [...cfg.automations.filter((a) => a.id !== automation.id), automation];
  await persist();
  return cfg;
}

export async function deleteAutomation(id: string) {
  const cfg = await getConfig();
  cfg.automations = cfg.automations.filter((a) => a.id !== id);
  await persist();
  return cfg;
}
