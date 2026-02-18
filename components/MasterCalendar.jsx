"use client";
import React, { useState, useMemo, useCallback } from "react";
import {
  PROJECT_COLORS, SUB_EVENT_STATUS_COLORS,
  WB_STATUS_STYLES,
} from "./shared/UIComponents";

const MasterCalendar = React.memo(function MasterCalendar({ projects, projectWorkback = {}, onSelectProject }) {
  const [calView, setCalView] = useState("week");
  const [navOffset, setNavOffset] = useState(0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];
  const fmt = (d) => d.toISOString().split("T")[0];
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const VIEWS = ["day", "week", "month", "quarter"];
  const viewLabels = { day: "Day", week: "Week", month: "Month", quarter: "3 Month" };
  const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // ── Build event spans (memoized — only recalcs when projects change) ──
  const spans = useMemo(() => {
    const result = [];
    projects.forEach((proj, pi) => {
      if (proj.archived) return;
      const color = PROJECT_COLORS[pi % PROJECT_COLORS.length];
      if (proj.engagementDates?.start && proj.engagementDates?.end)
        result.push({ id: `eng_${proj.id}`, label: proj.name, color, start: proj.engagementDates.start, end: proj.engagementDates.end, projId: proj.id, type: "project" });
      if (!proj.isTour && proj.eventDates?.start && proj.eventDates?.end)
        result.push({ id: `evt_${proj.id}`, label: `★ EVENT: ${proj.name}`, color, start: proj.eventDates.start, end: proj.eventDates.end, projId: proj.id, type: "event" });
    });
    return result;
  }, [projects]);

  // Sub-events indexed by date for calendar markers (memoized)
  const subEventsByDate = useMemo(() => {
    const map = {};
    projects.forEach((proj, pi) => {
      if (proj.archived || !proj.subEvents) return;
      const color = PROJECT_COLORS[pi % PROJECT_COLORS.length];
      proj.subEvents.forEach(se => {
        (map[se.date] = map[se.date] || []).push({ ...se, projId: proj.id, projName: proj.name, color });
      });
    });
    return map;
  }, [projects]);

  // Workback items indexed by date — ALL projects (memoized)
  const wbByDate = useMemo(() => {
    const map = {};
    projects.forEach((proj, pi) => {
      if (proj.archived) return;
      const color = PROJECT_COLORS[pi % PROJECT_COLORS.length];
      const items = projectWorkback[proj.id] || [];
      items.forEach(wb => {
        const st = WB_STATUS_STYLES[wb.status] || WB_STATUS_STYLES["Not Started"];
        const item = { label: wb.isEvent ? `★ ${wb.task}` : wb.task, color: wb.isEvent ? "#ff6b4a" : color, date: wb.date, projId: proj.id, projName: proj.name, isEvent: wb.isEvent, status: wb.status };
        (map[wb.date] = map[wb.date] || []).push(item);
      });
    });
    return map;
  }, [projects, projectWorkback]);

  // ── Gantt helpers (day/week views) ──
  const getGanttRange = useCallback(() => {
    if (calView === "day") { const d = addDays(today, navOffset); return { days: [d] }; }
    const d = new Date(today); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + navOffset * 7);
    return { days: Array.from({ length: 7 }, (_, i) => addDays(d, i)) };
  }, [calView, navOffset]);

  const buildGanttRows = useCallback((dayStrs) => {
    const rows = [];
    projects.forEach((proj, pi) => {
      const color = PROJECT_COLORS[pi % PROJECT_COLORS.length];
      if (proj.engagementDates.start && proj.engagementDates.end) {
        const s = dayStrs.findIndex(d => d >= proj.engagementDates.start && d <= proj.engagementDates.end);
        const e = dayStrs.reduce((last, d, i) => (d >= proj.engagementDates.start && d <= proj.engagementDates.end) ? i : last, -1);
        if (s !== -1 && e >= s) rows.push({ type: "project", label: proj.name, sub: proj.client, color, startCol: s, span: e - s + 1, projId: proj.id, pri: 0 });
      }
      if (!proj.isTour && proj.eventDates.start && proj.eventDates.end) {
        const s = dayStrs.findIndex(d => d >= proj.eventDates.start && d <= proj.eventDates.end);
        const e = dayStrs.reduce((last, d, i) => (d >= proj.eventDates.start && d <= proj.eventDates.end) ? i : last, -1);
        if (s !== -1 && e >= s) rows.push({ type: "event", label: `★ EVENT: ${proj.name}`, sub: proj.client, color, startCol: s, span: e - s + 1, projId: proj.id, pri: 1 });
      }
      // Sub-events as individual markers
      if (proj.subEvents) {
        proj.subEvents.forEach(se => {
          const idx = dayStrs.indexOf(se.date);
          if (idx === -1) return;
          const sec = SUB_EVENT_STATUS_COLORS[se.status] || SUB_EVENT_STATUS_COLORS["Confirmed"];
          rows.push({ type: "subevent", label: `🎤 ${se.venue}`, sub: se.city, color, bg: sec.bg, startCol: idx, span: 1, projId: proj.id, pri: 1.5 });
        });
      }
    });
    rows.sort((a, b) => a.pri - b.pri);
    // Map each projId to its first row index (engagement bar)
    const projRowMap = {};
    rows.forEach((row, i) => {
      if (projRowMap[row.projId] === undefined) projRowMap[row.projId] = i;
    });
    // Workback overlays — positioned on same row as parent project
    const overlays = [];
    projects.forEach((proj, pi) => {
      if (proj.archived) return;
      const projColor = PROJECT_COLORS[pi % PROJECT_COLORS.length];
      const items = projectWorkback[proj.id] || [];
      items.forEach(wb => {
        const idx = dayStrs.indexOf(wb.date);
        if (idx === -1) return;
        const parentRow = projRowMap[proj.id];
        if (parentRow === undefined) return;
        overlays.push({ type: "wb", label: wb.isEvent ? `★ ${wb.task}` : wb.task, sub: wb.owner, color: wb.isEvent ? "#ff6b4a" : projColor, bg: wb.isEvent ? "#ff6b4a22" : projColor + "35", startCol: idx, span: 1, projId: proj.id, rowIdx: parentRow });
      });
    });
    return { rows, overlays };
  }, [projects, projectWorkback]);

  // ── Month/Quarter grid builder ──
  const buildMonthWeeks = useCallback((year, month) => {
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDow = first.getDay(); // 0=Sun
    const weeks = [];
    let week = new Array(7).fill(null);
    let dow = startDow;
    for (let d = 1; d <= daysInMonth; d++) {
      week[dow] = new Date(year, month, d);
      if (dow === 6 || d === daysInMonth) {
        weeks.push(week);
        week = new Array(7).fill(null);
        dow = 0;
      } else {
        dow++;
      }
    }
    return weeks;
  }, []);

  // For a given week (array of 7 date|null), find which spans overlap and assign lanes (memoized callback)
  const getWeekLanes = useCallback((weekDates) => {
    const weekStrs = weekDates.map(d => d ? fmt(d) : null);
    const firstStr = weekStrs.find(s => s);
    const lastStr = [...weekStrs].reverse().find(s => s);
    if (!firstStr || !lastStr) return [];

    const overlapping = spans.filter(sp => sp.start <= lastStr && sp.end >= firstStr);
    // Sort: longer spans first, then events before projects
    overlapping.sort((a, b) => {
      const durA = new Date(a.end) - new Date(a.start);
      const durB = new Date(b.end) - new Date(b.start);
      if (a.type === "event" && b.type !== "event") return -1;
      if (b.type === "event" && a.type !== "event") return 1;
      return durB - durA;
    });

    return overlapping.map(sp => {
      // Find first and last column in this week that this span covers
      let startCol = -1, endCol = -1;
      for (let c = 0; c < 7; c++) {
        if (weekStrs[c] && weekStrs[c] >= sp.start && weekStrs[c] <= sp.end) {
          if (startCol === -1) startCol = c;
          endCol = c;
        }
      }
      return { ...sp, startCol, endCol, showLabel: true };
    });
  }, [spans]);

  // Title (memoized)
  const titleLabel = useMemo(() => {
    if (calView === "day") return addDays(today, navOffset).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    if (calView === "week") { const r = getGanttRange(); return `${r.days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${r.days[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`; }
    if (calView === "month") return new Date(today.getFullYear(), today.getMonth() + navOffset, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const s = new Date(today.getFullYear(), today.getMonth() + navOffset, 1);
    const e = new Date(today.getFullYear(), today.getMonth() + navOffset + 2, 1);
    return `${s.toLocaleDateString("en-US", { month: "short" })} – ${e.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
  }, [calView, navOffset, getGanttRange]);

  const isGantt = calView === "day" || calView === "week";
  const isGrid = calView === "month" || calView === "quarter";
  const isQ = calView === "quarter";

  // Month grid data (memoized)
  const monthGrids = useMemo(() => {
    if (!isGrid) return [];
    return isQ
      ? [0, 1, 2].map(m => ({ month: new Date(today.getFullYear(), today.getMonth() + navOffset + m, 1), weeks: buildMonthWeeks(today.getFullYear(), today.getMonth() + navOffset + m) }))
      : [{ month: new Date(today.getFullYear(), today.getMonth() + navOffset, 1), weeks: buildMonthWeeks(today.getFullYear(), today.getMonth() + navOffset) }];
  }, [isGrid, isQ, navOffset, buildMonthWeeks]);

  const barH = isQ ? 16 : 20;
  const barGap = isQ ? 18 : 22;

  return (
    <div>
      {/* Compute visible projects for current view */}
      {(() => {
        // Get date range for current view
        let viewStart, viewEnd;
        if (calView === "day") {
          const d = addDays(today, navOffset);
          viewStart = viewEnd = fmt(d);
        } else if (calView === "week") {
          const gr = getGanttRange();
          viewStart = fmt(gr.days[0]);
          viewEnd = fmt(gr.days[6]);
        } else if (calView === "month") {
          const m = new Date(today.getFullYear(), today.getMonth() + navOffset, 1);
          viewStart = fmt(m);
          const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0);
          viewEnd = fmt(mEnd);
        } else {
          const m = new Date(today.getFullYear(), today.getMonth() + navOffset, 1);
          viewStart = fmt(m);
          const mEnd = new Date(m.getFullYear(), m.getMonth() + navOffset + 3, 0);
          viewEnd = fmt(mEnd);
        }

        const isContextual = calView === "day" || calView === "week";
        const activeNonArchived = projects.filter(p => !p.archived);
        const visibleProjects = activeNonArchived.filter((p, i) => {
          const es = p.eventDates?.start, ee = p.eventDates?.end || p.eventDates?.start;
          const ns = p.engagementDates?.start, ne = p.engagementDates?.end || p.engagementDates?.start;
          const eventOverlap = es && (es <= viewEnd && ee >= viewStart);
          const engOverlap = ns && (ns <= viewEnd && ne >= viewStart);
          const subOverlap = p.subEvents && p.subEvents.some(se => se.date >= viewStart && se.date <= viewEnd);
          return eventOverlap || engOverlap || subOverlap;
        });

        const visibleIndexMap = visibleProjects.map(vp => projects.indexOf(vp));

        return <>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setNavOffset(p => p - 1)} style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--textMuted)", padding: "6px 10px", cursor: "pointer", fontSize: 13 }}>←</button>
          <button onClick={() => setNavOffset(0)} style={{ background: navOffset === 0 ? "#ff6b4a15" : "var(--bgCard)", border: `1px solid ${navOffset === 0 ? "#ff6b4a30" : "var(--borderSub)"}`, borderRadius: 6, color: navOffset === 0 ? "#ff6b4a" : "var(--textMuted)", padding: "6px 12px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Today</button>
          <button onClick={() => setNavOffset(p => p + 1)} style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--textMuted)", padding: "6px 10px", cursor: "pointer", fontSize: 13 }}>→</button>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#ff6b4a", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{visibleProjects.length}</div>
          <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1.5, marginBottom: 2 }}>ACTIVE PROJECT{visibleProjects.length !== 1 ? "S" : ""}</div>
          <span style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Instrument Sans'" }}>{titleLabel}</span>
        </div>
        <div style={{ display: "flex", gap: 0, background: "var(--bgInput)", borderRadius: 7, border: "1px solid var(--borderSub)", overflow: "hidden" }}>
          {VIEWS.map(v => (
            <button key={v} onClick={() => { setCalView(v); setNavOffset(0); }}
              style={{ padding: "6px 14px", background: calView === v ? "var(--borderSub)" : "transparent", border: "none", color: calView === v ? "#ff6b4a" : "var(--textFaint)", fontSize: 11, fontWeight: 600, cursor: "pointer", borderRight: "1px solid var(--borderSub)" }}>
              {viewLabels[v]}
            </button>
          ))}
        </div>
      </div>

      {/* Legend — only visible projects */}
      {visibleProjects.length > 0 && (
        <div style={{ display: "flex", gap: 14, marginBottom: 12, flexWrap: "wrap" }}>
          {visibleProjects.map((p, vi) => {
            const origIdx = visibleIndexMap[vi];
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }} onClick={() => onSelectProject(p.id)}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: PROJECT_COLORS[origIdx % PROJECT_COLORS.length] }} />
                <span style={{ fontSize: 10, color: "var(--textMuted)" }}>{p.client}</span>
              </div>
            );
          })}
        </div>
      )}
        </>;
      })()}

      {/* ═══ GANTT VIEW (Day / Week) ═══ */}
      {isGantt && (() => {
        const gr = getGanttRange();
        const dayStrs = gr.days.map(fmt);
        const colCount = gr.days.length;
        const { rows, overlays } = buildGanttRows(dayStrs);
        return (
          <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${colCount}, 1fr)`, borderBottom: "1px solid var(--borderSub)" }}>
              {gr.days.map((d, i) => {
                const ds = fmt(d); const isT = ds === todayStr;
                return (
                  <div key={i} style={{ padding: "12px 8px", textAlign: "center", borderRight: i < colCount - 1 ? "1px solid var(--calLine)" : "none" }}>
                    <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>{DOW[d.getDay()]}</div>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: isT ? "#3da5db" : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 17, fontWeight: isT ? 700 : 400, color: isT ? "#fff" : "var(--textMuted)", fontFamily: "'JetBrains Mono', monospace" }}>{d.getDate()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ position: "relative", minHeight: Math.max(rows.length * 30 + 20, 80), padding: "8px 0" }}>
              {calView === "week" && [1,2,3,4,5,6].map(i => <div key={i} style={{ position: "absolute", left: `${(i / 7) * 100}%`, top: 0, bottom: 0, width: 1, background: "var(--calLine)" }} />)}
              {(() => { const ti = dayStrs.indexOf(todayStr); return ti >= 0 ? <div style={{ position: "absolute", left: `${(ti / colCount) * 100}%`, width: `${(1 / colCount) * 100}%`, top: 0, bottom: 0, background: "#3da5db06" }} /> : null; })()}
              {rows.length === 0 && <div style={{ textAlign: "center", padding: "30px 20px", color: "var(--textGhost)", fontSize: 12 }}>No items in this view</div>}
              {rows.map((row, ri) => {
                const left = `calc(${(row.startCol / colCount) * 100}% + 2px)`;
                const width = `calc(${(row.span / colCount) * 100}% - 4px)`;
                const isEvt = row.type === "event"; const isProj = row.type === "project";
                const bg = isEvt ? row.color + "35" : isProj ? row.color + "18" : (row.bg || row.color + "12");
                const bc = isEvt ? row.color : isProj ? row.color + "60" : row.color;
                const tc = isEvt ? row.color : isProj ? row.color + "cc" : row.color;
                return (
                  <div key={ri} onClick={() => onSelectProject(row.projId)}
                    style={{ position: "absolute", top: ri * 30 + 6, left, width, height: 26, background: bg, borderLeft: `3px solid ${bc}`, borderRadius: "0 4px 4px 0", display: "flex", alignItems: "center", paddingLeft: 6, cursor: "pointer", overflow: "hidden" }}
                    title={`${row.label} — ${row.sub}`}>
                    <span style={{ fontSize: 10, fontWeight: isEvt ? 700 : 500, color: tc, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.label}</span>
                  </div>
                );
              })}
              {/* Workback overlays — sit on same row as their parent project */}
              {overlays.map((ov, oi) => {
                const left = `calc(${(ov.startCol / colCount) * 100}% + 2px)`;
                const width = `calc(${(ov.span / colCount) * 100}% - 4px)`;
                return (
                  <div key={`wb_${oi}`} onClick={() => onSelectProject(ov.projId)}
                    style={{ position: "absolute", top: ov.rowIdx * 30 + 6, left, width, height: 26, background: ov.bg, borderLeft: `3px solid ${ov.color}`, borderRadius: "0 4px 4px 0", display: "flex", alignItems: "center", paddingLeft: 5, cursor: "pointer", overflow: "hidden", zIndex: 3 }}
                    title={`${ov.label} — ${ov.sub}`}>
                    <span style={{ fontSize: 9, fontWeight: 600, color: ov.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ov.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ═══ CALENDAR MONTH GRID (Month / 3-Month) — Google Calendar style ═══ */}
      {isGrid && (
        <div style={{ display: isQ ? "grid" : "block", gridTemplateColumns: isQ ? "repeat(3, 1fr)" : "1fr", gap: isQ ? 8 : 0 }}>
          {monthGrids.map((mg, mgi) => (
            <div key={mgi} style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 12, overflow: "hidden" }}>
              {/* Month label (quarter view) */}
              {isQ && (
                <div style={{ padding: "6px 10px", borderBottom: "1px solid var(--borderSub)", fontSize: 12, fontWeight: 700, color: "var(--textSub)" }}>
                  {mg.month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </div>
              )}
              {/* DOW header */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--borderSub)" }}>
                {DOW.map(d => (
                  <div key={d} style={{ textAlign: "center", padding: isQ ? "3px 0" : "6px 0", fontSize: isQ ? 7 : 9, fontWeight: 700, color: "var(--textGhost)", letterSpacing: 0.8, borderRight: "1px solid var(--calLine)" }}>{isQ ? d.charAt(0) : d}</div>
                ))}
              </div>

              {/* Week rows */}
              {mg.weeks.map((weekDates, wi) => {
                const lanes = getWeekLanes(weekDates);
                const laneCount = lanes.length;
                // Get workback items for each day in this week
                const dayWBs = weekDates.map(d => d ? (wbByDate[fmt(d)] || []) : []);
                const maxWB = Math.max(0, ...dayWBs.map(a => a.length));
                const barsAreaH = laneCount * barGap;
                const wbAreaH = isQ ? maxWB * 14 : maxWB * 18;
                const cellMinH = isQ ? 50 : 90;
                const totalH = Math.max(cellMinH, 24 + barsAreaH + wbAreaH + 4);

                return (
                  <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: wi < mg.weeks.length - 1 ? "1px solid var(--calLine)" : "none", minHeight: totalH, position: "relative" }}>
                    {/* Day cells (date numbers + day-specific items) */}
                    {weekDates.map((cell, ci) => {
                      if (!cell) return <div key={ci} style={{ background: "var(--calBgEmpty)", borderRight: "1px solid var(--calLine)" }} />;
                      const ds = fmt(cell);
                      const isT = ds === todayStr;
                      const dayItems = dayWBs[ci];
                      return (
                        <div key={ci} style={{ borderRight: "1px solid var(--calLine)", padding: isQ ? "2px 3px" : "4px 6px", background: isT ? "#3da5db06" : "transparent", position: "relative", zIndex: 1 }}>
                          {/* Date number */}
                          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 2 }}>
                            <span style={{
                              fontSize: isQ ? 9 : 12, fontWeight: isT ? 700 : 400, fontFamily: "'JetBrains Mono', monospace",
                              color: isT ? "#fff" : cell.getDate() === 1 ? "var(--textSub)" : "var(--textFaint)",
                              background: isT ? "#3da5db" : "transparent",
                              borderRadius: "50%", width: isQ ? 16 : 24, height: isQ ? 16 : 24,
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {cell.getDate() === 1 ? cell.toLocaleDateString("en-US", { month: "short" }) + " " + cell.getDate() : cell.getDate()}
                            </span>
                          </div>
                          {/* Spacer for bar lanes */}
                          <div style={{ height: barsAreaH }} />
                          {/* Workback pills */}
                          {dayItems.map((wb, wbi) => (
                            <div key={wbi} onClick={() => onSelectProject(wb.projId)}
                              style={{
                                fontSize: isQ ? 6 : 8, fontWeight: wb.isEvent ? 700 : 500,
                                padding: isQ ? "1px 3px" : "2px 4px", marginBottom: 1, borderRadius: 3,
                                background: wb.color + "18", color: wb.color,
                                borderLeft: `2px solid ${wb.color}`,
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                cursor: "pointer",
                              }}
                              title={wb.label}>
                              {wb.label}
                            </div>
                          ))}
                          {/* Sub-event markers (tour dates) */}
                          {(subEventsByDate[ds] || []).map((se, si) => {
                            const sec = SUB_EVENT_STATUS_COLORS[se.status] || SUB_EVENT_STATUS_COLORS["Confirmed"];
                            return (
                              <div key={`se${si}`} onClick={() => onSelectProject(se.projId)}
                                style={{
                                  fontSize: isQ ? 6 : 8, fontWeight: 600,
                                  padding: isQ ? "1px 3px" : "2px 4px", marginBottom: 1, borderRadius: 3,
                                  background: se.color + "20", color: se.color,
                                  borderLeft: `2px solid ${se.color}`,
                                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                  cursor: "pointer",
                                }}
                                title={`${se.venue} — ${se.city}`}>
                                {isQ ? "🎤" : `🎤 ${se.venue}`}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}

                    {/* Spanning bars (absolute, over the cells) */}
                    {lanes.map((lane, li) => {
                      const isEvt = lane.type === "event";
                      const left = `calc(${(lane.startCol / 7) * 100}% + 1px)`;
                      const width = `calc(${((lane.endCol - lane.startCol + 1) / 7) * 100}% - 2px)`;
                      const topOffset = (isQ ? 18 : 26) + li * barGap;
                      return (
                        <div key={`lane_${li}`} onClick={() => onSelectProject(lane.projId)}
                          style={{
                            position: "absolute", top: topOffset, left, width, height: barH, zIndex: 2,
                            background: isEvt ? lane.color + "40" : lane.color + "22",
                            borderRadius: 3, display: "flex", alignItems: "center", paddingLeft: 5,
                            cursor: "pointer", overflow: "hidden",
                          }}
                          title={lane.label}>
                          {lane.showLabel && (
                            <span style={{ fontSize: isQ ? 7 : 9, fontWeight: isEvt ? 700 : 500, color: isEvt ? lane.color : lane.color + "dd", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {lane.label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default MasterCalendar;
