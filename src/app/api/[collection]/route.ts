import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";
import { boardContext, getIdentity } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });
const unknown = () => NextResponse.json({ error: "Unknown collection" }, { status: 404 });

export async function GET(_req: Request, { params }: { params: { collection: string } }) {
  const { valid, canSee } = await boardContext(params.collection);
  if (!valid) return unknown();
  if (!canSee) return forbidden();
  const records = await getAdapter().list(params.collection);
  return NextResponse.json({ records });
}

export async function POST(req: Request, { params }: { params: { collection: string } }) {
  const { valid, canSee, has } = await boardContext(params.collection);
  if (!valid) return unknown();
  if (!canSee || !has("item.create")) return forbidden();
  const body = await req.json().catch(() => ({}));
  const fields = body?.fields ?? {};
  const record = await getAdapter().create(params.collection, fields);
  const actor = await getIdentity();
  await logAudit({
    type: "data",
    action: "item.create",
    summary: `Created an item in “${params.collection}”`,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
  });
  return NextResponse.json({ record }, { status: 201 });
}
