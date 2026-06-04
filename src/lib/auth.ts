import { cookies } from "next/headers";
import { getConfig } from "@/lib/config-store";
import { DEMO_USERS, DEFAULT_USER_ID, type DemoUser } from "@/lib/rbac";

// Server-side identity + permission resolution.
//
// Today identity comes from a `devUser` cookie set by the dev user switcher —
// this is explicitly NOT secure and exists only so the access model can be
// demoed. Once Okta SSO (OIDC) is wired up, getCurrentUser() reads the verified
// session/token instead, and the rest of this file is unchanged.

// Dev login (the "Viewing as" switcher) lets the client pick any identity — it
// is NOT secure and must be explicitly enabled. Off by default, so a deploy
// without Okta can't be impersonated: everyone is a read-only guest until real
// SSO is wired up.
export function devLoginEnabled(): boolean {
  const v = (process.env.DEV_LOGIN ?? "").toLowerCase();
  return v === "true" || v === "1";
}

const GUEST: DemoUser = { id: "guest", name: "Guest" };

export function getCurrentUser(): DemoUser {
  // When real SSO (Okta OIDC) is added, this reads the verified session instead.
  if (!devLoginEnabled()) return GUEST; // resolves to the Viewer role
  const id = cookies().get("devUser")?.value || DEFAULT_USER_ID;
  return DEMO_USERS.find((u) => u.id === id) ?? DEMO_USERS.find((u) => u.id === DEFAULT_USER_ID)!;
}

export async function getPermissions(userId: string): Promise<{ role: string; perms: string[] }> {
  const cfg = await getConfig();
  const role = cfg.userRoles[userId] ?? "Viewer";
  return { role, perms: cfg.roles[role] ?? [] };
}

// Convenience: does the current user hold a permission?
export async function can(perm: string): Promise<boolean> {
  const user = getCurrentUser();
  const { perms } = await getPermissions(user.id);
  return perms.includes(perm);
}
