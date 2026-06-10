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

For twenty years, every major IT and Security category was built around an
*application* — observability, SIEM, APM — and each one built its own telemetry
pipeline, its own data store, its own schema and access model. Duplicated data,
duplicated infrastructure, duplicated cost.

AI breaks that model, because **an AI agent doesn't care which application
generated the data — it cares about governed access to the data itself.** The
future won't be built around individual applications. It'll be built around the
telemetry platform they all share.

That's the platform I *wish* I'd had for my little app — and it's exactly what
Cribl is building for IT and Security. Remember the hosting realization: the
valuable thing isn't a place to run code, it's a place to run code that's
*already wired into identity, access control, and your data.* That is the
shape of what Cribl provides for telemetry experiences:

- **A governed home for the experiences themselves** — not just "a server," but a
  place to run apps and agents that's already connected to access control and the
  data, so every new experience isn't a from-scratch security project.
- **RBAC and governance baked in**, so the right people — and the right agents —
  get the right access by default.
- **A robust engine with access to the data wherever it lives** — both telemetry
  stored with Cribl and **federated** across the other tools, stores, and
  databases it already sits in.

Here's the kicker for the AI era: **AI cannot reason over data it cannot
access.** As agents move into IT and Security — AI SOC, agentic operations, agent
governance, LLM observability — they become first-class *consumers* of telemetry.
They don't want a copy of the data or yet another integration; they want
governed, scoped access to the data wherever it already lives. So the first
challenge isn't centralizing everything. **The first challenge is access.**

There's a clean analogy for what this kind of platform really is. AWS doesn't
sell Netflix — AWS sells the platform that lets Netflix exist. I built a "Netflix"
(a very small one, for my marketing team). What I kept wishing for was the "AWS"
underneath it: the governed place for my experience to live and reach its data.
For IT and Security telemetry, **Cribl is that platform.**

---

**Cribl: The AI Platform for Telemetry**

For decades, IT and Security have been organized around applications —
observability platforms, SIEMs, APM tools, analytics platforms, and countless
custom solutions — each building its own telemetry infrastructure, data stores,
schemas, and workflows. More tools meant more silos, more integrations, more
cost.

The AI era changes the model. AI agents don't care which application generated
the data; they care about access to the data itself. Telemetry becomes the
critical raw material that powers people, applications, and agents alike — and the
future gets built around platforms that make telemetry accessible, usable, and
actionable wherever it lives.

**Every IT and Security experience of the next decade will be built on a
telemetry platform** — security, observability, analytics, automation, AI
visibility, AI SOC, agentic operations, and applications we haven't imagined yet.
Different experiences, same platform.

And telemetry needs its *own* platform. General-purpose data platforms
(Snowflake, Databricks) aren't going anywhere for business data — but telemetry's
volume, velocity, variety, and economics are a different beast. It's often
collected before anyone knows whether it will ever be needed, so organizations
can't predict which telemetry will matter. They need access to all of it.
Telemetry doesn't replace the data platform; it creates the need for a telemetry
platform.

Cribl didn't set out to build another SIEM or observability tool. We started with
a simpler problem — helping organizations control and unlock the value of their
telemetry — and solving it required collection, routing, transformation,
governance, storage, federation, search, and access. What emerged was larger than
a pipeline or a set of products: **we built a platform.**

Today, **Cribl, the AI Platform for Telemetry**, connects people, applications,
and agents to IT and Security data wherever it resides. Powered by the **Data
Engine for IT and Security**, it lets organizations collect, manage, govern,
access, and act on their data at AI scale. Some experiences will be built by
Cribl, some by partners, some by customers — and many generated dynamically by AI.
All of them depend on the same platform to access and act on telemetry.

The result is choice, control, and flexibility: adopt the best technologies you
need today, and keep the freedom to embrace whatever comes next.

The market is just now realizing it needs a telemetry platform. **Cribl already
has one.**

---

*Positioning now reflects the refined narrative + messaging pillars (Access
Before Centralization; Telemetry Platform for the AI Era; Choice/Control/
Flexibility) and the AWS/EC2 analogy from your strategy doc.*

### [TODO / fill-ins]
- **Proof points / products**: if you want concrete name-drops (Stream, Edge,
  Search, Lake) under "collection, routing, … federation, search, access," tell
  me which to feature and I'll slot them in.
- **Tighten the open**: optional — cut straight to "The app was the easy part" as
  the very first line for a punchier CMO hook.
- **CTA**: where should readers go next (demo, the platform page, a talk)?
- **Title**: current is "The App Was the Easy Part" (alts in chat).
