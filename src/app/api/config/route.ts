import { NextResponse } from "next/server";
import {
  addAutomation,
  deleteAutomation,
  getConfig,
  setColumnOptions,
  setColumnOrder,
  setColor,
  setPeople,
  setPlaybookOverride,
  setRole,
  setTabOrder,
  setUserRole,
} from "@/lib/config-store";
import { can } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getConfig();
  return NextResponse.json({ config });
}

const strList = (arr: unknown[]) => [...new Set(arr.map((o) => String(o)).filter(Boolean))] as string[];
const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

const CUSTOMIZE = new Set(["options", "columns", "tabs", "color", "people"]);
const ACCESS = new Set(["role", "userRole", "playbook", "automationAdd", "automationDelete"]);

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));

  // Permission gate by action category.
  if (CUSTOMIZE.has(body?.action) && !(await can("board.customize"))) return forbidden();
  if (ACCESS.has(body?.action) && !(await can("roles.manage"))) return forbidden();

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
  return NextResponse.json({ error: "Invalid config update" }, { status: 400 });
}
