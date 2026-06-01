import { NextResponse } from "next/server";
import { getConfig, setColumnOptions, setPeople } from "@/lib/config-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getConfig();
  return NextResponse.json({ config });
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body?.action === "options" && body.viewId && body.columnKey && Array.isArray(body.options)) {
    const clean = [...new Set(body.options.map((o: unknown) => String(o)).filter(Boolean))];
    const config = await setColumnOptions(body.viewId, body.columnKey, clean as string[]);
    return NextResponse.json({ config });
  }
  if (body?.action === "people" && Array.isArray(body.people)) {
    const clean = [...new Set(body.people.map((p: unknown) => String(p)).filter(Boolean))];
    const config = await setPeople(clean as string[]);
    return NextResponse.json({ config });
  }
  return NextResponse.json({ error: "Invalid config update" }, { status: 400 });
}
