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

// The current user's id (from the dev switcher cookie). When SSO is added this
// becomes the verified subject from the OIDC session.
export function currentUserId(): string {
  if (!devLoginEnabled()) return "guest"; // no impersonation -> read-only guest
  return cookies().get("devUser")?.value || DEFAULT_USER_ID;
}

// Resolve a display name for an id across built-in + admin-added users.
export async function getCurrentUser(): Promise<DemoUser> {
  const id = currentUserId();
  const builtin = DEMO_USERS.find((u) => u.id === id);
  if (builtin) return builtin;
  const cfg = await getConfig();
  const custom = cfg.users.find((u) => u.id === id);
  return { id, name: custom?.name ?? (id === "guest" ? "Guest" : id) };
}

export async function getPermissions(userId: string): Promise<{ role: string; perms: string[] }> {
  const cfg = await getConfig();
  const role = cfg.userRoles[userId] ?? "Viewer";
  return { role, perms: cfg.roles[role] ?? [] };
}

// Convenience: does the current user hold a permission?
export async function can(perm: string): Promise<boolean> {
  const { perms } = await getPermissions(currentUserId());
  return perms.includes(perm);
}
