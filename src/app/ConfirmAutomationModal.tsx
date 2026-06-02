"use client";

import { avatarColor, chipColor, initials, splitPeople } from "@/lib/colors";
import type { TicketDef } from "@/lib/playbooks";

// Confirmation gate shown before a playbook opens tickets — so the user always
// sees exactly what will be created, in which projects, and who gets tagged.
export default function ConfirmAutomationModal({
  deliverable,
  stage,
  tickets,
  busy,
  onConfirm,
  onCancel,
}: {
  deliverable: string;
  stage: string;
  tickets: TicketDef[];
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>
            Open {tickets.length} ticket{tickets.length === 1 ? "" : "s"}?
          </h2>
          <button className="modal-close" onClick={onCancel}>
            ×
          </button>
        </div>
        <p className="modal-sub">
          For <strong>{deliverable}</strong> at status <strong>{stage}</strong>, this will open the
          following tickets in each team’s Jira project and tag the people shown. Nothing is created
          until you confirm.
        </p>

        <div className="modal-body">
          {tickets.map((t, i) => {
            const summary = t.summary.replace("{deliverable}", deliverable);
            const people = splitPeople(t.assignees ?? "");
            return (
              <div className="confirm-ticket" key={i}>
                <div className="confirm-ticket-head">
                  <span className="team-chip" style={{ background: chipColor(t.team) }}>
                    {t.team}
                  </span>
                  <span className="confirm-proj">{t.project}</span>
                  <div className="avatars">
                    {people.map((p, j) => (
                      <span
                        key={p + j}
                        className="avatar"
                        style={{ background: avatarColor(p), zIndex: people.length - j }}
                        title={p}
                      >
                        {initials(p)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="confirm-summary">{summary}</div>
                {t.dueHint && <div className="confirm-due">⏱ {t.dueHint}</div>}
              </div>
            );
          })}
        </div>

        <div className="modal-foot">
          <button className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={busy}>
            {busy ? "Opening…" : `⚡ Open ${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
