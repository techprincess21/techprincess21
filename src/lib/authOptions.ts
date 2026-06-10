import type { NextAuthOptions } from "next-auth";
import Okta from "next-auth/providers/okta";

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
      if (profile) {
        const p = profile as Record<string, unknown>;
        if (typeof p.email === "string") token.email = p.email;
        if (typeof p.name === "string") token.name = p.name;
        token.groups = Array.isArray(p.groups) ? (p.groups as string[]) : [];
      }
      return token;
    },
    async session({ session, token }) {
      (session as { groups?: string[] }).groups = ((token as { groups?: string[] }).groups) ?? [];
      return session;
    },
  },
};
