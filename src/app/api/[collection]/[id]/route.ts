import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";
import { boardContext, getIdentity } from "@/lib/auth";
import { permissionForPatch, STATUS_FIELD } from "@/lib/rbac";
import { getConfig } from "@/lib/config-store";
import { VIEWS } from "@/lib/views";
import { notifyConfigured, notifyOnPatch } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });
const unknown = () => NextResponse.json({ error: "Unknown collection" }, { status: 404 });

export async function PATCH(
  req: Request,
  { params }: { params: { collection: string; id: string } }
) {
  const body = await req.json().catch(() => ({}));
  const fields = body?.fields ?? {};
  const needed = permissionForPatch(params.collection, Object.keys(fields));
  const { valid, canSee, has } = await boardContext(params.collection);
  if (!valid) return unknown();
  if (!canSee || !has(needed)) return forbidden();
  const record = await getAdapter().update(params.collection, params.id, fields);

  const actor = await getIdentity();
  const changed = Object.keys(fields);
  await logAudit({
    type: "data",
    action: "item.update",
    summary: `Edited ${changed.length ? changed.join(", ") : "fields"} on an item in “${params.collection}”`,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
  });

  // Notify affected people (assignment / status change). Best-effort, and only
  // does any work when Slack is configured.
  if (notifyConfigured()) {
    try {
      const cfg = await getConfig();
      const view =
        VIEWS.find((v) => v.collection === params.collection) ??
        cfg.customBoards.find((b) => b.id === params.collection);
      if (view) {
        await notifyOnPatch({
          changedFields: Object.keys(fields),
          record,
          columns: view.columns,
          statusKey: STATUS_FIELD[params.collection] ?? view.columns.find((c) => c.key === "status")?.key,
          boardLabel: view.label,
          users: cfg.users,
          prefs: cfg.notifyPrefs,
        });
      }
    } catch {
      // never let a notification failure break the edit
    }
  }

  return NextResponse.json({ record });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { collection: string; id: string } }
) {
  const { valid, canSee, has } = await boardContext(params.collection);
  if (!valid) return unknown();
  if (!canSee || !has("item.delete")) return forbidden();
  await getAdapter().remove(params.collection, params.id);
  const actor = await getIdentity();
  await logAudit({
    type: "data",
    action: "item.delete",
    summary: `Deleted an item from “${params.collection}”`,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
  });
  return NextResponse.json({ ok: true });
}
