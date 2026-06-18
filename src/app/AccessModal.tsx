"use client";

import { useState } from "react";
import { PERMISSION_CATALOG, ROLE_LIST } from "@/lib/rbac";

// Org Admin surface to (a) edit which permissions each role has and (b) add
// people and assign them roles. Persists immediately via the parent's callbacks.
const PROTECTED_ROLES = new Set(["Org Admin", "Co-Admin"]);

export default function AccessModal({
  roles,
  userRoles,
  users,
  meRole,
  onSaveRole,
  onSaveUserRole,
  onAddUser,
  onRemoveUser,
  onClose,
}: {
  roles: { [role: string]: string[] };
  userRoles: { [userId: string]: string };
  users: { id: string; name: string; role?: string; via?: "okta" }[];
  meRole: string;
  onSaveRole: (role: string, permissions: string[]) => void;
  onSaveUserRole: (userId: string, role: string) => void;
  onAddUser: (name: string, email?: string) => void;
  onRemoveUser: (id: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"roles" | "people">("roles");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const isOrgAdmin = meRole === "Org Admin";

  function togglePerm(role: string, key: string) {
    const current = roles[role] ?? [];
    const next = current.includes(key) ? current.filter((p) => p !== key) : [...current, key];
    onSaveRole(role, next);
  }

  function addPerson() {
    const n = newName.trim();
    if (!n) return;
    onAddUser(n, newEmail.trim() || undefined);
    setNewName("");
    setNewEmail("");
  }

  const allPeople = users;

  // group the catalog for display
  const groups = [...new Set(PERMISSION_CATALOG.map((p) => p.group))];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal access-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Roles &amp; Access</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="modal-sub">
          Define what each role can do, and assign people to roles. Okta is just the front gate:
          everyone who signs in is a <strong>Viewer</strong> until you give them a higher role here.
        </p>

        <div className="access-tabs">
          <button className={tab === "roles" ? "active" : ""} onClick={() => setTab("roles")}>
            Role permissions
          </button>
          <button className={tab === "people" ? "active" : ""} onClick={() => setTab("people")}>
            People &amp; roles
          </button>
        </div>

        <div className="modal-body">
          {tab === "roles" ? (
            <div className="perm-grid-wrap">
              <table className="perm-grid">
                <thead>
                  <tr>
                    <th className="perm-name">Permission</th>
                    {ROLE_LIST.map((r) => (
                      <th key={r}>{r}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <PermGroup
                      key={g}
                      group={g}
                      roles={roles}
                      onToggle={togglePerm}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="people-roles">
              {allPeople.length === 0 && (
                <p className="cz-note">
                  No one has signed in yet. People appear here automatically the first time they
                  sign in with Okta — or add someone by email below to pre-assign their role.
                </p>
              )}
              {allPeople.map((u) => {
                // Explicit in-app override wins; otherwise show the role they
                // resolved to at last Okta sign-in; otherwise Viewer.
                const hasOverride = userRoles[u.id] != null;
                const role = userRoles[u.id] ?? u.role ?? "Viewer";
                const locked = PROTECTED_ROLES.has(role) && !isOrgAdmin;
                const isEmail = u.id.includes("@");
                return (
                  <div className="pr-row" key={u.id}>
                    <span className="pr-name">
                      <span className="pr-name-line">
                        {u.name}
                        {u.via === "okta" && (
                          <span className="pr-badge" title="Signed in via Okta">Okta</span>
                        )}
                      </span>
                      {isEmail && <span className="pr-email">{u.id}</span>}
                      {!hasOverride && (
                        <span className="pr-role-src">default — set a role to elevate</span>
                      )}
                    </span>
                    <div className="pr-controls">
                      <select
                        value={role}
                        disabled={locked}
                        title={locked ? "Only an Org Admin can change this person's role" : undefined}
                        onChange={(e) => onSaveUserRole(u.id, e.target.value)}
                      >
                        {ROLE_LIST.map((r) => (
                          <option key={r} value={r} disabled={PROTECTED_ROLES.has(r) && !isOrgAdmin}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <button
                        className="pr-remove"
                        title={locked ? "Only an Org Admin can remove this person" : "Remove person"}
                        disabled={locked}
                        onClick={() => onRemoveUser(u.id)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="pr-add">
                <input
                  value={newName}
                  placeholder="Name…"
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPerson()}
                />
                <input
                  value={newEmail}
                  placeholder="Okta email (optional)…"
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPerson()}
                />
                <button className="btn btn-primary" onClick={addPerson}>
                  Add person
                </button>
              </div>
              <p className="cz-note">
                Everyone who signs in via Okta starts as a <strong>Viewer</strong> and appears here
                automatically — give them a higher role above. You can also add someone by their{" "}
                <strong>Okta email</strong> to pre-assign a role before they ever sign in; it applies
                automatically on first login.
              </p>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <span className="modal-foot-note">Changes apply on close.</span>
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function PermGroup({
  group,
  roles,
  onToggle,
}: {
  group: string;
  roles: { [role: string]: string[] };
  onToggle: (role: string, key: string) => void;
}) {
  const perms = PERMISSION_CATALOG.filter((p) => p.group === group);
  return (
    <>
      <tr className="perm-group-row">
        <td colSpan={ROLE_LIST.length + 1}>{group}</td>
      </tr>
      {perms.map((p) => (
        <tr key={p.key}>
          <td className="perm-name">{p.label}</td>
          {ROLE_LIST.map((r) => {
            const checked = (roles[r] ?? []).includes(p.key);
            const isOrgAdmin = r === "Org Admin";
            return (
              <td key={r} className="perm-cell">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isOrgAdmin}
                  title={isOrgAdmin ? "Org Admin always has all permissions" : undefined}
                  onChange={() => onToggle(r, p.key)}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
