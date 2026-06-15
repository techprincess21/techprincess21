"use client";

import { useState } from "react";
import { BOARD_TEMPLATES } from "@/lib/board-templates";

// Create a new board: name it, pick a starting template, choose visibility.
// You become the board's owner.
export default function NewBoardModal({
  onCreate,
  onClose,
}: {
  onCreate: (label: string, templateKey: string, visibility: "public" | "private") => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState("");
  const [templateKey, setTemplateKey] = useState(BOARD_TEMPLATES[0].key);
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  function create() {
    const l = label.trim();
    if (!l) return;
    onCreate(l, templateKey, visibility);
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
          Pick a starting template — you can rename columns, add choices, and customize everything
          afterward. You&apos;ll be the board&apos;s owner.
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
