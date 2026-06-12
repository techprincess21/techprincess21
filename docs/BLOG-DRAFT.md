# The App Was the Easy Part

### What building my own software with AI taught me about why telemetry platforms win

I'm a CMO. I do not write production code. A few weeks ago I built a working piece of software anyway — a Monday/Asana-style project tool for my team — by describing what I wanted to Claude and iterating.

That part is the headline everyone expects: *"non-technical exec ships an app with AI."* True, and genuinely fun. But it buried the lede.

Because building the application turned out to be the easy 20%. The other 80% — the part nobody puts in the demo — was everything *underneath* the app. And that 80% is the entire reason I'm writing this.

## The app was easy. Everything under it was not.

Here's the actual sequence of problems I had to solve. Notice how few of them are about *the app*:

- **What do I build it *on*?** A pretty UI is worthless without a real system of record. I didn't want to invent a database; I wanted to build *on top of* a robust engine my company already trusted. So the app became a friendly face over **Jira** — Jira does the heavy lifting (the data, the workflow), and my tool is the experience my team actually enjoys using.
- **Where does it run — and what can it plug into?** I needed somewhere to actually host the thing (**Vercel**). But "somewhere to host it" badly undersells the problem. A host on its own is nothing. What mattered was that the place it runs could securely **connect to our identity (SSO), enforce our access rules, and reach our real data**. A server that can't plug into RBAC and the system of record is just a demo on a URL. A host that *can* is the beginning of a platform. This turned out to be one of the biggest deals of the entire project — and the part I least expected.
- **How does it get *access* to the data?** This was days of work that had nothing to do with features: requesting a **service account**, generating an **API token**, getting network/firewall rules opened, and a few false starts before the app could even talk to Jira.
- **Who's allowed to do what?** I had to design **role-based access control** from scratch — permissions, roles (viewer, contributor, editor, admin), and enforcement so that a "viewer" *can't* quietly delete things even if they try.
- **How do my actual people log in?** Real identity. Hooking up **single sign-on (Okta)** so the right humans get the right access, with their identity groups mapping to those roles.
- **Where does the data live and who governs it?** The app is just a lens; the data stays in the system of record, synced and governed there — not copied into some shadow store I'd have to secure myself.
- **And the magic part — automation.** When a webinar gets scheduled, the tool now opens the right tickets across Design, Marketing Ops, and Social, automatically, in *their* systems.

Look at that list again. **Almost none of it is "the app."** It's hosting, access, credentials, identity, permissions, governance, and — above all — **governed access to data that lives somewhere else.**

AI made the application nearly free to build. What AI did *not* make free was the platform the application has to stand on. (For the curious: the building itself was maybe 10–15 hours of back-and-forth — work that would traditionally be a multi-week, team-sized project. The platform questions took just as long, and those are the ones that actually decide whether the thing is safe to put in front of real people.)

## "Somewhere to host it" is doing a lot of work in that sentence

I want to dwell on the hosting piece, because it's the one I most underestimated and it's the one that clicked hardest for me.

When you picture "hosting an app," you picture a server. A URL. Done. But a URL is a toy. The moment you want *real people* using it with *real data*, the host stops being a place to run code and becomes the connective tissue for everything that makes the app trustworthy: it's where the app authenticates against our **SSO**, where it enforces **who-can-do-what**, and where it securely reaches the **actual data** in our systems of record.

In other words: the hard, valuable thing isn't a place to run code. It's a place to run code *that's already wired into identity, access control, and your data.* Get that, and building experiences on top becomes almost casual. Miss it, and every new app is a from-scratch security and integration project. That gap — between "a server" and "a governed home for experiences" — is the whole ballgame.

## This is the pattern that's about to hit everything

I went through this for one small marketing tool. Now multiply it.

In the AI era, *everyone* is about to become a builder. Vendors will build experiences. Partners will build them. Customers like me will build them. And increasingly, **AI agents will generate them on the fly** — spinning up a view, a workflow, an investigation, on demand.

Every one of those builders will hit the exact wall I hit. Not "how do I write the app" — AI handles that. The wall is: *Where does it run? How does it get governed access to the data? How do I control who sees what? How do I not recreate a pile of duplicated, ungoverned data and integrations every single time?*

Nobody wants to rebuild hosting, identity, RBAC, and data access from scratch for every new experience. **They need a platform underneath.**

## For IT and Security, that platform is built on telemetry — and that's Cribl

Swap "my marketing data in Jira" for "an organization's IT and Security telemetry," and my weekend project becomes the defining infrastructure problem of the next decade.

Here's the part that stopped me cold once I'd lived it: I rebuilt hosting, identity, access control, and data access from scratch — for **one small app.** Now realize IT and Security have been doing exactly that, at enormous scale, for twenty years. Every new tool — a SIEM, an observability platform, a threat-detection product, an analytics suite — quietly shipped with *its own* telemetry stack underneath: its own collection, its own storage, its own schema, its own governance. Organizations ended up collecting the same data multiple times, storing it multiple times, governing it multiple times, and paying for it multiple times. Even the "broad portfolios" from a single vendor are often fragmented under the hood — different products, acquired at different times, each with its own plumbing. Building solution after solution, the industry **accidentally rebuilt the same telemetry infrastructure over and over again.**

That was tolerable when applications were where the value lived. AI changes the equation. AI visibility, AI SOC, agentic operations — every AI experience needs access to the telemetry, and most vendors answer the same way: *send us another copy of your data.* That doesn't scale. **The challenge is no longer collecting telemetry — it's providing secure, governed access to it across people, applications, and agents without duplicating the infrastructure every single time.** Put bluntly: **AI cannot reason over data it cannot access.** The first challenge isn't centralization. It's access.

The fix is the same one I stumbled into for my app, just at a different scale: **separate the telemetry infrastructure from the apps that consume it.** Build the shared capabilities once — collection, routing, transformation, enrichment, governance, storage, federation, search, and access — and let every experience draw on them, instead of each one rebuilding its own. That's the platform I *wish* I'd had: a governed home for experiences, RBAC and governance baked in, and access to the data wherever it lives — stored with the platform *and* federated across the tools and stores it already sits in.

There's a clean way to say what that kind of platform is. **AWS doesn't sell Netflix — AWS sells the platform that lets Netflix exist.** I built a tiny "Netflix" for my marketing team; what I kept wishing for was the "AWS" underneath it. For IT and Security telemetry, **Cribl is that platform — and crucially, it isn't another solution. It's the shared telemetry infrastructure every solution needs. LFG!**
