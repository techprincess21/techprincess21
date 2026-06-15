import type { FieldValue, Record } from "@/lib/types";
import type { DataAdapter } from "./types";

// Jira Cloud adapter.
//
// Each app record is a Jira issue in JIRA_PROJECT_KEY:
//   • summary      = a human title (the record's title field, e.g. deliverable)
//   • description  = human-readable field list (Status, Owner, dates, …) PLUS a
//                    JSON code block at the end that round-trips the exact data
//   • labels       = include `cw-<collection>` so we can list per board
//
// Reading back, we parse the JSON code block (falling back to summary). This is
// schema-light (works on a vanilla project, no custom fields) while still
// looking like a real, readable issue in Jira's own UI.

const LABEL = (collection: string) => `cw-${collection}`;

// Which field becomes the issue summary (title) per collection.
const TITLE_FIELD: { [c: string]: string } = {
  content: "targetPrompt",
  launch: "deliverable",
  tickets: "summary",
  okr: "keyResult",
  quarterPlan: "item",
  topicOwners: "topic",
};

// Pretty labels for the readable description; unknown keys are humanized.
const FIELD_LABELS: { [k: string]: string } = {
  status: "Status",
  responsible: "Owner",
  owner: "Owner",
  phase: "Phase",
  moment: "Stage",
  workType: "Work Type",
  startDate: "Start",
  draftDue: "Draft Due",
  approvalsDue: "All Approvals Due",
  designComplete: "Design Complete",
  webMopsComplete: "Web/MOPS Complete",
  finalDate: "Final / Due",
  dependency: "Dependency / Callout",
  links: "Relevant Links",
  keyword: "Keyword",
  topic: "Topic",
  subtopic: "Subtopic",
  team: "Team",
  sourceDeliverable: "From Deliverable",
};

// Internal-only fields we never render in the readable section.
const HIDDEN = new Set(["autoTickets", "firedStages", "key", "jiraKey"]);

function humanize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

interface JiraConfig {
  baseUrl: string;
  email: string;
  token: string;
  projectKey: string;
}

function readConfig(): JiraConfig {
  const baseUrl = (process.env.JIRA_BASE_URL ?? "").replace(/\/+$/, "");
  const email = process.env.JIRA_EMAIL ?? "";
  const token = process.env.JIRA_API_TOKEN ?? "";
  const projectKey = process.env.JIRA_PROJECT_KEY ?? "";
  if (!baseUrl || !email || !token || !projectKey) {
    throw new Error(
      "JiraAdapter misconfigured: set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY."
    );
  }
  return { baseUrl, email, token, projectKey };
}

// ---- ADF: readable description + JSON round-trip block --------------------
function buildDescription(collection: string, fields: { [k: string]: FieldValue }, json: string) {
  const titleKey = TITLE_FIELD[collection];
  const content: unknown[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (k === titleKey || HIDDEN.has(k)) continue;
    const val = v == null ? "" : String(v);
    if (!val) continue;
    const label = FIELD_LABELS[k] ?? humanize(k);
    content.push({
      type: "paragraph",
      content: [
        { type: "text", text: `${label}: `, marks: [{ type: "strong" }] },
        { type: "text", text: val },
      ],
    });
  }
  if (content.length === 0) {
    content.push({ type: "paragraph", content: [{ type: "text", text: "—" }] });
  }
  content.push({ type: "rule" });
  content.push({
    type: "paragraph",
    content: [{ type: "text", text: "Managed by Goatsana — structured data below.", marks: [{ type: "em" }] }],
  });
  content.push({ type: "codeBlock", attrs: { language: "json" }, content: [{ type: "text", text: json }] });
  return { type: "doc", version: 1, content };
}

// Find the first codeBlock's text (where we stash the round-trip JSON).
function firstCodeBlockText(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  const n = node as { type?: string; text?: string; content?: unknown[] };
  if (n.type === "codeBlock") return (n.content ?? []).map((c) => (c as { text?: string }).text ?? "").join("");
  if (Array.isArray(n.content)) {
    for (const c of n.content) {
      const r = firstCodeBlockText(c);
      if (r != null) return r;
    }
  }
  return null;
}

function allText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { type?: string; text?: string; content?: unknown[] };
  if (n.type === "text" && typeof n.text === "string") return n.text;
  if (Array.isArray(n.content)) return n.content.map(allText).join("");
  return "";
}

function fieldsFromIssue(issue: any): { [key: string]: FieldValue } {
  const code = firstCodeBlockText(issue?.fields?.description);
  if (code) {
    try {
      const parsed = JSON.parse(code);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* fall through */
    }
  }
  // Fallback for issues whose whole description is JSON, or none at all.
  try {
    const parsed = JSON.parse(allText(issue?.fields?.description));
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    /* ignore */
  }
  return { deliverable: issue?.fields?.summary ?? "", summary: issue?.fields?.summary ?? "" };
}

export class JiraAdapter implements DataAdapter {
  private issueTypeIds = new Map<string, string>();

  private async api(path: string, init?: RequestInit): Promise<any> {
    const { baseUrl, email, token } = readConfig();
    const auth = Buffer.from(`${email}:${token}`).toString("base64");
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Jira ${init?.method ?? "GET"} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
    }
    return text ? JSON.parse(text) : {};
  }

  private async getIssueTypeId(projectKey: string): Promise<string> {
    const cached = this.issueTypeIds.get(projectKey);
    if (cached) return cached;
    const project = await this.api(`/rest/api/3/project/${encodeURIComponent(projectKey)}`);
    const types: any[] = project.issueTypes ?? [];
    const usable =
      types.find((t) => !t.subtask && /task|story/i.test(t.name)) ??
      types.find((t) => !t.subtask) ??
      types[0];
    if (!usable) throw new Error(`No issue types available in project ${projectKey}.`);
    this.issueTypeIds.set(projectKey, usable.id);
    return usable.id;
  }

  private title(collection: string, fields: { [key: string]: FieldValue }): string {
    // Built-in boards have a known title field; custom boards fall back to their
    // first non-internal field.
    const key = TITLE_FIELD[collection] ?? Object.keys(fields).find((k) => !HIDDEN.has(k));
    const raw = (key && fields[key] != null ? String(fields[key]) : "") || "(untitled)";
    return raw.slice(0, 240);
  }

  private async search(jql: string): Promise<any[]> {
    const body = JSON.stringify({ jql, maxResults: 100, fields: ["summary", "description", "labels"] });
    try {
      const d = await this.api(`/rest/api/3/search/jql`, { method: "POST", body });
      return d.issues ?? [];
    } catch {
      const d = await this.api(`/rest/api/3/search`, { method: "POST", body });
      return d.issues ?? [];
    }
  }

  async list(collection: string): Promise<Record[]> {
    const { projectKey } = readConfig();
    // Automation tickets may live in other teams' projects, so search by label
    // across all accessible projects. Everything else is scoped to MW.
    const jql =
      collection === "tickets"
        ? `labels = "${LABEL(collection)}" ORDER BY created ASC`
        : `project = "${projectKey}" AND labels = "${LABEL(collection)}" ORDER BY created ASC`;
    const issues = await this.search(jql);
    return issues.map((issue) => ({ id: issue.key, jiraKey: issue.key, fields: fieldsFromIssue(issue) }));
  }

  private async createIn(
    targetProject: string,
    collection: string,
    fields: { [key: string]: FieldValue }
  ): Promise<Record> {
    const issuetypeId = await this.getIssueTypeId(targetProject);
    const created = await this.api(`/rest/api/3/issue`, {
      method: "POST",
      body: JSON.stringify({
        fields: {
          project: { key: targetProject },
          issuetype: { id: issuetypeId },
          summary: this.title(collection, fields),
          description: buildDescription(collection, fields, JSON.stringify(fields)),
          labels: [LABEL(collection)],
        },
      }),
    });
    return { id: created.key, jiraKey: created.key, fields };
  }

  async create(collection: string, fields: { [key: string]: FieldValue }): Promise<Record> {
    const { projectKey } = readConfig();
    // Automation tickets target a team's project (fields.project). Everything
    // else goes to MW. If a target project fails (permissions, issue types),
    // fall back to MW so nothing hard-fails.
    const target =
      collection === "tickets" && typeof fields.project === "string" && fields.project
        ? String(fields.project)
        : projectKey;
    try {
      return await this.createIn(target, collection, fields);
    } catch (err) {
      if (target !== projectKey) return await this.createIn(projectKey, collection, fields);
      throw err;
    }
  }

  async update(
    collection: string,
    id: string,
    fields: { [key: string]: FieldValue }
  ): Promise<Record> {
    const issue = await this.api(`/rest/api/3/issue/${id}?fields=summary,description`);
    const merged = { ...fieldsFromIssue(issue), ...fields };
    await this.api(`/rest/api/3/issue/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        fields: {
          summary: this.title(collection, merged),
          description: buildDescription(collection, merged, JSON.stringify(merged)),
        },
      }),
    });
    return { id, jiraKey: id, fields: merged };
  }

  async remove(_collection: string, id: string): Promise<void> {
    await this.api(`/rest/api/3/issue/${id}`, { method: "DELETE" });
  }

  async reorder(_collection: string, _ids: string[]): Promise<void> {
    // v1: row order isn't persisted to Jira (would use the Agile rank API).
  }
}
