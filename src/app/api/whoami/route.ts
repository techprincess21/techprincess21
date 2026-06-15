import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Debug helper: shows the current user how they're being resolved — name, the
// role they landed on, and (crucially) the exact Okta group names the token
// carries. Use this to discover real group names so they can be wired into
// OKTA_GROUP_ROLE_MAP. Only ever returns info about the caller's own session.
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
