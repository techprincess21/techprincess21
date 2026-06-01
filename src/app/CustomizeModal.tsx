"use client";

import { useState } from "react";
import type { ViewDef } from "@/lib/types";
import { chipColor } from "@/lib/colors";

// Lets a non-technical user tailor a board: edit the dropdown choices for each
// select column (statuses, time periods, types…) and manage the shared list of
// people. Changes persist immediately via the parent's save callbacks.
export default function CustomizeModal({
  view,
  optionsByColumn,
  people,
  onSaveOptions,
  onSavePeople,
  onClose,
}: {
  view: ViewDef;
  optionsByColumn: { [columnKey: string]: string[] };
  people: string[];
  onSaveOptions: (columnKey: string, options: string[]) => void;
  onSavePeople: (people: string[]) => void;
  onClose: () => void;
}) {
  const selectCols = view.columns.filter((c) => c.type === "select");
  const [drafts, setDrafts] = useState<{ [key: string]: string }>({});

  function addOption(columnKey: string) {
    const val = (drafts[columnKey] ?? "").trim();
    if (!val) return;
    const current = optionsByColumn[columnKey] ?? [];
    if (current.includes(val)) return;
    onSaveOptions(columnKey, [...current, val]);
    setDrafts((d) => ({ ...d, [columnKey]: "" }));
  }

  function removeOption(columnKey: string, value: string) {
    const current = optionsByColumn[columnKey] ?? [];
    onSaveOptions(columnKey, current.filter((o) => o !== value));
  }

  function addPerson() {
    const val = (drafts.__people ?? "").trim();
    if (!val || people.includes(val)) return;
    onSavePeople([...people, val]);
    setDrafts((d) => ({ ...d, __people: "" }));
  }

  function removePerson(name: string) {
    onSavePeople(people.filter((p) => p !== name));
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Customize “{view.label}”</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="modal-sub">
          Tailor this board to the launch. Add or remove dropdown choices and manage owners —
          changes save automatically and apply only to this board.
        </p>

        <div className="modal-body">
          {selectCols.map((col) => {
            const opts = optionsByColumn[col.key] ?? [];
            return (
              <section className="cz-section" key={col.key}>
                <h3>{col.label}</h3>
                <div className="cz-chips">
                  {opts.length === 0 && <span className="cz-empty">No choices yet</span>}
                  {opts.map((o) => (
                    <span className="cz-chip" key={o} style={{ background: chipColor(o) }}>
                      {o || "(blank)"}
                      <button onClick={() => removeOption(col.key, o)} title="Remove">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="cz-add">
                  <input
                    value={drafts[col.key] ?? ""}
                    placeholder={`Add a ${col.label.toLowerCase()} choice…`}
                    onChange={(e) => setDrafts((d) => ({ ...d, [col.key]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addOption(col.key)}
                  />
                  <button className="btn" onClick={() => addOption(col.key)}>
                    Add
                  </button>
                </div>
              </section>
            );
          })}

          <section className="cz-section">
            <h3>People / Owners</h3>
            <p className="cz-note">
              These appear as suggestions when assigning owners across every board.
            </p>
            <div className="cz-chips">
              {people.map((p) => (
                <span className="cz-chip person" key={p}>
                  {p}
                  <button onClick={() => removePerson(p)} title="Remove">
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="cz-add">
              <input
                value={drafts.__people ?? ""}
                placeholder="Add a person…"
                onChange={(e) => setDrafts((d) => ({ ...d, __people: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && addPerson()}
              />
              <button className="btn" onClick={addPerson}>
                Add
              </button>
            </div>
          </section>
        </div>

        <div className="modal-foot">
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
