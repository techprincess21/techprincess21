# Security & Access — One-Pager

*For the IT / Okta / Jira-admin conversation. How this app authenticates users,
authorizes actions, and talks to Jira — and exactly what we need provisioned.*

---

## Summary

A marketing-ops UI on top of Jira. Humans sign in with **Okta SSO**; the app
enforces **role-based access control** in front of a **single Jira service
account** (the "service account" model). Jira remains the system of record and
its own permissions stay on as a backstop.

```
Person ──Okta OIDC──► App (RBAC) ──service-account token──► Jira Cloud REST API
        (who you are)   (what you can do)    (system of record)
```

## 1. Authentication (who the user is)

- **Okta OIDC application** (Authorization Code flow) fronts the app, consistent
  with how Okta already fronts Jira and our other tools.
- The app uses **Auth.js (NextAuth)** to handle the OIDC handshake and session —
  no passwords or password storage in the app.
- We read the user's **email + Okta group memberships** from the verified token.

**Provision (Okta admin):** an OIDC web app with our redirect URI, and **group
claims included** in the ID token.

## 2. Authorization (what the user can do)

- Model: **Permissions → Roles → People.**
  - *Permissions* are granular (view, add self as watcher, change status, assign
    people, edit fields, create/delete items, reorder, customize boards, create
    projects, run automations, manage roles).
  - *Roles* are editable bundles (Viewer → Contributor → Editor → Project Admin
    → Org Admin).
  - *Assignment*: **Okta groups map to roles**, so membership is governed
    centrally in Okta; role definitions live in the app so they can be tuned
    without an Okta change.
- **Enforcement is server-side** on every mutating request (create / edit /
  delete / reorder / customize / run-automation / manage-roles). The UI also
  hides controls a user lacks, but the server is the real gate.

## 3. How the app talks to Jira (the credential)

- **Now (Model A — service account):** one Jira **service/bot account** with a
  scoped **API token**. Simple, fast, one credential to manage. The app enforces
  who-can-do-what; Jira actions are attributed to the service account.
- **Later (Model B — per-user OAuth):** Atlassian **OAuth 2.0 (3LO)** so actions
  are attributed to the real person in Jira's audit log. More setup; optional
  upgrade.

**Provision (Jira/IT):** a **service/bot account** with an **API token**, scoped
to the relevant project (e.g. `WEB`, or a throwaway test project to start). *(Or,
for Model B: approval to register an Atlassian OAuth 2.0 app.)*

## 4. Data handling

- **System of record is Jira.** Once live, items are Jira issues read/written via
  the API; the app stores only lightweight config (board customizations, role
  definitions, role assignments).
- **No secrets in source control.** Credentials live in environment variables
  (`JIRA_API_TOKEN`, Okta client secret) injected at deploy time.
- **Network:** standard HTTPS to Jira Cloud + Okta. Hostable on our existing
  **Vercel** team as an isolated project.

## 5. Current state vs. production hardening

| Area | Today (prototype) | Production |
| --- | --- | --- |
| Login | Dev "Viewing as" switcher, **off by default** (`DEV_LOGIN` flag) | Okta OIDC SSO |
| Data | Mock sample data | Live Jira via service account |
| RBAC | Built + enforced server-side | Same, with Okta groups driving roles |
| Secrets | None needed for mock | `JIRA_API_TOKEN` + Okta client secret in env |

The dev login switcher is gated behind the `DEV_LOGIN` environment variable and
is disabled unless explicitly turned on — so a deployment without Okta cannot be
impersonated (everyone is a read-only guest until real SSO is connected).

## What we're asking for

1. **Okta:** an OIDC web app (Authorization Code), redirect URI TBD, **group
   claims** in the token.
2. **Jira/IT:** a **service/bot account + scoped API token** (Model A).

Everything else — the RBAC model, server-side enforcement, and the Jira field
mapping — is already built and waiting for these two credentials.
