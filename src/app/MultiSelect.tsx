"use client";

import { useEffect, useRef, useState } from "react";

// A small Monday-style filter control: a chip button that opens a checklist
// popover. Used for per-column filtering (status columns, people, etc.).
export default function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function toggle(value: string) {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    );
  }

  return (
    <div className="ms" ref={ref}>
      <button
        className={`filter-chip ${selected.length ? "active" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        {selected.length > 0 && <span className="chip-count">{selected.length}</span>}
        <span className="chip-caret">▾</span>
      </button>
      {open && (
        <div className="ms-popover">
          <div className="ms-head">
            <span>{label}</span>
            {selected.length > 0 && (
              <button className="ms-clear" onClick={() => onChange([])}>
                Clear
              </button>
            )}
          </div>
          <div className="ms-list">
            {options.length === 0 && <div className="ms-empty">No values</div>}
            {options.map((opt) => (
              <label key={opt} className="ms-option">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                />
                <span>{opt || "(empty)"}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
