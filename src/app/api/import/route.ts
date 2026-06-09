import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";
import { can } from "@/lib/auth";
import { LAUNCH_DEMO_DATA, LAUNCH_DEMO_COLLECTIONS } from "@/lib/demo-launches";
import type { CollectionId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Importing creates many Jira issues sequentially; give it room.
export const maxDuration = 60;

// One-time importer: creates the demo launch deliverables as real issues in the
// configured backend (Jira MW when DATA_ADAPTER=jira). Idempotent — it skips
// deliverables that already exist (matched by title), so re-running is safe and
// won't duplicate. Only the main deliverables are created; no cross-team /
// automation tickets.
export async function POST(req: Request) {
  if (!(await can("roles.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const only: string | undefined = body?.collection;
  const collections = only ? [only] : LAUNCH_DEMO_COLLECTIONS;

  const adapter = getAdapter();
  const results: { [c: string]: { created: number; skipped: number } } = {};

  for (const collection of collections) {
    const rows = LAUNCH_DEMO_DATA[collection];
    if (!rows) continue;
    const existing = await adapter.list(collection as CollectionId);
    const existingTitles = new Set(existing.map((r) => String(r.fields.deliverable ?? "")));
    let created = 0;
    for (const fields of rows) {
      if (existingTitles.has(String(fields.deliverable))) continue;
      await adapter.create(collection as CollectionId, fields);
      created++;
    }
    results[collection] = { created, skipped: rows.length - created };
  }

  return NextResponse.json({ results });
}
