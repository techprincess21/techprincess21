# Goatsana — a friendly project workspace on top of Jira

**Goatsana** is a Monday/Asana-style surface over a Jira project. It recreates the team's
working spreadsheets (content pipeline, GTM launch workback, OKRs, quarterly
plan, topic owners) as editable, filterable grids, and layers Jira's workflow
muscle (assign, automate, govern) behind a friendly UI.

Built so far (all mock-backed, ready to flip to Jira):
- Monday-style boards: colored status chips, grouping, person avatars, autosave
- Search + stackable per-column filters
- Drag-and-drop: rows (incl. across groups), columns, tabs, dropdown choices
- Per-board customization (no code): edit/recolor/reorder dropdown choices,
  manage owners — via the **⚙ Customize** panel
- Workflow **automations (playbooks)**: multi-stage, cross-team ticket creation
  (the Demand Gen Webinar runbook, encoded)
- **RBAC** (Model A): editable roles + server-side enforcement; dev identity
  switcher standing in for Okta SSO

## Docs

- **[docs/WALKTHROUGH.md](docs/WALKTHROUGH.md)** — non-technical tour to share
  with the team (the pitch + how to use the app).
- **[docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md)** — plain-language explanation
  of the architecture and what it takes to go live with Jira.
- **[docs/SECURITY.md](docs/SECURITY.md)** — one-pager for the IT/Okta
  conversation: auth, RBAC, the Jira credential, and what to provision.
- This README — technical setup, run, and deploy steps.

## Status

**Mock-backed and feature-rich; awaiting the Jira service account to go live.**
All six surfaces render and edit; everything autosaves through a pluggable data
adapter. The adapter is currently the in-memory `MockAdapter` (seeded from the
real spreadsheets) so we can build and demo before Jira access is wired up.

## Architecture

```
UI (Next.js, src/app)            ← Workspace, EditableGrid, Customize/Access modals
   │  fetch /api/...
   ▼
API routes (src/app/api)         ← permission-gated (src/lib/auth.ts)
   │  getAdapter()               ← also: runPlaybooks(), config-store
   ▼
DataAdapter  ── MockAdapter      (active: JSON file in .data/)
             └─ JiraAdapter      (stub: Jira Cloud REST API)
```

Key modules:
- `src/lib/adapters/*` — the data seam (mock today, Jira tomorrow)
- `src/lib/views.ts` — board definitions (columns, grouping, defaults)
- `src/lib/config-store.ts` — persisted per-board customization (choices,
  colors, column/tab order, owners) **and** roles/role-assignments
- `src/lib/playbooks.ts` — the workflow automation engine
- `src/lib/rbac.ts` + `src/lib/auth.ts` — the permission model + server-side
  resolution of current user → role → permissions

The whole point is the **`DataAdapter` seam** (`src/lib/adapters/types.ts`).
The UI and API never talk to Jira directly — they call the adapter. Switching
backends is one env var:

```bash
DATA_ADAPTER=jira          # default is "mock"
JIRA_BASE_URL=https://taktak.atlassian.net
JIRA_EMAIL=svc-bot@cribl.io   # the Jira service/bot account (Model A)
JIRA_API_TOKEN=...         # id.atlassian.com/manage-profile/security/api-tokens
JIRA_PROJECT_KEY=WEB
```

**Auth note:** the app uses app-enforced RBAC (Model A) over a single Jira
service account. Identity resolves in this order (`src/lib/auth.ts` →
`getIdentity()`): a verified **Okta SSO** session → the dev "Viewing as"
switcher → a read-only guest. See **[docs/SECURITY.md](docs/SECURITY.md)**.

**Okta SSO (OIDC), via NextAuth** — staged and gated. It activates only when
these env vars are set; until then the app uses the dev switcher unchanged:

```bash
OKTA_ISSUER=https://<org>.okta.com/oauth2/default
OKTA_CLIENT_ID=...
OKTA_CLIENT_SECRET=...
NEXTAUTH_URL=https://<your-vercel-domain>
NEXTAUTH_SECRET=...        # openssl rand -base64 32
```

Okta app spec: OIDC **Web** app (Authorization Code); sign-in redirect
`https://<domain>/api/auth/callback/okta`; scopes `openid profile email groups`
(include the **groups** claim). Okta groups map to roles via
`groupsToRole()` in `src/lib/rbac.ts` (e.g. a group containing "Org Admin" →
Org Admin); default is Viewer. When Okta is on and nobody's signed in, the app
shows a sign-in screen and blocks mutations.

The dev switcher is gated behind an env var and is **off by default**:

```bash
DEV_LOGIN=true   # enable the "Viewing as" impersonation switcher (demos only)
```

When unset, the switcher is hidden and the server ignores the impersonation
cookie — every request resolves to a read-only **Guest (Viewer)**, so a deploy
without Okta can't be impersonated. Set `DEV_LOGIN=true` (e.g. in the Vercel
project's env) to demo the full role-based experience before SSO is wired up.

The Jira field mapping (e.g. `targetPrompt → summary`, `stage → workflow
transition`, `owner → assignee`) is documented inline in
`src/lib/adapters/jira.ts`.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

Mock edits persist to `.data/db.json` (git-ignored). Delete that file to reset
to the seed data.

## Where the boards come from

Boards are defined declaratively in `src/lib/views.ts` (columns, grouping,
defaults). At runtime, `config-store.ts` layers per-board customizations on top
(dropdown choices, colors, column/tab order, owners) so teams tailor a board
without code. Mock data + config persist under `.data/` (git-ignored); delete it
to reset.

## Roadmap

- **Done (mock-backed):** editable boards; search/filter; drag-and-drop;
  per-board customization; multi-stage workflow automations; RBAC with
  server-side enforcement.
- **Next:** wire `JiraAdapter` to the live `WEB` project (read + write + status
  transitions) using the requested **service account + API token**.
- **Then:** replace the dev identity switcher with **Okta SSO (OIDC)**; map Okta
  groups → roles.
- **Then:** automations open real cross-team Jira tickets; add reminders via
  Slack/email; ingest a runbook doc to draft a playbook.
- **Ongoing:** new boards on demand (campaigns, editorial calendar) — config,
  not code.
