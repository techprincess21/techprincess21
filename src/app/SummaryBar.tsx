"use client";

import type { Record } from "@/lib/types";

// CMO-level project overview: a row of widgets across the top of a board —
// target launch date, overall health, progress, items needing attention, and
// the next upcoming milestone. Computed from the board's deliverables.

const MONTHS: { [m: string]: number } = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

// Parse loose date strings like "Wed, Mar. 11" / "May 7" -> sortable m*100+d.
function dateKey(s: unknown): number | null {
  const m = String(s ?? "").match(/([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})/);
  if (!m) return null;
  const mon = MONTHS[m[1].toLowerCase()];
  if (!mon) return null;
  return mon * 100 + parseInt(m[2], 10);
}

const norm = (s: unknown) => String(s ?? "").toLowerCase().trim();
const LAUNCH_RE = /go.?live|launch|\bga\b|\bato\b|\blive\b/i;
const ATTENTION = new Set(["at risk", "blocked", "in progress - review"]);

export default function SummaryBar({ records }: { records: Record[] }) {
  const recs = records.filter((r) => r.fields.deliverable);
  const total = recs.length;
  if (total === 0) return null;

  const completed = recs.filter((r) => norm(r.fields.status) === "completed").length;
  const notStarted = recs.filter((r) => norm(r.fields.status) === "not started").length;
  const inProgress = total - completed - notStarted;
  const pct = Math.round((completed / total) * 100);
  const attention = recs.filter((r) => ATTENTION.has(norm(r.fields.status)));

  // Target launch: the latest dated deliverable that reads like a go-live.
  const dated = (arr: Record[]) =>
    [...arr]
      .filter((r) => dateKey(r.fields.finalDate) != null)
      .sort((a, b) => (dateKey(b.fields.finalDate) ?? 0) - (dateKey(a.fields.finalDate) ?? 0));
  const launchCands = dated(recs.filter((r) => LAUNCH_RE.test(String(r.fields.deliverable ?? ""))));
  const launch = launchCands[0] ?? dated(recs)[0];

  // Next milestone: earliest upcoming not-yet-done deliverable.
  const now = new Date();
  const todayKey = (now.getMonth() + 1) * 100 + now.getDate();
  const upcoming = recs
    .filter((r) => norm(r.fields.status) !== "completed" && dateKey(r.fields.finalDate) != null)
    .map((r) => ({ r, k: dateKey(r.fields.finalDate) as number }))
    .sort((a, b) => a.k - b.k);
  const next = (upcoming.find((x) => x.k >= todayKey) ?? upcoming[0])?.r;

  const health = attention.length > 0 ? "Needs attention" : pct === 100 ? "Complete" : "On track";
  const healthClass = attention.length > 0 ? "warn" : pct === 100 ? "done" : "ok";

  return (
    <div className="summary-bar">
      <div className="sw sw-launch">
        <div className="sw-label">🎯 Target launch</div>
        <div className="sw-big">{launch?.fields.finalDate ? String(launch.fields.finalDate) : "TBD"}</div>
        {launch && <div className="sw-sub">{String(launch.fields.deliverable)}</div>}
      </div>

      <div className="sw">
        <div className="sw-label">Health</div>
        <div className={`sw-health ${healthClass}`}>{health}</div>
        <div className="sw-sub">{pct}% complete</div>
        <div className="sw-bar">
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="sw">
        <div className="sw-label">Progress</div>
        <div className="sw-counts">
          <span className="sw-count done">{completed} done</span>
          <span className="sw-count prog">{inProgress} in progress</span>
          <span className="sw-count todo">{notStarted} not started</span>
        </div>
      </div>

      <div className={`sw ${attention.length > 0 ? "sw-alert" : ""}`}>
        <div className="sw-label">Needs attention</div>
        <div className="sw-big">{attention.length}</div>
        <div className="sw-sub">
          {attention.length === 0 ? "All clear 🎉" : attention.slice(0, 2).map((r) => String(r.fields.deliverable)).join("; ")}
          {attention.length > 2 ? ` +${attention.length - 2} more` : ""}
        </div>
      </div>

      <div className="sw">
        <div className="sw-label">Next milestone</div>
        {next ? (
          <>
            <div className="sw-mid">{String(next.fields.deliverable)}</div>
            <div className="sw-sub">{String(next.fields.finalDate ?? "")}</div>
          </>
        ) : (
          <div className="sw-sub">Nothing upcoming</div>
        )}
      </div>
    </div>
  );
}
