import type { CollectionId, Record } from "@/lib/types";
import type { DataAdapter } from "@/lib/adapters/types";

// Workflow automation engine — playbooks.
//
// A playbook encodes a runbook (e.g. the Demand Gen Webinar Process) as a set
// of STAGES. Each stage fires when a deliverable of the given work type enters
// a trigger status, opening pre-filled tickets in the relevant team projects —
// with the right assignees, a due-date hint, and a checklist of the real
// sub-steps from the runbook.
//
// Today this creates mock "tickets" records. With the Jira adapter live, each
// TicketDef becomes a POST /rest/api/3/issue into its project (assignees ->
// watchers/assignee, checklist -> description/sub-tasks), gated by a
// confirmation prompt.

export interface TicketDef {
  team: string;
  project: string; // Jira project key
  summary: string; // supports {deliverable}
  assignees?: string; // people (assignee / watchers)
  dueHint?: string; // timing relative to the live date
  checklist?: string[]; // key sub-steps from the runbook
}

export interface PlaybookStage {
  triggerStatus: string;
  tickets: TicketDef[];
}

export interface Playbook {
  workType: string;
  stages: PlaybookStage[];
}

// Derived directly from the Demand Gen Webinar Process Document.
export const PLAYBOOKS: { [workType: string]: Playbook } = {
  Webinar: {
    workType: "Webinar",
    stages: [
      {
        triggerStatus: "Scheduled",
        tickets: [
          {
            team: "Demand Gen",
            project: "WEBINAR",
            summary: "Webinar setup & event ops — {deliverable}",
            assignees: "Demand Gen",
            dueHint: "Abstract due 3.5 weeks before live; Wed 10 AM PT slot",
            checklist: [
              "Finalize date/time & confirm speaker + abstract",
              "Create Zoom (FY24 template, auto-approve registration)",
              "Set reminders 1 day + 1 hour before; add panelists day prior",
              "Schedule dry run; collect 1–5 seed poll questions",
              "Write live intro/outro script; add SFDC campaign description",
            ],
          },
          {
            team: "Design",
            project: "DESIGN",
            summary: "Creative assets package — {deliverable}",
            assignees: "Kaycee Carmichael Chiu Hannah Inman Mickey Hsieh",
            dueHint: "Open ASAP after abstract; ~1 week creative turnaround",
            checklist: [
              "Marketo eblast header (580x250)",
              "Landing page headers — desktop (1798x360) + mobile",
              "OpenGraph image (1920x1080)",
              "Organic social assets (1200x1200)",
              "Website banner (355x185)",
              "BrightTalk tile (640x360) + PathFactory tile (500x374)",
              "Partner portal image (800x500)",
            ],
          },
          {
            team: "Marketing Ops",
            project: "MOPS",
            summary: "Demand Gen {deliverable} — Marketo Program Build",
            assignees: "Marketing Ops",
            dueHint: "Promo emails 2 weeks / 1 week / 1 day prior",
            checklist: [
              "Build Marketo campaign + landing page from abstract",
              "Schedule promo emails (2wk / 1wk / 1day); create audience & QA",
              "Reg UTMs: RSM, BDR, Partner-Portal, Channel, Website, Social (LI)",
              "PathFactory post-event content program",
              "BrightTalk webinar syndication program",
            ],
          },
          {
            team: "Content / Social",
            project: "SOCIAL",
            summary: "Promote {deliverable} — organic + field",
            assignees: "Hannah Inman Marie Hill",
            dueHint: "As soon as the registration page is live",
            checklist: [
              "Organic social once banners are ready (Hannah)",
              "Send details + UTMs to Field Channel Marketing (Marie Hill's team)",
              "Add to Marketing Events + Webinar calendars",
              "Federal webinars: vet with Karen Borosky before scheduling",
            ],
          },
        ],
      },
      {
        triggerStatus: "Completed",
        tickets: [
          {
            team: "Demand Gen",
            project: "WEBINAR",
            summary: "Post-event wrap-up — {deliverable}",
            assignees: "Demand Gen Mickey Hsieh",
            dueHint: "Report within 1–2 hours of the event",
            checklist: [
              "Send recording to Prime Image (Rachel/Ben) to edit",
              "CC Bradley → Vimeo embed → add to follow-up email ticket",
              "Mickey posts recording on-demand to website",
              "Post-event report to sales/SE/BDR/marketing DLs",
              "Run SFDC attended report; flag demo requests",
              "Post on-demand to BrightTalk; add to Sales Newsletter",
            ],
          },
        ],
      },
    ],
  },
};

function ticketKey(project: string): string {
  return `${project}-${1000 + Math.floor(Math.random() * 9000)}`;
}

const splitCsv = (v: unknown) =>
  String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// Called after a deliverable is updated. Fires the stage matching the new
// status (once). Returns the updated record plus any tickets opened.
export async function runPlaybooks(
  adapter: DataAdapter,
  collection: CollectionId,
  record: Record
): Promise<{ record: Record; created: { key: string; team: string }[]; stage: string | null }> {
  const noop = { record, created: [] as { key: string; team: string }[], stage: null };
  if (collection !== "launch") return noop;

  const pb = PLAYBOOKS[String(record.fields.workType ?? "")];
  if (!pb) return noop;

  const status = String(record.fields.status ?? "");
  const stage = pb.stages.find((s) => s.triggerStatus === status);
  if (!stage) return noop;

  const fired = splitCsv(record.fields.firedStages);
  if (fired.includes(status)) return noop; // already fired this stage

  const deliverable = String(record.fields.deliverable ?? "this item");
  const created: { key: string; team: string }[] = [];

  for (const def of stage.tickets) {
    const key = ticketKey(def.project);
    await adapter.create("tickets", {
      key,
      summary: def.summary.replace("{deliverable}", deliverable),
      team: def.team,
      project: def.project,
      status: "To Do",
      assignee: def.assignees ?? "",
      due: def.dueHint ?? "",
      details: (def.checklist ?? []).join(" • "),
      sourceDeliverable: deliverable,
    });
    created.push({ key, team: def.team });
  }

  const prevAuto = String(record.fields.autoTickets ?? "");
  const updated = await adapter.update("launch", record.id, {
    firedStages: [...fired, status].join(","),
    autoTickets: [prevAuto, created.map((c) => c.key).join(", ")].filter(Boolean).join(", "),
  });

  return { record: updated, created, stage: status };
}
