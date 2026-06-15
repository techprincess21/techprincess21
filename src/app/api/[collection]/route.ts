import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";
import { boardContext } from "@/lib/auth";
import type { CollectionId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

const COLLECTIONS: CollectionId[] = ["content", "launch", "tickets", "okr", "quarterPlan", "topicOwners"];

function isCollection(value: string): value is CollectionId {
  return (COLLECTIONS as string[]).includes(value);
}

export async function GET(_req: Request, { params }: { params: { collection: string } }) {
  if (!isCollection(params.collection)) {
    return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
  }
  const { canSee } = await boardContext(params.collection);
  if (!canSee) return forbidden();
  const records = await getAdapter().list(params.collection);
  return NextResponse.json({ records });
}

export async function POST(req: Request, { params }: { params: { collection: string } }) {
  if (!isCollection(params.collection)) {
    return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
  }
  const { canSee, has } = await boardContext(params.collection);
  if (!canSee || !has("item.create")) return forbidden();
  const body = await req.json().catch(() => ({}));
  const fields = body?.fields ?? {};
  const record = await getAdapter().create(params.collection, fields);
  return NextResponse.json({ record }, { status: 201 });
}
