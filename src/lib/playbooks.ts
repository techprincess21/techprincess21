import type { Record } from "@/lib/types";
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
            team: "Design",
            project: "DESIGN",
            summary: "Creative assets package — {deliverable}",
            assignees: "Kaycee Carmichael Chiu Hannah Inman",
            dueHint: "Open ASAP after abstract; ~1 week creative turnaround",
            checklist: [
              "Marketo eblast header (580x250)",
              "Landing page headers — desktop (1798x360) + mobile",
              "OpenGraph image (1920x1080)",
              "Organic social assets (1200x1200)",
              "Website banner (355x185)",
              "BrightTalk tile (640x360) + PathFactory tile (500x374)",
            ],
          },
          {
            team: "Marketing Ops",
            project: "MOPSTICKET",
            summary: "Demand Gen {deliverable} — Marketo Program Build",
            assignees: "Kylie Higgins",
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
            project: "SM",
            summary: "Promote {deliverable} — organic + field",
            assignees: "Hannah Inman",
            dueHint: "As soon as the registration page is live",
            checklist: [
              "Organic social once banners are ready",
              "Send details + UTMs to Field Channel Marketing",
              "Add to Marketing Events + Webinar calendars",
            ],
          },
        ],
      },
    ],
  },
};

// Apply per-board automation overrides (target project + assignees per team)
// from the Automations builder, on top of the code-defined playbook.
export type PlaybookOverrides = {
  [workType: string]: { [team: string]: { project?: string; assignees?: string } };
};

export function applyOverrides(pb: Playbook, overrides?: PlaybookOverrides): Playbook {
  const o = overrides?.[pb.workType];
  if (!o) return pb;
  return {
    ...pb,
    stages: pb.stages.map((s) => ({
      ...s,
      tickets: s.tickets.map((t) => {
        const ov = o[t.team];
        return ov ? { ...t, project: ov.project || t.project, assignees: ov.assignees ?? t.assignees } : t;
      }),
    })),
  };
}

const splitStages = (v: unknown) =>
  String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// Pure: is there a stage to run right now for this deliverable? Returns the
// A user-defined automation stored in config (created in the Automations
// builder), plus helpers to combine built-in + custom playbooks.
export interface ConfigAutomation {
  id: string;
  workType: string;
  triggerStatus: string;
  tickets: TicketDef[];
}

function customToPlaybook(a: ConfigAutomation): Playbook {
  return { workType: a.workType, stages: [{ triggerStatus: a.triggerStatus, tickets: a.tickets }] };
}

// All effective playbooks: code-defined (with project/assignee overrides
// applied) plus user-created ones.
export function listPlaybooks(overrides?: PlaybookOverrides, custom?: ConfigAutomation[]): Playbook[] {
  const builtins = Object.values(PLAYBOOKS).map((p) => applyOverrides(p, overrides));
  return [...builtins, ...(custom ?? []).map(customToPlaybook)];
}

// stage + ticket count, or null. Used by the UI to decide whether to show the
// "Open tickets" button, and by the server to validate a run request.
export function eligibleStage(
  workType: unknown,
  status: unknown,
  firedStages: unknown,
  playbooks?: Playbook[]
): { triggerStatus: string; tickets: TicketDef[]; count: number } | null {
  const list = playbooks ?? Object.values(PLAYBOOKS);
  const fired = splitStages(firedStages);
  for (const pb of list) {
    if (pb.workType !== String(workType ?? "")) continue;
    const stage = pb.stages.find((s) => s.triggerStatus === String(status ?? ""));
    if (!stage || fired.includes(stage.triggerStatus)) continue;
    return { triggerStatus: stage.triggerStatus, tickets: stage.tickets, count: stage.tickets.length };
  }
  return null;
}

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
  collection: string,
  record: Record,
  overrides?: PlaybookOverrides,
  custom?: ConfigAutomation[]
): Promise<{ record: Record; created: { key: string; team: string }[]; stage: string | null }> {
  const noop = { record, created: [] as { key: string; team: string }[], stage: null };
  if (collection !== "launch") return noop;

  const workType = String(record.fields.workType ?? "");
  const status = String(record.fields.status ?? "");
  const stage = listPlaybooks(overrides, custom)
    .filter((pb) => pb.workType === workType)
    .flatMap((pb) => pb.stages)
    .find((s) => s.triggerStatus === status);
  if (!stage) return noop;

  const fired = splitCsv(record.fields.firedStages);
  if (fired.includes(status)) return noop; // already fired this stage

  const deliverable = String(record.fields.deliverable ?? "this item");
  const created: { key: string; team: string }[] = [];

  for (const def of stage.tickets) {
    // Create the cross-team ticket in its target project; the adapter returns
    // the real issue key (or a generated one in mock mode).
    const rec = await adapter.create("tickets", {
      summary: def.summary.replace("{deliverable}", deliverable),
      team: def.team,
      project: def.project,
      status: "To Do",
      assignee: def.assignees ?? "",
      due: def.dueHint ?? "",
      details: (def.checklist ?? []).join(" • "),
      sourceDeliverable: deliverable,
    });
    const key = rec.jiraKey || ticketKey(def.project);
    created.push({ key, team: def.team });
  }

  const prevAuto = String(record.fields.autoTickets ?? "");
  const updated = await adapter.update("launch", record.id, {
    firedStages: [...fired, status].join(","),
    autoTickets: [prevAuto, created.map((c) => c.key).join(", ")].filter(Boolean).join(", "),
  });

  return { record: updated, created, stage: status };
}
