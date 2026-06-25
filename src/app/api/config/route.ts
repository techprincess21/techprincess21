import { NextResponse } from "next/server";
import {
  addAutomation,
  addClonedBoard,
  addCustomBoard,
  addUser,
  cloneBoardMembers,
  deleteAutomation,
  deleteCustomBoard,
  getConfig,
  removeBoardMember,
  removeUser,
  setBoardExclusion,
  setBoardMember,
  setBoardVisibility,
  setColumnOptions,
  setColumnOrder,
  setColor,
  setNotifyPref,
  setPeople,
  setPlaybookOverride,
  setRole,
  setTabOrder,
  setUserRole,
} from "@/lib/config-store";
import { can, getIdentity } from "@/lib/auth";
import { canManageBoardAccess } from "@/lib/board-access";
import { getAdapter } from "@/lib/adapters";
import { logAudit, type AuditType } from "@/lib/audit";

// Map an auditable config action to a human summary. Low-signal cosmetic actions
// (column options/order, tab order, colors, owner list, notify prefs) are not
// audited; access/board/automation changes are.
function summarizeConfigAction(body: { action?: string; [k: string]: unknown }):
  | { type: AuditType; action: string; summary: string }
  | null {
  const s = (v: unknown) => String(v ?? "");
  switch (body?.action) {
    case "role":
      return { type: "access", action: "role.update", summary: `Updated permissions for role “${s(body.role)}”` };
    case "userRole":
      return { type: "access", action: "user.role", summary: `Set ${s(body.userId)}'s role to ${s(body.role)}` };
    case "userAdd":
      return {
        type: "access",
        action: "user.add",
        summary: `Added ${s(body.name)}${body.email ? ` (${s(body.email)})` : ""}${body.role ? ` as ${s(body.role)}` : ""}`,
      };
    case "userRemove":
      return { type: "access", action: "user.remove", summary: `Removed ${s(body.id)} from the roster` };
    case "automationAdd":
      return { type: "automation", action: "automation.add", summary: `Added an automation` };
    case "automationDelete":
      return { type: "automation", action: "automation.delete", summary: `Deleted an automation` };
    case "playbook":
      return { type: "automation", action: "automation.override", summary: `Changed ${s(body.workType)} / ${s(body.team)} automation target` };
    case "boardCreate":
      return { type: "board", action: "board.create", summary: `Created board “${s(body.label)}”` };
    case "boardDuplicate":
      return { type: "board", action: "board.duplicate", summary: `Duplicated a board into “${s(body.label)}”` };
    case "boardDelete":
      return { type: "board", action: "board.delete", summary: `Deleted a board` };
    case "boardVisibility":
      return { type: "board", action: "board.visibility", summary: `Set a board to ${s(body.visibility)}` };
    case "boardMember":
      return { type: "board", action: "board.member.add", summary: `Added ${s(body.email)} to a board as ${s(body.role)}` };
    case "boardMemberRemove":
      return { type: "board", action: "board.member.remove", summary: `Removed ${s(body.email)} from a board` };
    case "boardExclude":
      return { type: "board", action: "board.exclude", summary: `${body.excluded ? "Excluded" : "Un-excluded"} ${s(body.email)} on a board` };
    default:
      return null;
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Only an Org Admin may create/change/remove another Org Admin, or edit the
// top-tier role definitions (Org Admin / Co-Admin). This is what stops a
// Co-Admin from removing or demoting the Org Admin who set them up.
const PROTECTED_ROLES = new Set(["Org Admin", "Co-Admin"]);

export async function GET() {
  const config = await getConfig();
  return NextResponse.json({ config });
}

const strList = (arr: unknown[]) => [...new Set(arr.map((o) => String(o)).filter(Boolean))] as string[];
const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

const CUSTOMIZE = new Set(["options", "columns", "tabs", "color", "people"]);
const ACCESS = new Set([
  "role",
  "userRole",
  "userAdd",
  "userRemove",
  "playbook",
  "automationAdd",
  "automationDelete",
]);
// Board-access actions are gated per board (the actor must be able to manage that
// specific board), not by the global roles.manage permission.
const BOARD_ACCESS = new Set([
  "boardVisibility",
  "boardMember",
  "boardMemberRemove",
  "boardExclude",
  "boardClone",
]);

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));

  // Permission gate by action category.
  if (CUSTOMIZE.has(body?.action) && !(await can("board.customize"))) return forbidden();
  if (ACCESS.has(body?.action) && !(await can("roles.manage"))) return forbidden();

  // Board-access actions: the actor must be able to manage this specific board.
  if (BOARD_ACCESS.has(body?.action)) {
    const boardId = typeof body?.boardId === "string" ? body.boardId : "";
    const me = await getIdentity();
    const cfg = await getConfig();
    if (!boardId || !canManageBoardAccess(me, boardId, cfg.boards)) return forbidden();
  }

  // Notification prefs: you may set your own; admins may set anyone's.
  if (body?.action === "notifyPref") {
    const me = await getIdentity();
    const target = typeof body?.email === "string" ? body.email.toLowerCase() : "";
    if (!target || (target !== me.id.toLowerCase() && !(await can("roles.manage")))) return forbidden();
  }

  // Creating or duplicating a board requires the project.create permission.
  if ((body?.action === "boardCreate" || body?.action === "boardDuplicate") && !(await can("project.create"))) {
    return forbidden();
  }

  // Deleting a board: requires the Delete-boards permission, and only custom
  // boards, and only by someone who can manage that specific board.
  if (body?.action === "boardDelete") {
    const boardId = typeof body?.boardId === "string" ? body.boardId : "";
    const me = await getIdentity();
    const cfg = await getConfig();
    const isCustom = cfg.customBoards.some((b) => b.id === boardId);
    if (!boardId || !isCustom || !me.perms.includes("project.delete") || !canManageBoardAccess(me, boardId, cfg.boards)) {
      return forbidden();
    }
  }

  // Org-Admin protection: a non-Org-Admin can't touch Org Admins or the
  // protected role definitions, even though they hold roles.manage.
  if (ACCESS.has(body?.action)) {
    const me = await getIdentity();
    if (me.role !== "Org Admin") {
      const cfg = await getConfig();
      const targetCurrentRole = typeof body?.userId === "string" ? cfg.userRoles[body.userId] : undefined;
      const blocked =
        (body.action === "userRole" && (PROTECTED_ROLES.has(body.role) || PROTECTED_ROLES.has(targetCurrentRole ?? ""))) ||
        (body.action === "userRemove" && PROTECTED_ROLES.has(cfg.userRoles[body.id] ?? "")) ||
        (body.action === "userAdd" && PROTECTED_ROLES.has(body.role)) ||
        (body.action === "role" && PROTECTED_ROLES.has(body.role));
      if (blocked) {
        return NextResponse.json({ error: "Only an Org Admin can manage Org Admins." }, { status: 403 });
      }
    }
  }

  const res: NextResponse = await (async (): Promise<NextResponse> => {
  if (body?.action === "options" && body.viewId && body.columnKey && Array.isArray(body.options)) {
    return NextResponse.json({ config: await setColumnOptions(body.viewId, body.columnKey, strList(body.options)) });
  }
  if (body?.action === "columns" && body.viewId && Array.isArray(body.keys)) {
    return NextResponse.json({ config: await setColumnOrder(body.viewId, strList(body.keys)) });
  }
  if (body?.action === "tabs" && Array.isArray(body.ids)) {
    return NextResponse.json({ config: await setTabOrder(strList(body.ids)) });
  }
  if (body?.action === "color" && body.viewId && body.columnKey && typeof body.value === "string") {
    const hex = typeof body.hex === "string" ? body.hex : null;
    return NextResponse.json({ config: await setColor(body.viewId, body.columnKey, body.value, hex) });
  }
  if (body?.action === "people" && Array.isArray(body.people)) {
    return NextResponse.json({ config: await setPeople(strList(body.people)) });
  }
  if (body?.action === "role" && typeof body.role === "string" && Array.isArray(body.permissions)) {
    return NextResponse.json({ config: await setRole(body.role, strList(body.permissions)) });
  }
  if (body?.action === "userRole" && typeof body.userId === "string" && typeof body.role === "string") {
    return NextResponse.json({ config: await setUserRole(body.userId, body.role) });
  }
  if (body?.action === "userAdd" && typeof body.name === "string" && body.name.trim()) {
    const role = typeof body.role === "string" ? body.role : "Viewer";
    const email = typeof body.email === "string" && body.email.trim() ? body.email.trim() : undefined;
    return NextResponse.json({ config: await addUser(body.name.trim(), role, email) });
  }
  if (body?.action === "userRemove" && typeof body.id === "string") {
    return NextResponse.json({ config: await removeUser(body.id) });
  }
  if (body?.action === "playbook" && typeof body.workType === "string" && typeof body.team === "string") {
    const override = {
      project: typeof body.project === "string" ? body.project : undefined,
      assignees: typeof body.assignees === "string" ? body.assignees : undefined,
    };
    return NextResponse.json({ config: await setPlaybookOverride(body.workType, body.team, override) });
  }
  if (body?.action === "automationAdd" && body.automation?.workType && body.automation?.triggerStatus) {
    const a = body.automation;
    const automation = {
      id: typeof a.id === "string" && a.id ? a.id : `auto_${Date.now().toString(36)}`,
      workType: String(a.workType),
      triggerStatus: String(a.triggerStatus),
      tickets: Array.isArray(a.tickets)
        ? a.tickets
            .filter((t: { team?: unknown; project?: unknown }) => t?.team && t?.project)
            .map((t: { team: unknown; project: unknown; summary?: unknown; assignees?: unknown }) => ({
              team: String(t.team),
              project: String(t.project),
              summary: String(t.summary ?? `${a.workType} task — {deliverable}`),
              assignees: typeof t.assignees === "string" ? t.assignees : "",
            }))
        : [],
    };
    if (automation.tickets.length === 0) {
      return NextResponse.json({ error: "Add at least one ticket (team + project)." }, { status: 400 });
    }
    return NextResponse.json({ config: await addAutomation(automation) });
  }
  if (body?.action === "automationDelete" && typeof body.id === "string") {
    return NextResponse.json({ config: await deleteAutomation(body.id) });
  }
  if (body?.action === "boardVisibility" && typeof body.boardId === "string" && (body.visibility === "public" || body.visibility === "private")) {
    return NextResponse.json({ config: await setBoardVisibility(body.boardId, body.visibility) });
  }
  if (body?.action === "boardMember" && typeof body.boardId === "string" && typeof body.email === "string" && body.email.trim() && typeof body.role === "string") {
    return NextResponse.json({ config: await setBoardMember(body.boardId, body.email.trim(), body.role) });
  }
  if (body?.action === "boardMemberRemove" && typeof body.boardId === "string" && typeof body.email === "string") {
    return NextResponse.json({ config: await removeBoardMember(body.boardId, body.email) });
  }
  if (body?.action === "boardExclude" && typeof body.boardId === "string" && typeof body.email === "string" && body.email.trim() && typeof body.excluded === "boolean") {
    return NextResponse.json({ config: await setBoardExclusion(body.boardId, body.email.trim(), body.excluded) });
  }
  if (body?.action === "boardClone" && typeof body.boardId === "string" && typeof body.fromBoardId === "string") {
    return NextResponse.json({ config: await cloneBoardMembers(body.fromBoardId, body.boardId) });
  }
  if (body?.action === "boardCreate" && typeof body.label === "string" && body.label.trim() && typeof body.templateKey === "string") {
    const me = await getIdentity();
    const visibility = body.visibility === "private" ? "private" : "public";
    const { cfg, id } = await addCustomBoard({
      label: body.label.trim(),
      templateKey: body.templateKey,
      owner: me.id,
      visibility,
    });
    return NextResponse.json({ config: cfg, boardId: id });
  }
  if (body?.action === "boardDelete" && typeof body.boardId === "string") {
    return NextResponse.json({ config: await deleteCustomBoard(body.boardId) });
  }
  if (body?.action === "notifyPref" && typeof body.email === "string" && (body.key === "assigned" || body.key === "status" || body.key === "due") && typeof body.value === "boolean") {
    return NextResponse.json({ config: await setNotifyPref(body.email, body.key, body.value) });
  }
  if (body?.action === "boardDuplicate" && typeof body.sourceBoardId === "string" && typeof body.label === "string" && body.label.trim()) {
    const me = await getIdentity();
    const visibility = body.visibility === "private" ? "private" : "public";
    const result = await addClonedBoard({
      sourceBoardId: body.sourceBoardId,
      label: body.label.trim(),
      owner: me.id,
      visibility,
      copyMembers: Boolean(body.copyMembers),
    });
    if (!result) return NextResponse.json({ error: "Unknown source board" }, { status: 400 });
    if (body.copyRows) {
      const adapter = getAdapter();
      const rows = await adapter.list(result.sourceCollection);
      for (const r of rows) await adapter.create(result.id, r.fields);
    }
    return NextResponse.json({ config: result.cfg, boardId: result.id });
  }
    return NextResponse.json({ error: "Invalid config update" }, { status: 400 });
  })();

  // Audit access / structural changes (best-effort, only on a successful write).
  if (res.ok) {
    const summary = summarizeConfigAction(body);
    if (summary) {
      const actor = await getIdentity();
      await logAudit({ ...summary, actorId: actor.id, actorName: actor.name, actorRole: actor.role });
    }
  }
  return res;
}
