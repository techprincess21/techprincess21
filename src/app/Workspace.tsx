"use client";

import { useEffect, useMemo, useState } from "react";
import type { ViewDef } from "@/lib/types";
import type { AppConfig } from "@/lib/config-store";
import { DEMO_USERS } from "@/lib/rbac";
import { LAUNCH_DEMO_COLLECTIONS } from "@/lib/demo-launches";
import EditableGrid from "./EditableGrid";
import AccessModal from "./AccessModal";
import AutomationsBuilder from "./AutomationsBuilder";

interface Me {
  id: string;
  name: string;
  role: string;
  perms: string[];
}

export default function Workspace({
  views,
  adapter,
  me,
  devLogin = false,
}: {
  views: ViewDef[];
  adapter: string;
  me: Me;
  devLogin?: boolean;
}) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [dragTab, setDragTab] = useState<string | null>(null);
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessDirty, setAccessDirty] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const has = (p: string) => me.perms.includes(p);
  const canCustomize = has("board.customize");
  const canManageRoles = has("roles.manage");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setConfig(d.config ?? null))
      .catch(() => setConfig(null));
  }, []);

  const orderedViews = useMemo(() => {
    const order = config?.tabOrder ?? [];
    const byId = new Map(views.map((v) => [v.id, v]));
    const out: ViewDef[] = [];
    for (const id of order) {
      const v = byId.get(id);
      if (v) {
        out.push(v);
        byId.delete(id);
      }
    }
    for (const v of byId.values()) out.push(v);
    return out.filter((v) => !v.hidden);
  }, [views, config?.tabOrder]);

  const firstVisible = views.find((v) => !v.hidden)?.id ?? views[0]?.id;
  const [activeId, setActiveId] = useState(firstVisible);
  const active = orderedViews.find((v) => v.id === activeId) ?? orderedViews[0];

  // Restore the last-viewed board after a refresh (only if it's a visible tab).
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("goatsana.activeTab") : null;
    if (saved && views.some((v) => v.id === saved && !v.hidden)) setActiveId(saved);
  }, [views]);

  function selectTab(id: string) {
    setActiveId(id);
    try {
      localStorage.setItem("goatsana.activeTab", id);
    } catch {
      /* ignore (e.g. storage disabled) */
    }
  }

  async function putConfig(body: object) {
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => null);
    if (d?.config) setConfig(d.config);
  }

  function saveOptions(viewId: string, columnKey: string, options: string[]) {
    setConfig((p) =>
      p ? { ...p, options: { ...p.options, [viewId]: { ...(p.options[viewId] ?? {}), [columnKey]: options } } } : p
    );
    putConfig({ action: "options", viewId, columnKey, options });
  }
  function saveColumns(viewId: string, keys: string[]) {
    setConfig((p) => (p ? { ...p, columnOrder: { ...p.columnOrder, [viewId]: keys } } : p));
    putConfig({ action: "columns", viewId, keys });
  }
  function saveColor(viewId: string, columnKey: string, value: string, hex: string | null) {
    putConfig({ action: "color", viewId, columnKey, value, hex });
  }
  function savePeople(people: string[]) {
    setConfig((p) => (p ? { ...p, people } : p));
    putConfig({ action: "people", people });
  }
  function saveTabs(ids: string[]) {
    setConfig((p) => (p ? { ...p, tabOrder: ids } : p));
    putConfig({ action: "tabs", ids });
  }
  function saveRole(role: string, permissions: string[]) {
    setAccessDirty(true);
    setConfig((p) => (p ? { ...p, roles: { ...p.roles, [role]: permissions } } : p));
    putConfig({ action: "role", role, permissions });
  }
  function saveUserRole(userId: string, role: string) {
    setAccessDirty(true);
    setConfig((p) => (p ? { ...p, userRoles: { ...p.userRoles, [userId]: role } } : p));
    putConfig({ action: "userRole", userId, role });
  }
  function savePlaybook(workType: string, team: string, patch: { project?: string; assignees?: string }) {
    setConfig((p) =>
      p
        ? {
            ...p,
            playbooks: {
              ...p.playbooks,
              [workType]: { ...(p.playbooks?.[workType] ?? {}), [team]: { ...(p.playbooks?.[workType]?.[team] ?? {}), ...patch } },
            },
          }
        : p
    );
    putConfig({ action: "playbook", workType, team, ...patch });
  }

  function dropTab(targetId: string) {
    if (!canCustomize || !dragTab || dragTab === targetId) return setDragTab(null);
    const ids = orderedViews.map((v) => v.id);
    const di = ids.indexOf(dragTab);
    ids.splice(di, 1);
    const ti = ids.indexOf(targetId);
    ids.splice(ti < 0 ? ids.length : ti, 0, dragTab);
    saveTabs(ids);
    setDragTab(null);
  }

  async function importDemo() {
    setImporting(true);
    setImportMsg("Importing demo launches into Jira…");
    let total = 0;
    try {
      // One launch per request so each stays well under the function timeout.
      for (const collection of LAUNCH_DEMO_COLLECTIONS) {
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collection }),
        });
        const d = await res.json().catch(() => null);
        if (!res.ok) {
          setImportMsg(`Import failed: ${d?.error ?? res.status}`);
          setImporting(false);
          return;
        }
        const r = d?.results?.[collection];
        total += (r?.created ?? 0) + (r?.updated ?? 0);
      }
      setImportMsg(`✅ Synced ${total} deliverables to Jira (MW). Reloading…`);
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setImportMsg("Import failed — see console.");
      setImporting(false);
    }
  }

  function switchUser(userId: string) {
    document.cookie = `devUser=${userId};path=/;max-age=31536000`;
    window.location.reload();
  }

  function closeAccess() {
    setAccessOpen(false);
    // Role/permission changes affect server-side gating + this user's own
    // permissions, so reload to re-resolve everything correctly.
    if (accessDirty) window.location.reload();
  }

  const activeOptions = (active && config?.options[active.id]) || {};
  const activeColumns = (active && config?.columnOrder[active.id]) || [];
  const activeColors = (active && config?.colors[active.id]) || {};
  const people = config?.people ?? [];

  return (
    <div className="app">
      <div className="app-header">
        <div className="brand">
          <span className="brand-mark" role="img" aria-label="Goatsana goat logo">
            🐐
          </span>
          <h1>Goatsana</h1>
        </div>
        <span className="badge">{adapter === "jira" ? "Live: Jira" : "Mock data"}</span>
        <div className="who">
          <span className="who-label">{devLogin ? "Viewing as" : "Signed in as"}</span>
          {devLogin ? (
            <select className="who-select" value={me.id} onChange={(e) => switchUser(e.target.value)}>
              {DEMO_USERS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="who-static">{me.name}</span>
          )}
          <span className="who-role">{me.role}</span>
          {canManageRoles && (
            <>
              <button
                className="btn btn-ghost who-manage"
                onClick={importDemo}
                disabled={importing}
                title="Create the demo launch deliverables as issues in Jira (MW)"
              >
                {importing ? "Importing…" : "⬇ Import demo → Jira"}
              </button>
              <button className="btn btn-ghost who-manage" onClick={() => setAccessOpen(true)}>
                Manage access
              </button>
            </>
          )}
        </div>
      </div>
      {importMsg && (
        <div className="toast" role="status" onClick={() => setImportMsg(null)}>
          {importMsg}
        </div>
      )}
      <p className="app-sub">
        A friendly, Monday/Asana-style workspace on top of Jira. Edits save automatically.
        {devLogin && (
          <span className="demo-note"> · “Viewing as” is a demo stand-in for Okta SSO.</span>
        )}
      </p>

      <div className="tabs">
        {orderedViews.map((v) => (
          <button
            key={v.id}
            className={`tab ${v.id === activeId ? "active" : ""} ${dragTab === v.id ? "dragging" : ""}`}
            onClick={() => selectTab(v.id)}
            draggable={canCustomize}
            onDragStart={() => canCustomize && setDragTab(v.id)}
            onDragOver={(e) => dragTab && e.preventDefault()}
            onDrop={() => dropTab(v.id)}
            title={canCustomize ? "Drag to reorder tabs" : undefined}
          >
            {v.label}
          </button>
        ))}
      </div>

      {active && active.builder ? (
        <AutomationsBuilder
          description={active.description}
          overrides={config?.playbooks ?? {}}
          canEdit={canManageRoles}
          onSave={savePlaybook}
        />
      ) : active ? (
        <EditableGrid
          key={active.id}
          view={active}
          perms={me.perms}
          optionOverrides={activeOptions}
          columnOrder={activeColumns}
          colorOverrides={activeColors}
          people={people}
          onSaveOptions={(columnKey, options) => saveOptions(active.id, columnKey, options)}
          onSaveColumns={(keys) => saveColumns(active.id, keys)}
          onSaveColor={(columnKey, value, hex) => saveColor(active.id, columnKey, value, hex)}
          onSavePeople={savePeople}
        />
      ) : null}

      {accessOpen && config && (
        <AccessModal
          roles={config.roles}
          userRoles={config.userRoles}
          onSaveRole={saveRole}
          onSaveUserRole={saveUserRole}
          onClose={closeAccess}
        />
      )}
    </div>
  );
}
