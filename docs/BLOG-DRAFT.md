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
- **Where does it run?** I had to pick somewhere to host it (**Vercel**), stand
  up a project, and wire up deploys.
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
Cribl is building for IT and Security: the place to host experiences, the
governance and access control baked in, and a robust engine with access to data
both stored with Cribl and **federated** across the other tools and stores where
it already lives. [TODO: agentic telemetry positioning — drop in the
agent-access / "agents as first-class consumers of telemetry" framing here.]

---

*The rest of this section is your existing positioning, lightly teed up by the
story above:*

For the last twenty years, every major IT and Security category has been built
around an application. Observability platforms collected telemetry to power
observability. SIEMs collected telemetry to power security analytics. APM
platforms collected telemetry to understand application performance. Each
application built its own telemetry infrastructure, its own data store, its own
schema, workflows, and user experience. As a result, organizations duplicated
data, infrastructure, integrations, and costs.

The AI era changes this model. AI agents do not care which application generated
the data. They care about access to the data itself. As organizations deploy AI
across IT and Security, telemetry becomes the common foundation that powers
people, applications, and agents alike.

The future will not be built around individual applications. It will be built
around telemetry platforms. Some experiences will be built by vendors, some by
partners, some by customers — and many will be generated dynamically by AI. But
all of them will require access to the same underlying telemetry.

Cribl is building that platform. **Cribl, the AI Platform for Telemetry,**
connects people, applications, and agents to IT and Security data wherever it
resides. Powered by the **Data Engine for IT and Security**, Cribl provides the
universal telemetry layer that enables organizations to collect, manage, govern,
access, and act on their data at AI scale.

Security, observability, analytics, automation, and future applications are no
longer separate destinations. They are experiences built on a common telemetry
foundation.

---

### [TODO / fill-ins]
- **Agentic telemetry**: the specifics you're working through — how agents get
  scoped, governed access; what makes Cribl the safe substrate for autonomous
  consumers of telemetry.
- **Proof points / products**: name-drop the relevant Cribl pieces (Stream,
  Edge, Search, Lake, federation) where they reinforce the "host + govern +
  access, stored *and* federated" claim.
- **Tighten the open**: if you want it punchier for a CMO audience, we can cut
  straight to "The app was the easy part" as the first line.
- **CTA**: where do you want readers to go next?
