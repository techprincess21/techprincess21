"use client";

import { useEffect, useMemo, useState } from "react";
import type { ViewDef } from "@/lib/types";
import type { AppConfig } from "@/lib/config-store";
import { listPlaybooks } from "@/lib/playbooks";
import {
  canManageBoardAccess,
  canSeeBoard,
  effectiveBoardPerms,
  boardVisibility,
} from "@/lib/board-access";
import EditableGrid from "./EditableGrid";
import AccessModal from "./AccessModal";
import BoardAccessModal from "./BoardAccessModal";
import NewBoardModal from "./NewBoardModal";
import NotificationsModal from "./NotificationsModal";
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
  oktaAuth = false,
  slackConfigured = false,
}: {
  views: ViewDef[];
  adapter: string;
  me: Me;
  devLogin?: boolean;
  oktaAuth?: boolean;
  slackConfigured?: boolean;
}) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [dragTab, setDragTab] = useState<string | null>(null);
  const [accessOpen, setAccessOpen] = useState(false);
  const [boardAccessOpen, setBoardAccessOpen] = useState(false);
  const [newBoardOpen, setNewBoardOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accessDirty, setAccessDirty] = useState(false);

  const has = (p: string) => me.perms.includes(p);
  const canCustomize = has("board.customize");
  const canManageRoles = has("roles.manage");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setConfig(d.config ?? null))
      .catch(() => setConfig(null));
  }, []);

  // Code-defined boards plus the user-created ones (from config).
  const allViews = useMemo(
    () => [...views, ...(config?.customBoards ?? [])],
    [views, config?.customBoards]
  );

  // The boards that participate in public/private access (everything that isn't
  // the Automations builder).
  const dataBoardIds = useMemo(
    () => new Set(allViews.filter((v) => !v.builder).map((v) => v.id)),
    [allViews]
  );

  const orderedViews = useMemo(() => {
    const order = config?.tabOrder ?? [];
    const byId = new Map(allViews.map((v) => [v.id, v]));
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
  }, [allViews, config?.tabOrder]);

  // Hide private boards the current user can't see. (Server enforces this too;
  // this just keeps the tab bar honest.)
  const visibleViews = useMemo(() => {
    if (!config) return orderedViews;
    return orderedViews.filter((v) => {
      if (v.builder || !dataBoardIds.has(v.id)) return true;
      return canSeeBoard(me, v.id, config.boards);
    });
  }, [orderedViews, config, me, dataBoardIds]);

  const firstVisible = views.find((v) => !v.hidden)?.id ?? views[0]?.id;
  const [activeId, setActiveId] = useState(firstVisible);
  const active = visibleViews.find((v) => v.id === activeId) ?? visibleViews[0];

  // Effective permissions on the active board (base role + any per-board bump).
  const activePerms = useMemo(() => {
    if (!active || !config || !dataBoardIds.has(active.id)) return me.perms;
    return effectiveBoardPerms(me, active.id, config.boards, config.roles);
  }, [active, config, me, dataBoardIds]);

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
  async function addAutomation(automation: object) {
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "automationAdd", automation }),
    });
    const d = await res.json().catch(() => null);
    if (d?.config) setConfig(d.config);
    else if (d?.error) alert(d.error);
  }
  function deleteAutomation(id: string) {
    setConfig((p) => (p ? { ...p, automations: p.automations.filter((a) => a.id !== id) } : p));
    putConfig({ action: "automationDelete", id });
  }
  function addUser(name: string, email?: string) {
    setAccessDirty(true);
    putConfig({ action: "userAdd", name, email });
  }
  function removeUser(id: string) {
    setAccessDirty(true);
    setConfig((p) =>
      p ? { ...p, users: p.users.filter((u) => u.id !== id) } : p
    );
    putConfig({ action: "userRemove", id });
  }
  function applyBoardVisibility(boardId: string, visibility: "public" | "private") {
    putConfig({ action: "boardVisibility", boardId, visibility });
  }
  function applyBoardMember(boardId: string, email: string, role: string) {
    putConfig({ action: "boardMember", boardId, email, role });
  }
  function applyBoardMemberRemove(boardId: string, email: string) {
    putConfig({ action: "boardMemberRemove", boardId, email });
  }
  function applyBoardExclude(boardId: string, email: string, excluded: boolean) {
    putConfig({ action: "boardExclude", boardId, email, excluded });
  }
  function applyBoardClone(boardId: string, fromBoardId: string) {
    putConfig({ action: "boardClone", boardId, fromBoardId });
  }
  function setNotifyPref(key: "assigned" | "status" | "due", value: boolean) {
    putConfig({ action: "notifyPref", email: me.id, key, value });
  }
  async function createBoard(opts: {
    label: string;
    visibility: "public" | "private";
    templateKey?: string;
    sourceBoardId?: string;
    copyRows?: boolean;
    copyMembers?: boolean;
  }) {
    const body = opts.sourceBoardId
      ? {
          action: "boardDuplicate",
          sourceBoardId: opts.sourceBoardId,
          label: opts.label,
          visibility: opts.visibility,
          copyRows: opts.copyRows,
          copyMembers: opts.copyMembers,
        }
      : { action: "boardCreate", label: opts.label, templateKey: opts.templateKey, visibility: opts.visibility };
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => null);
    if (d?.config) setConfig(d.config);
    if (d?.boardId) selectTab(d.boardId);
    setNewBoardOpen(false);
  }
  function deleteBoard(boardId: string) {
    setBoardAccessOpen(false);
    setActiveId(firstVisible);
    putConfig({ action: "boardDelete", boardId });
  }
  async function importBoard(opts: {
    label: string;
    visibility: "public" | "private";
    file?: File;
    gsheetUrl?: string;
  }) {
    let body: Record<string, unknown>;
    if (opts.file) {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
        r.onerror = () => reject(r.error);
        r.readAsDataURL(opts.file as File);
      });
      body = { kind: "file", filename: opts.file.name, dataBase64, label: opts.label, visibility: opts.visibility };
    } else if (opts.gsheetUrl) {
      body = { kind: "gsheet", url: opts.gsheetUrl, label: opts.label, visibility: opts.visibility };
    } else {
      return;
    }
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => null);
    if (d?.error) {
      alert(d.error);
      return;
    }
    if (d?.config) setConfig(d.config);
    if (d?.boardId) selectTab(d.boardId);
    setNewBoardOpen(false);
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
  // Owner autocomplete = free-form names plus real app users (so owners can be
  // tied to identities we can notify).
  const people = useMemo(() => {
    const names = new Set(config?.people ?? []);
    for (const u of config?.users ?? []) names.add(u.name);
    return [...names];
  }, [config?.people, config?.users]);

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
              {(config?.users ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="who-static">{me.name}</span>
          )}
          <span className="who-role">{me.role}</span>
          {oktaAuth && (
            <a className="btn btn-ghost who-manage" href="/api/auth/signout">
              Sign out
            </a>
          )}
          {config && active && dataBoardIds.has(active.id) && canManageBoardAccess(me, active.id, config.boards) && (
            <button className="btn btn-ghost who-manage" onClick={() => setBoardAccessOpen(true)}>
              {boardVisibility(active.id, config.boards) === "private" ? "🔒" : "🌐"} Board access
            </button>
          )}
          <button className="btn btn-ghost who-manage" onClick={() => setNotifOpen(true)} title="Notification preferences">
            🔔
          </button>
          {canManageRoles && (
            <button className="btn btn-ghost who-manage" onClick={() => setAccessOpen(true)}>
              Manage access
            </button>
          )}
        </div>
      </div>
      <p className="app-sub">
        A friendly, Monday/Asana-style workspace on top of Jira. Edits save automatically.
        {devLogin && (
          <span className="demo-note"> · “Viewing as” is a demo stand-in for Okta SSO.</span>
        )}
      </p>

      <div className="tabs">
        {visibleViews.map((v) => (
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
            {config && dataBoardIds.has(v.id) && boardVisibility(v.id, config.boards) === "private" && (
              <span className="tab-lock" title="Private board">🔒 </span>
            )}
            {v.label}
          </button>
        ))}
        {has("project.create") && (
          <button className="tab tab-new" onClick={() => setNewBoardOpen(true)} title="Create a new board">
            + New board
          </button>
        )}
      </div>

      {active && active.builder ? (
        <AutomationsBuilder
          description={active.description}
          overrides={config?.playbooks ?? {}}
          automations={config?.automations ?? []}
          canEdit={canManageRoles}
          onSave={savePlaybook}
          onAdd={addAutomation}
          onDelete={deleteAutomation}
        />
      ) : active ? (
        <EditableGrid
          key={active.id}
          view={active}
          perms={activePerms}
          optionOverrides={activeOptions}
          columnOrder={activeColumns}
          colorOverrides={activeColors}
          people={people}
          playbooks={listPlaybooks(config?.playbooks, config?.automations)}
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
          users={config.users}
          meRole={me.role}
          onSaveRole={saveRole}
          onSaveUserRole={saveUserRole}
          onAddUser={addUser}
          onRemoveUser={removeUser}
          onClose={closeAccess}
        />
      )}

      {boardAccessOpen && config && active && dataBoardIds.has(active.id) && (
        <BoardAccessModal
          boardId={active.id}
          boardLabel={active.label}
          access={config.boards[active.id]}
          deletable={config.customBoards.some((b) => b.id === active.id) && has("project.delete")}
          otherBoards={allViews
            .filter((v) => dataBoardIds.has(v.id) && v.id !== active.id)
            .map((v) => ({ id: v.id, label: v.label }))}
          onSetVisibility={(vis) => applyBoardVisibility(active.id, vis)}
          onSetMember={(email, role) => applyBoardMember(active.id, email, role)}
          onRemoveMember={(email) => applyBoardMemberRemove(active.id, email)}
          onSetExclusion={(email, excluded) => applyBoardExclude(active.id, email, excluded)}
          onClone={(fromId) => applyBoardClone(active.id, fromId)}
          onDelete={() => deleteBoard(active.id)}
          onClose={() => setBoardAccessOpen(false)}
        />
      )}

      {notifOpen && (
        <NotificationsModal
          prefs={config?.notifyPrefs?.[me.id.toLowerCase()] ?? {}}
          slackConfigured={slackConfigured}
          signedInEmail={oktaAuth ? me.id : null}
          onSetPref={setNotifyPref}
          onClose={() => setNotifOpen(false)}
        />
      )}

      {newBoardOpen && (
        <NewBoardModal
          cloneSources={visibleViews
            .filter((v) => dataBoardIds.has(v.id))
            .map((v) => ({ id: v.id, label: v.label }))}
          onCreate={createBoard}
          onImport={importBoard}
          onClose={() => setNewBoardOpen(false)}
        />
      )}
    </div>
  );
}
