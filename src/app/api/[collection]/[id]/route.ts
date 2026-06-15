import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";
import { boardContext } from "@/lib/auth";
import { permissionForPatch } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });
const unknown = () => NextResponse.json({ error: "Unknown collection" }, { status: 404 });

export async function PATCH(
  req: Request,
  { params }: { params: { collection: string; id: string } }
) {
  const body = await req.json().catch(() => ({}));
  const fields = body?.fields ?? {};
  const needed = permissionForPatch(params.collection, Object.keys(fields));
  const { valid, canSee, has } = await boardContext(params.collection);
  if (!valid) return unknown();
  if (!canSee || !has(needed)) return forbidden();
  const record = await getAdapter().update(params.collection, params.id, fields);
  return NextResponse.json({ record });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { collection: string; id: string } }
) {
  const { valid, canSee, has } = await boardContext(params.collection);
  if (!valid) return unknown();
  if (!canSee || !has("item.delete")) return forbidden();
  await getAdapter().remove(params.collection, params.id);
  return NextResponse.json({ ok: true });
}
