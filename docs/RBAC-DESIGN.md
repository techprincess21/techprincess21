# Goatsana — Access Control Design (RBAC + Public/Private Boards)

**Status:** Design for review (no code yet). Owner: Abby. Last updated: 2026-06-15.

This is the plan for how access works once the whole team (Marketing **and** CX)
logs in through Okta. The goal: **Okta proves who you are; you control what they
can do — inside the app, without filing an IT ticket.**

The model borrows the mental model you already know:
**boards behave like GitHub repos / Slack channels — some public, some private.**

---

## 1. The two layers

### Layer 1 — Authentication (who you are) → Okta
Everyone signs in with Okta. That's it. Okta hands the app your email, name, and
group memberships. (Already working.)

### Layer 2 — Authorization (what you can do) → managed by you, in the app
Two independent dials:

- **Base role** — what someone can do *in general* across the app.
- **Per-board access** — who can see/do what on *each specific board*.

A person's power on any board = **their base role, plus anything their board
membership grants them.** (Whichever is more permissive wins, per board.)

---

## 2. Base role

Every person resolves to exactly one base role. It's decided in this order — the
first match wins:

1. **`ADMIN_EMAILS`** (env var) → **Org Admin.** The bootstrap so you can never
   lock yourself out. (You're already in here.)
2. **Manual assignment in-app** → whatever role you set for that person,
   *including custom roles you build with the checkboxes.* **This overrides their
   Okta group.** ← this is the "bump a Product Manager up to Project Admin myself"
   lever.
3. **Okta group mapping** (`OKTA_GROUP_ROLE_MAP`) → the team-wide default.
4. **Viewer** → the fallback for everyone else (incl. contractors in `All`).

So group mapping sets sensible defaults; manual assignment is your override for
individuals; `ADMIN_EMAILS` protects you at the top.

### The roles

| Role | What they can do | Sees which boards |
|------|------------------|-------------------|
| **Viewer** | View boards, watch items | Public boards + private boards they're added to |
| **Contributor** | + change status, assign people | same |
| **Editor** | + edit fields, add/delete rows, reorder, customize | same |
| **Project Admin** | + create boards, run automations, manage access **on boards they own** | Public + their own + added-to |
| **Co-Admin** | **Everything** | **All boards** — except ones they're explicitly excluded from |
| **Org Admin** | **Everything + superuser** | **All boards, always** |

### Your four tiers, mapped
- **Org Admin → you (Abby).** Sees everything, can't be excluded from anything,
  and **only another Org Admin can remove or demote an Org Admin** — so Kacey
  can't remove you.
- **Co-Admin → Kacey.** Every permission, sees every board by default — **but can
  be excluded from specific boards** (the M&A case), and **cannot remove or
  demote you.**
- **Team (Marketing + CX) → Project Admin** (or Editor — your call). Can create
  boards; sees public boards + their own + any they're added to.
- **All (incl. contractors) → Viewer.**

---

## 3. Boards = "projects", public or private

Each board gets four new access properties:

- **Owner** — whoever created it.
- **Visibility** — **🌐 Public** or **🔒 Private**.
- **Members** — a list of people, each with an optional *board role* (this is how
  you elevate someone on just one board — e.g. make a PM a Project Admin here only).
- **Excluded** — people explicitly blocked from this board (overrides Co-Admins'
  "see everything"). For the M&A board, you'd exclude Kacey here.

### What public vs private means (the GitHub/Slack analogy)
- **🌐 Public board** — anyone logged in (Viewer and up) can find it and open it.
  Read/write still depends on their role. This is your general team boards.
- **🔒 Private board** — **invisible** to everyone except its owner and members
  (plus Org Admin always; plus Co-Admins, unless excluded). It doesn't even appear
  in the tab bar for people without access. This is M&A, exec-only, sensitive launches.

### How "can this person see this board?" is decided
In order:
1. Org Admin? → **yes** (always; can't be excluded).
2. On the board's **excluded** list? → **no** (this beats Co-Admin's see-all).
3. Board is **public** and they can view boards? → **yes**.
4. They're the **owner** or a **member**? → **yes**.
5. They have **see-all-boards** (Co-Admin)? → **yes**.
6. Otherwise → **no**.

---

## 4. The screens that change

- **Tab bar** — only shows boards you're allowed to see. Each board shows a
  🌐/🔒 badge.
- **Board access panel (new)** — per board: flip Public/Private, add/remove
  members and set each one's board role, manage the exclusion list, and
  **"Clone members from another board"** (your clone-permissions ask).
- **Create board (new)** — name it, pick Public/Private, optionally clone access
  from an existing board. You become the owner.
- **People & Roles panel (existing, extended)** — assign base roles to people
  (overriding their Okta group), build custom roles (already works), and
  **add people by email before they've ever logged in** so they're ready on day one.

---

## 5. Enforced on the server (not just hidden in the UI)
Every request that reads or changes a board's data re-checks, on the server:
"can this person see this board?" and "do they have the right permission *for this
board*?" Hiding a tab isn't security — the API itself says no. (This is how it
works today for roles; we extend it to per-board.)

---

## 6. Build order
1. ✅ **Base-role control (BUILT)** — manual override of Okta groups, custom-role
   assignment, add people by Okta email (pre-assign before first login), the
   **Co-Admin** role, and **Org-Admin protection** (only an Org Admin can
   create/change/remove an Org Admin or edit the Org Admin / Co-Admin role
   definitions). Enforced server-side in `/api/config`.
2. ✅ **Public/Private boards (BUILT)** — each board is Public or Private; a
   per-board **Board access** panel manages visibility, members (with a per-board
   role that can exceed the person's base role), and a blocked-people list that
   overrides Co-Admin see-all (the M&A case). Private boards drop out of the tab
   bar for people without access, and the data API enforces it server-side
   (`boardContext` in `auth.ts`, `board-access.ts`). Includes clone-members.
3. ⬜ **Create new boards** — spin up a new board (from a template or by cloning an
   existing one), with you as owner.
4. ⬜ **Clone & polish** — clone members across boards, small quality-of-life bits.

---

## 7. Open questions for you
1. **Team base role:** ✅ **DECIDED — Project Admin** (can create boards + run
   automations). Adjustable later if it's too much.
2. **New-board default:** ✅ **DECIDED — boards start 🌐 Public** (culture of
   transparency; flip the sensitive ones to Private).
3. **Who can make a board public/private:** ✅ **DECIDED — the board's owner can**
   flip their own board either way (and admins can flip any board).
4. **CX team Okta group:** ⏸️ **HELD** — likely rolled into "Marketing Team";
   Abby to confirm. For now, ensure **`Employees` / `All` can access** and Abby
   overrides individuals locally as needed.
5. **Per-board roles:** ✅ **DECIDED — reuse the operational four** (Viewer /
   Contributor / Editor / Project Admin) when adding someone to a board; their
   board role can exceed their base role.

### Terminology
- **"Make Public / Make Private"** = the toggle that flips a board's visibility.
  Nothing leaves the app; it only changes who in the company can see the board.
