"use client";
import React, { useCallback, useMemo, useRef, useEffect } from "react";

/* ───────────────────────────── helpers ───────────────────────────── */

const TYPE_META = {
  mention:    { icon: "\uD83D\uDCAC", color: "#a78bfa" },
  status:     { icon: "\uD83D\uDFE0", color: "#f97316" },
  reminder:   { icon: "\u23F0",       color: "#eab308" },
  assignment: { icon: "\uD83D\uDC64", color: "#3b82f6" },
  overdue:    { icon: "\uD83D\uDD34", color: "#ef4444" },
};

function relativeTime(iso) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  return `${w}w ago`;
}

/* ──────────────────────── keyframe style tag ─────────────────────── */

const KEYFRAMES = `
@keyframes slideInRight {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}
@keyframes fadeInBackdrop {
  from { opacity: 0; }
  to   { opacity: 1; }
}
`;

/* ──────────────────────── component ─────────────────────────────── */

const NotificationInbox = React.memo(function NotificationInbox({
  open,
  onClose,
  notifications,
  setNotifications,
  onNavigate,
}) {
  const panelRef = useRef(null);

  /* ── close on Escape ── */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  /* ── derived data ── */
  const unreadCount = useMemo(
    () => (notifications || []).filter((n) => !n.read).length,
    [notifications],
  );

  const { unread, read } = useMemo(() => {
    const u = [];
    const r = [];
    (notifications || []).forEach((n) => (n.read ? r : u).push(n));
    return { unread: u, read: r };
  }, [notifications]);

  /* ── actions ── */
  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [setNotifications]);

  const markRead = useCallback(
    (id) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    },
    [setNotifications],
  );

  const dismiss = useCallback(
    (id, e) => {
      e.stopPropagation();
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    },
    [setNotifications],
  );

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, [setNotifications]);

  const handleClick = useCallback(
    (n) => {
      markRead(n.id);
      if (onNavigate) onNavigate({ projectId: n.projectId, tab: "overview" });
    },
    [markRead, onNavigate],
  );

  /* ── bail early ── */
  if (!open) return null;

  /* ──────────────────── styles ──────────────────── */

  const s = {
    backdrop: {
      position: "fixed",
      inset: 0,
      zIndex: 9997,
      background: "rgba(0,0,0,0.35)",
      animation: "fadeInBackdrop 0.15s ease",
    },

    panel: {
      position: "fixed",
      right: 0,
      top: 0,
      bottom: 0,
      width: 380,
      zIndex: 9998,
      background: "var(--bgCard)",
      borderLeft: "1px solid var(--border)",
      boxShadow: "-8px 0 30px rgba(0,0,0,0.15)",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'DM Sans', sans-serif",
      color: "var(--text)",
      animation: "slideInRight 0.2s ease",
    },

    /* header */
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "18px 20px 14px",
      borderBottom: "1px solid var(--border)",
      flexShrink: 0,
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    title: {
      fontSize: 17,
      fontWeight: 700,
      letterSpacing: "-0.01em",
    },
    badge: {
      background: "#ff6b4a",
      color: "#fff",
      fontSize: 11,
      fontWeight: 700,
      borderRadius: 10,
      padding: "2px 8px",
      lineHeight: "16px",
    },
    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    markAllBtn: {
      background: "none",
      border: "none",
      color: "#ff6b4a",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      padding: "4px 8px",
      borderRadius: 6,
      fontFamily: "'DM Sans', sans-serif",
    },
    closeBtn: {
      background: "none",
      border: "none",
      color: "var(--textMuted)",
      fontSize: 20,
      cursor: "pointer",
      padding: "2px 6px",
      borderRadius: 6,
      lineHeight: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },

    /* list */
    list: {
      flex: 1,
      overflowY: "auto",
      padding: "8px 0",
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: "var(--textFaint)",
      padding: "12px 20px 6px",
    },

    /* card */
    card: (isUnread) => ({
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      padding: "12px 20px",
      cursor: "pointer",
      borderLeft: isUnread ? "3px solid #ff6b4a" : "3px solid transparent",
      background: isUnread ? "var(--bgHover)" : "transparent",
      position: "relative",
      transition: "background 0.15s ease",
    }),
    iconWrap: (color) => ({
      width: 34,
      height: 34,
      borderRadius: 8,
      background: color + "18",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 16,
      flexShrink: 0,
    }),
    cardBody: {
      flex: 1,
      minWidth: 0,
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--text)",
      lineHeight: 1.35,
      marginBottom: 2,
    },
    cardDetail: {
      fontSize: 12,
      color: "var(--textMuted)",
      lineHeight: 1.4,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      marginBottom: 5,
    },
    cardMeta: {
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    projectTag: {
      fontSize: 10,
      fontWeight: 600,
      background: "var(--bgInput)",
      color: "var(--textFaint)",
      borderRadius: 4,
      padding: "2px 6px",
      border: "1px solid var(--borderSub)",
      maxWidth: 140,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    timestamp: {
      fontSize: 10,
      color: "var(--textFaint)",
      fontFamily: "'JetBrains Mono', monospace",
    },
    cardRight: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
      paddingTop: 2,
      flexShrink: 0,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: "#3b82f6",
    },
    dismissBtn: {
      background: "none",
      border: "none",
      color: "var(--textFaint)",
      fontSize: 14,
      cursor: "pointer",
      padding: 0,
      lineHeight: 1,
      opacity: 0.5,
      transition: "opacity 0.15s ease",
    },

    /* empty */
    empty: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      color: "var(--textFaint)",
    },
    emptyIcon: {
      width: 52,
      height: 52,
      borderRadius: "50%",
      background: "var(--bgInput)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 24,
    },
    emptyText: {
      fontSize: 14,
      fontWeight: 600,
    },

    /* footer */
    footer: {
      borderTop: "1px solid var(--border)",
      padding: "12px 20px",
      flexShrink: 0,
      display: "flex",
      justifyContent: "center",
    },
    clearAllBtn: {
      background: "none",
      border: "1px solid var(--borderSub)",
      color: "var(--textMuted)",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      padding: "6px 18px",
      borderRadius: 8,
      fontFamily: "'DM Sans', sans-serif",
      transition: "background 0.15s ease, color 0.15s ease",
    },
  };

  /* ──────────────── notification card renderer ──────────────── */

  const renderCard = (n) => {
    const meta = TYPE_META[n.type] || TYPE_META.mention;
    return (
      <div
        key={n.id}
        style={s.card(!n.read)}
        onClick={() => handleClick(n)}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bgHover)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = !n.read
            ? "var(--bgHover)"
            : "transparent";
        }}
      >
        {/* icon */}
        <div style={s.iconWrap(meta.color)}>
          <span>{meta.icon}</span>
        </div>

        {/* body */}
        <div style={s.cardBody}>
          <div style={s.cardTitle}>{n.title}</div>
          <div style={s.cardDetail} title={n.detail}>
            {n.detail}
          </div>
          <div style={s.cardMeta}>
            <span style={s.projectTag} title={n.projectName}>
              {n.projectName}
            </span>
            <span style={s.timestamp}>{relativeTime(n.timestamp)}</span>
          </div>
        </div>

        {/* right side */}
        <div style={s.cardRight}>
          {!n.read && <span style={s.unreadDot} />}
          <button
            style={s.dismissBtn}
            title="Dismiss"
            onClick={(e) => dismiss(n.id, e)}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.5";
            }}
          >
            &#x2715;
          </button>
        </div>
      </div>
    );
  };

  /* ──────────────── render ──────────────── */

  const isEmpty = (notifications || []).length === 0;

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* backdrop */}
      <div style={s.backdrop} onClick={onClose} />

      {/* panel */}
      <div ref={panelRef} style={s.panel}>
        {/* header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <span style={s.title}>Notifications</span>
            {unreadCount > 0 && <span style={s.badge}>{unreadCount}</span>}
          </div>
          <div style={s.headerRight}>
            {unreadCount > 0 && (
              <button
                style={s.markAllBtn}
                onClick={markAllRead}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bgHover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
                }}
              >
                Mark all read
              </button>
            )}
            <button
              style={s.closeBtn}
              onClick={onClose}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--textMuted)";
              }}
            >
              &#x2715;
            </button>
          </div>
        </div>

        {/* body */}
        {isEmpty ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>
              <span>&#x2713;</span>
            </div>
            <span style={s.emptyText}>You're all caught up!</span>
          </div>
        ) : (
          <div style={s.list}>
            {/* Unread / "New" section */}
            {unread.length > 0 && (
              <>
                <div style={s.sectionLabel}>New</div>
                {unread.map(renderCard)}
              </>
            )}

            {/* Read / "Earlier" section */}
            {read.length > 0 && (
              <>
                <div style={s.sectionLabel}>Earlier</div>
                {read.map(renderCard)}
              </>
            )}
          </div>
        )}

        {/* footer */}
        {!isEmpty && (
          <div style={s.footer}>
            <button
              style={s.clearAllBtn}
              onClick={clearAll}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bgHover)";
                e.currentTarget.style.color = "var(--text)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.color = "var(--textMuted)";
              }}
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </>
  );
});

export default NotificationInbox;
