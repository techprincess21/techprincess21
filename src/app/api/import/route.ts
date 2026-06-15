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

  const rawHeaders = aoa[0].slice(0, MAX_COLS);
  const used = new Set<string>();
  const columns: ColumnDef[] = rawHeaders.map((h, i) => ({
    key: keyFor(h, i, used),
    label: String(h || `Column ${i + 1}`).trim() || `Column ${i + 1}`,
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
  const dataRows = aoa.slice(1, MAX_ROWS + 1);
  let imported = 0;
  for (const row of dataRows) {
    if (row.every((c) => String(c ?? "").trim() === "")) continue; // skip blank lines
    const fields: { [key: string]: FieldValue } = {};
    columns.forEach((col, i) => {
      fields[col.key] = row[i] != null ? String(row[i]) : "";
    });
    await adapter.create(id, fields);
    imported++;
  }

  return NextResponse.json({ config: cfg, boardId: id, imported, columns: columns.length });
}
