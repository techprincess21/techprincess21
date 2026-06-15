"use client";

import type { NotifyPref } from "@/lib/notify";

// Each person chooses which events reach them as a Slack DM. Defaults to on.
export default function NotificationsModal({
  prefs,
  slackConfigured,
  signedInEmail,
  onSetPref,
  onClose,
}: {
  prefs: NotifyPref;
  slackConfigured: boolean;
  signedInEmail: string | null;
  onSetPref: (key: "assigned" | "status" | "due", value: boolean) => void;
  onClose: () => void;
}) {
  const assigned = prefs.assigned !== false;
  const status = prefs.status !== false;
  const due = prefs.due !== false;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal access-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Notifications</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="modal-sub">
          Choose what you want to hear about. When connected, these arrive as Slack DMs (like the
          Jira Slackbot).
        </p>

        <div className="modal-body">
          <label className="nb-check">
            <input type="checkbox" checked={assigned} onChange={(e) => onSetPref("assigned", e.target.checked)} />
            <span>
              <strong>When I&apos;m assigned</strong> — someone sets me as the owner of an item.
            </span>
          </label>
          <label className="nb-check">
            <input type="checkbox" checked={status} onChange={(e) => onSetPref("status", e.target.checked)} />
            <span>
              <strong>Status changes on my items</strong> — an item I own moves to a new status.
            </span>
          </label>
          <label className="nb-check">
            <input type="checkbox" checked={due} onChange={(e) => onSetPref("due", e.target.checked)} />
            <span>
              <strong>Due-date reminders</strong> — a daily nudge about my items due soon or overdue.
            </span>
          </label>

          {!slackConfigured && (
            <p className="cz-note" style={{ marginTop: 16 }}>
              ⚙️ Slack delivery isn&apos;t connected yet — IT needs to add the Goatsana Slack app.
              Your choices here are saved and take effect the moment it&apos;s connected.
            </p>
          )}
          {slackConfigured && !signedInEmail && (
            <p className="cz-note" style={{ marginTop: 16 }}>
              Sign in with Okta so we can match you to your Slack account by email.
            </p>
          )}
        </div>

        <div className="modal-foot">
          <span className="modal-foot-note">Saved automatically.</span>
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
