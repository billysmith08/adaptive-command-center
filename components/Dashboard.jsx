"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Color from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";

// ─── RICH TEXT EDITOR ────────────────────────────────────────────────────────

const TIPTAP_STYLES = `
.tiptap-editor .ProseMirror { outline: none; min-height: 160px; padding: 12px 14px; font-size: 13px; line-height: 1.7; color: var(--textSub); font-family: 'Inter', 'DM Sans', sans-serif; }
.tiptap-editor .ProseMirror p { margin: 0 0 6px 0; }
.tiptap-editor .ProseMirror h1 { font-size: 20px; font-weight: 700; margin: 16px 0 8px 0; color: var(--text); }
.tiptap-editor .ProseMirror h2 { font-size: 16px; font-weight: 600; margin: 14px 0 6px 0; color: var(--text); }
.tiptap-editor .ProseMirror h3 { font-size: 14px; font-weight: 600; margin: 12px 0 4px 0; color: var(--text); }
.tiptap-editor .ProseMirror ul, .tiptap-editor .ProseMirror ol { padding-left: 24px; margin: 4px 0; }
.tiptap-editor .ProseMirror li { margin: 2px 0; }
.tiptap-editor .ProseMirror blockquote { border-left: 3px solid var(--borderSub); padding-left: 14px; margin: 8px 0; color: var(--textMuted); font-style: italic; }
.tiptap-editor .ProseMirror a { color: #3da5db; text-decoration: underline; cursor: pointer; }
.tiptap-editor .ProseMirror mark { background: #ffe06640; padding: 1px 3px; border-radius: 2px; }
.tiptap-editor .ProseMirror code { background: var(--bgInput); padding: 2px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.tiptap-editor .ProseMirror pre { background: var(--bgInput); border: 1px solid var(--borderSub); border-radius: 6px; padding: 12px; margin: 8px 0; }
.tiptap-editor .ProseMirror pre code { background: none; padding: 0; }
.tiptap-editor .ProseMirror hr { border: none; border-top: 1px solid var(--borderSub); margin: 12px 0; }
.tiptap-editor .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--textGhost); pointer-events: none; float: left; height: 0; }
.tiptap-editor .ProseMirror .text-left { text-align: left; }
.tiptap-editor .ProseMirror .text-center { text-align: center; }
.tiptap-editor .ProseMirror .text-right { text-align: right; }
`;

function ToolbarBtn({ active, onClick, children, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: "4px 7px", background: active ? "var(--borderSub)" : "transparent",
        border: "1px solid transparent", borderRadius: 4, color: active ? "var(--text)" : "var(--textMuted)",
        cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 400, lineHeight: 1,
        display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 26, height: 26,
        transition: "all 0.15s",
      }}
      onMouseEnter={e => { if (!active) e.target.style.background = "var(--bgHover)"; }}
      onMouseLeave={e => { if (!active) e.target.style.background = "transparent"; }}
    >{children}</button>
  );
}

function ToolbarSep() {
  return <div style={{ width: 1, height: 18, background: "var(--borderSub)", margin: "0 4px" }} />;
}

function RichTextEditor({ content, onChange, placeholder }) {
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const debounceRef = useRef(null);

  // Convert plain text to HTML paragraphs if needed
  const normalizeContent = (c) => {
    if (!c) return "";
    // Already HTML
    if (c.includes("<p>") || c.includes("<h") || c.includes("<ul>") || c.includes("<ol>") || c.includes("<br")) return c;
    // Plain text — convert newlines to paragraphs
    return c.split("\n").filter(l => l.trim() !== "").map(l => `<p>${l}</p>`).join("") || "";
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      Placeholder.configure({ placeholder: placeholder || "Write notes, updates, action items..." }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: false }),
      TextStyle,
      Color,
    ],
    content: normalizeContent(content) || "",
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const html = editor.getHTML();
        if (html === "<p></p>") onChange("");
        else onChange(html);
      }, 400);
    },
  });

  // Sync external content changes (e.g., switching projects)
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getHTML();
      const normalized = normalizeContent(content);
      if (normalized !== currentContent && !(normalized === "" && currentContent === "<p></p>")) {
        editor.commands.setContent(normalized, false);
      }
    }
  }, [content, editor]);

  if (!editor) return null;

  const addLink = () => {
    if (linkUrl) {
      const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  };

  return (
    <div className="tiptap-editor" style={{ position: "relative" }}>
      <style>{TIPTAP_STYLES}</style>
      {/* ── Toolbar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
        padding: "6px 8px", borderBottom: "1px solid var(--borderSub)",
        background: "var(--bgInput)", borderRadius: "8px 8px 0 0",
      }}>
        {/* Text style */}
        <ToolbarBtn title="Bold (⌘B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <strong>B</strong>
        </ToolbarBtn>
        <ToolbarBtn title="Italic (⌘I)" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <em>I</em>
        </ToolbarBtn>
        <ToolbarBtn title="Underline (⌘U)" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <span style={{ textDecoration: "underline" }}>U</span>
        </ToolbarBtn>
        <ToolbarBtn title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <span style={{ textDecoration: "line-through" }}>S</span>
        </ToolbarBtn>
        <ToolbarBtn title="Highlight" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <span style={{ background: "#ffe066", padding: "0 3px", borderRadius: 2, color: "#333", fontSize: 11 }}>H</span>
        </ToolbarBtn>

        <ToolbarSep />

        {/* Headings */}
        <ToolbarBtn title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          H1
        </ToolbarBtn>
        <ToolbarBtn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </ToolbarBtn>
        <ToolbarBtn title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          H3
        </ToolbarBtn>

        <ToolbarSep />

        {/* Lists */}
        <ToolbarBtn title="Bullet List" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          •≡
        </ToolbarBtn>
        <ToolbarBtn title="Numbered List" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          1.
        </ToolbarBtn>
        <ToolbarBtn title="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          ❝
        </ToolbarBtn>

        <ToolbarSep />

        {/* Alignment */}
        <ToolbarBtn title="Align Left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          ≡
        </ToolbarBtn>
        <ToolbarBtn title="Align Center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          ≡
        </ToolbarBtn>
        <ToolbarBtn title="Align Right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          ≡
        </ToolbarBtn>

        <ToolbarSep />

        {/* Link */}
        <ToolbarBtn title="Insert Link" active={editor.isActive("link")} onClick={() => {
          if (editor.isActive("link")) { editor.chain().focus().unsetLink().run(); }
          else { setShowLinkInput(!showLinkInput); }
        }}>
          🔗
        </ToolbarBtn>

        {/* Divider */}
        <ToolbarBtn title="Horizontal Rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          ―
        </ToolbarBtn>

        {/* Code */}
        <ToolbarBtn title="Code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
          {"</>"}
        </ToolbarBtn>

        {/* Undo/Redo */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
          <ToolbarBtn title="Undo (⌘Z)" onClick={() => editor.chain().focus().undo().run()}>↩</ToolbarBtn>
          <ToolbarBtn title="Redo (⌘⇧Z)" onClick={() => editor.chain().focus().redo().run()}>↪</ToolbarBtn>
        </div>
      </div>

      {/* ── Link input popup ── */}
      {showLinkInput && (
        <div style={{
          position: "absolute", top: 42, left: 8, zIndex: 50,
          display: "flex", gap: 6, padding: "8px 10px",
          background: "var(--bgCard)", border: "1px solid var(--borderSub)",
          borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        }}>
          <input
            type="text" value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
            placeholder="https://..."
            onKeyDown={e => e.key === "Enter" && addLink()}
            autoFocus
            style={{
              width: 240, padding: "6px 10px", fontSize: 12,
              background: "var(--bgInput)", border: "1px solid var(--borderSub)",
              borderRadius: 6, color: "var(--text)", outline: "none",
            }}
          />
          <button onClick={addLink} style={{
            padding: "6px 12px", background: "#3da5db", border: "none", borderRadius: 6,
            color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer",
          }}>Add</button>
          <button onClick={() => { setShowLinkInput(false); setLinkUrl(""); }} style={{
            padding: "6px 10px", background: "transparent", border: "1px solid var(--borderSub)",
            borderRadius: 6, color: "var(--textMuted)", fontSize: 11, cursor: "pointer",
          }}>✕</button>
        </div>
      )}

      {/* ── Editor area ── */}
      <div style={{
        background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderTop: "none",
        borderRadius: "0 0 8px 8px", minHeight: 160,
      }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const STATUSES = ["Exploration", "Bidding", "Pre-Production", "In-Production", "Wrap", "Complete"];
const STATUS_COLORS = {
  Exploration: { bg: "#7070ff10", text: "#7070ff", dot: "#7070ff" },
  Bidding: { bg: "#9b6dff10", text: "#9b6dff", dot: "#9b6dff" },
  "Pre-Production": { bg: "#3da5db10", text: "#3da5db", dot: "#3da5db" },
  "In-Production": { bg: "#3dba3d10", text: "#3dba3d", dot: "#3dba3d" },
  Wrap: { bg: "#c4a83210", text: "#c4a832", dot: "#c4a832" },
  Complete: { bg: "#c4683210", text: "#c46832", dot: "#c46832" },
};

const DEPT_OPTIONS = ["Experience", "F&B", "Fabrication", "Finance", "Labor & Staff", "Legal", "Operations", "Production", "Talent", "Transportation", "Travel & Accoms", "Venue"];
const SERVICE_OPTIONS = ["Fabrication", "Event Management & Ops", "Talent Buying", "Production Management", "Production Design", "Experiential Design and mgmt.", "Fabrication & A/V", "Label Event Identity", "CAD Work", "EXPERIENCE", "Tour Direction", "Production Direction", "Full Event Management"];
const PROJECT_TYPES = ["Brand Event", "Private Event", "Festival", "Live Event", "Internal", "Touring", "Experiential"];
const PT_COLORS = { "Brand Event": "#dba94e", "Private Event": "#dba94e", Festival: "#e8544e", "Live Event": "#3da5db", Internal: "#4ecb71", Touring: "#9b6dff", Experiential: "#e85494" };
const DEPT_COLORS = { Talent: "#e85494", Production: "#3da5db", Operations: "#9b6dff", "F&B": "#cb714e", Venue: "#4ecb71", "Travel & Accoms": "#4ecbe8", Experience: "#ff6b4a", "Labor & Staff": "var(--textMuted)", Fabrication: "#dba94e", Transportation: "#e84ecb", Legal: "#a0a0ff", Finance: "#4ecb71" };
const WB_STATUSES = ["Not Started", "In Progress", "At Risk", "Done"];
const WB_STATUS_STYLES = { "Not Started": { bg: "var(--bgCard)", text: "var(--textFaint)" }, "In Progress": { bg: "#3da5db12", text: "#3da5db" }, "At Risk": { bg: "#e8545412", text: "#e85454" }, Done: { bg: "#4ecb7112", text: "#4ecb71" } };

const COMP_KEYS = [
  { key: "coi", label: "COI", fullLabel: "Certificate of Insurance", drivePrefix: "ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/2026 COIs & Workers Comp" },
  { key: "w9", label: "W9", fullLabel: "W-9 Tax Form", drivePrefix: "ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/2026 W9s" },
  { key: "invoice", label: "INV", fullLabel: "Invoice", drivePrefix: "ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/Invoices" },
  { key: "banking", label: "BANK", fullLabel: "Banking Details", drivePrefix: "ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/Banking" },
  { key: "contract", label: "CTR", fullLabel: "Contract", drivePrefix: "ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/Contracts" },
];

const PROJECT_COLORS = ["#ff6b4a", "#3da5db", "#9b6dff", "#4ecb71", "#e85494", "#dba94e"];

// ─── THEME ──────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg: "#0b0b0f", bgSub: "#0c0c11", bgCard: "#111118", bgInput: "#0a0a10", bgHover: "#141420",
    topBar: "#0d0d12", border: "#18181f", borderSub: "#1e1e28", borderActive: "#20203a",
    text: "#e0e0e8", textSub: "#a0a0ae", textMuted: "#6a6a7a", textFaint: "#4a4a5a", textGhost: "#3a3a4a",
    scrollThumb: "#252530", calCell: "#0a0a10", calLine: "#13131e", calBgEmpty: "#08080e",
    filterScheme: "dark",
  },
  light: {
    bg: "#f0ebe0", bgSub: "#e8e2d4", bgCard: "#faf6ee", bgInput: "#ede8dc", bgHover: "#e0dace",
    topBar: "#f5f0e4", border: "#cdc5b0", borderSub: "#c4bca8", borderActive: "#a8a090",
    text: "#2a2a1e", textSub: "#4a4a3a", textMuted: "#6a6a58", textFaint: "#8a8a76", textGhost: "#a0a08e",
    scrollThumb: "#c0b8a0", calCell: "#f5f0e4", calLine: "#d8d0bc", calBgEmpty: "#e8e2d4",
    filterScheme: "light",
  },
};

// ─── ADDRESS INPUT (split fields) ───────────────────────────────────────────

function AddressAutocomplete({ value, onChange, copyToClipboard }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [loaded, setLoaded] = useState(typeof window !== 'undefined' && !!window.google?.maps?.places);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // If Google Maps is already loaded
    if (window.google?.maps?.places) { setLoaded(true); return; }
    // Try to load it if we have an API key
    const key = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key) return;
    if (document.querySelector('script[src*="maps.googleapis.com"]')) return;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!loaded || !inputRef.current || autocompleteRef.current) return;
    try {
      const ac = new window.google.maps.places.Autocomplete(inputRef.current, { types: ['address'] });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (place?.formatted_address) onChange(place.formatted_address);
      });
      autocompleteRef.current = ac;
    } catch (e) { /* graceful fallback to plain input */ }
  }, [loaded, onChange]);

  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 9, color: "var(--textFaint)", flexShrink: 0 }}>📍</span>
        <input ref={inputRef} value={value || ""} onChange={e => onChange(e.target.value)} placeholder="Street, City, State ZIP" style={{ flex: 1, padding: "3px 6px", background: "transparent", border: "1px solid var(--borderSub)", borderRadius: 4, color: "var(--textMuted)", fontSize: 10, outline: "none" }} />
        {value && <span style={{ fontSize: 7, color: "var(--textGhost)", marginLeft: 2, cursor: "pointer", flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); copyToClipboard && copyToClipboard(value, "Address", e); }}>⧉</span>}
      </div>
    </div>
  );
}

// ─── INITIAL DATA ────────────────────────────────────────────────────────────

const SUB_EVENT_STATUSES = ["Confirmed", "Hold", "Advancing", "On Sale", "Complete", "Cancelled"];
const SUB_EVENT_STATUS_COLORS = {
  Confirmed: { bg: "#4ecb7112", text: "#4ecb71", dot: "#4ecb71" },
  Hold: { bg: "#9b6dff12", text: "#c4a0ff", dot: "#9b6dff" },
  Advancing: { bg: "#3da5db12", text: "#7dc4e8", dot: "#3da5db" },
  "On Sale": { bg: "#3dba3d12", text: "#7ddb7d", dot: "#3dba3d" },
  Complete: { bg: "#c4683212", text: "#db9a7d", dot: "#c46832" },
  Cancelled: { bg: "#4a303012", text: "#6a4a4a", dot: "#4a3030" },
};

const initProjects = () => [
  { id: "p1", code: "25-1231-ADAPTIVE-REBRAND", name: "Adaptive Rebrand", client: "Adaptive", status: "In-Production", projectType: "Internal", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2025-12-31", end: "" }, engagementDates: { start: "", end: "" }, location: "", why: "", budget: 0, spent: 0 },
  { id: "p2", code: "26-0101_1231-CLOON-RETAINER", name: "Cloonee Retainer", client: "Cloonee Touring LLC", status: "In-Production", projectType: "Touring", isTour: true, producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-01-01", end: "2026-12-31" }, engagementDates: { start: "2026-01-01", end: "2026-12-31" }, location: "Multi-City", why: "Tour Direction, Production Direction", budget: 0, spent: 0, services: ["Tour Direction", "Production Direction"], subEvents: [] },
  { id: "p3", code: "26-0105-LOSTMX-VCxTEHMPLO-TULUM", name: "Vintage Culture Tehmplo", client: "Lost Nights", status: "Wrap", projectType: "Festival", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-01-05", end: "" }, engagementDates: { start: "", end: "" }, location: "Tulum", why: "Event Management & Ops", budget: 0, spent: 0, services: ["Event Management & Ops"] },
  { id: "p4", code: "26-0109-LOSTMX-SOLOMUNxTEHMPLO-TULUM", name: "Solomun Tehmplo", client: "Lost Nights", status: "Wrap", projectType: "Festival", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-01-09", end: "" }, engagementDates: { start: "", end: "" }, location: "Tulum", why: "Event Management & Ops", budget: 0, spent: 0, services: ["Event Management & Ops"] },
  { id: "p5", code: "26-0110_0111-CROSS-DZ26-TULUM", name: "Day Zero Festival 2026", client: "Crosstown Rebels", status: "Wrap", projectType: "Festival", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-01-10", end: "2026-01-11" }, engagementDates: { start: "", end: "" }, location: "Tulum", why: "", budget: 0, spent: 0 },
  { id: "p6", code: "26-0124-EOTS-PEGASUSDJ-FLL", name: "Pegasus World Cup DJ Set", client: "Empire of the Sun", status: "Wrap", projectType: "Touring", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-01-24", end: "" }, engagementDates: { start: "", end: "" }, location: "FLL", why: "Production Management, Tour Direction", budget: 0, spent: 0, services: ["Production Management", "Tour Direction"] },
  { id: "p7", code: "26-0129-GUESSJEANS-STOREOPEN-LA", name: "Guess Jeans LA Store Opening Party", client: "Guess Jeans", status: "Wrap", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-01-29", end: "" }, engagementDates: { start: "", end: "" }, location: "LA", why: "Event Management & Ops, Talent Buying, Production Design, Experiential Design", budget: 0, spent: 0, services: ["Event Management & Ops", "Talent Buying", "Production Design", "Experiential Design"] },
  { id: "p8", code: "26-0203_0430-Ledgeboat-PROSPA PROPHECY-USA", name: "Prospa Prophecy Tour", client: "Kieran", status: "Exploration", projectType: "Live Event", isTour: true, producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-02-03", end: "2026-04-30" }, engagementDates: { start: "", end: "" }, location: "USA", why: "", budget: 0, spent: 0, subEvents: [] },
  { id: "p9", code: "26-0320_0322-GT-BLOOMPOPUP-LA", name: "Bloom Pop Up Event", client: "GT's Living Foods", status: "In-Production", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-03-20", end: "2026-03-22" }, engagementDates: { start: "", end: "" }, location: "LA", why: "Full Event Management", budget: 0, spent: 0, services: ["Full Event Management"] },
  { id: "p10", code: "26-0321-BENST-PLANETX-CHI", name: "Planet X - Cermak Hall - Chicago", client: "Ben Sterling", status: "In-Production", projectType: "Live Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-03-21", end: "" }, engagementDates: { start: "", end: "" }, location: "CHI", why: "Neon Sign + Advancing, Production Design, Production Management", budget: 0, spent: 0, services: ["Production Design", "Production Management"] },
  { id: "p11", code: "26-0326_0327-CLOON-HELLBENTxSPACE-MIA", name: "Hellbent Club Space", client: "Cloonee Touring LLC", status: "In-Production", projectType: "Live Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-03-26", end: "2026-03-27" }, engagementDates: { start: "", end: "" }, location: "MIA", why: "Neon Signs + New ones, Experiential Design and mgmt.", budget: 0, spent: 0, services: ["Experiential Design"] },
  { id: "p12", code: "26-0328_0329-BENST-PLANETXFTOWN-MIA", name: "Planet X MMW 2026", client: "Ben Sterling", status: "In-Production", projectType: "Live Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-03-28", end: "2026-03-29" }, engagementDates: { start: "", end: "" }, location: "MIA", why: "Integrate Neon, Prod & Fabrication, Event Management & Ops, Production Management", budget: 0, spent: 0, services: ["Fabrication", "Event Management & Ops", "Production Management"] },
  { id: "p13", code: "26-0401-CREAT-NATGEO-CALIFORNIA", name: "National Geographic Greatest Show of Earth", client: "Creative-Creation", status: "Exploration", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-04-01", end: "" }, engagementDates: { start: "", end: "" }, location: "California", why: "Full Event + Fabrication", budget: 0, spent: 0, services: ["Full Event Management", "Fabrication"] },
  { id: "p14", code: "26-0401-FIMI-STARBUCKSMARRIOTT-USA", name: "Starbucks & Marriott Event", client: "Fimi Group", status: "Exploration", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-04-01", end: "" }, engagementDates: { start: "", end: "" }, location: "USA", why: "", budget: 0, spent: 0, notes: "https://www.youtube.co..." },
  { id: "p15", code: "26-0408_0414-GT-ADKCHELLAHOUSE-INDIO", name: "ADK Coachella House", client: "GT's Living Foods", status: "In-Production", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-04-08", end: "2026-04-14" }, engagementDates: { start: "", end: "" }, location: "Indio", why: "Internal Deck", budget: 0, spent: 0 },
  { id: "p16", code: "26-0410_0413-GUESSJEANS-COACH26-INDIO", name: "Coachella Compound", client: "Guess Jeans", status: "In-Production", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-04-10", end: "2026-04-13" }, engagementDates: { start: "", end: "" }, location: "Indio", why: "Full Management", budget: 0, spent: 0, services: ["Event Management & Ops", "Talent Buying", "Fabrication"] },
  { id: "p17", code: "26-0427_0501-IMT-HPE26-PORTUGAL", name: "HPE Presidents Club '26", client: "Infinity Marketing", status: "In-Production", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-04-27", end: "2026-05-01" }, engagementDates: { start: "", end: "" }, location: "Portugal", why: "A/V Vendor", budget: 0, spent: 0, services: ["Event Management & Ops", "Fabrication", "Production Management"] },
  { id: "p18", code: "26-0501_0630-GUESSJEANS-KRAFTWERK-BER", name: "Guess Jeans - Berlin Kraftwerk", client: "Guess Jeans", status: "In-Production", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-05-01", end: "2026-06-30" }, engagementDates: { start: "", end: "" }, location: "BER", why: "Talent Buying, Event Management & Ops", budget: 0, spent: 0, services: ["Talent Buying", "Event Management & Ops"] },
  { id: "p19", code: "26-0711_0712-EXPONLY-TOFTEMANOR-UK", name: "Experts Only Tofte Manor", client: "Experts Only", status: "Exploration", projectType: "Live Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-07-11", end: "2026-07-12" }, engagementDates: { start: "", end: "" }, location: "UK", why: "Experiential Design and mgmt.", budget: 0, spent: 0, services: ["Experiential Design"] },
  { id: "p20", code: "26-0711_0712-BRUNELO-BRUNELOMIA-MIA", name: "Brunelo - Mellow Circus", client: "Brunelo", status: "Exploration", projectType: "Live Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-07-11", end: "2026-07-12" }, engagementDates: { start: "", end: "" }, location: "MIA", why: "Experiential Design and mgmt.", budget: 0, spent: 0, services: ["Experiential Design"] },
  { id: "p21", code: "26-0919_0920-EXPONLY-FESTIVAL-NYC", name: "Experts Only NYC", client: "Experts Only", status: "Exploration", projectType: "Live Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-09-19", end: "2026-09-20" }, engagementDates: { start: "", end: "" }, location: "NYC", why: "Experiential Design and mgmt.", budget: 0, spent: 0, services: ["Experiential Design"] },
  { id: "p22", code: "26-1003_1004-EXPONLY-FESTIVAL-GORGE", name: "Experts Only Gorge", client: "Experts Only", status: "Exploration", projectType: "Live Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-10-03", end: "2026-10-04" }, engagementDates: { start: "", end: "" }, location: "Gorge", why: "Experiential Design and mgmt.", budget: 0, spent: 0, services: ["Experiential Design"] },
  { id: "p23", code: "26-1009_1012-FRANK-SYBER-PHX", name: "Syber World x UP.Summit", client: "Franklin Pictures, Inc.", status: "Exploration", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-10-09", end: "2026-10-12" }, engagementDates: { start: "", end: "" }, location: "PHX", why: "Syberworld x UP.Summit", budget: 0, spent: 0 },
  { id: "p24", code: "26-1017-GT-HALLOWEEN-LA", name: "GT's Day of the Dead", client: "GT's Living Foods", status: "Exploration", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-10-17", end: "" }, engagementDates: { start: "", end: "" }, location: "LA", why: "Event Management & Ops", budget: 0, spent: 0, services: ["Event Management & Ops"] },
  { id: "p25", code: "26-1113_1114-LOSTMX-KAPPA-MTYMX", name: "Kappa Futur Festival", client: "Lost Nights", status: "Exploration", projectType: "Festival", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-11-13", end: "2026-11-14" }, engagementDates: { start: "", end: "" }, location: "MTYMX", why: "Event Management & Ops", budget: 0, spent: 0, services: ["Event Management & Ops"] },
];

const initVendors = () => [];

const initWorkback = () => [];

const initROS = () => [
  { id: "r1", day: 1, dayDate: "", time: "5:00 AM", item: "Crew Call — Basecamp", dept: "", vendors: [], location: "", contact: "", owner: "", note: "" },
  { id: "r2", day: 1, dayDate: "", time: "6:00 AM", item: "Setup & Build", dept: "", vendors: [], location: "", contact: "", owner: "", note: "" },
  { id: "r3", day: 1, dayDate: "", time: "8:00 AM", item: "Doors / Start", dept: "", vendors: [], location: "", contact: "", owner: "", note: "" },
  { id: "r4", day: 1, dayDate: "", time: "12:00 PM", item: "LUNCH", dept: "", vendors: [], location: "", contact: "", owner: "", note: "" },
  { id: "r5", day: 1, dayDate: "", time: "5:00 PM", item: "WRAP", dept: "", vendors: [], location: "", contact: "", owner: "", note: "" },
];

// ─── UTILS ───────────────────────────────────────────────────────────────────

function fmt(n) { return "$" + n.toLocaleString("en-US"); }
function fmtShort(d) { if (!d) return "—"; return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }); }

function ProgressBar({ pct, h = 5, color }) {
  const c = color || (pct > 90 ? "#e85454" : pct > 70 ? "#dba94e" : "#4ecb71");
  return <div style={{ flex: 1, height: h, background: "var(--bgInput)", borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: c, borderRadius: 3, transition: "width 0.8s ease" }} /></div>;
}

function SyncBadge({ source }) {
  const m = { saturation: { c: "#ff6b4a", l: "SAT" }, airtable: { c: "#18bfff", l: "AT" }, both: { c: "#4ecb71", l: "SYNCED" }, manual: { c: "#9b6dff", l: "NEW" }, drive: { c: "#dba94e", l: "DRIVE" } }[source] || { c: "var(--textMuted)", l: "?" };
  return <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.8, padding: "2px 5px", borderRadius: 3, background: m.c + "15", color: m.c, border: `1px solid ${m.c}30`, fontFamily: "'JetBrains Mono', monospace" }}>{m.l}</span>;
}

function DeptTag({ dept, small }) {
  const c = DEPT_COLORS[dept] || "var(--textMuted)";
  return <span style={{ fontSize: small ? 9 : 10, fontWeight: 600, letterSpacing: 0.5, padding: small ? "1px 5px" : "2px 7px", borderRadius: 3, background: c + "15", color: c, border: `1px solid ${c}25` }}>{dept}</span>;
}

// ─── REUSABLE INPUTS ─────────────────────────────────────────────────────────

function Dropdown({ value, options, onChange, colors, width, allowBlank, blankLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const sc = colors?.[value];
  const displayValue = value || blankLabel || "Select...";
  const isEmpty = !value || value === "Select...";
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block", width: width || "auto" }}>
      <button onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: sc?.bg || "var(--bgCard)", border: `1px solid ${sc?.dot || "var(--borderSub)"}40`, borderRadius: 6, color: isEmpty ? "var(--textGhost)" : (sc?.text || "var(--textSub)"), fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%", justifyContent: "space-between" }}>
        {sc && <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot }} />}
        <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayValue}</span>
        <span style={{ fontSize: 8, opacity: 0.5 }}>▼</span>
      </button>
      {open && <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, marginTop: 4, background: "var(--bgHover)", border: "1px solid var(--borderActive)", borderRadius: 8, boxShadow: "0 12px 32px rgba(0,0,0,0.6)", maxHeight: 200, overflowY: "auto" }}>
        {allowBlank && <div onClick={() => { onChange(""); setOpen(false); }} style={{ padding: "8px 12px", fontSize: 12, color: "var(--textGhost)", cursor: "pointer", borderBottom: "1px solid var(--borderSub)" }} onMouseEnter={e => e.target.style.background = "var(--bgCard)"} onMouseLeave={e => e.target.style.background = "transparent"}>— None —</div>}
        {options.map(opt => <div key={opt} onClick={() => { onChange(opt); setOpen(false); }} style={{ padding: "8px 12px", fontSize: 12, color: value === opt ? "#ff6b4a" : "var(--textSub)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }} onMouseEnter={e => e.target.style.background = "var(--bgCard)"} onMouseLeave={e => e.target.style.background = "transparent"}>{colors?.[opt] && <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors[opt].dot }} />}{opt}</div>)}
      </div>}
    </div>
  );
}

function MultiDropdown({ values, options, onChange, colorMap, renderLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const toggle = (opt) => onChange(values.includes(opt) ? values.filter(v => v !== opt) : [...values, opt]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", gap: 3, flexWrap: "wrap", padding: "4px 8px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, cursor: "pointer", minHeight: 28, alignItems: "center" }}>
        {values.length === 0 && <span style={{ fontSize: 10, color: "var(--textGhost)" }}>Select...</span>}
        {values.map(v => <span key={v} style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: (colorMap?.[v] || "var(--textMuted)") + "20", color: colorMap?.[v] || "var(--textMuted)", fontWeight: 600, border: `1px solid ${colorMap?.[v] || "var(--textMuted)"}30` }}>{renderLabel ? renderLabel(v) : v}</span>)}
      </div>
      {open && <div style={{ position: "absolute", top: "100%", left: 0, minWidth: 180, zIndex: 50, marginTop: 4, background: "var(--bgHover)", border: "1px solid var(--borderActive)", borderRadius: 8, boxShadow: "0 12px 32px rgba(0,0,0,0.6)", maxHeight: 200, overflowY: "auto" }}>
        {values.length > 0 && <div onClick={() => { onChange([]); setOpen(false); }} style={{ padding: "6px 12px", fontSize: 10, color: "var(--textGhost)", cursor: "pointer", borderBottom: "1px solid var(--borderSub)" }} onMouseEnter={e => e.target.style.background = "var(--bgCard)"} onMouseLeave={e => e.target.style.background = "transparent"}>— Clear all —</div>}
        {options.map(opt => <div key={opt} onClick={() => toggle(opt)} style={{ padding: "6px 12px", fontSize: 11, color: values.includes(opt) ? "#4ecb71" : "var(--textMuted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }} onMouseEnter={e => e.target.style.background = "var(--bgCard)"} onMouseLeave={e => e.target.style.background = "transparent"}><div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${values.includes(opt) ? "#4ecb71" : "var(--borderActive)"}`, background: values.includes(opt) ? "#4ecb7120" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#4ecb71", flexShrink: 0 }}>{values.includes(opt) ? "✓" : ""}</div>{renderLabel ? renderLabel(opt) : opt}</div>)}
      </div>}
    </div>
  );
}

function TagInput({ values, options, onChange, contacts, onViewContact }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQuery(""); } }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const contactNames = contacts ? contacts.map(c => c.name) : [];
  const allNames = [...new Set([...contactNames, ...(options || [])])];
  const filtered = allNames.filter(n => !values.includes(n) && n.toLowerCase().includes(query.toLowerCase()));
  const addName = (name) => { onChange([...values, name]); setQuery(""); };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && query.trim()) { e.preventDefault(); addName(query.trim()); }
    if (e.key === "Backspace" && !query && values.length) { onChange(values.slice(0, -1)); }
    if (e.key === "Escape") { setOpen(false); setQuery(""); }
  };
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center", minHeight: 24 }}>
        {values.map(v => {
          const contact = contacts?.find(c => c.name === v);
          return (
            <span key={v} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: contact ? "#3da5db15" : "#ff6b4a15", color: contact ? "#3da5db" : "#ff6b4a", fontWeight: 600, border: `1px solid ${contact ? "#3da5db25" : "#ff6b4a25"}`, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
              onClick={(e) => { e.stopPropagation(); if (onViewContact) onViewContact(contact || { name: v, phone: "", email: "" }, e); }}>
              {v}<span style={{ fontSize: 8, opacity: 0.5 }}>{contact ? "ⓘ" : "👤"}</span>
              <span onClick={e => { e.stopPropagation(); onChange(values.filter(x => x !== v)); }} style={{ cursor: "pointer", opacity: 0.6, fontSize: 10 }}>×</span>
            </span>
          );
        })}
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={values.length ? "Add..." : "🔍 Search or type name..."}
          style={{ flex: 1, minWidth: 80, padding: "2px 4px", background: "transparent", border: "none", outline: "none", color: "var(--textSub)", fontSize: 11, fontFamily: "'DM Sans'" }}
        />
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, minWidth: 260, zIndex: 50, marginTop: 4, background: "var(--bgHover)", border: "1px solid var(--borderActive)", borderRadius: 8, boxShadow: "0 12px 32px rgba(0,0,0,0.6)", maxHeight: 240, overflowY: "auto" }}>
          {contacts && contacts.length > 0 && filtered.length > 0 && <div style={{ padding: "5px 12px 2px", fontSize: 8, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 0.8 }}>FROM CONTACTS</div>}
          {filtered.filter(n => contactNames.includes(n)).map(name => {
            const c = contacts?.find(ct => ct.name === name);
            return (
              <div key={name} onClick={() => addName(name)} style={{ padding: "7px 12px", fontSize: 12, color: "var(--textSub)", cursor: "pointer", borderBottom: "1px solid var(--borderSub)" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgCard)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>{name}</span>
                  {c?.company && <span style={{ fontSize: 9, color: "var(--textFaint)" }}>{c.company}</span>}
                </div>
                {c && <div style={{ fontSize: 9, color: "var(--textFaint)", marginTop: 1 }}>{[c.position, c.phone, c.email].filter(Boolean).join(" · ")}</div>}
              </div>
            );
          })}
          {filtered.filter(n => !contactNames.includes(n)).length > 0 && <div style={{ padding: "5px 12px 2px", fontSize: 8, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 0.8 }}>OTHER</div>}
          {filtered.filter(n => !contactNames.includes(n)).map(name => (
            <div key={name} onClick={() => addName(name)} style={{ padding: "7px 12px", fontSize: 12, color: "var(--textMuted)", cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgCard)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              {name}
            </div>
          ))}
          {query.trim() && !allNames.includes(query.trim()) && !values.includes(query.trim()) && (
            <div onClick={() => addName(query.trim())} style={{ padding: "7px 12px", fontSize: 11, color: "#ff6b4a", cursor: "pointer", borderTop: "1px solid var(--borderSub)" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgCard)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              + Add "{query.trim()}" as new
            </div>
          )}
          {filtered.length === 0 && !query.trim() && contacts?.length === 0 && (
            <div style={{ padding: "12px", fontSize: 11, color: "var(--textGhost)", textAlign: "center" }}>Type a name or add contacts via 👤 Contacts</div>
          )}
        </div>
      )}
    </div>
  );
}

function EditableText({ value, onChange, fontSize, color, fontWeight, multiline, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const inputRef = useRef(null);
  useEffect(() => { setVal(value); }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);
  const save = () => { setEditing(false); onChange(val); };
  if (editing) {
    const style = { width: "100%", padding: "2px 6px", background: "var(--bgInput)", border: "1px solid #ff6b4a40", borderRadius: 4, color: color || "var(--textSub)", fontSize: fontSize || 13, fontWeight: fontWeight || 400, fontFamily: "'DM Sans', sans-serif", outline: "none" };
    if (multiline) return <textarea ref={inputRef} value={val} onChange={e => setVal(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === "Escape") { setVal(value); setEditing(false); } }} style={{ ...style, resize: "vertical", minHeight: 60, lineHeight: 1.5 }} />;
    return <input ref={inputRef} value={val} onChange={e => setVal(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setVal(value); setEditing(false); } }} style={style} />;
  }
  return <span onClick={() => setEditing(true)} style={{ cursor: "pointer", fontSize: fontSize || 13, color: value ? (color || "var(--textSub)") : "var(--textGhost)", fontWeight: fontWeight || 400, borderBottom: "1px dashed var(--borderSub)", display: "inline-block" }} title="Click to edit">{value || placeholder || "Click to edit"}</span>;
}

function DatePicker({ value, onChange }) {
  return <input type="date" value={value || ""} onChange={e => onChange(e.target.value)} style={{ padding: "5px 8px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--textSub)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: "none", cursor: "pointer", colorScheme: "var(--filterScheme)" }} />;
}

function EditableBudget({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));
  useEffect(() => { setVal(String(value)); }, [value]);
  if (editing) return <input autoFocus value={val} onChange={e => setVal(e.target.value.replace(/[^0-9]/g, ""))}
    onBlur={() => { onSave(Number(val) || 0); setEditing(false); }}
    onKeyDown={e => { if (e.key === "Enter") { onSave(Number(val) || 0); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
    style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", background: "var(--bgInput)", border: "1px solid #ff6b4a40", borderRadius: 6, color: "var(--text)", padding: "2px 8px", width: 160, outline: "none" }} />;
  return <div onClick={() => { setVal(String(value)); setEditing(true); }} style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><span>{"$" + value.toLocaleString("en-US")}</span><span style={{ fontSize: 11, color: "var(--textFaint)", opacity: 0, transition: "opacity 0.2s" }} ref={el => { if (el) { el.parentNode.onmouseenter = () => el.style.opacity = 1; el.parentNode.onmouseleave = () => el.style.opacity = 0; }}}>✏</span></div>;
}

function AddToProjectDropdown({ contacts, allProjectPeople, onAdd, deptOptions }) {
  const PROJECT_ROLES = ["Producer", "Manager", "Staff / Crew", "Client", "Point of Contact", "Billing", "Talent", "Artist", "Agent", "Venue Rep"];
  const ROLE_COLORS = { Producer: "#ff6b4a", Manager: "#ff6b4a", "Staff / Crew": "#ff6b4a", Client: "#3da5db", "Point of Contact": "#9b6dff", Billing: "#4ecb71", Talent: "#e85494", Artist: "#e85494", Agent: "#dba94e", "Venue Rep": "#4ecbe8" };
  const [addOpen, setAddOpen] = useState(false);
  const [addQ, setAddQ] = useState("");
  const [addStep, setAddStep] = useState(0);
  const [addContact, setAddContact] = useState(null);
  const [addRole, setAddRole] = useState("Point of Contact");
  const [addDept, setAddDept] = useState("");
  const addRef = useRef(null);
  useEffect(() => { const h = (e) => { if (addRef.current && !addRef.current.contains(e.target)) { setAddOpen(false); setAddStep(0); } }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const addFiltered = (contacts || []).filter(c => c.name.toLowerCase().includes(addQ.toLowerCase()) && !allProjectPeople.find(p => p.name === c.name));
  return (
    <div ref={addRef} style={{ position: "relative" }}>
      <button onClick={() => { setAddOpen(!addOpen); setAddStep(0); setAddQ(""); }} style={{ padding: "7px 14px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 7, color: "#ff6b4a", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>+ Add to Project</button>
      {addOpen && (
        <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, width: 320, background: "var(--bgHover)", border: "1px solid var(--borderActive)", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.7)", zIndex: 60, overflow: "hidden" }}>
          {addStep === 0 && <>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--borderSub)", fontSize: 11, fontWeight: 700, color: "var(--textMuted)" }}>STEP 1: SELECT CONTACT</div>
            <input value={addQ} onChange={e => setAddQ(e.target.value)} placeholder="Search by name..." autoFocus style={{ width: "100%", padding: "10px 14px", background: "var(--bgInput)", border: "none", borderBottom: "1px solid var(--borderSub)", color: "var(--text)", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {addQ.trim() && !contacts.find(c => c.name.toLowerCase() === addQ.trim().toLowerCase()) && (
                <div onClick={() => { setAddContact({ name: addQ.trim() }); setAddStep(1); }} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 11, color: "#ff6b4a", borderBottom: "1px solid var(--borderSub)", display: "flex", alignItems: "center", gap: 8 }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgCard)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ fontSize: 14 }}>+</span> Add "{addQ.trim()}" as new person
                </div>
              )}
              {addFiltered.map(c => (
                <div key={c.id} onClick={() => { setAddContact(c); setAddStep(1); }} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 11, color: "var(--textSub)", borderBottom: "1px solid var(--borderSub)" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgCard)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>{c.name}</span>
                    {c.company && <span style={{ fontSize: 9, color: "var(--textFaint)" }}>{c.company}</span>}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--textFaint)", marginTop: 2 }}>{[c.position, c.phone, c.email].filter(Boolean).join(" · ")}</div>
                </div>
              ))}
              {addFiltered.length === 0 && !addQ.trim() && <div style={{ padding: "14px", fontSize: 11, color: "var(--textGhost)", textAlign: "center" }}>Type to search global contacts</div>}
            </div>
          </>}
          {addStep === 1 && addContact && <>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--borderSub)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--textMuted)", marginBottom: 6 }}>STEP 2: ASSIGN ROLE & DEPARTMENT</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{addContact.name}</div>
              {addContact.email && <div style={{ fontSize: 10, color: "var(--textFaint)" }}>{addContact.email}</div>}
            </div>
            <div style={{ padding: "10px 14px" }}>
              <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>PROJECT ROLE</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
                {PROJECT_ROLES.map(r => (
                  <button key={r} onClick={() => setAddRole(r)} style={{ padding: "5px 10px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer", background: addRole === r ? (ROLE_COLORS[r] || "var(--textMuted)") + "25" : "var(--bgInput)", border: `1px solid ${addRole === r ? (ROLE_COLORS[r] || "var(--textMuted)") + "50" : "var(--borderSub)"}`, color: addRole === r ? ROLE_COLORS[r] || "var(--textMuted)" : "var(--textFaint)" }}>{r}</button>
                ))}
              </div>
              <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>DEPARTMENT <span style={{ color: "var(--textGhost)", fontWeight: 400 }}>(optional)</span></div>
              <select value={addDept} onChange={e => setAddDept(e.target.value)} style={{ width: "100%", padding: "6px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "var(--textSub)", fontSize: 11, marginBottom: 14 }}>
                <option value="">No department</option>
                {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <button onClick={() => { onAdd(addContact, addRole, addDept); setAddOpen(false); setAddStep(0); setAddQ(""); setAddDept(""); }} style={{ width: "100%", padding: "8px", background: "#ff6b4a", border: "none", borderRadius: 6, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Add {addContact.name} as {addRole}</button>
            </div>
          </>}
        </div>
      )}
    </div>
  );
}

function ClientSearchInput({ value, onChange, projects }) {
  const [clientOpen, setClientOpen] = useState(false);
  const clientRef = useRef(null);
  useEffect(() => { const h = (e) => { if (clientRef.current && !clientRef.current.contains(e.target)) setClientOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const existingClients = [...new Set(projects.map(p => p.client).filter(Boolean))].sort();
  const q = value.toLowerCase();
  const filteredClients = existingClients.filter(c => c.toLowerCase().includes(q));
  const exactMatch = existingClients.some(c => c.toLowerCase() === q);
  return (
    <div ref={clientRef} style={{ position: "relative" }}>
      <input value={value} onChange={e => { onChange(e.target.value); setClientOpen(true); }} onFocus={() => setClientOpen(true)} placeholder="Search or add new client..." style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, fontWeight: 600, outline: "none" }} />
      {clientOpen && (filteredClients.length > 0 || (q && !exactMatch)) && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 2, background: "var(--bgHover)", border: "1px solid var(--borderActive)", borderRadius: 8, boxShadow: "0 12px 32px rgba(0,0,0,0.6)", zIndex: 70, overflow: "hidden", maxHeight: 200, overflowY: "auto" }}>
          {q && !exactMatch && (
            <div onClick={() => { setClientOpen(false); }} style={{ padding: "9px 14px", cursor: "pointer", fontSize: 11, color: "#ff6b4a", borderBottom: "1px solid var(--borderSub)", display: "flex", alignItems: "center", gap: 6 }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgCard)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>+</span> Add "{value}" as new client
            </div>
          )}
          {filteredClients.map(c => (
            <div key={c} onClick={() => { onChange(c); setClientOpen(false); }} style={{ padding: "9px 14px", cursor: "pointer", fontSize: 12, color: "var(--textSub)", borderBottom: "1px solid var(--borderSub)", display: "flex", justifyContent: "space-between", alignItems: "center" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgCard)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ fontWeight: 600, color: "var(--text)" }}>{c}</span>
              <span style={{ fontSize: 9, color: "var(--textFaint)" }}>{projects.filter(p => p.client === c).length} project{projects.filter(p => p.client === c).length !== 1 ? "s" : ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PocPullDropdown({ contacts, existingPocs, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const filtered = (contacts || []).filter(c => c.name.toLowerCase().includes(query.toLowerCase()) && !(existingPocs || []).find(p => p.name === c.name));
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{ padding: "3px 8px", background: "#3da5db10", border: "1px solid #3da5db25", borderRadius: 4, color: "#3da5db", cursor: "pointer", fontSize: 9, fontWeight: 600 }}>🔍 Search Contacts</button>
      {open && (
        <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, width: 260, background: "var(--bgHover)", border: "1px solid var(--borderActive)", borderRadius: 8, boxShadow: "0 12px 32px rgba(0,0,0,0.6)", zIndex: 60, overflow: "hidden" }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, email, company..." autoFocus style={{ width: "100%", padding: "8px 12px", background: "var(--bgInput)", border: "none", borderBottom: "1px solid var(--borderSub)", color: "var(--text)", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {contacts.length === 0 && <div style={{ padding: "14px 12px", fontSize: 11, color: "var(--textGhost)", textAlign: "center" }}>No contacts yet — add from top bar 👤 Contacts</div>}
            {contacts.length > 0 && filtered.length === 0 && <div style={{ padding: "10px 12px", fontSize: 11, color: "var(--textGhost)" }}>No matches found</div>}
            {filtered.map(c => (
              <div key={c.id} onClick={() => { onSelect(c); setOpen(false); setQuery(""); }} style={{ padding: "8px 12px", cursor: "pointer", fontSize: 11, color: "var(--textSub)", borderBottom: "1px solid var(--borderSub)" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgCard)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  {c.company && <span style={{ fontSize: 9, color: "var(--textFaint)" }}>{c.company}</span>}
                </div>
                <div style={{ fontSize: 9, color: "var(--textFaint)", marginTop: 1 }}>{[c.position, c.phone, c.email].filter(Boolean).join(" · ")}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ContactListBlock({ label, items, contacts, onUpdate, onSaveToGlobal, onViewContact, copyToClipboard, showAddress, onUpdateGlobalContact }) {
  const syncField = (pi, field, val) => {
    const arr = [...(items || [])]; arr[pi] = { ...arr[pi], [field]: val }; onUpdate(arr);
    // Bidirectional: if linked to global, update global too
    if (arr[pi].fromContacts && onUpdateGlobalContact) {
      const gContact = contacts?.find(c => c.name === arr[pi].name);
      if (gContact) onUpdateGlobalContact(gContact.id, field, val);
    }
  };
  return (
    <div style={{ marginTop: 10, marginLeft: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 9, color: "#ff6b4a", fontWeight: 700, letterSpacing: 0.8 }}>{label}</span>
        <div style={{ display: "flex", gap: 6 }}>
          <PocPullDropdown contacts={contacts} existingPocs={items} onSelect={(c) => {
            onUpdate([...(items || []), { name: c.name, phone: c.phone || "", email: c.email || "", address: c.notes?.match(/(?:Home|Office|Address):\s*([^\n·]+)/i)?.[1]?.trim() || "", fromContacts: true }]);
          }} />
          <button onClick={() => onUpdate([...(items || []), { name: "", phone: "", email: "", address: "", fromContacts: false }])} style={{ padding: "3px 8px", background: "#ff6b4a10", border: "1px solid #ff6b4a25", borderRadius: 4, color: "#ff6b4a", cursor: "pointer", fontSize: 9, fontWeight: 600 }}>+ Add</button>
        </div>
      </div>
      {(items || []).length === 0 && (
        <div style={{ fontSize: 11, color: "var(--textGhost)", padding: "4px 0" }}>No contacts added yet</div>
      )}
      {(items || []).map((poc, pi) => {
        // For linked contacts, pull latest info from global
        const gContact = poc.fromContacts ? contacts?.find(c => c.name === poc.name) : null;
        const displayPhone = gContact?.phone || poc.phone;
        const displayEmail = gContact?.email || poc.email;
        return (
        <div key={pi} style={{ marginBottom: 5, background: "var(--bgInput)", borderRadius: 6, border: "1px solid var(--borderSub)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px" }}>
            <div onClick={(e) => { if (poc.name && onViewContact) { const c = contacts.find(ct => ct.name === poc.name); onViewContact(c || { name: poc.name, phone: poc.phone, email: poc.email }, e); } }} style={{ width: 22, height: 22, borderRadius: "50%", background: poc.fromContacts ? "#3da5db15" : "#ff6b4a15", border: `1px solid ${poc.fromContacts ? "#3da5db30" : "#ff6b4a30"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: poc.fromContacts ? "#3da5db" : "#ff6b4a", flexShrink: 0, cursor: poc.name ? "pointer" : "default" }}>
              {poc.name ? poc.name.split(" ").map(n => n[0]).join("").slice(0, 2) : "?"}
            </div>
            <div style={{ flex: 1, display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
              <input value={poc.name} onChange={e => { const arr = [...(items || [])]; arr[pi] = { ...arr[pi], name: e.target.value }; onUpdate(arr); }} placeholder="Name" style={{ flex: "1 1 70px", minWidth: 55, padding: "3px 6px", background: "transparent", border: "1px solid var(--borderSub)", borderRadius: 4, color: "var(--text)", fontSize: 11, outline: "none", fontWeight: 600 }} />
              <span style={{ display: "flex", alignItems: "center", flex: "1 1 70px", minWidth: 55 }}>
                <input value={displayPhone} onChange={e => syncField(pi, "phone", e.target.value)} placeholder="Phone" style={{ flex: 1, padding: "3px 6px", background: "transparent", border: "1px solid var(--borderSub)", borderRadius: 4, color: "var(--textMuted)", fontSize: 10, outline: "none" }} />
                {displayPhone && <span style={{ fontSize: 7, color: "var(--textGhost)", marginLeft: 2, cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); copyToClipboard && copyToClipboard(displayPhone, "Phone", e); }}>⧉</span>}
              </span>
              <span style={{ display: "flex", alignItems: "center", flex: "1.5 1 90px", minWidth: 70 }}>
                <input value={displayEmail} onChange={e => syncField(pi, "email", e.target.value)} placeholder="Email" style={{ flex: 1, padding: "3px 6px", background: "transparent", border: "1px solid var(--borderSub)", borderRadius: 4, color: "var(--textMuted)", fontSize: 10, outline: "none" }} />
                {displayEmail && <span style={{ fontSize: 7, color: "var(--textGhost)", marginLeft: 2, cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); copyToClipboard && copyToClipboard(displayEmail, "Email", e); }}>⧉</span>}
              </span>
            </div>
            {!poc.fromContacts && poc.name && (
              <button onClick={() => onSaveToGlobal(poc, pi)} title="Save to global contacts" style={{ padding: "2px 6px", background: "#4ecb7110", border: "1px solid #4ecb7125", borderRadius: 3, color: "#4ecb71", cursor: "pointer", fontSize: 8, fontWeight: 700, flexShrink: 0 }}>↑ Save</button>
            )}
            {poc.fromContacts && <span style={{ fontSize: 8, color: "#3da5db", flexShrink: 0 }} title="Linked to global contacts">✓ linked</span>}
            <button onClick={() => { const arr = [...(items || [])]; arr.splice(pi, 1); onUpdate(arr); }} style={{ background: "none", border: "none", color: "var(--textGhost)", cursor: "pointer", fontSize: 12, flexShrink: 0 }}>×</button>
          </div>
          {showAddress && (
            <div style={{ padding: "0 10px 5px 40px" }}>
              <AddressAutocomplete value={poc.address || ""} onChange={v => { const arr = [...(items || [])]; arr[pi] = { ...arr[pi], address: v }; onUpdate(arr); }} copyToClipboard={copyToClipboard} />
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}

// ─── DOC DROP ZONE (from v3) ─────────────────────────────────────────────────

function DocDropZone({ vendor, compKey, compInfo, onFileDrop, onPreview, onClear }) {
  const [dragOver, setDragOver] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const boxRef = useRef(null);
  const isDone = compInfo.done;
  const vendorFolder = vendor.name.replace(/[^a-zA-Z0-9 &'-]/g, '').trim();
  const drivePath = `${compKey.drivePrefix}/${vendorFolder}/`;

  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); const f = e.dataTransfer?.files; if (f?.length) { onFileDrop(vendor.id, compKey.key, f[0], drivePath, compKey.drivePrefix); setJustUploaded(true); setTimeout(() => setJustUploaded(false), 3000); } };
  const handleUploadClick = (e) => {
    e.stopPropagation();
    const input = document.createElement("input"); input.type = "file"; input.accept = ".pdf,.doc,.docx,.jpg,.png,.xlsx"; input.onchange = (ev) => { const f = ev.target.files[0]; if (f) { onFileDrop(vendor.id, compKey.key, f, drivePath, compKey.drivePrefix); setJustUploaded(true); setTimeout(() => setJustUploaded(false), 3000); setShowTooltip(false); } }; input.click();
  };
  const handleClick = () => {
    if (!isDone) handleUploadClick({ stopPropagation: () => {} });
  };

  // Smart position: if box is in top 200px of viewport, show tooltip below
  const getTooltipPosition = () => {
    if (!boxRef.current) return { bottom: "calc(100% + 8px)" };
    const rect = boxRef.current.getBoundingClientRect();
    if (rect.top < 200) return { top: "calc(100% + 8px)", arrowTop: true };
    return { bottom: "calc(100% + 8px)", arrowTop: false };
  };
  const tp = showTooltip ? getTooltipPosition() : {};

  return (
    <div ref={boxRef} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onClick={handleClick} onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}
      style={{ position: "relative", width: 52, height: 52, borderRadius: 8, background: justUploaded ? "#4ecb7110" : dragOver ? "#4ecb7108" : isDone ? "#4ecb7108" : "var(--bgCard)", border: `1.5px dashed ${justUploaded ? "#4ecb7180" : dragOver ? "#4ecb7160" : isDone ? "#4ecb7140" : "var(--borderSub)"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.25s", transform: dragOver ? "scale(1.08)" : "scale(1)" }}>
      {justUploaded ? <><span style={{ fontSize: 16 }}>✓</span><span style={{ fontSize: 7, color: "#4ecb71", fontWeight: 700, marginTop: 2 }}>SAVED</span></> : isDone ? <><span style={{ fontSize: 13, lineHeight: 1 }}>📄</span><span style={{ fontSize: 7, color: "#4ecb71", fontWeight: 700, marginTop: 2 }}>✓</span></> : <><span style={{ fontSize: 14, opacity: dragOver ? 1 : 0.5 }}>{dragOver ? "📥" : "+"}</span><span style={{ fontSize: 7, color: dragOver ? "#4ecb71" : "var(--textGhost)", fontWeight: 600, marginTop: 1 }}>{compKey.label}</span></>}
      {showTooltip && <div onClick={e => e.stopPropagation()} style={{ position: "absolute", ...(tp.arrowTop ? { top: "calc(100% + 8px)" } : { bottom: "calc(100% + 8px)" }), left: "50%", transform: "translateX(-50%)", background: "var(--bgCard)", border: "1px solid var(--borderActive)", borderRadius: 10, padding: "12px 14px", minWidth: 230, maxWidth: 280, zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>{compKey.fullLabel}</div>
        <div style={{ fontSize: 10, color: "var(--textMuted)", marginBottom: 8 }}>{vendor.name}</div>
        
        {isDone ? <>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: "#4ecb71" }}>●</span>
            <span style={{ fontSize: 10, color: "var(--textSub)", fontWeight: 600 }}>{compInfo.file || "Received"}</span>
          </div>
          <div style={{ fontSize: 9, color: "var(--textFaint)", marginBottom: 8 }}>Uploaded {compInfo.date}</div>
          
          {/* Action buttons */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={(e) => { e.stopPropagation(); const url = compInfo.link || `https://drive.google.com/drive/search?q=${encodeURIComponent(compInfo.file || compKey.fullLabel)}`; window.open(url, '_blank'); }} style={{ padding: "4px 8px", background: "#3da5db10", border: "1px solid #3da5db25", borderRadius: 5, color: "#3da5db", cursor: "pointer", fontSize: 9, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
              📂 Open in Drive
            </button>
            <button onClick={handleUploadClick} style={{ padding: "4px 8px", background: "#dba94e10", border: "1px solid #dba94e25", borderRadius: 5, color: "#dba94e", cursor: "pointer", fontSize: 9, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
              🔄 Replace
            </button>
            {onClear && (
              <button onClick={(e) => { e.stopPropagation(); onClear(vendor.id, compKey.key); setShowTooltip(false); }} style={{ padding: "4px 8px", background: "#e8545410", border: "1px solid #e8545425", borderRadius: 5, color: "#e85454", cursor: "pointer", fontSize: 9, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                ✕ Clear
              </button>
            )}
          </div>
          
          <div style={{ fontSize: 8, color: "var(--textGhost)", fontFamily: "'JetBrains Mono', monospace", marginTop: 8 }}>📁 .../{drivePath.split("/").slice(-3).join("/")}</div>
        </> : <>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: "#e85454" }}>●</span>
            <span style={{ fontSize: 10, color: "#e85454" }}>Missing</span>
          </div>
          <div style={{ fontSize: 9, color: "var(--textMuted)", marginBottom: 6 }}>Drop file or click to upload</div>
          <button onClick={handleUploadClick} style={{ padding: "4px 10px", background: "#4ecb7110", border: "1px solid #4ecb7125", borderRadius: 5, color: "#4ecb71", cursor: "pointer", fontSize: 9, fontWeight: 600 }}>
            📎 Upload {compKey.label}
          </button>
        </>}
        
        {/* Arrow */}
        <div style={{ position: "absolute", ...(tp.arrowTop ? { top: -5 } : { bottom: -5 }), left: "50%", transform: `translateX(-50%) rotate(45deg)`, width: 8, height: 8, background: "var(--bgCard)", ...(tp.arrowTop ? { borderTop: "1px solid var(--borderActive)", borderLeft: "1px solid var(--borderActive)" } : { borderRight: "1px solid var(--borderActive)", borderBottom: "1px solid var(--borderActive)" }) }} />
      </div>}
    </div>
  );
}


// ─── ADAPTIVE AT A GLANCE ──────────────────────────────────────────────────────────

function MasterCalendar({ projects, workback, onSelectProject }) {
  const [calView, setCalView] = useState("week");
  const [navOffset, setNavOffset] = useState(0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];
  const fmt = (d) => d.toISOString().split("T")[0];
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const VIEWS = ["day", "week", "month", "quarter"];
  const viewLabels = { day: "Day", week: "Week", month: "Month", quarter: "3 Month" };
  const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // ── Build event spans ──
  const spans = [];
  projects.forEach((proj, pi) => {
    if (proj.archived) return;
    const color = PROJECT_COLORS[pi % PROJECT_COLORS.length];
    if (proj.engagementDates?.start && proj.engagementDates?.end)
      spans.push({ id: `eng_${proj.id}`, label: proj.name, color, start: proj.engagementDates.start, end: proj.engagementDates.end, projId: proj.id, type: "project" });
    if (!proj.isTour && proj.eventDates?.start && proj.eventDates?.end)
      spans.push({ id: `evt_${proj.id}`, label: `★ EVENT: ${proj.name}`, color, start: proj.eventDates.start, end: proj.eventDates.end, projId: proj.id, type: "event" });
  });

  // Sub-events indexed by date for calendar markers
  const subEventsByDate = {};
  projects.forEach((proj, pi) => {
    if (proj.archived || !proj.subEvents) return;
    const color = PROJECT_COLORS[pi % PROJECT_COLORS.length];
    proj.subEvents.forEach(se => {
      (subEventsByDate[se.date] = subEventsByDate[se.date] || []).push({ ...se, projId: proj.id, projName: proj.name, color });
    });
  });

  // Workback items indexed by date
  const wbByDate = {};
  workback.forEach(wb => {
    const st = WB_STATUS_STYLES[wb.status] || WB_STATUS_STYLES["Not Started"];
    const item = { label: wb.isEvent ? `★ ${wb.task}` : wb.task, color: wb.isEvent ? "#ff6b4a" : st.text, date: wb.date, projId: "p1", isEvent: wb.isEvent };
    (wbByDate[wb.date] = wbByDate[wb.date] || []).push(item);
  });

  // ── Gantt helpers (day/week views) ──
  const getGanttRange = () => {
    if (calView === "day") { const d = addDays(today, navOffset); return { days: [d] }; }
    const d = new Date(today); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + navOffset * 7);
    return { days: Array.from({ length: 7 }, (_, i) => addDays(d, i)) };
  };
  const buildGanttRows = (dayStrs) => {
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
    workback.forEach(wb => {
      const idx = dayStrs.indexOf(wb.date);
      if (idx === -1) return;
      const st = WB_STATUS_STYLES[wb.status] || WB_STATUS_STYLES["Not Started"];
      rows.push({ type: "wb", label: wb.isEvent ? `★ ${wb.task}` : wb.task, sub: wb.owner, color: wb.isEvent ? "#ff6b4a" : st.text, bg: wb.isEvent ? "#ff6b4a22" : st.bg, startCol: idx, span: 1, projId: "p1", pri: wb.isEvent ? 2 : 3 });
    });
    return rows.sort((a, b) => a.pri - b.pri);
  };

  // ── Month/Quarter grid builder ──
  const buildMonthWeeks = (year, month) => {
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
  };

  // For a given week (array of 7 date|null), find which spans overlap and assign lanes
  const getWeekLanes = (weekDates) => {
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
  };

  // Title
  const titleLabel = (() => {
    if (calView === "day") return addDays(today, navOffset).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    if (calView === "week") { const r = getGanttRange(); return `${r.days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${r.days[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`; }
    if (calView === "month") return new Date(today.getFullYear(), today.getMonth() + navOffset, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const s = new Date(today.getFullYear(), today.getMonth() + navOffset, 1);
    const e = new Date(today.getFullYear(), today.getMonth() + navOffset + 2, 1);
    return `${s.toLocaleDateString("en-US", { month: "short" })} – ${e.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
  })();

  const isGantt = calView === "day" || calView === "week";
  const isGrid = calView === "month" || calView === "quarter";
  const isQ = calView === "quarter";

  // Month grid data
  const monthGrids = isGrid ? (isQ
    ? [0, 1, 2].map(m => ({ month: new Date(today.getFullYear(), today.getMonth() + navOffset + m, 1), weeks: buildMonthWeeks(today.getFullYear(), today.getMonth() + navOffset + m) }))
    : [{ month: new Date(today.getFullYear(), today.getMonth() + navOffset, 1), weeks: buildMonthWeeks(today.getFullYear(), today.getMonth() + navOffset) }]
  ) : [];

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
        const rows = buildGanttRows(dayStrs);
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
                    <span style={{ fontSize: row.type === "wb" ? 9 : 10, fontWeight: isEvt ? 700 : 500, color: tc, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.label}</span>
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
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────

export default function Dashboard({ user, onLogout }) {
  const supabase = createClient();
  const [dataLoaded, setDataLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("saved"); // saved, saving, error
  const saveTimeoutRef = useRef(null);
  const [projects, setProjects] = useState(initProjects);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('acc-theme');
      return saved !== null ? saved === 'dark' : true;
    }
    return true;
  });
  // Extract Google Drive folder/file ID from various URL formats
  const extractDriveId = (input) => {
    if (!input) return "";
    const s = input.trim();
    // drive.google.com/drive/folders/FOLDER_ID
    const folderMatch = s.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) return folderMatch[1];
    // drive.google.com/open?id=ID
    const openMatch = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (openMatch) return openMatch[1];
    // docs.google.com/document/d/ID or docs.google.com/spreadsheets/d/ID
    const docMatch = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (docMatch) return docMatch[1];
    // drive.google.com/file/d/ID
    const fileMatch = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return fileMatch[1];
    // If it looks like a raw ID (no slashes, no dots), return as-is
    if (/^[a-zA-Z0-9_-]+$/.test(s)) return s;
    // Fallback: return as-is
    return s;
  };

  const toggleDarkMode = () => setDarkMode(m => { const next = !m; localStorage.setItem('acc-theme', next ? 'dark' : 'light'); return next; });
  const T = THEMES[darkMode ? "dark" : "light"];
  const [activeProjectId, setActiveProjectId] = useState("p1");
  const [activeTab, setActiveTab] = useState("calendar");
  const [projectVendors, setProjectVendors] = useState({});
  // Derive vendors for active project — all existing code keeps working
  const vendors = projectVendors[activeProjectId] || [];
  const setVendors = (updater) => {
    setProjectVendors(prev => ({
      ...prev,
      [activeProjectId]: typeof updater === 'function' ? updater(prev[activeProjectId] || []) : updater
    }));
  };
  const [selectedVendorIds, setSelectedVendorIds] = useState(new Set());
  // ─── PER-PROJECT WORKBACK ──────────────────────────────────────
  const [projectWorkback, setProjectWorkback] = useState({});
  const workback = projectWorkback[activeProjectId] || [];
  const setWorkback = (updater) => {
    setProjectWorkback(prev => ({
      ...prev,
      [activeProjectId]: typeof updater === 'function' ? updater(prev[activeProjectId] || []) : updater
    }));
  };
  // ─── PER-PROJECT RUN OF SHOW ───────────────────────────────────
  const [projectROS, setProjectROS] = useState({});
  const ros = projectROS[activeProjectId] || [];
  const setROS = (updater) => {
    setProjectROS(prev => ({
      ...prev,
      [activeProjectId]: typeof updater === 'function' ? updater(prev[activeProjectId] || []) : updater
    }));
  };
  const [rosDayDates, setRosDayDates] = useState({});
  const [time, setTime] = useState(new Date());
  const [uploadLog, setUploadLog] = useState([]);
  const [expandedVendor, setExpandedVendor] = useState(null);
  useEffect(() => { setSelectedVendorIds(new Set()); setExpandedVendor(null); }, [activeProjectId]);
  const [search, setSearch] = useState("");
  const [sidebarW, setSidebarW] = useState(280);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [swipeState, setSwipeState] = useState({}); // { projectId: { startX, offsetX } }
  const swipeDraggedRef = useRef(false); // true if a drag just completed, prevents click
  const [archiveConfirm, setArchiveConfirm] = useState(null); // { projectId, action: "archive"|"delete" }
  const [contextMenu, setContextMenu] = useState(null); // { x, y, projectId, projectName, archived }
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("users");
  const [appSettings, setAppSettings] = useState({
    authorizedUsers: ["billy@weareadptv.com", "clancy@weareadptv.com", "billysmith08@gmail.com"],
    pendingUsers: [],
    driveConnections: [{ name: "ADMIN", folderId: "", serviceEmail: "command-center-drive@adaptive-command-center.iam.gserviceaccount.com" }],
    statuses: ["In-Production", "Pre-Production", "Wrap", "On-Hold", "Complete"],
    projectTypes: ["Brand Event", "Private Event", "Festival", "Live Event", "Internal", "Touring", "Experiential"],
    departments: [...DEPT_OPTIONS],
  });
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [backupStatus, setBackupStatus] = useState(null);
  const [lastBackup, setLastBackup] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [driveDiag, setDriveDiag] = useState(null); // diagnostics result
  const [driveDiagLoading, setDriveDiagLoading] = useState(false);
  // ─── ACTIVITY FEED ──────────────────────────────────────────────
  const [activityLog, setActivityLog] = useState([]);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [lastSeenActivity, setLastSeenActivity] = useState(0);
  const logActivity = useCallback((action, detail, projectName) => {
    if (!user) return;
    const entry = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      user: user.email?.split("@")[0] || "unknown",
      email: user.email,
      action,
      detail,
      project: projectName || "",
      ts: Date.now(),
    };
    setActivityLog(prev => [entry, ...prev].slice(0, 200));
  }, [user]);
  const [driveTestSearch, setDriveTestSearch] = useState("");
  const isAdmin = appSettings.authorizedUsers.includes(user?.email) || user?.email === "billy@weareadptv.com" || user?.email === "clancy@weareadptv.com" || user?.email === "billysmith08@gmail.com";
  const [showPrintROS, setShowPrintROS] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [w9Scanning, setW9Scanning] = useState(false);
  const [w9ParsedData, setW9ParsedData] = useState(null);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorSearching, setVendorSearching] = useState(false);
  const [driveResults, setDriveResults] = useState(null);
  const [docPreview, setDocPreview] = useState(null); // { vendorName, docType, fileName, date, path }
  const [vendorLinkCopied, setVendorLinkCopied] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [clipboardToast, setClipboardToast] = useState(null);
  const [contactPopover, setContactPopover] = useState(null); // { contact, x, y }
  const [showAddContact, setShowAddContact] = useState(false);
  const [assignContactPopover, setAssignContactPopover] = useState(null); // { contactId, selectedProject, selectedRole }
  const [contacts, setContacts] = useState([
    { id: "ct_billy", name: "Billy Smith", firstName: "Billy", lastName: "Smith", phone: "+1 (310) 986-5581", email: "billy@weareadptv.com", company: "Adaptive by Design", position: "Executive Producer", department: "Leadership", notes: "Work: +1 (310) 853-3497 · Intl: +1 (424) 375-5699 · Personal: billysmith08@gmail.com · Home: 15 Wavecrest Ave, Venice CA 90291 · Office: 133 Horizon Ave, Venice CA 90291", source: "system" },
    { id: "ct_clancy", name: "Clancy Silver", firstName: "Clancy", lastName: "Silver", phone: "+1 (323) 532-3555", email: "clancy@weareadptv.com", company: "Adaptive by Design", position: "Executive Producer", department: "Leadership", notes: "Work: (310) 853-3497 · WhatsApp: +1 (323) 532-3555 · Also: clancy@auxx.co · clancy.silver@gmail.com · Office: 133 Horizon Ave, Venice CA 90291", source: "system" },
    { id: "ct_eden", name: "Eden Sweeden", firstName: "Eden", lastName: "Sweeden", phone: "+1 (310) 625-2453", email: "eden@weareadptv.com", company: "Adaptive by Design", position: "", department: "", notes: "Personal: edenschroder@icloud.com · Birthday: January 8, 1989", source: "system" },
  ]);
  const [contactSearch, setContactSearch] = useState("");
  const [todoistKey, setTodoistKey] = useState("564b99b7c52b83c83ab621c45b75787f65c6190a");
  const [todoistTasks, setTodoistTasks] = useState([]);
  const [todoistProjects, setTodoistProjects] = useState([]);
  const [todoistLoading, setTodoistLoading] = useState(false);
  const [todoistNewTask, setTodoistNewTask] = useState("");
  const [todoistFilter, setTodoistFilter] = useState("all"); // all, today, overdue, project id
  const todoistFetch = useCallback(async (key) => {
    const k = key || todoistKey; if (!k) return;
    setTodoistLoading(true);
    try {
      const [tasksRes, projsRes] = await Promise.all([
        fetch("https://api.todoist.com/rest/v2/tasks", { headers: { Authorization: `Bearer ${k}` } }),
        fetch("https://api.todoist.com/rest/v2/projects", { headers: { Authorization: `Bearer ${k}` } }),
      ]);
      if (!tasksRes.ok) throw new Error("Invalid API key");
      setTodoistTasks(await tasksRes.json());
      setTodoistProjects(await projsRes.json());
    } catch (e) { console.error("Todoist:", e); }
    setTodoistLoading(false);
  }, [todoistKey]);
  const todoistAdd = async () => {
    if (!todoistNewTask.trim() || !todoistKey) return;
    const res = await fetch("https://api.todoist.com/rest/v2/tasks", { method: "POST", headers: { Authorization: `Bearer ${todoistKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ content: todoistNewTask.trim() }) });
    if (res.ok) { setTodoistNewTask(""); todoistFetch(); }
  };
  const todoistClose = async (id) => {
    await fetch(`https://api.todoist.com/rest/v2/tasks/${id}/close`, { method: "POST", headers: { Authorization: `Bearer ${todoistKey}` } });
    setTodoistTasks(prev => prev.filter(t => t.id !== id));
  };
  const todoistDelete = async (id) => {
    await fetch(`https://api.todoist.com/rest/v2/tasks/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${todoistKey}` } });
    setTodoistTasks(prev => prev.filter(t => t.id !== id));
  };
  const searchTimerRef = useRef(null);
  const contactPopoverRef = useRef(null);

  // Close contact popover on outside click
  useEffect(() => {
    const h = (e) => { if (contactPopoverRef.current && !contactPopoverRef.current.contains(e.target)) setContactPopover(null); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  // vCard parser
  const parseVCard = (text) => {
    const get = (key) => { const m = text.match(new RegExp(`${key}[^:]*:(.*?)(?:\\r?\\n|$)`, "i")); return m ? m[1].trim() : ""; };
    const fn = get("FN") || "";
    const tel = get("TEL");
    const email = get("EMAIL");
    const org = get("ORG").replace(/;/g, " ").trim();
    const title = get("TITLE");
    const nameParts = fn.split(" ");
    return { name: fn, firstName: nameParts[0] || "", lastName: nameParts.slice(1).join(" ") || "", phone: tel, email, company: org, position: title, department: "", notes: "" };
  };

  const handleVCardUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      if (text.includes("BEGIN:VCARD")) {
        const cards = text.split("BEGIN:VCARD").filter(c => c.trim()).map(c => "BEGIN:VCARD" + c);
        const newContacts = cards.map(c => ({ ...parseVCard(c), id: `ct_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`, source: "vcard" }));
        setContacts(prev => {
          const existing = new Set(prev.map(c => c.name.toLowerCase()));
          const unique = newContacts.filter(c => c.name && !existing.has(c.name.toLowerCase()));
          return [...prev, ...unique];
        });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // CSV upload for bulk contact import
  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return;
      // Parse header row
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
      const nameIdx = headers.findIndex(h => h === "name" || h === "full name" || h === "fullname");
      const firstIdx = headers.findIndex(h => h === "first name" || h === "firstname" || h === "first");
      const lastIdx = headers.findIndex(h => h === "last name" || h === "lastname" || h === "last");
      const emailIdx = headers.findIndex(h => h === "email" || h === "e-mail" || h === "email address");
      const phoneIdx = headers.findIndex(h => h === "phone" || h === "telephone" || h === "phone number" || h === "mobile");
      const companyIdx = headers.findIndex(h => h === "company" || h === "organization" || h === "org");
      const positionIdx = headers.findIndex(h => h === "position" || h === "title" || h === "job title" || h === "role");
      const deptIdx = headers.findIndex(h => h === "department" || h === "dept");
      const notesIdx = headers.findIndex(h => h === "notes" || h === "note" || h === "comments");
      // Parse each row (handle quoted fields with commas)
      const parseCSVRow = (row) => {
        const result = []; let current = ""; let inQuotes = false;
        for (let i = 0; i < row.length; i++) {
          if (row[i] === '"') { inQuotes = !inQuotes; }
          else if (row[i] === ',' && !inQuotes) { result.push(current.trim()); current = ""; }
          else { current += row[i]; }
        }
        result.push(current.trim());
        return result;
      };
      const newContacts = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVRow(lines[i]);
        const firstName = firstIdx >= 0 ? (cols[firstIdx] || "") : "";
        const lastName = lastIdx >= 0 ? (cols[lastIdx] || "") : "";
        const fullName = nameIdx >= 0 ? (cols[nameIdx] || "") : `${firstName} ${lastName}`.trim();
        if (!fullName) continue;
        newContacts.push({
          id: `ct_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: fullName,
          firstName: firstName || fullName.split(" ")[0] || "",
          lastName: lastName || fullName.split(" ").slice(1).join(" ") || "",
          email: emailIdx >= 0 ? (cols[emailIdx] || "") : "",
          phone: phoneIdx >= 0 ? (cols[phoneIdx] || "") : "",
          company: companyIdx >= 0 ? (cols[companyIdx] || "") : "",
          position: positionIdx >= 0 ? (cols[positionIdx] || "") : "",
          department: deptIdx >= 0 ? (cols[deptIdx] || "") : "",
          notes: notesIdx >= 0 ? (cols[notesIdx] || "") : "",
          source: "csv"
        });
      }
      setContacts(prev => {
        const existing = new Set(prev.map(c => c.name.toLowerCase()));
        const unique = newContacts.filter(c => !existing.has(c.name.toLowerCase()));
        if (unique.length > 0) {
          setClipboardToast({ text: `Imported ${unique.length} contact${unique.length > 1 ? "s" : ""} from CSV`, x: window.innerWidth / 2, y: 60 });
          setTimeout(() => setClipboardToast(null), 3000);
        }
        return [...prev, ...unique];
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const emptyContact = { name: "", firstName: "", lastName: "", phone: "", email: "", company: "", position: "", department: "", notes: "", source: "manual" };
  const [contactForm, setContactForm] = useState({ ...emptyContact });
  const updateCF = (k, v) => setContactForm(p => ({ ...p, [k]: v }));
  const submitContact = () => {
    const name = contactForm.name || `${contactForm.firstName} ${contactForm.lastName}`.trim();
    if (!name) return;
    setContacts(prev => [...prev, { ...contactForm, name, id: `ct_${Date.now()}` }]);
    setContactForm({ ...emptyContact });
    setShowAddContact(false);
  };

  const viewContact = (contact, e) => {
    const rect = e?.currentTarget?.getBoundingClientRect();
    setContactPopover({ contact, x: rect?.left || 200, y: (rect?.bottom || 200) + 6 });
  };

  // Project code generator: YY-MMDD_MMDD-CLIENT-PROJECT-LOCATION
  const generateProjectCode = (p) => {
    const clean = (s) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
    const yr = p.eventDates?.start ? p.eventDates.start.slice(2, 4) : new Date().getFullYear().toString().slice(2);
    const sd = p.eventDates?.start ? p.eventDates.start.slice(5, 7) + p.eventDates.start.slice(8, 10) : "0000";
    const ed = p.eventDates?.end ? p.eventDates.end.slice(5, 7) + p.eventDates.end.slice(8, 10) : "";
    const dates = sd === ed || !ed ? sd : `${sd}_${ed}`;
    const client = clean(p.client).slice(0, 8) || "CLIENT";
    const proj = clean(p.name).slice(0, 14) || "PROJECT";
    const loc = clean(p.location?.split(",")[0]).slice(0, 8) || "TBD";
    return `${yr}-${dates}-${client}-${proj}-${loc}`;
  };

  const emptyProject = { name: "", client: "", location: "", why: "", status: "Exploration", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "", end: "" }, engagementDates: { start: "", end: "" }, budget: 0, spent: 0, services: [] };
  const [newProjectForm, setNewProjectForm] = useState({ ...emptyProject });
  const updateNPF = (k, v) => setNewProjectForm(p => ({ ...p, [k]: v }));

  const submitProject = () => {
    if (!newProjectForm.name && !newProjectForm.client) return;
    const code = generateProjectCode(newProjectForm);
    const newP = { ...newProjectForm, id: `p_${Date.now()}`, code };
    if (newP.isTour) newP.subEvents = newP.subEvents || [];
    setProjects(prev => [...prev, newP]);
    setActiveProjectId(newP.id);
    setActiveTab("overview");
    logActivity("updated", `created project "${newP.name}"`, newP.name);
    setShowAddProject(false);
    setNewProjectForm({ ...emptyProject });
  };

  const copyToClipboard = (text, label, e) => {
    navigator.clipboard.writeText(text);
    const rect = e?.target?.getBoundingClientRect();
    setClipboardToast({ text: `${label} copied!`, x: rect?.left || 100, y: rect?.top || 100 });
    setTimeout(() => setClipboardToast(null), 1800);
  };

  // Drive vendor search — searches entire Google Drive
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveError, setDriveError] = useState(null);
  const [driveVendorCache, setDriveVendorCache] = useState(null);

  const handleVendorSearchChange = (q) => {
    setVendorSearch(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim()) { setDriveResults(null); setVendorSearching(false); setDriveError(null); return; }
    setVendorSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      setDriveLoading(true);
      setDriveError(null);
      try {
        const folderIdList = (appSettings.driveConnections || []).map(c => c.folderId).filter(Boolean).join(',');
        const url = `/api/drive/scan?search=${encodeURIComponent(q.trim())}${folderIdList ? `&folderIds=${encodeURIComponent(folderIdList)}` : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Drive search failed: ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setDriveResults(data.vendors || []);
      } catch (err) {
        console.error('Drive search error:', err);
        setDriveError(err.message);
        setDriveResults([]);
      }
      setDriveLoading(false);
      setVendorSearching(false);
    }, 600);
  };

  const importFromDrive = (dv) => {
    const comp = {};
    ["coi", "w9", "banking", "contract", "invoice"].forEach(k => {
      comp[k] = dv.drive[k]?.found ? { done: true, file: dv.drive[k].file, date: new Date().toISOString().split("T")[0], link: dv.drive[k].link || null } : { done: false, file: null, date: null, link: null };
    });
    const exists = vendors.find(v => v.name.toLowerCase() === dv.name.toLowerCase());
    if (exists) {
      setVendors(prev => prev.map(v => v.id === exists.id ? { ...v, compliance: comp, source: "both" } : v));
    } else {
      setVendors(prev => [...prev, { id: `v_${Date.now()}`, name: dv.name, type: dv.type, email: dv.email, contact: dv.contact, phone: "", title: "", contactType: "Vendor", deptId: dv.dept, source: "drive", compliance: comp }]);
    }
    setDriveResults(null);
    setVendorSearch("");
  };
  const CONTACT_TYPES = ["Vendor", "Freelancer", "Agency", "Venue", "Subcontractor", "Supplier"];
  const RESOURCE_TYPES = ["Equipment", "Crew", "Post House", "Color", "Talent", "Catering", "Vehicles", "Props", "Fabrication", "Venue", "Permits", "Staffing", "Security", "AV/Tech", "Floral", "Decor", "Photography", "Videography", "DJ/Music", "Lighting", "Other"];
  const emptyVendorForm = { contactType: "", resourceType: "", firstName: "", lastName: "", phone: "", email: "", company: "", title: "", dept: DEPT_OPTIONS[0] };
  const [vendorForm, setVendorForm] = useState({ ...emptyVendorForm });
  const updateVF = (k, v) => setVendorForm(p => ({ ...p, [k]: v }));
  const submitVendor = () => {
    if (!vendorForm.company && !vendorForm.firstName) return;
    const name = vendorForm.company || `${vendorForm.firstName} ${vendorForm.lastName}`.trim();
    const w9Done = w9ParsedData?.upload?.success ? { done: true, file: w9ParsedData.fileName, date: new Date().toISOString().split("T")[0], link: w9ParsedData.upload.file?.link } : { done: false, file: null, date: null };
    const newV = {
      id: `v_${Date.now()}`, name, type: vendorForm.resourceType || "Other",
      email: vendorForm.email, contact: `${vendorForm.firstName} ${vendorForm.lastName}`.trim(),
      phone: vendorForm.phone, title: vendorForm.title, contactType: vendorForm.contactType,
      deptId: vendorForm.dept, source: "manual",
      ein: w9ParsedData?.ein || '',
      address: w9ParsedData ? [w9ParsedData.address, w9ParsedData.city, w9ParsedData.state, w9ParsedData.zip].filter(Boolean).join(', ') : '',
      compliance: { coi: { done: false, file: null, date: null }, w9: w9Done, invoice: { done: false, file: null, date: null }, banking: { done: false, file: null, date: null }, contract: { done: false, file: null, date: null } }
    };
    setVendors(prev => [...prev, newV]);
    logActivity("vendor", `added "${name}"`, project?.name);
    setVendorForm({ ...emptyVendorForm });
    setW9ParsedData(null);
    setShowAddVendor(false);
  };

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { if (todoistKey) todoistFetch(todoistKey); }, []);

  // ─── SUPABASE AUTO-SAVE ────────────────────────────────────────
  // Load app settings (global)
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('settings')
          .limit(1)
          .single();
        if (data?.settings && Object.keys(data.settings).length > 0) {
          setAppSettings(prev => ({ ...prev, ...data.settings }));
        }
      } catch (e) { console.error('Settings load failed:', e); }
    })();
  }, [user]);

  const saveSettings = async (newSettings) => {
    setSettingsSaving(true);
    try {
      const { data: existing } = await supabase.from('app_settings').select('id').limit(1).single();
      if (existing) {
        await supabase.from('app_settings').update({ settings: newSettings, updated_at: new Date().toISOString() }).eq('id', existing.id);
      }
      setAppSettings(newSettings);
      setSettingsDirty(false);
    } catch (e) { console.error('Settings save failed:', e); }
    setSettingsSaving(false);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('shared_state')
          .select('state')
          .eq('id', 'shared')
          .single();
        if (error && error.code !== 'PGRST116') { console.error('Load error:', error); }
        if (data?.state) {
          const s = data.state;
          if (s.projects) setProjects(s.projects);
          if (s.projectVendors) setProjectVendors(s.projectVendors);
          if (s.projectWorkback) setProjectWorkback(s.projectWorkback);
          if (s.projectROS) setProjectROS(s.projectROS);
          if (s.rosDayDates) setRosDayDates(s.rosDayDates);
          if (s.contacts) setContacts(s.contacts);
          if (s.activityLog) setActivityLog(s.activityLog);
        }
        setDataLoaded(true);
      } catch (e) { console.error('Load failed:', e); setDataLoaded(true); }
    })();
  }, [user]);

  const saveToSupabase = useCallback(async (state) => {
    if (!user) return;
    setSaveStatus("saving");
    try {
      const { error } = await supabase
        .from('shared_state')
        .update({ state, updated_at: new Date().toISOString(), updated_by: user.id })
        .eq('id', 'shared');
      if (error) { console.error('Save error:', error); setSaveStatus("error"); }
      else { setSaveStatus("saved"); }
    } catch (e) { console.error('Save failed:', e); setSaveStatus("error"); }
  }, [user, supabase]);

  useEffect(() => {
    if (!dataLoaded) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveToSupabase({ projects, projectVendors, projectWorkback, projectROS, rosDayDates, contacts, activityLog });
    }, 1500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [projects, projectVendors, projectWorkback, projectROS, rosDayDates, contacts, activityLog, dataLoaded]);

  const project = projects.find(p => p.id === activeProjectId) || projects[0];
  const updateProject = (key, val) => {
    setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, [key]: val } : p));
    if (["status", "location", "client", "name"].includes(key)) {
      logActivity("updated", `${key} → "${val}"`, project?.name);
    }
  };
  const updateProject2 = (projId, key, val) => setProjects(prev => prev.map(p => p.id === projId ? { ...p, [key]: val } : p));
  const updateGlobalContact = (contactId, field, val) => setContacts(prev => prev.map(c => c.id === contactId ? { ...c, [field]: val } : c));
  const updateWB = (id, key, val) => {
    setWorkback(prev => prev.map(w => w.id === id ? { ...w, [key]: val } : w));
    if (key === "status") {
      const wb = workback.find(w => w.id === id);
      logActivity("workback", `"${wb?.task || "task"}" → ${val}`, project?.name);
    }
  };
  const updateROS = (id, key, val) => {
    setROS(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r));
    if (["item", "time"].includes(key)) {
      logActivity("run of show", `updated ${key}`, project?.name);
    }
  };
  const addWBRow = () => {
    setWorkback(prev => [...prev, { id: `wb_${Date.now()}`, task: "", date: "", depts: [], status: "Not Started", owner: "" }]);
    logActivity("workback", "added new row", project?.name);
  };
  const addROSRow = (day) => { const existingDate = ros.find(r => r.day === day)?.dayDate || ""; setROS(prev => [...prev, { id: `r_${Date.now()}`, day, dayDate: existingDate, time: "", item: "", dept: "", vendors: [], location: "", contact: "", owner: "", note: "" }]); };

  const handleFileDrop = async (vendorId, compKey, file, drivePath, basePath) => {
    const vendor = vendors.find(v => v.id === vendorId);
    const fileName = typeof file === 'string' ? file : file.name;
    
    // Immediately update UI optimistically
    setVendors(prev => prev.map(v => v.id !== vendorId ? v : { ...v, compliance: { ...v.compliance, [compKey]: { done: true, file: fileName, date: new Date().toISOString().split("T")[0], uploading: true } } }));
    logActivity("vendor", `uploaded ${compKey} for "${vendor?.name}"`, project?.name);
    
    // Upload to Google Drive via API
    try {
      if (typeof file !== 'string') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('vendorName', vendor?.name || 'Unknown');
        formData.append('docType', compKey);
        formData.append('basePath', basePath || drivePath.replace(/\/[^/]+\/$/, ''));
        
        const res = await fetch('/api/drive/upload', { method: 'POST', body: formData });
        const data = await res.json();
        
        if (data.success) {
          setVendors(prev => prev.map(v => v.id !== vendorId ? v : { ...v, compliance: { ...v.compliance, [compKey]: { done: true, file: fileName, date: new Date().toISOString().split("T")[0], link: data.file?.link, uploading: false } } }));
          setUploadLog(prev => [{ id: Date.now(), vendorName: vendor?.name, compKey, fileName, drivePath, time: new Date().toLocaleTimeString(), folderCreated: data.folder?.created, vendorFolder: vendor?.name }, ...prev].slice(0, 20));
          return;
        }
      }
    } catch (err) {
      console.error('Drive upload failed, keeping local state:', err);
    }
    
    // Fallback: just update local state
    const vendorFolder = vendor?.name.replace(/[^a-zA-Z0-9 &'-]/g, '').trim();
    const folderCreated = !uploadLog.some(l => l.drivePath === drivePath);
    setVendors(prev => prev.map(v => v.id !== vendorId ? v : { ...v, compliance: { ...v.compliance, [compKey]: { done: true, file: fileName, date: new Date().toISOString().split("T")[0], uploading: false } } }));
    setUploadLog(prev => [{ id: Date.now(), vendorName: vendor?.name, compKey, fileName, drivePath, time: new Date().toLocaleTimeString(), folderCreated, vendorFolder }, ...prev].slice(0, 20));
  };

  const handleClearCompliance = (vendorId, compKey) => {
    setVendors(prev => prev.map(v => v.id !== vendorId ? v : { ...v, compliance: { ...v.compliance, [compKey]: { done: false, file: null, date: null, link: null } } }));
  };

  const peopleOptions = [...new Set([...contacts.map(c => c.name), ...project.producers, ...project.managers, ...(project.staff || [])])];

  // W9 Drop-to-Scrape: parse PDF, upload to Drive, pre-fill vendor form
  const handleW9Upload = async (file) => {
    if (!file) return;
    setW9Scanning(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('basePath', 'ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/2026 W9s');
      
      const res = await fetch('/api/drive/parse-w9', { method: 'POST', body: formData });
      const data = await res.json();
      
      if (data.success && data.parsed) {
        const p = data.parsed;
        // Split name into first/last
        const nameParts = (p.name || '').split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        
        setVendorForm({
          ...emptyVendorForm,
          company: p.company || p.name || file.name.replace(/[._-]/g, ' ').replace(/w9|pdf/gi, '').trim(),
          firstName,
          lastName,
          contactType: 'Vendor',
          title: p.taxClass || '',
          dept: DEPT_OPTIONS[0],
        });
        
        // Store parsed W9 data for display
        setW9ParsedData({
          ...p,
          fileName: file.name,
          upload: data.upload,
        });
        
        // Add to upload log if Drive upload succeeded
        if (data.upload?.success) {
          setUploadLog(prev => [{
            id: Date.now(),
            vendorName: p.company || p.name,
            compKey: 'w9',
            fileName: file.name,
            drivePath: `2026 W9s/${p.company || p.name}/`,
            time: new Date().toLocaleTimeString(),
            folderCreated: data.upload.folder?.created,
            vendorFolder: p.company || p.name,
          }, ...prev].slice(0, 20));
        }
        
        setShowAddVendor(true);
      } else {
        // Fallback: just use filename
        setVendorForm({
          ...emptyVendorForm,
          company: file.name.replace(/[._-]/g, ' ').replace(/w9|pdf|W9|PDF/gi, '').trim(),
          contactType: 'Vendor',
        });
        setW9ParsedData(null);
        setShowAddVendor(true);
      }
    } catch (err) {
      console.error('W9 parse failed:', err);
      setVendorForm({
        ...emptyVendorForm,
        company: file.name.replace(/[._-]/g, ' ').replace(/w9|pdf|W9|PDF/gi, '').trim(),
        contactType: 'Vendor',
      });
      setW9ParsedData(null);
      setShowAddVendor(true);
    } finally {
      setW9Scanning(false);
    }
  };
  // Event contacts = only people on THIS project (for workback Responsible + ROS Contact/Owner)
  const eventContactNames = [...new Set([
    ...project.producers, ...project.managers, ...(project.staff || []),
    ...(project.clientContacts || []).filter(p => p.name).map(p => p.name),
    ...(project.pocs || []).filter(p => p.name).map(p => p.name),
    ...(project.billingContacts || []).filter(p => p.name).map(p => p.name),
  ])];
  const pctSpent = project.budget > 0 ? (project.spent / project.budget) * 100 : 0;
  const compTotal = vendors.length * 5;
  const compDone = vendors.reduce((s, v) => s + Object.values(v.compliance).filter(c => c.done).length, 0);
  const days = [...new Set(ros.map(r => r.day))].sort((a, b) => a - b);
  const filteredProjects = projects.filter(p => {
    if (!showArchived && p.archived) return false;
    return p.name.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase());
  });
  const archivedCount = projects.filter(p => p.archived).length;

  const tabs = [
    { id: "overview", label: "Overview", icon: "◉" },
    { id: "budget", label: "Budget", icon: "$" },
    { id: "workback", label: "Work Back", icon: "◄" },
    { id: "ros", label: "Run of Show", icon: "▶" },
    { id: "drive", label: "Drive", icon: "◫" },
    { id: "vendors", label: "Contractors/Vendors", icon: "⊕" },
    { id: "contacts", label: "Event Contacts", icon: "👤" },
  ];

  // ─── APPROVAL GATE ─────────────────────────────────────────────
  const ADMIN_EMAILS = ["billy@weareadptv.com", "clancy@weareadptv.com", "billysmith08@gmail.com"];
  const isUserAuthorized = appSettings.authorizedUsers?.includes(user?.email) || ADMIN_EMAILS.includes(user?.email);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (!dataLoaded || !user?.email || isUserAuthorized || pendingRef.current) return;
    // Auto-register as pending if not already
    const already = (appSettings.pendingUsers || []).some(p => p.email === user.email);
    if (!already) {
      pendingRef.current = true;
      const updated = {
        ...appSettings,
        pendingUsers: [...(appSettings.pendingUsers || []), { email: user.email, requestedAt: new Date().toISOString() }]
      };
      saveSettings(updated);
    }
  }, [dataLoaded, user, isUserAuthorized]);

  const approveUser = async (email) => {
    const updated = {
      ...appSettings,
      authorizedUsers: [...(appSettings.authorizedUsers || []), email],
      pendingUsers: (appSettings.pendingUsers || []).filter(p => p.email !== email),
    };
    await saveSettings(updated);
  };

  const denyUser = async (email) => {
    const updated = {
      ...appSettings,
      pendingUsers: (appSettings.pendingUsers || []).filter(p => p.email !== email),
    };
    await saveSettings(updated);
  };

  if (dataLoaded && !isUserAuthorized) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0b0f", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ width: 420, padding: 48, background: "rgba(17,17,24,0.95)", borderRadius: 16, border: "1px solid rgba(255,107,74,0.15)", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#e0e0e8", marginBottom: 8 }}>Awaiting Approval</div>
          <div style={{ fontSize: 13, color: "#6a6a7a", lineHeight: 1.6, marginBottom: 24 }}>
            Your account <span style={{ color: "#ff6b4a", fontWeight: 600 }}>{user?.email}</span> has been registered but requires approval from an admin before you can access the Command Center.
          </div>
          <div style={{ fontSize: 11, color: "#4a4a5a", padding: "12px 16px", background: "#ffffff06", borderRadius: 8, border: "1px solid #ffffff08", lineHeight: 1.5 }}>
            An admin has been notified of your request. You'll be able to access the dashboard once approved.
          </div>
          <button onClick={onLogout} style={{ marginTop: 24, padding: "10px 28px", background: "transparent", border: "1px solid #2a2a3a", borderRadius: 8, color: "#6a6a7a", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Sign Out</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column", transition: "background 0.3s, color 0.3s", overflow: "hidden" }}>
      <style>{`
        :root {
          --bg: ${T.bg}; --bgSub: ${T.bgSub}; --bgCard: ${T.bgCard}; --bgInput: ${T.bgInput}; --bgHover: ${T.bgHover};
          --topBar: ${T.topBar}; --border: ${T.border}; --borderSub: ${T.borderSub}; --borderActive: ${T.borderActive};
          --text: ${T.text}; --textSub: ${T.textSub}; --textMuted: ${T.textMuted}; --textFaint: ${T.textFaint}; --textGhost: ${T.textGhost};
          --scrollThumb: ${T.scrollThumb}; --calCell: ${T.calCell}; --calLine: ${T.calLine}; --calBgEmpty: ${T.calBgEmpty};
          --filterScheme: ${T.filterScheme};
        }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: var(--scrollThumb); border-radius: 4px; }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 4px #4ecb71; } 50% { box-shadow: 0 0 12px #4ecb71; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        * { transition: background-color 0.25s, border-color 0.25s, color 0.15s; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(${darkMode ? "0.6" : "0"}); cursor: pointer; }
      `}</style>

      {/* TOP BAR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: "1px solid var(--border)", background: "var(--topBar)", transition: "background 0.3s, border-color 0.3s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Instrument Sans'", background: "linear-gradient(135deg, #ff6b4a, #ff4a6b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Adaptive by Design</span>
          <div style={{ width: 1, height: 20, background: "var(--border)" }} />
          <span style={{ fontSize: 11, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1 }}>COMMAND CENTER</span>
          <div style={{ width: 1, height: 16, background: "var(--border)" }} />
          <button onClick={() => setActiveTab("calendar")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, color: activeTab === "calendar" ? "#ff6b4a" : "var(--textFaint)", padding: "4px 10px", borderRadius: 5, transition: "all 0.15s", letterSpacing: 0.3 }}>
            📅 Adaptive at a Glance
          </button>
          <button onClick={() => setActiveTab("globalContacts")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, color: activeTab === "globalContacts" ? "#ff6b4a" : "var(--textFaint)", padding: "4px 10px", borderRadius: 5, transition: "all 0.15s", letterSpacing: 0.3 }}>
            👤 Global Contacts {contacts.length > 0 && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 10, background: "var(--bgHover)", color: "var(--textFaint)", fontFamily: "'JetBrains Mono', monospace", marginLeft: 4 }}>{contacts.length}</span>}
          </button>
          <button onClick={() => { setActiveTab("todoist"); if (!todoistTasks.length && todoistKey) todoistFetch(); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, color: activeTab === "todoist" ? "#ff6b4a" : "var(--textFaint)", padding: "4px 10px", borderRadius: 5, transition: "all 0.15s", letterSpacing: 0.3 }}>
            ✅ Todoist {todoistTasks.length > 0 && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 10, background: "var(--bgHover)", color: "var(--textFaint)", fontFamily: "'JetBrains Mono', monospace", marginLeft: 4 }}>{todoistTasks.length}</span>}
          </button>
          {isAdmin && (
            <button onClick={() => setActiveTab("macro")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, color: activeTab === "macro" ? "#ff6b4a" : "var(--textFaint)", padding: "4px 10px", borderRadius: 5, transition: "all 0.15s", letterSpacing: 0.3 }}>
              📋 Macro View
            </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Settings gear (admin only) */}
          {isAdmin && (
            <button onClick={() => setShowSettings(true)} style={{ background: "none", border: "1px solid var(--borderSub)", borderRadius: 20, padding: "4px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.3s" }} title="Settings">
              <span style={{ fontSize: 12 }}>⚙️</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: "var(--textMuted)", letterSpacing: 0.5 }}>SETTINGS</span>
            </button>
          )}
          {/* Activity Feed Bell */}
          <div style={{ position: "relative" }}>
            <button onClick={() => { setShowActivityFeed(!showActivityFeed); if (!showActivityFeed) setLastSeenActivity(Date.now()); }} style={{ background: "none", border: "1px solid var(--borderSub)", borderRadius: 8, padding: "5px 9px", cursor: "pointer", position: "relative", display: "flex", alignItems: "center", gap: 4 }} title="Activity Feed">
              <span style={{ fontSize: 14 }}>🔔</span>
              {activityLog.filter(a => a.ts > lastSeenActivity && a.email !== user?.email).length > 0 && (
                <span style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#ff4444", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {Math.min(activityLog.filter(a => a.ts > lastSeenActivity && a.email !== user?.email).length, 99)}
                </span>
              )}
            </button>
            {showActivityFeed && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 380, maxHeight: 480, background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", zIndex: 1000, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--borderSub)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Activity Feed</span>
                  <button onClick={() => setShowActivityFeed(false)} style={{ background: "none", border: "none", color: "var(--textMuted)", cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                  {activityLog.length === 0 ? (
                    <div style={{ padding: 30, textAlign: "center", color: "var(--textGhost)", fontSize: 12 }}>No activity yet. Changes will appear here.</div>
                  ) : activityLog.slice(0, 50).map(a => {
                    const isMe = a.email === user?.email;
                    const timeAgo = (() => {
                      const diff = Date.now() - a.ts;
                      if (diff < 60000) return "just now";
                      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
                      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
                      return `${Math.floor(diff / 86400000)}d ago`;
                    })();
                    const actionIcon = a.action === "workback" ? "◄" : a.action === "run of show" ? "▶" : a.action === "vendor" ? "⊕" : a.action === "updated" ? "✎" : "•";
                    return (
                      <div key={a.id} style={{ padding: "10px 16px", borderBottom: "1px solid var(--calLine)", display: "flex", gap: 10, alignItems: "flex-start", background: (!isMe && a.ts > lastSeenActivity) ? "#ff6b4a06" : "transparent" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: isMe ? "#3da5db18" : "#ff6b4a18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: isMe ? "#3da5db" : "#ff6b4a", flexShrink: 0, marginTop: 2 }}>
                          {a.user?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.4 }}>
                            <span style={{ fontWeight: 700, color: isMe ? "#3da5db" : "#ff6b4a" }}>{a.user}</span>
                            <span style={{ color: "var(--textMuted)" }}> {actionIcon} {a.action}: </span>
                            <span style={{ color: "var(--textSub)" }}>{a.detail}</span>
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
                            {a.project && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "var(--bgInput)", color: "var(--textFaint)", fontWeight: 600 }}>{a.project}</span>}
                            <span style={{ fontSize: 9, color: "var(--textGhost)" }}>{timeAgo}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {/* Dark/Light toggle */}
          <button onClick={toggleDarkMode} style={{ background: darkMode ? "var(--bgCard)" : "#d8d0b8", border: "1px solid var(--borderSub)", borderRadius: 20, padding: "4px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.3s" }} title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
            <span style={{ fontSize: 12 }}>{darkMode ? "🌙" : "☀️"}</span>
            <span style={{ fontSize: 9, fontWeight: 600, color: "var(--textMuted)", letterSpacing: 0.5 }}>{darkMode ? "DARK" : "LIGHT"}</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: saveStatus === "saving" ? "#f5a623" : saveStatus === "error" ? "#ff4444" : "#4ecb71", animation: saveStatus === "saving" ? "none" : "glow 2s infinite", transition: "background 0.3s" }} /><span style={{ fontSize: 10, color: "var(--textFaint)", fontFamily: "'JetBrains Mono', monospace" }}>{saveStatus === "saving" ? "SAVING" : saveStatus === "error" ? "ERROR" : "LIVE"}</span></div>
          <span style={{ fontSize: 12, color: "var(--textFaint)", fontFamily: "'JetBrains Mono', monospace" }}>{time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
          {user && <span style={{ fontSize: 9, color: "var(--textGhost)", fontFamily: "'JetBrains Mono', monospace" }}>{user.email}</span>}
          {onLogout && <button onClick={onLogout} style={{ background: "none", border: "1px solid var(--borderSub)", borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: 9, color: "var(--textMuted)", fontWeight: 600, letterSpacing: 0.3 }}>LOGOUT</button>}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* SIDEBAR */}
        {sidebarOpen && (
        <div style={{ width: sidebarW, minWidth: 220, maxWidth: 440, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", background: "var(--bgSub)", position: "relative", flexShrink: 0, transition: "background 0.3s", overflow: "hidden" }}>
          {/* Resize handle */}
          <div onMouseDown={(e) => {
            e.preventDefault(); e.stopPropagation();
            const startX = e.clientX;
            const startW = sidebarW;
            const onMove = (ev) => { ev.preventDefault(); const newW = Math.max(220, Math.min(440, startW + ev.clientX - startX)); setSidebarW(newW); };
            const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
          }} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 8, cursor: "col-resize", zIndex: 20, background: "transparent" }} onMouseEnter={e => e.currentTarget.style.background = "#ff6b4a30"} onMouseLeave={e => e.currentTarget.style.background = "transparent"} />
          <div style={{ padding: "14px 12px 10px", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, padding: "8px 12px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--textSub)", fontSize: 12, outline: "none", fontFamily: "'DM Sans'" }} />
              <button onClick={() => setSidebarOpen(false)} style={{ padding: "4px 8px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 7, cursor: "pointer", color: "var(--textFaint)", fontSize: 14, display: "flex", alignItems: "center" }} title="Collapse sidebar">◀</button>
            </div>
            <button onClick={() => { setNewProjectForm({ ...emptyProject }); setShowAddProject(true); }} style={{ width: "100%", padding: "7px 12px", background: "#ff6b4a10", border: "1px solid #ff6b4a25", borderRadius: 7, color: "#ff6b4a", cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <span style={{ fontSize: 13 }}>+</span> New Project
            </button>
            {archivedCount > 0 && (
              <button onClick={() => setShowArchived(!showArchived)} style={{ width: "100%", marginTop: 6, padding: "5px 12px", background: showArchived ? "#9b6dff10" : "transparent", border: `1px solid ${showArchived ? "#9b6dff30" : "var(--borderSub)"}`, borderRadius: 7, color: showArchived ? "#9b6dff" : "var(--textGhost)", cursor: "pointer", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                📦 {showArchived ? "Hide" : "Show"} Archived ({archivedCount})
              </button>
            )}
          </div>
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "0 6px 12px", minHeight: 0 }}>
            {filteredProjects.map((p, i) => {
              const active = p.id === activeProjectId;
              const sc = STATUS_COLORS[p.status] || { bg: "var(--bgCard)", text: "var(--textMuted)", dot: "var(--textFaint)" };
              const pct = p.budget > 0 ? (p.spent / p.budget) * 100 : 0;
              const ptc = PT_COLORS[p.projectType] || "var(--textMuted)";
              const swipe = swipeState[p.id] || { offsetX: 0 };
              return (
                <div key={p.id} style={{ position: "relative", overflow: "hidden", marginBottom: 2, borderRadius: 8 }}>
                  {/* Swipe action buttons revealed behind card (touch swipe) */}
                  {isAdmin && swipe.offsetX < -10 && (
                    <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, paddingRight: 8, borderRadius: 8, background: "var(--bgSub)" }}>
                      <button onClick={(e) => { e.stopPropagation(); setArchiveConfirm({ projectId: p.id, action: "archive", name: p.name }); setSwipeState({}); }} style={{ padding: "6px 10px", background: "#9b6dff20", border: "1px solid #9b6dff30", borderRadius: 5, color: "#9b6dff", fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{p.archived ? "↩ Restore" : "📦 Archive"}</button>
                      <button onClick={(e) => { e.stopPropagation(); setArchiveConfirm({ projectId: p.id, action: "delete", name: p.name }); setSwipeState({}); }} style={{ padding: "6px 10px", background: "#e8545420", border: "1px solid #e8545430", borderRadius: 5, color: "#e85454", fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>🗑 Delete</button>
                    </div>
                  )}
                  <div
                    onTouchStart={(e) => { if (!isAdmin) return; setSwipeState(prev => ({ ...prev, [p.id]: { startX: e.touches[0].clientX, offsetX: 0 } })); }}
                    onTouchMove={(e) => { if (!isAdmin) return; const sw = swipeState[p.id]; if (!sw || sw.startX === undefined) return; const diff = e.touches[0].clientX - sw.startX; if (Math.abs(diff) > 8) { setSwipeState(prev => ({ ...prev, [p.id]: { ...prev[p.id], offsetX: Math.max(-160, Math.min(0, diff)) } })); } }}
                    onTouchEnd={() => { if (!isAdmin) return; const sw = swipeState[p.id]; if (!sw) return; if (sw.offsetX < -60) { setSwipeState(prev => ({ ...prev, [p.id]: { offsetX: -160 } })); } else { setSwipeState(prev => ({ ...prev, [p.id]: { offsetX: 0 } })); } }}
                    onContextMenu={(e) => {
                      if (!isAdmin) return;
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, projectId: p.id, projectName: p.name, archived: !!p.archived });
                    }}
                    onClick={() => {
                      const sw = swipeState[p.id];
                      if (sw && sw.offsetX < -10) { setSwipeState(prev => ({ ...prev, [p.id]: { offsetX: 0 } })); return; }
                      setActiveProjectId(p.id);
                      if (activeTab === "calendar" || activeTab === "globalContacts" || activeTab === "todoist" || activeTab === "macro") setActiveTab("overview");
                    }}
                    style={{ padding: 12, borderRadius: 8, cursor: "pointer", background: p.archived ? "var(--bgCard)" : active ? "var(--bgHover)" : "transparent", border: active ? "1px solid var(--borderActive)" : "1px solid transparent", transition: swipe.offsetX === 0 ? "transform 0.25s ease" : "none", transform: `translateX(${swipe.offsetX}px)`, opacity: p.archived ? 0.55 : 1, position: "relative", zIndex: 1, userSelect: "none" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--textFaint)", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 4 }}>{p.client}{p.projectType && <span style={{ fontSize: 7, padding: "1px 4px", borderRadius: 3, background: ptc + "15", color: ptc, border: `1px solid ${ptc}25`, fontWeight: 700, letterSpacing: 0.5 }}>{p.projectType.toUpperCase()}</span>}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {p.archived && <span style={{ fontSize: 7, padding: "1px 4px", borderRadius: 3, background: "#9b6dff15", color: "#9b6dff", fontWeight: 700, letterSpacing: 0.5 }}>ARCHIVED</span>}
                        <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 3, background: sc.bg, color: sc.text }}><span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: sc.dot, marginRight: 4 }} />{p.status}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: active ? "var(--text)" : "var(--textSub)", marginBottom: 3 }}>{p.name}</div>
                    {p.code && <div style={{ fontSize: 8, color: "var(--textGhost)", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4, letterSpacing: 0.3 }}>{p.code}</div>}
                    {((p.engagementDates && p.engagementDates.start) || (p.eventDates && p.eventDates.start)) && <div style={{ fontSize: 9, color: "var(--textGhost)", marginBottom: 4 }}>
                      {p.engagementDates && p.engagementDates.start && <div>📋 {fmtShort(p.engagementDates.start)}{p.engagementDates.end ? ` – ${fmtShort(p.engagementDates.end)}` : ""}</div>}
                      {p.eventDates && p.eventDates.start && <div>🎪 {fmtShort(p.eventDates.start)}{p.eventDates.end ? ` – ${fmtShort(p.eventDates.end)}` : ""}</div>}
                    </div>}
                    {p.budget > 0 && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><ProgressBar pct={pct} h={3} /><span style={{ fontSize: 10, color: "var(--textMuted)", fontFamily: "'JetBrains Mono', monospace", minWidth: 30 }}>{Math.round(pct)}%</span></div>}
                    {p.budget === 0 && p.location && <div style={{ fontSize: 9, color: "var(--textGhost)" }}>📍 {p.location}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: 12, borderTop: "1px solid var(--border)", flexShrink: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <div style={{ background: "var(--bgCard)", borderRadius: 7, padding: "8px 10px" }}><div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 3 }}>COMPLIANCE</div><div style={{ fontSize: 18, fontWeight: 700, color: compTotal > 0 && compDone / compTotal > 0.8 ? "#4ecb71" : "#dba94e", fontFamily: "'JetBrains Mono', monospace" }}>{compTotal > 0 ? Math.round(compDone / compTotal * 100) : 0}%</div></div>
              <div style={{ background: "var(--bgCard)", borderRadius: 7, padding: "8px 10px" }}><div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 3 }}>CONTRACTORS</div><div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{vendors.length}</div></div>
            </div>
          </div>
        </div>
        )}
        {/* Sidebar collapsed toggle */}
        {!sidebarOpen && (
          <div style={{ width: 40, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", background: "var(--bgSub)", flexShrink: 0, paddingTop: 14 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ padding: "6px 8px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 7, cursor: "pointer", color: "var(--textFaint)", fontSize: 14, display: "flex", alignItems: "center" }} title="Expand sidebar">▶</button>
            <div style={{ writingMode: "vertical-rl", textOrientation: "mixed", fontSize: 9, color: "var(--textGhost)", fontWeight: 600, letterSpacing: 1, marginTop: 14, transform: "rotate(180deg)" }}>PROJECTS ({projects.filter(p => !p.archived).length})</div>
          </div>
        )}

        {/* MAIN */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "16px 28px 0" }}>
            {activeTab !== "calendar" && activeTab !== "globalContacts" && activeTab !== "macro" && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1 }}>{project.client}</span>
                    {project.code && <span style={{ fontSize: 9, color: "var(--textGhost)", fontFamily: "'JetBrains Mono', monospace", padding: "1px 6px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 3, letterSpacing: 0.3 }}>{project.code}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, fontFamily: "'Instrument Sans'" }}><EditableText value={project.name} onChange={v => updateProject("name", v)} fontSize={22} fontWeight={700} color="var(--text)" /></h1>
                    <select value={project.projectType || ""} onChange={e => updateProject("projectType", e.target.value)} style={{ padding: "3px 8px", borderRadius: 5, fontSize: 9, fontWeight: 700, cursor: "pointer", outline: "none", appearance: "auto", background: (PT_COLORS[project.projectType] || "var(--textMuted)") + "15", border: `1px solid ${(PT_COLORS[project.projectType] || "var(--textMuted)")}30`, color: PT_COLORS[project.projectType] || "var(--textMuted)", letterSpacing: 0.5 }}>
                      <option value="">No Type</option>
                      {PROJECT_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 3 }}>BUDGET</div><div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(project.budget)}</div></div>
              </div>
            )}
            {activeTab !== "calendar" && activeTab !== "globalContacts" && activeTab !== "macro" && (
            <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "9px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: activeTab === t.id ? "var(--text)" : "var(--textFaint)", borderBottom: activeTab === t.id ? "2px solid #ff6b4a" : "2px solid transparent", fontFamily: "'DM Sans'", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10 }}>{t.icon}</span>{t.label}
                  {t.id === "vendors" && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 10, background: compDone < compTotal ? "var(--borderSub)" : "var(--bgCard)", color: compDone < compTotal ? "#e85454" : "#4ecb71", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{compDone}/{compTotal}</span>}
                  {t.id === "contacts" && (() => { const ct = project.producers.length + project.managers.length + (project.staff?.length || 0) + (project.clientContacts || []).filter(p => p.name).length + (project.pocs || []).filter(p => p.name).length + (project.billingContacts || []).filter(p => p.name).length; return ct > 0 ? <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 10, background: "var(--bgCard)", color: "var(--textMuted)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{ct}</span> : null; })()}
                </button>
              ))}
            </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 40px" }}>

            {/* ═══ ADAPTIVE AT A GLANCE ═══ */}
            {activeTab === "calendar" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>ALL PROJECTS</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Instrument Sans'" }}>Adaptive at a Glance</div>
                </div>
                <MasterCalendar projects={projects} workback={workback} onSelectProject={(id) => { setActiveProjectId(id); setActiveTab("overview"); }} />
              </div>
            )}

            {/* ═══ GLOBAL CONTACTS ═══ */}
            {activeTab === "globalContacts" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>ALL CONTACTS</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Instrument Sans'" }}>Global Contacts</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search contacts..." style={{ padding: "8px 14px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--textSub)", fontSize: 12, outline: "none", width: 240 }} />
                    <label style={{ padding: "7px 16px", background: "#3da5db15", border: "1px solid #3da5db30", borderRadius: 7, color: "#3da5db", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>📇</span> Import vCard
                      <input type="file" accept=".vcf,.vcard" onChange={handleVCardUpload} style={{ display: "none" }} multiple />
                    </label>
                    <label style={{ padding: "7px 16px", background: "#4ecb7115", border: "1px solid #4ecb7130", borderRadius: 7, color: "#4ecb71", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>📊</span> Import CSV
                      <input type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: "none" }} />
                    </label>
                    <button onClick={() => { setContactForm({ ...emptyContact }); setShowAddContact(true); }} style={{ padding: "7px 16px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 7, color: "#ff6b4a", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14 }}>+</span> Add Contact
                    </button>
                  </div>
                </div>

                {contacts.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 60, color: "var(--textGhost)" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--textFaint)" }}>No contacts yet</div>
                    <div style={{ fontSize: 13, marginBottom: 20 }}>Add contacts manually or import vCards (.vcf) from your phone</div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                      <label style={{ padding: "10px 20px", background: "#3da5db15", border: "1px solid #3da5db30", borderRadius: 8, color: "#3da5db", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                        📇 Import vCard
                        <input type="file" accept=".vcf,.vcard" onChange={handleVCardUpload} style={{ display: "none" }} multiple />
                      </label>
                      <button onClick={() => { setContactForm({ ...emptyContact }); setShowAddContact(true); }} style={{ padding: "10px 20px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 8, color: "#ff6b4a", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>+ Add Manually</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1.2fr 1.2fr 1.8fr 1fr auto", padding: "10px 16px", borderBottom: "1px solid var(--borderSub)", fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1 }}>
                      <span>NAME</span><span>POSITION</span><span>PHONE</span><span>EMAIL</span><span>COMPANY</span><span>ACTIONS</span>
                    </div>
                    {contacts.filter(c => !contactSearch || c.name.toLowerCase().includes(contactSearch.toLowerCase()) || (c.email || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.company || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.position || "").toLowerCase().includes(contactSearch.toLowerCase())).map(c => (
                      <div key={c.id} style={{ display: "grid", gridTemplateColumns: "2.2fr 1.2fr 1.2fr 1.8fr 1fr auto", padding: "10px 16px", borderBottom: "1px solid var(--calLine)", alignItems: "center", fontSize: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div onClick={(e) => viewContact(c, e)} style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #ff6b4a20, #ff4a6b20)", border: "1px solid #ff6b4a30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#ff6b4a", flexShrink: 0, cursor: "pointer" }}>
                            {c.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--text)" }}>{c.name}</div>
                            {c.department && <div style={{ fontSize: 9, color: "var(--textFaint)" }}>{c.department}</div>}
                          </div>
                        </div>
                        <span style={{ color: "var(--textMuted)", fontSize: 11 }}>{c.position || "—"}</span>
                        <span onClick={(e) => c.phone && copyToClipboard(c.phone, "Phone", e)} style={{ color: "var(--textMuted)", fontSize: 11, cursor: c.phone ? "pointer" : "default" }} onMouseEnter={e => { if (c.phone) e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={e => e.currentTarget.style.color = "var(--textMuted)"}>{c.phone || "—"} {c.phone && <span style={{ fontSize: 7, color: "var(--textGhost)" }}>⧉</span>}</span>
                        <span onClick={(e) => c.email && copyToClipboard(c.email, "Email", e)} style={{ color: "var(--textMuted)", fontSize: 11, cursor: c.email ? "pointer" : "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} onMouseEnter={e => { if (c.email) e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={e => e.currentTarget.style.color = "var(--textMuted)"}>{c.email || "—"} {c.email && <span style={{ fontSize: 7, color: "var(--textGhost)" }}>⧉</span>}</span>
                        <span style={{ color: "var(--textMuted)", fontSize: 11 }}>{c.company || "—"}</span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", position: "relative" }}>
                          <div style={{ position: "relative" }}>
                            <button onClick={() => setAssignContactPopover(assignContactPopover?.contactId === c.id ? null : { contactId: c.id, selectedProject: activeProjectId, selectedRole: "Point of Contact" })} style={{ padding: "4px 10px", background: assignContactPopover?.contactId === c.id ? "#9b6dff25" : "#9b6dff10", border: "1px solid #9b6dff30", borderRadius: 5, color: "#9b6dff", cursor: "pointer", fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>+ Project</button>
                            {assignContactPopover?.contactId === c.id && (
                              <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "var(--bgHover)", border: "1px solid var(--borderActive)", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.7)", zIndex: 80, width: 280, overflow: "hidden" }}>
                                <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--borderSub)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 0.8 }}>ASSIGN TO PROJECT</div>
                                  <button onClick={() => setAssignContactPopover(null)} style={{ background: "none", border: "none", color: "var(--textFaint)", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "0 2px" }}>✕</button>
                                </div>
                                <div style={{ padding: "0 14px 10px" }}>
                                  <select value={assignContactPopover.selectedProject} onChange={e => setAssignContactPopover(prev => ({ ...prev, selectedProject: e.target.value }))} style={{ width: "100%", padding: "6px 8px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "var(--textSub)", fontSize: 11, outline: "none" }}>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                  </select>
                                </div>
                                <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--borderSub)" }}>
                                  <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 0.8, marginBottom: 6 }}>ROLE</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                    {["Producer", "Manager", "Staff / Crew", "Client", "Point of Contact", "Billing"].map(r => (
                                      <button key={r} onClick={() => setAssignContactPopover(prev => ({ ...prev, selectedRole: r }))} style={{ padding: "3px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, cursor: "pointer", background: assignContactPopover.selectedRole === r ? "#9b6dff20" : "var(--bgInput)", border: `1px solid ${assignContactPopover.selectedRole === r ? "#9b6dff40" : "var(--borderSub)"}`, color: assignContactPopover.selectedRole === r ? "#9b6dff" : "var(--textFaint)" }}>{r}</button>
                                    ))}
                                  </div>
                                </div>
                                <div style={{ padding: "10px 14px" }}>
                                  <button onClick={() => {
                                    const targetProject = projects.find(p => p.id === assignContactPopover.selectedProject);
                                    if (!targetProject) return;
                                    const role = assignContactPopover.selectedRole;
                                    const entry = { name: c.name, phone: c.phone || "", email: c.email || "", address: "", fromContacts: true, role };
                                    const projIdx = projects.findIndex(p => p.id === assignContactPopover.selectedProject);
                                    if (projIdx < 0) return;
                                    // Check duplicates
                                    const allPeople = [...targetProject.producers, ...targetProject.managers, ...(targetProject.staff || []), ...(targetProject.pocs || []).map(p => p.name), ...(targetProject.clientContacts || []).map(p => p.name), ...(targetProject.billingContacts || []).map(p => p.name)];
                                    if (allPeople.includes(c.name)) { alert(`${c.name} is already on ${targetProject.name}.`); return; }
                                    // Add based on role
                                    if (role === "Producer") updateProject2(assignContactPopover.selectedProject, "producers", [...targetProject.producers, c.name]);
                                    else if (role === "Manager") updateProject2(assignContactPopover.selectedProject, "managers", [...targetProject.managers, c.name]);
                                    else if (role === "Staff / Crew") updateProject2(assignContactPopover.selectedProject, "staff", [...(targetProject.staff || []), c.name]);
                                    else if (role === "Client") updateProject2(assignContactPopover.selectedProject, "clientContacts", [...(targetProject.clientContacts || []), entry]);
                                    else if (role === "Billing") updateProject2(assignContactPopover.selectedProject, "billingContacts", [...(targetProject.billingContacts || []), entry]);
                                    else updateProject2(assignContactPopover.selectedProject, "pocs", [...(targetProject.pocs || []), entry]);
                                    setClipboardToast({ text: `${c.name} added to ${targetProject.name} as ${role}!`, x: window.innerWidth / 2, y: 60 }); setTimeout(() => setClipboardToast(null), 2200);
                                    setAssignContactPopover(null);
                                  }} style={{ width: "100%", padding: "8px", background: "#9b6dff", border: "none", borderRadius: 6, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 11 }}>
                                    Add to {projects.find(p => p.id === assignContactPopover.selectedProject)?.name?.slice(0, 20) || "Project"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          <button onClick={() => { setContactForm({ ...c }); setShowAddContact(true); }} style={{ padding: "4px 10px", background: "var(--bgCard)", border: "1px solid var(--borderActive)", borderRadius: 5, color: "var(--textMuted)", cursor: "pointer", fontSize: 10, fontWeight: 600 }} title="Edit contact">✏ Edit</button>
                          <button onClick={() => { if (confirm(`Remove ${c.name}?`)) setContacts(prev => prev.filter(x => x.id !== c.id)); }} style={{ padding: "4px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "#e85454", cursor: "pointer", fontSize: 10, fontWeight: 600 }} title="Delete contact">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ TODOIST ═══ */}
            {activeTab === "todoist" && (
              <div style={{ animation: "fadeUp 0.3s ease", maxWidth: 900 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>TASK MANAGEMENT</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Instrument Sans'" }}>Todoist</div>
                  </div>
                  {todoistKey && <button onClick={() => todoistFetch()} style={{ padding: "7px 16px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 7, color: "#ff6b4a", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>↻ Refresh</button>}
                </div>

                {!todoistKey ? (
                  <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 12, padding: 32, textAlign: "center" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Connect Todoist</div>
                    <div style={{ fontSize: 13, color: "var(--textFaint)", marginBottom: 20, lineHeight: 1.6 }}>Enter your Todoist API token to sync tasks.<br />Find it at <span style={{ color: "#ff6b4a" }}>Todoist → Settings → Integrations → Developer</span></div>
                    <div style={{ display: "flex", gap: 8, maxWidth: 480, margin: "0 auto" }}>
                      <input placeholder="Paste your API token..." value={todoistKey} onChange={e => setTodoistKey(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && todoistKey) todoistFetch(todoistKey); }} style={{ flex: 1, padding: "10px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none", fontFamily: "'JetBrains Mono', monospace" }} />
                      <button onClick={() => todoistFetch(todoistKey)} disabled={!todoistKey} style={{ padding: "10px 20px", background: todoistKey ? "#ff6b4a" : "var(--bgInput)", border: "none", borderRadius: 8, color: todoistKey ? "#fff" : "var(--textGhost)", cursor: todoistKey ? "pointer" : "default", fontSize: 13, fontWeight: 700 }}>Connect</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Add task */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                      <input placeholder="Add a task..." value={todoistNewTask} onChange={e => setTodoistNewTask(e.target.value)} onKeyDown={e => { if (e.key === "Enter") todoistAdd(); }} style={{ flex: 1, padding: "10px 14px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none", fontFamily: "'DM Sans'" }} />
                      <button onClick={todoistAdd} disabled={!todoistNewTask.trim()} style={{ padding: "10px 20px", background: todoistNewTask.trim() ? "#ff6b4a" : "var(--bgInput)", border: "none", borderRadius: 8, color: todoistNewTask.trim() ? "#fff" : "var(--textGhost)", cursor: todoistNewTask.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 700 }}>+ Add</button>
                    </div>

                    {/* Filter bar */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                      {[{ id: "all", label: "All" }, { id: "today", label: "Today" }, { id: "overdue", label: "Overdue" }].map(f => (
                        <button key={f.id} onClick={() => setTodoistFilter(f.id)} style={{ padding: "5px 12px", background: todoistFilter === f.id ? "#ff6b4a15" : "var(--bgInput)", border: `1px solid ${todoistFilter === f.id ? "#ff6b4a30" : "var(--borderSub)"}`, borderRadius: 6, color: todoistFilter === f.id ? "#ff6b4a" : "var(--textMuted)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>{f.label}</button>
                      ))}
                      <div style={{ width: 1, background: "var(--border)", margin: "0 4px" }} />
                      {todoistProjects.filter(p => !p.inbox_project).map(p => (
                        <button key={p.id} onClick={() => setTodoistFilter(p.id)} style={{ padding: "5px 12px", background: todoistFilter === p.id ? `${p.color === "charcoal" ? "#808080" : p.color || "#808080"}20` : "var(--bgInput)", border: `1px solid ${todoistFilter === p.id ? (p.color === "charcoal" ? "#808080" : p.color || "#808080") + "40" : "var(--borderSub)"}`, borderRadius: 6, color: todoistFilter === p.id ? "#ff6b4a" : "var(--textMuted)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>{p.name}</button>
                      ))}
                    </div>

                    {/* Task list */}
                    {todoistLoading ? (
                      <div style={{ textAlign: "center", padding: 40, color: "var(--textFaint)" }}>Loading tasks...</div>
                    ) : (
                      <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 10, overflow: "hidden" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 120px 100px 50px", padding: "8px 12px", borderBottom: "1px solid var(--borderSub)", fontSize: 8, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1 }}><span></span><span>TASK</span><span>PROJECT</span><span>DUE</span><span></span></div>
                        {(() => {
                          const today = new Date().toISOString().split("T")[0];
                          let filtered = todoistTasks;
                          if (todoistFilter === "today") filtered = filtered.filter(t => t.due && t.due.date === today);
                          else if (todoistFilter === "overdue") filtered = filtered.filter(t => t.due && t.due.date < today);
                          else if (todoistFilter !== "all") filtered = filtered.filter(t => t.project_id === todoistFilter);
                          return filtered.length === 0 ? (
                            <div style={{ padding: 32, textAlign: "center", color: "var(--textGhost)" }}>
                              {todoistTasks.length === 0 ? "No tasks found. Add one above!" : "No tasks match this filter."}
                            </div>
                          ) : filtered.sort((a, b) => (a.order || 0) - (b.order || 0)).map(task => {
                            const proj = todoistProjects.find(p => p.id === task.project_id);
                            const isOverdue = task.due && task.due.date < today;
                            const isToday = task.due && task.due.date === today;
                            const priColors = { 1: "var(--textMuted)", 2: "#3da5db", 3: "#dba94e", 4: "#ff6b4a" };
                            return (
                              <div key={task.id} style={{ display: "grid", gridTemplateColumns: "32px 1fr 120px 100px 50px", padding: "8px 12px", borderBottom: "1px solid var(--calLine)", alignItems: "center" }}>
                                <div onClick={() => todoistClose(task.id)} style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${priColors[task.priority] || "var(--textGhost)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#4ecb7140"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                  <span style={{ fontSize: 10, opacity: 0.4 }}>✓</span>
                                </div>
                                <div>
                                  <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{task.content}</div>
                                  {task.description && <div style={{ fontSize: 11, color: "var(--textMuted)", marginTop: 2 }}>{task.description.slice(0, 80)}</div>}
                                </div>
                                <div style={{ fontSize: 10, color: "var(--textFaint)" }}>{proj ? proj.name : "Inbox"}</div>
                                <div style={{ fontSize: 10, color: isOverdue ? "#ff4a6b" : isToday ? "#ff6b4a" : "var(--textMuted)", fontWeight: isOverdue || isToday ? 600 : 400 }}>
                                  {task.due ? (isToday ? "Today" : task.due.string || task.due.date) : ""}
                                </div>
                                <button onClick={() => todoistDelete(task.id)} style={{ background: "none", border: "none", color: "var(--textGhost)", cursor: "pointer", fontSize: 13 }} title="Delete">×</button>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}

                    {/* Summary */}
                    <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                      <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, padding: "10px 16px", flex: 1 }}>
                        <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>TOTAL TASKS</div>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{todoistTasks.length}</div>
                      </div>
                      <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, padding: "10px 16px", flex: 1 }}>
                        <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>DUE TODAY</div>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#ff6b4a" }}>{todoistTasks.filter(t => t.due && t.due.date === new Date().toISOString().split("T")[0]).length}</div>
                      </div>
                      <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, padding: "10px 16px", flex: 1 }}>
                        <div style={{ fontSize: 9, color: "#ff4a6b", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>OVERDUE</div>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#ff4a6b" }}>{todoistTasks.filter(t => t.due && t.due.date < new Date().toISOString().split("T")[0]).length}</div>
                      </div>
                      <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, padding: "10px 16px", flex: 1 }}>
                        <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>PROJECTS</div>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{todoistProjects.length}</div>
                      </div>
                    </div>

                    {/* Disconnect */}
                    <div style={{ marginTop: 16, textAlign: "right" }}>
                      <button onClick={() => { setTodoistKey(""); setTodoistTasks([]); setTodoistProjects([]); }} style={{ padding: "5px 12px", background: "none", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--textGhost)", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>Disconnect Todoist</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ MACRO PROJECT VIEW ═══ */}
            {activeTab === "macro" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                {/* ── DASHBOARD STATS ── */}
                {(() => {
                  const activeProjects = projects.filter(p => !p.archived && p.status !== "Complete");
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  const weekFromNow = new Date(today); weekFromNow.setDate(weekFromNow.getDate() + 7);
                  const allWB = Object.entries(projectWorkback).flatMap(([pid, items]) => items.map(w => ({ ...w, _pid: pid, _pName: projects.find(p => p.id === pid)?.name || "" })));
                  const overdueWB = allWB.filter(w => w.date && w.status !== "Done" && new Date(w.date + "T23:59:59") < today);
                  const dueThisWeek = allWB.filter(w => {
                    if (!w.date || w.status === "Done") return false;
                    const d = new Date(w.date + "T12:00:00");
                    return d >= today && d <= weekFromNow;
                  });
                  const allVendors = Object.values(projectVendors).flat();
                  const totalCompItems = allVendors.length * 5;
                  const doneCompItems = allVendors.reduce((s, v) => s + (v.compliance ? Object.values(v.compliance).filter(c => c.done).length : 0), 0);
                  const compPct = totalCompItems > 0 ? Math.round((doneCompItems / totalCompItems) * 100) : 0;
                  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
                  const totalSpent = projects.reduce((s, p) => s + (p.spent || 0), 0);
                  const upcoming = projects.filter(p => {
                    if (p.archived || p.status === "Complete") return false;
                    const d = p.eventDates?.start;
                    if (!d) return false;
                    const evtDate = new Date(d + "T12:00:00");
                    return evtDate >= today && evtDate <= new Date(today.getTime() + 30 * 86400000);
                  });

                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 22 }}>
                      {/* Active Projects */}
                      <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "16px 18px" }}>
                        <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>ACTIVE PROJECTS</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", fontFamily: "'Instrument Sans'" }}>{activeProjects.length}</div>
                        <div style={{ fontSize: 10, color: "var(--textMuted)", marginTop: 4 }}>{upcoming.length} event{upcoming.length !== 1 ? "s" : ""} in next 30 days</div>
                      </div>
                      {/* Overdue Items */}
                      <div style={{ background: overdueWB.length > 0 ? "#e854540a" : "var(--bgInput)", border: `1px solid ${overdueWB.length > 0 ? "#e8545430" : "var(--borderSub)"}`, borderRadius: 10, padding: "16px 18px" }}>
                        <div style={{ fontSize: 9, color: overdueWB.length > 0 ? "#e85454" : "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>OVERDUE TASKS</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: overdueWB.length > 0 ? "#e85454" : "var(--text)", fontFamily: "'Instrument Sans'" }}>{overdueWB.length}</div>
                        <div style={{ fontSize: 10, color: "var(--textMuted)", marginTop: 4 }}>{overdueWB.length > 0 ? `across ${new Set(overdueWB.map(w => w._pid)).size} project${new Set(overdueWB.map(w => w._pid)).size !== 1 ? "s" : ""}` : "all on track ✓"}</div>
                      </div>
                      {/* Due This Week */}
                      <div style={{ background: dueThisWeek.length > 0 ? "#f5a6230a" : "var(--bgInput)", border: `1px solid ${dueThisWeek.length > 0 ? "#f5a62330" : "var(--borderSub)"}`, borderRadius: 10, padding: "16px 18px" }}>
                        <div style={{ fontSize: 9, color: dueThisWeek.length > 0 ? "#f5a623" : "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>DUE THIS WEEK</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: dueThisWeek.length > 0 ? "#f5a623" : "var(--text)", fontFamily: "'Instrument Sans'" }}>{dueThisWeek.length}</div>
                        <div style={{ fontSize: 10, color: "var(--textMuted)", marginTop: 4 }}>{dueThisWeek.length > 0 ? dueThisWeek.slice(0, 2).map(w => w.task || "untitled").join(", ") : "clear week"}</div>
                      </div>
                      {/* Vendor Compliance */}
                      <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "16px 18px" }}>
                        <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>VENDOR COMPLIANCE</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: compPct === 100 ? "#4ecb71" : compPct >= 60 ? "#f5a623" : "#e85454", fontFamily: "'Instrument Sans'" }}>{compPct}%</div>
                        <div style={{ fontSize: 10, color: "var(--textMuted)", marginTop: 4 }}>{doneCompItems}/{totalCompItems} docs collected</div>
                        <div style={{ height: 3, background: "var(--borderSub)", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${compPct}%`, background: compPct === 100 ? "#4ecb71" : compPct >= 60 ? "#f5a623" : "#e85454", borderRadius: 2, transition: "width 0.5s" }} />
                        </div>
                      </div>
                      {/* Total Budget */}
                      <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "16px 18px" }}>
                        <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>TOTAL BUDGET</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", fontFamily: "'Instrument Sans'" }}>${totalBudget > 999999 ? `${(totalBudget / 1000000).toFixed(1)}M` : totalBudget > 999 ? `${(totalBudget / 1000).toFixed(0)}K` : totalBudget.toLocaleString()}</div>
                        <div style={{ fontSize: 10, color: "var(--textMuted)", marginTop: 4 }}>${totalSpent.toLocaleString()} spent ({totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%)</div>
                        {totalBudget > 0 && <div style={{ height: 3, background: "var(--borderSub)", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.min(100, (totalSpent / totalBudget) * 100)}%`, background: (totalSpent / totalBudget) > 0.9 ? "#e85454" : (totalSpent / totalBudget) > 0.7 ? "#f5a623" : "#4ecb71", borderRadius: 2, transition: "width 0.5s" }} />
                        </div>}
                      </div>
                    </div>
                  );
                })()}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>ALL PROJECTS</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Instrument Sans'" }}>Macro Project View</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "var(--textGhost)" }}>{projects.length} projects</span>
                  </div>
                </div>
                <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--borderSub)" }}>
                  <table style={{ width: "100%", minWidth: 1600, borderCollapse: "collapse", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--borderSub)", background: "var(--bgSub)" }}>
                        {["Project", "Status", "Date(s)", "Client", "Project Type", "Location", "Producer(s)", "Manager(s)", "Services Needed", "Brief", "Project Code"].map(h => (
                          <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "var(--textFaint)", letterSpacing: 0.8, whiteSpace: "nowrap", position: "sticky", top: 0, background: "var(--bgSub)" }}>{h.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...projects].sort((a, b) => {
                        const da = a.eventDates?.start || a.engagementDates?.start || "9999";
                        const db = b.eventDates?.start || b.engagementDates?.start || "9999";
                        return da.localeCompare(db);
                      }).map(p => {
                        const sc = STATUS_COLORS[p.status] || { bg: "var(--bgCard)", text: "var(--textMuted)", dot: "var(--textFaint)" };
                        const ptc = PT_COLORS[p.projectType] || "var(--textMuted)";
                        const dateStr = (() => {
                          const s = p.eventDates?.start; const e = p.eventDates?.end;
                          if (!s) return "–";
                          const fmt2 = d => { const dt = new Date(d + "T12:00:00"); return `${dt.toLocaleDateString("en-US", { month: "short" })} ${dt.getDate()} '${dt.getFullYear().toString().slice(2)}`; };
                          return e && e !== s ? `${fmt2(s)} - ${fmt2(e)}` : fmt2(s);
                        })();
                        const projRef = (() => {
                          if (!p.code) return "–";
                          const parts = p.code.split("-");
                          return parts.length >= 4 ? parts.slice(3, -1).join("-") : "–";
                        })();
                        const locRef = (() => {
                          if (!p.code) return "–";
                          const parts = p.code.split("-");
                          return parts[parts.length - 1] || "–";
                        })();
                        return (
                          <tr key={p.id} onClick={() => { setActiveProjectId(p.id); setActiveTab("overview"); }} style={{ borderBottom: "1px solid var(--calLine)", cursor: "pointer", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgHover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: sc.bg, color: sc.text, whiteSpace: "nowrap" }}>{p.status}</span>
                            </td>
                            <td style={{ padding: "10px 12px", color: "var(--textSub)", whiteSpace: "nowrap", fontSize: 10 }}>{dateStr}</td>
                            <td style={{ padding: "10px 12px", color: "var(--textSub)", whiteSpace: "nowrap" }}>{p.client || "–"}</td>
                            <td style={{ padding: "10px 12px" }}>
                              {p.projectType ? <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: ptc + "18", color: ptc, border: `1px solid ${ptc}30`, whiteSpace: "nowrap" }}>{p.projectType}</span> : <span style={{ color: "var(--textGhost)" }}>–</span>}
                            </td>
                            <td style={{ padding: "10px 12px", color: "var(--textFaint)", whiteSpace: "nowrap", fontSize: 10 }}>{p.location || "–"}</td>
                            <td style={{ padding: "10px 12px", color: "var(--textSub)", fontSize: 10, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.producers?.length ? p.producers.join(", ") : "–"}</td>
                            <td style={{ padding: "10px 12px", color: "var(--textSub)", fontSize: 10, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.managers?.length ? p.managers.join(", ") : "–"}</td>
                            <td style={{ padding: "10px 12px" }}>
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                {(p.services || []).map((s, i) => (
                                  <span key={i} style={{ fontSize: 8, padding: "2px 6px", borderRadius: 3, background: "#3da5db15", color: "#3da5db", fontWeight: 600, whiteSpace: "nowrap", border: "1px solid #3da5db20" }}>{s}</span>
                                ))}
                                {(!p.services || p.services.length === 0) && <span style={{ color: "var(--textGhost)" }}>–</span>}
                              </div>
                            </td>
                            <td style={{ padding: "10px 12px", color: "var(--textFaint)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.why || "–"}</td>
                            <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--textGhost)", whiteSpace: "nowrap", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>{p.code || "–"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══ OVERVIEW ═══ */}
            {activeTab === "overview" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", gap: 12, marginBottom: 22 }}>
                  <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>STATUS</div>
                    <Dropdown value={project.status} options={STATUSES} onChange={v => updateProject("status", v)} colors={STATUS_COLORS} width="100%" />
                  </div>
                  <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>EVENT DATES</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><DatePicker value={project.eventDates.start} onChange={v => updateProject("eventDates", { ...project.eventDates, start: v })} /><DatePicker value={project.eventDates.end} onChange={v => updateProject("eventDates", { ...project.eventDates, end: v })} /></div>
                  </div>
                  <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>ENGAGEMENT DATES</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><DatePicker value={project.engagementDates.start} onChange={v => updateProject("engagementDates", { ...project.engagementDates, start: v })} /><DatePicker value={project.engagementDates.end} onChange={v => updateProject("engagementDates", { ...project.engagementDates, end: v })} /></div>
                  </div>
                  <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "14px 16px" }}><div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>PRODUCER(S)</div><TagInput values={project.producers} options={peopleOptions} contacts={contacts} onViewContact={viewContact} onChange={v => updateProject("producers", v)} /></div>
                  <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "14px 16px" }}><div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>MANAGER(S)</div><TagInput values={project.managers} options={peopleOptions} contacts={contacts} onViewContact={viewContact} onChange={v => updateProject("managers", v)} /></div>
                  <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "14px 16px" }}><div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>STAFF / CREW</div><TagInput values={project.staff || []} options={peopleOptions} contacts={contacts} onViewContact={viewContact} onChange={v => updateProject("staff", v)} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "18px 20px" }}>
                    <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 14 }}>PROJECT BRIEF</div>
                    {[{ q: "WHAT", key: "name" }, { q: "WHERE", key: "location" }, { q: "WHY", key: "why", multi: true }].map((f, i) => (
                      <div key={i} style={{ marginBottom: 12 }}><span style={{ fontSize: 9, color: "#ff6b4a", fontWeight: 700, letterSpacing: 0.8, marginRight: 8 }}>{f.q}</span><EditableText value={project[f.key]} onChange={v => updateProject(f.key, v)} fontSize={12} color="var(--textSub)" multiline={f.multi} /></div>
                    ))}
                    
                    {/* SERVICE NEEDS */}
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ fontSize: 9, color: "#ff6b4a", fontWeight: 700, letterSpacing: 0.8, marginRight: 8 }}>SERVICES</span>
                      <div style={{ marginTop: 4 }}>
                        <MultiDropdown values={project.services || []} options={SERVICE_OPTIONS} onChange={v => updateProject("services", v)} />
                      </div>
                    </div>

                    {/* CLIENT CONTACTS */}
                    <ContactListBlock label="CLIENT" items={project.clientContacts || []} contacts={contacts} onViewContact={viewContact} copyToClipboard={copyToClipboard} showAddress onUpdateGlobalContact={updateGlobalContact} onUpdate={v => updateProject("clientContacts", v)} onSaveToGlobal={(poc, pi) => {
                      const exists = contacts.find(c => c.name.toLowerCase() === poc.name.toLowerCase());
                      if (!exists) { const names = poc.name.split(" "); setContacts(prev => [...prev, { id: `ct_${Date.now()}`, name: poc.name, firstName: names[0] || "", lastName: names.slice(1).join(" ") || "", phone: poc.phone, email: poc.email, company: project.client, position: "Client", department: "", notes: `Client for ${project.name}`, source: "project" }]); }
                      const arr = [...(project.clientContacts || [])]; arr[pi] = { ...arr[pi], fromContacts: true }; updateProject("clientContacts", arr);
                    }} />

                    {/* POINT OF CONTACT(S) */}
                    <ContactListBlock label="POINT OF CONTACT(S)" items={project.pocs || []} contacts={contacts} onViewContact={viewContact} copyToClipboard={copyToClipboard} showAddress onUpdateGlobalContact={updateGlobalContact} onUpdate={v => updateProject("pocs", v)} onSaveToGlobal={(poc, pi) => {
                      const exists = contacts.find(c => c.name.toLowerCase() === poc.name.toLowerCase());
                      if (!exists) { const names = poc.name.split(" "); setContacts(prev => [...prev, { id: `ct_${Date.now()}`, name: poc.name, firstName: names[0] || "", lastName: names.slice(1).join(" ") || "", phone: poc.phone, email: poc.email, company: project.client, position: "", department: "", notes: `POC for ${project.name}`, source: "project" }]); }
                      const arr = [...(project.pocs || [])]; arr[pi] = { ...arr[pi], fromContacts: true }; updateProject("pocs", arr);
                    }} />

                    {/* BILLING CONTACT */}
                    <ContactListBlock label="BILLING CONTACT" items={project.billingContacts || []} contacts={contacts} onViewContact={viewContact} copyToClipboard={copyToClipboard} showAddress onUpdateGlobalContact={updateGlobalContact} onUpdate={v => updateProject("billingContacts", v)} onSaveToGlobal={(poc, pi) => {
                      const exists = contacts.find(c => c.name.toLowerCase() === poc.name.toLowerCase());
                      if (!exists) { const names = poc.name.split(" "); setContacts(prev => [...prev, { id: `ct_${Date.now()}`, name: poc.name, firstName: names[0] || "", lastName: names.slice(1).join(" ") || "", phone: poc.phone, email: poc.email, company: project.client, position: "Billing", department: "Finance", notes: `Billing for ${project.name}`, source: "project" }]); }
                      const arr = [...(project.billingContacts || [])]; arr[pi] = { ...arr[pi], fromContacts: true }; updateProject("billingContacts", arr);
                    }} />
                  </div>
                  <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "18px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1 }}>BUDGET SNAPSHOT</div><a href="https://app.saturation.io/weareadptv" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#ff6b4a", textDecoration: "none", fontWeight: 600 }}>Open in Saturation →</a></div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                      <div><div style={{ fontSize: 9, color: "var(--textFaint)", marginBottom: 4 }}>ESTIMATED</div>
                        <EditableBudget value={project.budget} onSave={v => updateProject("budget", v)} />
                      </div>
                      <div style={{ textAlign: "right" }}><div style={{ fontSize: 9, color: "var(--textFaint)", marginBottom: 4 }}>SPENT</div><div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#4ecb71" }}>{fmt(project.spent)}</div></div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><ProgressBar pct={pctSpent} h={6} /><span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "var(--textMuted)" }}>{Math.round(pctSpent)}%</span></div>
                    <div style={{ fontSize: 12, color: "var(--textFaint)" }}>Remaining: <span style={{ color: "#dba94e", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(project.budget - project.spent)}</span></div>
                  </div>
                </div>

                {/* ── PROJECT NOTES / UPDATES ── */}
                <div style={{ marginTop: 22 }}>
                  <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "18px 20px" }}>
                    <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 10 }}>PROJECT NOTES & UPDATES</div>
                    <RichTextEditor
                      content={project.notes || ""}
                      onChange={val => updateProject("notes", val)}
                      placeholder={"Write updates, tag team members with @name, add formatting, links, lists..."}
                    />
                    {project.notes && (() => {
                      const plainText = project.notes.replace(/<[^>]*>/g, " ");
                      const mentions = [...new Set((plainText.match(/@[\w]+(?:\s[\w]+)?/g) || []).map(m => m.slice(1)))];
                      if (mentions.length === 0) return null;
                      return <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {mentions.map(m => <span key={m} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#9b6dff15", color: "#9b6dff", fontWeight: 600 }}>@{m}</span>)}
                      </div>;
                    })()}
                  </div>
                </div>

                {/* ── TOUR / SERIES SCHEDULE ── */}
                {project.isTour && project.subEvents && (
                  <div style={{ marginTop: 22 }}>
                    <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "18px 20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1 }}>TOUR SCHEDULE</div>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#ff6b4a15", color: "#ff6b4a", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{project.subEvents.length} DATES</span>
                          {(() => {
                            const confirmed = project.subEvents.filter(s => s.status === "Confirmed" || s.status === "On Sale").length;
                            const complete = project.subEvents.filter(s => s.status === "Complete").length;
                            const holds = project.subEvents.filter(s => s.status === "Hold").length;
                            const advancing = project.subEvents.filter(s => s.status === "Advancing").length;
                            return (
                              <div style={{ display: "flex", gap: 8, fontSize: 9, color: "var(--textFaint)" }}>
                                <span><span style={{ color: "#4ecb71" }}>●</span> {confirmed} confirmed</span>
                                <span><span style={{ color: "#3da5db" }}>●</span> {advancing} advancing</span>
                                <span><span style={{ color: "#9b6dff" }}>●</span> {holds} holds</span>
                                <span><span style={{ color: "#c46832" }}>●</span> {complete} complete</span>
                              </div>
                            );
                          })()}
                        </div>
                        <button onClick={() => {
                          const newSE = { id: `se_${Date.now()}`, date: "", city: "", venue: "", status: "Hold", notes: "" };
                          updateProject("subEvents", [...project.subEvents, newSE]);
                        }} style={{ padding: "6px 14px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 7, color: "#ff6b4a", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>+ Add Date</button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "90px 1.2fr 1.8fr 110px 1fr 30px", padding: "8px 12px", borderBottom: "1px solid var(--borderSub)", fontSize: 8, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1 }}>
                        <span>DATE</span><span>CITY</span><span>VENUE</span><span>STATUS</span><span>NOTES</span><span></span>
                      </div>

                      <div style={{ maxHeight: 520, overflowY: "auto" }}>
                        {[...project.subEvents].sort((a, b) => (a.date || "9999") < (b.date || "9999") ? -1 : 1).map((se) => {
                          const sec = SUB_EVENT_STATUS_COLORS[se.status] || SUB_EVENT_STATUS_COLORS["Hold"];
                          const todayISO = new Date().toISOString().split("T")[0];
                          const isPast = se.date && se.date < todayISO;
                          const weekOut = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
                          const isUpcoming = se.date && !isPast && se.date <= weekOut;
                          return (
                            <div key={se.id} style={{ display: "grid", gridTemplateColumns: "90px 1.2fr 1.8fr 110px 1fr 30px", padding: "7px 12px", borderBottom: "1px solid var(--calLine)", alignItems: "center", background: isUpcoming ? "#ff6b4a08" : isPast ? "var(--bgInput)" : "transparent", opacity: se.status === "Cancelled" ? 0.4 : isPast && se.status !== "Complete" ? 0.65 : 1 }}>
                              <input type="date" value={se.date || ""} onChange={e => {
                                updateProject("subEvents", project.subEvents.map(s => s.id === se.id ? { ...s, date: e.target.value } : s));
                              }} style={{ padding: "4px 6px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, color: isUpcoming ? "#ff6b4a" : "var(--textSub)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", outline: "none", colorScheme: "var(--filterScheme)" }} />
                              <EditableText value={se.city} onChange={v => {
                                updateProject("subEvents", project.subEvents.map(s => s.id === se.id ? { ...s, city: v } : s));
                              }} fontSize={11} color="var(--textSub)" placeholder="City, ST" />
                              <EditableText value={se.venue} onChange={v => {
                                updateProject("subEvents", project.subEvents.map(s => s.id === se.id ? { ...s, venue: v } : s));
                              }} fontSize={12} color="var(--text)" fontWeight={600} placeholder="Venue name" />
                              <select value={se.status} onChange={e => {
                                updateProject("subEvents", project.subEvents.map(s => s.id === se.id ? { ...s, status: e.target.value } : s));
                              }} style={{ padding: "4px 6px", background: sec.bg, border: `1px solid ${sec.dot}30`, borderRadius: 5, color: sec.text, fontSize: 10, fontWeight: 600, outline: "none", cursor: "pointer", width: "100%" }}>
                                {SUB_EVENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <EditableText value={se.notes} onChange={v => {
                                updateProject("subEvents", project.subEvents.map(s => s.id === se.id ? { ...s, notes: v } : s));
                              }} fontSize={10} color="var(--textMuted)" placeholder="Notes..." />
                              <button onClick={() => {
                                updateProject("subEvents", project.subEvents.filter(s => s.id !== se.id));
                              }} style={{ background: "none", border: "none", color: "var(--textGhost)", cursor: "pointer", fontSize: 14 }}>×</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ BUDGET ═══ */}
            {activeTab === "budget" && <div style={{ animation: "fadeUp 0.3s ease", textAlign: "center", padding: 60 }}><div style={{ fontSize: 40, marginBottom: 16 }}>📊</div><div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Saturation Budget Integration</div><div style={{ fontSize: 13, color: "var(--textFaint)", marginBottom: 20 }}>This tab pulls directly from Saturation. Role-based access coming.</div><a href="https://app.saturation.io/weareadptv" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", padding: "10px 20px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 8, color: "#ff6b4a", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>Open in Saturation →</a></div>}

            {/* ═══ WORK BACK ═══ */}
            {activeTab === "workback" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div><div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>PRE-PRODUCTION WORK BACK</div><div style={{ fontSize: 13, color: "var(--textMuted)" }}>Engagement: <span style={{ color: "var(--text)" }}>{fmtShort(project.engagementDates.start)}</span> → Event: <span style={{ color: "#ff6b4a" }}>{fmtShort(project.eventDates.start)}</span> → End: <span style={{ color: "var(--text)" }}>{fmtShort(project.engagementDates.end)}</span></div></div>
                  <button onClick={addWBRow} style={{ padding: "7px 14px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 7, color: "#ff6b4a", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>+ Add Row</button>
                </div>
                <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "100px 2fr 1.2fr 1fr 1fr 36px", padding: "10px 16px", borderBottom: "1px solid var(--borderSub)", fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1 }}><span>DATE</span><span>TASK</span><span>DEPARTMENT(S)</span><span>RESPONSIBLE</span><span>STATUS</span><span></span></div>
                  {workback.map((wb, i) => {
                    // Deadline color-coding
                    const wbDeadlineStyle = (() => {
                      if (!wb.date || wb.status === "Done") return { borderLeft: wb.isEvent ? "3px solid #ff6b4a40" : "3px solid transparent", bg: wb.isEvent ? "#ff6b4a0a" : "transparent" };
                      const today = new Date(); today.setHours(0, 0, 0, 0);
                      const dueDate = new Date(wb.date + "T23:59:59");
                      const daysUntil = Math.ceil((dueDate - today) / 86400000);
                      if (daysUntil < 0) return { borderLeft: "3px solid #e85454", bg: "#e854540a" }; // overdue - red
                      if (daysUntil <= 7) return { borderLeft: "3px solid #f5a623", bg: "#f5a6230a" }; // due this week - yellow
                      return { borderLeft: wb.isEvent ? "3px solid #ff6b4a40" : "3px solid #4ecb7130", bg: wb.isEvent ? "#ff6b4a0a" : "transparent" }; // on track - green accent
                    })();
                    const overdueLabel = (() => {
                      if (!wb.date || wb.status === "Done") return null;
                      const today = new Date(); today.setHours(0, 0, 0, 0);
                      const dueDate = new Date(wb.date + "T23:59:59");
                      const daysUntil = Math.ceil((dueDate - today) / 86400000);
                      if (daysUntil < 0) return { text: `${Math.abs(daysUntil)}d overdue`, color: "#e85454" };
                      if (daysUntil === 0) return { text: "due today", color: "#f5a623" };
                      if (daysUntil <= 7) return { text: `${daysUntil}d left`, color: "#f5a623" };
                      return null;
                    })();
                    return (
                    <div key={wb.id} style={{ display: "grid", gridTemplateColumns: "100px 2fr 1.2fr 1fr 1fr 36px", padding: "8px 16px", borderBottom: "1px solid var(--calLine)", alignItems: "center", background: wbDeadlineStyle.bg, borderLeft: wbDeadlineStyle.borderLeft }}>
                      <div style={{ position: "relative" }}>
                        <DatePicker value={wb.date} onChange={v => updateWB(wb.id, "date", v)} />
                        {overdueLabel && <div style={{ fontSize: 8, fontWeight: 700, color: overdueLabel.color, marginTop: 2 }}>{overdueLabel.text}</div>}
                      </div>
                      <EditableText value={wb.task} onChange={v => updateWB(wb.id, "task", v)} fontSize={12} color={wb.isEvent ? "#ff6b4a" : "var(--text)"} fontWeight={wb.isEvent ? 700 : 500} placeholder="Task name..." />
                      <MultiDropdown values={wb.depts} options={DEPT_OPTIONS} onChange={v => updateWB(wb.id, "depts", v)} colorMap={DEPT_COLORS} />
                      <Dropdown value={wb.owner} options={eventContactNames} onChange={v => updateWB(wb.id, "owner", v)} width="100%" allowBlank blankLabel="—" />
                      <Dropdown value={wb.status} options={WB_STATUSES} onChange={v => updateWB(wb.id, "status", v)} colors={Object.fromEntries(WB_STATUSES.map(s => [s, { bg: WB_STATUS_STYLES[s].bg, text: WB_STATUS_STYLES[s].text, dot: WB_STATUS_STYLES[s].text }]))} width="100%" />
                      <button onClick={() => setWorkback(p => p.filter(w => w.id !== wb.id))} style={{ background: "none", border: "none", color: "var(--textGhost)", cursor: "pointer", fontSize: 14 }}>×</button>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══ RUN OF SHOW ═══ */}
            {activeTab === "ros" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
                  <button onClick={() => { const nextDay = days.length > 0 ? Math.max(...days) + 1 : 1; addROSRow(nextDay); }} style={{ padding: "7px 16px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 7, color: "#ff6b4a", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13 }}>+</span> Add Day
                  </button>
                  <button onClick={() => setShowPrintROS(true)} style={{ padding: "7px 16px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--textSub)", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>📄</span> Export PDF
                  </button>
                </div>
                {days.map(day => {
                  const dayDate = ros.find(r => r.day === day)?.dayDate || "";
                  const setDayDate = (newDate) => setROS(prev => prev.map(r => r.day === day ? { ...r, dayDate: newDate } : r));
                  return (
                  <div key={day} style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "10px 16px", background: "linear-gradient(90deg, #ff6b4a10, transparent)", borderLeft: "3px solid #ff6b4a", borderRadius: "0 8px 8px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#ff6b4a", fontFamily: "'Instrument Sans'" }}>Day {day}</span>
                        <input type="date" value={dayDate} onChange={e => setDayDate(e.target.value)} style={{ padding: "4px 8px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, color: dayDate ? "var(--text)" : "var(--textGhost)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", outline: "none", colorScheme: "var(--filterScheme)" }} />
                        {dayDate && <span style={{ fontSize: 11, color: "var(--textMuted)" }}>{new Date(dayDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>}
                      </div>
                      <button onClick={() => addROSRow(day)} style={{ padding: "5px 12px", background: "#ff6b4a10", border: "1px solid #ff6b4a25", borderRadius: 6, color: "#ff6b4a", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>+ Add Row</button>
                    </div>
                    <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "65px 1.6fr 0.7fr 1fr 0.9fr 0.7fr 0.7fr 1fr 30px", padding: "8px 12px", borderBottom: "1px solid var(--borderSub)", fontSize: 8, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1 }}><span>TIME</span><span>ITEM</span><span>DEPT</span><span>VENDORS</span><span>LOCATION</span><span>CONTACT</span><span>OWNER</span><span>NOTES</span><span></span></div>
                      {ros.filter(r => r.day === day).map(entry => {
                        const isS = entry.item.includes("🎬"); const isW = entry.item.includes("WRAP") || entry.item.includes("LUNCH");
                        return (
                          <div key={entry.id} style={{ display: "grid", gridTemplateColumns: "65px 1.6fr 0.7fr 1fr 0.9fr 0.7fr 0.7fr 1fr 30px", padding: "6px 12px", borderBottom: "1px solid var(--calLine)", alignItems: "center", background: isS ? "var(--bgCard)" : isW ? "var(--bgInput)" : "transparent" }}>
                            <EditableText value={entry.time} onChange={v => updateROS(entry.id, "time", v)} fontSize={10} color={isS ? "#ff6b4a" : "var(--textMuted)"} placeholder="Time" />
                            <EditableText value={entry.item} onChange={v => updateROS(entry.id, "item", v)} fontSize={11} color={isS ? "#ff6b4a" : "var(--textSub)"} fontWeight={isS ? 700 : 500} placeholder="Item..." />
                            <Dropdown value={entry.dept} options={DEPT_OPTIONS} onChange={v => updateROS(entry.id, "dept", v)} width="100%" allowBlank blankLabel="—" />
                            <MultiDropdown values={entry.vendors} options={vendors.map(v => v.id)} onChange={v => updateROS(entry.id, "vendors", v)} colorMap={Object.fromEntries(vendors.map(v => [v.id, DEPT_COLORS[v.deptId] || "var(--textMuted)"]))} renderLabel={id => { const v = vendors.find(x => x.id === id); return v ? v.name.split(" ")[0] : id; }} />
                            <EditableText value={entry.location} onChange={v => updateROS(entry.id, "location", v)} fontSize={10} color="var(--textMuted)" placeholder="Location" />
                            <Dropdown value={entry.contact} options={eventContactNames} onChange={v => updateROS(entry.id, "contact", v)} width="100%" allowBlank blankLabel="—" />
                            <Dropdown value={entry.owner} options={eventContactNames} onChange={v => updateROS(entry.id, "owner", v)} width="100%" allowBlank blankLabel="—" />
                            <EditableText value={entry.note} onChange={v => updateROS(entry.id, "note", v)} fontSize={10} color="var(--textFaint)" placeholder="Notes..." />
                            <button onClick={() => setROS(p => p.filter(r => r.id !== entry.id))} style={{ background: "none", border: "none", color: "var(--textGhost)", cursor: "pointer", fontSize: 12 }}>×</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            {/* ═══ DRIVE ═══ */}
            {activeTab === "drive" && <div style={{ animation: "fadeUp 0.3s ease", textAlign: "center", padding: 60 }}><div style={{ fontSize: 40, marginBottom: 16 }}>📁</div><div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Google Drive Integration</div><div style={{ fontSize: 13, color: "var(--textFaint)" }}>Will connect to your Drive once API is set up.</div></div>}

            {/* ═══ VENDORS (v3 style with drop zones) ═══ */}
            {activeTab === "vendors" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                {uploadLog.length > 0 && (
                  <div style={{ marginBottom: 16, background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "12px 16px" }}>
                    <div style={{ fontSize: 9, color: "#4ecb71", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>RECENT UPLOADS</div>
                    {uploadLog.slice(0, 5).map(log => (
                      <div key={log.id} style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 10, color: "#4ecb71" }}>✓</span>
                          <span style={{ fontSize: 11, color: "var(--textSub)" }}><strong style={{ color: "var(--text)" }}>{log.fileName}</strong> → {log.vendorName} / {log.compKey.toUpperCase()}</span>
                          <span style={{ fontSize: 9, color: "var(--textGhost)", fontFamily: "'JetBrains Mono', monospace", marginLeft: "auto" }}>{log.time}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 18 }}>
                          <span style={{ fontSize: 8, color: "var(--textGhost)", fontFamily: "'JetBrains Mono', monospace" }}>📁 {log.drivePath.split("/").slice(-3).join("/")}</span>
                          {log.folderCreated && <span style={{ fontSize: 7, padding: "1px 4px", borderRadius: 3, background: "#dba94e15", color: "#dba94e", fontWeight: 700, border: "1px solid #dba94e25" }}>FOLDER CREATED</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* W9 Drop-to-Scrape Zone */}
                <div
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#9b6dff"; e.currentTarget.style.background = "#9b6dff10"; }}
                  onDragLeave={e => { e.currentTarget.style.borderColor = "var(--borderSub)"; e.currentTarget.style.background = "var(--bgInput)"; }}
                  onDrop={e => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = "var(--borderSub)";
                    e.currentTarget.style.background = "var(--bgInput)";
                    const file = e.dataTransfer.files[0];
                    handleW9Upload(file);
                  }}
                  style={{ marginBottom: 16, border: "2px dashed var(--borderSub)", borderRadius: 12, padding: "16px 24px", background: "var(--bgInput)", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 16 }}
                  onClick={() => document.getElementById("w9-file-input")?.click()}
                >
                  <input id="w9-file-input" type="file" accept=".pdf,.jpg,.png" style={{ display: "none" }} onChange={e => {
                    handleW9Upload(e.target.files[0]);
                    e.target.value = '';
                  }} />
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: w9Scanning ? "#9b6dff20" : "var(--bgCard)", border: `1px solid ${w9Scanning ? "#9b6dff40" : "var(--borderSub)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {w9Scanning ? <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> : "📋"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: w9Scanning ? "#9b6dff" : "var(--textSub)", marginBottom: 2 }}>
                      {w9Scanning ? "Scanning W9 — extracting vendor info..." : "Drop a W9 here to auto-create a vendor"}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--textFaint)" }}>
                      {w9Scanning ? "Parsing name, EIN, address, business type..." : "Drag PDF or image — we'll extract name, company, EIN and pre-fill the form"}
                    </div>
                  </div>
                  {!w9Scanning && <span style={{ fontSize: 11, color: "var(--textGhost)", fontWeight: 600, padding: "5px 12px", border: "1px solid var(--borderSub)", borderRadius: 6 }}>Browse</span>}
                </div>

                {/* Google Drive Vendor Search */}
                <div style={{ marginBottom: 16, position: "relative" }}>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--textFaint)" }}>🔍</span>
                    <input
                      value={vendorSearch}
                      onChange={e => handleVendorSearchChange(e.target.value)}
                      placeholder="Start typing to search Google Drive for vendors..."
                      style={{ width: "100%", padding: "10px 12px 10px 36px", background: "var(--bgInput)", border: `1px solid ${vendorSearch ? "#dba94e30" : "var(--borderSub)"}`, borderRadius: driveResults && driveResults.length > 0 ? "8px 8px 0 0" : 8, color: "var(--text)", fontSize: 12, fontFamily: "'DM Sans'", outline: "none", transition: "border-color 0.2s" }}
                    />
                    {vendorSearching && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#dba94e", animation: "glow 1s ease infinite" }}>Searching Drive...</span>}
                    {vendorSearch && !vendorSearching && <button onClick={() => { setVendorSearch(""); setDriveResults(null); }} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--textFaint)", cursor: "pointer", fontSize: 14, padding: "2px 4px" }}>✕</button>}
                  </div>

                  {/* Live results dropdown */}
                  {driveResults && driveResults.length > 0 && (
                    <div style={{ background: "var(--bgInput)", border: "1px solid #dba94e25", borderTop: "none", borderRadius: "0 0 10px 10px", maxHeight: 320, overflowY: "auto", animation: "fadeUp 0.15s ease" }}>
                      <div style={{ padding: "6px 12px", borderBottom: "1px solid var(--borderSub)" }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#dba94e", letterSpacing: 0.5 }}>GOOGLE DRIVE — {driveResults.length} result{driveResults.length !== 1 ? "s" : ""}</span>
                      </div>
                      {driveResults.map((dv, di) => {
                        const docKeys = ["coi", "w9", "banking", "contract", "invoice"];
                        const found = docKeys.filter(k => dv.drive[k]?.found).length;
                        const alreadyAdded = vendors.some(v => v.name.toLowerCase() === dv.name.toLowerCase());
                        return (
                          <div key={di} style={{ padding: "10px 12px", borderBottom: di < driveResults.length - 1 ? "1px solid var(--borderSub)" : "none", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgHover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{dv.name}</span>
                                <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: "#dba94e15", color: "#dba94e", border: "1px solid #dba94e25", fontWeight: 600 }}>{dv.fileCount || 0} file{dv.fileCount !== 1 ? "s" : ""}</span>
                                {alreadyAdded && <span style={{ fontSize: 7, padding: "1px 5px", borderRadius: 3, background: "#4ecb7115", color: "#4ecb71", fontWeight: 700 }}>ADDED</span>}
                              </div>
                              {dv.files && dv.files.length > 0 && (
                                <div style={{ fontSize: 10, color: "var(--textMuted)", marginBottom: 4 }}>
                                  {dv.files.slice(0, 3).map(f => f.name).join(", ")}{dv.files.length > 3 ? ` +${dv.files.length - 3} more` : ""}
                                </div>
                              )}
                              <div style={{ display: "flex", gap: 4 }}>
                                {docKeys.map(k => (
                                  <span key={k} title={dv.drive[k]?.found ? `Found: ${dv.drive[k].file}` : `Not found in Drive`} style={{ fontSize: 7, fontWeight: 700, padding: "1px 4px", borderRadius: 2, background: dv.drive[k]?.found ? "#4ecb7110" : "transparent", color: dv.drive[k]?.found ? "#4ecb71" : "var(--borderActive)" }}>
                                    {dv.drive[k]?.found ? "✓" : "·"} {k.toUpperCase()}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); importFromDrive(dv); }} disabled={alreadyAdded} style={{ padding: "6px 12px", background: alreadyAdded ? "var(--bgCard)" : "#dba94e15", border: `1px solid ${alreadyAdded ? "var(--borderSub)" : "#dba94e30"}`, borderRadius: 6, color: alreadyAdded ? "var(--textGhost)" : "#dba94e", cursor: alreadyAdded ? "default" : "pointer", fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>
                              {alreadyAdded ? "Added" : `Import`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {driveResults && driveResults.length === 0 && vendorSearch.trim() && !driveError && (
                    <div style={{ background: "var(--bgInput)", border: "1px solid #dba94e25", borderTop: "none", borderRadius: "0 0 10px 10px", padding: "12px 16px", textAlign: "center", color: "#4a5a6a", fontSize: 11 }}>
                      No vendors found matching "{vendorSearch}" — try a different name or <span onClick={() => { setVendorForm({ ...emptyVendorForm, company: vendorSearch }); setShowAddVendor(true); setDriveResults(null); setVendorSearch(""); }} style={{ color: "#ff6b4a", cursor: "pointer", textDecoration: "underline" }}>add manually</span>
                    </div>
                  )}
                  {driveError && vendorSearch.trim() && (
                    <div style={{ background: "var(--bgInput)", border: "1px solid #ff4a4a25", borderTop: "none", borderRadius: "0 0 10px 10px", padding: "12px 16px", textAlign: "center", color: "#ff6b4a", fontSize: 11 }}>
                      ⚠️ Drive connection issue: {driveError} — <span onClick={() => { setDriveError(null); setDriveVendorCache(null); handleVendorSearchChange(vendorSearch); }} style={{ cursor: "pointer", textDecoration: "underline" }}>retry</span> or <span onClick={() => { setVendorForm({ ...emptyVendorForm, company: vendorSearch }); setShowAddVendor(true); setDriveResults(null); setVendorSearch(""); setDriveError(null); }} style={{ cursor: "pointer", textDecoration: "underline" }}>add manually</span>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{vendors.length} Contractors / Vendors</span>
                    {vendors.length > 0 && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><ProgressBar pct={compTotal > 0 ? (compDone / compTotal) * 100 : 0} h={6} /><span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "var(--textMuted)", minWidth: 48 }}>{compDone}/{compTotal}</span></div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Multi-select controls */}
                    {vendors.length > 0 && (
                      <button onClick={() => {
                        if (selectedVendorIds.size === vendors.length) setSelectedVendorIds(new Set());
                        else setSelectedVendorIds(new Set(vendors.map(v => v.id)));
                      }} style={{ padding: "6px 12px", background: selectedVendorIds.size > 0 ? "#3da5db10" : "var(--bgCard)", border: `1px solid ${selectedVendorIds.size > 0 ? "#3da5db30" : "var(--borderSub)"}`, borderRadius: 6, color: selectedVendorIds.size > 0 ? "#3da5db" : "var(--textFaint)", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>
                        {selectedVendorIds.size === vendors.length ? "Deselect All" : selectedVendorIds.size > 0 ? `${selectedVendorIds.size} Selected` : "Select"}
                      </button>
                    )}
                    {selectedVendorIds.size > 0 && (
                      <button onClick={() => {
                        if (confirm(`Delete ${selectedVendorIds.size} vendor${selectedVendorIds.size > 1 ? "s" : ""}? This cannot be undone.`)) {
                          setVendors(prev => prev.filter(v => !selectedVendorIds.has(v.id)));
                          setSelectedVendorIds(new Set());
                        }
                      }} style={{ padding: "6px 12px", background: "#e8545415", border: "1px solid #e8545430", borderRadius: 6, color: "#e85454", cursor: "pointer", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        🗑 Delete {selectedVendorIds.size}
                      </button>
                    )}
                    <button onClick={() => { setVendorForm({ ...emptyVendorForm }); setShowAddVendor(true); }} style={{ padding: "7px 16px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 7, color: "#ff6b4a", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14 }}>+</span> Add Vendor
                    </button>
                    <button onClick={() => {
                      const link = `${window.location.origin}/vendor-intake?project=${encodeURIComponent(project.name || "Adaptive")}&token=${Math.random().toString(36).substr(2, 12)}`;
                      navigator.clipboard.writeText(link).then(() => { setVendorLinkCopied(true); setTimeout(() => setVendorLinkCopied(false), 2500); });
                    }} style={{ padding: "7px 16px", background: vendorLinkCopied ? "#4ecb7115" : "#3da5db15", border: `1px solid ${vendorLinkCopied ? "#4ecb7130" : "#3da5db30"}`, borderRadius: 7, color: vendorLinkCopied ? "#4ecb71" : "#3da5db", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}>
                      <span style={{ fontSize: 13 }}>{vendorLinkCopied ? "✓" : "🔗"}</span> {vendorLinkCopied ? "Link Copied!" : "Vendor Intake Link"}
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  {vendors.length === 0 && (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--textFaint)", fontSize: 13 }}>
                      <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>⊕</div>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>No vendors for this project yet</div>
                      <div style={{ fontSize: 11, color: "var(--textGhost)" }}>Search Google Drive above or click "+ Add Vendor" to get started</div>
                    </div>
                  )}
                  {vendors.map((v, vi) => {
                    const done = Object.values(v.compliance).filter(c => c.done).length;
                    const isExp = expandedVendor === v.id;
                    const isSelected = selectedVendorIds.has(v.id);
                    return (
                      <div key={v.id} style={{ background: "var(--bgInput)", border: isSelected ? "1px solid #3da5db40" : "1px solid var(--borderSub)", borderRadius: 12, overflow: "hidden", animation: `fadeUp 0.25s ease ${vi * 0.04}s both`, transition: "border-color 0.15s" }}>
                        <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", gap: 12 }}>
                          {/* Checkbox */}
                          <div onClick={(e) => { e.stopPropagation(); setSelectedVendorIds(prev => { const next = new Set(prev); if (next.has(v.id)) next.delete(v.id); else next.add(v.id); return next; }); }}
                            style={{ width: 20, height: 20, borderRadius: 4, border: `1.5px solid ${isSelected ? "#3da5db" : "var(--borderActive)"}`, background: isSelected ? "#3da5db" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s", flexShrink: 0 }}>
                            {isSelected && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 15, fontWeight: 700 }}>{v.name}</span>
                              <SyncBadge source={v.source} />
                              <DeptTag dept={v.deptId} small />
                              {done === 5 && <span style={{ fontSize: 8, padding: "1px 6px", borderRadius: 3, background: "var(--bgCard)", color: "#4ecb71", fontWeight: 700, border: "1px solid var(--borderSub)" }}>COMPLETE</span>}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--textFaint)" }}>{v.type} · {v.email}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            {COMP_KEYS.map(ck => (
                              <div key={ck.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                <span style={{ fontSize: 8, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 0.5 }}>{ck.label}</span>
                                <DocDropZone vendor={v} compKey={ck} compInfo={v.compliance[ck.key]} onFileDrop={handleFileDrop} onPreview={setDocPreview} onClear={handleClearCompliance} />
                              </div>
                            ))}
                          </div>
                          <div style={{ textAlign: "center", minWidth: 40 }}><div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: done === 5 ? "#4ecb71" : done >= 3 ? "#dba94e" : "#e85454" }}>{done}/5</div></div>
                          <button onClick={() => setExpandedVendor(isExp ? null : v.id)} style={{ background: "none", border: "none", color: "var(--textFaint)", cursor: "pointer", fontSize: 12, padding: "4px 8px", transform: isExp ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.15s" }}>▶</button>
                        </div>
                        {isExp && (
                          <div style={{ padding: "0 18px 16px", borderTop: "1px solid var(--border)", animation: "fadeUp 0.2s ease" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginTop: 14 }}>
                              {COMP_KEYS.map(ck => {
                                const info = v.compliance[ck.key];
                                const dp = `${ck.drivePrefix}/${v.name.replace(/[^a-zA-Z0-9 &'-]/g, '').trim()}/`;
                                return (
                                  <div key={ck.key} style={{ background: info.done ? "#4ecb7108" : "#e8545408", border: `1px solid ${info.done ? "#4ecb7130" : "#e8545420"}`, borderRadius: 8, padding: 12, transition: "border-color 0.2s" }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: info.done ? "#4ecb71" : "#e85454", letterSpacing: 0.5, marginBottom: 6 }}>{ck.fullLabel}</div>
                                    {info.done ? <>
                                      <div style={{ fontSize: 11, color: "var(--textSub)", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}><span>📄</span> {info.file || "Received"}</div>
                                      <div style={{ fontSize: 9, color: "var(--textFaint)", marginBottom: 6 }}>Uploaded {info.date}</div>
                                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                        <button onClick={(e) => { e.stopPropagation(); const url = info.link || `https://drive.google.com/drive/search?q=${encodeURIComponent(info.file || ck.fullLabel)}`; window.open(url, '_blank'); }} style={{ padding: "3px 7px", background: "#3da5db10", border: "1px solid #3da5db25", borderRadius: 4, color: "#3da5db", cursor: "pointer", fontSize: 8, fontWeight: 600 }}>📂 Open</button>
                                        <button onClick={(e) => { e.stopPropagation(); const input = document.createElement("input"); input.type = "file"; input.accept = ".pdf,.doc,.docx,.jpg,.png,.xlsx"; input.onchange = (ev) => { const f = ev.target.files[0]; if (f) handleFileDrop(v.id, ck.key, f, dp, ck.drivePrefix); }; input.click(); }} style={{ padding: "3px 7px", background: "#dba94e10", border: "1px solid #dba94e25", borderRadius: 4, color: "#dba94e", cursor: "pointer", fontSize: 8, fontWeight: 600 }}>🔄 Replace</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleClearCompliance(v.id, ck.key); }} style={{ padding: "3px 7px", background: "#e8545410", border: "1px solid #e8545425", borderRadius: 4, color: "#e85454", cursor: "pointer", fontSize: 8, fontWeight: 600 }}>✕ Clear</button>
                                      </div>
                                    </> : <div style={{ fontSize: 11, color: "#6a4a4a" }}>Not received — drop above</div>}
                                    <div style={{ fontSize: 8, color: "var(--textGhost)", fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>📁 .../{dp.split("/").slice(-3).join("/")}</div>
                                  </div>
                                );
                              })}
                            </div>
                            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--textFaint)" }}>
                                <span onClick={(e) => { e.stopPropagation(); copyToClipboard(v.phone || v.contact, "Phone", e); }} style={{ cursor: "pointer", borderRadius: 4, padding: "2px 6px", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgCard)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>📞 {v.contact}{v.phone ? ` · ${v.phone}` : ""} <span style={{ fontSize: 8, color: "var(--textGhost)", marginLeft: 2 }}>⧉</span></span>
                                <span onClick={(e) => { e.stopPropagation(); copyToClipboard(v.email, "Email", e); }} style={{ cursor: "pointer", borderRadius: 4, padding: "2px 6px", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgCard)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>📧 {v.email} <span style={{ fontSize: 8, color: "var(--textGhost)", marginLeft: 2 }}>⧉</span></span>
                                {v.title && <span>💼 {v.title}</span>}
                              </div>
                              <button onClick={() => { if (confirm(`Remove ${v.name}?`)) setVendors(prev => prev.filter(x => x.id !== v.id)); }} style={{ padding: "4px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "#e85454", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>Remove</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══ CONTACTS ═══ */}
            {activeTab === "contacts" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                {(() => {
                  const PROJECT_ROLES = ["Producer", "Manager", "Staff / Crew", "Client", "Point of Contact", "Billing", "Talent", "Artist", "Agent", "Venue Rep"];
                  const ROLE_COLORS = { Producer: "#ff6b4a", Manager: "#ff6b4a", "Staff / Crew": "#ff6b4a", Client: "#3da5db", "Point of Contact": "#9b6dff", Billing: "#4ecb71", Talent: "#e85494", Artist: "#e85494", Agent: "#dba94e", "Venue Rep": "#4ecbe8" };

                  const teamPeople = [...project.producers.map(n => ({ name: n, role: "Producer", source: "producers" })), ...project.managers.map(n => ({ name: n, role: "Manager", source: "managers" })), ...(project.staff || []).map(n => ({ name: n, role: "Staff / Crew", source: "staff" }))];
                  const clientPeople = (project.clientContacts || []).filter(p => p.name).map(p => ({ ...p, role: p.role || "Client", source: "clientContacts", dept: p.dept || "" }));
                  const pocPeople = (project.pocs || []).filter(p => p.name).map(p => ({ ...p, role: p.role || "Point of Contact", source: "pocs", dept: p.dept || "" }));
                  const billingPeople = (project.billingContacts || []).filter(p => p.name).map(p => ({ ...p, role: p.role || "Billing", source: "billingContacts", dept: p.dept || "" }));
                  const allProjectPeople = [...teamPeople, ...clientPeople, ...pocPeople, ...billingPeople];
                  const filtered = contactSearch ? allProjectPeople.filter(p => p.name.toLowerCase().includes(contactSearch.toLowerCase()) || p.role.toLowerCase().includes(contactSearch.toLowerCase()) || (p.dept || "").toLowerCase().includes(contactSearch.toLowerCase())) : allProjectPeople;

                  const addPersonToProject = (contact, role, dept) => {
                    const entry = { name: contact.name || contact, phone: contact.phone || "", email: contact.email || "", address: "", dept: dept || "", role: role, fromContacts: !!contact.id };
                    if (role === "Producer") updateProject("producers", [...project.producers, entry.name]);
                    else if (role === "Manager") updateProject("managers", [...project.managers, entry.name]);
                    else if (role === "Staff / Crew") updateProject("staff", [...(project.staff || []), entry.name]);
                    else if (role === "Client") updateProject("clientContacts", [...(project.clientContacts || []), entry]);
                    else if (role === "Billing") updateProject("billingContacts", [...(project.billingContacts || []), entry]);
                    else updateProject("pocs", [...(project.pocs || []), entry]);
                    setClipboardToast({ text: `${entry.name} added as ${role}!`, x: window.innerWidth / 2, y: 60 }); setTimeout(() => setClipboardToast(null), 1800);
                  };

                  const removePersonFromProject = (person) => {
                    if (person.source === "producers") updateProject("producers", project.producers.filter(n => n !== person.name));
                    else if (person.source === "managers") updateProject("managers", project.managers.filter(n => n !== person.name));
                    else if (person.source === "staff") updateProject("staff", (project.staff || []).filter(n => n !== person.name));
                    else if (person.source === "clientContacts") updateProject("clientContacts", (project.clientContacts || []).filter(p => p.name !== person.name));
                    else if (person.source === "pocs") updateProject("pocs", (project.pocs || []).filter(p => p.name !== person.name));
                    else if (person.source === "billingContacts") updateProject("billingContacts", (project.billingContacts || []).filter(p => p.name !== person.name));
                  };

                  const changePersonRole = (person, newRole) => {
                    const c = contacts.find(ct => ct.name === person.name);
                    removePersonFromProject(person);
                    setTimeout(() => addPersonToProject(c || person, newRole, person.dept || ""), 10);
                  };

                  const changePersonDept = (person, newDept) => {
                    if (person.source === "clientContacts") {
                      updateProject("clientContacts", (project.clientContacts || []).map(p => p.name === person.name ? { ...p, dept: newDept } : p));
                    } else if (person.source === "pocs") {
                      updateProject("pocs", (project.pocs || []).map(p => p.name === person.name ? { ...p, dept: newDept } : p));
                    } else if (person.source === "billingContacts") {
                      updateProject("billingContacts", (project.billingContacts || []).map(p => p.name === person.name ? { ...p, dept: newDept } : p));
                    }
                  };

                  return <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <div>
                        <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>EVENT CONTACTS</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{allProjectPeople.length} People on This Project</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search contacts, roles, depts..." style={{ padding: "8px 12px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--textSub)", fontSize: 12, outline: "none", width: 220 }} />
                        <AddToProjectDropdown contacts={contacts} allProjectPeople={allProjectPeople} onAdd={(c, role, dept) => addPersonToProject(c, role, dept)} deptOptions={DEPT_OPTIONS} />
                      </div>
                    </div>

                    {allProjectPeople.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 60, color: "var(--textGhost)" }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
                        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--textFaint)" }}>No event contacts yet</div>
                        <div style={{ fontSize: 13, marginBottom: 6 }}>Use the <span style={{ color: "#ff6b4a", fontWeight: 600 }}>+ Add to Project</span> button to pull from global contacts</div>
                        <div style={{ fontSize: 13 }}>Or add team members in the Overview tab fields</div>
                      </div>
                    ) : (
                      <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, overflow: "hidden" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 0.8fr 1.2fr 1.8fr auto", padding: "10px 16px", borderBottom: "1px solid var(--borderSub)", fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1 }}>
                          <span>NAME</span><span>ROLE</span><span>DEPARTMENT</span><span>PHONE</span><span>EMAIL</span><span>ACTIONS</span>
                        </div>
                        {filtered.map((person, i) => {
                          const c = contacts.find(ct => ct.name === person.name);
                          const inGlobal = !!c;
                          const rc = ROLE_COLORS[person.role] || "var(--textMuted)";
                          const dc = DEPT_COLORS[person.dept] || null;
                          const isTeam = person.source === "producers" || person.source === "managers" || person.source === "staff";
                          return (
                            <div key={`ep-${i}`} style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 0.8fr 1.2fr 1.8fr auto", padding: "10px 16px", borderBottom: "1px solid var(--calLine)", alignItems: "center", fontSize: 12 }}>
                              {/* NAME */}
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div onClick={(e) => viewContact(c || { name: person.name, phone: person.phone, email: person.email }, e)} style={{ width: 32, height: 32, borderRadius: "50%", background: `${rc}15`, border: `1px solid ${rc}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: rc, flexShrink: 0, cursor: "pointer" }}>
                                  {person.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: "var(--text)" }}>{person.name}</div>
                                  {inGlobal && <div style={{ fontSize: 8, color: "#3da5db" }}>✓ in contacts</div>}
                                </div>
                              </div>
                              {/* ROLE - dropdown */}
                              <div>
                                <select value={person.role} onChange={e => changePersonRole(person, e.target.value)} style={{ padding: "3px 6px", background: `${rc}15`, border: `1px solid ${rc}30`, borderRadius: 4, color: rc, fontSize: 9, fontWeight: 700, cursor: "pointer", outline: "none", appearance: "auto" }}>
                                  {PROJECT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                              </div>
                              {/* DEPARTMENT - dropdown */}
                              <div>
                                {isTeam ? (
                                  <span style={{ fontSize: 9, color: "var(--textGhost)" }}>—</span>
                                ) : (
                                  <select value={person.dept || ""} onChange={e => changePersonDept(person, e.target.value)} style={{ padding: "3px 4px", background: dc ? `${dc}15` : "var(--bgInput)", border: `1px solid ${dc ? dc + "30" : "var(--borderSub)"}`, borderRadius: 4, color: dc || "var(--textFaint)", fontSize: 8, fontWeight: 600, cursor: "pointer", outline: "none", appearance: "auto", maxWidth: 90 }}>
                                    <option value="">None</option>
                                    {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                  </select>
                                )}
                              </div>
                              {/* PHONE */}
                              <span onClick={(e) => { const ph = person.phone || (c && c.phone); if (ph) copyToClipboard(ph, "Phone", e); }} style={{ color: "var(--textMuted)", fontSize: 11, cursor: (person.phone || (c && c.phone)) ? "pointer" : "default" }} onMouseEnter={e => { if (person.phone || (c && c.phone)) e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={e => e.currentTarget.style.color = "var(--textMuted)"}>{person.phone || (c && c.phone) || "—"} {(person.phone || (c && c.phone)) && <span style={{ fontSize: 7, color: "var(--textGhost)" }}>⧉</span>}</span>
                              {/* EMAIL */}
                              <span onClick={(e) => { const em = person.email || (c && c.email); if (em) copyToClipboard(em, "Email", e); }} style={{ color: "var(--textMuted)", fontSize: 11, cursor: (person.email || (c && c.email)) ? "pointer" : "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} onMouseEnter={e => { if (person.email || (c && c.email)) e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={e => e.currentTarget.style.color = "var(--textMuted)"}>{person.email || (c && c.email) || "—"} {(person.email || (c && c.email)) && <span style={{ fontSize: 7, color: "var(--textGhost)" }}>⧉</span>}</span>
                              {/* ACTIONS */}
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                {!inGlobal && person.name && (
                                  <button onClick={() => {
                                    const names = person.name.split(" ");
                                    setContacts(prev => [...prev, { id: `ct_${Date.now()}`, name: person.name, firstName: names[0] || "", lastName: names.slice(1).join(" ") || "", phone: person.phone || "", email: person.email || "", company: project.client, position: person.role, department: person.dept || "", notes: `From ${project.name}`, source: "project" }]);
                                    setClipboardToast({ text: `${person.name} saved to contacts!`, x: window.innerWidth / 2, y: 60 }); setTimeout(() => setClipboardToast(null), 1800);
                                  }} style={{ padding: "4px 8px", background: "#4ecb7110", border: "1px solid #4ecb7130", borderRadius: 5, color: "#4ecb71", cursor: "pointer", fontSize: 9, fontWeight: 600, whiteSpace: "nowrap" }}>↑ Save</button>
                                )}
                                <button onClick={() => { if (confirm(`Remove ${person.name} from this project?`)) removePersonFromProject(person); }} style={{ padding: "4px 8px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "#e85454", cursor: "pointer", fontSize: 9, fontWeight: 600 }}>✕</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>;
                })()}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ═══ PRINT ROS OVERLAY ═══ */}
      {showPrintROS && (() => {
        const vMap = Object.fromEntries(vendors.map(v => [v.id, v.name]));
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#fff", color: "#1a1a1a", overflowY: "auto", fontFamily: "'DM Sans', sans-serif" }}>
            {/* Toolbar */}
            <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#f5f5f5", borderBottom: "1px solid #ddd", padding: "10px 30px", display: "flex", justifyContent: "space-between", alignItems: "center" }} className="no-print">
              <span style={{ fontWeight: 700, fontSize: 14, color: "#333" }}>Run of Show Preview</span>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => window.print()} style={{ padding: "7px 20px", background: "#ff6b4a", border: "none", borderRadius: 6, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>🖨 Print / Save PDF</button>
                <button onClick={() => setShowPrintROS(false)} style={{ padding: "7px 16px", background: "#eee", border: "1px solid #ccc", borderRadius: 6, color: "#555", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>✕ Close</button>
              </div>
            </div>

            <div style={{ padding: "40px 50px", maxWidth: 1100, margin: "0 auto" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingBottom: 16, borderBottom: "2px solid #111" }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#ff6b4a" }}>Adaptive by Design</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>{project.client}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{project.name}</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 11, color: "#666", lineHeight: 1.8 }}>
                  {project.eventDates.start && <div>Event: {new Date(project.eventDates.start + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {new Date(project.eventDates.end + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>}
                  <div>Producers: {project.producers.join(", ")}</div>
                  <div>Managers: {project.managers.join(", ")}</div>
                  <div style={{ marginTop: 6, fontStyle: "italic" }}>Generated {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                </div>
              </div>

              {/* Days */}
              {days.map(day => {
                const dayDate = project.eventDates.start ? new Date(new Date(project.eventDates.start + "T12:00:00").getTime() + (day - 1) * 86400000).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) : "";
                return (
                  <div key={day} style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#ff6b4a", padding: "10px 0 6px", marginTop: 12, borderBottom: "1px solid #ddd" }}>Day {day}{dayDate ? ` — ${dayDate}` : ""}</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                      <thead>
                        <tr style={{ background: "#f5f5f5" }}>
                          {["Time", "Item", "Dept", "Vendors", "Location", "Contact", "Owner", "Notes"].map(h => (
                            <th key={h} style={{ fontWeight: 700, fontSize: 8, letterSpacing: 0.8, textTransform: "uppercase", textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #ccc", color: "#555" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ros.filter(r => r.day === day).map(r => {
                          const isShoot = r.item.includes("🎬");
                          const isBreak = r.item.includes("WRAP") || r.item.includes("LUNCH");
                          return (
                            <tr key={r.id} style={{ background: isShoot ? "#fff8f5" : isBreak ? "#f8f8fa" : "transparent", fontWeight: isShoot ? 600 : 400 }}>
                              <td style={{ padding: "5px 8px", borderBottom: "1px solid #eee", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>{r.time}</td>
                              <td style={{ padding: "5px 8px", borderBottom: "1px solid #eee" }}>{r.item}</td>
                              <td style={{ padding: "5px 8px", borderBottom: "1px solid #eee" }}><span style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 3, background: "#f0f0f0", display: "inline-block" }}>{r.dept}</span></td>
                              <td style={{ padding: "5px 8px", borderBottom: "1px solid #eee" }}>{r.vendors.map(vid => vMap[vid] || vid).join(", ")}</td>
                              <td style={{ padding: "5px 8px", borderBottom: "1px solid #eee" }}>{r.location}</td>
                              <td style={{ padding: "5px 8px", borderBottom: "1px solid #eee" }}>{r.contact}</td>
                              <td style={{ padding: "5px 8px", borderBottom: "1px solid #eee" }}>{r.owner}</td>
                              <td style={{ padding: "5px 8px", borderBottom: "1px solid #eee", color: isBreak ? "#888" : "#333" }}>{r.note}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}

              {/* Footer */}
              <div style={{ marginTop: 30, paddingTop: 12, borderTop: "1px solid #ddd", fontSize: 9, color: "#999", display: "flex", justifyContent: "space-between" }}>
                <span>Adaptive by Design — Command Center — {project.client} / {project.name}</span>
                <span>CONFIDENTIAL — Do Not Distribute</span>
              </div>
            </div>

            <style>{`@media print { .no-print { display: none !important; } @page { margin: 0.5in; size: landscape; } }`}</style>
          </div>
        );
      })()}

      {/* ═══ SETTINGS MODAL ═══ */}
      {showSettings && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => { if (!settingsDirty) setShowSettings(false); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bgCard)", border: "1px solid var(--borderActive)", borderRadius: 16, width: 640, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            {/* Header */}
            <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>⚙️</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", fontFamily: "'Instrument Sans'" }}>Settings</span>
                </div>
                <button onClick={() => { if (!settingsDirty) setShowSettings(false); else if (confirm("Discard unsaved changes?")) { setSettingsDirty(false); setShowSettings(false); } }} style={{ background: "none", border: "none", fontSize: 18, color: "var(--textMuted)", cursor: "pointer", padding: 4 }}>✕</button>
              </div>
              {/* Tabs */}
              <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)" }}>
                {[["users", "👤 Users"], ["drive", "📁 Drive"], ["defaults", "📋 Defaults"]].map(([key, label]) => (
                  <button key={key} onClick={() => setSettingsTab(key)} style={{ padding: "8px 16px", background: "none", border: "none", borderBottom: settingsTab === key ? "2px solid #ff6b4a" : "2px solid transparent", color: settingsTab === key ? "#ff6b4a" : "var(--textMuted)", fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: 0.3 }}>{label}</button>
                ))}
              </div>
            </div>
            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: 24, minHeight: 0 }}>

              {/* ── USERS TAB ── */}
              {settingsTab === "users" && (
                <div>
                  {/* ── PENDING APPROVALS ── */}
                  {(appSettings.pendingUsers || []).length > 0 && (
                    <div style={{ marginBottom: 20, padding: "14px 16px", background: "#f5a62308", border: "1px solid #f5a62330", borderRadius: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#f5a623", letterSpacing: 0.5, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f5a623", display: "inline-block", animation: "glow 2s infinite" }} />
                        PENDING APPROVAL ({(appSettings.pendingUsers || []).length})
                      </div>
                      {(appSettings.pendingUsers || []).map((p, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--bgCard)", borderRadius: 6, marginBottom: 4, border: "1px solid var(--borderSub)" }}>
                          <div>
                            <span style={{ fontSize: 13, color: "var(--textSub)", fontFamily: "'JetBrains Mono', monospace" }}>{p.email}</span>
                            <span style={{ fontSize: 9, color: "var(--textGhost)", marginLeft: 8 }}>requested {new Date(p.requestedAt).toLocaleDateString()}</span>
                          </div>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button onClick={() => approveUser(p.email)} style={{ padding: "4px 12px", background: "#4ecb7115", border: "1px solid #4ecb7130", borderRadius: 5, color: "#4ecb71", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>✓ Approve</button>
                            <button onClick={() => denyUser(p.email)} style={{ padding: "4px 10px", background: "#e8545412", border: "1px solid #e8545425", borderRadius: 5, color: "#e85454", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>✕ Deny</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: 11, color: "var(--textMuted)", marginBottom: 12, lineHeight: 1.5 }}>Manage who can access the Command Center. New sign-ups require approval from an admin.</div>
                  {appSettings.authorizedUsers.map((email, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--bgInput)", borderRadius: 6, marginBottom: 4, border: "1px solid var(--borderSub)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, color: "var(--textSub)", fontFamily: "'JetBrains Mono', monospace" }}>{email}</span>
                        {(email === "billy@weareadptv.com" || email === "clancy@weareadptv.com") && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: "#ff6b4a15", color: "#ff6b4a", fontWeight: 700, letterSpacing: 0.5 }}>OWNER</span>}
                      </div>
                      {email !== "billy@weareadptv.com" && email !== "clancy@weareadptv.com" && (
                        <button onClick={() => { const updated = { ...appSettings, authorizedUsers: appSettings.authorizedUsers.filter((_, j) => j !== i) }; setAppSettings(updated); setSettingsDirty(true); }} style={{ background: "none", border: "none", color: "#e85454", fontSize: 14, cursor: "pointer", padding: "2px 6px" }}>✕</button>
                      )}
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <input id="newUserEmail" type="email" placeholder="Add email address..." style={{ flex: 1, padding: "8px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--textSub)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: "none" }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = e.target.value.trim().toLowerCase();
                          if (v && v.includes("@") && !appSettings.authorizedUsers.includes(v)) {
                            setAppSettings(prev => ({ ...prev, authorizedUsers: [...prev.authorizedUsers, v] }));
                            setSettingsDirty(true);
                            e.target.value = "";
                          }
                        }
                      }}
                    />
                    <button onClick={() => {
                      const inp = document.getElementById("newUserEmail");
                      const v = inp.value.trim().toLowerCase();
                      if (v && v.includes("@") && !appSettings.authorizedUsers.includes(v)) {
                        setAppSettings(prev => ({ ...prev, authorizedUsers: [...prev.authorizedUsers, v] }));
                        setSettingsDirty(true);
                        inp.value = "";
                      }
                    }} style={{ padding: "8px 14px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 6, color: "#ff6b4a", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Add</button>
                  </div>
                </div>
              )}

              {/* ── DRIVE TAB ── */}
              {settingsTab === "drive" && (
                <div>
                  {/* Service Account Info */}
                  <div style={{ padding: "12px 14px", background: "var(--bgInput)", borderRadius: 8, border: "1px solid var(--borderSub)", marginBottom: 16 }}>
                    <div style={{ fontSize: 9, color: "var(--textGhost)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 6 }}>SERVICE ACCOUNT EMAIL</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: "var(--textSub)", fontFamily: "'JetBrains Mono', monospace", wordBreak: "break-all" }}>command-center-drive@adaptive-command-center.iam.gserviceaccount.com</span>
                      <button onClick={() => { navigator.clipboard.writeText("command-center-drive@adaptive-command-center.iam.gserviceaccount.com"); setClipboardToast({ text: "Copied!", x: window.innerWidth / 2, y: 60 }); }} style={{ background: "none", border: "1px solid var(--borderSub)", borderRadius: 4, padding: "2px 6px", fontSize: 9, color: "var(--textMuted)", cursor: "pointer", flexShrink: 0 }}>📋 Copy</button>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--textGhost)", lineHeight: 1.5 }}>Share any Google Drive folder with this email (as Editor) to make it searchable from the Vendors tab.</div>
                  </div>

                  {/* Test Connection Button */}
                  <button disabled={driveDiagLoading} onClick={async () => {
                    setDriveDiagLoading(true); setDriveDiag(null);
                    try {
                      const params = new URLSearchParams();
                      const folderIds = appSettings.driveConnections?.filter(c => c.folderId).map(c => c.folderId) || [];
                      if (folderIds[0]) params.set("folderId", folderIds[0]);
                      if (driveTestSearch.trim()) params.set("testSearch", driveTestSearch.trim());
                      const res = await fetch(`/api/drive/test?${params}`);
                      const data = await res.json();
                      setDriveDiag(data);
                    } catch (err) { setDriveDiag({ error: err.message }); }
                    setDriveDiagLoading(false);
                  }} style={{ width: "100%", padding: "10px 16px", background: driveDiagLoading ? "var(--bgInput)" : "#3da5db15", border: `1px solid ${driveDiagLoading ? "var(--borderSub)" : "#3da5db30"}`, borderRadius: 8, color: driveDiagLoading ? "var(--textGhost)" : "#3da5db", fontSize: 12, fontWeight: 700, cursor: driveDiagLoading ? "wait" : "pointer", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {driveDiagLoading ? "⏳ Testing Connection..." : "🔌 Test Drive Connection"}
                  </button>

                  {/* Test Search */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                    <input value={driveTestSearch} onChange={e => setDriveTestSearch(e.target.value)} placeholder="Test search for a vendor name..." style={{ flex: 1, padding: "8px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--textSub)", fontSize: 12, outline: "none", fontFamily: "'JetBrains Mono', monospace" }}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter" && driveTestSearch.trim()) {
                          setDriveDiagLoading(true); setDriveDiag(null);
                          try {
                            const params = new URLSearchParams({ testSearch: driveTestSearch.trim() });
                            const folderIds = appSettings.driveConnections?.filter(c => c.folderId).map(c => c.folderId) || [];
                            if (folderIds[0]) params.set("folderId", folderIds[0]);
                            const res = await fetch(`/api/drive/test?${params}`);
                            setDriveDiag(await res.json());
                          } catch (err) { setDriveDiag({ error: err.message }); }
                          setDriveDiagLoading(false);
                        }
                      }}
                    />
                    <button onClick={async () => {
                      if (!driveTestSearch.trim()) return;
                      setDriveDiagLoading(true); setDriveDiag(null);
                      try {
                        const params = new URLSearchParams({ testSearch: driveTestSearch.trim() });
                        const folderIds = appSettings.driveConnections?.filter(c => c.folderId).map(c => c.folderId) || [];
                        if (folderIds[0]) params.set("folderId", folderIds[0]);
                        const res = await fetch(`/api/drive/test?${params}`);
                        setDriveDiag(await res.json());
                      } catch (err) { setDriveDiag({ error: err.message }); }
                      setDriveDiagLoading(false);
                    }} style={{ padding: "8px 14px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 6, color: "#ff6b4a", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>🔍 Search</button>
                  </div>

                  {/* Diagnostics Results */}
                  {driveDiag && (
                    <div style={{ background: "var(--bgInput)", borderRadius: 8, border: "1px solid var(--borderSub)", overflow: "hidden" }}>
                      {/* Environment Variables */}
                      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--borderSub)" }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--textGhost)", letterSpacing: 0.5, marginBottom: 6 }}>ENVIRONMENT VARIABLES (Vercel)</div>
                        {driveDiag.envVars && Object.entries(driveDiag.envVars).map(([key, val]) => (
                          <div key={key} style={{ fontSize: 10, color: val.startsWith("✅") ? "#4ecb71" : "#e85454", fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>
                            {key}: {val}
                          </div>
                        ))}
                      </div>

                      {/* Connection Status */}
                      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--borderSub)" }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--textGhost)", letterSpacing: 0.5, marginBottom: 6 }}>CONNECTION</div>
                        {driveDiag.connection ? (
                          <div>
                            <div style={{ fontSize: 11, color: driveDiag.connection.status.includes("✅") ? "#4ecb71" : "#e85454", fontWeight: 600, marginBottom: 2 }}>{driveDiag.connection.status}</div>
                            {driveDiag.connection.authenticatedAs && <div style={{ fontSize: 10, color: "var(--textMuted)", fontFamily: "'JetBrains Mono', monospace" }}>Authenticated as: {driveDiag.connection.authenticatedAs}</div>}
                          </div>
                        ) : driveDiag.error ? (
                          <div style={{ fontSize: 11, color: "#e85454", fontWeight: 600 }}>❌ {driveDiag.error}</div>
                        ) : null}
                      </div>

                      {/* Accessible Files */}
                      {driveDiag.accessibleFiles && (
                        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--borderSub)" }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: "var(--textGhost)", letterSpacing: 0.5, marginBottom: 6 }}>VISIBLE TO SERVICE ACCOUNT ({driveDiag.accessibleFiles.totalVisible} items)</div>
                          {driveDiag.accessibleFiles.folders.length > 0 && (
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 9, color: "var(--textGhost)", fontWeight: 600, marginBottom: 4 }}>📁 Shared Folders:</div>
                              {driveDiag.accessibleFiles.folders.map((f, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0" }}>
                                  <span style={{ fontSize: 10, color: "var(--textSub)" }}>📁 {f.name}</span>
                                  <span style={{ fontSize: 8, color: "var(--textGhost)", fontFamily: "'JetBrains Mono', monospace" }}>ID: {f.id}</span>
                                  <button onClick={() => { navigator.clipboard.writeText(f.id); setClipboardToast({ text: "Folder ID copied!", x: window.innerWidth / 2, y: 60 }); }} style={{ background: "none", border: "1px solid var(--borderSub)", borderRadius: 3, padding: "1px 4px", fontSize: 8, color: "var(--textGhost)", cursor: "pointer" }}>copy</button>
                                </div>
                              ))}
                            </div>
                          )}
                          {driveDiag.accessibleFiles.folders.length === 0 && (
                            <div style={{ fontSize: 10, color: "#f5a623", padding: "6px 0" }}>⚠️ No folders shared with service account. Share a Google Drive folder to enable vendor search.</div>
                          )}
                          {driveDiag.accessibleFiles.recentFiles.length > 0 && (
                            <div>
                              <div style={{ fontSize: 9, color: "var(--textGhost)", fontWeight: 600, marginBottom: 4 }}>📄 Recent Files:</div>
                              {driveDiag.accessibleFiles.recentFiles.map((f, i) => (
                                <div key={i} style={{ fontSize: 10, color: "var(--textMuted)", padding: "2px 0", fontFamily: "'JetBrains Mono', monospace" }}>
                                  {f.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Folder Contents */}
                      {driveDiag.folderContents && (
                        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--borderSub)" }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: "var(--textGhost)", letterSpacing: 0.5, marginBottom: 6 }}>FOLDER CONTENTS ({driveDiag.folderContents.count || 0} items)</div>
                          {driveDiag.folderContents.error ? (
                            <div style={{ fontSize: 10, color: "#e85454" }}>❌ {driveDiag.folderContents.error}</div>
                          ) : (
                            driveDiag.folderContents.items?.map((f, i) => (
                              <div key={i} style={{ fontSize: 10, color: "var(--textMuted)", padding: "2px 0" }}>
                                {f.type === "folder" ? "📁" : "📄"} {f.name}
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Search Results */}
                      {driveDiag.searchResults && (
                        <div style={{ padding: "10px 14px" }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: "var(--textGhost)", letterSpacing: 0.5, marginBottom: 6 }}>SEARCH: "{driveDiag.searchResults.query}" ({driveDiag.searchResults.count || 0} results)</div>
                          {driveDiag.searchResults.error ? (
                            <div style={{ fontSize: 10, color: "#e85454" }}>❌ {driveDiag.searchResults.error}</div>
                          ) : driveDiag.searchResults.count === 0 ? (
                            <div style={{ fontSize: 10, color: "#f5a623" }}>No results found. Make sure the folder containing vendor files is shared with the service account.</div>
                          ) : (
                            driveDiag.searchResults.results?.map((f, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0" }}>
                                <span style={{ fontSize: 10, color: "var(--textSub)" }}>{f.type === "folder" ? "📁" : "📄"} {f.name}</span>
                                {f.link && <a href={f.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 8, color: "#3da5db" }}>open ↗</a>}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Folder Connections Config */}
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Scoped Folder Connections</div>
                    <div style={{ fontSize: 10, color: "var(--textGhost)", marginBottom: 10, lineHeight: 1.5 }}>Optionally scope the vendor search to specific folders. If no folder IDs are set, it searches everything the service account can see.</div>
                    {appSettings.driveConnections.map((conn, i) => (
                      <div key={i} style={{ padding: "10px 12px", background: "var(--bgInput)", borderRadius: 6, border: "1px solid var(--borderSub)", marginBottom: 6 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          <input value={conn.name} onChange={(e) => { const updated = { ...appSettings }; updated.driveConnections = [...updated.driveConnections]; updated.driveConnections[i] = { ...conn, name: e.target.value }; setAppSettings(updated); setSettingsDirty(true); }} placeholder="Label (e.g. Vendors)" style={{ width: 120, padding: "6px 8px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 4, color: "var(--textSub)", fontSize: 12, fontWeight: 600, outline: "none" }} />
                          <input value={conn.folderId} onChange={(e) => { const updated = { ...appSettings }; updated.driveConnections = [...updated.driveConnections]; updated.driveConnections[i] = { ...conn, folderId: e.target.value }; setAppSettings(updated); setSettingsDirty(true); }} onPaste={(e) => { e.preventDefault(); const pasted = e.clipboardData.getData("text"); const id = extractDriveId(pasted); const updated = { ...appSettings }; updated.driveConnections = [...updated.driveConnections]; updated.driveConnections[i] = { ...conn, folderId: id }; setAppSettings(updated); setSettingsDirty(true); }} onBlur={(e) => { const id = extractDriveId(e.target.value); if (id !== e.target.value) { const updated = { ...appSettings }; updated.driveConnections = [...updated.driveConnections]; updated.driveConnections[i] = { ...conn, folderId: id }; setAppSettings(updated); setSettingsDirty(true); } }} placeholder="Paste Google Drive folder URL or ID" style={{ flex: 1, padding: "6px 8px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 4, color: "var(--textSub)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", outline: "none" }} />
                          {i > 0 && <button onClick={() => { const updated = { ...appSettings, driveConnections: appSettings.driveConnections.filter((_, j) => j !== i) }; setAppSettings(updated); setSettingsDirty(true); }} style={{ background: "none", border: "none", color: "#e85454", fontSize: 14, cursor: "pointer" }}>✕</button>}
                        </div>
                        <div style={{ fontSize: 9, color: "var(--textGhost)" }}>From URL: drive.google.com/drive/folders/<strong style={{ color: "var(--textMuted)" }}>THIS_PART_IS_THE_ID</strong></div>
                      </div>
                    ))}
                    <button onClick={() => { setAppSettings(prev => ({ ...prev, driveConnections: [...prev.driveConnections, { name: "", folderId: "" }] })); setSettingsDirty(true); }} style={{ marginTop: 6, padding: "7px 14px", background: "#ff6b4a10", border: "1px solid #ff6b4a25", borderRadius: 6, color: "#ff6b4a", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ Add Folder</button>
                  </div>

                  {/* ── DATA PROTECTION ── */}
                  <div style={{ marginTop: 28, borderTop: "2px solid var(--borderSub)", paddingTop: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>🛡️ Data Protection</div>
                    <div style={{ fontSize: 10, color: "var(--textFaint)", marginBottom: 16 }}>Auto-backups run at 12 PM & 12 AM daily to Shared Drive → Internal → Command.Center</div>

                    {/* Backup path info */}
                    <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "var(--textGhost)", letterSpacing: 0.5, marginBottom: 6 }}>AUTOMATIC BACKUP LOCATION</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--textSub)" }}>
                        📁 Shared Drive → Internal → <strong>Command.Center</strong> → Backups → <em>YYYY-MM</em>
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--textSub)", marginTop: 4 }}>
                        👥 Shared Drive → Internal → <strong>Command.Center</strong> → Contacts → <em>*.vcf</em>
                      </div>
                      <div style={{ fontSize: 9, color: "var(--textGhost)", marginTop: 8 }}>Runs automatically via Vercel Cron at 12:00 PM and 12:00 AM Pacific. Contacts sync as vCards with each backup.</div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                      <button onClick={async () => {
                        setBackupStatus("backing-up");
                        try {
                          const res = await fetch("/api/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "backup" }) });
                          if (!res.ok) throw new Error(`Server error ${res.status}`);
                          const text = await res.text();
                          const data = text ? JSON.parse(text) : {};
                          if (data.error) throw new Error(data.error);
                          setBackupStatus("backed-up");
                          setLastBackup(data.file);
                          setTimeout(() => setBackupStatus(null), 3000);
                        } catch (e) { alert("Backup failed: " + e.message); setBackupStatus(null); }
                      }} style={{ padding: "10px 14px", background: "#4ecb7110", border: "1px solid #4ecb7130", borderRadius: 8, color: "#4ecb71", cursor: "pointer", fontSize: 11, fontWeight: 600, textAlign: "center" }}>
                        {backupStatus === "backing-up" ? "⏳ Backing up..." : backupStatus === "backed-up" ? "✅ Done!" : "💾 Backup Now"}
                      </button>

                      <button onClick={async () => {
                        setBackupStatus("syncing");
                        try {
                          const res = await fetch("/api/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync-contacts" }) });
                          if (!res.ok) throw new Error(`Server error ${res.status}`);
                          const text = await res.text();
                          const data = text ? JSON.parse(text) : {};
                          if (data.error) throw new Error(data.error);
                          setBackupStatus("synced");
                          alert(`Synced ${data.synced} contacts as vCards to Drive`);
                          setTimeout(() => setBackupStatus(null), 3000);
                        } catch (e) { alert("Sync failed: " + e.message); setBackupStatus(null); }
                      }} style={{ padding: "10px 14px", background: "#3da5db10", border: "1px solid #3da5db30", borderRadius: 8, color: "#3da5db", cursor: "pointer", fontSize: 11, fontWeight: 600, textAlign: "center" }}>
                        {backupStatus === "syncing" ? "⏳ Syncing..." : backupStatus === "synced" ? "✅ Done!" : "👥 Sync Contacts Now"}
                      </button>

                      <button onClick={async () => {
                        setBackupStatus("loading-history");
                        try {
                          const res = await fetch("/api/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "history" }) });
                          if (!res.ok) throw new Error(`Server error ${res.status}`);
                          const text = await res.text();
                          const data = text ? JSON.parse(text) : {};
                          if (data.error) throw new Error(data.error);
                          setVersionHistory(data.history || []);
                          setShowVersionHistory(true);
                          setBackupStatus(null);
                        } catch (e) { alert("Could not load history: " + e.message); setBackupStatus(null); }
                      }} style={{ padding: "10px 14px", background: "#dba94e10", border: "1px solid #dba94e30", borderRadius: 8, color: "#dba94e", cursor: "pointer", fontSize: 11, fontWeight: 600, textAlign: "center" }}>
                        {backupStatus === "loading-history" ? "⏳ Loading..." : "🕐 Version History"}
                      </button>
                    </div>

                    {lastBackup && (
                      <div style={{ background: "#4ecb7108", border: "1px solid #4ecb7120", borderRadius: 8, padding: 10, fontSize: 10, color: "var(--textSub)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>Last backup: <strong>{lastBackup.name}</strong> ({lastBackup.sizeKb} KB)</span>
                        {lastBackup.link && <a href={lastBackup.link} target="_blank" rel="noopener noreferrer" style={{ color: "#3da5db", fontWeight: 600, textDecoration: "none" }}>Open in Drive →</a>}
                      </div>
                    )}

                    <div style={{ marginTop: 12, fontSize: 9, color: "var(--textGhost)", lineHeight: 1.6 }}>
                      ⚡ <strong>Version history</strong> — every save auto-snapshots to Supabase (last 200 kept). Restore from Version History.<br />
                      💾 <strong>Drive backups</strong> — JSON files organized by month. Auto at 12 PM + 12 AM, or click "Backup Now".<br />
                      👥 <strong>Contact sync</strong> — all contacts written as .vcf vCards, updated in place if they already exist.
                    </div>
                  </div>
                </div>
              )}

              {/* ── DEFAULTS TAB ── */}
              {settingsTab === "defaults" && (
                <div>
                  {/* Statuses */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Project Statuses</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                      {appSettings.statuses.map((s, i) => (
                        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, fontSize: 11, color: "var(--textSub)" }}>
                          {s}
                          <button onClick={() => { setAppSettings(prev => ({ ...prev, statuses: prev.statuses.filter((_, j) => j !== i) })); setSettingsDirty(true); }} style={{ background: "none", border: "none", color: "var(--textGhost)", fontSize: 12, cursor: "pointer", padding: 0, lineHeight: 1 }}>✕</button>
                        </span>
                      ))}
                    </div>
                    <input placeholder="Add status + Enter" style={{ padding: "6px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "var(--textSub)", fontSize: 11, outline: "none", width: 200 }}
                      onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { setAppSettings(prev => ({ ...prev, statuses: [...prev.statuses, e.target.value.trim()] })); setSettingsDirty(true); e.target.value = ""; } }} />
                  </div>
                  {/* Project Types */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Project Types</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                      {appSettings.projectTypes.map((t, i) => (
                        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, fontSize: 11, color: "var(--textSub)" }}>
                          {t}
                          <button onClick={() => { setAppSettings(prev => ({ ...prev, projectTypes: prev.projectTypes.filter((_, j) => j !== i) })); setSettingsDirty(true); }} style={{ background: "none", border: "none", color: "var(--textGhost)", fontSize: 12, cursor: "pointer", padding: 0, lineHeight: 1 }}>✕</button>
                        </span>
                      ))}
                    </div>
                    <input placeholder="Add project type + Enter" style={{ padding: "6px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "var(--textSub)", fontSize: 11, outline: "none", width: 200 }}
                      onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { setAppSettings(prev => ({ ...prev, projectTypes: [...prev.projectTypes, e.target.value.trim()] })); setSettingsDirty(true); e.target.value = ""; } }} />
                  </div>
                  {/* Departments */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Departments</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                      {appSettings.departments.map((d, i) => (
                        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, fontSize: 11, color: "var(--textSub)" }}>
                          {d}
                          <button onClick={() => { setAppSettings(prev => ({ ...prev, departments: prev.departments.filter((_, j) => j !== i) })); setSettingsDirty(true); }} style={{ background: "none", border: "none", color: "var(--textGhost)", fontSize: 12, cursor: "pointer", padding: 0, lineHeight: 1 }}>✕</button>
                        </span>
                      ))}
                    </div>
                    <input placeholder="Add department + Enter" style={{ padding: "6px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "var(--textSub)", fontSize: 11, outline: "none", width: 200 }}
                      onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { setAppSettings(prev => ({ ...prev, departments: [...prev.departments, e.target.value.trim()] })); setSettingsDirty(true); e.target.value = ""; } }} />
                  </div>
                </div>
              )}
            </div>
            {/* Footer */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: settingsDirty ? "#f5a623" : "var(--textGhost)", fontWeight: 600 }}>{settingsDirty ? "⚠ Unsaved changes" : "✓ All changes saved"}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setSettingsDirty(false); setShowSettings(false); }} style={{ padding: "8px 16px", background: "transparent", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--textMuted)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button disabled={!settingsDirty || settingsSaving} onClick={() => saveSettings(appSettings)} style={{ padding: "8px 20px", background: settingsDirty ? "#ff6b4a" : "var(--bgInput)", border: "none", borderRadius: 6, color: settingsDirty ? "#fff" : "var(--textGhost)", fontSize: 11, fontWeight: 700, cursor: settingsDirty ? "pointer" : "default", opacity: settingsSaving ? 0.6 : 1 }}>{settingsSaving ? "Saving..." : "Save Changes"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ RIGHT-CLICK CONTEXT MENU ═══ */}
      {contextMenu && (
        <div style={{ position: "fixed", inset: 0, zIndex: 190 }} onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "fixed", left: contextMenu.x, top: contextMenu.y, background: "var(--bgCard)", border: "1px solid var(--borderActive)", borderRadius: 8, padding: 4, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 191, minWidth: 160 }}>
            <div style={{ padding: "6px 12px", fontSize: 10, color: "var(--textGhost)", fontWeight: 600, letterSpacing: 0.5, borderBottom: "1px solid var(--borderSub)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contextMenu.projectName}</div>
            <button onClick={() => { const src = projects.find(x => x.id === contextMenu.projectId); if (src) { const newId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); const dup = { id: newId, name: src.name + " (Copy)", client: src.client || "", projectType: src.projectType || "", code: "", status: "Pre-Production", location: src.location || "", budget: 0, spent: 0, eventDates: { start: "", end: "" }, engagementDates: { start: "", end: "" }, brief: { what: "", where: "", why: "" }, producers: [], managers: [], staff: [], clientContacts: [], pocContacts: [], billingContacts: [], notes: "", archived: false }; setProjects(prev => [...prev, dup]); setActiveProjectId(newId); setActiveTab("overview"); setClipboardToast({ text: `Duplicated "${src.name}"`, x: window.innerWidth / 2, y: 60 }); } setContextMenu(null); }} style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "none", borderRadius: 4, color: "var(--textSub)", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgHover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>📋 Duplicate Project</button>
            <button onClick={() => { setArchiveConfirm({ projectId: contextMenu.projectId, action: "archive", name: contextMenu.projectName }); setContextMenu(null); }} style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "none", borderRadius: 4, color: "#9b6dff", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }} onMouseEnter={e => e.currentTarget.style.background = "#9b6dff12"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{contextMenu.archived ? "↩ Restore Project" : "📦 Archive Project"}</button>
            <button onClick={() => { setArchiveConfirm({ projectId: contextMenu.projectId, action: "delete", name: contextMenu.projectName }); setContextMenu(null); }} style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "none", borderRadius: 4, color: "#e85454", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }} onMouseEnter={e => e.currentTarget.style.background = "#e8545412"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>🗑 Delete Project</button>
          </div>
        </div>
      )}

      {/* ═══ ARCHIVE / DELETE CONFIRM ═══ */}
      {archiveConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => { setArchiveConfirm(null); setSwipeState({}); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bgCard)", border: "1px solid var(--borderActive)", borderRadius: 16, padding: "28px 32px", width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>{archiveConfirm.action === "archive" ? "📦" : "🗑"}</div>
            <div style={{ fontSize: 16, fontWeight: 700, textAlign: "center", color: "var(--text)", marginBottom: 8, fontFamily: "'Instrument Sans'" }}>
              {archiveConfirm.action === "archive" ? "Archive Project?" : "Delete Project?"}
            </div>
            <div style={{ fontSize: 13, color: "var(--textMuted)", textAlign: "center", marginBottom: 6 }}>
              <strong>{archiveConfirm.name}</strong>
            </div>
            <div style={{ fontSize: 12, color: "var(--textFaint)", textAlign: "center", marginBottom: 24, lineHeight: 1.5 }}>
              {archiveConfirm.action === "archive"
                ? "This project will be hidden from the sidebar. You can restore it anytime from the archived view."
                : "This will permanently remove the project and all its data. This action cannot be undone."}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setArchiveConfirm(null); setSwipeState({}); }} style={{ flex: 1, padding: "10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--textSub)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={() => {
                if (archiveConfirm.action === "archive") {
                  const p = projects.find(x => x.id === archiveConfirm.projectId);
                  if (p?.archived) {
                    setProjects(prev => prev.map(x => x.id === archiveConfirm.projectId ? { ...x, archived: false } : x));
                    setClipboardToast({ text: `${archiveConfirm.name} restored!`, x: window.innerWidth / 2, y: 60 });
                  } else {
                    setProjects(prev => prev.map(x => x.id === archiveConfirm.projectId ? { ...x, archived: true } : x));
                    setClipboardToast({ text: `${archiveConfirm.name} archived`, x: window.innerWidth / 2, y: 60 });
                  }
                } else {
                  setProjects(prev => prev.filter(x => x.id !== archiveConfirm.projectId));
                  setClipboardToast({ text: `${archiveConfirm.name} deleted`, x: window.innerWidth / 2, y: 60 });
                }
                setTimeout(() => setClipboardToast(null), 2200);
                setArchiveConfirm(null);
                setSwipeState({});
              }} style={{ flex: 1, padding: "10px", background: archiveConfirm.action === "archive" ? "#9b6dff" : "#e85454", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                {archiveConfirm.action === "archive" ? (projects.find(x => x.id === archiveConfirm.projectId)?.archived ? "Restore" : "Archive") : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CLIPBOARD TOAST ═══ */}
      {clipboardToast && (
        <div style={{ position: "fixed", left: clipboardToast.x, top: clipboardToast.y - 36, zIndex: 20000, background: "#4ecb71", color: "var(--bgInput)", padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, animation: "fadeUp 0.2s ease", pointerEvents: "none", boxShadow: "0 4px 12px rgba(78,203,113,0.3)" }}>
          ✓ {clipboardToast.text}
        </div>
      )}

      {/* ═══ CONTACT POPOVER ═══ */}
      {contactPopover && (() => {
        const c = contactPopover.contact;
        const maxX = typeof window !== "undefined" ? window.innerWidth - 300 : 400;
        const maxY = typeof window !== "undefined" ? window.innerHeight - 260 : 400;
        const x = Math.min(contactPopover.x, maxX);
        const y = Math.min(contactPopover.y, maxY);
        return (
          <div ref={contactPopoverRef} style={{ position: "fixed", left: x, top: y, zIndex: 15000, width: 280, background: "var(--bgHover)", border: "1px solid var(--borderActive)", borderRadius: 12, boxShadow: "0 16px 48px rgba(0,0,0,0.7)", animation: "fadeUp 0.15s ease" }}>
            <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--borderSub)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #ff6b4a, #ff4a6b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                  {c.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div onClick={(e) => copyToClipboard(c.name, "Name", e)} style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }} onMouseEnter={e => e.currentTarget.style.color = "#fff"} onMouseLeave={e => e.currentTarget.style.color = "var(--text)"}>
                    {c.name} <span style={{ fontSize: 8, color: "var(--textGhost)" }}>⧉</span>
                  </div>
                  {c.position && <div style={{ fontSize: 11, color: "#ff6b4a", fontWeight: 600 }}>{c.position}</div>}
                  {c.company && <div style={{ fontSize: 10, color: "var(--textFaint)" }}>{c.company}</div>}
                </div>
              </div>
            </div>
            <div style={{ padding: "12px 18px" }}>
              {c.phone && (
                <div onClick={(e) => copyToClipboard(c.phone, "Phone", e)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer", fontSize: 12, color: "var(--textSub)", borderBottom: "1px solid var(--borderSub)" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text)"} onMouseLeave={e => e.currentTarget.style.color = "var(--textSub)"}>
                  <span style={{ fontSize: 13 }}>📞</span> {c.phone} <span style={{ fontSize: 8, color: "var(--textGhost)", marginLeft: "auto" }}>Click to copy</span>
                </div>
              )}
              {c.email && (
                <div onClick={(e) => copyToClipboard(c.email, "Email", e)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer", fontSize: 12, color: "var(--textSub)", borderBottom: "1px solid var(--borderSub)" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text)"} onMouseLeave={e => e.currentTarget.style.color = "var(--textSub)"}>
                  <span style={{ fontSize: 13 }}>📧</span> {c.email} <span style={{ fontSize: 8, color: "var(--textGhost)", marginLeft: "auto" }}>Click to copy</span>
                </div>
              )}
              {c.department && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 12, color: "var(--textMuted)" }}>
                  <span style={{ fontSize: 13 }}>🏢</span> {c.department}
                </div>
              )}
              {c.notes && (
                <div style={{ marginTop: 6, padding: "8px 10px", background: "var(--bgInput)", borderRadius: 6, fontSize: 11, color: "var(--textFaint)", lineHeight: 1.5 }}>{c.notes}</div>
              )}
              {!c.phone && !c.email && (
                <div style={{ fontSize: 11, color: "var(--textGhost)", padding: "8px 0", textAlign: "center" }}>No contact details on file</div>
              )}
            </div>
            <div style={{ padding: "8px 18px 12px", display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => { setContactForm({ ...c }); setShowAddContact(true); setContactPopover(null); }} style={{ padding: "5px 12px", background: "var(--bgCard)", border: "1px solid var(--borderActive)", borderRadius: 5, color: "var(--textMuted)", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>✏ Edit</button>
              <button onClick={() => setContactPopover(null)} style={{ padding: "5px 12px", background: "none", border: "none", color: "var(--textFaint)", cursor: "pointer", fontSize: 10 }}>Close</button>
            </div>
          </div>
        );
      })()}

      {/* ═══ ADD / EDIT CONTACT MODAL ═══ */}
      {showAddContact && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) setShowAddContact(false); }}>
          <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 16, width: 520, animation: "fadeUp 0.25s ease" }}>
            <div style={{ padding: "20px 28px 16px", borderBottom: "1px solid var(--borderSub)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Instrument Sans'" }}>{contactForm.id ? "Edit Contact" : "Add Contact"}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{ padding: "5px 12px", background: "#3da5db15", border: "1px solid #3da5db30", borderRadius: 6, color: "#3da5db", cursor: "pointer", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  📇 Import vCard
                  <input type="file" accept=".vcf,.vcard" onChange={(e) => { handleVCardUpload(e); setShowAddContact(false); }} style={{ display: "none" }} />
                </label>
                <button onClick={() => setShowAddContact(false)} style={{ background: "none", border: "none", color: "var(--textFaint)", cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>
            </div>
            <div style={{ padding: "20px 28px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>FIRST NAME</label><input value={contactForm.firstName} onChange={e => updateCF("firstName", e.target.value)} style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
                <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>LAST NAME</label><input value={contactForm.lastName} onChange={e => updateCF("lastName", e.target.value)} style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>POSITION / TITLE</label><input value={contactForm.position} onChange={e => updateCF("position", e.target.value)} placeholder="Executive Producer, DP, PM..." style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
                <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>COMPANY</label><input value={contactForm.company} onChange={e => updateCF("company", e.target.value)} style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>PHONE</label><input value={contactForm.phone} onChange={e => updateCF("phone", e.target.value)} placeholder="(555) 123-4567" style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
                <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>EMAIL</label><input value={contactForm.email} onChange={e => updateCF("email", e.target.value)} placeholder="name@company.com" style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>DEPARTMENT</label>
                  <select value={contactForm.department} onChange={e => updateCF("department", e.target.value)} style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none" }}>
                    <option value="">Select...</option>
                    {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>NOTES</label><input value={contactForm.notes} onChange={e => updateCF("notes", e.target.value)} placeholder="Any notes..." style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                <button onClick={() => setShowAddContact(false)} style={{ padding: "9px 20px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--textMuted)", cursor: "pointer", fontSize: 12 }}>Cancel</button>
                <button onClick={() => {
                  const name = contactForm.name || `${contactForm.firstName} ${contactForm.lastName}`.trim();
                  if (!name) return;
                  if (contactForm.id) {
                    setContacts(prev => prev.map(c => c.id === contactForm.id ? { ...contactForm, name } : c));
                  } else {
                    setContacts(prev => [...prev, { ...contactForm, name, id: `ct_${Date.now()}` }]);
                  }
                  setContactForm({ ...emptyContact });
                  setShowAddContact(false);
                }} style={{ padding: "9px 24px", background: "#ff6b4a", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                  {contactForm.id ? "Save Changes" : "Add Contact"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ADD PROJECT MODAL ═══ */}
      {showAddProject && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) setShowAddProject(false); }}>
          <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 16, width: 680, maxHeight: "90vh", overflowY: "auto", animation: "fadeUp 0.25s ease" }}>
            <div style={{ padding: "20px 28px 16px", borderBottom: "1px solid var(--borderSub)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Instrument Sans'" }}>New Project</div>
                <div style={{ fontSize: 11, color: "var(--textFaint)", marginTop: 2 }}>Project code auto-generates from dates + client + location</div>
              </div>
              <button onClick={() => setShowAddProject(false)} style={{ background: "none", border: "none", color: "var(--textFaint)", cursor: "pointer", fontSize: 18, padding: "4px 8px" }}>✕</button>
            </div>

            {/* Auto-generated project code preview */}
            <div style={{ padding: "14px 28px", background: "var(--bgInput)", borderBottom: "1px solid var(--borderSub)" }}>
              <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>PROJECT CODE (AUTO-GENERATED)</div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#ff6b4a", letterSpacing: 0.5 }}>
                {generateProjectCode(newProjectForm) || "YY-MMDD_MMDD-CLIENT-PROJECT-LOC"}
              </div>
              <div style={{ fontSize: 9, color: "var(--textGhost)", marginTop: 4 }}>Format: YEAR-EVENTSTART_END-CLIENT-PROJECT-LOCATION</div>
            </div>

            <div style={{ padding: "20px 28px 24px" }}>
              {/* Row 1: Client + Project Name */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>CLIENT *</label>
                  <ClientSearchInput value={newProjectForm.client} onChange={v => updateNPF("client", v)} projects={projects} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>PROJECT NAME *</label>
                  <input value={newProjectForm.name} onChange={e => updateNPF("name", e.target.value)} placeholder="Air Max Campaign, Wrapped BTS..." style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} />
                </div>
              </div>

              {/* Row 2: Location + Status + Project Type */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>LOCATION</label>
                  <input value={newProjectForm.location} onChange={e => updateNPF("location", e.target.value)} placeholder="Los Angeles, Brooklyn, Bali..." style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>STATUS</label>
                  <select value={newProjectForm.status} onChange={e => updateNPF("status", e.target.value)} style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none" }}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>PROJECT TYPE</label>
                  <select value={newProjectForm.projectType || ""} onChange={e => updateNPF("projectType", e.target.value)} style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: `1px solid ${(PT_COLORS[newProjectForm.projectType] || "var(--borderSub)")}40`, borderRadius: 7, color: PT_COLORS[newProjectForm.projectType] || "var(--text)", fontSize: 12, fontWeight: 600, outline: "none" }}>
                    <option value="">Select type...</option>
                    {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 3: Event dates */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>EVENT START</label>
                  <input type="date" value={newProjectForm.eventDates.start} onChange={e => updateNPF("eventDates", { ...newProjectForm.eventDates, start: e.target.value })} style={{ width: "100%", padding: "8px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>EVENT END</label>
                  <input type="date" value={newProjectForm.eventDates.end} onChange={e => updateNPF("eventDates", { ...newProjectForm.eventDates, end: e.target.value })} style={{ width: "100%", padding: "8px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>ENGAGEMENT START</label>
                  <input type="date" value={newProjectForm.engagementDates.start} onChange={e => updateNPF("engagementDates", { ...newProjectForm.engagementDates, start: e.target.value })} style={{ width: "100%", padding: "8px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>ENGAGEMENT END</label>
                  <input type="date" value={newProjectForm.engagementDates.end} onChange={e => updateNPF("engagementDates", { ...newProjectForm.engagementDates, end: e.target.value })} style={{ width: "100%", padding: "8px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none" }} />
                </div>
              </div>

              {/* Row 4: WHY */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>PROJECT BRIEF / WHY</label>
                <textarea value={newProjectForm.why} onChange={e => updateNPF("why", e.target.value)} rows={2} placeholder="Spring product launch — hero content for social + OLV" style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none", resize: "vertical", fontFamily: "'DM Sans'" }} />
              </div>

              {/* Row 4b: SERVICES */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>SERVICE NEEDS</label>
                <MultiDropdown values={newProjectForm.services || []} options={SERVICE_OPTIONS} onChange={v => updateNPF("services", v)} />
              </div>

              {/* Row 5: Budget + Tour toggle */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>ESTIMATED BUDGET</label>
                  <input type="number" value={newProjectForm.budget || ""} onChange={e => updateNPF("budget", Number(e.target.value))} placeholder="0" style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>PROJECT TYPE</label>
                  <div onClick={() => updateNPF("isTour", !newProjectForm.isTour)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: newProjectForm.isTour ? "#ff6b4a10" : "var(--bgInput)", border: `1px solid ${newProjectForm.isTour ? "#ff6b4a30" : "var(--borderSub)"}`, borderRadius: 7, cursor: "pointer", transition: "all 0.15s" }}>
                    <div style={{ width: 36, height: 20, borderRadius: 10, background: newProjectForm.isTour ? "#ff6b4a" : "var(--borderSub)", position: "relative", transition: "background 0.2s" }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: newProjectForm.isTour ? 18 : 2, transition: "left 0.2s" }} />
                    </div>
                    <span style={{ fontSize: 12, color: newProjectForm.isTour ? "#ff6b4a" : "var(--textFaint)", fontWeight: 600 }}>
                      {newProjectForm.isTour ? "🎤 Tour / Multi-Date Series" : "Single Project"}
                    </span>
                  </div>
                  {newProjectForm.isTour && <div style={{ fontSize: 9, color: "var(--textFaint)", marginTop: 4 }}>You can add individual show dates after creation</div>}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button onClick={() => setShowAddProject(false)} style={{ padding: "9px 20px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--textMuted)", cursor: "pointer", fontSize: 12 }}>Cancel</button>
                <button onClick={submitProject} disabled={!newProjectForm.client && !newProjectForm.name} style={{ padding: "9px 24px", background: newProjectForm.client || newProjectForm.name ? "#ff6b4a" : "var(--borderActive)", border: "none", borderRadius: 8, color: "#fff", cursor: newProjectForm.client || newProjectForm.name ? "pointer" : "default", fontSize: 12, fontWeight: 700 }}>
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DOCUMENT PREVIEW MODAL ═══ */}
      {docPreview && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }} onClick={e => { if (e.target === e.currentTarget) setDocPreview(null); }}>
          <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 16, width: 800, maxWidth: "92vw", height: "88vh", display: "flex", flexDirection: "column", animation: "fadeUp 0.2s ease", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--borderSub)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>📄</span>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Instrument Sans'", color: "var(--text)" }}>{docPreview.fileName}</span>
                </div>
                <div style={{ fontSize: 10, color: "var(--textFaint)", marginTop: 2, marginLeft: 28 }}>{docPreview.docType} · {docPreview.vendorName}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {docPreview.link && (
                  <button onClick={() => window.open(docPreview.link, '_blank')} style={{ padding: "6px 14px", background: "#3da5db15", border: "1px solid #3da5db30", borderRadius: 6, color: "#3da5db", cursor: "pointer", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                    ↗ Open in Drive
                  </button>
                )}
                <button onClick={() => setDocPreview(null)} style={{ background: "none", border: "none", color: "var(--textFaint)", cursor: "pointer", fontSize: 18, padding: "4px 8px" }}>✕</button>
              </div>
            </div>

            {/* Preview body — full height */}
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
              {docPreview.link ? (
                /* Real Drive file — full iframe embed */
                <iframe
                  src={(() => {
                    const link = docPreview.link;
                    // Google Drive file links: extract file ID and use preview URL
                    const fileIdMatch = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
                    if (fileIdMatch) return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
                    // Already a preview link
                    if (link.includes('/preview')) return link;
                    // Fallback: try replacing /view with /preview
                    return link.replace(/\/view.*$/, '/preview');
                  })()}
                  style={{ width: "100%", flex: 1, border: "none" }}
                  title={docPreview.fileName}
                  allow="autoplay"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              ) : (
                /* No Drive link — show clear status, not a fake preview */
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>File Not Connected to Google Drive</div>
                  <div style={{ fontSize: 12, color: "var(--textMuted)", maxWidth: 400, lineHeight: 1.6, marginBottom: 20 }}>
                    This document is tracked locally but doesn't have a Google Drive link yet. To enable preview, upload the file to Google Drive and link it to this vendor.
                  </div>
                  <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "16px 24px", maxWidth: 420, width: "100%" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 12px", fontSize: 11, textAlign: "left" }}>
                      <span style={{ color: "var(--textGhost)", fontWeight: 600 }}>File</span>
                      <span style={{ color: "var(--textSub)", fontFamily: "'JetBrains Mono', monospace" }}>{docPreview.fileName}</span>
                      <span style={{ color: "var(--textGhost)", fontWeight: 600 }}>Type</span>
                      <span style={{ color: "var(--textSub)" }}>{docPreview.docType}</span>
                      <span style={{ color: "var(--textGhost)", fontWeight: 600 }}>Vendor</span>
                      <span style={{ color: "var(--textSub)" }}>{docPreview.vendorName}</span>
                      <span style={{ color: "var(--textGhost)", fontWeight: 600 }}>Date</span>
                      <span style={{ color: "var(--textSub)" }}>{docPreview.date || "—"}</span>
                      {docPreview.path && <>
                        <span style={{ color: "var(--textGhost)", fontWeight: 600 }}>Path</span>
                        <span style={{ color: "var(--textSub)", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, wordBreak: "break-all" }}>{docPreview.path}</span>
                      </>}
                    </div>
                  </div>
                  <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
                    <button onClick={() => {
                      const v = vendors.find(vv => vv.name === docPreview.vendorName);
                      if (v) {
                        const linkUrl = prompt("Paste the Google Drive file URL:");
                        if (linkUrl && linkUrl.trim()) {
                          const compKey = COMP_KEYS.find(ck => ck.fullLabel === docPreview.docType);
                          if (compKey && v.compliance?.[compKey.key]) {
                            const updated = { ...v, compliance: { ...v.compliance, [compKey.key]: { ...v.compliance[compKey.key], link: linkUrl.trim() } } };
                            setVendors(prev => prev.map(vv => vv.id === v.id ? updated : vv));
                            setDocPreview(prev => ({ ...prev, link: linkUrl.trim() }));
                          }
                        }
                      }
                    }} style={{ padding: "10px 18px", background: "#3da5db15", border: "1px solid #3da5db30", borderRadius: 8, color: "#3da5db", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>🔗 Link Drive File</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ VERSION HISTORY MODAL ═══ */}
      {showVersionHistory && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10001, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }} onClick={e => { if (e.target === e.currentTarget) setShowVersionHistory(false); }}>
          <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 16, width: 600, maxWidth: "92vw", maxHeight: "80vh", display: "flex", flexDirection: "column", animation: "fadeUp 0.2s ease", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--borderSub)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Instrument Sans'", color: "var(--text)" }}>🕐 Version History</div>
                <div style={{ fontSize: 10, color: "var(--textFaint)", marginTop: 2 }}>{versionHistory.length} snapshots available</div>
              </div>
              <button onClick={() => setShowVersionHistory(false)} style={{ background: "none", border: "none", color: "var(--textFaint)", cursor: "pointer", fontSize: 18, padding: "4px 8px" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "12px 20px" }}>
              {versionHistory.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--textGhost)" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
                  <div style={{ fontSize: 12 }}>No version history yet. History is created automatically with every save.</div>
                  <div style={{ fontSize: 10, marginTop: 8, color: "var(--textGhost)" }}>Run the migration <code>005_state_history.sql</code> in Supabase to enable.</div>
                </div>
              ) : versionHistory.map((v, i) => {
                const d = new Date(v.saved_at);
                const timeAgo = (() => {
                  const mins = Math.round((Date.now() - d.getTime()) / 60000);
                  if (mins < 1) return "just now";
                  if (mins < 60) return `${mins}m ago`;
                  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
                  return `${Math.round(mins / 1440)}d ago`;
                })();
                return (
                  <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid var(--borderSub)", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgHover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text)", fontWeight: 600 }}>
                        {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        <span style={{ fontSize: 9, color: "var(--textGhost)", marginLeft: 8 }}>{timeAgo}</span>
                      </div>
                      <div style={{ fontSize: 9, color: "var(--textFaint)", marginTop: 2 }}>
                        {v.save_reason === "pre-restore" ? "🔄 Pre-restore snapshot" : "💾 Auto-save"}
                      </div>
                    </div>
                    <button onClick={async () => {
                      if (!confirm(`Restore to this version from ${d.toLocaleString()}? Current state will be saved as a snapshot first.`)) return;
                      try {
                        const res = await fetch("/api/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restore", versionId: v.id }) });
                        const data = await res.json();
                        if (data.error) throw new Error(data.error);
                        alert("Restored! Refreshing page...");
                        window.location.reload();
                      } catch (e) { alert("Restore failed: " + e.message); }
                    }} style={{ padding: "5px 12px", background: "#dba94e10", border: "1px solid #dba94e25", borderRadius: 5, color: "#dba94e", cursor: "pointer", fontSize: 9, fontWeight: 600 }}>
                      ↩ Restore
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══ ADD VENDOR MODAL ═══ */}
      {showAddVendor && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) { setShowAddVendor(false); setW9ParsedData(null); } }}>
          <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 16, width: 620, maxHeight: "85vh", overflowY: "auto", animation: "fadeUp 0.25s ease" }}>
            {/* Header */}
            <div style={{ padding: "20px 28px 16px", borderBottom: "1px solid var(--borderSub)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Instrument Sans'" }}>Add New Vendor</div>
                <div style={{ fontSize: 11, color: "var(--textFaint)", marginTop: 2 }}>Fill in contact details — compliance docs can be uploaded after</div>
              </div>
              <button onClick={() => { setShowAddVendor(false); setW9ParsedData(null); }} style={{ background: "none", border: "none", color: "var(--textFaint)", cursor: "pointer", fontSize: 18, padding: "4px 8px" }}>✕</button>
            </div>

            {/* Form */}
            <div style={{ padding: "20px 28px 28px" }}>
              {/* W9 Parsed Data Banner */}
              {w9ParsedData && (
                <div style={{ marginBottom: 18, padding: "12px 16px", background: "#9b6dff08", border: "1px solid #9b6dff20", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 14 }}>📋</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#9b6dff", letterSpacing: 0.5 }}>EXTRACTED FROM W9</span>
                    {w9ParsedData.upload?.success && (
                      <span style={{ fontSize: 9, padding: "2px 6px", background: "#4ecb7115", color: "#4ecb71", borderRadius: 4, fontWeight: 700, marginLeft: "auto" }}>✓ UPLOADED TO DRIVE</span>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", fontSize: 11, color: "var(--textSub)" }}>
                    {w9ParsedData.name && <div><span style={{ color: "var(--textFaint)" }}>Name:</span> {w9ParsedData.name}</div>}
                    {w9ParsedData.company && <div><span style={{ color: "var(--textFaint)" }}>Business:</span> {w9ParsedData.company}</div>}
                    {w9ParsedData.ein && <div><span style={{ color: "var(--textFaint)" }}>EIN:</span> {w9ParsedData.ein}</div>}
                    {w9ParsedData.taxClass && <div><span style={{ color: "var(--textFaint)" }}>Type:</span> {w9ParsedData.taxClass}</div>}
                    {w9ParsedData.address && <div><span style={{ color: "var(--textFaint)" }}>Address:</span> {w9ParsedData.address}</div>}
                    {(w9ParsedData.city || w9ParsedData.state) && <div><span style={{ color: "var(--textFaint)" }}>Location:</span> {[w9ParsedData.city, w9ParsedData.state, w9ParsedData.zip].filter(Boolean).join(', ')}</div>}
                  </div>
                  {w9ParsedData.upload?.success && w9ParsedData.upload.folder && (
                    <div style={{ marginTop: 6, fontSize: 10, color: "var(--textGhost)", fontFamily: "'JetBrains Mono', monospace" }}>
                      📁 {w9ParsedData.upload.folder.path}{w9ParsedData.upload.folder.created ? ' — folder created' : ''}
                    </div>
                  )}
                </div>
              )}
              {/* Row 1: Contact Type + Resource Type */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSub)", display: "block", marginBottom: 6 }}>Contact Type</label>
                  <select value={vendorForm.contactType} onChange={e => updateVF("contactType", e.target.value)} style={{ width: "100%", padding: "10px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, fontFamily: "'DM Sans'", appearance: "auto" }}>
                    <option value="">Select...</option>
                    {CONTACT_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSub)", display: "block", marginBottom: 6 }}>Resource Type</label>
                  <select value={vendorForm.resourceType} onChange={e => updateVF("resourceType", e.target.value)} style={{ width: "100%", padding: "10px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, fontFamily: "'DM Sans'", appearance: "auto" }}>
                    <option value="">Select...</option>
                    {RESOURCE_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 2: First Name + Last Name */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSub)", display: "block", marginBottom: 6 }}>First Name</label>
                  <input value={vendorForm.firstName} onChange={e => updateVF("firstName", e.target.value)} placeholder="First name" style={{ width: "100%", padding: "10px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, fontFamily: "'DM Sans'", outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSub)", display: "block", marginBottom: 6 }}>Last Name</label>
                  <input value={vendorForm.lastName} onChange={e => updateVF("lastName", e.target.value)} placeholder="Last name" style={{ width: "100%", padding: "10px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, fontFamily: "'DM Sans'", outline: "none" }} />
                </div>
              </div>

              {/* Row 3: Phone + Email */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSub)", display: "block", marginBottom: 6 }}>Phone</label>
                  <input value={vendorForm.phone} onChange={e => updateVF("phone", e.target.value)} placeholder="(555) 000-0000" style={{ width: "100%", padding: "10px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, fontFamily: "'DM Sans'", outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSub)", display: "block", marginBottom: 6 }}>Email</label>
                  <input value={vendorForm.email} onChange={e => updateVF("email", e.target.value)} placeholder="email@company.com" type="email" style={{ width: "100%", padding: "10px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, fontFamily: "'DM Sans'", outline: "none" }} />
                </div>
              </div>

              {/* Row 4: Company + Title */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSub)", display: "block", marginBottom: 6 }}>Company Name</label>
                  <input value={vendorForm.company} onChange={e => updateVF("company", e.target.value)} placeholder="Company name" style={{ width: "100%", padding: "10px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, fontFamily: "'DM Sans'", outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSub)", display: "block", marginBottom: 6 }}>Title</label>
                  <input value={vendorForm.title} onChange={e => updateVF("title", e.target.value)} placeholder="Job title" style={{ width: "100%", padding: "10px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, fontFamily: "'DM Sans'", outline: "none" }} />
                </div>
              </div>

              {/* Row 5: Department */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSub)", display: "block", marginBottom: 6 }}>Department</label>
                <select value={vendorForm.dept} onChange={e => updateVF("dept", e.target.value)} style={{ width: "100%", padding: "10px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, fontFamily: "'DM Sans'", appearance: "auto" }}>
                  {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Drive scan info */}
              <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12 }}>{driveVendorCache ? "✅" : driveError ? "⚠️" : "🔍"}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: driveVendorCache ? "#4ecb71" : driveError ? "#ff6b4a" : "#3da5db" }}>
                    {driveVendorCache ? `Google Drive Connected — ${driveVendorCache.length} vendors found` : driveError ? "Google Drive Error" : "Google Drive Auto-Scan"}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--textMuted)", lineHeight: 1.6 }}>
                  {driveError ? (
                    <span>Could not connect to Drive: {driveError}. Check that the service account has access to the ADMIN folder.</span>
                  ) : (
                    <span>Use the <span style={{ fontWeight: 600, color: "#dba94e" }}>Search Drive</span> bar above the vendor list to find existing vendors and auto-import their COI & W9 docs from Google Drive.</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button onClick={() => { setShowAddVendor(false); setW9ParsedData(null); }} style={{ padding: "9px 20px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--textMuted)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
                <button onClick={submitVendor} disabled={!vendorForm.company && !vendorForm.firstName} style={{ padding: "9px 24px", background: (!vendorForm.company && !vendorForm.firstName) ? "var(--borderSub)" : "#ff6b4a", border: "none", borderRadius: 8, color: (!vendorForm.company && !vendorForm.firstName) ? "var(--textFaint)" : "#fff", cursor: (!vendorForm.company && !vendorForm.firstName) ? "default" : "pointer", fontSize: 13, fontWeight: 700 }}>Add Vendor</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
