"use client";

import { useState } from "react";
import type { ViewDef } from "@/lib/types";
import EditableGrid from "./EditableGrid";

export default function Workspace({ views, adapter }: { views: ViewDef[]; adapter: string }) {
  const [activeId, setActiveId] = useState(views[0]?.id);
  const active = views.find((v) => v.id === activeId) ?? views[0];

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

      {active && <EditableGrid key={active.id} view={active} />}
    </div>
  );
}
