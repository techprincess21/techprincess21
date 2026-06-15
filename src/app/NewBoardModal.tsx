"use client";

import { useState } from "react";
import { BOARD_TEMPLATES } from "@/lib/board-templates";

export interface CreateBoardOpts {
  label: string;
  visibility: "public" | "private";
  templateKey?: string;
  sourceBoardId?: string;
  copyRows?: boolean;
  copyMembers?: boolean;
}

// Create a new board — either from a starting template, or by cloning an
// existing board (its columns, and optionally its rows and members). You become
// the new board's owner.
export default function NewBoardModal({
  cloneSources,
  onCreate,
  onImport,
  onClose,
}: {
  cloneSources: { id: string; label: string }[];
  onCreate: (opts: CreateBoardOpts) => void;
  onImport: (opts: { label: string; visibility: "public" | "private"; file?: File; gsheetUrl?: string }) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<"template" | "clone" | "import">("template");
  const [templateKey, setTemplateKey] = useState(BOARD_TEMPLATES[0].key);
  const [sourceBoardId, setSourceBoardId] = useState(cloneSources[0]?.id ?? "");
  const [copyRows, setCopyRows] = useState(false);
  const [copyMembers, setCopyMembers] = useState(true);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [file, setFile] = useState<File | null>(null);
  const [gsheetUrl, setGsheetUrl] = useState("");

  const canClone = cloneSources.length > 0;
  const importReady = Boolean(file || gsheetUrl.trim());
  const canSubmit = mode === "import" ? importReady : Boolean(label.trim());

  function create() {
    if (mode === "import") {
      if (!importReady) return;
      onImport({ label: label.trim(), visibility, file: file ?? undefined, gsheetUrl: gsheetUrl.trim() || undefined });
      return;
    }
    const l = label.trim();
    if (!l) return;
    if (mode === "clone") {
      if (!sourceBoardId) return;
      onCreate({ label: l, visibility, sourceBoardId, copyRows, copyMembers });
    } else {
      onCreate({ label: l, visibility, templateKey });
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal access-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>New board</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="modal-sub">
          Start from a template, or copy an existing board. You can customize everything afterward,
          and you&apos;ll be the new board&apos;s owner.
        </p>

        <div className="modal-body">
          <div className="ba-section">
            <h3>Name</h3>
            <input
              className="nb-input"
              value={label}
              autoFocus
              placeholder={mode === "import" ? "Optional — defaults to the file / sheet name" : "e.g. Q3 Webinars, M&A Project…"}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
          </div>

          <div className="ba-section">
            <h3>Start from</h3>
            <div className="ba-vis">
              <label className={mode === "template" ? "active" : ""}>
                <input type="radio" name="mode" checked={mode === "template"} onChange={() => setMode("template")} />
                A template
              </label>
              <label className={`${mode === "clone" ? "active" : ""} ${!canClone ? "nb-disabled" : ""}`}>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "clone"}
                  disabled={!canClone}
                  onChange={() => setMode("clone")}
                />
                Copy an existing board{!canClone && " (none yet)"}
              </label>
              <label className={mode === "import" ? "active" : ""}>
                <input type="radio" name="mode" checked={mode === "import"} onChange={() => setMode("import")} />
                Import a spreadsheet (CSV, Excel, or Google Sheets)
              </label>
            </div>
          </div>

          {mode === "template" && (
            <div className="ba-section">
              <h3>Template</h3>
              <div className="nb-templates">
                {BOARD_TEMPLATES.map((t) => (
                  <label key={t.key} className={`nb-template ${templateKey === t.key ? "active" : ""}`}>
                    <input
                      type="radio"
                      name="template"
                      checked={templateKey === t.key}
                      onChange={() => setTemplateKey(t.key)}
                    />
                    <span className="nb-template-label">{t.label}</span>
                    <span className="nb-template-blurb">{t.blurb}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {mode === "clone" && (
            <div className="ba-section">
              <h3>Copy from</h3>
              <select className="nb-input" value={sourceBoardId} onChange={(e) => setSourceBoardId(e.target.value)}>
                {cloneSources.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
              <label className="nb-check">
                <input type="checkbox" checked={copyRows} onChange={(e) => setCopyRows(e.target.checked)} />
                Copy all rows (data) too
              </label>
              <label className="nb-check">
                <input type="checkbox" checked={copyMembers} onChange={(e) => setCopyMembers(e.target.checked)} />
                Copy the member &amp; access list
              </label>
            </div>
          )}

          {mode === "import" && (
            <div className="ba-section">
              <h3>Spreadsheet</h3>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  if (f && !label.trim()) setLabel(f.name.replace(/\.[^.]+$/, ""));
                }}
              />
              {file && <p className="cz-note">Selected: {file.name}</p>}
              <p className="cz-note" style={{ textAlign: "center", margin: "8px 0" }}>— or —</p>
              <input
                className="nb-input"
                placeholder="Paste a Google Sheets link (shared “Anyone with the link”)"
                value={gsheetUrl}
                onChange={(e) => setGsheetUrl(e.target.value)}
              />
              <p className="cz-note">
                The first row becomes your columns; each following row becomes an item. You can change
                column types and add dropdown choices afterward.
              </p>
            </div>
          )}

          <div className="ba-section">
            <h3>Visibility</h3>
            <div className="ba-vis">
              <label className={visibility === "public" ? "active" : ""}>
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === "public"}
                  onChange={() => setVisibility("public")}
                />
                🌐 Public — anyone signed in can see it
              </label>
              <label className={visibility === "private" ? "active" : ""}>
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === "private"}
                  onChange={() => setVisibility("private")}
                />
                🔒 Private — only people you add can see it
              </label>
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <span className="modal-foot-note" />
          <button className="btn btn-primary" disabled={!canSubmit} onClick={create}>
            {mode === "import" ? "Import board" : "Create board"}
          </button>
        </div>
      </div>
    </div>
  );
}
