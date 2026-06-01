"use client";

import { useEffect, useState } from "react";
import type { ViewDef } from "@/lib/types";
import type { AppConfig } from "@/lib/config-store";
import EditableGrid from "./EditableGrid";

export default function Workspace({ views, adapter }: { views: ViewDef[]; adapter: string }) {
  const [activeId, setActiveId] = useState(views[0]?.id);
  const active = views.find((v) => v.id === activeId) ?? views[0];

  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setConfig(d.config ?? null))
      .catch(() => setConfig(null));
  }, []);

  async function saveOptions(viewId: string, columnKey: string, options: string[]) {
    // Optimistic update
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            options: {
              ...prev.options,
              [viewId]: { ...(prev.options[viewId] ?? {}), [columnKey]: options },
            },
          }
        : prev
    );
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "options", viewId, columnKey, options }),
    });
    const d = await res.json().catch(() => null);
    if (d?.config) setConfig(d.config);
  }

  async function savePeople(people: string[]) {
    setConfig((prev) => (prev ? { ...prev, people } : prev));
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "people", people }),
    });
    const d = await res.json().catch(() => null);
    if (d?.config) setConfig(d.config);
  }

  const activeOptions = (active && config?.options[active.id]) || {};
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
        {views.map((v) => (
          <button
            key={v.id}
            className={`tab ${v.id === activeId ? "active" : ""}`}
            onClick={() => setActiveId(v.id)}
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
          people={people}
          onSaveOptions={(columnKey, options) => saveOptions(active.id, columnKey, options)}
          onSavePeople={savePeople}
        />
      )}
    </div>
  );
}
