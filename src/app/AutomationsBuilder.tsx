"use client";

import { useState } from "react";
import { PLAYBOOKS, type PlaybookOverrides } from "@/lib/playbooks";
import { chipColor } from "@/lib/colors";

// The Automations builder: where you DEFINE what happens automatically —
// "for this work type, when it reaches this status, open tickets in these teams'
// Jira projects." Editing the target project / assignees persists and is used
// by the engine. The opened tickets themselves show under their deliverable on
// the board (not here).
export default function AutomationsBuilder({
  description,
  overrides,
  canEdit,
  onSave,
}: {
  description?: string;
  overrides: PlaybookOverrides;
  canEdit: boolean;
  onSave: (workType: string, team: string, patch: { project?: string; assignees?: string }) => void;
}) {
  const workTypes = Object.keys(PLAYBOOKS);

  return (
    <div className="ab">
      <p className="view-desc">{description}</p>

      {workTypes.map((wt) => {
        const pb = PLAYBOOKS[wt];
        return pb.stages.map((stage) => (
          <div className="ab-card" key={`${wt}:${stage.triggerStatus}`}>
            <div className="ab-rule">
              <span className="ab-when">WHEN</span> Work Type is{" "}
              <span className="ab-pill" style={{ background: chipColor(wt) }}>{wt}</span>{" "}
              <span className="ab-when">AND status becomes</span>{" "}
              <span className="ab-pill" style={{ background: chipColor(stage.triggerStatus) }}>
                {stage.triggerStatus}
              </span>{" "}
              <span className="ab-when">→ OPEN:</span>
            </div>

            <div className="ab-tickets">
              {stage.tickets.map((t) => {
                const ov = overrides[wt]?.[t.team] ?? {};
                const project = ov.project ?? t.project;
                const assignees = ov.assignees ?? t.assignees ?? "";
                return (
                  <div className="ab-ticket" key={t.team}>
                    <div className="ab-ticket-head">
                      <span className="team-chip" style={{ background: chipColor(t.team) }}>
                        {t.team}
                      </span>
                      <span className="ab-arrow">→ Jira project</span>
                      <input
                        className="ab-input ab-project"
                        value={project}
                        disabled={!canEdit}
                        onChange={(e) => onSave(wt, t.team, { project: e.target.value })}
                      />
                    </div>
                    <div className="ab-ticket-summary">{t.summary.replace("{deliverable}", "the item")}</div>
                    <label className="ab-field">
                      <span>Assignees</span>
                      <input
                        className="ab-input"
                        value={assignees}
                        disabled={!canEdit}
                        placeholder="names…"
                        onChange={(e) => onSave(wt, t.team, { assignees: e.target.value })}
                      />
                    </label>
                    {t.checklist && t.checklist.length > 0 && (
                      <details className="ab-checklist">
                        <summary>{t.checklist.length} checklist items</summary>
                        <ul>
                          {t.checklist.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ));
      })}

      <button className="btn btn-ghost ab-add" disabled title="Coming soon">
        + New automation
      </button>
      {!canEdit && (
        <p className="ab-note">You need the “Manage roles &amp; access” permission to edit automations.</p>
      )}
    </div>
  );
}
