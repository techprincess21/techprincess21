import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { can, getIdentity } from "@/lib/auth";
import { addImportedBoard } from "@/lib/config-store";
import { getAdapter } from "@/lib/adapters";
import type { ColumnDef, FieldValue } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ROWS = 2000;
const MAX_COLS = 40;

// Turn the first sheet of a workbook into an array-of-arrays (row 0 = headers).
function sheetToAoa(wb: XLSX.WorkBook): string[][] {
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: "" }) as string[][];
}

function aoaFromFile(dataBase64: string): string[][] {
  const buf = Buffer.from(dataBase64, "base64");
  return sheetToAoa(XLSX.read(buf, { type: "buffer" }));
}

async function aoaFromGsheet(url: string): Promise<string[][]> {
  const id = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
  if (!id) throw new Error("That doesn't look like a Google Sheets link.");
  const gid = url.match(/[#&?]gid=(\d+)/)?.[1];
  const exportUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? `&gid=${gid}` : ""}`;
  const res = await fetch(exportUrl, { redirect: "follow", cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Couldn't open that sheet (${res.status}). Turn on link sharing ("Anyone with the link can view").`);
  }
  const text = await res.text();
  if (text.trimStart().startsWith("<")) {
    throw new Error("That sheet isn't viewable by link. Set sharing to \"Anyone with the link can view\" and try again.");
  }
  return sheetToAoa(XLSX.read(text, { type: "string" }));
}

// Make a safe, unique field key from a header label.
function keyFor(label: string, index: number, used: Set<string>): string {
  let base = String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!base) base = `col_${index + 1}`;
  let key = base;
  let n = 2;
  while (used.has(key)) key = `${base}_${n++}`;
  used.add(key);
  return key;
}

// Pick the header row. Many real-world sheets have a title/dashboard band above
// the actual table (a project name, "Key Moments", etc.), so row 0 isn't always
// the header. Heuristic: within the first 25 rows, the header is the densest row
// (most non-empty cells), earliest on a tie — which is row 0 for a clean sheet,
// but the true header row for a sheet with a banner on top. Falls back to row 0.
function pickHeaderRow(aoa: string[][]): number {
  const scan = Math.min(aoa.length, 25);
  const nonEmpty = (r: string[]) =>
    r.reduce((n, c) => n + (String(c ?? "").trim() !== "" ? 1 : 0), 0);
  let best = 0;
  let bestCount = -1;
  for (let i = 0; i < scan; i++) {
    const c = nonEmpty(aoa[i] ?? []);
    if (c > bestCount) {
      bestCount = c;
      best = i;
    }
  }
  // Need real headers and at least one row beneath them; otherwise use row 0.
  if (bestCount < 2 || best >= aoa.length - 1) return 0;
  return best;
}

export async function POST(req: Request) {
  if (!(await can("project.create"))) {
    return NextResponse.json({ error: "You don't have permission to create boards." }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const visibility = body?.visibility === "private" ? "private" : "public";

  let aoa: string[][];
  try {
    if (body?.kind === "gsheet" && typeof body.url === "string") {
      aoa = await aoaFromGsheet(body.url);
    } else if (body?.kind === "file" && typeof body.dataBase64 === "string") {
      aoa = aoaFromFile(body.dataBase64);
    } else {
      return NextResponse.json({ error: "Provide a file or a Google Sheets link." }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't read that file." }, { status: 400 });
  }

  if (aoa.length < 2) {
    return NextResponse.json({ error: "The sheet needs a header row and at least one row of data." }, { status: 400 });
  }

  // Find the real header row (skipping any title/dashboard band on top) and take
  // the rows beneath it as data.
  const headerIdx = pickHeaderRow(aoa);
  const header = (aoa[headerIdx] ?? []).slice(0, MAX_COLS);
  const dataRows = aoa.slice(headerIdx + 1, headerIdx + 1 + MAX_ROWS);
  const hasData = dataRows.some((r) => r.some((c) => String(c ?? "").trim() !== ""));
  if (header.length === 0 || !hasData) {
    return NextResponse.json(
      { error: "Couldn't find a header row with data beneath it. Make sure the sheet has column headers and at least one row under them." },
      { status: 400 }
    );
  }

  // Drop spacer columns that are entirely empty (no header text and no data).
  const colCount = Math.min(MAX_COLS, Math.max(header.length, ...dataRows.map((r) => r.length)));
  const keep: number[] = [];
  for (let j = 0; j < colCount; j++) {
    const headerHas = String(header[j] ?? "").trim() !== "";
    const dataHas = dataRows.some((r) => String(r[j] ?? "").trim() !== "");
    if (headerHas || dataHas) keep.push(j);
  }

  const used = new Set<string>();
  const columns: ColumnDef[] = keep.map((j, i) => ({
    key: keyFor(String(header[j] ?? ""), j, used),
    label: String(header[j] ?? "").trim() || `Column ${j + 1}`,
    type: "text",
    width: i === 0 ? 280 : 160,
  }));

  const label =
    (typeof body?.label === "string" && body.label.trim()) ||
    (typeof body?.filename === "string" && body.filename.replace(/\.[^.]+$/, "").trim()) ||
    "Imported board";

  const me = await getIdentity();
  const { cfg, id } = await addImportedBoard({ label, columns, owner: me.id, visibility });

  // Create the data rows.
  const adapter = getAdapter();
  let imported = 0;
  for (const row of dataRows) {
    if (keep.every((j) => String(row[j] ?? "").trim() === "")) continue; // skip blank lines
    const fields: { [key: string]: FieldValue } = {};
    columns.forEach((col, i) => {
      fields[col.key] = row[keep[i]] != null ? String(row[keep[i]]) : "";
    });
    await adapter.create(id, fields);
    imported++;
  }

  return NextResponse.json({ config: cfg, boardId: id, imported, columns: columns.length });
}
