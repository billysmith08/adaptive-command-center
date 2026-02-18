"use client";
import React, { useState, useMemo } from "react";

const FILTER_OPTIONS = ["All", "Status", "Budget", "Files", "People", "Dates"];

const CATEGORY_COLORS = {
  status: "#ff6b4a",
  budget: "#4ecb71",
  files: "#3da5db",
  people: "#9b6dff",
  dates: "#dba94e",
  other: "var(--textFaint)",
};

const CATEGORY_ICONS = {
  status: "\uD83D\uDFE0",
  budget: "\uD83D\uDCB0",
  files: "\uD83D\uDCC1",
  people: "\uD83D\uDC64",
  dates: "\uD83D\uDCC5",
  other: "\uD83D\uDCDD",
};

function classifyEntry(action, detail) {
  const a = (action || "").toLowerCase();
  const d = (detail || "").toLowerCase();
  if (a.includes("status") || a.includes("archived")) return "status";
  if (d.includes("budget") || d.includes("spent")) return "budget";
  if (a.includes("uploaded") || a.includes("file")) return "files";
  if (a.includes("assigned") || a.includes("producer") || a.includes("manager") || d.includes("staff")) return "people";
  if (d.includes("date") || d.includes("event") || d.includes("engagement")) return "dates";
  return "other";
}

function getDayLabel(ts) {
  const now = new Date();
  const date = new Date(ts);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;

  if (ts >= todayStart) return "Today";
  if (ts >= yesterdayStart) return "Yesterday";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(ts, dayLabel) {
  const date = new Date(ts);
  const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  if (dayLabel === "Today" || dayLabel === "Yesterday") return timeStr;
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${dateStr}, ${timeStr}`;
}

function matchesFilter(entry, filter) {
  if (filter === "All") return true;
  const category = classifyEntry(entry.action, entry.detail);
  return category === filter.toLowerCase();
}

const ProjectTimeline = React.memo(function ProjectTimeline({
  activityLog,
  projectId,
  collapsed,
  setCollapsed,
}) {
  const [filter, setFilter] = useState("All");

  const filteredEntries = useMemo(() => {
    if (!activityLog || !Array.isArray(activityLog)) return [];

    const projectEntries = activityLog.filter((entry) => {
      // Support both projectId and project (name) matching
      if (entry.projectId && projectId) return entry.projectId === projectId;
      if (entry.projectName && projectId) return entry.projectName === projectId;
      if (entry.project && projectId) return entry.project === projectId;
      return false;
    });

    const sorted = [...projectEntries].sort((a, b) => {
      const tsA = a.timestamp || a.ts || 0;
      const tsB = b.timestamp || b.ts || 0;
      return tsB - tsA;
    });

    const matched = sorted.filter((entry) => matchesFilter(entry, filter));

    return matched.slice(0, 50);
  }, [activityLog, projectId, filter]);

  const groupedEntries = useMemo(() => {
    const groups = [];
    let currentLabel = null;
    let currentGroup = null;

    for (const entry of filteredEntries) {
      const ts = entry.timestamp || entry.ts || 0;
      const label = getDayLabel(ts);

      if (label !== currentLabel) {
        currentLabel = label;
        currentGroup = { label, entries: [] };
        groups.push(currentGroup);
      }
      currentGroup.entries.push(entry);
    }

    return groups;
  }, [filteredEntries]);

  const entryCount = filteredEntries.length;

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10 }}>
        {/* Header */}
        <div
          onClick={() => setCollapsed((p) => !p)}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 9,
                color: "var(--textFaint)",
                fontWeight: 600,
                letterSpacing: 1,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              PROJECT TIMELINE
            </span>
            {entryCount > 0 && (
              <span
                style={{
                  fontSize: 9,
                  padding: "1px 6px",
                  borderRadius: 8,
                  background: "var(--bgCard)",
                  color: "var(--textMuted)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {entryCount}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Filter dropdown — stop propagation so clicking it doesn't toggle collapse */}
            {!collapsed && (
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  fontSize: 10,
                  padding: "3px 8px",
                  background: "var(--bgCard)",
                  border: "1px solid var(--borderSub)",
                  borderRadius: 6,
                  color: "var(--textMuted)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {FILTER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
            <span
              style={{
                fontSize: 10,
                color: "var(--textGhost)",
                transition: "transform 0.2s",
                transform: collapsed ? "rotate(0deg)" : "rotate(90deg)",
              }}
            >
              &#9654;
            </span>
          </div>
        </div>

        {/* Expanded content */}
        {!collapsed && (
          <div
            style={{
              padding: "0 20px 18px",
              animation: "fadeUp 0.2s ease",
            }}
          >
            {filteredEntries.length === 0 ? (
              <div
                style={{
                  padding: "32px 0",
                  textAlign: "center",
                  color: "var(--textGhost)",
                  fontSize: 12,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                No activity recorded yet
              </div>
            ) : (
              <div style={{ position: "relative", paddingLeft: 32 }}>
                {/* Vertical timeline line */}
                <div
                  style={{
                    position: "absolute",
                    left: 20,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: "var(--borderSub)",
                    borderRadius: 1,
                  }}
                />

                {groupedEntries.map((group, gi) => (
                  <div key={group.label} style={{ marginBottom: gi < groupedEntries.length - 1 ? 16 : 0 }}>
                    {/* Day group header */}
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        marginBottom: 10,
                        paddingTop: gi > 0 ? 6 : 0,
                      }}
                    >
                      {/* Circle dot on the line */}
                      <div
                        style={{
                          position: "absolute",
                          left: -18,
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#ff6b4a",
                          border: "2px solid var(--bgInput)",
                          zIndex: 1,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--text)",
                          fontFamily: "'DM Sans', sans-serif",
                          letterSpacing: 0.3,
                        }}
                      >
                        {group.label}
                      </span>
                    </div>

                    {/* Entries in this group */}
                    {group.entries.map((entry) => {
                      const category = classifyEntry(entry.action, entry.detail);
                      const color = CATEGORY_COLORS[category];
                      const icon = CATEGORY_ICONS[category];
                      const ts = entry.timestamp || entry.ts || 0;
                      const timeStr = formatTime(ts, group.label);
                      const userName = entry.user || "unknown";

                      return (
                        <div
                          key={entry.id}
                          style={{
                            position: "relative",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            marginBottom: 8,
                          }}
                        >
                          {/* Colored dot on the timeline */}
                          <div
                            style={{
                              position: "absolute",
                              left: -16,
                              top: 8,
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: color,
                              zIndex: 1,
                            }}
                          />

                          {/* Entry card */}
                          <div
                            style={{
                              flex: 1,
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 8,
                              padding: "8px 12px",
                              background: "var(--bgCard)",
                              border: "1px solid var(--borderSub)",
                              borderRadius: 8,
                              minHeight: 36,
                            }}
                          >
                            {/* Icon */}
                            <span style={{ fontSize: 13, lineHeight: "18px", flexShrink: 0 }}>
                              {icon}
                            </span>

                            {/* Text content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "var(--text)",
                                  fontFamily: "'DM Sans', sans-serif",
                                  lineHeight: 1.4,
                                }}
                              >
                                <span style={{ fontWeight: 600, color: "var(--text)" }}>
                                  {userName}
                                </span>{" "}
                                <span style={{ color: "var(--textMuted)" }}>
                                  {entry.action}
                                </span>
                              </div>
                              {entry.detail && (
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "var(--textFaint)",
                                    fontFamily: "'DM Sans', sans-serif",
                                    marginTop: 2,
                                    lineHeight: 1.3,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {entry.detail}
                                </div>
                              )}
                            </div>

                            {/* Time */}
                            <span
                              style={{
                                fontSize: 10,
                                color: "var(--textGhost)",
                                fontFamily: "'JetBrains Mono', monospace",
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                                lineHeight: "18px",
                              }}
                            >
                              {timeStr}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default ProjectTimeline;
