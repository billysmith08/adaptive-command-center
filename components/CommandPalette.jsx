"use client";
import React, { useRef, useEffect, useMemo } from "react";

// ── SVG Icons ──
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const ProjectIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
);
const ContactIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const ClientIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
);
const VendorIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);
const ArrowIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
);

const CATEGORY_META = {
  projects: { label: "Projects", icon: <ProjectIcon />, color: "#ff6b4a" },
  contacts: { label: "Contacts", icon: <ContactIcon />, color: "#6b9fff" },
  clients:  { label: "Clients",  icon: <ClientIcon />,  color: "#4ecdc4" },
  vendors:  { label: "Vendors",  icon: <VendorIcon />,  color: "#f0a500" },
};

export default function CommandPalette({
  open, onClose, query, setQuery,
  projects, contacts, clients, projectVendors,
  setActiveProjectId, setActiveTab,
}) {
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const selectedRef = useRef(null);
  const [selectedIdx, setSelectedIdx] = React.useState(0);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (open) setSelectedIdx(0);
  }, [open]);

  // Build flat results list
  const results = useMemo(() => {
    const q = (query || "").toLowerCase().trim();
    if (!q) return [];
    const out = [];
    const match = (str) => str && str.toLowerCase().includes(q);
    const MAX = 6;

    // Projects
    let pCount = 0;
    for (const p of (projects || [])) {
      if (pCount >= MAX) break;
      if (match(p.name) || match(p.client) || match(p.location) || match(p.status) || match(p.code)) {
        out.push({ cat: "projects", id: p.id, title: p.name || "Untitled Project", subtitle: [p.client, p.status, p.code].filter(Boolean).join(" · "), data: p });
        pCount++;
      }
    }

    // Contacts
    let cCount = 0;
    for (const c of (contacts || [])) {
      if (cCount >= MAX) break;
      if (match(c.name) || match(c.company) || match(c.email) || match(c.phone) || match(c.position)) {
        out.push({ cat: "contacts", id: c.id, title: c.name || "Unnamed Contact", subtitle: [c.company, c.position, c.email].filter(Boolean).join(" · "), data: c });
        cCount++;
      }
    }

    // Clients
    let clCount = 0;
    for (const cl of (clients || [])) {
      if (clCount >= MAX) break;
      if (match(cl.company) || match(cl.contactName) || match(cl.email)) {
        out.push({ cat: "clients", id: cl.id, title: cl.company || "Unnamed Client", subtitle: [cl.contactName, cl.email].filter(Boolean).join(" · "), data: cl });
        clCount++;
      }
    }

    // Vendors (flatten from projectVendors map)
    let vCount = 0;
    const seenVendors = new Set();
    if (projectVendors) {
      for (const pid of Object.keys(projectVendors)) {
        if (vCount >= MAX) break;
        for (const v of (projectVendors[pid] || [])) {
          if (vCount >= MAX) break;
          const vKey = (v.company || "") + "|" + (v.contactName || "");
          if (seenVendors.has(vKey)) continue;
          if (match(v.company) || match(v.contactName) || match(v.email) || match(v.category)) {
            seenVendors.add(vKey);
            out.push({ cat: "vendors", id: v.id || vKey, title: v.company || "Unnamed Vendor", subtitle: [v.contactName, v.category, v.email].filter(Boolean).join(" · "), data: v, projectId: pid });
            vCount++;
          }
        }
      }
    }

    return out;
  }, [query, projects, contacts, clients, projectVendors]);

  // Group results by category for rendering
  const grouped = useMemo(() => {
    const map = {};
    results.forEach(r => {
      if (!map[r.cat]) map[r.cat] = [];
      map[r.cat].push(r);
    });
    return map;
  }, [results]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx(i => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx(i => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results.length > 0) {
        e.preventDefault();
        navigateTo(results[selectedIdx]);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, results, selectedIdx]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIdx]);

  const navigateTo = (item) => {
    if (!item) return;
    switch (item.cat) {
      case "projects":
        setActiveProjectId(item.data.id);
        setActiveTab("overview");
        break;
      case "contacts":
        setActiveTab("globalContacts");
        break;
      case "clients":
        setActiveTab("clients");
        break;
      case "vendors":
        if (item.projectId) {
          setActiveProjectId(item.projectId);
          setActiveTab("vendors");
        } else {
          setActiveTab("vendors");
        }
        break;
    }
    onClose();
  };

  if (!open) return null;

  let flatIdx = -1;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      paddingTop: "min(20vh, 160px)",
      animation: "fadeUp 0.15s ease",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 560, maxHeight: "min(70vh, 520px)",
        background: "var(--bgCard)", borderRadius: 16,
        border: "1px solid var(--border)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Search Input */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 18px", borderBottom: "1px solid var(--border)",
        }}>
          <span style={{ color: "var(--textFaint)", display: "flex" }}><SearchIcon /></span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
            placeholder="Search projects, contacts, clients, vendors..."
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: "var(--text)", fontSize: 15, fontFamily: "'DM Sans', sans-serif",
            }}
          />
          <kbd style={{
            fontSize: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
            padding: "2px 7px", borderRadius: 5,
            background: "var(--bgInput)", border: "1px solid var(--border)",
            color: "var(--textFaint)", letterSpacing: 0.3,
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{
          flex: 1, overflowY: "auto", padding: "6px 0",
        }}>
          {query && results.length === 0 && (
            <div style={{
              padding: "32px 20px", textAlign: "center",
              color: "var(--textFaint)", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
            }}>
              No results for "{query}"
            </div>
          )}

          {!query && (
            <div style={{
              padding: "32px 20px", textAlign: "center",
              color: "var(--textFaint)", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
            }}>
              Start typing to search...
            </div>
          )}

          {Object.keys(CATEGORY_META).map(cat => {
            const items = grouped[cat];
            if (!items || items.length === 0) return null;
            const meta = CATEGORY_META[cat];
            return (
              <div key={cat} style={{ marginBottom: 4 }}>
                <div style={{
                  padding: "8px 18px 4px", fontSize: 10, fontWeight: 700,
                  color: meta.color, letterSpacing: 0.8,
                  textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {meta.icon} {meta.label}
                </div>
                {items.map(item => {
                  flatIdx++;
                  const isSelected = flatIdx === selectedIdx;
                  const idx = flatIdx;
                  return (
                    <div
                      key={item.id}
                      ref={isSelected ? selectedRef : null}
                      onClick={() => navigateTo(item)}
                      onMouseEnter={() => setSelectedIdx(idx)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 18px", cursor: "pointer",
                        background: isSelected ? "var(--bgInput)" : "transparent",
                        transition: "background 0.1s",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600, color: "var(--text)",
                          fontFamily: "'DM Sans', sans-serif",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div style={{
                            fontSize: 11, color: "var(--textFaint)",
                            fontFamily: "'DM Sans', sans-serif",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            marginTop: 1,
                          }}>
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                      <span style={{ color: "var(--textFaint)", opacity: isSelected ? 1 : 0 }}>
                        <ArrowIcon />
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div style={{
            padding: "8px 18px", borderTop: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 12,
            fontSize: 10, color: "var(--textFaint)", fontFamily: "'DM Sans', sans-serif",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <kbd style={{ padding: "1px 5px", borderRadius: 4, background: "var(--bgInput)", border: "1px solid var(--border)", fontSize: 9 }}>↑</kbd>
              <kbd style={{ padding: "1px 5px", borderRadius: 4, background: "var(--bgInput)", border: "1px solid var(--border)", fontSize: 9 }}>↓</kbd>
              navigate
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <kbd style={{ padding: "1px 5px", borderRadius: 4, background: "var(--bgInput)", border: "1px solid var(--border)", fontSize: 9 }}>↵</kbd>
              open
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <kbd style={{ padding: "1px 5px", borderRadius: 4, background: "var(--bgInput)", border: "1px solid var(--border)", fontSize: 9 }}>esc</kbd>
              close
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
