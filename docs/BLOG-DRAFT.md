# The App Was the Easy Part

### What building my own software with AI taught me about why telemetry platforms win

*Draft — CMO byline. Bracketed [TODO] notes mark places to drop in product
specifics / the agentic-telemetry positioning you're refining.*

---

I'm a CMO. I do not write production code. A few weeks ago I built a working
piece of software anyway — a Monday/Asana-style project tool for my marketing
team — by describing what I wanted to Claude and iterating.

That part is the headline everyone expects: *"non-technical exec ships an app
with AI."* True, and genuinely fun. But it buried the lede.

Because building the application turned out to be the easy 20%. The other 80% —
the part nobody puts in the demo — was everything *underneath* the app. And that
80% is the entire reason I'm writing this.

## The app was easy. Everything under it was not.

Here's the actual sequence of problems I had to solve. Notice how few of them
are about *the app*:

- **What do I build it *on*?** A pretty UI is worthless without a real system of
  record. I didn't want to invent a database; I wanted to build *on top of* a
  robust engine my company already trusted. So the app became a friendly face
  over **Jira** — Jira does the heavy lifting (the data, the workflow), and my
  tool is the experience my team actually enjoys using.
- **Where does it run — and what can it plug into?** I needed somewhere to
  actually host the thing (**Vercel**). But "somewhere to host it" badly
  undersells the problem. A host on its own is nothing. What mattered was that
  the place it runs could securely **connect to our identity (SSO), enforce our
  access rules, and reach our real data**. A server that can't plug into RBAC and
  the system of record is just a demo on a URL. A host that *can* is the
  beginning of a platform. This turned out to be one of the biggest deals of the
  entire project — and the part I least expected.
- **How does it get *access* to the data?** This was days of work that had
  nothing to do with features: requesting a **service account**, generating an
  **API token**, getting network/firewall rules opened, and a few false starts
  before the app could even talk to Jira.
- **Who's allowed to do what?** I had to design **role-based access control**
  from scratch — permissions, roles (viewer, contributor, editor, admin), and
  enforcement so that a "viewer" *can't* quietly delete things even if they try.
- **How do my actual people log in?** Real identity. Hooking up **single
  sign-on (Okta)** so the right humans get the right access, with their identity
  groups mapping to those roles.
- **Where does the data live and who governs it?** The app is just a lens; the
  data stays in the system of record, synced and governed there — not copied
  into some shadow store I'd have to secure myself.
- **And the magic part — automation.** When a webinar gets scheduled, the tool
  now opens the right tickets across Design, Marketing Ops, and Social,
  automatically, in *their* systems.

Look at that list again. **Almost none of it is "the app."** It's hosting,
access, credentials, identity, permissions, governance, and — above all —
**governed access to data that lives somewhere else.**

AI made the application nearly free to build. What AI did *not* make free was the
platform the application has to stand on. (For the curious: the building itself
was maybe 10–15 hours of back-and-forth — work that would traditionally be a
multi-week, team-sized project. The platform questions took just as long, and
those are the ones that actually decide whether the thing is safe to put in front
of real people.)

## "Somewhere to host it" is doing a lot of work in that sentence

I want to dwell on the hosting piece, because it's the one I most underestimated
and it's the one that clicked hardest for me.

When you picture "hosting an app," you picture a server. A URL. Done. But a URL
is a toy. The moment you want *real people* using it with *real data*, the host
stops being a place to run code and becomes the connective tissue for everything
that makes the app trustworthy: it's where the app authenticates against our
**SSO**, where it enforces **who-can-do-what**, and where it securely reaches the
**actual data** in our systems of record.

In other words: the hard, valuable thing isn't a place to run code. It's a place
to run code *that's already wired into identity, access control, and your data.*
Get that, and building experiences on top becomes almost casual. Miss it, and
every new app is a from-scratch security and integration project. That gap —
between "a server" and "a governed home for experiences" — is the whole ballgame.


## This is the pattern that's about to hit everything

I went through this for one small marketing tool. Now multiply it.

In the AI era, *everyone* is about to become a builder. Vendors will build
experiences. Partners will build them. Customers like me will build them. And
increasingly, **AI agents will generate them on the fly** — spinning up a view, a
workflow, an investigation, on demand.

Every one of those builders will hit the exact wall I hit. Not "how do I write
the app" — AI handles that. The wall is: *Where does it run? How does it get
governed access to the data? How do I control who sees what? How do I not
recreate a pile of duplicated, ungoverned data and integrations every single
time?*

Nobody wants to rebuild hosting, identity, RBAC, and data access from scratch for
every new experience. **They need a platform underneath.**

## For IT and Security, that platform is built on telemetry — and that's Cribl

Swap "my marketing data in Jira" for "an organization's IT and Security
telemetry," and my weekend project becomes the defining infrastructure problem of
the next decade.

Here's the part that stopped me cold once I'd lived it: I rebuilt hosting,
identity, access control, and data access from scratch — for **one small app.**
Now realize IT and Security have been doing exactly that, at enormous scale, for
twenty years. Every new tool — a SIEM, an observability platform, a threat-
detection product, an analytics suite — quietly shipped with *its own* telemetry
stack underneath: its own collection, its own storage, its own schema, its own
governance. Organizations ended up collecting the same data multiple times,
storing it multiple times, governing it multiple times, and paying for it multiple
times. Even the "broad portfolios" from a single vendor are often fragmented under
the hood — different products, acquired at different times, each with its own
plumbing. Building solution after solution, the industry **accidentally rebuilt
the same telemetry infrastructure over and over again.**

That was tolerable when applications were where the value lived. AI changes the
equation. A whole new wave of experiences — AI visibility, AI SOC, agentic
operations, and plenty more — all need access to the telemetry, and most vendors
answer the same way: *send us another copy of your data.* That doesn't scale.
**The challenge is no longer collecting telemetry — it's providing secure,
governed access to it across people, applications, and agents without duplicating
the infrastructure every single time.** Put bluntly: **AI cannot reason over data
it cannot access.** The first challenge isn't centralization. It's access.

The fix is the same one I stumbled into for my app, just at a different scale:
**separate the telemetry infrastructure from the apps that consume it.** Build the
shared capabilities once — collection, routing, transformation, enrichment,
governance, storage, federation, search, and access — and let every experience
draw on them, instead of each one rebuilding its own. That's the platform I *wish*
I'd had: a governed home where apps and experiences get built, deployed, and run,
with RBAC and governance baked in and access to the data wherever it lives —
stored with the platform *and* federated across the tools and stores it already
sits in.

There's a clean way to say what that kind of platform is. **AWS doesn't sell
Netflix — AWS sells the platform that lets Netflix exist.** I built a tiny
"Netflix" for my marketing team; what I kept wishing for was the "AWS" underneath
it. For IT and Security telemetry, **Cribl is that platform — and crucially, it
isn't another solution. It's the shared telemetry infrastructure every solution
needs.**

But access to the data is only half of it. The other half — the half I most want
to land, because it's exactly what I lived — is that a real platform is **where
the apps get built and deployed.** The telemetry is the foundation; the
*experiences* are what people actually touch. And on a platform, those experiences
come from everywhere: some are built by Cribl, some are **partner apps**, some are
**built by customers** (a marketer with an idea and an afternoon — hi), and
increasingly some are **generated by AI.** None of them stand up their own
infrastructure. They're built and deployed *on the platform*, with governed access
to the telemetry already wired in — exactly the thing I had to assemble by hand
for one small tool, delivered as a product.

And this isn't thin or theoretical. Cribl already ships a deep, growing set of
capabilities and experiences — Insights, detections that run right in the Stream,
background detections, search, and far more than I could list here (the real
catalog lives at **docs.cribl.io**). The point was never the list. The point is
that all of it — *plus whatever you, your partners, or your AI build next* — runs
on one platform.

---

### In Cribl's words

*Cribl: The AI Platform for Telemetry*

For more than two decades, IT and Security innovation has been driven by
applications. Organizations adopted observability platforms to monitor systems,
SIEMs to investigate threats, analytics tools to generate insights, and countless
specialized solutions to solve emerging operational challenges.

Each of these applications delivered value. Each also introduced its own telemetry
infrastructure, data stores, schemas, integrations, and operational requirements.
As organizations adopted more solutions, they accumulated more copies of the same
data, more infrastructure to operate, and more complexity to manage.

For years, this tradeoff was acceptable because applications were the primary
source of value. The AI era changes that equation.

AI agents, copilots, and automated workflows do not care which application
generated the data. They care about access to the data itself. As organizations
deploy AI across IT and Security, telemetry becomes the critical raw material that
powers people, applications, and agents alike — shifting the center of gravity from
individual applications to the platform that makes telemetry accessible, usable,
and actionable.

**Every IT and Security experience of the next decade will be built on a telemetry
platform.** Security, observability, analytics, automation, AI visibility, AI SOC,
agentic operations, and future experiences we have not yet imagined will all depend
on access to the same underlying telemetry.

Organizations are not starting from a blank slate. Years of investment have left
telemetry scattered across observability platforms, security tools, cloud services,
data lakes, and operational systems. The challenge is no longer collecting data —
it's accessing, governing, and operationalizing it across an increasingly complex
environment. The first challenge is not centralization. **The first challenge is
access.**

Cribl did not begin with a vision of building another SIEM, observability platform,
or analytics solution. We started with a simpler problem: helping organizations
control and unlock the value of their telemetry. Solving it required collection,
routing, transformation, governance, storage, federation, search, and access — and
what emerged was larger than a pipeline or a collection of products. We realized
the industry had spent twenty years accidentally rebuilding the same telemetry
infrastructure over and over. **We are not building another solution. We are
providing the shared telemetry infrastructure that every solution needs.**

Today, **Cribl, the AI Platform for Telemetry**, connects people, applications,
and agents to IT and Security data wherever it resides. Powered by the **Data
Engine for IT and Security**, Cribl enables organizations to collect, manage,
govern, access, and act on telemetry at AI scale. Some experiences will be built by
Cribl; others by partners, customers, and AI itself. All of them depend on the same
telemetry platform.

The market is just now realizing it needs a telemetry platform. **Cribl already
has one.**

---

*Positioning standardized on the **executive summary** (the "In Cribl's words"
block above), with the **technical narrative**'s insight — the industry
accidentally rebuilding the same telemetry infrastructure, and separating
infrastructure from the apps that consume it — woven into the personal section.
Both source texts are preserved in `docs/CRIBL-POSITIONING.md`.*

### [TODO / fill-ins]
- **Verify capability names**: I named a few examples you called out (Insights,
  in-Stream detections, background detections, search), framed as "among many"
  with a docs.cribl.io pointer so it never reads as exhaustive. Please sanity-
  check the exact names/wording against docs.cribl.io and add/swap any you'd
  rather feature.
- **Tighten the open**: optional — cut straight to "The app was the easy part" as
  the very first line for a punchier CMO hook.
- **CTA**: where should readers go next (demo, the platform page, a talk)?
- **Title**: current is "The App Was the Easy Part" (alts in chat).
