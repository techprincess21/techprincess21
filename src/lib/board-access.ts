// Per-board access control — pure helpers shared by the server (API routes) and
// the client (tab filtering, edit gating). No server-only imports here.
//
// Model (see docs/RBAC-DESIGN.md): each data board is Public or Private. Public
// boards are visible to anyone who can view boards; Private boards are visible
// only to their owner/members (plus Org Admins always, and Co-Admins via
// "see all boards" — unless explicitly excluded). Board membership can also
// elevate a person's role on that one board.

export interface BoardAccess {
  owner?: string; // email of the board's owner/creator
  visibility: "public" | "private";
  members: { [email: string]: string }; // email -> board role
  excluded: string[]; // emails explicitly blocked (overrides Co-Admin see-all)
}

export type BoardsConfig = { [boardId: string]: BoardAccess };

// Minimal identity shape both the client `me` and server `Identity` satisfy.
export interface AccessIdentity {
  id: string; // email (lowercased) for Okta users
  role: string;
  perms: string[];
}

// The boards that support Public/Private (each one's view id equals its
// collection id). The Automations tab is a builder tool, not a data board.
export const DATA_BOARD_IDS = ["content", "launch", "okr", "quarterPlan", "topicOwners"];

// Which board a data collection belongs to. Tickets are launch children, so they
// inherit the Launch board's access.
export function boardIdForCollection(collection: string): string | null {
  if (collection === "tickets") return "launch";
  if (DATA_BOARD_IDS.includes(collection)) return collection;
  return null;
}

function defaultAccess(): BoardAccess {
  return { visibility: "public", members: {}, excluded: [] };
}

// Can this person see this board at all?
export function canSeeBoard(me: AccessIdentity, boardId: string, boards: BoardsConfig): boolean {
  if (me.role === "Org Admin") return true; // superuser, never excludable
  const b = boards[boardId] ?? defaultAccess();
  if (b.excluded.includes(me.id)) return false; // exclusion beats Co-Admin see-all
  if (b.visibility === "public") return me.perms.includes("board.view");
  if (b.owner === me.id) return true;
  if (Object.prototype.hasOwnProperty.call(b.members, me.id)) return true;
  if (me.perms.includes("board.viewAll")) return true; // Co-Admin
  return false;
}

// The permissions a person effectively has on a board: their base role, unioned
// with anything their board membership (or ownership) grants on this board.
export function effectiveBoardPerms(
  me: AccessIdentity,
  boardId: string,
  boards: BoardsConfig,
  roles: { [role: string]: string[] }
): string[] {
  // Org Admin / Co-Admin already carry all permissions in their base set.
  if (me.role === "Org Admin" || me.perms.includes("board.viewAll")) return me.perms;
  const b = boards[boardId] ?? defaultAccess();
  const set = new Set(me.perms);
  const memberRole = b.members[me.id];
  if (memberRole && roles[memberRole]) roles[memberRole].forEach((p) => set.add(p));
  if (b.owner === me.id && roles["Project Admin"]) roles["Project Admin"].forEach((p) => set.add(p));
  return [...set];
}

// Can this person manage a board's access (visibility, members, exclusions)?
export function canManageBoardAccess(me: AccessIdentity, boardId: string, boards: BoardsConfig): boolean {
  if (me.role === "Org Admin") return true;
  if (me.perms.includes("board.viewAll") && me.perms.includes("board.access.manage")) return true; // Co-Admin
  const b = boards[boardId] ?? defaultAccess();
  if (b.owner === me.id) return true; // owners manage their own board
  if (b.members[me.id] === "Project Admin" && me.perms.includes("board.access.manage")) return true;
  return false;
}

export function boardVisibility(boardId: string, boards: BoardsConfig): "public" | "private" {
  return boards[boardId]?.visibility ?? "public";
}
