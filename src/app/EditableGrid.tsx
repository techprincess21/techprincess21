"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { ColumnDef, FieldValue, Record, ViewDef } from "@/lib/types";
import { avatarColor, chipColor, groupColor, initials, splitPeople } from "@/lib/colors";
import { STATUS_FIELD } from "@/lib/rbac";
import { eligibleStage, type TicketDef } from "@/lib/playbooks";
import MultiSelect from "./MultiSelect";
import CustomizeModal from "./CustomizeModal";
import ConfirmAutomationModal from "./ConfirmAutomationModal";

const JIRA_BASE = "https://taktak.atlassian.net";

const PEOPLE_LIST_ID = "people-options";

export default function EditableGrid({
  view,
  perms = [],
  optionOverrides = {},
  columnOrder = [],
  colorOverrides = {},
  people = [],
  onSaveOptions,
  onSaveColumns,
  onSaveColor,
  onSavePeople,
}: {
  view: ViewDef;
  perms?: string[];
  optionOverrides?: { [columnKey: string]: string[] };
  columnOrder?: string[];
  colorOverrides?: { [columnKey: string]: { [value: string]: string } };
  people?: string[];
  onSaveOptions?: (columnKey: string, options: string[]) => void;
  onSaveColumns?: (keys: string[]) => void;
  onSaveColor?: (columnKey: string, value: string, hex: string | null) => void;
  onSavePeople?: (people: string[]) => void;
}) {
  const has = (p: string) => perms.includes(p);
  const canCreate = has("item.create");
  const canDelete = has("item.delete");
  const canCustomize = has("board.customize");
  const canReorder = has("board.reorder");
  const canStatus = has("item.status.edit");
  const canPeople = has("item.people.assign");
  const canFields = has("item.fields.edit");
  const canRunAutomation = has("automation.run");
  const statusField = STATUS_FIELD[view.collection];

  // Is a given cell editable for this user?
  const cellDisabled = (col: ColumnDef): boolean => {
    if (col.readOnly || col.type === "jira") return true;
    if (col.type === "select") return col.key === statusField ? !canStatus : !canFields;
    if (col.type === "person") return !canPeople;
    return !canFields;
  };
  const [records, setRecords] = useState<Record[] | null>(null);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Filtering state
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<{ [key: string]: string[] }>({});

  // Automation toast (when a workflow playbook opens tickets)
  const [toast, setToast] = useState<string | null>(null);

  // Customize panel
  const [customizeOpen, setCustomizeOpen] = useState(false);

  // Drag-and-drop state
  const [dragRow, setDragRow] = useState<string | null>(null);
  const [dragCol, setDragCol] = useState<string | null>(null);

  // Child records (e.g. tickets opened by automations), expansion, and the
  // confirmation gate for running a playbook.
  const [childRecords, setChildRecords] = useState<Record[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ rec: Record; stage: string; tickets: TicketDef[] } | null>(null);
  const [running, setRunning] = useState(false);

  const childLink = view.childLink;

  // Sync status (Jira is the source of truth; we re-read it on demand/focus).
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  function reloadChildren() {
    if (!childLink) return;
    fetch(`/api/${childLink.collection}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setChildRecords(d.records ?? []))
      .catch(() => {});
  }

  // Read the board (and its child records) fresh from the backend/Jira.
  async function loadAll() {
    setSyncing(true);
    try {
      const d = await (await fetch(`/api/${view.collection}`, { cache: "no-store" })).json();
      setRecords(d.records ?? []);
      if (childLink) {
        const cd = await (await fetch(`/api/${childLink.collection}`, { cache: "no-store" })).json();
        setChildRecords(cd.records ?? []);
      } else {
        setChildRecords([]);
      }
      setLastSynced(new Date());
    } catch {
      setRecords((r) => r ?? []);
    } finally {
      setSyncing(false);
    }
  }

  // Load on mount / board switch.
  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.id]);

  // Re-sync when the tab regains focus, so changes made directly in Jira show up.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") loadAll();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.id]);

  const childrenFor = (rec: Record): Record[] => {
    if (!childLink) return [];
    const key = String(rec.fields[childLink.parentField] ?? "");
    return childRecords.filter((c) => String(c.fields[childLink.childField] ?? "") === key);
  };

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function confirmRun() {
    if (!confirm) return;
    setRunning(true);
    try {
      const res = await fetch(`/api/${view.collection}/${confirm.rec.id}/run`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.record) {
        setToast(data?.error ? `Couldn’t open tickets: ${data.error}` : "Couldn’t open tickets.");
        return;
      }
      setRecords((prev) =>
        prev ? prev.map((r) => (r.id === confirm.rec.id ? { ...r, fields: { ...r.fields, ...data.record.fields } } : r)) : prev
      );
      reloadChildren();
      setExpanded((prev) => new Set(prev).add(confirm.rec.id));
      const c = data.created ?? [];
      setToast(`⚡ Opened ${c.length} tickets: ${c.map((t: { key: string }) => t.key).join(", ")}`);
    } finally {
      setRunning(false);
      setConfirm(null);
    }
  }

  async function setChildStatus(child: Record, value: string) {
    setChildRecords((prev) =>
      prev.map((c) => (c.id === child.id ? { ...c, fields: { ...c.fields, status: value } } : c))
    );
    await fetch(`/api/${childLink!.collection}/${child.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { status: value } }),
    });
  }

  // Effective dropdown options for a column: per-board overrides win over the
  // code defaults.
  const effOptions = (col: ColumnDef): string[] => optionOverrides[col.key] ?? col.options ?? [];

  // Columns in the user's saved order (new columns appended).
  const columns = useMemo(() => {
    if (!columnOrder.length) return view.columns;
    const byKey = new Map(view.columns.map((c) => [c.key, c]));
    const out: ColumnDef[] = [];
    for (const k of columnOrder) {
      const c = byKey.get(k);
      if (c) {
        out.push(c);
        byKey.delete(k);
      }
    }
    for (const c of byKey.values()) out.push(c);
    return out;
  }, [columnOrder, view.columns]);

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
      await fetch(`/api/${view.collection}/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { [key]: value } }),
      });
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

  // Move a dragged row before another row, or to the end of a group. If it
  // lands in a different group, adopt that group's value (e.g. change Phase).
  function moveRow(draggedId: string, opts: { beforeId?: string; groupValue?: string }) {
    if (!records) return;
    const copy = records.map((r) => ({ ...r, fields: { ...r.fields } }));
    const di = copy.findIndex((r) => r.id === draggedId);
    if (di < 0) return;
    const [dragged] = copy.splice(di, 1);

    let groupChanged = false;
    if (view.groupBy) {
      let newGroup: string | undefined;
      if (opts.beforeId != null) {
        const t = copy.find((r) => r.id === opts.beforeId);
        if (t) newGroup = String(t.fields[view.groupBy] ?? "");
      } else if (opts.groupValue != null) {
        newGroup = opts.groupValue;
      }
      if (newGroup !== undefined && String(dragged.fields[view.groupBy] ?? "") !== newGroup) {
        dragged.fields[view.groupBy] = newGroup;
        groupChanged = true;
      }
    }

    let insertAt = copy.length;
    if (opts.beforeId != null) {
      const ti = copy.findIndex((r) => r.id === opts.beforeId);
      insertAt = ti < 0 ? copy.length : ti;
    } else if (opts.groupValue != null && view.groupBy) {
      let lastIdx = -1;
      copy.forEach((r, i) => {
        if (String(r.fields[view.groupBy!] ?? "") === opts.groupValue) lastIdx = i;
      });
      insertAt = lastIdx >= 0 ? lastIdx + 1 : copy.length;
    }
    copy.splice(insertAt, 0, dragged);
    setRecords(copy);

    if (groupChanged && view.groupBy) {
      fetch(`/api/${view.collection}/${dragged.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { [view.groupBy]: dragged.fields[view.groupBy] } }),
      });
    }
    fetch(`/api/${view.collection}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: copy.map((r) => r.id) }),
    });
  }

  function moveColumn(draggedKey: string, beforeKey: string) {
    if (!onSaveColumns || draggedKey === beforeKey) return;
    const keys = columns.map((c) => c.key);
    const di = keys.indexOf(draggedKey);
    keys.splice(di, 1);
    const ti = keys.indexOf(beforeKey);
    keys.splice(ti < 0 ? keys.length : ti, 0, draggedKey);
    onSaveColumns(keys);
  }

  // Columns that support a quick filter (status chips + people).
  const filterCols = useMemo(
    () => columns.filter((c) => c.type === "select" || c.type === "person"),
    [columns]
  );

  // Build the option list for each filterable column from the live data.
  const optionsByCol = useMemo(() => {
    const out: { [key: string]: string[] } = {};
    for (const col of filterCols) {
      const set = new Set<string>(
        col.type === "select" ? effOptions(col) : col.type === "person" ? people : []
      );
      for (const r of records ?? []) {
        const raw = r.fields[col.key];
        const val = raw == null ? "" : String(raw);
        if (col.type === "person") splitPeople(val).forEach((p) => set.add(p));
        else if (val) set.add(val);
      }
      out[col.key] = [...set].filter(Boolean).sort();
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCols, records, optionOverrides, people]);

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

  const dataCols = columns.length;
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
        {canCreate && (
          <button className="btn btn-primary" onClick={() => addRow(undefined)}>
            New item
          </button>
        )}

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

        {canCustomize && onSaveOptions && onSavePeople && (
          <button className="btn btn-ghost" onClick={() => setCustomizeOpen(true)} title="Customize this board">
            ⚙ Customize
          </button>
        )}

        <button
          className="btn btn-ghost sync-btn"
          onClick={loadAll}
          disabled={syncing}
          title={lastSynced ? `Last synced ${lastSynced.toLocaleTimeString()}` : "Sync with Jira"}
        >
          <span className={`sync-icon ${syncing ? "spinning" : ""}`}>↻</span>
          {syncing ? "Syncing…" : "Sync"}
        </button>

        <span className="result-count">
          {totalShown === totalAll ? `${totalAll} items` : `${totalShown} of ${totalAll}`}
        </span>
      </div>

      <datalist id={PEOPLE_LIST_ID}>
        {people.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      {customizeOpen && onSaveOptions && onSaveColor && onSavePeople && (
        <CustomizeModal
          view={view}
          optionsByColumn={Object.fromEntries(
            columns.filter((c) => c.type === "select").map((c) => [c.key, effOptions(c)])
          )}
          colorsByColumn={colorOverrides}
          people={people}
          onSaveOptions={onSaveOptions}
          onSaveColor={onSaveColor}
          onSavePeople={onSavePeople}
          onClose={() => setCustomizeOpen(false)}
        />
      )}

      {confirm && (
        <ConfirmAutomationModal
          deliverable={String(confirm.rec.fields.deliverable ?? "this item")}
          stage={confirm.stage}
          tickets={confirm.tickets}
          busy={running}
          onConfirm={confirmRun}
          onCancel={() => setConfirm(null)}
        />
      )}

      {totalShown === 0 ? (
        <div className="results-empty">No items match your filters.</div>
      ) : (
        <div className="boards">
          {groups.map((g, gi) => {
            // When grouping by a colored dropdown (e.g. Stage, Team), use that
            // value's chip color so the group bar matches the chips — and the
            // Customize panel. For non-select group-bys (e.g. Phase), fall back
            // to a rotating palette.
            const groupByCol = columns.find((c) => c.key === view.groupBy);
            const color = !view.groupBy
              ? "#0086c0"
              : groupByCol?.type === "select"
                ? colorOverrides[view.groupBy]?.[g.key] || chipColor(g.key)
                : groupColor(gi);
            const isCollapsed = collapsed.has(g.key);
            return (
              <div className="board" key={g.key}>
                {view.groupBy && (
                  <button
                    className="group-header"
                    style={{ color }}
                    onClick={() => toggleGroup(g.key)}
                    onDragOver={(e) => dragRow && e.preventDefault()}
                    onDrop={() => {
                      if (dragRow) moveRow(dragRow, { groupValue: g.key });
                      setDragRow(null);
                    }}
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
                          <th className="handle-col" />
                          <th className="rail-col" style={{ background: color }} />
                          {columns.map((c) => (
                            <th
                              key={c.key}
                              style={{ minWidth: c.width }}
                              className={dragCol === c.key ? "col-dragging" : ""}
                              draggable={canCustomize && Boolean(onSaveColumns)}
                              onDragStart={() => canCustomize && setDragCol(c.key)}
                              onDragOver={(e) => dragCol && e.preventDefault()}
                              onDrop={() => {
                                if (dragCol) moveColumn(dragCol, c.key);
                                setDragCol(null);
                              }}
                              title={canCustomize && onSaveColumns ? "Drag to reorder column" : undefined}
                            >
                              {c.label}
                            </th>
                          ))}
                          <th className="del-col" />
                        </tr>
                      </thead>
                      <tbody>
                        {g.records.map((rec) => {
                          const kids = childrenFor(rec);
                          const isExpanded = expanded.has(rec.id);
                          return (
                            <Fragment key={rec.id}>
                              <tr
                                className={dragRow === rec.id ? "row-dragging" : ""}
                                onDragOver={(e) => dragRow && e.preventDefault()}
                                onDrop={() => {
                                  if (dragRow && dragRow !== rec.id) moveRow(dragRow, { beforeId: rec.id });
                                  setDragRow(null);
                                }}
                              >
                                {canReorder ? (
                                  <td
                                    className="drag-handle"
                                    draggable
                                    onDragStart={() => setDragRow(rec.id)}
                                    onDragEnd={() => setDragRow(null)}
                                    title="Drag to reorder / move between groups"
                                  >
                                    ⠿
                                  </td>
                                ) : (
                                  <td className="handle-col" />
                                )}
                                <td className="rail" style={{ background: color }} />
                                {columns.map((col) =>
                                  col.type === "automation" ? (
                                    <td key={col.key} className="cell cell-automation">
                                      <AutomationCell
                                        rec={rec}
                                        kids={kids}
                                        expanded={isExpanded}
                                        canRun={canRunAutomation}
                                        onToggle={() => toggleExpand(rec.id)}
                                        onOpen={(stage, tickets) => setConfirm({ rec, stage, tickets })}
                                      />
                                    </td>
                                  ) : (
                                    <td key={col.key} className={`cell cell-${col.type}`}>
                                      <Cell
                                        col={col}
                                        value={rec.fields[col.key] ?? null}
                                        jiraKey={rec.jiraKey ?? null}
                                        options={effOptions(col)}
                                        colorMap={colorOverrides[col.key]}
                                        disabled={cellDisabled(col)}
                                        saving={savingCell === `${rec.id}:${col.key}`}
                                        onCommit={(v) => saveField(rec, col.key, v)}
                                      />
                                    </td>
                                  )
                                )}
                                <td className="del-col">
                                  {canDelete && (
                                    <button
                                      className="row-del"
                                      title="Delete item"
                                      onClick={() => removeRow(rec.id)}
                                    >
                                      ×
                                    </button>
                                  )}
                                </td>
                              </tr>
                              {isExpanded &&
                                kids.map((child) => (
                                  <tr className="subrow" key={child.id}>
                                    <td className="handle-col" />
                                    <td className="rail" style={{ background: color, opacity: 0.5 }} />
                                    <td colSpan={dataCols + 1}>
                                      <SubItem
                                        child={child}
                                        canEditStatus={canStatus}
                                        onStatus={(v) => setChildStatus(child, v)}
                                      />
                                    </td>
                                  </tr>
                                ))}
                            </Fragment>
                          );
                        })}
                        {canCreate && (
                          <tr className="add-row">
                            <td className="handle-col" />
                            <td className="rail" style={{ background: color, opacity: 0.4 }} />
                            <td colSpan={dataCols + 1}>
                              <button className="add-item" onClick={() => addRow(g.key)}>
                                + Add item
                              </button>
                            </td>
                          </tr>
                        )}
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

// The Automation column: an "Open tickets" button when a playbook stage is
// eligible at the current status, and/or an expand toggle once tickets exist.
function AutomationCell({
  rec,
  kids,
  expanded,
  canRun,
  onToggle,
  onOpen,
}: {
  rec: Record;
  kids: Record[];
  expanded: boolean;
  canRun: boolean;
  onToggle: () => void;
  onOpen: (stage: string, tickets: TicketDef[]) => void;
}) {
  const elig = eligibleStage(rec.fields.workType, rec.fields.status, rec.fields.firedStages);
  const done = kids.filter((k) => String(k.fields.status ?? "") === "Done").length;

  if (!elig && kids.length === 0) return <span className="auto-none">—</span>;

  return (
    <div className="auto-cell">
      {elig && canRun && (
        <button
          className="auto-run"
          title={`Open ${elig.count} tickets`}
          onClick={() => onOpen(elig.triggerStatus, elig.tickets)}
        >
          ⚡ Open tickets ({elig.count})
        </button>
      )}
      {kids.length > 0 && (
        <button className="auto-toggle" onClick={onToggle}>
          <span className={`caret ${expanded ? "" : "closed"}`}>▾</span>
          {kids.length} ticket{kids.length === 1 ? "" : "s"} · {done}/{kids.length} done
        </button>
      )}
    </div>
  );
}

// One opened ticket, shown indented beneath its deliverable, with an editable
// status chip so you can see and advance the sub-workflow inline.
function SubItem({
  child,
  canEditStatus,
  onStatus,
}: {
  child: Record;
  canEditStatus: boolean;
  onStatus: (value: string) => void;
}) {
  const f = child.fields;
  const key = String(child.jiraKey ?? f.key ?? "");
  const team = String(f.team ?? "");
  const status = String(f.status ?? "");
  const people = splitPeople(String(f.assignee ?? ""));
  const options = ["To Do", "In Progress", "Done"];
  return (
    <div className="subitem">
      <span className="sub-elbow">↳</span>
      {key && (
        <a className="jira-key" href={`${JIRA_BASE}/browse/${key}`} target="_blank" rel="noreferrer">
          {key}
        </a>
      )}
      {team && (
        <span className="team-chip" style={{ background: chipColor(team) }}>
          {team}
        </span>
      )}
      <span className="sub-summary" title={String(f.summary ?? "")}>
        {String(f.summary ?? "")}
      </span>
      <div className="sub-status status-chip" style={{ background: chipColor(status) }}>
        {canEditStatus ? (
          <select className="status-select" value={status} onChange={(e) => onStatus(e.target.value)}>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            {status && !options.includes(status) && <option value={status}>{status}</option>}
          </select>
        ) : (
          <span className="status-readonly">{status || "—"}</span>
        )}
      </div>
      <div className="avatars">
        {people.map((p, i) => (
          <span
            key={p + i}
            className="avatar"
            style={{ background: avatarColor(p), zIndex: people.length - i }}
            title={p}
          >
            {initials(p)}
          </span>
        ))}
      </div>
    </div>
  );
}

function Cell({
  col,
  value,
  jiraKey,
  options,
  colorMap,
  disabled,
  saving,
  onCommit,
}: {
  col: ColumnDef;
  value: FieldValue;
  jiraKey: string | null;
  options?: string[];
  colorMap?: { [value: string]: string };
  disabled?: boolean;
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
    const opts = options ?? col.options ?? [];
    const color = (colorMap && colorMap[draft]) || chipColor(draft);
    if (disabled) {
      return (
        <div className="status-chip readonly" style={{ background: color }} title="No permission to edit">
          <span className="status-readonly">{draft || "—"}</span>
        </div>
      );
    }
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
          {opts.map((opt) => (
            <option key={opt} value={opt}>
              {opt || "—"}
            </option>
          ))}
          {draft && !opts.includes(draft) && <option value={draft}>{draft}</option>}
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
        {disabled ? (
          <span className="cell-input ro">{draft || "—"}</span>
        ) : (
          <input
            className={`cell-input person-input ${saving ? "is-saving" : ""}`}
            value={draft}
            placeholder="Assign…"
            list={PEOPLE_LIST_ID}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => onCommit(draft || null)}
          />
        )}
      </div>
    );
  }

  if (col.readOnly || disabled) {
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
