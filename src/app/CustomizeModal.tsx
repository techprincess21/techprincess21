"use client";

import { useState } from "react";
import type { ViewDef } from "@/lib/types";
import { chipColor, PALETTE } from "@/lib/colors";

// Lets a non-technical user tailor a board: edit + reorder the dropdown choices
// for each select column, pick a color per choice, and manage the shared people
// list. Changes persist immediately via the parent's save callbacks.
export default function CustomizeModal({
  view,
  optionsByColumn,
  colorsByColumn,
  people,
  onSaveOptions,
  onSaveColor,
  onSavePeople,
  onClose,
}: {
  view: ViewDef;
  optionsByColumn: { [columnKey: string]: string[] };
  colorsByColumn: { [columnKey: string]: { [value: string]: string } };
  people: string[];
  onSaveOptions: (columnKey: string, options: string[]) => void;
  onSaveColor: (columnKey: string, value: string, hex: string | null) => void;
  onSavePeople: (people: string[]) => void;
  onClose: () => void;
}) {
  const selectCols = view.columns.filter((c) => c.type === "select");
  const [drafts, setDrafts] = useState<{ [key: string]: string }>({});
  const [drag, setDrag] = useState<{ col: string; idx: number } | null>(null);
  const [palette, setPalette] = useState<string | null>(null); // `${col}::${value}`

  function addOption(columnKey: string) {
    const val = (drafts[columnKey] ?? "").trim();
    if (!val) return;
    const current = optionsByColumn[columnKey] ?? [];
    if (current.includes(val)) return;
    onSaveOptions(columnKey, [...current, val]);
    setDrafts((d) => ({ ...d, [columnKey]: "" }));
  }

  function removeOption(columnKey: string, value: string) {
    onSaveOptions(columnKey, (optionsByColumn[columnKey] ?? []).filter((o) => o !== value));
  }

  function dropOption(columnKey: string, targetIdx: number) {
    if (!drag || drag.col !== columnKey) return;
    const list = [...(optionsByColumn[columnKey] ?? [])];
    const [moved] = list.splice(drag.idx, 1);
    list.splice(targetIdx, 0, moved);
    onSaveOptions(columnKey, list);
    setDrag(null);
  }

  function addPerson() {
    const val = (drafts.__people ?? "").trim();
    if (!val || people.includes(val)) return;
    onSavePeople([...people, val]);
    setDrafts((d) => ({ ...d, __people: "" }));
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
          Drag choices to reorder, click the swatch to recolor, or add/remove choices and owners.
          Changes save automatically and apply only to this board.
        </p>

        <div className="modal-body">
          {selectCols.map((col) => {
            const opts = optionsByColumn[col.key] ?? [];
            const colors = colorsByColumn[col.key] ?? {};
            return (
              <section className="cz-section" key={col.key}>
                <h3>{col.label}</h3>
                <div className="cz-chips">
                  {opts.length === 0 && <span className="cz-empty">No choices yet</span>}
                  {opts.map((o, i) => {
                    const bg = colors[o] || chipColor(o);
                    const popId = `${col.key}::${o}`;
                    return (
                      <span
                        key={o}
                        className="cz-chip"
                        style={{ background: bg }}
                        draggable
                        onDragStart={() => setDrag({ col: col.key, idx: i })}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => dropOption(col.key, i)}
                        title="Drag to reorder"
                      >
                        <span className="cz-grip">⠿</span>
                        {o || "(blank)"}
                        <button
                          className="cz-swatch"
                          title="Change color"
                          onClick={() => setPalette(palette === popId ? null : popId)}
                        >
                          ▾
                        </button>
                        <button onClick={() => removeOption(col.key, o)} title="Remove">
                          ×
                        </button>
                        {palette === popId && (
                          <span className="cz-palette" onClick={(e) => e.stopPropagation()}>
                            {PALETTE.map((hex) => (
                              <button
                                key={hex}
                                style={{ background: hex }}
                                onClick={() => {
                                  onSaveColor(col.key, o, hex);
                                  setPalette(null);
                                }}
                              />
                            ))}
                            <button
                              className="cz-auto"
                              onClick={() => {
                                onSaveColor(col.key, o, null);
                                setPalette(null);
                              }}
                            >
                              Auto
                            </button>
                          </span>
                        )}
                      </span>
                    );
                  })}
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
                  <button onClick={() => onSavePeople(people.filter((x) => x !== p))} title="Remove">
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
