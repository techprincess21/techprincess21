import { promises as fs } from "node:fs";
import path from "node:path";
import { VIEWS } from "@/lib/views";
import { DEFAULT_ROLES, DEFAULT_USER_ROLES } from "@/lib/rbac";
import type { ConfigAutomation } from "@/lib/playbooks";
import type { BoardAccess, BoardsConfig } from "@/lib/board-access";
import { BOARD_TEMPLATE_BY_KEY } from "@/lib/board-templates";
import type { ViewDef } from "@/lib/types";

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
  // Per-board access control: visibility (public/private), members, exclusions.
  // A board absent from this map is treated as public with no members.
  boards: BoardsConfig;
  // User-created boards (their own ViewDef; collection === the board id).
  customBoards: ViewDef[];
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

// Owner autocomplete starts empty — names accrue as the team uses the app.
const DEFAULT_PEOPLE: string[] = [];

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
    boards: {},
    customBoards: [],
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
      boards: saved.boards ?? {},
      customBoards: saved.customBoards ?? [],
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

export async function addUser(name: string, role = "Viewer", explicitId?: string) {
  const cfg = await getConfig();
  // If an id is given (an Okta email), key the user by it so the role applies the
  // moment they sign in — even before their first login. Otherwise generate one.
  const id = explicitId?.trim()
    ? explicitId.trim().toLowerCase()
    : `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  if (!cfg.users.some((u) => u.id === id)) cfg.users = [...cfg.users, { id, name }];
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

// --- Per-board access ---

function ensureBoard(cfg: AppConfig, boardId: string): BoardAccess {
  if (!cfg.boards[boardId]) cfg.boards[boardId] = { visibility: "public", members: {}, excluded: [] };
  return cfg.boards[boardId];
}

export async function setBoardVisibility(boardId: string, visibility: "public" | "private") {
  const cfg = await getConfig();
  ensureBoard(cfg, boardId).visibility = visibility;
  await persist();
  return cfg;
}

export async function setBoardMember(boardId: string, email: string, role: string) {
  const cfg = await getConfig();
  const b = ensureBoard(cfg, boardId);
  b.members = { ...b.members, [email.toLowerCase()]: role };
  await persist();
  return cfg;
}

export async function removeBoardMember(boardId: string, email: string) {
  const cfg = await getConfig();
  const b = ensureBoard(cfg, boardId);
  const next = { ...b.members };
  delete next[email.toLowerCase()];
  b.members = next;
  await persist();
  return cfg;
}

export async function setBoardExclusion(boardId: string, email: string, excluded: boolean) {
  const cfg = await getConfig();
  const b = ensureBoard(cfg, boardId);
  const e = email.toLowerCase();
  b.excluded = excluded ? [...new Set([...b.excluded, e])] : b.excluded.filter((x) => x !== e);
  await persist();
  return cfg;
}

export async function addCustomBoard(opts: {
  label: string;
  templateKey: string;
  owner: string;
  visibility: "public" | "private";
}) {
  const cfg = await getConfig();
  const tpl = BOARD_TEMPLATE_BY_KEY[opts.templateKey] ?? Object.values(BOARD_TEMPLATE_BY_KEY)[0];
  const id = `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const board: ViewDef = {
    id,
    label: opts.label,
    collection: id,
    columns: tpl.columns,
    groupBy: tpl.groupBy,
    defaults: tpl.defaults,
    summary: tpl.summary,
  };
  cfg.customBoards = [...cfg.customBoards, board];
  // Seed the per-board config layers, like defaultConfig does for built-ins.
  cfg.options[id] = Object.fromEntries(
    tpl.columns.filter((c) => c.type === "select").map((c) => [c.key, [...(c.options ?? [])]])
  );
  cfg.columnOrder[id] = tpl.columns.map((c) => c.key);
  cfg.boards[id] = { owner: opts.owner, visibility: opts.visibility, members: {}, excluded: [] };
  cfg.tabOrder = [...cfg.tabOrder, id];
  await persist();
  return { cfg, id };
}

export async function deleteCustomBoard(id: string) {
  const cfg = await getConfig();
  cfg.customBoards = cfg.customBoards.filter((b) => b.id !== id);
  delete cfg.boards[id];
  delete cfg.options[id];
  delete cfg.columnOrder[id];
  delete cfg.colors[id];
  cfg.tabOrder = cfg.tabOrder.filter((t) => t !== id);
  await persist();
  return cfg;
}

export async function cloneBoardMembers(fromId: string, toId: string) {
  const cfg = await getConfig();
  const from = cfg.boards[fromId];
  if (!from) return cfg;
  const to = ensureBoard(cfg, toId);
  to.members = { ...to.members, ...from.members };
  to.excluded = [...new Set([...to.excluded, ...from.excluded])];
  await persist();
  return cfg;
}
