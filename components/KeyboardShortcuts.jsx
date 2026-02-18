"use client";
import React from "react";

const SHORTCUT_SECTIONS = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Search everything (Command Palette)" },
      { keys: ["⌘", "S"], description: "Force save to cloud" },
    ],
  },
  {
    title: "Editing",
    shortcuts: [
      { keys: ["⌘", "Z"], description: "Undo" },
      {
        keys: ["⌘", "Shift", "Z"],
        altKeys: ["⌘", "Y"],
        description: "Redo",
      },
    ],
  },
  {
    title: "Modals",
    shortcuts: [
      { keys: ["Esc"], description: "Close current modal/panel" },
      { keys: ["?"], description: "Show this shortcuts panel" },
    ],
  },
];

const kbdStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1,
  minWidth: 24,
  padding: "4px 8px",
  borderRadius: 6,
  background: "var(--bgInput)",
  border: "1px solid var(--borderSub)",
  color: "var(--text)",
  boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(0,0,0,0.55)",
  backdropFilter: "blur(6px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  animation: "fadeUp 0.15s ease",
};

const dialogStyle = {
  width: 480,
  maxWidth: "calc(100vw - 32px)",
  background: "var(--bgCard)",
  borderRadius: 16,
  border: "1px solid var(--border)",
  boxShadow: "0 24px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  animation: "fadeUp 0.15s ease",
};

function Kbd({ children }) {
  return <kbd style={kbdStyle}>{children}</kbd>;
}

function KeyCombo({ keys }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {keys.map((k, i) => (
        <Kbd key={i}>{k}</Kbd>
      ))}
    </span>
  );
}

function ShortcutRow({ shortcut }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <KeyCombo keys={shortcut.keys} />
        {shortcut.altKeys && (
          <>
            <span
              style={{
                fontSize: 11,
                color: "var(--textFaint)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              or
            </span>
            <KeyCombo keys={shortcut.altKeys} />
          </>
        )}
      </div>
      <span
        style={{
          fontSize: 13,
          color: "var(--textMuted)",
          fontFamily: "'DM Sans', sans-serif",
          textAlign: "right",
        }}
      >
        {shortcut.description}
      </span>
    </div>
  );
}

const KeyboardShortcuts = React.memo(function KeyboardShortcuts({
  open,
  onClose,
}) {
  if (!open) return null;

  return (
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={dialogStyle}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>⌨️</span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Keyboard Shortcuts
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 18,
              color: "var(--textMuted)",
              cursor: "pointer",
              padding: 4,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "8px 24px 16px", overflowY: "auto" }}>
          {SHORTCUT_SECTIONS.map((section, si) => (
            <div key={section.title} style={{ marginTop: si === 0 ? 8 : 20 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#ff6b4a",
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  fontFamily: "'DM Sans', sans-serif",
                  marginBottom: 8,
                }}
              >
                {section.title}
              </div>
              <div
                style={{
                  borderTop: "1px solid var(--borderSub)",
                }}
              >
                {section.shortcuts.map((shortcut, idx) => (
                  <ShortcutRow key={idx} shortcut={shortcut} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "var(--textFaint)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Press
          </span>
          <Kbd>?</Kbd>
          <span
            style={{
              fontSize: 11,
              color: "var(--textFaint)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            anywhere to open this panel
          </span>
        </div>
      </div>
    </div>
  );
});

export default KeyboardShortcuts;
