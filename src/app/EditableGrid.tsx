"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef, FieldValue, Record, ViewDef } from "@/lib/types";

const JIRA_BASE = "https://taktak.atlassian.net";

export default function EditableGrid({ view }: { view: ViewDef }) {
  const [records, setRecords] = useState<Record[] | null>(null);
  const [savingCell, setSavingCell] = useState<string | null>(null);

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

  async function saveField(record: Record, key: string, value: FieldValue) {
    if (record.fields[key] === value) return;
    const cellId = `${record.id}:${key}`;
    setSavingCell(cellId);
    // Optimistic update.
    setRecords((prev) =>
      prev
        ? prev.map((r) => (r.id === record.id ? { ...r, fields: { ...r.fields, [key]: value } } : r))
        : prev
    );
    try {
      await fetch(`/api/${view.collection}/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { [key]: value } }),
      });
    } finally {
      setSavingCell((c) => (c === cellId ? null : c));
    }
  }

  async function addRow() {
    const res = await fetch(`/api/${view.collection}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { ...(view.defaults ?? {}) } }),
    });
    const { record } = await res.json();
    setRecords((prev) => (prev ? [...prev, record] : [record]));
  }

  async function removeRow(id: string) {
    setRecords((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
    await fetch(`/api/${view.collection}/${id}`, { method: "DELETE" });
  }

  const groups = useMemo(() => groupRecords(records ?? [], view.groupBy), [records, view.groupBy]);

  if (records === null) return <div className="loading">Loading {view.label}…</div>;

  const colSpan = view.columns.length + 1;

  return (
    <div>
      <p className="view-desc">{view.description}</p>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={addRow}>
          + Add row
        </button>
      </div>
      <div className="grid-wrap">
        <table className="grid">
          <thead>
            <tr>
              {view.columns.map((c) => (
                <th key={c.key} style={{ minWidth: c.width }}>
                  {c.label}
                </th>
              ))}
              <th style={{ width: 36 }} />
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <GroupBlock
                key={g.key}
                label={g.label}
                show={Boolean(view.groupBy)}
                count={g.records.length}
                colSpan={colSpan}
              >
                {g.records.map((rec) => (
                  <tr key={rec.id}>
                    {view.columns.map((col) => (
                      <td key={col.key}>
                        <Cell
                          col={col}
                          value={rec.fields[col.key] ?? null}
                          jiraKey={rec.jiraKey ?? null}
                          saving={savingCell === `${rec.id}:${col.key}`}
                          onCommit={(v) => saveField(rec, col.key, v)}
                        />
                      </td>
                    ))}
                    <td>
                      <button className="row-del" title="Delete row" onClick={() => removeRow(rec.id)}>
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </GroupBlock>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupBlock({
  label,
  show,
  count,
  colSpan,
  children,
}: {
  label: string;
  show: boolean;
  count: number;
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <>
      {show && (
        <tr className="group-row">
          <td colSpan={colSpan}>
            {label || "—"}
            <span className="count">{count}</span>
          </td>
        </tr>
      )}
      {children}
    </>
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
    return jiraKey ? (
      <a className="jira-key" href={`${JIRA_BASE}/browse/${jiraKey}`} target="_blank" rel="noreferrer">
        {jiraKey}
      </a>
    ) : (
      <span className="jira-key empty">—</span>
    );
  }

  if (col.readOnly) {
    return <span className="cell-input">{draft || "—"}</span>;
  }

  const cls = `cell-input ${saving ? "cell-saving" : ""}`;

  if (col.type === "select") {
    return (
      <select
        className={`cell-select ${saving ? "cell-saving" : ""}`}
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
        {/* allow current value even if not in options */}
        {draft && !(col.options ?? []).includes(draft) && <option value={draft}>{draft}</option>}
      </select>
    );
  }

  if (col.type === "url") {
    return (
      <input
        className={cls}
        value={draft}
        placeholder="https://…"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommit(draft || null)}
      />
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
