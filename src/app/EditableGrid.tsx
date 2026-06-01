"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef, FieldValue, Record, ViewDef } from "@/lib/types";
import { avatarColor, chipColor, groupColor, initials, splitPeople } from "@/lib/colors";
import MultiSelect from "./MultiSelect";

const JIRA_BASE = "https://taktak.atlassian.net";

export default function EditableGrid({ view }: { view: ViewDef }) {
  const [records, setRecords] = useState<Record[] | null>(null);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Filtering state
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<{ [key: string]: string[] }>({});

  // Automation toast (when a workflow playbook opens tickets)
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/${view.collection}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setRecords(d.records ?? []);
      })
      .catch(() => {
        if (!cancelled) setRecords([]);
      });
    return () => {
      cancelled = true;
    };
  }, [view.collection]);

  // Reset filters when switching boards.
  useEffect(() => {
    setSearch("");
    setFilters({});
    setCollapsed(new Set());
  }, [view.id]);

  // Auto-dismiss the automation toast.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  async function saveField(record: Record, key: string, value: FieldValue) {
    if (record.fields[key] === value) return;
    const cellId = `${record.id}:${key}`;
    setSavingCell(cellId);
    setRecords((prev) =>
      prev
        ? prev.map((r) => (r.id === record.id ? { ...r, fields: { ...r.fields, [key]: value } } : r))
        : prev
    );
    try {
      const res = await fetch(`/api/${view.collection}/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { [key]: value } }),
      });
      const data = await res.json().catch(() => null);
      // Merge any server-side field changes (e.g. autoTickets written by a
      // playbook) back into local state.
      if (data?.record?.fields) {
        setRecords((prev) =>
          prev
            ? prev.map((r) =>
                r.id === record.id ? { ...r, fields: { ...r.fields, ...data.record.fields } } : r
              )
            : prev
        );
      }
      if (data?.automation?.created?.length) {
        const c = data.automation.created;
        setToast(
          `⚡ Webinar playbook opened ${c.length} tickets: ${c.map((t: { key: string }) => t.key).join(", ")}`
        );
      }
    } finally {
      setSavingCell((c) => (c === cellId ? null : c));
    }
  }

  async function addRow(groupValue?: string) {
    const fields = { ...(view.defaults ?? {}) };
    if (view.groupBy && groupValue !== undefined && groupValue !== "__all__")
      fields[view.groupBy] = groupValue;
    const res = await fetch(`/api/${view.collection}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    const { record } = await res.json();
    setRecords((prev) => (prev ? [...prev, record] : [record]));
  }

  async function removeRow(id: string) {
    setRecords((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
    await fetch(`/api/${view.collection}/${id}`, { method: "DELETE" });
  }

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // Columns that support a quick filter (status chips + people).
  const filterCols = useMemo(
    () => view.columns.filter((c) => c.type === "select" || c.type === "person"),
    [view.columns]
  );

  // Build the option list for each filterable column from the live data.
  const optionsByCol = useMemo(() => {
    const out: { [key: string]: string[] } = {};
    for (const col of filterCols) {
      const set = new Set<string>(col.type === "select" ? col.options ?? [] : []);
      for (const r of records ?? []) {
        const raw = r.fields[col.key];
        const val = raw == null ? "" : String(raw);
        if (col.type === "person") splitPeople(val).forEach((p) => set.add(p));
        else if (val) set.add(val);
      }
      out[col.key] = [...set].filter(Boolean).sort();
    }
    return out;
  }, [filterCols, records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (records ?? []).filter((rec) => {
      if (q) {
        const hay = Object.values(rec.fields)
          .map((v) => (v == null ? "" : String(v)))
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      for (const col of filterCols) {
        const sel = filters[col.key];
        if (!sel || sel.length === 0) continue;
        const raw = rec.fields[col.key];
        const val = raw == null ? "" : String(raw);
        if (col.type === "person") {
          if (!splitPeople(val).some((p) => sel.includes(p))) return false;
        } else if (!sel.includes(val)) {
          return false;
        }
      }
      return true;
    });
  }, [records, search, filters, filterCols]);

  const activeCount =
    (search.trim() ? 1 : 0) + Object.values(filters).filter((s) => s.length > 0).length;

  const groups = useMemo(() => groupRecords(filtered, view.groupBy), [filtered, view.groupBy]);

  if (records === null) return <div className="loading">Loading {view.label}…</div>;

  const dataCols = view.columns.length;
  const totalShown = filtered.length;
  const totalAll = records.length;

  return (
    <div>
      {toast && (
        <div className="toast" role="status" onClick={() => setToast(null)}>
          {toast}
        </div>
      )}
      <p className="view-desc">{view.description}</p>

      <div className="board-toolbar">
        <button className="btn btn-primary" onClick={() => addRow(undefined)}>
          New item
        </button>

        <div className="search-box">
          <span className="search-icon">⌕</span>
          <input
            value={search}
            placeholder="Search this board"
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch("")} title="Clear search">
              ×
            </button>
          )}
        </div>

        {filterCols.map((col) => (
          <MultiSelect
            key={col.key}
            label={col.label}
            options={optionsByCol[col.key] ?? []}
            selected={filters[col.key] ?? []}
            onChange={(next) => setFilters((f) => ({ ...f, [col.key]: next }))}
          />
        ))}

        {activeCount > 0 && (
          <button
            className="clear-all"
            onClick={() => {
              setSearch("");
              setFilters({});
            }}
          >
            Clear all
          </button>
        )}

        <span className="result-count">
          {totalShown === totalAll ? `${totalAll} items` : `${totalShown} of ${totalAll}`}
        </span>
      </div>

      {totalShown === 0 ? (
        <div className="results-empty">No items match your filters.</div>
      ) : (
        <div className="boards">
          {groups.map((g, gi) => {
            const color = view.groupBy ? groupColor(gi) : "#0086c0";
            const isCollapsed = collapsed.has(g.key);
            return (
              <div className="board" key={g.key}>
                {view.groupBy && (
                  <button
                    className="group-header"
                    style={{ color }}
                    onClick={() => toggleGroup(g.key)}
                  >
                    <span className={`caret ${isCollapsed ? "closed" : ""}`}>▾</span>
                    <span className="group-title">{g.label || "Untitled"}</span>
                    <span className="group-count">{g.records.length}</span>
                  </button>
                )}

                {!isCollapsed && (
                  <div className="grid-wrap">
                    <table className="grid">
                      <thead>
                        <tr>
                          <th className="rail-col" style={{ background: color }} />
                          {view.columns.map((c) => (
                            <th key={c.key} style={{ minWidth: c.width }}>
                              {c.label}
                            </th>
                          ))}
                          <th className="del-col" />
                        </tr>
                      </thead>
                      <tbody>
                        {g.records.map((rec) => (
                          <tr key={rec.id}>
                            <td className="rail" style={{ background: color }} />
                            {view.columns.map((col) => (
                              <td key={col.key} className={`cell cell-${col.type}`}>
                                <Cell
                                  col={col}
                                  value={rec.fields[col.key] ?? null}
                                  jiraKey={rec.jiraKey ?? null}
                                  saving={savingCell === `${rec.id}:${col.key}`}
                                  onCommit={(v) => saveField(rec, col.key, v)}
                                />
                              </td>
                            ))}
                            <td className="del-col">
                              <button
                                className="row-del"
                                title="Delete item"
                                onClick={() => removeRow(rec.id)}
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr className="add-row">
                          <td className="rail" style={{ background: color, opacity: 0.4 }} />
                          <td colSpan={dataCols + 1}>
                            <button className="add-item" onClick={() => addRow(g.key)}>
                              + Add item
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Cell({
  col,
  value,
  jiraKey,
  saving,
  onCommit,
}: {
  col: ColumnDef;
  value: FieldValue;
  jiraKey: string | null;
  saving: boolean;
  onCommit: (v: FieldValue) => void;
}) {
  const [draft, setDraft] = useState<string>(value === null ? "" : String(value));

  useEffect(() => {
    setDraft(value === null ? "" : String(value));
  }, [value]);

  if (col.type === "jira") {
    // Prefer a key stored in the cell value (generated tickets), else the
    // record's top-level jiraKey (content/launch items).
    const key = typeof value === "string" && value ? value : jiraKey;
    return key ? (
      <a className="jira-key" href={`${JIRA_BASE}/browse/${key}`} target="_blank" rel="noreferrer">
        {key}
      </a>
    ) : (
      <span className="jira-key empty">—</span>
    );
  }

  if (col.type === "select") {
    const color = chipColor(draft);
    return (
      <div className="status-chip" style={{ background: color }}>
        <select
          className={`status-select ${saving ? "is-saving" : ""}`}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            onCommit(e.target.value);
          }}
        >
          {(col.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt || "—"}
            </option>
          ))}
          {draft && !(col.options ?? []).includes(draft) && <option value={draft}>{draft}</option>}
        </select>
      </div>
    );
  }

  if (col.type === "person") {
    const people = splitPeople(draft);
    return (
      <div className="person-cell">
        <div className="avatars">
          {people.length === 0 ? (
            <span className="avatar empty" title="Unassigned">
              ?
            </span>
          ) : (
            people.slice(0, 3).map((p, i) => (
              <span
                key={p + i}
                className="avatar"
                style={{ background: avatarColor(p), zIndex: people.length - i }}
                title={p}
              >
                {initials(p)}
              </span>
            ))
          )}
        </div>
        <input
          className={`cell-input person-input ${saving ? "is-saving" : ""}`}
          value={draft}
          placeholder="Assign…"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => onCommit(draft || null)}
        />
      </div>
    );
  }

  if (col.readOnly) {
    return <span className="cell-input ro">{draft || "—"}</span>;
  }

  const cls = `cell-input ${saving ? "is-saving" : ""}`;

  if (col.type === "url") {
    return (
      <div className="url-cell">
        {draft && (
          <a className="url-open" href={draft} target="_blank" rel="noreferrer" title={draft}>
            ↗
          </a>
        )}
        <input
          className={cls}
          value={draft}
          placeholder="https://…"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => onCommit(draft || null)}
        />
      </div>
    );
  }

  const isNumber = col.type === "number";
  return (
    <input
      className={cls}
      type={isNumber ? "number" : "text"}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(normalize(draft, isNumber))}
    />
  );
}

function normalize(draft: string, isNumber: boolean): FieldValue {
  if (draft === "") return null;
  if (isNumber) {
    const n = Number(draft);
    return Number.isNaN(n) ? draft : n;
  }
  return draft;
}

function groupRecords(records: Record[], groupBy?: string) {
  if (!groupBy) return [{ key: "__all__", label: "", records }];
  const map = new Map<string, Record[]>();
  for (const r of records) {
    const k = String(r.fields[groupBy] ?? "");
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  return [...map.entries()].map(([key, recs]) => ({ key, label: key, records: recs }));
}
