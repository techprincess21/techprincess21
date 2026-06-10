// Role-Based Access Control model (Model A: app-enforced RBAC over a Jira
// service account). Pure data + helpers — safe to import on client and server.
//
// Permissions are granular; roles are editable bundles of permissions; users
// are assigned a role. Today the "users" are demo identities selected via a dev
// switcher; once Okta SSO is wired up, identity + group membership come from the
// verified OIDC token instead, and Okta groups map to these roles.

export interface PermissionDef {
  key: string;
  label: string;
  group: string;
}

export const PERMISSION_CATALOG: PermissionDef[] = [
  { key: "board.view", label: "View boards", group: "View" },
  { key: "watcher.self", label: "Add self as watcher", group: "View" },
  { key: "item.status.edit", label: "Change statuses", group: "Edit items" },
  { key: "item.people.assign", label: "Assign / tag people", group: "Edit items" },
  { key: "item.fields.edit", label: "Edit other fields", group: "Edit items" },
  { key: "item.create", label: "Create items", group: "Edit items" },
  { key: "item.delete", label: "Delete items", group: "Edit items" },
  { key: "board.reorder", label: "Reorder rows", group: "Boards" },
  { key: "board.customize", label: "Customize boards (choices, colors, columns, tabs)", group: "Boards" },
  { key: "project.create", label: "Create projects / boards", group: "Admin" },
  { key: "automation.run", label: "Run automations", group: "Admin" },
  { key: "roles.manage", label: "Manage roles & access", group: "Admin" },
];

export const ALL_PERMS = PERMISSION_CATALOG.map((p) => p.key);

const VIEWER = ["board.view", "watcher.self"];
const CONTRIBUTOR = [...VIEWER, "item.status.edit", "item.people.assign"];
const EDITOR = [
  ...CONTRIBUTOR,
  "item.fields.edit",
  "item.create",
  "item.delete",
  "board.reorder",
  "board.customize",
];
const PROJECT_ADMIN = [...EDITOR, "project.create", "automation.run"];

export const DEFAULT_ROLES: { [role: string]: string[] } = {
  Viewer: VIEWER,
  Contributor: CONTRIBUTOR,
  Editor: EDITOR,
  "Project Admin": PROJECT_ADMIN,
  "Org Admin": [...ALL_PERMS],
};

export const ROLE_LIST = ["Viewer", "Contributor", "Editor", "Project Admin", "Org Admin"];

// Map a user's Okta groups to a role. Matches group names loosely against role
// names (e.g. "Goatsana-Org-Admins" -> "Org Admin"), picking the highest
// privilege the user qualifies for; defaults to Viewer.
export function groupsToRole(groups: string[]): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const g = (groups ?? []).map(norm);
  for (const role of [...ROLE_LIST].reverse()) {
    const r = norm(role);
    if (g.some((x) => x.includes(r))) return role;
  }
  return "Viewer";
}

export interface DemoUser {
  id: string;
  name: string;
  email?: string;
}

// Stand-in identities (replaced by Okta-provided identities later).
export const DEMO_USERS: DemoUser[] = [
  { id: "u_admin", name: "Abby Strong", email: "abbylstrong@gmail.com" },
  { id: "u_pm", name: "Felicia Dorng" },
  { id: "u_editor", name: "Bill Emmett" },
  { id: "u_contributor", name: "Rachael Dula" },
  { id: "u_viewer", name: "Joanna Zheng" },
];

export const DEFAULT_USER_ROLES: { [userId: string]: string } = {
  u_admin: "Org Admin",
  u_pm: "Project Admin",
  u_editor: "Editor",
  u_contributor: "Contributor",
  u_viewer: "Viewer",
};

export const DEFAULT_USER_ID = "u_admin";

// Which field on each collection represents its workflow status.
export const STATUS_FIELD: { [collection: string]: string } = {
  content: "stage",
  launch: "status",
  tickets: "status",
};

export const PERSON_FIELDS = new Set([
  "owner",
  "responsible",
  "gtmLead",
  "pmm",
  "assignee",
  "primaryPMM",
  "secondaryPMM",
  "watchers",
]);

// Classify a field-edit PATCH into the permission it requires.
export function permissionForPatch(collection: string, fieldKeys: string[]): string {
  const sf = STATUS_FIELD[collection];
  if (fieldKeys.length > 0 && sf && fieldKeys.every((k) => k === sf)) return "item.status.edit";
  if (fieldKeys.length > 0 && fieldKeys.every((k) => PERSON_FIELDS.has(k))) return "item.people.assign";
  return "item.fields.edit";
}
