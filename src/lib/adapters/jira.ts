import type { CollectionId, FieldValue, Record } from "@/lib/types";
import type { DataAdapter } from "./types";

// Jira Cloud adapter.
//
// v1 strategy — schema-light and works on a vanilla project (no custom fields to
// set up): every app record is stored as a Jira issue in JIRA_PROJECT_KEY, where
//   • the issue summary  = a human-readable title for the record
//   • the issue labels   = include `cw-<collection>` so we can list per board
//   • the issue description holds the full field set as JSON (round-trips exactly)
//
// This proves the end-to-end round-trip (app <-> Jira) immediately. Mapping
// individual fields onto native Jira fields (assignee, priority, workflow
// status transitions) is a follow-up that needs each project's specific schema;
// until then, status etc. live in the JSON so the app behaves identically to the
// mock, but the data now lives in — and is governed by — Jira.
//
// Activate with: DATA_ADAPTER=jira, JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN,
// JIRA_PROJECT_KEY.

const LABEL = (collection: string) => `cw-${collection}`;

// Which field to use as the issue summary (title) per collection.
const TITLE_FIELD: { [c: string]: string } = {
  content: "targetPrompt",
  launch: "deliverable",
  tickets: "summary",
  okr: "keyResult",
  quarterPlan: "item",
  topicOwners: "topic",
};

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

// ---- ADF helpers: stash/extract JSON in an issue description code block ----
function jsonToAdf(json: string) {
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "codeBlock",
        attrs: { language: "json" },
        content: [{ type: "text", text: json }],
      },
    ],
  };
}

function textFromAdf(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { type?: string; text?: string; content?: unknown[] };
  if (n.type === "text" && typeof n.text === "string") return n.text;
  if (Array.isArray(n.content)) return n.content.map(textFromAdf).join("");
  return "";
}

function fieldsFromIssue(issue: any): { [key: string]: FieldValue } {
  const raw = textFromAdf(issue?.fields?.description);
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // Description wasn't ours (e.g. issue created in Jira directly) — fall back.
  }
  return { summary: issue?.fields?.summary ?? "" };
}

export class JiraAdapter implements DataAdapter {
  private issueTypeId: string | null = null;

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

  // Discover a usable (non-subtask) issue type for the project; cache it.
  private async getIssueTypeId(): Promise<string> {
    if (this.issueTypeId) return this.issueTypeId;
    const { projectKey } = readConfig();
    const project = await this.api(`/rest/api/3/project/${encodeURIComponent(projectKey)}`);
    const types: any[] = project.issueTypes ?? [];
    const usable = types.find((t) => !t.subtask && /task|story/i.test(t.name)) ?? types.find((t) => !t.subtask) ?? types[0];
    if (!usable) throw new Error(`No issue types available in project ${projectKey}.`);
    this.issueTypeId = usable.id;
    return usable.id;
  }

  private title(collection: CollectionId, fields: { [key: string]: FieldValue }): string {
    const key = TITLE_FIELD[collection];
    const raw = (key && fields[key] != null ? String(fields[key]) : "") || "(untitled)";
    return raw.slice(0, 240);
  }

  // Enhanced JQL search, with a fallback to the legacy endpoint.
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

  async list(collection: CollectionId): Promise<Record[]> {
    const { projectKey } = readConfig();
    const jql = `project = "${projectKey}" AND labels = "${LABEL(collection)}" ORDER BY created ASC`;
    const issues = await this.search(jql);
    return issues.map((issue) => ({
      id: issue.key,
      jiraKey: issue.key,
      fields: fieldsFromIssue(issue),
    }));
  }

  async create(collection: CollectionId, fields: { [key: string]: FieldValue }): Promise<Record> {
    const { projectKey } = readConfig();
    const issuetypeId = await this.getIssueTypeId();
    const created = await this.api(`/rest/api/3/issue`, {
      method: "POST",
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          issuetype: { id: issuetypeId },
          summary: this.title(collection, fields),
          description: jsonToAdf(JSON.stringify(fields)),
          labels: [LABEL(collection)],
        },
      }),
    });
    return { id: created.key, jiraKey: created.key, fields };
  }

  async update(
    collection: CollectionId,
    id: string,
    fields: { [key: string]: FieldValue }
  ): Promise<Record> {
    // Read-merge-write so partial updates preserve the rest of the JSON.
    const issue = await this.api(`/rest/api/3/issue/${id}?fields=summary,description`);
    const merged = { ...fieldsFromIssue(issue), ...fields };
    await this.api(`/rest/api/3/issue/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        fields: {
          summary: this.title(collection, merged),
          description: jsonToAdf(JSON.stringify(merged)),
        },
      }),
    });
    return { id, jiraKey: id, fields: merged };
  }

  async remove(_collection: CollectionId, id: string): Promise<void> {
    await this.api(`/rest/api/3/issue/${id}`, { method: "DELETE" });
  }

  async reorder(_collection: CollectionId, _ids: string[]): Promise<void> {
    // v1: row order isn't persisted to Jira yet (would use the Agile rank API).
    // No-op so the UI stays responsive; list() returns issues in created order.
  }
}
