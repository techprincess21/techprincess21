import { appendLog, readLog } from "@/lib/store";

// Audit trail. A durable, append-only record of who did what: sign-ins and the
// changes people make (access/roles, boards, automations, and item edits). Like
// the rest of the app's state it lives in the storage layer — so it is only
// durable when KV is configured (otherwise entries are lost on cold start, the
// same condition that makes added users vanish).

export type AuditType = "login" | "access" | "board" | "automation" | "data";

export interface AuditEvent {
  ts: number; // epoch ms
  type: AuditType;
  action: string; // machine-ish key, e.g. "user.add"
  summary: string; // human-readable sentence
  actorId: string; // email / user id
  actorName?: string;
  actorRole?: string;
}

const KEY = "audit";
const CAP = 1000;

export async function logAudit(e: Omit<AuditEvent, "ts">): Promise<void> {
  try {
    await appendLog(KEY, { ...e, ts: Date.now() }, CAP);
  } catch {
    // Auditing is best-effort; never let it break the underlying action.
  }
}

export async function getAudit(limit = 250): Promise<AuditEvent[]> {
  return readLog<AuditEvent>(KEY, limit);
}
