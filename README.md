# Content Workspace — a spreadsheet frontend over Jira

A Monday/Asana-style surface over a Jira project. It recreates the team's
working spreadsheet (content pipeline, OKRs, quarterly plan, topic owners) as
editable, filterable grids, with the goal of layering Jira's workflow muscle
(assign, watch, remind, automate) behind a friendly UI.

## Docs

- **[docs/WALKTHROUGH.md](docs/WALKTHROUGH.md)** — non-technical tour to share
  with the team (the pitch + how to use the app).
- **[docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md)** — plain-language explanation
  of the architecture and what it takes to go live with Jira.
- This README — technical setup, run, and deploy steps.

## Status

**Milestone 1 — editable grid with write-back (mock-backed).** All four tabs
render and edit; edits autosave through a pluggable data adapter. The adapter
is currently the in-memory `MockAdapter` (seeded from the real spreadsheet) so
we can build and demo before Jira access is confirmed.

## Architecture

```
UI (Next.js, src/app)
   │  fetch /api/<collection>
   ▼
API routes (src/app/api/[collection])
   │  getAdapter()
   ▼
DataAdapter  ── MockAdapter   (active: JSON file in .data/)
             └─ JiraAdapter   (stub: Jira Cloud REST API)
```

The whole point is the **`DataAdapter` seam** (`src/lib/adapters/types.ts`).
The UI and API never talk to Jira directly — they call the adapter. Switching
backends is one env var:

```bash
DATA_ADAPTER=jira          # default is "mock"
JIRA_BASE_URL=https://taktak.atlassian.net
JIRA_EMAIL=you@cribl.io
JIRA_API_TOKEN=...         # id.atlassian.com/manage-profile/security/api-tokens
JIRA_PROJECT_KEY=WEB
```

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

## Where the tabs come from

Tabs are defined declaratively in `src/lib/views.ts` (columns, grouping,
defaults). This is the layer teams will eventually customize per project.

## Roadmap

- **M1 (done):** editable grids mirroring the spreadsheet tabs, mock-backed.
- **M2:** wire `JiraAdapter` to the live `WEB` project (read + write + status
  transitions) once IT confirms access.
- **M3:** workflow features — assign, watch, reminders via Slack/email (both
  are already connected in this environment).
- **M4:** per-project customizable automations (e.g. "open tickets with Design
  + Marketing Ops + PMM").
