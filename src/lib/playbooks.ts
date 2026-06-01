import type { CollectionId, Record } from "@/lib/types";
import type { DataAdapter } from "@/lib/adapters/types";

// Workflow automation engine.
//
// A "playbook" encodes a runbook like "how to set up a webinar": when a
// deliverable of a given work type reaches a trigger status, the app opens a
// set of tickets across the relevant team projects automatically — so the
// person running the launch doesn't have to know that a webinar needs a Design
// ticket + a MOPS campaign ticket + a Content/Social promo ticket.
//
// Today this creates mock "tickets" records. With the Jira adapter live, the
// exact same definitions become real POST /rest/api/3/issue calls into each
// team's project — no change to this file's shape.

export interface TicketDef {
  team: string; // human label shown in the UI
  project: string; // Jira project key the ticket would be created in
  summary: string; // supports {deliverable} substitution
}

export interface Playbook {
  workType: string;
  triggerStatus: string; // fire when the deliverable hits this status
  tickets: TicketDef[];
}

export const PLAYBOOKS: { [workType: string]: Playbook } = {
  Webinar: {
    workType: "Webinar",
    triggerStatus: "Scheduled",
    tickets: [
      { team: "Design", project: "DESIGN", summary: "Design assets & registration banners for {deliverable}" },
      { team: "Marketing Ops", project: "MOPS", summary: "Build campaign, registration page & nurture for {deliverable}" },
      { team: "Content / Social", project: "SOCIAL", summary: "Promote {deliverable} across social + blog" },
    ],
  },
};

function ticketKey(project: string): string {
  return `${project}-${1000 + Math.floor(Math.random() * 9000)}`;
}

// Called after a deliverable is updated. Returns the (possibly re-updated)
// record and any tickets that were opened. Idempotent: it won't fire twice for
// the same deliverable (guarded by the autoTickets field it writes back).
export async function runPlaybooks(
  adapter: DataAdapter,
  collection: CollectionId,
  record: Record
): Promise<{ record: Record; created: { key: string; team: string }[] }> {
  const noop = { record, created: [] as { key: string; team: string }[] };
  if (collection !== "launch") return noop;

  const workType = String(record.fields.workType ?? "");
  const pb = PLAYBOOKS[workType];
  if (!pb) return noop;
  if (String(record.fields.status ?? "") !== pb.triggerStatus) return noop;
  if (record.fields.autoTickets) return noop; // already fired

  const deliverable = String(record.fields.deliverable ?? "this item");
  const created: { key: string; team: string }[] = [];

  for (const def of pb.tickets) {
    const key = ticketKey(def.project);
    await adapter.create("tickets", {
      key,
      summary: def.summary.replace("{deliverable}", deliverable),
      team: def.team,
      project: def.project,
      status: "To Do",
      sourceDeliverable: deliverable,
    });
    created.push({ key, team: def.team });
  }

  const updated = await adapter.update("launch", record.id, {
    autoTickets: created.map((c) => c.key).join(", "),
  });

  return { record: updated, created };
}
