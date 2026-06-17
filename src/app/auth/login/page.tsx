"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";

// Okta IdP-initiated sign-in landing.
//
// When a user launches Goatsana from the Okta dashboard tile, Okta sends them
// here — the app's configured "Initiate Login URI" — with ?iss=<okta-org>.
// Our normal flow is SP-initiated (land on the app, click "Sign in with Okta"),
// so without this route the tile launch 404s. We convert the IdP-initiated hit
// into the standard NextAuth handshake: because the user already has an Okta
// session, this round-trips silently and drops them straight into the app.
export default function AuthLogin() {
  useEffect(() => {
    signIn("okta", { callbackUrl: "/" });
  }, []);

  return (
    <div className="signin-screen">
      <div className="signin-card">
        <span className="brand-mark" role="img" aria-label="Goatsana">
          🐐
        </span>
        <h1>Goatsana</h1>
        <p>Signing you in with Okta…</p>
        <a className="btn btn-primary signin-btn" href="/api/auth/signin">
          Continue
        </a>
      </div>
    </div>
  );
}
