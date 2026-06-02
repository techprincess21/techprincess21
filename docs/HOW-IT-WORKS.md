# How It Works & What to Expect

*A plain-language explanation of how the prototype is built, why it's
trustworthy, and what it takes to go live. Light on jargon — if you can read a
spreadsheet, you can read this.*

---

## The one concept that explains everything: the "engine swap"

The most important design decision is this: **the app never talks to its data
source directly.** Instead, everything goes through a single translator we call
the **data adapter**.

```
   What you see  ─────►  The app  ─────►  Data adapter  ─────►  Where data lives
   (boards, cells)       (the UI)         (the translator)      (mock today,
                                                                 Jira tomorrow)
```

Think of the adapter like a **universal power plug**. The app plugs into it the
same way no matter what's on the other side. Today the other side is a small
built-in sample database. Tomorrow it's Jira. **Swapping them is a one-line
change**, and nothing about the boards, colors, filters, or editing has to be
rebuilt.

Why this matters to you:

- **We could build and demo the whole experience before getting Jira access.**
  That's why you can click around today.
- **Going live is low-risk.** We're not rewriting the app to connect Jira —
  we're flipping a switch that's already wired.
- **We're never locked in.** If we ever wanted a different backend, the app
  wouldn't care.

> This is the same philosophy Cribl sells: separate the *experience* from the
> *engine* so each can evolve independently.

---

## How a board is defined (and why new boards are basically free)

Every board — Content Pipeline, Product Launches, OKRs — is described in a
simple list of columns. In plain terms, a board definition says things like:

- "Show a **Status** column, and it can be *Planning, Recommendations Created,
  With Marketing Strat,* or *Complete*."
- "Show an **Owner** column, and render it as people with avatars."
- "**Group** the rows by Status."

That's it. No new software. When we added the **Product Launches** board, we
didn't build anything new — we just wrote a new column list. This is why the
claim "infinitely customizable" is real and not marketing fluff:

- Want a **Campaigns** board? Describe its columns.
- Want our **launch spreadsheet** as a board? Describe its columns.
- Want a column to be a dropdown of statuses, a person, a number, a date, a
  link? Each is a known column "type" the app already knows how to draw.

**What customization looks like in practice:** a 10-minute change to a config
file, not a software project.

---

## What's built today (the honest inventory)

**Fully working:**
- Five boards (Content Pipeline, Product Launches, OKRs, Quarterly Plan, Topic
  Owners)
- Monday-style colored status chips, with sensible colors (Done = green, High /
  At Risk = red, etc.)
- Grouping with collapsible sections and per-group counts
- People columns with colored avatars (handles multiple people per cell)
- Inline editing with **autosave** — every change is saved as you make it
- **Search** across a whole board
- **Per-column filters** (multi-select), stackable, with a live result counter
- Add / delete items
- Direct links out to the underlying Jira ticket

**Deliberately mocked (waiting on Jira access):**
- The data itself. Today it's realistic sample data stored in a small file. On a
  hosted demo it lives in memory and resets periodically — which is fine for
  showing the experience, and goes away entirely once Jira is connected.

---

## What it takes to go live with Jira

Three steps, in order:

1. **Get a Jira API token** (the access credential). This is the only true
   blocker today. The ask to IT is small: a token for your account with
   read/write access to the `WEB` project (or a throwaway test project to start
   safe).
2. **Flip the switch.** We point the data adapter at Jira instead of the sample
   data. The translation layer for this — which Jira field maps to which column
   — is **already written down** in the project (e.g., a ticket's *summary*
   becomes our *Target Prompt*; the *assignee* becomes our *Owner*; the
   workflow *status* becomes our *Stage*).
3. **Validate on a small slice** before rolling out — confirm a few edits flow
   correctly into Jira and back.

A couple of honest technical notes so there are no surprises:

- **Status changes** in Jira aren't a simple edit — Jira treats moving a ticket
  through its workflow specially. We've accounted for this; it just means status
  edits take a slightly different path under the hood.
- **People** need to be matched to real Jira accounts (a name → account lookup).
  Straightforward, but worth knowing it's a real step.

---

## Workflow automations ("playbooks") — the real payoff

This is the part that turns a prettier spreadsheet into a force multiplier.

A **playbook** encodes a real runbook — e.g. the *Demand Gen Webinar Process* —
as a set of **stages**. The trigger is two conditions: **Work Type = Webinar**
AND the deliverable **entering a status**:

> **On "Scheduled":** open the **Webinar setup**, **Design (creative)**,
> **MOPS (Marketo)**, and **Content/Social (organic + field)** tickets.
> **On "Completed":** open the **Post-event wrap-up** ticket (recording, report
> to sales, BrightTalk on-demand, newsletter).

Each ticket is pre-filled from the runbook with the right **assignees** (Kaycee →
creative, Hannah → social, Mickey → website/on-demand, Marie Hill's team →
field), a **due-date hint** (abstract 3.5 wks prior; emails 2wk/1wk/1day), and a
**checklist** of the actual sub-steps (asset sizes, UTM list, etc.).

The person running the launch no longer has to *know* that a webinar needs four
teams and a dozen sub-steps. They flag the work type; the workflow knows the
rest. Firing is **idempotent per stage**, so a status bouncing around never
double-opens tickets.

You can see this live on the **⚡ Automations** tab. Flag a deliverable on the
Launch Plan as *Webinar* and set it to *Scheduled* — the tickets appear,
grouped by team, and the deliverable shows the ticket keys it opened.

**Today vs. live:**
- *Today:* the tickets are mock records, so you can demo the fan-out safely.
- *Live (with Jira):* the exact same playbook definitions become real
  `POST /issue` calls into each team's Jira project. The rule doesn't change —
  only the backend behind the adapter does.

**Where the playbooks come from:** today they're authored as a small config
(`src/lib/playbooks.ts`). The natural next step is *ingestion* — point the app at
a runbook doc ("How to launch a webinar"), and it drafts the playbook for you to
approve. That's the bridge from "we wrote it down in a doc nobody reads" to "the
system does it."

## Security & access (RBAC)

Access is modeled as **Permissions → Roles → People** (Model A: the app enforces
permissions over a single Jira service account):

- **Granular permissions** — view, add self as watcher, change status, assign
  people, edit fields, create/delete items, reorder, customize boards, create
  projects, run automations, manage roles.
- **Roles** are editable bundles of permissions (Viewer → Contributor → Editor →
  Project Admin → Org Admin), edited in the **Roles & Access** panel.
- **People** are assigned roles. Today identity comes from a **dev "Viewing as"
  switcher** so the access model can be demoed; with **Okta SSO (OIDC)** wired
  up, identity + group membership come from the verified token and Okta groups
  drive these role assignments.

Crucially, enforcement is **server-side on every mutating route** — the UI also
hides controls a user can't use, but the server is the real gate (a Viewer who
forged a request still gets a 403). When live on Jira, Jira's own permission
scheme stays on as a backstop beneath this friendlier layer.

## The roadmap (where this can go)

1. **Now:** the experience, mock-backed. ✅
2. **Next:** live Jira read + write (needs the token).
3. **Then — the payoff:** the things spreadsheets can't do —
   - assign work that actually notifies the owner,
   - due-date **reminders** via Slack or email,
   - **automations** like "when a content piece hits *Recommendations Created*,
     open linked tickets for Design, Marketing Ops, and PMM."
4. **Ongoing:** new boards on demand (campaigns, launches, editorial calendar),
   each a quick config change on the same engine.

---

## Where to deploy it for the team

The prototype runs as a standard web app and can be deployed to **Vercel** (the
same platform the website uses) as an **isolated preview project** — it won't
touch the website, and it needs no secret keys for the mock demo. See the main
**README.md** for the technical run/deploy steps, and **WALKTHROUGH.md** for the
non-technical tour to share alongside the link.

---

## TL;DR

- The app is split from its data by a **translator (adapter)** — so we built the
  whole experience before having Jira, and connecting Jira later is a switch, not
  a rebuild.
- **New boards are config, not code** — minutes, not projects.
- **One token** stands between this and live Jira data; the wiring is already in
  place.
- This is the "custom experience on a robust engine" story we already tell
  customers — applied to our own team.
