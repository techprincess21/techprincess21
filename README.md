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

**Feature-rich; Okta SSO live; boards start empty for real use.** Five board
templates (Content Pipeline, Launch Plan, OKRs, Quarterly Plan, Topic Owners)
plus the ⚡ Automations builder all render and edit; everything autosaves through
a pluggable data adapter. The adapter is the in-memory `MockAdapter` (now seeded
empty) until the Jira adapter is switched on.

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

## Persistence

Boards, rows, roles, and access all save through a small storage layer
(`src/lib/store.ts`) with two backends:

- **Durable (production):** a KV store (Vercel KV / Upstash Redis). Set these env
  vars and everything survives serverless cold starts:

  ```bash
  KV_REST_API_URL=...     # or UPSTASH_REDIS_REST_URL
  KV_REST_API_TOKEN=...   # or UPSTASH_REDIS_REST_TOKEN
  ```

  In Vercel: **Storage → Create → KV (Upstash Redis) → Connect to project**; the
  env vars are added automatically. No code changes, no npm dependency (we call
  the KV REST API directly). Redeploy and data is durable.

- **Local dev (fallback):** when those vars are absent, data is written to
  `.data/*.json` (git-ignored). Delete `.data/` to reset.

Without either (e.g. a serverless deploy with no KV), the app still runs but data
is in-memory only and resets on cold start.

## Notifications (Slack)

People get a Slack DM when they're assigned an item, or when the status changes
on an item they own (Jira-Slackbot style). Each person controls what they receive
via the 🔔 panel. Owners are matched to Slack accounts by email, so owner fields
should be real app users.

Dormant until an IT-provisioned Slack app is connected:

```bash
SLACK_BOT_TOKEN=xoxb-...   # bot token with chat:write + users:read.email
```

Okta app spec for IT: a Slack app with bot scopes **`chat:write`** and
**`users:read.email`**, installed to the workspace; share the **bot token**
(`xoxb-…`) to set as `SLACK_BOT_TOKEN`. Until then, preferences still save and the
app works normally — no DMs are sent.

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
