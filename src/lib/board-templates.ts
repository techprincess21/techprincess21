import type { ColumnDef, FieldValue } from "@/lib/types";

// Starting points for user-created boards. Each template is a column preset; a
// new board copies one of these, then can be customized like any other board.
export interface BoardTemplate {
  key: string;
  label: string;
  blurb: string;
  groupBy?: string;
  defaults?: { [key: string]: FieldValue };
  summary?: boolean;
  columns: ColumnDef[];
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    key: "simple",
    label: "Simple task board",
    blurb: "A clean to-do board: item, status, owner, due date, notes.",
    groupBy: "status",
    defaults: { status: "To Do" },
    columns: [
      { key: "title", label: "Item", type: "longtext", width: 340 },
      { key: "status", label: "Status", type: "select", options: ["To Do", "In Progress", "Blocked", "Done"], width: 160 },
      { key: "owner", label: "Owner", type: "person", width: 160 },
      { key: "dueDate", label: "Due", type: "date", width: 150 },
      { key: "notes", label: "Notes", type: "longtext", width: 300 },
    ],
  },
  {
    key: "launch",
    label: "Launch tracker",
    blurb: "GTM workback: deliverables grouped by phase, with owner and dates.",
    groupBy: "phase",
    defaults: { status: "Not Started", phase: "Phase 1 — Planning" },
    summary: true,
    columns: [
      { key: "status", label: "Status", type: "select", options: ["Not Started", "In Progress - On Track", "At Risk", "Blocked", "Completed"], width: 175 },
      { key: "deliverable", label: "Deliverable", type: "longtext", width: 340 },
      { key: "phase", label: "Phase", type: "text", width: 200 },
      { key: "responsible", label: "Owner", type: "person", width: 170 },
      { key: "dependency", label: "Dependency / Callout", type: "longtext", width: 240 },
      { key: "links", label: "Relevant Links", type: "text", width: 200 },
      { key: "startDate", label: "Start", type: "date", width: 150 },
      { key: "finalDate", label: "Final / Due", type: "date", width: 150 },
    ],
  },
  {
    key: "content",
    label: "Content pipeline",
    blurb: "Editorial board: piece, type, stage, owner, target date.",
    groupBy: "stage",
    defaults: { stage: "Planning" },
    columns: [
      { key: "title", label: "Title", type: "longtext", width: 320 },
      { key: "type", label: "Type", type: "select", options: ["Blog", "Listicle", "Long Form", "Resource"], width: 130 },
      { key: "stage", label: "Stage", type: "select", options: ["Planning", "Drafting", "In Review", "Complete"], width: 160 },
      { key: "owner", label: "Owner", type: "person", width: 160 },
      { key: "targetDate", label: "Target", type: "date", width: 150 },
      { key: "publishedUrl", label: "Published URL", type: "url", width: 220 },
    ],
  },
];

export const BOARD_TEMPLATE_BY_KEY = Object.fromEntries(BOARD_TEMPLATES.map((t) => [t.key, t]));
