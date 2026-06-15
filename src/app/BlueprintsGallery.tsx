"use client";

import { useState } from "react";
import { avatarColor, chipColor, initials, splitPeople } from "@/lib/colors";
import { VIEW_BY_ID } from "@/lib/views";
import type { Playbook, TicketDef } from "@/lib/playbooks";

// The Blueprints gallery: the *front* of the automation engine.
//
// The Automations tab is the back — the editable "WHEN status becomes X → OPEN
// these tickets" rule, gated to admins. This gallery turns those same rules
// into browsable "plays" anyone can see, and adds the one thing the product has
// no front door for today: a Start button that creates the launch deliverable
// and opens its cross-team tickets in a click. The engine underneath is
// unchanged — Start just calls the existing create + /run endpoints.

type Play = { workType: string; triggerStatus: string; tickets: TicketDef[] };

type Result = { name: string; created: { key: string; team: string }[]; warn?: string };

function plays(playbooks: Playbook[]): Play[] {
  return playbooks.flatMap((pb) =>
    pb.stages.map((s) => ({ workType: pb.workType, triggerStatus: s.triggerStatus, tickets: s.tickets }))
  );
}

export default function BlueprintsGallery({
  description,
  playbooks,
  canStart,
}: {
  description?: string;
  playbooks: Playbook[];
  canStart: boolean;
}) {
  const list = plays(playbooks);
  const [startFor, setStartFor] = useState<Play | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[]>([]);

  function openStart(p: Play) {
    setName("");
    setStartFor(p);
  }

  async function start() {
    if (!startFor || !name.trim()) return;
    setBusy(true);
    try {
      const launchDefaults = VIEW_BY_ID.launch?.defaults ?? {};
      // 1) Create the deliverable in the launch tracker (MW), staged at the
      //    status that triggers this play so it's ready to fire.
      const createRes = await fetch("/api/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: { ...launchDefaults, workType: startFor.workType, deliverable: name.trim(), status: startFor.triggerStatus },
        }),
      });
      const cd = await createRes.json().catch(() => null);
      if (!createRes.ok || !cd?.record) {
        setResults((r) => [{ name: name.trim(), created: [], warn: cd?.error || "Couldn’t create the deliverable." }, ...r]);
        setStartFor(null);
        return;
      }
      // 2) Fire the play — opens the cross-team tickets via the same endpoint
      //    the board's "Open tickets" button uses.
      const runRes = await fetch(`/api/launch/${cd.record.id}/run`, { method: "POST" });
      const rd = await runRes.json().catch(() => null);
      if (!runRes.ok || !rd?.created) {
        setResults((r) => [
          { name: name.trim(), created: [], warn: rd?.error || "Deliverable created, but tickets didn’t open." },
          ...r,
        ]);
      } else {
        setResults((r) => [{ name: name.trim(), created: rd.created }, ...r]);
      }
      setStartFor(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bp">
      <p className="view-desc">{description}</p>

      {results.length > 0 && (
        <div className="bp-results">
          {results.map((res, i) => (
            <div className={`bp-banner ${res.warn ? "warn" : "ok"}`} key={i}>
              <span className="bp-banner-text">
                {res.warn ? (
                  <>⚠️ <strong>{res.name}</strong> — {res.warn}</>
                ) : (
                  <>
                    ✅ Started <strong>{res.name}</strong> — opened {res.created.length} ticket
                    {res.created.length === 1 ? "" : "s"}: {res.created.map((c) => c.key).join(", ")}
                  </>
                )}
              </span>
              <button className="bp-banner-x" onClick={() => setResults((r) => r.filter((_, j) => j !== i))}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {!canStart && (
        <p className="bp-note">
          Browse the plays your team runs below. You need the “Create items” and “Run automations”
          permissions to start one from here.
        </p>
      )}

      <div className="bp-grid">
        {list.map((p) => (
          <div className="ab-card bp-card" key={`${p.workType}:${p.triggerStatus}`}>
            <div className="bp-card-body">
              <div className="bp-title">
                <span className="ab-pill" style={{ background: chipColor(p.workType) }}>{p.workType}</span>
                <span className="bp-title-text">play</span>
              </div>
              <p className="bp-lede">
                Starting a {p.workType} opens {p.tickets.length} ticket{p.tickets.length === 1 ? "" : "s"} across the
                right teams, pre-filled and ready.
              </p>
              <div className="bp-trigger">
                Fires when the deliverable hits <strong>{p.triggerStatus}</strong>
              </div>

              <div className="ab-tickets bp-tickets">
                {p.tickets.map((t, i) => {
                  const people = splitPeople(t.assignees ?? "");
                  return (
                    <div className="ab-ticket" key={i}>
                      <div className="ab-ticket-head">
                        <span className="team-chip" style={{ background: chipColor(t.team) }}>{t.team}</span>
                        <span className="ab-arrow">→</span>
                        <span className="bp-proj">{t.project}</span>
                        {people.length > 0 && (
                          <div className="avatars">
                            {people.map((person, j) => (
                              <span
                                key={person + j}
                                className="avatar"
                                style={{ background: avatarColor(person), zIndex: people.length - j }}
                                title={person}
                              >
                                {initials(person)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="ab-ticket-summary">{t.summary.replace("{deliverable}", "this item")}</div>
                      {t.dueHint && <div className="bp-due">⏱ {t.dueHint}</div>}
                      {t.checklist && t.checklist.length > 0 && (
                        <details className="ab-checklist">
                          <summary>{t.checklist.length} checklist items</summary>
                          <ul>{t.checklist.map((c, k) => <li key={k}>{c}</li>)}</ul>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {canStart && (
              <div className="bp-card-foot">
                <button className="btn btn-primary" onClick={() => openStart(p)}>
                  ⚡ Start a {p.workType}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {list.length === 0 && (
        <p className="bp-note">
          No plays defined yet. Create one in the ⚡ Automations tab and it will show up here as a blueprint.
        </p>
      )}

      {startFor && (
        <div className="modal-overlay" onClick={() => !busy && setStartFor(null)}>
          <div className="modal bp-start-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Start a {startFor.workType}</h2>
              <button className="modal-close" onClick={() => !busy && setStartFor(null)}>×</button>
            </div>
            <p className="modal-sub">
              Name the deliverable. We’ll add it to the launch tracker and open these {startFor.tickets.length} ticket
              {startFor.tickets.length === 1 ? "" : "s"} in each team’s Jira project. Nothing is created until you confirm.
            </p>

            <label className="bp-field">
              <span>Deliverable name</span>
              <input
                className="ab-input"
                autoFocus
                placeholder={`e.g. Q3 AI Observability ${startFor.workType}`}
                value={name}
                disabled={busy}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && start()}
              />
            </label>

            <div className="modal-body">
              {startFor.tickets.map((t, i) => {
                const summary = t.summary.replace("{deliverable}", name.trim() || `this ${startFor.workType}`);
                const people = splitPeople(t.assignees ?? "");
                return (
                  <div className="confirm-ticket" key={i}>
                    <div className="confirm-ticket-head">
                      <span className="team-chip" style={{ background: chipColor(t.team) }}>{t.team}</span>
                      <span className="confirm-proj">{t.project}</span>
                      <div className="avatars">
                        {people.map((person, j) => (
                          <span
                            key={person + j}
                            className="avatar"
                            style={{ background: avatarColor(person), zIndex: people.length - j }}
                            title={person}
                          >
                            {initials(person)}
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
              <button className="btn" onClick={() => setStartFor(null)} disabled={busy}>Cancel</button>
              <button className="btn btn-primary" onClick={start} disabled={busy || !name.trim()}>
                {busy ? "Starting…" : `⚡ Start & open ${startFor.tickets.length} ticket${startFor.tickets.length === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
