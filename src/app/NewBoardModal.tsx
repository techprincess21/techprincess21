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
  onClose,
}: {
  cloneSources: { id: string; label: string }[];
  onCreate: (opts: CreateBoardOpts) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<"template" | "clone">("template");
  const [templateKey, setTemplateKey] = useState(BOARD_TEMPLATES[0].key);
  const [sourceBoardId, setSourceBoardId] = useState(cloneSources[0]?.id ?? "");
  const [copyRows, setCopyRows] = useState(false);
  const [copyMembers, setCopyMembers] = useState(true);
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  const canClone = cloneSources.length > 0;

  function create() {
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
              placeholder="e.g. Q3 Webinars, M&A Project…"
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
            </div>
          </div>

          {mode === "template" ? (
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
          ) : (
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
          <button className="btn btn-primary" disabled={!label.trim()} onClick={create}>
            Create board
          </button>
        </div>
      </div>
    </div>
  );
}
