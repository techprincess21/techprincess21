"use client";

import { useEffect, useMemo, useState } from "react";
import type { ViewDef } from "@/lib/types";
import type { AppConfig } from "@/lib/config-store";
import EditableGrid from "./EditableGrid";

export default function Workspace({ views, adapter }: { views: ViewDef[]; adapter: string }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [dragTab, setDragTab] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setConfig(d.config ?? null))
      .catch(() => setConfig(null));
  }, []);

  // Order tabs by saved tab order, appending any new views.
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
    return out;
  }, [views, config?.tabOrder]);

  const [activeId, setActiveId] = useState(views[0]?.id);
  const active = orderedViews.find((v) => v.id === activeId) ?? orderedViews[0];

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

  function dropTab(targetId: string) {
    if (!dragTab || dragTab === targetId) return setDragTab(null);
    const ids = orderedViews.map((v) => v.id);
    const di = ids.indexOf(dragTab);
    ids.splice(di, 1);
    const ti = ids.indexOf(targetId);
    ids.splice(ti < 0 ? ids.length : ti, 0, dragTab);
    saveTabs(ids);
    setDragTab(null);
  }

  const activeOptions = (active && config?.options[active.id]) || {};
  const activeColumns = (active && config?.columnOrder[active.id]) || [];
  const activeColors = (active && config?.colors[active.id]) || {};
  const people = config?.people ?? [];

  return (
    <div className="app">
      <div className="app-header">
        <h1>Content Workspace</h1>
        <span className="badge">{adapter === "jira" ? "Live: Jira" : "Mock data"}</span>
      </div>
      <p className="app-sub">
        A spreadsheet-style view over your Jira <code>WEB</code> project. Edits save automatically.
      </p>

      <div className="tabs">
        {orderedViews.map((v) => (
          <button
            key={v.id}
            className={`tab ${v.id === activeId ? "active" : ""} ${dragTab === v.id ? "dragging" : ""}`}
            onClick={() => setActiveId(v.id)}
            draggable
            onDragStart={() => setDragTab(v.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dropTab(v.id)}
            title="Drag to reorder tabs"
          >
            {v.label}
          </button>
        ))}
      </div>

      {active && (
        <EditableGrid
          key={active.id}
          view={active}
          optionOverrides={activeOptions}
          columnOrder={activeColumns}
          colorOverrides={activeColors}
          people={people}
          onSaveOptions={(columnKey, options) => saveOptions(active.id, columnKey, options)}
          onSaveColumns={(keys) => saveColumns(active.id, keys)}
          onSaveColor={(columnKey, value, hex) => saveColor(active.id, columnKey, value, hex)}
          onSavePeople={savePeople}
        />
      )}
    </div>
  );
}
