import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";
import type { CollectionId } from "@/lib/types";

export const runtime = "nodejs";

const COLLECTIONS: CollectionId[] = ["content", "okr", "quarterPlan", "topicOwners"];

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
  const record = await getAdapter().update(params.collection, params.id, fields);
  return NextResponse.json({ record });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { collection: string; id: string } }
) {
  if (!isCollection(params.collection)) {
    return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
  }
  await getAdapter().remove(params.collection, params.id);
  return NextResponse.json({ ok: true });
}
