import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";
import { can } from "@/lib/auth";
import type { CollectionId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTIONS: CollectionId[] = ["content", "launch", "tickets", "launchSearch", "launchFall", "launchFedramp", "okr", "quarterPlan", "topicOwners"];

function isCollection(value: string): value is CollectionId {
  return (COLLECTIONS as string[]).includes(value);
}

export async function POST(req: Request, { params }: { params: { collection: string } }) {
  if (!isCollection(params.collection)) {
    return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
  }
  if (!(await can("board.reorder"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  if (!Array.isArray(body?.ids)) {
    return NextResponse.json({ error: "ids[] required" }, { status: 400 });
  }
  await getAdapter().reorder(params.collection, body.ids.map((x: unknown) => String(x)));
  return NextResponse.json({ ok: true });
}
