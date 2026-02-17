"use client";
import React, { useState } from "react";

export default function ProgressTab({
  project, projects, vendors, projectVendors, workback,
  progress, setProgress,
  prFilters, setPrFilters, prShowFilters, setPrShowFilters, prSort, setPrSort,
  DEPT_OPTIONS, DEPT_COLORS, WB_STATUSES, WB_STATUS_STYLES,
  fmt, fmtShort, DeptTag, EditableText,
}) {
  return (
  // Auto-populate 20 empty rows on first visit
  if ((progress.rows || []).length === 0) {
    const emptyRows = Array.from({ length: 20 }, (_, i) => ({ id: `pr_init_${i}`, done: false, task: "", dept: "", location: "", responsible: "", status: "Not Started", notes: "" }));
    setTimeout(() => setProgress(prev => ({ ...prev, rows: emptyRows })), 0);
  }
  const prRows = progress.rows || [];
  const prLocs = progress.locations || [];
  const allDepts = [...new Set([...DEPT_OPTIONS, ...(appSettings.departments || [])])].filter(Boolean).sort();
  const eventContactNames = [...new Set([
    ...project.producers, ...project.managers, ...(project.staff || []),
    ...(project.clientContacts || []).filter(p => p.name).map(p => p.name),
    ...(project.pocs || []).filter(p => p.name).map(p => p.name),
    ...(project.billingContacts || []).filter(p => p.name).map(p => p.name),
    ...vendors.map(v => v.name).filter(Boolean),
  ])].sort();

  // Helpers
  const addPRRow = () => {
    pushUndoSnapshot();
    const newRow = { id: `pr_${Date.now()}`, done: false, task: "", dept: "", location: "", responsible: "", status: "Not Started", notes: "" };
    setProgress(prev => ({ ...prev, rows: [...(prev.rows || []), newRow] }));
  };
  const updatePRRow = (id, field, value) => {
    pushUndoSnapshot();
    setProgress(prev => ({
      ...prev,
      rows: (prev.rows || []).map(r => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        if (field === "status" && value === "Done") updated.done = true;
        if (field === "status" && value !== "Done") updated.done = false;
        return updated;
      })
    }));
  };
  const togglePRDone = (id) => {
    setProgress(prev => ({
      ...prev,
      rows: (prev.rows || []).map(r => {
        if (r.id !== id) return r;
        const newDone = !r.done;
        return { ...r, done: newDone, status: newDone ? "Done" : (r.status === "Done" ? "Not Started" : r.status) };
      })
    }));
  };
  const deletePRRow = (id) => { pushUndoSnapshot(); setProgress(prev => ({ ...prev, rows: (prev.rows || []).filter(r => r.id !== id) })); };
  const addPRLocation = () => {
    const name = prompt("Enter location name:");
    if (name && name.trim()) setProgress(prev => ({ ...prev, locations: [...(prev.locations || []), name.trim()].sort() }));
  };
  const removePRLocation = (idx) => setProgress(prev => ({ ...prev, locations: (prev.locations || []).filter((_, i) => i !== idx) }));

  // Filtering
  const filtered = prRows.filter(r => {
    for (const key of Object.keys(prFilters)) {
      const fv = prFilters[key];
      if (!fv) continue;
      const rv = (r[key] || "").toLowerCase();
      if (key === "task" || key === "notes") { if (!rv.includes(fv.toLowerCase())) return false; }
      else { if (rv !== fv.toLowerCase()) return false; }
    }
    return true;
  });

  // Sorting
  const sorted = [...filtered];
  if (prSort.col) {
    sorted.sort((a, b) => {
      let va, vb;
      if (prSort.col === "status") { va = WB_STATUSES.indexOf(a.status); vb = WB_STATUSES.indexOf(b.status); }
      else { va = (a[prSort.col] || "").toLowerCase(); vb = (b[prSort.col] || "").toLowerCase(); }
      if (va < vb) return prSort.dir === "asc" ? -1 : 1;
      if (va > vb) return prSort.dir === "asc" ? 1 : -1;
      return 0;
    });
  }

  const hasActiveFilters = Object.values(prFilters).some(f => f);
  const done = filtered.filter(r => r.status === "Done").length;
  const inProg = filtered.filter(r => r.status === "In Progress").length;
  const atRisk = filtered.filter(r => r.status === "At Risk").length;
  const notStarted = filtered.filter(r => r.status === "Not Started").length;

  const prColDefs = [
    { key: "task", label: "TASK", type: "text" },
    { key: "dept", label: "DEPARTMENT", type: "select", options: allDepts },
    { key: "location", label: "LOCATION", type: "select", options: prLocs },
    { key: "responsible", label: "RESPONSIBLE", type: "select", options: eventContactNames },
    { key: "status", label: "STATUS", type: "select", options: WB_STATUSES },
    { key: "notes", label: "NOTES", type: "text" },
  ];

  const handlePRSort = (col) => {
    if (prSort.col === col) {
      if (prSort.dir === "asc") setPrSort({ col, dir: "desc" });
      else setPrSort({ col: null, dir: "asc" });
    } else setPrSort({ col, dir: "asc" });
  };

  return (
  <div style={{ animation: "fadeUp 0.3s ease" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <div><div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>PROGRESS REPORT</div><div style={{ fontSize: 12, color: "var(--textMuted)" }}>Track tasks, ownership, and status across all workstreams</div></div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setPrShowFilters(p => !p)} style={{ padding: "7px 14px", background: prShowFilters ? "#3da5db20" : "#3da5db10", border: `1px solid ${prShowFilters ? "#3da5db40" : "#3da5db25"}`, borderRadius: 7, color: "#3da5db", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>⊘ Filter</button>
        <label style={{ padding: "7px 14px", background: "#9b6dff10", border: "1px solid #9b6dff25", borderRadius: 7, color: "#9b6dff", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 13 }}>📊</span> Import CSV
          <input type="file" accept=".csv,.tsv" hidden onChange={e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
              const text = ev.target.result;
              const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
              if (lines.length < 2) return;
              const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
              const colMap = {};
              headers.forEach((h, i) => {
                if (h.includes("task") || h.includes("item") || h.includes("name")) colMap.task = i;
                if (h.includes("dept") || h.includes("department")) colMap.dept = i;
                if (h.includes("location") || h.includes("loc")) colMap.location = i;
                if (h.includes("responsible") || h.includes("owner") || h.includes("assigned")) colMap.responsible = i;
                if (h.includes("status")) colMap.status = i;
                if (h.includes("note")) colMap.notes = i;
              });
              if (colMap.task === undefined) { colMap.task = 0; }
              pushUndoSnapshot();
              const newRows = lines.slice(1).map(line => {
                const cells = line.match(/(".*?"|[^",]+|(?<=,)(?=,))/g)?.map(c => c.replace(/^"|"$/g, "").trim()) || line.split(",").map(c => c.trim());
                return {
                  id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  done: false,
                  task: cells[colMap.task] || "",
                  dept: cells[colMap.dept] || "",
                  location: cells[colMap.location] || "",
                  responsible: cells[colMap.responsible] || "",
                  status: cells[colMap.status] || "Not Started",
                  notes: cells[colMap.notes] || "",
                };
              }).filter(r => r.task);
              setProgress(prev => ({ ...prev, rows: [...(prev.rows || []).filter(r => r.task), ...newRows] }));
              logActivity("progress", `imported ${newRows.length} tasks from CSV`, project?.name);
            };
            reader.readAsText(file);
            e.target.value = "";
          }} />
        </label>
        <button onClick={addPRRow} style={{ padding: "7px 14px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 7, color: "#ff6b4a", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>+ Add Row</button>
      </div>
    </div>
    {/* Location config */}
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: "10px 10px 0 0", fontSize: 11, flexWrap: "wrap" }}>
      <span style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 0.5 }}>LOCATIONS:</span>
      {prLocs.map((l, i) => <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "#9b6dff15", border: "1px solid #9b6dff30", borderRadius: 12, fontSize: 10, color: "#9b6dff", fontWeight: 600 }}>{l} <span onClick={() => removePRLocation(i)} style={{ cursor: "pointer", opacity: 0.6, fontSize: 11 }}>×</span></span>)}
      <button onClick={addPRLocation} style={{ padding: "2px 8px", background: "none", border: "1px dashed var(--borderSub)", borderRadius: 12, fontSize: 10, color: "var(--textFaint)", cursor: "pointer" }}>+ Add</button>
      <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--textGhost)" }}>Define project locations → populates dropdown below</span>
    </div>
    {/* Active filters bar */}
    {hasActiveFilters && (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", background: "#ff6b4a08", border: "1px solid var(--borderSub)", borderTop: "none", flexWrap: "wrap" }}>
        <span style={{ fontSize: 9, color: "#ff6b4a", fontWeight: 700 }}>FILTERS:</span>
        {Object.entries(prFilters).filter(([,v]) => v).map(([k, v]) => (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 12, fontSize: 10, color: "#ff6b4a", fontWeight: 600 }}>
            {prColDefs.find(c => c.key === k)?.label || k}: {v}
            <span onClick={() => setPrFilters(p => ({ ...p, [k]: "" }))} style={{ cursor: "pointer", opacity: 0.6, fontSize: 11 }}>×</span>
          </span>
        ))}
        <button onClick={() => setPrFilters({ task: "", dept: "", location: "", responsible: "", status: "", notes: "" })} style={{ padding: "2px 8px", background: "none", border: "1px solid #ff6b4a30", borderRadius: 12, fontSize: 9, color: "#ff6b4a", cursor: "pointer", fontWeight: 600, marginLeft: "auto" }}>Clear All</button>
      </div>
    )}
    <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderTop: hasActiveFilters ? "none" : undefined, borderRadius: hasActiveFilters ? 0 : "0 0 10px 10px" }}>
      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 360px)", minHeight: 300 }}>
        <div style={{ minWidth: 1050 }}>
          {/* Column headers with sort + filter */}
          <div style={{ display: "grid", gridTemplateColumns: "40px 1.6fr 1fr 1fr 1fr 0.8fr 1.5fr 36px", padding: "0 16px", borderBottom: "1px solid var(--borderSub)", position: "sticky", top: 0, background: "var(--bgInput)", zIndex: 2 }}>
            <div style={{ padding: "8px 0" }} />
            {prColDefs.map(col => {
              const isSorted = prSort.col === col.key;
              const arrow = isSorted ? (prSort.dir === "asc" ? "↑" : "↓") : "↕";
              const hasFilter = prFilters[col.key] && prFilters[col.key] !== "";
              return (
                <div key={col.key} style={{ padding: "8px 0 6px", display: "flex", flexDirection: "column" }}>
                  <div onClick={() => handlePRSort(col.key)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: isSorted ? "#ff6b4a" : "var(--textFaint)", fontWeight: 700, letterSpacing: 1, cursor: "pointer", marginBottom: prShowFilters ? 4 : 0, userSelect: "none" }}>{col.label} <span style={{ fontSize: 8 }}>{arrow}</span></div>
                  {prShowFilters && (col.type === "text" ? (
                    <input value={prFilters[col.key]} onChange={e => setPrFilters(p => ({ ...p, [col.key]: e.target.value }))} placeholder="Filter..." style={{ fontSize: 10, padding: "3px 5px", borderRadius: 4, border: `1px solid ${hasFilter ? "#ff6b4a50" : "var(--borderSub)"}`, background: hasFilter ? "#ff6b4a08" : "var(--bgCard)", color: hasFilter ? "#ff6b4a" : "var(--textFaint)", outline: "none", width: "100%", fontFamily: "'DM Sans'" }} />
                  ) : (
                    <select value={prFilters[col.key]} onChange={e => setPrFilters(p => ({ ...p, [col.key]: e.target.value }))} style={{ fontSize: 10, padding: "3px 5px", borderRadius: 4, border: `1px solid ${hasFilter ? "#ff6b4a50" : "var(--borderSub)"}`, background: hasFilter ? "#ff6b4a08" : "var(--bgCard)", color: hasFilter ? "#ff6b4a" : "var(--textFaint)", outline: "none", width: "100%", fontFamily: "'DM Sans'", cursor: "pointer" }}>
                      <option value="">All</option>
                      {[...new Set([...col.options, ...prRows.map(r => r[col.key]).filter(Boolean)])].sort().map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ))}
                </div>
              );
            })}
            <div style={{ padding: "8px 0" }} />
          </div>
          {/* Rows */}
          {sorted.length === 0 && prRows.length > 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--textFaint)", fontSize: 13 }}>No tasks match the current filters</div>}
          {sorted.length === 0 && prRows.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--textFaint)", fontSize: 13 }}><div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>☰</div><div style={{ fontWeight: 600, marginBottom: 6 }}>No progress tasks yet</div><div style={{ fontSize: 11, color: "var(--textGhost)" }}>Click "+ Add Row" to start tracking</div></div>}
          {sorted.map(r => {
            const sc = WB_STATUS_STYLES[r.status] || {};
            return (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "40px 1.6fr 1fr 1fr 1fr 0.8fr 1.5fr 36px", padding: "7px 16px", borderBottom: "1px solid var(--calLine)", alignItems: "center" }}>
                <div onClick={() => togglePRDone(r.id)} style={{ width: 16, height: 16, border: `1.5px solid ${r.done ? "#4ecb71" : "var(--borderActive)"}`, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: r.done ? "#4ecb71" : "transparent", background: r.done ? "#4ecb7120" : "transparent", transition: "all 0.15s" }}>✓</div>
                <EditableText value={r.task} onChange={v => updatePRRow(r.id, "task", v)} fontSize={12} color={r.done ? "var(--textFaint)" : "var(--text)"} fontWeight={500} placeholder="Task name..." style={r.done ? { textDecoration: "line-through" } : {}} />
                <Dropdown value={r.dept} options={allDepts} onChange={v => updatePRRow(r.id, "dept", v)} width="100%" allowBlank blankLabel="—" />
                <Dropdown value={r.location} options={prLocs} onChange={v => updatePRRow(r.id, "location", v)} width="100%" allowBlank blankLabel="—" />
                <Dropdown value={r.responsible} options={eventContactNames} onChange={v => updatePRRow(r.id, "responsible", v)} width="100%" allowBlank blankLabel="—" />
                <Dropdown value={r.status} options={WB_STATUSES} onChange={v => updatePRRow(r.id, "status", v)} colors={Object.fromEntries(WB_STATUSES.map(s => [s, { bg: WB_STATUS_STYLES[s].bg, text: WB_STATUS_STYLES[s].text, dot: WB_STATUS_STYLES[s].text }]))} width="100%" />
                <EditableText value={r.notes} onChange={v => updatePRRow(r.id, "notes", v)} fontSize={11} color="var(--textFaint)" placeholder="Notes..." />
                <button onClick={() => deletePRRow(r.id)} style={{ background: "none", border: "none", color: "var(--textGhost)", cursor: "pointer", fontSize: 14 }}>×</button>
              </div>
            );
          })}
        </div>
      </div>
      {/* Summary bar */}
      <div style={{ display: "flex", gap: 16, padding: "10px 16px", borderTop: "1px solid var(--borderSub)", fontSize: 10, color: "var(--textFaint)", alignItems: "center" }}>
        <span>{hasActiveFilters ? <span style={{ color: "#ff6b4a" }}>{filtered.length} of {prRows.length} shown</span> : `${prRows.length} tasks`}</span>
        <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#4ecb71", marginRight: 4 }} />{done} done</span>
        <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#3da5db", marginRight: 4 }} />{inProg} in progress</span>
        <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#e85454", marginRight: 4 }} />{atRisk} at risk</span>
        <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#8a8680", marginRight: 4 }} />{notStarted} not started</span>
        <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{filtered.length > 0 ? Math.round(done / filtered.length * 100) : 0}% complete</span>
      </div>
    </div>
  </div>
  );
  );
}
