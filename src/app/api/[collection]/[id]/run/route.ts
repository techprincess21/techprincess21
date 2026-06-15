import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";
import { runPlaybooks } from "@/lib/playbooks";
import { boardContext } from "@/lib/auth";
import { getConfig } from "@/lib/config-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Manually run the workflow playbook stage that matches a deliverable's current
// status. This is the deliberate, user-initiated trigger (behind a confirm in
// the UI) so automations never fire on their own — no runaway processes.
export async function POST(_req: Request, { params }: { params: { collection: string; id: string } }) {
  const { valid, canSee, has } = await boardContext(params.collection);
  if (!valid) {
    return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
  }
  if (!canSee || !has("automation.run")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const adapter = getAdapter();
  const list = await adapter.list(params.collection);
  const rec = list.find((r) => r.id === params.id);
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cfg = await getConfig();
  const { record, created, stage } = await runPlaybooks(
    adapter,
    params.collection,
    rec,
    cfg.playbooks,
    cfg.automations
  );
  if (created.length === 0) {
    return NextResponse.json({ error: "Nothing to run at this status" }, { status: 409 });
  }
  return NextResponse.json({ record, created, stage });
}
