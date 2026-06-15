import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";
import { getConfig } from "@/lib/config-store";
import { VIEWS } from "@/lib/views";
import { STATUS_FIELD } from "@/lib/rbac";
import { notifyConfigured, slackDM, resolveEmails, recordTitle, wants } from "@/lib/notify";
import type { ColumnDef } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WINDOW_DAYS = 3; // remind about items due within this many days (and overdue)
const MAX_DM = 200; // safety cap per run

// Pick the column that represents a due date: a date column whose key/label hints
// "due/final/end", else the first date column.
function dueColumn(columns: ColumnDef[]): ColumnDef | undefined {
  const dates = columns.filter((c) => c.type === "date");
  return dates.find((c) => /due|final|end/i.test(c.key + " " + c.label)) ?? dates[0];
}

function daysUntil(iso: string): number | null {
  const d = new Date(`${iso}T00:00:00Z`);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((d.getTime() - todayUtc) / 86_400_000);
}

// Daily reminder job (wired via vercel.json crons). DMs owners about items due
// soon or overdue, respecting each person's "due" preference.
export async function GET(req: Request) {
  // When CRON_SECRET is set (Vercel Cron sends it), require it.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!notifyConfigured()) {
    return NextResponse.json({ ok: true, skipped: "Slack not configured" });
  }

  const cfg = await getConfig();
  const adapter = getAdapter();
  const boards = [...VIEWS.filter((v) => !v.builder), ...cfg.customBoards];
  const seen = new Set<string>();
  let sent = 0;

  for (const board of boards) {
    if (seen.has(board.collection)) continue;
    seen.add(board.collection);
    const dueCol = dueColumn(board.columns);
    if (!dueCol) continue;
    const statusKey = STATUS_FIELD[board.collection] ?? board.columns.find((c) => c.key === "status")?.key;
    const personKeys = board.columns.filter((c) => c.type === "person").map((c) => c.key);
    if (personKeys.length === 0) continue;

    const records = await adapter.list(board.collection);
    for (const rec of records) {
      if (sent >= MAX_DM) break;
      const status = statusKey ? String(rec.fields[statusKey] ?? "") : "";
      if (/done|complete/i.test(status)) continue;
      const iso = String(rec.fields[dueCol.key] ?? "").slice(0, 10);
      const d = iso ? daysUntil(iso) : null;
      if (d == null || d > WINDOW_DAYS) continue;

      const state = d < 0 ? `overdue by ${-d} day(s)` : d === 0 ? "due today" : `due in ${d} day(s)`;
      const title = recordTitle(rec, board.columns);
      const owners = new Set(personKeys.flatMap((k) => resolveEmails(String(rec.fields[k] ?? ""), cfg.users)));
      for (const email of owners) {
        if (wants(email, "due", cfg.notifyPrefs)) {
          await slackDM(email, `:alarm_clock: *${title}* on *${board.label}* is ${state} (due ${iso}).`);
          sent++;
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent });
}
