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
  { key: "project.delete", label: "Delete boards", group: "Admin" },
  { key: "automation.run", label: "Run automations", group: "Admin" },
  { key: "board.access.manage", label: "Manage board members & visibility", group: "Admin" },
  { key: "board.viewAll", label: "See all boards (incl. private)", group: "Admin" },
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
const PROJECT_ADMIN = [...EDITOR, "project.create", "project.delete", "automation.run", "board.access.manage"];
// Co-Admin holds every permission, like Org Admin. The differences are policy,
// not permissions: a Co-Admin can be excluded from specific boards (see the
// per-board access design) and cannot remove or demote an Org Admin.
const CO_ADMIN = [...ALL_PERMS];

export const DEFAULT_ROLES: { [role: string]: string[] } = {
  Viewer: VIEWER,
  Contributor: CONTRIBUTOR,
  Editor: EDITOR,
  "Project Admin": PROJECT_ADMIN,
  "Co-Admin": CO_ADMIN,
  "Org Admin": [...ALL_PERMS],
};

// Ordered low→high privilege. Used to order the role picker in the access panel.
export const ROLE_LIST = ["Viewer", "Contributor", "Editor", "Project Admin", "Co-Admin", "Org Admin"];

// NOTE: Okta is intentionally only the front gate. Authenticating via Okta does
// not confer any role — everyone who signs in is a Viewer by default, and roles
// are assigned explicitly inside Goatsana (plus the ADMIN_EMAILS bootstrap admin).
// There is deliberately no Okta-group → role mapping.

export interface DemoUser {
  id: string;
  name: string;
  email?: string;
}

// In production, identities come from Okta. This single fallback identity exists
// only for local development with DEV_LOGIN=true (it is never shown in the Okta
// app, the access panel, or the dev switcher's people list).
export const DEMO_USERS: DemoUser[] = [{ id: "u_admin", name: "Local Admin" }];

export const DEFAULT_USER_ROLES: { [userId: string]: string } = {
  u_admin: "Org Admin",
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
