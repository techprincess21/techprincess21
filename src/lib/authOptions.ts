import type { NextAuthOptions } from "next-auth";
import Okta from "next-auth/providers/okta";
import { getConfig, recordKnownUser } from "@/lib/config-store";
import { groupsToRole } from "@/lib/rbac";

// Okta SSO via Auth.js (NextAuth). Entirely gated: if the OKTA_* env vars
// aren't set, this stays dormant and the app uses the dev "Viewing as" switcher
// exactly as before. Set the vars (once an Okta OIDC app exists) to turn on real
// login — no other code changes needed.
export function oktaConfigured(): boolean {
  return Boolean(
    process.env.OKTA_ISSUER && process.env.OKTA_CLIENT_ID && process.env.OKTA_CLIENT_SECRET
  );
}

export const authOptions: NextAuthOptions = {
  providers: oktaConfigured()
    ? [
        Okta({
          clientId: process.env.OKTA_CLIENT_ID as string,
          clientSecret: process.env.OKTA_CLIENT_SECRET as string,
          issuer: process.env.OKTA_ISSUER as string,
          // Ask Okta for the user's group memberships so we can map them to roles.
          authorization: { params: { scope: "openid email profile groups" } },
        }),
      ]
    : [],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, profile }) {
      // `profile` is present only at actual sign-in (not on token refresh), so
      // this block — including the roster write — runs once per login.
      if (profile) {
        const p = profile as Record<string, unknown>;
        if (typeof p.email === "string") token.email = p.email;
        if (typeof p.name === "string") token.name = p.name;
        token.groups = Array.isArray(p.groups) ? (p.groups as string[]) : [];

        // Record this person in the access roster so admins can see everyone who
        // has signed in. Mirrors getIdentity's role precedence for the displayed
        // role (ADMIN_EMAILS → manual override → Okta-group mapping).
        const email = typeof token.email === "string" ? token.email.toLowerCase() : "";
        if (email) {
          try {
            const cfg = await getConfig();
            const adminEmails = (process.env.ADMIN_EMAILS ?? "")
              .split(",")
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean);
            const manual = cfg.userRoles[token.email as string] ?? cfg.userRoles[email];
            const role = adminEmails.includes(email)
              ? "Org Admin"
              : manual && cfg.roles[manual]
                ? manual
                : groupsToRole(token.groups as string[]);
            await recordKnownUser(email, typeof token.name === "string" ? token.name : email, role);
          } catch {
            // Roster bookkeeping must never block sign-in.
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session as { groups?: string[] }).groups = ((token as { groups?: string[] }).groups) ?? [];
      return session;
    },
  },
};
