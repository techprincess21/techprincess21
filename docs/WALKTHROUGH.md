# Content Workspace — Team Walkthrough

*A friendly tour of the prototype. No technical background needed.*

---

## What you're looking at

This is a working prototype of a project-tracking tool that **looks and feels
like Monday.com or Asana** — colorful boards, drag-free editing, filters,
people, statuses — but it's running on top of **Jira** underneath.

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

### Product Launches
A completely different workflow — launches grouped by status (On Track, At Risk,
Launched, Delayed), with launch tiers, GTM leads, and target dates.

> **This is the part to pay attention to in the demo:** the Launches board and
> the Content board are the *same tool*. Nobody wrote new software to add
> launches — we just described the columns we wanted. That's the whole point:
> **one engine, infinite boards.** Our launch spreadsheet, our campaign
> spreadsheet, our editorial calendar — all of them could become boards like
> this.

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

---

## What's real vs. what's coming

To be upfront, because credibility matters for this pitch:

| Today (prototype) | Coming next (with Jira access) |
| --- | --- |
| Boards, colors, editing, filtering, search — all fully working | Same UI, but reading and writing **live Jira data** |
| Data is realistic **sample data** that resets periodically | Real tickets, real owners, real statuses |
| Edits save in the prototype | Edits sync straight into Jira (and back out) |
| — | Notifications, reminders, and automations via Jira + Slack/email |

The reason it's sample data today is simple: we haven't requested the Jira
access token yet. **That single token is the only thing standing between this
prototype and the real thing** — and the plumbing to connect it is already
written and waiting.

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
