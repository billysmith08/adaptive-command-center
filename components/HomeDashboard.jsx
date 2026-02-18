"use client";
import React, { useMemo, useState } from "react";

// ─── HELPER: relative time label ─────────────────────────────────────────────
function relativeTime(ts) {
  if (!ts) return "";
  const now = Date.now();
  const diff = now - (typeof ts === "number" ? ts : new Date(ts).getTime());
  if (diff < 0) return "just now";
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 7200000) return "1 hr ago";
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hrs ago`;
  if (diff < 172800000) return "Yesterday";
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
  return new Date(typeof ts === "number" ? ts : ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── HELPER: relative future label ───────────────────────────────────────────
function relativeFuture(dateStr) {
  if (!dateStr) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T12:00:00");
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / 86400000);
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `In ${diffDays} days`;
}

// ─── HELPER: format date short ───────────────────────────────────────────────
function fmtDateShort(dateStr) {
  if (!dateStr) return "–";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  wrapper: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "32px 24px 60px",
    animation: "fadeUp 0.3s ease",
    fontFamily: "'DM Sans', sans-serif",
  },
  sectionHeader: {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 1,
    color: "var(--textFaint)",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  card: {
    background: "var(--bgInput)",
    border: "1px solid var(--borderSub)",
    borderRadius: 10,
    padding: 20,
  },
  bigNumber: {
    fontSize: 28,
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
    lineHeight: 1.2,
  },
  cardLabel: {
    fontSize: 11,
    color: "var(--textMuted)",
    fontWeight: 500,
    marginTop: 4,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 14px",
    borderBottom: "1px solid var(--borderSub)",
    cursor: "pointer",
    transition: "background 0.15s",
    fontSize: 12,
  },
  mono: {
    fontFamily: "'JetBrains Mono', monospace",
  },
  emptyState: {
    padding: "28px 16px",
    textAlign: "center",
    color: "var(--textGhost)",
    fontSize: 12,
    fontStyle: "italic",
  },
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────
const HomeDashboard = React.memo(function HomeDashboard({
  user,
  projects,
  projectWorkback,
  activityLog,
  contacts,
  clients,
  onSelectProject,
  setActiveTab,
}) {
  const [hoveredRow, setHoveredRow] = useState(null);

  // Flatten projectWorkback dict into a single array with project references
  const workback = React.useMemo(() => {
    if (!projectWorkback) return [];
    return Object.entries(projectWorkback).flatMap(([pid, items]) =>
      (Array.isArray(items) ? items : []).filter(w => w.task && w.task.trim()).map(w => ({
        ...w, _pid: pid, _pName: projects.find(p => p.id === pid)?.name || "Unknown"
      }))
    );
  }, [projectWorkback, projects]);

  // ── Greeting ────────────────────────────────────────────────────────────────
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    const firstName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
    const period = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
    return `Good ${period}, ${firstName}`;
  }, [user]);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }, []);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];
    const inSevenDays = new Date(today);
    inSevenDays.setDate(inSevenDays.getDate() + 7);
    const sevenDayStr = inSevenDays.toISOString().split("T")[0];

    // Active projects (not archived, not sub-projects)
    const activeProjects = (projects || []).filter(p => !p.archived && !p.parentId);

    // This Week — projects with event dates in next 7 days
    const thisWeek = activeProjects.filter(p => {
      const evtStart = p.eventDates?.start;
      if (!evtStart) return false;
      return evtStart >= todayStr && evtStart <= sevenDayStr;
    });

    // Overdue tasks
    const overdueTasks = (workback || []).filter(w => {
      if (!w.date) return false;
      if (w.status === "Complete" || w.status === "Done" || w.status === "N/A") return false;
      return w.date < todayStr;
    });

    // Budget alerts — projects at 90%+ spend
    const budgetAlerts = activeProjects.filter(p => {
      if (!p.budget || p.budget <= 0) return false;
      return (p.spent || 0) / p.budget >= 0.9;
    });

    return {
      activeCount: activeProjects.length,
      thisWeekCount: thisWeek.length,
      overdueCount: overdueTasks.length,
      budgetAlertCount: budgetAlerts.length,
    };
  }, [projects, workback]);

  // ── Upcoming (next 7 days) ──────────────────────────────────────────────────
  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];
    const inSevenDays = new Date(today);
    inSevenDays.setDate(inSevenDays.getDate() + 7);
    const sevenDayStr = inSevenDays.toISOString().split("T")[0];

    const items = [];

    // Workback items in next 7 days (not complete)
    (workback || []).forEach(w => {
      if (!w.date) return;
      if (w.status === "Complete" || w.status === "Done" || w.status === "N/A") return;
      if (w.date >= todayStr && w.date <= sevenDayStr) {
        const proj = (projects || []).find(p => p.id === w._pid || p.id === w.projectId);
        items.push({
          date: w.date,
          name: w.isEvent ? `★ ${w.task}` : w.task,
          projectName: w._pName || proj?.name || "–",
          projectId: w._pid || w.projectId || "",
          type: "task",
        });
      }
    });

    // Projects with event start dates in next 7 days
    (projects || []).forEach(p => {
      if (p.archived) return;
      const evtStart = p.eventDates?.start;
      if (evtStart && evtStart >= todayStr && evtStart <= sevenDayStr) {
        items.push({
          date: evtStart,
          name: `★ Event: ${p.name}`,
          projectName: p.name,
          projectId: p.id,
          type: "event",
        });
      }
    });

    // Sort by date
    items.sort((a, b) => a.date.localeCompare(b.date));

    return items.slice(0, 10);
  }, [workback, projects]);

  // ── Needs Attention ─────────────────────────────────────────────────────────
  const attention = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];
    const items = [];

    const activeProjects = (projects || []).filter(p => !p.archived && !p.parentId);

    // Build a map of project → overdue count from workback
    const overdueByProject = {};
    (workback || []).forEach(w => {
      if (!w.date) return;
      if (w.status === "Complete" || w.status === "Done" || w.status === "N/A") return;
      if (w.date < todayStr) {
        const pid = w._pid || w.projectId || "";
        overdueByProject[pid] = (overdueByProject[pid] || 0) + 1;
      }
    });

    activeProjects.forEach(p => {
      // Overdue tasks
      if (overdueByProject[p.id]) {
        items.push({
          projectId: p.id,
          projectName: p.name,
          indicator: "overdue",
          reason: `${overdueByProject[p.id]} overdue task${overdueByProject[p.id] > 1 ? "s" : ""}`,
        });
      }

      // Budget >= 90% spent
      if (p.budget && p.budget > 0 && (p.spent || 0) / p.budget >= 0.9) {
        const pct = Math.round(((p.spent || 0) / p.budget) * 100);
        items.push({
          projectId: p.id,
          projectName: p.name,
          indicator: "budget",
          reason: `Budget ${pct}% spent`,
        });
      }

      // Status "Live" but no event dates set
      if (p.status === "Live" && (!p.eventDates?.start || !p.eventDates?.end)) {
        items.push({
          projectId: p.id,
          projectName: p.name,
          indicator: "missing",
          reason: "Live but no event dates set",
        });
      }
    });

    return items.slice(0, 8);
  }, [projects, workback]);

  // ── Recent Activity ─────────────────────────────────────────────────────────
  const recentActivity = useMemo(() => {
    if (!activityLog || activityLog.length === 0) return [];
    const sorted = [...activityLog].sort((a, b) => {
      const tsA = a.ts || a.timestamp || 0;
      const tsB = b.ts || b.timestamp || 0;
      return tsB - tsA;
    });
    return sorted.slice(0, 15);
  }, [activityLog]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={S.wrapper}>

      {/* ── 1. Greeting Header ────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>
            {greeting}
          </div>
          <div style={{ fontSize: 12, color: "var(--textMuted)", marginTop: 4 }}>
            Welcome to your Command Center
          </div>
        </div>
        <div style={{ fontSize: 13, color: "var(--textFaint)", fontWeight: 500, ...S.mono }}>
          {todayFormatted}
        </div>
      </div>

      {/* ── 2. Stats Row ──────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 32 }}>
        {[
          { icon: "📁", value: stats.activeCount, label: "Active Projects", alert: false },
          { icon: "📅", value: stats.thisWeekCount, label: "This Week", alert: false },
          { icon: "⚠", value: stats.overdueCount, label: "Overdue Tasks", alert: true },
          { icon: "💰", value: stats.budgetAlertCount, label: "Budget Alerts", alert: true },
        ].map((s, i) => (
          <div key={i} style={S.card}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>{s.icon}</div>
            <div style={{
              ...S.bigNumber,
              color: s.alert && s.value > 0 ? "#ff6b4a" : "var(--text)",
            }}>
              {s.value}
            </div>
            <div style={S.cardLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── 3. Upcoming (Next 7 Days) ─────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={S.sectionHeader}>Upcoming &mdash; Next 7 Days</div>
        <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "90px 2fr 1.4fr 110px",
            padding: "10px 16px",
            borderBottom: "1px solid var(--borderSub)",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1,
            color: "var(--textFaint)",
          }}>
            <span>DATE</span>
            <span>TASK / EVENT</span>
            <span>PROJECT</span>
            <span style={{ textAlign: "right" }}>WHEN</span>
          </div>

          {upcoming.length === 0 ? (
            <div style={S.emptyState}>No upcoming deadlines</div>
          ) : upcoming.map((item, i) => {
            const rowKey = `upcoming-${i}`;
            const isHovered = hoveredRow === rowKey;
            return (
              <div
                key={rowKey}
                style={{
                  ...S.row,
                  display: "grid",
                  gridTemplateColumns: "90px 2fr 1.4fr 110px",
                  background: isHovered ? "var(--bgHover)" : (i % 2 === 0 ? "transparent" : "var(--bgCard)"),
                  borderLeft: item.type === "event" ? "3px solid #ff6b4a" : "3px solid transparent",
                }}
                onClick={() => item.projectId && onSelectProject(item.projectId)}
                onMouseEnter={() => setHoveredRow(rowKey)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <span style={{ fontSize: 11, color: "var(--textSub)", ...S.mono }}>
                  {fmtDateShort(item.date)}
                </span>
                <span style={{
                  fontSize: 12,
                  color: item.type === "event" ? "#ff6b4a" : "var(--text)",
                  fontWeight: item.type === "event" ? 600 : 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {item.name}
                </span>
                <span style={{
                  fontSize: 11,
                  color: "var(--textMuted)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {item.projectName}
                </span>
                <span style={{
                  fontSize: 10,
                  color: "var(--textFaint)",
                  textAlign: "right",
                  fontWeight: 600,
                  ...S.mono,
                }}>
                  {relativeFuture(item.date)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. Needs Attention ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={S.sectionHeader}>Needs Attention</div>
        <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, overflow: "hidden" }}>
          {attention.length === 0 ? (
            <div style={S.emptyState}>All projects on track</div>
          ) : attention.map((item, i) => {
            const rowKey = `attn-${i}`;
            const isHovered = hoveredRow === rowKey;
            const indicatorMap = {
              overdue: { emoji: "\uD83D\uDD34", color: "#e85454" },
              budget: { emoji: "\uD83D\uDFE1", color: "#f5a623" },
              missing: { emoji: "\uD83D\uDFE1", color: "#f5a623" },
            };
            const ind = indicatorMap[item.indicator] || indicatorMap.missing;
            return (
              <div
                key={rowKey}
                style={{
                  ...S.row,
                  background: isHovered ? "var(--bgHover)" : "transparent",
                }}
                onClick={() => item.projectId && onSelectProject(item.projectId)}
                onMouseEnter={() => setHoveredRow(rowKey)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <span style={{ fontSize: 12, flexShrink: 0 }}>{ind.emoji}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#ff6b4a", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.projectName}
                </span>
                <span style={{ fontSize: 11, color: ind.color, fontWeight: 500, marginLeft: "auto", flexShrink: 0 }}>
                  {item.reason}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 5. Recent Activity ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={S.sectionHeader}>Recent Activity</div>
        <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, overflow: "hidden" }}>
          {recentActivity.length === 0 ? (
            <div style={S.emptyState}>No activity yet</div>
          ) : recentActivity.map((entry, i) => {
            const rowKey = `activity-${i}`;
            const isHovered = hoveredRow === rowKey;
            const ts = entry.ts || entry.timestamp || 0;
            const projectId = entry.projectId || "";
            const projectName = entry.project || entry.projectName || "";
            const actionIcon = entry.action === "workback" ? "◄"
              : entry.action === "run of show" ? "▶"
              : entry.action === "vendor" ? "⊕"
              : entry.action === "updated" ? "✎"
              : "•";

            return (
              <div
                key={entry.id || rowKey}
                style={{
                  ...S.row,
                  background: isHovered ? "var(--bgHover)" : "transparent",
                }}
                onClick={() => {
                  if (projectId) {
                    onSelectProject(projectId);
                  } else if (projectName) {
                    // Try to find project by name
                    const p = (projects || []).find(pr => pr.name === projectName);
                    if (p) onSelectProject(p.id);
                  }
                }}
                onMouseEnter={() => setHoveredRow(rowKey)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Avatar */}
                <div style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "#ff6b4a18",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#ff6b4a",
                  flexShrink: 0,
                }}>
                  {(entry.user || "?")[0].toUpperCase()}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <span style={{ fontWeight: 700, color: "#ff6b4a" }}>{entry.user || "unknown"}</span>
                    <span style={{ color: "var(--textMuted)" }}> {actionIcon} {entry.action}: </span>
                    <span style={{ color: "var(--textSub)" }}>{entry.detail}</span>
                  </div>
                  {projectName && (
                    <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "var(--bgCard)", color: "var(--textFaint)", fontWeight: 600 }}>
                        {projectName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Time */}
                <div style={{
                  fontSize: 10,
                  color: "var(--textGhost)",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                  ...S.mono,
                }}>
                  {relativeTime(ts)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default HomeDashboard;
