"use client";

import { useState } from "react";
import type { BoardAccess } from "@/lib/board-access";

// Per-board access panel: flip Public/Private, manage members (with a per-board
// role), block specific people, and clone another board's members.
const BOARD_ROLES = ["Viewer", "Contributor", "Editor", "Project Admin"];

export default function BoardAccessModal({
  boardId,
  boardLabel,
  access,
  deletable = false,
  otherBoards,
  onSetVisibility,
  onSetMember,
  onRemoveMember,
  onSetExclusion,
  onClone,
  onDelete,
  onClose,
}: {
  boardId: string;
  boardLabel: string;
  access?: BoardAccess;
  deletable?: boolean;
  otherBoards: { id: string; label: string }[];
  onSetVisibility: (visibility: "public" | "private") => void;
  onSetMember: (email: string, role: string) => void;
  onRemoveMember: (email: string) => void;
  onSetExclusion: (email: string, excluded: boolean) => void;
  onClone: (fromBoardId: string) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const visibility = access?.visibility ?? "public";
  const members = access?.members ?? {};
  const excluded = access?.excluded ?? [];

  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("Editor");
  const [blockEmail, setBlockEmail] = useState("");
  const [cloneFrom, setCloneFrom] = useState("");

  function addMember() {
    const e = memberEmail.trim();
    if (!e) return;
    onSetMember(e, memberRole);
    setMemberEmail("");
  }
  function addBlock() {
    const e = blockEmail.trim();
    if (!e) return;
    onSetExclusion(e, true);
    setBlockEmail("");
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal access-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Board access — {boardLabel}</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="modal-sub">
          Public boards are visible to everyone signed in. Private boards are visible only to the
          people you add here (plus Org Admins). Members can be given a higher role on this board
          than their default.
        </p>

        <div className="modal-body">
          {/* Visibility */}
          <div className="ba-section">
            <h3>Visibility</h3>
            <div className="ba-vis">
              <label className={visibility === "public" ? "active" : ""}>
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === "public"}
                  onChange={() => onSetVisibility("public")}
                />
                🌐 Public — anyone signed in can see this board
              </label>
              <label className={visibility === "private" ? "active" : ""}>
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === "private"}
                  onChange={() => onSetVisibility("private")}
                />
                🔒 Private — only people added below can see it
              </label>
            </div>
          </div>

          {/* Members */}
          <div className="ba-section">
            <h3>Members</h3>
            {Object.keys(members).length === 0 && <p className="cz-note">No members added yet.</p>}
            {Object.entries(members).map(([email, role]) => (
              <div className="pr-row" key={email}>
                <span className="pr-name">
                  <span className="pr-email">{email}</span>
                </span>
                <div className="pr-controls">
                  <select value={role} onChange={(e) => onSetMember(email, e.target.value)}>
                    {BOARD_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button className="pr-remove" title="Remove member" onClick={() => onRemoveMember(email)}>
                    ×
                  </button>
                </div>
              </div>
            ))}
            <div className="pr-add">
              <input
                value={memberEmail}
                placeholder="Add member by Okta email…"
                onChange={(e) => setMemberEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMember()}
              />
              <select value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
                {BOARD_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={addMember}>
                Add
              </button>
            </div>
          </div>

          {/* Exclusions */}
          <div className="ba-section">
            <h3>Blocked people</h3>
            <p className="cz-note">
              Always denied this board — overrides everything, including Co-Admins&apos;
              see-all-boards. Use this to keep a sensitive board (e.g. M&amp;A) off an admin&apos;s
              radar.
            </p>
            {excluded.map((email) => (
              <div className="pr-row" key={email}>
                <span className="pr-name">
                  <span className="pr-email">{email}</span>
                </span>
                <div className="pr-controls">
                  <button
                    className="pr-remove"
                    title="Unblock"
                    onClick={() => onSetExclusion(email, false)}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            <div className="pr-add">
              <input
                value={blockEmail}
                placeholder="Block someone by Okta email…"
                onChange={(e) => setBlockEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addBlock()}
              />
              <button className="btn btn-ghost" onClick={addBlock}>
                Block
              </button>
            </div>
          </div>

          {/* Clone */}
          {otherBoards.length > 0 && (
            <div className="ba-section">
              <h3>Clone members</h3>
              <p className="cz-note">Copy another board&apos;s members and blocks onto this one.</p>
              <div className="pr-add">
                <select value={cloneFrom} onChange={(e) => setCloneFrom(e.target.value)}>
                  <option value="">Choose a board…</option>
                  {otherBoards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-ghost"
                  disabled={!cloneFrom}
                  onClick={() => cloneFrom && onClone(cloneFrom)}
                >
                  Copy members here
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-foot">
          {deletable ? (
            <button
              className="btn btn-danger"
              onClick={() => {
                if (confirm(`Delete the board "${boardLabel}"? This removes the board and its rows.`)) {
                  onDelete();
                }
              }}
            >
              Delete board
            </button>
          ) : (
            <span className="modal-foot-note">Changes save immediately.</span>
          )}
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
