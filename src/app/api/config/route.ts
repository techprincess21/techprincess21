import { NextResponse } from "next/server";
import {
  getConfig,
  setColumnOptions,
  setColumnOrder,
  setColor,
  setPeople,
  setTabOrder,
} from "@/lib/config-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getConfig();
  return NextResponse.json({ config });
}

const strList = (arr: unknown[]) => [...new Set(arr.map((o) => String(o)).filter(Boolean))] as string[];

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));

  if (body?.action === "options" && body.viewId && body.columnKey && Array.isArray(body.options)) {
    return NextResponse.json({ config: await setColumnOptions(body.viewId, body.columnKey, strList(body.options)) });
  }
  if (body?.action === "columns" && body.viewId && Array.isArray(body.keys)) {
    return NextResponse.json({ config: await setColumnOrder(body.viewId, strList(body.keys)) });
  }
  if (body?.action === "tabs" && Array.isArray(body.ids)) {
    return NextResponse.json({ config: await setTabOrder(strList(body.ids)) });
  }
  if (body?.action === "color" && body.viewId && body.columnKey && typeof body.value === "string") {
    const hex = typeof body.hex === "string" ? body.hex : null;
    return NextResponse.json({ config: await setColor(body.viewId, body.columnKey, body.value, hex) });
  }
  if (body?.action === "people" && Array.isArray(body.people)) {
    return NextResponse.json({ config: await setPeople(strList(body.people)) });
  }
  return NextResponse.json({ error: "Invalid config update" }, { status: 400 });
}
