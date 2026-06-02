# Content Workspace — Team Walkthrough

*A friendly tour of the prototype. No technical background needed.*

---

## What you're looking at

This is a working prototype of a project-tracking tool that **looks and feels
like Monday.com or Asana** — colorful boards, inline editing, search & filters,
drag-and-drop, people, statuses, workflow automations, and role-based access —
but it's designed to run on top of **Jira** underneath.

Think of it this way: Jira is the powerful-but-clunky engine. This is a
friendly dashboard bolted on top, designed for *us* — marketers and PMMs — not
for engineers. Same horsepower, a steering wheel we actually like.

> **The big idea:** This is exactly the strategy we pitch to Cribl customers —
> build a tailored experience on top of a robust engine. Customers build custom
> observability and security solutions on top of the Cribl data engine. We're
> doing the same thing: a custom marketing-ops experience on top of Jira.

---

## Why this matters for us

Right now our work lives in spreadsheets. Spreadsheets are great until you need
to:

- **Assign work and have it actually notify someone**
- **Get reminders** when something's due
- **Trust that the data is current** (no "which tab is the real one?")
- **Automate the busywork** — open the right tickets, loop in Design + Marketing
  Ops + PMM automatically
- **Report up** without rebuilding a deck every quarter

Jira can do all of that. But Jira's interface makes most of us want to close the
tab. So we kept the spreadsheet *feel* and let Jira do the heavy lifting behind
the scenes.

---

## A tour of the boards

When you open the app you'll see a row of tabs across the top. Each tab is a
**board** — the same idea as a tab in a spreadsheet, just prettier and smarter.

### Content Pipeline
Every content piece, grouped by **workflow stage** (Planning → Recommendations
Created → With Marketing Strat → Complete). This is the board we'd live in day
to day.

### Launch Plan
Our **GTM launch workback tracker**, rebuilt from the real launch spreadsheet:
deliverables grouped by **phase** (Phase 0–4), with the launch-moment tags
(LA | CKO | GA | Launch), the workback dates, dependencies, and a Responsible
owner.

> **This is the part to pay attention to in the demo:** the Launch Plan and the
> Content board are the *same tool*. Nobody wrote new software to add launches —
> we just described the columns we wanted. That's the whole point: **one engine,
> infinite boards.** Our launch spreadsheet, our campaign spreadsheet, our
> editorial calendar — all of them can become boards like this.

### ⚡ Automations
Tickets that the app **opens automatically** across teams (Design, Marketing
Ops, Content/Social, Demand Gen) when a workflow fires — see "Automate the
busywork" below. Grouped by team, each ticket comes pre-filled with the right
people and a checklist.

### OKRs, Quarterly Plan, Topic Owners
The rest of our planning surfaces, same treatment.

---

## What you can actually do (try these in the demo)

- **Edit anything inline.** Click a cell, type, click away. It saves
  automatically — no "Save" button, no losing work.
- **Change a status.** Click a colored chip (like "Planning") and pick a new
  one. The color changes with it, just like Monday.
- **Assign people.** Owner columns show colored avatar circles. Type a name and
  it gets its own avatar.
- **Search the board.** The search box filters everything as you type.
- **Filter by column.** Click a filter chip (Stage, Owner, Type, Priority…) and
  check the values you want. Stack multiple filters — e.g., "show me everything
  Bill owns that's still in Planning." A counter shows "3 of 8" so you always
  know what you're looking at.
- **Add and remove items.** "New item" up top, or "+ Add item" at the bottom of
  any group.
- **Jump to Jira.** The blue Jira keys (like WEB-1022) link straight to the
  underlying ticket.
- **Drag to rearrange.** Grab the dotted handle to reorder a row — or drag it
  into another group (e.g. move a deliverable from Phase 1 to Phase 2, and its
  phase updates). You can also drag **columns**, **tabs**, and the **choices**
  inside a dropdown into the order you want.
- **Customize a board (no code).** Click **⚙ Customize** to add or remove the
  choices in any dropdown (statuses, time periods, types), recolor them, and
  manage the list of owners. Example: a launch with no CKO? Remove "Post-CKO"
  from the time-period dropdown in ten seconds.

### Automate the busywork (the headline feature)
On the **Launch Plan**, set a deliverable's **Work Type** to **Webinar**, then
move its status to **Scheduled**. The app instantly opens the **Design**,
**Marketing Ops**, **Content/Social**, and **webinar-setup** tickets — each
routed to the right team, assigned to the right people, with a checklist of the
real sub-steps from our webinar runbook. Move it to **Completed** and it opens
the post-event wrap-up ticket. You'll see them appear on the **⚡ Automations**
tab. *This is the "I shouldn't need a whole human to manage webinar setup"
problem, solved.*

### See the access model
Use the **"Viewing as"** switcher in the top-right to become different people.
A **Viewer** can only look and filter; a **Contributor** can change statuses and
assign people; an **Editor** can do most things; an **Org Admin** can open
**Roles & Access** to change who can do what. (This switcher is a stand-in for
our real Okta login — see below.)

---

## What's real vs. what's coming

To be upfront, because credibility matters for this pitch:

| Today (prototype) | Coming next (with Jira access) |
| --- | --- |
| Boards, colors, editing, filtering, search, drag-and-drop, customization — all fully working | Same UI, but reading and writing **live Jira data** |
| Data is realistic **sample data** that resets periodically | Real tickets, real owners, real statuses |
| Edits save in the prototype | Edits sync straight into Jira (and back out) |
| Automations open **mock** tickets so you can see the fan-out | Automations open **real** tickets in each team's Jira project |
| Access roles work; identity is the demo **"Viewing as"** switcher | Login via **Okta SSO**, with Okta groups driving the roles |
| — | Notifications, reminders via Jira + Slack/email |

The reason it's sample data today is simple: we're just now getting the Jira
**service account + API token**. **That credential is the main thing standing
between this prototype and the real thing** — and the plumbing to connect it is
already written and waiting.

---

## The honest pitch

This was built quickly, by describing what we wanted in plain language — what
some people call "vibe coding." That's not a knock; it's the point. The same way
a Cribl customer doesn't need to build a data engine from scratch to get a custom
security solution, **we don't need a dev team and a six-month roadmap to get a
marketing-ops tool that fits how we actually work.** We build on the robust
platform (Jira) and shape the experience to us.

If the team likes the direction, the next steps are small and concrete — see
**HOW-IT-WORKS.md** for what happens under the hood and what it takes to go
live.
