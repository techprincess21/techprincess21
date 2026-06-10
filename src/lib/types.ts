// Domain model for the spreadsheet frontend.
//
// Everything is modeled as a generic `Record` that belongs to a `collection`.
// This keeps the storage layer agnostic to the specific shape of each tab and,
// crucially, maps cleanly onto Jira later: a collection corresponds to a Jira
// project + issue type, and a record's `fields` map onto Jira fields.

export type CollectionId =
  | "content" // the content-pipeline tab (the team's primary working surface)
  | "launch" // product/feature launch tracker (a second template on the same engine)
  | "tickets" // cross-team tickets opened by workflow automations
  | "launchSearch" // demo launch board — Cribl Search
  | "launchFall" // demo launch board — Fall '25 / CriblCon
  | "launchFedramp" // demo launch board — FedRAMP / Cribl.Cloud Government
  | "okr" // objectives & key results
  | "quarterPlan" // quarter x owner planning grid
  | "topicOwners"; // topic -> primary/secondary PMM ownership

export type FieldValue = string | number | null;

export interface Record {
  id: string;
  // For records that originate from / sync to Jira, this is the issue key
  // (e.g. "WEB-1022"). Null for records that only live in the app for now.
  jiraKey?: string | null;
  fields: { [key: string]: FieldValue };
}

export type ColumnType =
  | "text"
  | "longtext"
  | "number"
  | "select"
  | "url"
  | "jira"
  | "person"
  | "automation";

export interface ColumnDef {
  key: string;
  label: string;
  type: ColumnType;
  options?: string[]; // for `select`
  width?: number; // px hint
  readOnly?: boolean;
}

export interface ViewDef {
  id: string;
  label: string;
  collection: CollectionId;
  description?: string;
  columns: ColumnDef[];
  // Optional column key to group rows by (renders grouped sections, like the
  // sheet's stage swimlanes).
  groupBy?: string;
  // Default field values applied when adding a new row in this view.
  defaults?: { [key: string]: FieldValue };
  // Optional link to child records (e.g. tickets opened by automations) that can
  // be expanded inline beneath each row.
  childLink?: { collection: CollectionId; parentField: string; childField: string };
  // Hide this board's tab (kept in the app, just not shown — e.g. boards with no
  // data for a given demo).
  hidden?: boolean;
}
