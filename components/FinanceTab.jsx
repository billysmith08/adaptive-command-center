"use client";
import React from "react";

function FinanceTab({
  projects,
  setProjects,
  finFilterStatus,
  setFinFilterStatus,
  finFilterMonth,
  setFinFilterMonth,
  finShowSubs,
  setFinShowSubs,
  expandedRetainers,
  setExpandedRetainers,
  appSettings,
  saveSettings,
  setActiveProjectId,
  setActiveTab,
}) {
  const monthOrder = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const monthAbbr = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const parseNum = (v) => { if (!v && v !== 0) return 0; const n = parseFloat(String(v).replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
  const evalFormula = (raw) => {
    if (!raw && raw !== 0) return 0;
    const str = String(raw).replace(/[$,]/g, "").trim();
    if (/^-?[\d.]+$/.test(str)) return parseFloat(str) || 0;
    if (/^[\d.+\-*/() ]+$/.test(str)) { try { const r = new Function("return (" + str + ")")(); return typeof r === "number" && isFinite(r) ? r : 0; } catch { return 0; } }
    return parseNum(raw);
  };
  const fmtMoney = (v) => { const n = parseNum(v); if (n === 0) return ""; const abs = Math.abs(n); const str = "$" + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); return n < 0 ? "-" + str : str; };
  const moneyColor = (v) => { const n = parseNum(v); return n < 0 ? "#e85454" : n > 0 ? "#4ecb71" : "var(--textGhost)"; };
  const statusMap = { "In-Production": "Active", "Exploration": "Prospecting", "Wrap": "Complete", "Archived": "Archived" };
  const statusColors = { Active: "#4ecb71", "In-Production": "#4ecb71", "On Hold": "#dba94e", Complete: "#3da5db", Wrap: "#3da5db", Cancelled: "#ff4a6b", Prospecting: "#9b6dff", Exploration: "#9b6dff", Archived: "#8a8680" };

  // Auto-derive month from eventDates.start
  const getProjectMonth = (p) => {
    if (p.projectMonth) return p.projectMonth;
    if (p.eventDates?.start) {
      const d = new Date(p.eventDates.start + "T00:00:00");
      if (!isNaN(d)) return monthOrder[d.getMonth()];
    }
    return "";
  };

  const allProjects = projects.filter(p => (finShowSubs || !p.parentId) && p.status !== "Archived");

  // Apply filters
  const Q1 = ["January","February","March"];
  const Q2 = ["April","May","June"];
  const Q3 = ["July","August","September"];
  const Q4 = ["October","November","December"];
  const quarterMap = { Q1, Q2, Q3, Q4 };

  const filtered = allProjects.filter(p => {
    if (finFilterStatus !== "all" && p.status !== finFilterStatus) return false;
    if (finFilterMonth !== "all") {
      const pm = getProjectMonth(p);
      if (finFilterMonth === "year") return true; // show all for "Full Year"
      if (quarterMap[finFilterMonth]) return quarterMap[finFilterMonth].includes(pm);
      if (pm !== finFilterMonth) return false;
    }
    return true;
  });

  const sorted = (() => {
    const byMonth = [...filtered].sort((a, b) => {
      const ma = monthOrder.indexOf(getProjectMonth(a));
      const mb = monthOrder.indexOf(getProjectMonth(b));
      return (ma === -1 ? 99 : ma) - (mb === -1 ? 99 : mb);
    });
    if (!finShowSubs) return byMonth;
    // Group subs under their parents
    const parents = byMonth.filter(p => !p.parentId);
    const subs = byMonth.filter(p => p.parentId);
    const ordered = [];
    parents.forEach(p => {
      ordered.push(p);
      subs.filter(s => s.parentId === p.id).forEach(s => ordered.push(s));
    });
    // Orphan subs (parent not in filtered set)
    subs.filter(s => !parents.some(p => p.id === s.parentId)).forEach(s => ordered.push(s));
    return ordered;
  })();

  // Custom columns from appSettings (synced to Supabase via app_settings table)
  const savedCols = appSettings.finCustomCols || [];
  const addCustomCol = () => {
    const name = prompt("Column name:");
    if (!name) return;
    const key = "fin_c_" + name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const updated = { ...appSettings, finCustomCols: [...(appSettings.finCustomCols || []), { key, label: name }] };
    saveSettings(updated);
  };
  const removeCustomCol = (key) => {
    if (!confirm("Remove this column?")) return;
    const updated = { ...appSettings, finCustomCols: (appSettings.finCustomCols || []).filter(c => c.key !== key), finColOrder: (appSettings.finColOrder || []).filter(k => k !== key) };
    saveSettings(updated);
  };

  // Column ordering
  const builtInCols = [
    { key: "fin_walkout", label: "PROD FEE", width: 120, builtIn: true },
    { key: "fin_talent", label: "TALENT FEE", width: 110, builtIn: true },
    { key: "fin_prodCoord", label: "PROD. COORD", width: 110, builtIn: true },
    { key: "fin_showCoord", label: "SHOW COORD", width: 110, builtIn: true },
  ];
  const allColDefs = [...builtInCols, ...savedCols.map(c => ({ key: c.key, label: c.label.toUpperCase(), width: 120, builtIn: false }))];
  const colOrder = appSettings.finColOrder || allColDefs.map(c => c.key);
  // Ensure any new cols not in order get appended
  const orderedCols = [
    ...colOrder.filter(k => allColDefs.some(c => c.key === k)).map(k => allColDefs.find(c => c.key === k)),
    ...allColDefs.filter(c => !colOrder.includes(c.key)),
  ];
  const moveCol = (key, dir) => {
    const keys = orderedCols.map(c => c.key);
    const idx = keys.indexOf(key);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= keys.length) return;
    const copy = [...keys];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    const updated = { ...appSettings, finColOrder: copy };
    saveSettings(updated);
  };

  // Calculate sums (including retainer monthly data)
  const retainerMonthSum = (p, field) => {
    const months = p.fin_retainer_months || {};
    return Object.values(months).reduce((s, m) => s + parseNum(m[field]), 0);
  };
  const sumField = (field) => sorted.reduce((s, p) => {
    if (p.isRetainer) return s + retainerMonthSum(p, field);
    return s + parseNum(p[field]);
  }, 0);
  const rowSum = (p) => {
    if (p.isRetainer) {
      const months = p.fin_retainer_months || {};
      return Object.values(months).reduce((s, m) => {
        return s + orderedCols.reduce((ms, c) => ms + parseNum(m[c.key]), 0);
      }, 0);
    }
    return orderedCols.reduce((s, c) => s + parseNum(p[c.key]), 0);
  };
  const updateRetainerMonth = (projectId, month, field, value) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const months = { ...(p.fin_retainer_months || {}) };
      months[month] = { ...(months[month] || {}), [field]: value };
      return { ...p, fin_retainer_months: months };
    }));
  };
  const toggleRetainer = (projectId) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, isRetainer: !p.isRetainer } : p));
  };
  const totalWalkout = sumField("fin_walkout");
  const totalTalent = sumField("fin_talent");
  const totalProdCoord = sumField("fin_prodCoord");
  const totalShowCoord = sumField("fin_showCoord");
  const totalSum = sorted.reduce((s, p) => s + rowSum(p), 0);

  const colStyle = { padding: "8px 10px", fontSize: 12, borderBottom: "1px solid var(--borderSub)", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" };
  const headerStyle = { ...colStyle, fontSize: 9, fontWeight: 700, letterSpacing: 0.8, color: "var(--textFaint)", background: "var(--bgHover)", position: "sticky", top: 0, zIndex: 5, fontFamily: "'Instrument Sans', sans-serif" };
  const inputStyle = { width: "100%", background: "transparent", border: "none", color: "var(--text)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: "none", padding: 0 };
  const updateFinField = (projectId, field, value) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, [field]: value } : p));
  };

  // Unique statuses and months for filter dropdowns
  const uniqueStatuses = [...new Set(allProjects.map(p => p.status))].sort();
  const uniqueMonths = [...new Set(allProjects.map(p => getProjectMonth(p)).filter(Boolean))].sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>ADMIN · FINANCIALS</div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Instrument Sans'" }}>💰 Finance Overview</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Filters */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select value={finFilterMonth} onChange={e => setFinFilterMonth(e.target.value)} style={{ padding: "5px 8px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--text)", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
              <option value="all">All Months</option>
              <option value="year">Full Year</option>
              <option disabled>──────────</option>
              <option value="Q1">Q1 (Jan-Mar)</option>
              <option value="Q2">Q2 (Apr-Jun)</option>
              <option value="Q3">Q3 (Jul-Sep)</option>
              <option value="Q4">Q4 (Oct-Dec)</option>
              <option disabled>──────────</option>
              {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={finFilterStatus} onChange={e => setFinFilterStatus(e.target.value)} style={{ padding: "5px 8px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--text)", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
              <option value="all">All Statuses</option>
              {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {(finFilterMonth !== "all" || finFilterStatus !== "all") && (
              <button onClick={() => { setFinFilterMonth("all"); setFinFilterStatus("all"); }} style={{ padding: "4px 8px", background: "#e8545410", border: "1px solid #e8545420", borderRadius: 4, color: "#e85454", cursor: "pointer", fontSize: 9, fontWeight: 700 }}>✕ Clear</button>
            )}
            <button onClick={() => setFinShowSubs(!finShowSubs)} style={{ padding: "5px 8px", background: finShowSubs ? "#9b6dff10" : "var(--bgCard)", border: `1px solid ${finShowSubs ? "#9b6dff30" : "var(--borderSub)"}`, borderRadius: 6, color: finShowSubs ? "#9b6dff" : "var(--textFaint)", cursor: "pointer", fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }} title={finShowSubs ? "Hide sub-projects" : "Show sub-projects"}>{finShowSubs ? "▾" : "▸"} Subs</button>
          </div>
          <button onClick={addCustomCol} style={{ padding: "5px 10px", background: "#3da5db10", border: "1px solid #3da5db25", borderRadius: 6, color: "#3da5db", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>+ Column</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, padding: "8px 14px", minWidth: 110 }}>
          <div style={{ fontSize: 8, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 2 }}>TOTAL PROD FEE</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: moneyColor(totalWalkout), fontFamily: "'JetBrains Mono', monospace" }}>{fmtMoney(totalWalkout) || "$0.00"}</div>
        </div>
        <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, padding: "8px 14px", minWidth: 110 }}>
          <div style={{ fontSize: 8, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 2 }}>TOTAL FEES</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: moneyColor(totalTalent + totalProdCoord + totalShowCoord), fontFamily: "'JetBrains Mono', monospace" }}>{fmtMoney(totalTalent + totalProdCoord + totalShowCoord) || "$0.00"}</div>
        </div>
        <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, padding: "8px 14px", minWidth: 110 }}>
          <div style={{ fontSize: 8, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 2 }}>Σ TOTAL</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: moneyColor(totalSum), fontFamily: "'JetBrains Mono', monospace" }}>{fmtMoney(totalSum) || "$0.00"}</div>
        </div>
        <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, padding: "8px 14px", minWidth: 80 }}>
          <div style={{ fontSize: 8, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 2 }}>PROJECTS</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", fontFamily: "'JetBrains Mono', monospace" }}>{sorted.length}{finShowSubs ? ` (${sorted.filter(p => p.parentId).length} subs)` : ""}{finFilterMonth !== "all" || finFilterStatus !== "all" ? `/${allProjects.length}` : ""}</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 300px)" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 540 + orderedCols.length * 130 }}>
            <thead>
              <tr>
                <th style={{ ...headerStyle, width: 200, textAlign: "left" }}>PROJECTS</th>
                <th style={{ ...headerStyle, width: 90, textAlign: "center" }}>STATUS</th>
                <th style={{ ...headerStyle, width: 60, textAlign: "center" }}>MONTH</th>
                <th style={{ ...headerStyle, width: 180, textAlign: "left" }}>NOTES</th>
                {orderedCols.map((c, ci) => (
                  <th key={c.key} style={{ ...headerStyle, width: c.width, textAlign: "right", cursor: "default", userSelect: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
                      {ci > 0 && <span onClick={() => moveCol(c.key, -1)} style={{ cursor: "pointer", fontSize: 7, color: "var(--textGhost)", padding: "0 1px", opacity: 0.5, transition: "opacity 0.15s" }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.5} title="Move left">◀</span>}
                      <span>{c.label}</span>
                      {ci < orderedCols.length - 1 && <span onClick={() => moveCol(c.key, 1)} style={{ cursor: "pointer", fontSize: 7, color: "var(--textGhost)", padding: "0 1px", opacity: 0.5, transition: "opacity 0.15s" }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.5} title="Move right">▶</span>}
                      {!c.builtIn && <span onClick={(e) => { e.stopPropagation(); removeCustomCol(c.key); }} style={{ marginLeft: 2, color: "#e85454", cursor: "pointer", opacity: 0.5, fontSize: 8 }} title="Remove column">✕</span>}
                    </div>
                  </th>
                ))}
                <th style={{ ...headerStyle, width: 120, textAlign: "right" }}>Σ SUM</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, idx) => {
                const rs = rowSum(p);
                const code = p.code || "";
                const month = getProjectMonth(p);
                const monthIdx = monthOrder.indexOf(month);
                const isExpanded = expandedRetainers.has(p.id);
                const isSub = !!p.parentId;
                const rows = [];

                // Main project row
                rows.push(
                  <tr key={p.id} style={{ background: isSub ? "#9b6dff06" : idx % 2 === 0 ? "transparent" : "var(--bgHover)" }} onMouseEnter={e => e.currentTarget.style.background = "#ff6b4a08"} onMouseLeave={e => e.currentTarget.style.background = isSub ? "#9b6dff06" : idx % 2 === 0 ? "transparent" : "var(--bgHover)"}>
                    <td style={{ ...colStyle, textAlign: "left" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: isSub ? 24 : 0 }}>
                        {p.isRetainer && (
                          <button onClick={() => setExpandedRetainers(prev => { const next = new Set(prev); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); return next; })} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "#9b6dff", padding: 0, width: 16 }}>{isExpanded ? "▼" : "▶"}</button>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: isSub ? "var(--textSub)" : "var(--text)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }} onClick={() => { setActiveProjectId(p.id); setActiveTab("overview"); }}>
                            {isSub && <span style={{ color: "#9b6dff", fontSize: 10 }}>↳</span>}
                            {p.name}
                            {p.isRetainer && <span onClick={(e) => { e.stopPropagation(); const clearData = confirm(`Remove retainer mode from "${p.name}"?\n\nClick OK to remove retainer mode.\n(Monthly data will be preserved — you can re-enable retainer later to see it again.)`); if (clearData) { toggleRetainer(p.id); } }} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: "#9b6dff18", color: "#9b6dff", fontWeight: 700, cursor: "pointer", border: "1px solid #9b6dff25", display: "inline-flex", alignItems: "center", gap: 3 }} title="Click to remove retainer mode">RETAINER <span style={{ fontSize: 11, lineHeight: 1 }}>✕</span></span>}
                            {!p.isRetainer && !isSub && <span onClick={(e) => { e.stopPropagation(); if (confirm(`Mark "${p.name}" as a retainer project? This enables monthly breakdown tracking.`)) toggleRetainer(p.id); }} style={{ fontSize: 7, padding: "1px 4px", borderRadius: 3, background: "var(--bgInput)", color: "var(--textGhost)", fontWeight: 600, cursor: "pointer", opacity: 0, transition: "opacity 0.15s" }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0} title="Mark as retainer">+ RTN</span>}
                            {isSub && <span style={{ fontSize: 7, padding: "1px 4px", borderRadius: 3, background: "#9b6dff10", color: "#9b6dff", fontWeight: 700 }}>SUB</span>}
                          </div>
                          {code && <div style={{ fontSize: 9, color: "var(--textFaint)", fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>{code}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ ...colStyle, textAlign: "center" }}>
                      <span style={{ display: "inline-block", background: (statusColors[p.status] || "#888") + "20", color: statusColors[p.status] || "var(--text)", borderRadius: 4, padding: "3px 8px", fontWeight: 700, fontSize: 9, fontFamily: "'Instrument Sans', sans-serif", whiteSpace: "nowrap" }}>
                        {statusMap[p.status] || p.status}
                      </span>
                    </td>
                    <td style={{ ...colStyle, textAlign: "center", fontSize: 10, color: p.isRetainer ? "#9b6dff" : (month ? "var(--text)" : "var(--textGhost)"), fontFamily: "'Instrument Sans', sans-serif" }}>
                      {p.isRetainer ? "Recurring" : (monthIdx >= 0 ? monthAbbr[monthIdx] : "—")}
                    </td>
                    <td style={{ ...colStyle, textAlign: "left" }}>
                      {p.isRetainer ? (
                        <span style={{ fontSize: 10, color: "var(--textFaint)", fontStyle: "italic" }}>{isExpanded ? "Monthly breakdown below" : "Click ▶ to expand months"}</span>
                      ) : (
                        <input value={p.fin_notes || ""} onChange={e => updateFinField(p.id, "fin_notes", e.target.value)} style={{ ...inputStyle, fontSize: 11, fontFamily: "'Instrument Sans', sans-serif" }} placeholder="Notes..." />
                      )}
                    </td>
                    {orderedCols.map(c => (
                      <td key={c.key} style={{ ...colStyle, textAlign: "right", fontWeight: p.isRetainer ? 700 : 400, color: p.isRetainer ? moneyColor(retainerMonthSum(p, c.key)) : moneyColor(p[c.key]) }}>
                        {p.isRetainer ? (fmtMoney(retainerMonthSum(p, c.key)) || "—") : (
                          <input value={p[c.key] || ""} onChange={e => updateFinField(p.id, c.key, e.target.value)} style={{ ...inputStyle, textAlign: "right", color: moneyColor(p[c.key]) }} placeholder="$0.00" onBlur={e => { const v = evalFormula(e.target.value); if (v) updateFinField(p.id, c.key, v.toFixed(2)); }} />
                        )}
                      </td>
                    ))}
                    <td style={{ ...colStyle, textAlign: "right", fontWeight: 700, color: moneyColor(rs) }}>
                      {rs !== 0 ? fmtMoney(rs) : "—"}
                    </td>
                  </tr>
                );

                // Retainer monthly sub-rows
                if (p.isRetainer && isExpanded) {
                  const retainerData = p.fin_retainer_months || {};
                  const hasMonthlyData = Object.values(retainerData).some(md => Object.values(md).some(v => v && v !== "0" && v !== "0.00" && v !== ""));
                  monthOrder.forEach((mo, mi) => {
                    const md = retainerData[mo] || {};
                    const monthRowSum = orderedCols.reduce((s, c) => s + parseNum(md[c.key]), 0);
                    rows.push(
                      <tr key={`${p.id}_${mo}`} style={{ background: "#9b6dff06" }}>
                        <td style={{ ...colStyle, textAlign: "left", paddingLeft: 40 }}>
                          <span style={{ fontSize: 11, color: "#9b6dff", fontWeight: 600 }}>{mo}</span>
                        </td>
                        <td style={{ ...colStyle, textAlign: "center" }}>
                          <span style={{ fontSize: 8, color: "var(--textGhost)" }}>{monthAbbr[mi]}</span>
                        </td>
                        <td style={{ ...colStyle, textAlign: "center", fontSize: 9, color: "var(--textGhost)" }}>{monthAbbr[mi]}</td>
                        <td style={{ ...colStyle, textAlign: "left" }}>
                          <input value={md.fin_notes || ""} onChange={e => updateRetainerMonth(p.id, mo, "fin_notes", e.target.value)} style={{ ...inputStyle, fontSize: 10, fontFamily: "'Instrument Sans', sans-serif" }} placeholder="Notes..." />
                        </td>
                        {orderedCols.map(c => (
                          <td key={c.key} style={{ ...colStyle, textAlign: "right" }}>
                            <input value={md[c.key] || ""} onChange={e => updateRetainerMonth(p.id, mo, c.key, e.target.value)} style={{ ...inputStyle, textAlign: "right", color: moneyColor(md[c.key]), fontSize: 11 }} placeholder="$0.00" onBlur={e => { const v = evalFormula(e.target.value); if (v) updateRetainerMonth(p.id, mo, c.key, v.toFixed(2)); }} />
                          </td>
                        ))}
                        <td style={{ ...colStyle, textAlign: "right", fontWeight: 600, color: moneyColor(monthRowSum), fontSize: 11 }}>
                          {monthRowSum !== 0 ? fmtMoney(monthRowSum) : "—"}
                        </td>
                      </tr>
                    );
                  });
                  // Clear monthly data button
                  if (hasMonthlyData) {
                    rows.push(
                      <tr key={`${p.id}_clear`} style={{ background: "#9b6dff04" }}>
                        <td colSpan={4 + orderedCols.length + 1} style={{ ...colStyle, paddingLeft: 40 }}>
                          <button onClick={(e) => { e.stopPropagation(); if (confirm(`Clear ALL monthly data for "${p.name}"? This cannot be undone.`)) { setProjects(prev => prev.map(pp => pp.id === p.id ? { ...pp, fin_retainer_months: {} } : pp)); } }} style={{ padding: "3px 10px", background: "#e8545408", border: "1px solid #e8545420", borderRadius: 4, color: "#e85454", cursor: "pointer", fontSize: 8, fontWeight: 600 }}>🗑 Clear All Monthly Data</button>
                        </td>
                      </tr>
                    );
                  }
                }

                return rows;
              })}
              {/* Totals row */}
              <tr style={{ background: "var(--bgHover)", borderTop: "2px solid var(--border)" }}>
                <td style={{ ...colStyle, fontWeight: 700, fontSize: 11, fontFamily: "'Instrument Sans', sans-serif" }}>TOTALS ({sorted.length} project{sorted.length !== 1 ? "s" : ""})</td>
                <td style={colStyle} />
                <td style={colStyle} />
                <td style={colStyle} />
                {orderedCols.map(c => {
                  const colTotal = sumField(c.key);
                  return <td key={c.key} style={{ ...colStyle, textAlign: "right", fontWeight: 700, color: moneyColor(colTotal) }}>{fmtMoney(colTotal)}</td>;
                })}
                <td style={{ ...colStyle, textAlign: "right", fontWeight: 700, fontSize: 13, color: moneyColor(totalSum) }}>{fmtMoney(totalSum)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ fontSize: 10, color: "var(--textGhost)", marginTop: 10, textAlign: "right" }}>Admin-only · Supports formulas (e.g. 5990/2) · Use ◀ ▶ arrows on column headers to reorder · Right-click project name to toggle retainer · Click "Subs" to show sub-projects</div>
    </div>
  );
}

export default FinanceTab;
