"use client";

import { useState } from "react";
import { PLAYBOOKS, type ConfigAutomation, type PlaybookOverrides } from "@/lib/playbooks";
import { chipColor } from "@/lib/colors";

const STATUSES = [
  "Not Started",
  "Scheduled",
  "Ongoing",
  "In Progress - On Track",
  "In Progress - Review",
  "At Risk",
  "Blocked",
  "Completed",
];

type DraftTicket = { team: string; project: string; summary: string; assignees: string };

// The Automations builder: define what happens automatically — "for a work
// type, when it reaches a status, open tickets in these teams' Jira projects."
export default function AutomationsBuilder({
  description,
  overrides,
  automations,
  canEdit,
  onSave,
  onAdd,
  onDelete,
}: {
  description?: string;
  overrides: PlaybookOverrides;
  automations: ConfigAutomation[];
  canEdit: boolean;
  onSave: (workType: string, team: string, patch: { project?: string; assignees?: string }) => void;
  onAdd: (automation: { workType: string; triggerStatus: string; tickets: DraftTicket[] }) => void;
  onDelete: (id: string) => void;
}) {
  const builtIn = Object.keys(PLAYBOOKS);
  const [adding, setAdding] = useState(false);
  const [workType, setWorkType] = useState("");
  const [triggerStatus, setTriggerStatus] = useState("Scheduled");
  const [tickets, setTickets] = useState<DraftTicket[]>([{ team: "", project: "", summary: "", assignees: "" }]);

  function updateTicket(i: number, patch: Partial<DraftTicket>) {
    setTickets((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  }
  function reset() {
    setAdding(false);
    setWorkType("");
    setTriggerStatus("Scheduled");
    setTickets([{ team: "", project: "", summary: "", assignees: "" }]);
  }
  function submit() {
    const clean = tickets.filter((t) => t.team.trim() && t.project.trim());
    if (!workType.trim() || clean.length === 0) {
      alert("Give the automation a work type and at least one ticket (team + project).");
      return;
    }
    onAdd({ workType: workType.trim(), triggerStatus, tickets: clean });
    reset();
  }

  return (
    <div className="ab">
      <p className="view-desc">{description}</p>

      {/* Built-in automations (editable project + assignees) */}
      {builtIn.map((wt) => {
        const pb = PLAYBOOKS[wt];
        return pb.stages.map((stage) => (
          <div className="ab-card" key={`${wt}:${stage.triggerStatus}`}>
            <RuleHeader workType={wt} status={stage.triggerStatus} badge="Built-in" />
            <div className="ab-tickets">
              {stage.tickets.map((t) => {
                const ov = overrides[wt]?.[t.team] ?? {};
                return (
                  <div className="ab-ticket" key={t.team}>
                    <div className="ab-ticket-head">
                      <span className="team-chip" style={{ background: chipColor(t.team) }}>{t.team}</span>
                      <span className="ab-arrow">→ Jira project</span>
                      <input
                        className="ab-input ab-project"
                        value={ov.project ?? t.project}
                        disabled={!canEdit}
                        onChange={(e) => onSave(wt, t.team, { project: e.target.value })}
                      />
                    </div>
                    <div className="ab-ticket-summary">{t.summary.replace("{deliverable}", "the item")}</div>
                    <label className="ab-field">
                      <span>Assignees</span>
                      <input
                        className="ab-input"
                        value={ov.assignees ?? t.assignees ?? ""}
                        disabled={!canEdit}
                        placeholder="names…"
                        onChange={(e) => onSave(wt, t.team, { assignees: e.target.value })}
                      />
                    </label>
                    {t.checklist && t.checklist.length > 0 && (
                      <details className="ab-checklist">
                        <summary>{t.checklist.length} checklist items</summary>
                        <ul>{t.checklist.map((c, i) => <li key={i}>{c}</li>)}</ul>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ));
      })}

      {/* User-created automations */}
      {automations.map((a) => (
        <div className="ab-card" key={a.id}>
          <div className="ab-card-top">
            <RuleHeader workType={a.workType} status={a.triggerStatus} badge="Custom" />
            {canEdit && (
              <button className="ab-del" onClick={() => onDelete(a.id)} title="Delete automation">
                ×
              </button>
            )}
          </div>
          <div className="ab-tickets">
            {a.tickets.map((t, i) => (
              <div className="ab-ticket" key={i}>
                <div className="ab-ticket-head">
                  <span className="team-chip" style={{ background: chipColor(t.team) }}>{t.team}</span>
                  <span className="ab-arrow">→</span>
                  <span className="ab-project-static">{t.project}</span>
                </div>
                <div className="ab-ticket-summary">{t.summary.replace("{deliverable}", "the item")}</div>
                {t.assignees && <div className="ab-sub">Assignees: {t.assignees}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Add new automation */}
      {canEdit && !adding && (
        <button className="btn btn-primary ab-add" onClick={() => setAdding(true)}>
          + New automation
        </button>
      )}

      {canEdit && adding && (
        <div className="ab-card ab-form">
          <div className="ab-form-row">
            <label className="ab-field">
              <span>WHEN Work Type is</span>
              <input
                className="ab-input"
                value={workType}
                placeholder="e.g. Webinar, Blog, Field Event"
                onChange={(e) => setWorkType(e.target.value)}
              />
            </label>
            <label className="ab-field">
              <span>AND status becomes</span>
              <select className="ab-input" value={triggerStatus} onChange={(e) => setTriggerStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
          </div>

          <div className="ab-form-label">→ OPEN these tickets:</div>
          {tickets.map((t, i) => (
            <div className="ab-form-ticket" key={i}>
              <input className="ab-input" placeholder="Team (e.g. Design)" value={t.team} onChange={(e) => updateTicket(i, { team: e.target.value })} />
              <input className="ab-input ab-project" placeholder="PROJECT" value={t.project} onChange={(e) => updateTicket(i, { project: e.target.value })} />
              <input className="ab-input ab-grow" placeholder="Ticket summary ({deliverable} allowed)" value={t.summary} onChange={(e) => updateTicket(i, { summary: e.target.value })} />
              <input className="ab-input" placeholder="Assignees" value={t.assignees} onChange={(e) => updateTicket(i, { assignees: e.target.value })} />
              {tickets.length > 1 && (
                <button className="ab-del" onClick={() => setTickets((ts) => ts.filter((_, j) => j !== i))}>×</button>
              )}
            </div>
          ))}
          <button className="btn btn-ghost" onClick={() => setTickets((ts) => [...ts, { team: "", project: "", summary: "", assignees: "" }])}>
            + Add ticket
          </button>

          <div className="ab-form-actions">
            <button className="btn" onClick={reset}>Cancel</button>
            <button className="btn btn-primary" onClick={submit}>Create automation</button>
          </div>
        </div>
      )}

      {!canEdit && (
        <p className="ab-note">You need the “Manage roles &amp; access” permission to edit automations.</p>
      )}
    </div>
  );
}

function RuleHeader({ workType, status, badge }: { workType: string; status: string; badge: string }) {
  return (
    <div className="ab-rule">
      <span className="ab-badge">{badge}</span> <span className="ab-when">WHEN</span> Work Type is{" "}
      <span className="ab-pill" style={{ background: chipColor(workType) }}>{workType}</span>{" "}
      <span className="ab-when">AND status becomes</span>{" "}
      <span className="ab-pill" style={{ background: chipColor(status) }}>{status}</span>{" "}
      <span className="ab-when">→ OPEN:</span>
    </div>
  );
}
