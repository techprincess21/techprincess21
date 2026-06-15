"use client";

import { useState } from "react";
import { DEMO_USERS, PERMISSION_CATALOG, ROLE_LIST } from "@/lib/rbac";

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
  users: { id: string; name: string }[];
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

  const builtinIds = new Set(DEMO_USERS.map((u) => u.id));
  const allPeople = [...DEMO_USERS, ...users];

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
          Define what each role can do, and assign people to roles. People sign in with Okta;
          their Okta groups set a default role, and anything you set here overrides it per person.
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
              {allPeople.map((u) => {
                const role = userRoles[u.id] ?? "Viewer";
                const locked = PROTECTED_ROLES.has(role) && !isOrgAdmin;
                const isEmail = u.id.includes("@");
                return (
                  <div className="pr-row" key={u.id}>
                    <span className="pr-name">
                      {u.name}
                      {isEmail && <span className="pr-email">{u.id}</span>}
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
                      {builtinIds.has(u.id) ? (
                        <span className="pr-tag">demo</span>
                      ) : (
                        <button
                          className="pr-remove"
                          title={locked ? "Only an Org Admin can remove this person" : "Remove person"}
                          disabled={locked}
                          onClick={() => onRemoveUser(u.id)}
                        >
                          ×
                        </button>
                      )}
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
                New people start as Viewer — set their role above. Add a person by their{" "}
                <strong>Okta email</strong> to pre-assign a role before they ever sign in; their
                role then applies automatically on first login (and overrides their Okta-group
                default). Okta groups still set the default for everyone you don&apos;t list here.
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
