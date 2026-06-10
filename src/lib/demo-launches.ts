import type { ColumnDef, FieldValue, ViewDef } from "@/lib/types";

// Three demo launch boards, built from prior project-management spreadsheets
// (Cribl Search, Fall '25 / CriblCon, and FedRAMP). These power the demo: the
// data here is created as real Jira issues in MW via POST /api/import, and is
// also used to seed the mock adapter for local dev.

const STATUS_OPTIONS = [
  "Not Started",
  "Scheduled",
  "Ongoing",
  "In Progress - On Track",
  "In Progress - Review",
  "At Risk",
  "Blocked",
  "Completed",
];

const LAUNCH_COLUMNS: ColumnDef[] = [
  { key: "jiraKey", label: "Jira", type: "jira", width: 110, readOnly: true },
  { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS, width: 175 },
  { key: "deliverable", label: "Deliverable", type: "longtext", width: 340 },
  { key: "responsible", label: "Owner", type: "person", width: 170 },
  { key: "dependency", label: "Dependency / Callout", type: "longtext", width: 240 },
  { key: "links", label: "Relevant Links", type: "text", width: 200 },
  { key: "startDate", label: "Start", type: "text", width: 110 },
  { key: "finalDate", label: "Final / Due", type: "text", width: 120 },
];

export const LAUNCH_DEMO_VIEWS: ViewDef[] = [
  {
    id: "launchSearch",
    label: "🔍 Cribl Search",
    collection: "launchSearch",
    description:
      "GTM launch workback for Cribl Search — deliverables by phase, imported from the launch tracker.",
    groupBy: "phase",
    defaults: { status: "Not Started" },
    summary: true,
    columns: LAUNCH_COLUMNS,
  },
  {
    id: "launchFall",
    label: "🍂 Fall ’25 / CriblCon",
    collection: "launchFall",
    description:
      "Cribl Fall 2025 launch + CriblCon, including the cribl.io → cribl.ai (TLD) migration tasks.",
    groupBy: "phase",
    defaults: { status: "Not Started" },
    summary: true,
    columns: LAUNCH_COLUMNS,
  },
  {
    id: "launchFedramp",
    label: "🏛 FedRAMP",
    collection: "launchFedramp",
    description:
      "FedRAMP / Cribl.Cloud Government launch — from the In-Process listing through ATO.",
    groupBy: "phase",
    defaults: { status: "Not Started" },
    summary: true,
    columns: LAUNCH_COLUMNS,
  },
];

type Row = { [key: string]: FieldValue };

export const LAUNCH_DEMO_DATA: { [collection: string]: Row[] } = {
  // Seeds the "Launch Plan" board (the automation showcase). Includes a Webinar
  // deliverable so the ⚡ "Open tickets" cross-team workflow can be demoed live.
  launch: [
    { phase: "Phase 3 — GTM Launch Rollout", status: "Completed", deliverable: "Release Blog", moment: "GA", responsible: "Felicia Dorng", finalDate: "Wed, Mar. 11" },
    { phase: "Phase 3 — GTM Launch Rollout", status: "Completed", deliverable: "PR Final + Go Live", moment: "GA", responsible: "Rachael King", finalDate: "Wed, Mar. 11" },
    { phase: "Phase 3 — GTM Launch Rollout", status: "In Progress - On Track", deliverable: "Social Assets", moment: "GA", responsible: "Hannah Inman", finalDate: "Wed, Mar. 11" },
    { phase: "Phase 4 — Post-Launch Optimization & Expansion", status: "Not Started", deliverable: "Customer Webinar — Q3 Search Deep Dive", workType: "Webinar", moment: "Post Launch", responsible: "Sabrina Schipper", dependency: "Set status to Scheduled to open the cross-team tickets", startDate: "Mon, Jul. 6", finalDate: "Wed, Jul. 22" },
    { phase: "Phase 4 — Post-Launch Optimization & Expansion", status: "Not Started", deliverable: "BOFU Demo Video", moment: "Post Launch", responsible: "Felicia Dorng", finalDate: "Tue, Apr. 14" },
  ],

  launchSearch: [
    { phase: "Phase 0 — GTM Planning & Alignment", status: "Completed", deliverable: "Pre-Planning", responsible: "Gabby Zurita", startDate: "Mon, Nov. 24", finalDate: "Fri, Dec. 19" },
    { phase: "Phase 0 — GTM Planning & Alignment", status: "Completed", deliverable: "GTM Motion Definition", responsible: "Chris Hayward", startDate: "Mon, Nov. 24", finalDate: "Fri, Dec. 19" },
    { phase: "Phase 0 — GTM Planning & Alignment", status: "Ongoing", deliverable: "Messaging Brief - Product", responsible: "Alexandra Gates", dependency: "Includes use cases", startDate: "Tue, Dec. 2", finalDate: "Fri, Jan. 16" },
    { phase: "Phase 1 — Message Validation & Early Readiness", status: "Completed", deliverable: "ICP Build - Product", responsible: "Felicia Dorng Rachael Dula", startDate: "Wed, Jan. 14", finalDate: "Fri, Feb. 20" },
    { phase: "Phase 1 — Message Validation & Early Readiness", status: "Ongoing", deliverable: "Internal FAQ v1", responsible: "Felicia Dorng", dependency: "Ready for Feb. 5 Pit Stop", finalDate: "Tue, Feb. 3" },
    { phase: "Phase 1 — Message Validation & Early Readiness", status: "Completed", deliverable: "One-Pager (CKO pre-read)", responsible: "Felicia Dorng", startDate: "Mon, Jan. 12", finalDate: "Tue, Feb. 3" },
    { phase: "Phase 2 — Market Momentum & Field Activation", status: "Completed", deliverable: "Momentum PR", responsible: "Rachael King", startDate: "Wed, Jan. 28", finalDate: "Wed, Feb. 11" },
    { phase: "Phase 2 — Market Momentum & Field Activation", status: "Completed", deliverable: "Live CKO Demo", responsible: "Nick Heudecker", finalDate: "Wed, Feb. 11" },
    { phase: "Phase 2 — Market Momentum & Field Activation", status: "Completed", deliverable: "Feb. 26 Pit Stop: Enablement deck", responsible: "Rachael Dula", startDate: "Thu, Feb. 5", finalDate: "Thu, Feb. 26" },
    { phase: "Phase 2 — Market Momentum & Field Activation", status: "Completed", deliverable: "Partner FAQ (Reseller + Alliances)", responsible: "Alyssa Houk Emily Walters", finalDate: "Thu, Mar. 12" },
    { phase: "Phase 2 — Market Momentum & Field Activation", status: "Completed", deliverable: "Search Product Pitch Deck", responsible: "Felicia Dorng", finalDate: "Tue, Mar. 3" },
    { phase: "Phase 3 — GTM Launch Rollout", status: "Completed", deliverable: "PR Final + Go Live", responsible: "Rachael King", startDate: "Mon, Mar. 9", finalDate: "Wed, Mar. 11" },
    { phase: "Phase 3 — GTM Launch Rollout", status: "Completed", deliverable: "Release Blog", responsible: "Felicia Dorng", links: "Reintroducing Cribl Search", finalDate: "Wed, Mar. 11" },
    { phase: "Phase 3 — GTM Launch Rollout", status: "Completed", deliverable: "What's New Blog", responsible: "Aren Gates", finalDate: "Wed, Mar. 11" },
    { phase: "Phase 3 — GTM Launch Rollout", status: "Completed", deliverable: "Web Updates", responsible: "Felicia Dorng Bill Emmett", links: "WEB-922", finalDate: "Wed, Mar. 11" },
    { phase: "Phase 3 — GTM Launch Rollout", status: "Completed", deliverable: "Social Assets", responsible: "Hannah Inman", finalDate: "Wed, Mar. 11" },
    { phase: "Phase 3 — GTM Launch Rollout", status: "Completed", deliverable: "What's New Webinar Live", responsible: "Sabrina Schipper", finalDate: "Tue, Mar. 24" },
    { phase: "Phase 3 — GTM Launch Rollout", status: "In Progress - Review", deliverable: "Search Copilot Description Update", responsible: "Felicia Dorng", finalDate: "Wed, Mar. 11" },
    { phase: "Phase 4 — Post-Launch Optimization & Expansion", status: "Not Started", deliverable: "BOFU Demo Video", responsible: "Felicia Dorng", startDate: "Tue, Mar. 31", finalDate: "Tue, Apr. 14" },
    { phase: "Phase 4 — Post-Launch Optimization & Expansion", status: "In Progress - On Track", deliverable: "PMM Search Content Audit", responsible: "Felicia Dorng", startDate: "Thu, Mar. 19", finalDate: "Thu, Apr. 2" },
  ],

  launchFall: [
    { phase: "Phase 1 — Planning & Messaging", status: "Completed", deliverable: "Launch Kickoff Day", responsible: "Gabby Zurita", finalDate: "Thu, Aug. 28" },
    { phase: "Phase 1 — Planning & Messaging", status: "Completed", deliverable: "Positioning & Messaging (Guard, BYOS S3, Notebooks, Outpost, Agentic)", responsible: "Holly", startDate: "Mon, Jul. 7", finalDate: "Wed, Aug. 6" },
    { phase: "Phase 2 — Content & Assets", status: "Completed", deliverable: "Release Blogs", responsible: "Aren Gates", finalDate: "Tue, Oct. 14" },
    { phase: "Phase 2 — Content & Assets", status: "Completed", deliverable: "Press Release", responsible: "Rachael King", finalDate: "Tue, Oct. 14" },
    { phase: "Phase 2 — Content & Assets", status: "Completed", deliverable: "Social Assets", responsible: "Hannah Inman", finalDate: "Tue, Oct. 14" },
    { phase: "Phase 2 — Content & Assets", status: "Completed", deliverable: "CriblCon Keynote Demo", responsible: "Nick Heudecker", finalDate: "Mon, Oct. 13" },
    { phase: "Phase 3 — CriblCon & GA", status: "Completed", deliverable: "GA Part 1 [2509]", responsible: "", finalDate: "Wed, Sep. 17" },
    { phase: "Phase 3 — CriblCon & GA", status: "Completed", deliverable: "CriblCon Event", responsible: "", startDate: "Mon, Oct. 13", finalDate: "Wed, Oct. 15" },
    { phase: "Phase 3 — CriblCon & GA", status: "Completed", deliverable: "Launch Announcement", responsible: "Mike Ferris", finalDate: "Tue, Oct. 14" },
    { phase: "Phase 3 — CriblCon & GA", status: "Completed", deliverable: "GA Part 2 [2510]", responsible: "", finalDate: "Wed, Oct. 22" },
    { phase: "Phase 3 — CriblCon & GA", status: "Completed", deliverable: "Customer Webinar", responsible: "Sabrina Schipper", finalDate: "Wed, Nov. 5" },
    { phase: "Phase 4 — TLD Migration (cribl.io → cribl.ai)", status: "Completed", deliverable: "Update navigation and footer links on cribl.ai", responsible: "Mickey Hsieh", finalDate: "Wed, Oct. 8" },
    { phase: "Phase 4 — TLD Migration (cribl.io → cribl.ai)", status: "Not Started", deliverable: "Re-submit sitemaps/robots.txt to Google and Bing", responsible: "Nate Kearse", finalDate: "Wed, Oct. 8" },
    { phase: "Phase 4 — TLD Migration (cribl.io → cribl.ai)", status: "Not Started", deliverable: "Validate GTM is firing on .ai", responsible: "Alex Romano", finalDate: "Wed, Oct. 8" },
    { phase: "Phase 4 — TLD Migration (cribl.io → cribl.ai)", status: "Not Started", deliverable: "Validate data is flowing into GA4", responsible: "Alex Romano", finalDate: "Wed, Oct. 8" },
    { phase: "Phase 4 — TLD Migration (cribl.io → cribl.ai)", status: "Not Started", deliverable: "Update Outreach content with cribl.ai links", responsible: "Connor Loudon", finalDate: "Wed, Oct. 8" },
    { phase: "Phase 4 — TLD Migration (cribl.io → cribl.ai)", status: "Not Started", deliverable: "Update links in Nurture / welcome emails", responsible: "Daniela Puizina", finalDate: "Wed, Oct. 8" },
    { phase: "Phase 5 — Post-Launch", status: "Not Started", deliverable: "Recrawl the site; log any P0 issues", responsible: "Nate Kearse", dependency: "After TLD cutover" },
    { phase: "Phase 5 — Post-Launch", status: "Completed", deliverable: "Field Enablement (CriblCon)", responsible: "Michael Donnelly", finalDate: "Thu, Oct. 2" },
  ],

  launchFedramp: [
    { phase: "Phase 1 — In-Process Listing", status: "Completed", deliverable: "Develop Launch Strategy & Overview Deck", responsible: "Gabby Zurita", startDate: "Wed, Jun. 18", finalDate: "Mon, Jun. 30" },
    { phase: "Phase 1 — In-Process Listing", status: "Completed", deliverable: "Positioning & Messaging", responsible: "Holly", startDate: "Mon, Jul. 7", finalDate: "Wed, Aug. 6" },
    { phase: "Phase 1 — In-Process Listing", status: "Completed", deliverable: "Blog", responsible: "Andy", finalDate: "Mon, Aug. 11" },
    { phase: "Phase 1 — In-Process Listing", status: "Completed", deliverable: "One-Pager", responsible: "Holly", finalDate: "Mon, Aug. 11" },
    { phase: "Phase 1 — In-Process Listing", status: "Completed", deliverable: "New Federal Industries Page", responsible: "Holly", finalDate: "Mon, Aug. 11" },
    { phase: "Phase 1 — In-Process Listing", status: "Completed", deliverable: "Press Release – Draft", responsible: "Mike Ferris Rachael King", startDate: "Mon, Jul. 21", finalDate: "Fri, Jul. 25" },
    { phase: "Phase 1 — In-Process Listing", status: "Completed", deliverable: "Analyst Briefing Slideware", responsible: "Nick Heudecker Holly", finalDate: "Tue, Aug. 19" },
    { phase: "Phase 1 — In-Process Listing", status: "Completed", deliverable: "Employee Announcement (Slack/email)", responsible: "Mike Ferris", finalDate: "Mon, Aug. 11" },
    { phase: "Phase 1 — In-Process Listing", status: "Ongoing", deliverable: "Create Campaign in a Box", responsible: "", dependency: "Informed: Enablement", finalDate: "Mon, Aug. 11" },
    { phase: "Phase 1 — In-Process Listing", status: "Completed", deliverable: "Internal FAQ", responsible: "Michael Donnelly", finalDate: "Mon, Aug. 11" },
    { phase: "Phase 1 — In-Process Listing", status: "Ongoing", deliverable: "Create “Federal Hub” in Seismic", responsible: "Rachael Dula", finalDate: "Wed, Aug. 20" },
    { phase: "Phase 1 — In-Process Listing", status: "Completed", deliverable: "Partner Newsletter (August)", responsible: "Yael", finalDate: "Thu, Aug. 21" },
    { phase: "Phase 1 — In-Process Listing", status: "Completed", deliverable: "Track KPIs", responsible: "Gabby Zurita", finalDate: "Wed, Oct. 22" },
    { phase: "Phase 2 — ATO (Authority to Operate)", status: "Ongoing", deliverable: "Refine Positioning & Messaging", responsible: "Holly", startDate: "Wed, Oct. 1", finalDate: "Fri, Oct. 10" },
    { phase: "Phase 2 — ATO (Authority to Operate)", status: "Completed", deliverable: "Fed Corporate Overview Updates", responsible: "Holly", finalDate: "Thu, Nov. 20" },
    { phase: "Phase 2 — ATO (Authority to Operate)", status: "Not Started", deliverable: "Customer Proof-Points / Quote", responsible: "Andy", startDate: "TBC" },
    { phase: "Phase 2 — ATO (Authority to Operate)", status: "Completed", deliverable: "Trust Homepage — above-the-fold banner", responsible: "Holly Jon", finalDate: "Thu, Nov. 20" },
    { phase: "Phase 2 — ATO (Authority to Operate)", status: "Completed", deliverable: "Press Release – PR Go-Live", responsible: "Mike Ferris", finalDate: "Thu, Nov. 20" },
    { phase: "Phase 2 — ATO (Authority to Operate)", status: "Completed", deliverable: "Prospect + Customer Comms", responsible: "Ashley Garza Holly", finalDate: "Wed, Dec. 3" },
    { phase: "Phase 2 — ATO (Authority to Operate)", status: "Completed", deliverable: "Full GTM Enablement — Live Session", responsible: "Jenn K", finalDate: "Thu, Dec. 4" },
    { phase: "Phase 2 — ATO (Authority to Operate)", status: "Completed", deliverable: "Partner On-Demand Enablement Video", responsible: "Yael Holly", finalDate: "Wed, Oct. 29" },
    { phase: "Phase 2 — ATO (Authority to Operate)", status: "Completed", deliverable: "ATO Obtained 🎉", responsible: "Gabby Zurita", finalDate: "Thu, Jan. 29" },
  ],
};

export const LAUNCH_DEMO_COLLECTIONS = Object.keys(LAUNCH_DEMO_DATA);
