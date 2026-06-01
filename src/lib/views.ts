import type { ViewDef } from "@/lib/types";

// The "tabs". Each view is a configured surface over a collection: which
// columns to show, how to group, and the defaults for new rows. This is the
// thing teams will eventually customize per project.

const STAGES = ["Planning", "Recommendations Created", "With Marketing Strat", "Complete"];

export const VIEWS: ViewDef[] = [
  {
    id: "content",
    label: "Content Pipeline",
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
    id: "okr",
    label: "OKRs",
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
