import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";
import { runPlaybooks } from "@/lib/playbooks";
import { can } from "@/lib/auth";
import { permissionForPatch } from "@/lib/rbac";
import type { CollectionId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

const COLLECTIONS: CollectionId[] = ["content", "launch", "tickets", "okr", "quarterPlan", "topicOwners"];

function isCollection(value: string): value is CollectionId {
  return (COLLECTIONS as string[]).includes(value);
}

export async function PATCH(
  req: Request,
  { params }: { params: { collection: string; id: string } }
) {
  if (!isCollection(params.collection)) {
    return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const fields = body?.fields ?? {};
  const needed = permissionForPatch(params.collection, Object.keys(fields));
  if (!(await can(needed))) return forbidden();
  const adapter = getAdapter();
  const record = await adapter.update(params.collection, params.id, fields);

  // Fire any workflow automations triggered by this change.
  const { record: finalRecord, created, stage } = await runPlaybooks(adapter, params.collection, record);
  if (created.length > 0) {
    return NextResponse.json({ record: finalRecord, automation: { created, stage } });
  }
  return NextResponse.json({ record: finalRecord });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { collection: string; id: string } }
) {
  if (!isCollection(params.collection)) {
    return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
  }
  if (!(await can("item.delete"))) return forbidden();
  await getAdapter().remove(params.collection, params.id);
  return NextResponse.json({ ok: true });
}
