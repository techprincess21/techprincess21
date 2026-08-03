import { NextResponse } from "next/server";
import { can } from "@/lib/auth";
import { getAudit } from "@/lib/audit";
import { storageMode } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read the audit trail. Admin-only (same gate as the access panel). Also reports
// whether storage is durable, so the panel can warn when logs won't persist.
export async function GET() {
  if (!(await can("roles.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const events = await getAudit(250);
  return NextResponse.json({ events, durable: storageMode() === "kv" });
}
