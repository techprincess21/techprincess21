import type { ColumnDef, Record } from "@/lib/types";

// Notification engine. Today it delivers via Slack DM (like the Jira Slackbot):
// look the person up in Slack by their email, then DM them. It stays dormant
// until SLACK_BOT_TOKEN is set (an IT-provisioned Slack app), so nothing breaks
// before it's configured. Each person controls which events reach them.

const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN;

export function notifyConfigured(): boolean {
  return Boolean(SLACK_TOKEN);
}

export interface NotifyPref {
  assigned?: boolean; // you were set as an owner/assignee
  status?: boolean; // a status changed on an item you own
}
export type NotifyPrefs = { [email: string]: NotifyPref };

// Default: everything on, until the person opts out.
function wants(email: string, kind: keyof NotifyPref, prefs: NotifyPrefs): boolean {
  const p = prefs[email.toLowerCase()];
  return p ? p[kind] !== false : true;
}

async function slackUserId(email: string): Promise<string | null> {
  const res = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${SLACK_TOKEN}` },
    cache: "no-store",
  });
  const d = await res.json();
  return d?.ok ? (d.user?.id ?? null) : null;
}

async function slackDM(email: string, text: string): Promise<boolean> {
  try {
    const uid = await slackUserId(email);
    if (!uid) return false;
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${SLACK_TOKEN}`, "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ channel: uid, text }),
    });
    const d = await res.json();
    return Boolean(d?.ok);
  } catch {
    return false;
  }
}

// Resolve an owner/person field value to email addresses we can notify. Matches
// app users by name (case-insensitive) or treats the value as an email directly.
export function resolveEmails(value: string, users: { id: string; name: string }[]): string[] {
  const v = String(value ?? "").trim();
  if (!v) return [];
  if (v.includes("@")) return [v.toLowerCase()];
  const u = users.find((x) => x.name.toLowerCase() === v.toLowerCase());
  return u && u.id.includes("@") ? [u.id.toLowerCase()] : [];
}

function recordTitle(record: Record, columns: ColumnDef[]): string {
  const titleCol = columns.find((c) => c.type === "longtext") ?? columns.find((c) => c.type === "text");
  const v = titleCol ? record.fields[titleCol.key] : null;
  return (v != null && String(v).trim()) || "an item";
}

// Fire notifications after a record is patched. Best-effort; never throws.
export async function notifyOnPatch(opts: {
  changedFields: string[];
  record: Record;
  columns: ColumnDef[];
  statusKey?: string;
  boardLabel: string;
  users: { id: string; name: string }[];
  prefs: NotifyPrefs;
}): Promise<void> {
  if (!notifyConfigured()) return;
  const { changedFields, record, columns, statusKey, boardLabel, users, prefs } = opts;
  const personKeys = columns.filter((c) => c.type === "person").map((c) => c.key);
  const title = recordTitle(record, columns);

  // Assignment: a person field changed → DM whoever's now in it.
  for (const k of personKeys) {
    if (!changedFields.includes(k)) continue;
    for (const email of resolveEmails(String(record.fields[k] ?? ""), users)) {
      if (wants(email, "assigned", prefs)) {
        await slackDM(email, `:wave: You were assigned *${title}* on the *${boardLabel}* board in Goatsana.`);
      }
    }
  }

  // Status change → DM the item's owners.
  if (statusKey && changedFields.includes(statusKey)) {
    const status = String(record.fields[statusKey] ?? "");
    const owners = new Set(personKeys.flatMap((k) => resolveEmails(String(record.fields[k] ?? ""), users)));
    for (const email of owners) {
      if (wants(email, "status", prefs)) {
        await slackDM(email, `:arrows_counterclockwise: *${title}* is now *${status}* on the *${boardLabel}* board in Goatsana.`);
      }
    }
  }
}
