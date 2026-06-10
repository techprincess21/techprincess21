import type { ViewDef } from "@/lib/types";
import { LAUNCH_DEMO_VIEWS } from "@/lib/demo-launches";

// The "tabs". Each view is a configured surface over a collection: which
// columns to show, how to group, and the defaults for new rows. This is the
// thing teams will eventually customize per project.

const STAGES = ["Planning", "Recommendations Created", "With Marketing Strat", "Complete"];

export const VIEWS: ViewDef[] = [
  // Demo launch boards lead the tab bar (populated from prior launch sheets).
  ...LAUNCH_DEMO_VIEWS,
  {
    id: "content",
    label: "Content Pipeline",
    hidden: true,
    collection: "content",
    description:
      "Every content piece, grouped by workflow stage. Edits here are the ones that will write back to Jira.",
    groupBy: "stage",
    defaults: { stage: "Planning", status: "New", priorityLevel: "3. Low" },
    columns: [
      { key: "jiraKey", label: "Jira", type: "jira", width: 110, readOnly: true },
      { key: "targetPrompt", label: "Target Prompt", type: "longtext", width: 320 },
      { key: "keyword", label: "Keyword", type: "text", width: 180 },
      { key: "topic", label: "Topic", type: "text", width: 200 },
      { key: "subtopic", label: "Subtopic", type: "text", width: 160 },
      { key: "stage", label: "Stage", type: "select", options: STAGES, width: 180 },
      { key: "owner", label: "Owner", type: "person", width: 140 },
      { key: "type", label: "Type", type: "select", options: ["Core", "Campaign", "Visibility"], width: 120 },
      { key: "format", label: "Format", type: "select", options: ["Listicle", "Long Form", "Blog"], width: 120 },
      { key: "contentType", label: "Content", type: "select", options: ["Blog", "Resources"], width: 110 },
      { key: "quarter", label: "Qtr", type: "select", options: ["Q1", "Q2", "Q3", "Q4"], width: 80 },
      { key: "priorityLevel", label: "Priority", type: "select", options: ["1. High", "2. Medium", "3. Low"], width: 120 },
      { key: "priorityBucket", label: "Bucket", type: "select", options: ["Strategic", "Campaign", "Visibility"], width: 120 },
      { key: "searchType", label: "Search", type: "select", options: ["LLM", "Both", ""], width: 90 },
      { key: "volume", label: "Vol", type: "number", width: 70 },
      { key: "startMonth", label: "Start", type: "text", width: 90 },
      { key: "endMonth", label: "End", type: "text", width: 90 },
      { key: "publishedUrl", label: "Published URL", type: "url", width: 220 },
    ],
  },
  {
    id: "launch",
    label: "Launch Plan",
    collection: "launch",
    description:
      "The GTM launch workback tracker — deliverables grouped by phase, with launch-moment tags, the workback date schedule, and a Responsible owner. Same engine as the Content board, just a different column config.",
    groupBy: "phase",
    defaults: { status: "Not Started", phase: "Phase 1 — Message Validation & Early Readiness" },
    childLink: { collection: "tickets", parentField: "deliverable", childField: "sourceDeliverable" },
    summary: true,
    columns: [
      { key: "jiraKey", label: "Jira", type: "jira", width: 110, readOnly: true },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["Not Started", "Scheduled", "Ongoing", "In Progress - On Track", "In Progress - Review", "At Risk", "Blocked", "Completed"],
        width: 180,
      },
      { key: "deliverable", label: "Deliverable", type: "longtext", width: 300 },
      {
        key: "workType",
        label: "Work Type",
        type: "select",
        options: ["", "Webinar", "Blog", "Ad", "Email", "PR", "Enablement", "Social", "Web Page"],
        width: 130,
      },
      { key: "autoTickets", label: "Automation", type: "automation", width: 190 },
      {
        key: "moment",
        label: "LA | CKO | GA | Launch",
        type: "select",
        options: ["Pre-LA", "LA", "Pre-Launch", "LA > GA", "Pre-CKO", "CKO", "Post-CKO", "Pre-GA", "GA", "Launch", "Post Launch"],
        width: 130,
      },
      { key: "dependency", label: "Dependency / Callout", type: "longtext", width: 240 },
      { key: "links", label: "Relevant Links", type: "text", width: 200 },
      { key: "startDate", label: "Start Date", type: "text", width: 110 },
      { key: "draftDue", label: "Draft Due", type: "text", width: 110 },
      { key: "approvalsDue", label: "All Approvals Due", type: "text", width: 130 },
      { key: "intakeForm", label: "Submit Intake Form", type: "text", width: 140 },
      { key: "designComplete", label: "Design Complete", type: "text", width: 130 },
      { key: "webMopsComplete", label: "Web/MOPS Complete", type: "text", width: 150 },
      { key: "finalDate", label: "Final Post/Send", type: "text", width: 120 },
      { key: "responsible", label: "Responsible", type: "person", width: 170 },
    ],
  },
  {
    id: "automations",
    label: "⚡ Automations",
    collection: "tickets",
    description:
      "Define what happens automatically. Each automation says: for a work type, when it reaches a status, open these tickets in these teams' Jira projects. The tickets themselves appear under their deliverable on the board.",
    builder: true,
    columns: [],
  },
  {
    id: "okr",
    label: "OKRs",
    hidden: true,
    collection: "okr",
    description: "Objectives & key results with progress against target.",
    groupBy: "objective",
    defaults: { priority: "P1" },
    columns: [
      { key: "krNum", label: "KR #", type: "text", width: 70 },
      { key: "keyResult", label: "Key Result", type: "longtext", width: 380 },
      { key: "priority", label: "Priority", type: "select", options: ["P0", "P1", "P2"], width: 90 },
      { key: "owner", label: "Owner", type: "person", width: 140 },
      { key: "startValue", label: "Start", type: "number", width: 90 },
      { key: "targetValue", label: "Target", type: "number", width: 90 },
      { key: "expectedValue", label: "Expected", type: "number", width: 100 },
      { key: "actualValue", label: "Actual", type: "number", width: 90 },
      { key: "progress", label: "Progress", type: "text", width: 100 },
    ],
  },
  {
    id: "quarterPlan",
    label: "Quarterly Plan",
    hidden: true,
    collection: "quarterPlan",
    description: "What each owner is committed to per quarter.",
    groupBy: "quarter",
    defaults: { quarter: "Q1" },
    columns: [
      { key: "owner", label: "Owner", type: "person", width: 160 },
      { key: "item", label: "Committed Item", type: "longtext", width: 460 },
    ],
  },
  {
    id: "topicOwners",
    label: "Topic Owners",
    hidden: true,
    collection: "topicOwners",
    description: "Primary and secondary PMM ownership by content topic.",
    defaults: {},
    columns: [
      { key: "topic", label: "Content Topic", type: "text", width: 320 },
      { key: "primaryPMM", label: "Primary PMM", type: "person", width: 180 },
      { key: "secondaryPMM", label: "Secondary PMM", type: "person", width: 180 },
    ],
  },
];

export const VIEW_BY_ID = Object.fromEntries(VIEWS.map((v) => [v.id, v]));
