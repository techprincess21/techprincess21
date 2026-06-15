import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { getConfig } from "@/lib/config-store";
import { authOptions, oktaConfigured } from "@/lib/authOptions";
import { DEMO_USERS, DEFAULT_USER_ID, groupsToRole } from "@/lib/rbac";

// Server-side identity + permission resolution.
//
// Priority: a verified Okta session (when Okta is configured) → the dev
// "Viewing as" cookie (when DEV_LOGIN is on) → a read-only guest. So a deploy
// with Okta uses real SSO; without it, the demo switcher; with neither, guest.

export function devLoginEnabled(): boolean {
  const v = (process.env.DEV_LOGIN ?? "").toLowerCase();
  return v === "true" || v === "1";
}

// Emails that should always resolve to Org Admin, regardless of Okta groups.
// Solves the bootstrap problem: someone has to be admin to assign roles before
// any group->role mapping exists. Comma-separated, case-insensitive.
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export interface Identity {
  id: string;
  name: string;
  role: string;
  perms: string[];
  viaOkta: boolean;
  signedIn: boolean;
  groups?: string[];
}

export async function getIdentity(): Promise<Identity> {
  const cfg = await getConfig();
  const permsFor = (role: string) => cfg.roles[role] ?? [];

  if (oktaConfigured()) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (email) {
      const groups = ((session as { groups?: string[] } | null)?.groups ?? []) as string[];
      const lower = email.toLowerCase();
      // Base-role precedence: ADMIN_EMAILS (bootstrap) → manual in-app assignment
      // (overrides groups, can be a custom role) → Okta group mapping → Viewer.
      const manual = cfg.userRoles[email] ?? cfg.userRoles[lower];
      const role = adminEmails().includes(lower)
        ? "Org Admin"
        : manual && cfg.roles[manual]
          ? manual
          : groupsToRole(groups);
      return { id: lower, name: session?.user?.name ?? email, role, perms: permsFor(role), viaOkta: true, signedIn: true, groups };
    }
    // Okta on, nobody signed in yet → read-only guest (page shows sign-in).
    return { id: "guest", name: "Guest", role: "Viewer", perms: permsFor("Viewer"), viaOkta: true, signedIn: false };
  }

  // Dev switcher / guest fallback.
  const id = devLoginEnabled() ? cookies().get("devUser")?.value || DEFAULT_USER_ID : "guest";
  const role = cfg.userRoles[id] ?? "Viewer";
  const name =
    DEMO_USERS.find((u) => u.id === id)?.name ??
    cfg.users.find((u) => u.id === id)?.name ??
    (id === "guest" ? "Guest" : id);
  return { id, name, role, perms: permsFor(role), viaOkta: false, signedIn: devLoginEnabled() };
}

// Convenience: does the current user hold a permission?
export async function can(perm: string): Promise<boolean> {
  const me = await getIdentity();
  return me.perms.includes(perm);
}
