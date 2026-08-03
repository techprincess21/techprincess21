import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Debug helper: shows the current user how they're being resolved — name and
// the role they landed on. Okta is only the front gate, so roles come from
// in-app assignment (or the ADMIN_EMAILS bootstrap), not Okta groups. Only ever
// returns info about the caller's own session.
export async function GET() {
  const me = await getIdentity();
  return NextResponse.json({
    id: me.id,
    name: me.name,
    role: me.role,
    viaOkta: me.viaOkta,
    signedIn: me.signedIn,
    groups: me.groups ?? [],
    perms: me.perms,
  });
}
