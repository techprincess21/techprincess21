import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";
import { runPlaybooks } from "@/lib/playbooks";
import { can } from "@/lib/auth";
import type { CollectionId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTIONS: CollectionId[] = ["content", "launch", "tickets", "okr", "quarterPlan", "topicOwners"];
const isCollection = (v: string): v is CollectionId => (COLLECTIONS as string[]).includes(v);

// Manually run the workflow playbook stage that matches a deliverable's current
// status. This is the deliberate, user-initiated trigger (behind a confirm in
// the UI) so automations never fire on their own — no runaway processes.
export async function POST(_req: Request, { params }: { params: { collection: string; id: string } }) {
  if (!isCollection(params.collection)) {
    return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
  }
  if (!(await can("automation.run"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const adapter = getAdapter();
  const list = await adapter.list(params.collection);
  const rec = list.find((r) => r.id === params.id);
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { record, created, stage } = await runPlaybooks(adapter, params.collection, rec);
  if (created.length === 0) {
    return NextResponse.json({ error: "Nothing to run at this status" }, { status: 409 });
  }
  return NextResponse.json({ record, created, stage });
}
