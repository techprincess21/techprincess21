// Monday.com-style color system: status values render as solid colored chips,
// groups get a color rail, and people get colored avatars.

// Monday's status palette.
export const PALETTE = [
  "#0086c0", // blue
  "#a25ddc", // purple
  "#fdab3d", // orange
  "#00c875", // green
  "#e2445c", // red
  "#579bfc", // light blue
  "#037f4c", // dark green
  "#ff5ac4", // pink
  "#784bd1", // indigo
  "#9cd326", // lime
  "#ff642e", // dark orange
  "#225091", // navy
];

export const GROUP_COLORS = [
  "#0086c0",
  "#00c875",
  "#a25ddc",
  "#fdab3d",
  "#e2445c",
  "#579bfc",
  "#037f4c",
  "#ff5ac4",
];

const GREY = "#c4c4c4";

// Semantic overrides so meaningful statuses get intuitive colors
// (Done = green, Stuck/High = red, Working/Medium = orange, etc.).
const SEMANTIC: { [value: string]: string } = {
  complete: "#00c875",
  completed: "#00c875",
  done: "#00c875",
  current: "#00c875",
  // launch workback statuses
  "in progress - on track": "#0086c0",
  "in progress - review": "#a25ddc",
  ongoing: "#fdab3d",
  scheduled: "#579bfc",
  "not started": "#c4c4c4",
  // generated ticket states
  "to do": "#c4c4c4",
  "in progress": "#fdab3d",
  // work types
  webinar: "#ff5ac4",
  // launch moment tags
  "pre-la": "#9aadbd",
  la: "#579bfc",
  "pre-launch": "#9aadbd",
  cko: "#a25ddc",
  "pre-cko": "#c9b3ec",
  "post-cko": "#784bd1",
  ga: "#00c875",
  "pre-ga": "#9cd326",
  launch: "#ff642e",
  "post launch": "#0086c0",
  "with marketing strat": "#fdab3d",
  "recommendations created": "#a25ddc",
  planning: "#579bfc",
  new: "#0086c0",
  // priority levels
  "1. high": "#e2445c",
  high: "#e2445c",
  "2. medium": "#fdab3d",
  medium: "#fdab3d",
  "3. low": "#579bfc",
  low: "#579bfc",
  p0: "#e2445c",
  p1: "#fdab3d",
  p2: "#579bfc",
  // buckets / types
  strategic: "#a25ddc",
  campaign: "#fdab3d",
  visibility: "#0086c0",
  core: "#0086c0",
  // search
  llm: "#784bd1",
  both: "#0086c0",
};

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function chipColor(value: string): string {
  const v = value.trim().toLowerCase();
  if (!v) return GREY;
  if (SEMANTIC[v]) return SEMANTIC[v];
  return PALETTE[hash(v) % PALETTE.length];
}

export function avatarColor(name: string): string {
  const v = name.trim();
  if (!v) return GREY;
  return PALETTE[hash(v) % PALETTE.length];
}

export function groupColor(index: number): string {
  return GROUP_COLORS[index % GROUP_COLORS.length];
}

// "Bill, Carlo" / "Alex / PMM" -> distinct person tokens.
export function splitPeople(value: string): string[] {
  return value
    .split(/[,/&]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
