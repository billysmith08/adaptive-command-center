"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
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
const PROJECT_TYPES = ["Brand Event", "Experiential", "Festival", "Internal", "Live Event", "Private Event", "Touring"];
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

function AddressAutocomplete({ value, onChange, copyToClipboard, inputStyle, wrapperStyle, showIcon = true, placeholder }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [loaded, setLoaded] = useState(typeof window !== 'undefined' && !!window.google?.maps?.places);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // If Google Maps is already loaded
    if (window.google?.maps?.places) { setLoaded(true); return; }
    // NEXT_PUBLIC_ vars are inlined at build time by Next.js
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';
    if (!key) { console.log('AddressAutocomplete: No NEXT_PUBLIC_GOOGLE_MAPS_KEY set — add it in Vercel Environment Variables'); return; }
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      // Script exists but may still be loading
      const check = setInterval(() => { if (window.google?.maps?.places) { setLoaded(true); clearInterval(check); } }, 200);
      setTimeout(() => clearInterval(check), 10000);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.onload = () => setTimeout(() => setLoaded(true), 100);
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

  const defaultInputStyle = { flex: 1, padding: "3px 6px", background: "transparent", border: "1px solid var(--borderSub)", borderRadius: 4, color: "var(--textMuted)", fontSize: 10, outline: "none" };
  const mergedStyle = inputStyle ? { ...defaultInputStyle, ...inputStyle } : defaultInputStyle;

  if (!showIcon) {
    return <input ref={inputRef} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder || "Street, City, State ZIP"} style={mergedStyle} />;
  }

  return (
    <div style={wrapperStyle || { flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 9, color: "var(--textFaint)", flexShrink: 0 }}>📍</span>
        <input ref={inputRef} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder || "Street, City, State ZIP"} style={mergedStyle} />
        {value && <span style={{ fontSize: 7, color: "var(--textGhost)", marginLeft: 2, cursor: "pointer", flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); copyToClipboard && copyToClipboard(value, "Address", e); }}>⧉</span>}
      </div>
    </div>
  );
}

// ─── COUNTRY CODE PHONE INPUT ────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: '+1', label: 'US/CA', flag: '🇺🇸' },
  { code: '+44', label: 'UK', flag: '🇬🇧' },
  { code: '+61', label: 'AU', flag: '🇦🇺' },
  { code: '+33', label: 'FR', flag: '🇫🇷' },
  { code: '+49', label: 'DE', flag: '🇩🇪' },
  { code: '+81', label: 'JP', flag: '🇯🇵' },
  { code: '+52', label: 'MX', flag: '🇲🇽' },
  { code: '+91', label: 'IN', flag: '🇮🇳' },
  { code: '+55', label: 'BR', flag: '🇧🇷' },
  { code: '+86', label: 'CN', flag: '🇨🇳' },
  { code: '+82', label: 'KR', flag: '🇰🇷' },
  { code: '+39', label: 'IT', flag: '🇮🇹' },
  { code: '+34', label: 'ES', flag: '🇪🇸' },
  { code: '+31', label: 'NL', flag: '🇳🇱' },
  { code: '+46', label: 'SE', flag: '🇸🇪' },
  { code: '+41', label: 'CH', flag: '🇨🇭' },
  { code: '+65', label: 'SG', flag: '🇸🇬' },
  { code: '+971', label: 'UAE', flag: '🇦🇪' },
  { code: '+972', label: 'IL', flag: '🇮🇱' },
  { code: '+63', label: 'PH', flag: '🇵🇭' },
];

function PhoneWithCode({ value, onChange, placeholder, inputStyle, compact }) {
  // Country-specific phone formatting
  const formatByCountry = (code, raw) => {
    const d = raw.replace(/\D/g, '');
    if (!d) return '';
    switch (code) {
      case '+1': // US/CA: (XXX) XXX-XXXX
        if (d.length <= 3) return '(' + d;
        if (d.length <= 6) return '(' + d.slice(0,3) + ') ' + d.slice(3);
        return '(' + d.slice(0,3) + ') ' + d.slice(3,6) + '-' + d.slice(6,10);
      case '+44': // UK: XXXX-XXX-XXX
        if (d.length <= 4) return d;
        if (d.length <= 7) return d.slice(0,4) + '-' + d.slice(4);
        return d.slice(0,4) + '-' + d.slice(4,7) + '-' + d.slice(7,10);
      case '+61': // AU: XXXX-XXX-XXX
        if (d.length <= 4) return d;
        if (d.length <= 7) return d.slice(0,4) + '-' + d.slice(4);
        return d.slice(0,4) + '-' + d.slice(4,7) + '-' + d.slice(7,10);
      case '+33': // FR: X XX XX XX XX
        if (d.length <= 1) return d;
        if (d.length <= 3) return d.slice(0,1) + ' ' + d.slice(1);
        if (d.length <= 5) return d.slice(0,1) + ' ' + d.slice(1,3) + ' ' + d.slice(3);
        if (d.length <= 7) return d.slice(0,1) + ' ' + d.slice(1,3) + ' ' + d.slice(3,5) + ' ' + d.slice(5);
        if (d.length <= 9) return d.slice(0,1) + ' ' + d.slice(1,3) + ' ' + d.slice(3,5) + ' ' + d.slice(5,7) + ' ' + d.slice(7);
        return d.slice(0,1) + ' ' + d.slice(1,3) + ' ' + d.slice(3,5) + ' ' + d.slice(5,7) + ' ' + d.slice(7,9);
      case '+49': // DE: XXXX XXXXXXX
        if (d.length <= 4) return d;
        return d.slice(0,4) + ' ' + d.slice(4,11);
      case '+52': // MX: XXX-XXX-XXXX
        if (d.length <= 3) return d;
        if (d.length <= 6) return d.slice(0,3) + '-' + d.slice(3);
        return d.slice(0,3) + '-' + d.slice(3,6) + '-' + d.slice(6,10);
      default: // Generic: group in 3s/4s
        if (d.length <= 4) return d;
        if (d.length <= 7) return d.slice(0,3) + '-' + d.slice(3);
        return d.slice(0,3) + '-' + d.slice(3,6) + '-' + d.slice(6,10);
    }
  };

  const placeholderByCountry = (code) => {
    switch (code) {
      case '+1': return '(555) 000-0000';
      case '+44': return '7XXX-XXX-XXX';
      case '+61': return '4XXX-XXX-XXX';
      case '+33': return '6 XX XX XX XX';
      case '+49': return '1XXX XXXXXXX';
      case '+52': return 'XXX-XXX-XXXX';
      default: return 'XXX-XXX-XXXX';
    }
  };

  // Parse existing value: detect country code prefix
  const detectCode = (v) => {
    if (!v) return { cc: '+1', num: '' };
    const cleaned = v.replace(/\s/g, '');
    for (const c of COUNTRY_CODES) {
      if (cleaned.startsWith(c.code)) return { cc: c.code, num: v.slice(v.indexOf(c.code) + c.code.length).trim() };
    }
    return { cc: '+1', num: v };
  };
  const { cc, num } = detectCode(value);

  const handleCodeChange = (newCode) => {
    const { num: n } = detectCode(value);
    // Re-format number for new country
    const digits = n.replace(/\D/g, '');
    const formatted = formatByCountry(newCode, digits);
    onChange(`${newCode} ${formatted}`.trim());
  };
  const handleNumChange = (newNum) => {
    const { cc: c } = detectCode(value);
    const formatted = formatByCountry(c, newNum);
    onChange(`${c} ${formatted}`.trim());
  };

  const baseInput = inputStyle || { width: '100%', padding: '9px 12px', background: 'var(--bgInput)', border: '1px solid var(--borderSub)', borderRadius: 7, color: 'var(--text)', fontSize: 13, outline: 'none' };
  const selectSt = { ...baseInput, width: compact ? 62 : 80, padding: compact ? '3px 2px 3px 4px' : '9px 4px 9px 8px', fontSize: compact ? 9 : 11, flexShrink: 0, borderRadius: compact ? '4px 0 0 4px' : '7px 0 0 7px', borderRight: 'none', cursor: 'pointer' };
  const phoneSt = { ...baseInput, flex: 1, borderRadius: compact ? '0 4px 4px 0' : '0 7px 7px 0' };

  return (
    <div style={{ display: 'flex' }}>
      <select value={cc} onChange={e => handleCodeChange(e.target.value)} style={selectSt}>
        {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
      </select>
      <input value={num} onChange={e => handleNumChange(e.target.value)} placeholder={placeholder || placeholderByCountry(cc)} style={phoneSt} />
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
  { id: "p1", code: "", name: "Adaptive Rebrand", client: "Adaptive", status: "In-Production", projectType: "Internal", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2025-12-31", end: "" }, engagementDates: { start: "", end: "" }, location: "", why: "", budget: 0, spent: 0 },
  { id: "p2", code: "", name: "Cloonee Retainer", client: "Cloonee Touring LLC", status: "In-Production", projectType: "Touring", isTour: true, producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-01-01", end: "2026-12-31" }, engagementDates: { start: "2026-01-01", end: "2026-12-31" }, location: "Multi-City", why: "Tour Direction, Production Direction", budget: 0, spent: 0, services: ["Tour Direction", "Production Direction"], subEvents: [] },
  { id: "p3", code: "", name: "Vintage Culture Tehmplo", client: "Lost Nights", status: "Wrap", projectType: "Festival", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-01-05", end: "" }, engagementDates: { start: "", end: "" }, location: "Tulum", why: "Event Management & Ops", budget: 0, spent: 0, services: ["Event Management & Ops"] },
  { id: "p4", code: "", name: "Solomun Tehmplo", client: "Lost Nights", status: "Wrap", projectType: "Festival", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-01-09", end: "" }, engagementDates: { start: "", end: "" }, location: "Tulum", why: "Event Management & Ops", budget: 0, spent: 0, services: ["Event Management & Ops"] },
  { id: "p5", code: "", name: "Day Zero Festival 2026", client: "Crosstown Rebels", status: "Wrap", projectType: "Festival", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-01-10", end: "2026-01-11" }, engagementDates: { start: "", end: "" }, location: "Tulum", why: "", budget: 0, spent: 0 },
  { id: "p6", code: "", name: "Pegasus World Cup DJ Set", client: "Empire of the Sun", status: "Wrap", projectType: "Touring", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-01-24", end: "" }, engagementDates: { start: "", end: "" }, location: "FLL", why: "Production Management, Tour Direction", budget: 0, spent: 0, services: ["Production Management", "Tour Direction"] },
  { id: "p7", code: "", name: "Guess Jeans LA Store Opening Party", client: "Guess Jeans", status: "Wrap", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-01-29", end: "" }, engagementDates: { start: "", end: "" }, location: "LA", why: "Event Management & Ops, Talent Buying, Production Design, Experiential Design", budget: 0, spent: 0, services: ["Event Management & Ops", "Talent Buying", "Production Design", "Experiential Design"] },
  { id: "p8", code: "", name: "Prospa Prophecy Tour", client: "Kieran", status: "Exploration", projectType: "Live Event", isTour: true, producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-02-03", end: "2026-04-30" }, engagementDates: { start: "", end: "" }, location: "USA", why: "", budget: 0, spent: 0, subEvents: [] },
  { id: "p9", code: "", name: "Bloom Pop Up Event", client: "GT's Living Foods", status: "In-Production", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-03-20", end: "2026-03-22" }, engagementDates: { start: "", end: "" }, location: "LA", why: "Full Event Management", budget: 0, spent: 0, services: ["Full Event Management"] },
  { id: "p10", code: "", name: "Planet X - Cermak Hall - Chicago", client: "Ben Sterling", status: "In-Production", projectType: "Live Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-03-21", end: "" }, engagementDates: { start: "", end: "" }, location: "CHI", why: "Neon Sign + Advancing, Production Design, Production Management", budget: 0, spent: 0, services: ["Production Design", "Production Management"] },
  { id: "p11", code: "", name: "Hellbent Club Space", client: "Cloonee Touring LLC", status: "In-Production", projectType: "Live Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-03-26", end: "2026-03-27" }, engagementDates: { start: "", end: "" }, location: "MIA", why: "Neon Signs + New ones, Experiential Design and mgmt.", budget: 0, spent: 0, services: ["Experiential Design"] },
  { id: "p12", code: "", name: "Planet X MMW 2026", client: "Ben Sterling", status: "In-Production", projectType: "Live Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-03-28", end: "2026-03-29" }, engagementDates: { start: "", end: "" }, location: "MIA", why: "Integrate Neon, Prod & Fabrication, Event Management & Ops, Production Management", budget: 0, spent: 0, services: ["Fabrication", "Event Management & Ops", "Production Management"] },
  { id: "p13", code: "", name: "National Geographic Greatest Show of Earth", client: "Creative-Creation", status: "Exploration", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-04-01", end: "" }, engagementDates: { start: "", end: "" }, location: "California", why: "Full Event + Fabrication", budget: 0, spent: 0, services: ["Full Event Management", "Fabrication"] },
  { id: "p14", code: "", name: "Starbucks & Marriott Event", client: "Fimi Group", status: "Exploration", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-04-01", end: "" }, engagementDates: { start: "", end: "" }, location: "USA", why: "", budget: 0, spent: 0, notes: "https://www.youtube.co..." },
  { id: "p15", code: "", name: "ADK Coachella House", client: "GT's Living Foods", status: "In-Production", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-04-08", end: "2026-04-14" }, engagementDates: { start: "", end: "" }, location: "Indio", why: "Internal Deck", budget: 0, spent: 0 },
  { id: "p16", code: "", name: "Coachella Compound", client: "Guess Jeans", status: "In-Production", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-04-10", end: "2026-04-13" }, engagementDates: { start: "", end: "" }, location: "Indio", why: "Full Management", budget: 0, spent: 0, services: ["Event Management & Ops", "Talent Buying", "Fabrication"] },
  { id: "p17", code: "", name: "HPE Presidents Club '26", client: "Infinity Marketing", status: "In-Production", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-04-27", end: "2026-05-01" }, engagementDates: { start: "", end: "" }, location: "Portugal", why: "A/V Vendor", budget: 0, spent: 0, services: ["Event Management & Ops", "Fabrication", "Production Management"] },
  { id: "p18", code: "", name: "Guess Jeans - Berlin Kraftwerk", client: "Guess Jeans", status: "In-Production", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-05-01", end: "2026-06-30" }, engagementDates: { start: "", end: "" }, location: "BER", why: "Talent Buying, Event Management & Ops", budget: 0, spent: 0, services: ["Talent Buying", "Event Management & Ops"] },
  { id: "p19", code: "", name: "Experts Only Tofte Manor", client: "Experts Only", status: "Exploration", projectType: "Live Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-07-11", end: "2026-07-12" }, engagementDates: { start: "", end: "" }, location: "UK", why: "Experiential Design and mgmt.", budget: 0, spent: 0, services: ["Experiential Design"] },
  { id: "p20", code: "", name: "Brunelo - Mellow Circus", client: "Brunelo", status: "Exploration", projectType: "Live Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-07-11", end: "2026-07-12" }, engagementDates: { start: "", end: "" }, location: "MIA", why: "Experiential Design and mgmt.", budget: 0, spent: 0, services: ["Experiential Design"] },
  { id: "p21", code: "", name: "Experts Only NYC", client: "Experts Only", status: "Exploration", projectType: "Live Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-09-19", end: "2026-09-20" }, engagementDates: { start: "", end: "" }, location: "NYC", why: "Experiential Design and mgmt.", budget: 0, spent: 0, services: ["Experiential Design"] },
  { id: "p22", code: "", name: "Experts Only Gorge", client: "Experts Only", status: "Exploration", projectType: "Live Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-10-03", end: "2026-10-04" }, engagementDates: { start: "", end: "" }, location: "Gorge", why: "Experiential Design and mgmt.", budget: 0, spent: 0, services: ["Experiential Design"] },
  { id: "p23", code: "", name: "Syber World x UP.Summit", client: "Franklin Pictures, Inc.", status: "Exploration", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-10-09", end: "2026-10-12" }, engagementDates: { start: "", end: "" }, location: "PHX", why: "Syberworld x UP.Summit", budget: 0, spent: 0 },
  { id: "p24", code: "", name: "GT's Day of the Dead", client: "GT's Living Foods", status: "Exploration", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-10-17", end: "" }, engagementDates: { start: "", end: "" }, location: "LA", why: "Event Management & Ops", budget: 0, spent: 0, services: ["Event Management & Ops"] },
  { id: "p25", code: "", name: "Kappa Futur Festival", client: "Lost Nights", status: "Exploration", projectType: "Festival", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-11-13", end: "2026-11-14" }, engagementDates: { start: "", end: "" }, location: "MTYMX", why: "Event Management & Ops", budget: 0, spent: 0, services: ["Event Management & Ops"] },
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
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target) && (!menuRef.current || !menuRef.current.contains(e.target))) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const menuH = Math.min(220, (options.length + (allowBlank ? 1 : 0)) * 36 + 8);
      const openUp = spaceBelow < menuH && r.top > menuH;
      setPos({ top: openUp ? r.top - menuH - 4 : r.bottom + 4, left: r.left, width: Math.max(180, r.width) });
    }
    setOpen(!open);
  };
  const sc = colors?.[value];
  const displayValue = value || blankLabel || "Select...";
  const isEmpty = !value || value === "Select...";
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block", width: width || "auto" }}>
      <button ref={btnRef} onClick={handleToggle} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: sc?.bg || "var(--bgCard)", border: `1px solid ${sc?.dot || "var(--borderSub)"}40`, borderRadius: 6, color: isEmpty ? "var(--textGhost)" : (sc?.text || "var(--textSub)"), fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%", justifyContent: "space-between" }}>
        {sc && <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot }} />}
        <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayValue}</span>
        <span style={{ fontSize: 8, opacity: 0.5 }}>▼</span>
      </button>
      {open && ReactDOM.createPortal(<div ref={menuRef} style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, minWidth: 180, zIndex: 99999, background: "var(--bgHover)", border: "1px solid var(--borderActive)", borderRadius: 8, boxShadow: "0 12px 32px rgba(0,0,0,0.6)", maxHeight: 220, overflowY: "auto" }}>
        {allowBlank && <div onClick={() => { onChange(""); setOpen(false); }} style={{ padding: "8px 12px", fontSize: 12, color: "var(--textGhost)", cursor: "pointer", borderBottom: "1px solid var(--borderSub)" }} onMouseEnter={e => e.target.style.background = "var(--bgCard)"} onMouseLeave={e => e.target.style.background = "transparent"}>— None —</div>}
        {options.map(opt => <div key={opt} onClick={() => { onChange(opt); setOpen(false); }} style={{ padding: "8px 12px", fontSize: 12, color: value === opt ? "#ff6b4a" : "var(--textSub)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }} onMouseEnter={e => e.target.style.background = "var(--bgCard)"} onMouseLeave={e => e.target.style.background = "transparent"}>{colors?.[opt] && <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors[opt].dot }} />}{opt}</div>)}
      </div>, document.body)}
    </div>
  );
}

function MultiDropdown({ values, options, onChange, colorMap, renderLabel }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef(null);
  const menuRef = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target) && (!menuRef.current || !menuRef.current.contains(e.target))) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const handleToggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const menuH = Math.min(220, (options.length + (values.length > 0 ? 1 : 0)) * 32 + 8);
      const openUp = spaceBelow < menuH && r.top > menuH;
      setPos({ top: openUp ? r.top - menuH - 4 : r.bottom + 4, left: r.left, width: Math.max(200, r.width) });
    }
    setOpen(!open);
  };
  const toggle = (opt) => onChange(values.includes(opt) ? values.filter(v => v !== opt) : [...values, opt]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={handleToggle} style={{ display: "flex", gap: 3, flexWrap: "wrap", padding: "4px 8px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, cursor: "pointer", minHeight: 28, alignItems: "center" }}>
        {values.length === 0 && <span style={{ fontSize: 10, color: "var(--textGhost)" }}>Select...</span>}
        {values.map(v => <span key={v} style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: (colorMap?.[v] || "var(--textMuted)") + "20", color: colorMap?.[v] || "var(--textMuted)", fontWeight: 600, border: `1px solid ${colorMap?.[v] || "var(--textMuted)"}30` }}>{renderLabel ? renderLabel(v) : v}</span>)}
      </div>
      {open && ReactDOM.createPortal(<div ref={menuRef} style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, minWidth: 200, zIndex: 99999, background: "var(--bgHover)", border: "1px solid var(--borderActive)", borderRadius: 8, boxShadow: "0 12px 32px rgba(0,0,0,0.6)", maxHeight: 220, overflowY: "auto" }}>
        {values.length > 0 && <div onClick={() => { onChange([]); setOpen(false); }} style={{ padding: "6px 12px", fontSize: 10, color: "var(--textGhost)", cursor: "pointer", borderBottom: "1px solid var(--borderSub)" }} onMouseEnter={e => e.target.style.background = "var(--bgCard)"} onMouseLeave={e => e.target.style.background = "transparent"}>— Clear all —</div>}
        {options.map(opt => <div key={opt} onClick={() => toggle(opt)} style={{ padding: "6px 12px", fontSize: 11, color: values.includes(opt) ? "#4ecb71" : "var(--textMuted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }} onMouseEnter={e => e.target.style.background = "var(--bgCard)"} onMouseLeave={e => e.target.style.background = "transparent"}><div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${values.includes(opt) ? "#4ecb71" : "var(--borderActive)"}`, background: values.includes(opt) ? "#4ecb7120" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#4ecb71", flexShrink: 0 }}>{values.includes(opt) ? "✓" : ""}</div>{renderLabel ? renderLabel(opt) : opt}</div>)}
      </div>, document.body)}
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

function AddToProjectDropdown({ contacts, allProjectPeople, onAdd, deptOptions, onCreateContact, projectRoles: propsRoles }) {
  const PROJECT_ROLES = (propsRoles || ["Producer", "Manager", "Staff / Crew", "Client", "Point of Contact", "Billing", "Talent", "Artist", "Agent", "Venue Rep"]).slice().sort();
  const ROLE_COLORS = { Producer: "#ff6b4a", Manager: "#ff6b4a", "Staff / Crew": "#ff6b4a", Client: "#3da5db", "Point of Contact": "#9b6dff", Billing: "#4ecb71", Talent: "#e85494", Artist: "#e85494", Agent: "#dba94e", "Venue Rep": "#4ecbe8" };
  const [addOpen, setAddOpen] = useState(false);
  const [addQ, setAddQ] = useState("");
  const [addStep, setAddStep] = useState(0); // 0=search, 1=new contact form, 2=role/dept
  const [addContact, setAddContact] = useState(null);
  const [addRole, setAddRole] = useState("Point of Contact");
  const [addDept, setAddDept] = useState("");
  const [newForm, setNewForm] = useState({ firstName: "", lastName: "", phone: "", email: "", company: "", position: "", address: "" });
  const addRef = useRef(null);
  useEffect(() => { const h = (e) => { if (addRef.current && !addRef.current.contains(e.target)) { setAddOpen(false); setAddStep(0); } }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const addFiltered = (contacts || []).filter(c => c.name.toLowerCase().includes(addQ.toLowerCase()) && !allProjectPeople.find(p => p.name === c.name));

  const reset = () => { setAddOpen(false); setAddStep(0); setAddQ(""); setAddDept(""); setNewForm({ firstName: "", lastName: "", phone: "", email: "", company: "", position: "", address: "" }); };

  const inputSt = { width: "100%", padding: "7px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "var(--text)", fontSize: 11, outline: "none", boxSizing: "border-box" };
  const lblSt = { fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 3 };

  return (
    <div ref={addRef} style={{ position: "relative" }}>
      <button onClick={() => { setAddOpen(!addOpen); setAddStep(0); setAddQ(""); }} style={{ padding: "7px 14px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 7, color: "#ff6b4a", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>+ Add to Project</button>
      {addOpen && (
        <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, width: addStep === 1 ? 400 : 320, background: "var(--bgHover)", border: "1px solid var(--borderActive)", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.7)", zIndex: 60, overflow: "hidden", transition: "width 0.2s" }}>

          {/* STEP 0: Search/select contact */}
          {addStep === 0 && <>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--borderSub)", fontSize: 11, fontWeight: 700, color: "var(--textMuted)" }}>STEP 1: SELECT CONTACT</div>
            <input value={addQ} onChange={e => setAddQ(e.target.value)} placeholder="Search by name..." autoFocus style={{ width: "100%", padding: "10px 14px", background: "var(--bgInput)", border: "none", borderBottom: "1px solid var(--borderSub)", color: "var(--text)", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {addQ.trim() && !contacts.find(c => c.name.toLowerCase() === addQ.trim().toLowerCase()) && (
                <div onClick={() => {
                  const parts = addQ.trim().split(/\s+/);
                  setNewForm(f => ({ ...f, firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || "" }));
                  setAddStep(1);
                }} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 11, color: "#ff6b4a", borderBottom: "1px solid var(--borderSub)", display: "flex", alignItems: "center", gap: 8 }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgCard)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ fontSize: 14 }}>+</span> Add "{addQ.trim()}" as new contact
                </div>
              )}
              {addFiltered.map(c => (
                <div key={c.id} onClick={() => { setAddContact(c); setAddStep(2); }} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 11, color: "var(--textSub)", borderBottom: "1px solid var(--borderSub)" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgCard)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
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

          {/* STEP 1: New contact form */}
          {addStep === 1 && <>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--borderSub)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--textMuted)" }}>NEW CONTACT DETAILS</div>
              <button onClick={() => setAddStep(0)} style={{ background: "none", border: "none", color: "var(--textFaint)", cursor: "pointer", fontSize: 10 }}>← Back</button>
            </div>
            <div style={{ padding: "12px 14px", maxHeight: 400, overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div><label style={lblSt}>FIRST NAME</label><input value={newForm.firstName} onChange={e => setNewForm(f => ({ ...f, firstName: e.target.value }))} placeholder="First" autoFocus style={inputSt} /></div>
                <div><label style={lblSt}>LAST NAME</label><input value={newForm.lastName} onChange={e => setNewForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Last" style={inputSt} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div><label style={lblSt}>PHONE</label><PhoneWithCode value={newForm.phone} onChange={v => setNewForm(f => ({ ...f, phone: v }))} compact inputStyle={inputSt} /></div>
                <div><label style={lblSt}>EMAIL</label><input value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} placeholder="email@company.com" style={inputSt} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div><label style={lblSt}>COMPANY</label><input value={newForm.company} onChange={e => setNewForm(f => ({ ...f, company: e.target.value }))} placeholder="Company name" style={inputSt} /></div>
                <div><label style={lblSt}>POSITION / TITLE</label><input value={newForm.position} onChange={e => setNewForm(f => ({ ...f, position: e.target.value }))} placeholder="Title" style={inputSt} /></div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={lblSt}>ADDRESS</label>
                <AddressAutocomplete value={newForm.address} onChange={v => setNewForm(f => ({ ...f, address: v }))} showIcon={false} placeholder="123 Main St, City, State ZIP" inputStyle={inputSt} />
              </div>
              <button onClick={() => {
                const name = `${newForm.firstName} ${newForm.lastName}`.trim();
                if (!name) return;
                const contact = { id: `ct_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, name, firstName: newForm.firstName, lastName: newForm.lastName, phone: newForm.phone, email: newForm.email, company: newForm.company, position: newForm.position, address: newForm.address, department: "", notes: "", source: "project" };
                setAddContact(contact);
                setAddStep(2);
              }} disabled={!newForm.firstName && !newForm.lastName} style={{ width: "100%", padding: "8px", background: (!newForm.firstName && !newForm.lastName) ? "var(--borderSub)" : "#ff6b4a", border: "none", borderRadius: 6, color: (!newForm.firstName && !newForm.lastName) ? "var(--textFaint)" : "#fff", fontWeight: 700, cursor: (!newForm.firstName && !newForm.lastName) ? "default" : "pointer", fontSize: 11 }}>Continue to Role Assignment →</button>
            </div>
          </>}

          {/* STEP 2: Role & Department */}
          {addStep === 2 && addContact && <>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--borderSub)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--textMuted)" }}>ASSIGN ROLE & DEPARTMENT</div>
                <button onClick={() => setAddStep(addContact.source === "project" ? 1 : 0)} style={{ background: "none", border: "none", color: "var(--textFaint)", cursor: "pointer", fontSize: 10 }}>← Back</button>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{addContact.name}</div>
              <div style={{ fontSize: 10, color: "var(--textFaint)", marginTop: 1 }}>{[addContact.position, addContact.email, addContact.phone].filter(Boolean).join(" · ")}</div>
            </div>
            <div style={{ padding: "10px 14px" }}>
              <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>PROJECT ROLE</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 20 }}>
                {PROJECT_ROLES.map(r => (
                  <button key={r} onClick={() => setAddRole(r)} style={{ padding: "5px 10px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer", background: addRole === r ? (ROLE_COLORS[r] || "var(--textMuted)") + "25" : "var(--bgInput)", border: `1px solid ${addRole === r ? (ROLE_COLORS[r] || "var(--textMuted)") + "50" : "var(--borderSub)"}`, color: addRole === r ? ROLE_COLORS[r] || "var(--textMuted)" : "var(--textFaint)" }}>{r}</button>
                ))}
              </div>
              <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>DEPARTMENT <span style={{ color: "var(--textGhost)", fontWeight: 400 }}>(optional)</span></div>
              <select value={addDept} onChange={e => setAddDept(e.target.value)} style={{ width: "100%", padding: "6px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "var(--textSub)", fontSize: 11, marginBottom: 20 }}>
                <option value="">No department</option>
                {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 10 }}>
                <input type="checkbox" id="atpSaveGlobal" defaultChecked style={{ accentColor: "#ff6b4a" }} />
                <label htmlFor="atpSaveGlobal" style={{ fontSize: 10, color: "var(--textFaint)" }}>Also save to Global Partners</label>
              </div>
              <button onClick={() => {
                const saveGlobal = document.getElementById("atpSaveGlobal")?.checked;
                if (saveGlobal && onCreateContact && !contacts.find(c => c.name.toLowerCase() === addContact.name.toLowerCase())) {
                  onCreateContact({ ...addContact, department: addDept });
                }
                onAdd(addContact, addRole, addDept);
                reset();
              }} style={{ width: "100%", padding: "8px", background: "#ff6b4a", border: "none", borderRadius: 6, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Add {addContact.name} as {addRole}</button>
            </div>
          </>}

        </div>
      )}
    </div>
  );
}

function ClientSearchInput({ value, onChange, projects, clients, onAddNew }) {
  const [clientOpen, setClientOpen] = useState(false);
  const clientRef = useRef(null);
  useEffect(() => { const h = (e) => { if (clientRef.current && !clientRef.current.contains(e.target)) setClientOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  // Merge: clients from Clients tab + any project-level client names not in Clients tab
  const clientNames = [...new Set([...(clients || []).map(c => c.name), ...projects.map(p => p.client).filter(Boolean)])].sort();
  const q = value.toLowerCase();
  const filteredClients = clientNames.filter(c => c.toLowerCase().includes(q));
  const exactMatch = clientNames.some(c => c.toLowerCase() === q);
  return (
    <div ref={clientRef} style={{ position: "relative" }}>
      <input value={value} onChange={e => { onChange(e.target.value); setClientOpen(true); }} onFocus={() => setClientOpen(true)} placeholder="Search or add new client..." style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, fontWeight: 600, outline: "none" }} />
      {clientOpen && (filteredClients.length > 0 || (q && !exactMatch) || onAddNew) && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 2, background: "var(--bgHover)", border: "1px solid var(--borderActive)", borderRadius: 8, boxShadow: "0 12px 32px rgba(0,0,0,0.6)", zIndex: 70, overflow: "hidden", maxHeight: 240, overflowY: "auto" }}>
          {onAddNew && (
            <div onClick={() => { onAddNew(); setClientOpen(false); }} style={{ padding: "9px 14px", cursor: "pointer", fontSize: 11, color: "#3da5db", borderBottom: "1px solid var(--borderSub)", display: "flex", alignItems: "center", gap: 6 }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgCard)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>+</span> New Client
            </div>
          )}
          {q && !exactMatch && (
            <div onClick={() => { setClientOpen(false); }} style={{ padding: "9px 14px", cursor: "pointer", fontSize: 11, color: "#ff6b4a", borderBottom: "1px solid var(--borderSub)", display: "flex", alignItems: "center", gap: 6 }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgCard)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>+</span> Add "{value}" as new client
            </div>
          )}
          {filteredClients.map(c => {
            const clientObj = (clients || []).find(cl => cl.name === c);
            const projectCount = projects.filter(p => p.client === c).length;
            return (
              <div key={c} onClick={() => { onChange(c); setClientOpen(false); }} style={{ padding: "9px 14px", cursor: "pointer", fontSize: 12, color: "var(--textSub)", borderBottom: "1px solid var(--borderSub)", display: "flex", justifyContent: "space-between", alignItems: "center" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgCard)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div>
                  <span style={{ fontWeight: 600, color: "var(--text)" }}>{c}</span>
                  {clientObj?.code && <span style={{ marginLeft: 6, fontSize: 9, color: "#ff6b4a", fontFamily: "'JetBrains Mono', monospace" }}>{clientObj.code}</span>}
                </div>
                <span style={{ fontSize: 9, color: "var(--textFaint)" }}>{projectCount > 0 ? `${projectCount} project${projectCount !== 1 ? "s" : ""}` : "client"}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PocPullDropdown({ contacts, existingPocs, onSelect, searchLabel }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const filtered = (contacts || []).filter(c => c.name.toLowerCase().includes(query.toLowerCase()) && !(existingPocs || []).find(p => p.name === c.name));
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{ padding: "3px 8px", background: "#3da5db10", border: "1px solid #3da5db25", borderRadius: 4, color: "#3da5db", cursor: "pointer", fontSize: 9, fontWeight: 600 }}>{searchLabel || "🔍 Search Contacts"}</button>
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

function ContactListBlock({ label, items, contacts, onUpdate, onSaveToGlobal, onViewContact, copyToClipboard, showAddress, onUpdateGlobalContact, searchLabel }) {
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
          <PocPullDropdown contacts={contacts} existingPocs={items} searchLabel={searchLabel} onSelect={(c) => {
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
              <span style={{ display: "flex", alignItems: "center", flex: "1 1 120px", minWidth: 100 }}>
                <PhoneWithCode value={displayPhone} onChange={v => syncField(pi, "phone", v)} compact inputStyle={{ padding: "3px 6px", background: "transparent", border: "1px solid var(--borderSub)", borderRadius: 4, color: "var(--textMuted)", fontSize: 10, outline: "none" }} />
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
  const [forceSaveCounter, setForceSaveCounter] = useState(0);
  const saveTimeoutRef = useRef(null);
  
  // ─── LOCAL STORAGE PERSISTENCE (post-mount hydration for SSR safety) ──
  const LS_KEYS = { projects: "adptv_projects", clients: "adptv_clients", contacts: "adptv_contacts", vendors: "adptv_vendors", workback: "adptv_workback", ros: "adptv_ros", textSize: "adptv_textSize", updatedAt: "adptv_updated_at" };
  const lsHydrated = useRef(false);
  const pendingSaveRef = useRef(null); // holds the state object for beforeunload flush
  
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
  const [glanceTab, setGlanceTab] = useState("cal");
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
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  // ─── CLIENTS (COMPANY-LEVEL) ────────────────────────────────────
  const [clients, setClients] = useState([]);
  const [selectedClientIds, setSelectedClientIds] = useState(new Set());
  const [expandedClientId, setExpandedClientId] = useState(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientFilterAttr, setClientFilterAttr] = useState("");
  const [clientSort, setClientSort] = useState({ col: null, dir: "asc" });
  const [partnerSort, setPartnerSort] = useState({ col: null, dir: "asc" });
  const emptyClient = { name: "", code: "", attributes: [], address: "", city: "", state: "", zip: "", country: "", website: "", contactName: "", contactEmail: "", contactPhone: "", contactAddress: "", billingContact: "", billingEmail: "", billingPhone: "", billingAddress: "", billingNameSame: false, billingEmailSame: false, billingPhoneSame: false, billingAddressSame: false, contactNames: [], projects: [], notes: "" };
  const [clientForm, setClientForm] = useState({ ...emptyClient });
  const updateCLF = (k, v) => setClientForm(prev => ({ ...prev, [k]: v }));
  // Resizable column widths
  const defaultClientCols = [36, 190, 80, 130, 140, 170, 110, 150, 170, 140];
  const defaultPartnerCols = [36, 160, 60, 100, 100, 120, 160, 120, 110, 210, 160];
  const [clientColWidths, setClientColWidths] = useState(defaultClientCols);
  const [partnerColWidths, setPartnerColWidths] = useState(defaultPartnerCols);
  const resizeRef = useRef(null);
  const handleColResize = (setter, idx) => (e) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    resizeRef.current = { setter, idx, startX };
    const onMove = (ev) => {
      if (!resizeRef.current) return;
      const dx = ev.clientX - resizeRef.current.startX;
      resizeRef.current.startX = ev.clientX;
      resizeRef.current.setter(prev => {
        const next = [...prev];
        next[resizeRef.current.idx] = Math.max(40, next[resizeRef.current.idx] + dx);
        return next;
      });
    };
    const onUp = () => { resizeRef.current = null; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };
  const colsToGrid = (widths) => widths.map((w, i) => i === widths.length - 1 ? "auto" : w + "px").join(" ");
  const renderResizeHandle = (setter, idx) => (
    <div onMouseDown={handleColResize(setter, idx)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 7, cursor: "col-resize", zIndex: 2 }} onDoubleClick={(e) => { e.stopPropagation(); setter(prev => { const next = [...prev]; next[idx] = (idx === 0 ? 36 : idx === prev.length - 1 ? 140 : 150); return next; }); }}>
      <div className="resize-handle-line" style={{ position: "absolute", right: 3, top: "20%", bottom: "20%", width: 2, background: "var(--borderSub)", borderRadius: 1, opacity: 0.3, transition: "opacity 0.15s" }} />
    </div>
  );
  const CLIENT_ATTRIBUTES = [...new Set(["Agency", "Artist", "Audio", "Backline", "Brand", "CAD", "Candles", "Corporate", "Creative Director", "Drawings", "Experiential", "Fabrication & Scenic", "Furniture Rentals", "Individual", "LD", "Lighting", "Management", "PR", "Photo Booth", "Producer", "Production General", "Production Manager", "Promoter", "Record Label", "Site Operations", "Sponsorship", "Video", "AV/Tech", "Catering", "Crew", "Decor", "DJ/Music", "Equipment", "Floral", "Other", "Permits", "Photography", "Props", "Security", "Staffing", "Talent", "Vehicles", "Venue", "Videography"])].sort();
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
  
  // ─── TEXT SIZE SETTING ──────────────────────────────────────────
  const [textSize, setTextSize] = useState(100); // percentage: 75-130
  const textScale = textSize / 100;
  
  
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
    userPermissions: {}, // { email: { role: "owner"|"admin"|"editor"|"viewer", projectAccess: "all"|[ids], hiddenSections: [] } }
    driveConnections: [{ name: "ADMIN", folderId: "", serviceEmail: "command-center-drive@adaptive-command-center.iam.gserviceaccount.com" }],
    statuses: ["In-Production", "Pre-Production", "Wrap", "On-Hold", "Complete"],
    projectTypes: ["Brand Event", "Experiential", "Festival", "Internal", "Live Event", "Private Event", "Touring"],
    departments: [...DEPT_OPTIONS],
    resourceTypes: ["AV/Tech", "Catering", "Crew", "Decor", "DJ/Music", "Equipment", "Fabrication", "Floral", "Lighting", "Other", "Permits", "Photography", "Props", "Security", "Staffing", "Talent", "Vehicles", "Venue", "Videography"],
    projectRoles: ["Agent", "Artist", "Billing", "Client", "Manager", "Point of Contact", "Producer", "Staff / Crew", "Talent", "Venue Rep"],
    folderTemplate: [
      { name: "ADMIN", children: [
        { name: "BUDGET", children: [] },
        { name: "CREW", children: [] },
        { name: "From Client", children: [] },
        { name: "VENDORS", children: [] },
      ]},
      { name: "VENUE", children: [
        { name: "Floorplans", children: [] },
      ]},
    ],
  });
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [backupStatus, setBackupStatus] = useState(null);
  const [lastBackup, setLastBackup] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [driveDiag, setDriveDiag] = useState(null); // diagnostics result
  const [driveDiagLoading, setDriveDiagLoading] = useState(false);
  // ─── DRIVE FILE BROWSER ──────────────────────────────────────────
  const [projDriveFiles, setProjDriveFiles] = useState([]); // items in current folder
  const [projDrivePath, setProjDrivePath] = useState([]); // breadcrumb: [{id, name}, ...]
  const [projDriveLoading, setProjDriveLoading] = useState(false);
  const [projDriveUploading, setProjDriveUploading] = useState(false);
  const [projDriveEnsuring, setProjDriveEnsuring] = useState(false);
  const projDriveFileRef = useRef(null);
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
  const isAdmin = (appSettings.authorizedUsers || []).includes(user?.email) || user?.email === "billy@weareadptv.com" || user?.email === "clancy@weareadptv.com" || user?.email === "billysmith08@gmail.com";
  const isOwner = ["billy@weareadptv.com", "clancy@weareadptv.com", "billysmith08@gmail.com"].includes(user?.email);
  
  // ─── PERMISSION HELPERS ──────────────────────────────────────────
  const ROLE_OPTIONS = ["owner", "admin", "editor", "viewer"];
  const SECTION_OPTIONS = [
    { key: "overview", label: "Overview" },
    { key: "budget", label: "Budget" },
    { key: "workback", label: "Work Back" },
    { key: "ros", label: "Run of Show" },
    { key: "drive", label: "Drive" },
    { key: "vendors", label: "Contractors/Vendors" },
    { key: "eventContacts", label: "Event Contacts" },
    { key: "globalContacts", label: "Global Partners" },
    { key: "todoist", label: "Todoist" },
    { key: "macroView", label: "Macro View" },
    { key: "settings", label: "Settings" },
  ];
  const getUserPerms = (email) => {
    const p = appSettings.userPermissions?.[email];
    const ownerEmails = ["billy@weareadptv.com", "clancy@weareadptv.com", "billysmith08@gmail.com"];
    if (ownerEmails.includes(email)) return { role: "owner", projectAccess: "all", hiddenSections: [] };
    return p || { role: "editor", projectAccess: "all", hiddenSections: [] };
  };
  const [editingUserPerms, setEditingUserPerms] = useState(null); // email being configured
  const [previewingAs, setPreviewingAs] = useState(null); // email being previewed
  const currentUserPerms = previewingAs ? getUserPerms(previewingAs) : getUserPerms(user?.email);
  const canSeeProject = (projectId) => {
    if (!previewingAs && (currentUserPerms.role === "owner" || currentUserPerms.role === "admin")) return true;
    if (previewingAs && (getUserPerms(previewingAs).role === "owner" || getUserPerms(previewingAs).role === "admin")) return true;
    if (currentUserPerms.projectAccess === "all") return true;
    return (currentUserPerms.projectAccess || []).includes(projectId);
  };
  const canSeeSection = (sectionKey) => {
    if (!previewingAs && (currentUserPerms.role === "owner" || currentUserPerms.role === "admin")) return true;
    if (previewingAs && (getUserPerms(previewingAs).role === "owner" || getUserPerms(previewingAs).role === "admin")) return true;
    return !(currentUserPerms.hiddenSections || []).includes(sectionKey);
  };
  
  const [showPrintROS, setShowPrintROS] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState(null);
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
  const defaultContacts = [
    { id: "ct_billy", name: "Billy Smith", firstName: "Billy", lastName: "Smith", phone: "+1 (310) 986-5581", email: "billy@weareadptv.com", company: "Adaptive by Design", position: "Executive Producer", department: "Leadership", notes: "Work: +1 (310) 853-3497 · Intl: +1 (424) 375-5699 · Personal: billysmith08@gmail.com · Home: 15 Wavecrest Ave, Venice CA 90291 · Office: 133 Horizon Ave, Venice CA 90291", source: "system" },
    { id: "ct_clancy", name: "Clancy Silver", firstName: "Clancy", lastName: "Silver", phone: "+1 (323) 532-3555", email: "clancy@weareadptv.com", company: "Adaptive by Design", position: "Executive Producer", department: "Leadership", notes: "Work: (310) 853-3497 · WhatsApp: +1 (323) 532-3555 · Also: clancy@auxx.co · clancy.silver@gmail.com · Office: 133 Horizon Ave, Venice CA 90291", source: "system" },
    { id: "ct_eden", name: "Eden Sweeden", firstName: "Eden", lastName: "Sweeden", phone: "+1 (310) 625-2453", email: "eden@weareadptv.com", company: "Adaptive by Design", position: "", department: "", notes: "Personal: edenschroder@icloud.com · Birthday: January 8, 1989", source: "system" },
  ];
  const [contacts, setContacts] = useState(defaultContacts);
  const [contactSearch, setContactSearch] = useState("");
  const [contactFilterType, setContactFilterType] = useState("");
  const [contactFilterResource, setContactFilterResource] = useState("");
  const [todoistKey, setTodoistKey] = useState("564b99b7c52b83c83ab621c45b75787f65c6190a");
  const [todoistTasks, setTodoistTasks] = useState([]);
  const [todoistProjects, setTodoistProjects] = useState([]);
  const [todoistLoading, setTodoistLoading] = useState(false);
  const [todoistNewTask, setTodoistNewTask] = useState("");
  const [todoistFilter, setTodoistFilter] = useState("all"); // all, today, overdue, project id
  const [adptvWorkspaceId, setAdptvWorkspaceId] = useState(null);
  const [todoistSections, setTodoistSections] = useState([]);
  const [todoistCollaborators, setTodoistCollaborators] = useState([]);
  const [todoistAutoLinking, setTodoistAutoLinking] = useState(false);
  const [todoistEditingTask, setTodoistEditingTask] = useState(null);
  const [todoistComments, setTodoistComments] = useState({});
  const [todoistNewComment, setTodoistNewComment] = useState("");
  const [todoistNewSection, setTodoistNewSection] = useState("");
  const [todoistAddingSection, setTodoistAddingSection] = useState(false);
  const [todoistNewTaskSection, setTodoistNewTaskSection] = useState(null);
  const todoistAutoLinkRef = useRef({});
  // ─── HYDRATE FROM LOCALSTORAGE (runs once after mount) ──────────
  useEffect(() => {
    if (lsHydrated.current) return;
    lsHydrated.current = true;
    try {
      const g = (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } };
      const savedProjects = g(LS_KEYS.projects);
      if (savedProjects && savedProjects.length > 0) {
        const defaults = initProjects();
        // Saved data always wins — only add missing STRUCTURAL keys from defaults (arrays, objects), never overwrite saved values
        const merged = savedProjects.map(p => {
          const def = defaults.find(d => d.id === p.id);
          if (!def) return p;
          // Start from saved data, only fill in keys that are completely missing
          const result = { ...p };
          Object.keys(def).forEach(k => {
            if (!(k in result)) result[k] = def[k];
          });
          return result;
        });
        const savedIds = new Set(savedProjects.map(p => p.id));
        const brandNew = defaults.filter(d => !savedIds.has(d.id));
        setProjects([...merged, ...brandNew]);
      }
      const savedClients = g(LS_KEYS.clients);
      if (savedClients && savedClients.length > 0) {
        const nameMap = { "Amjad Asad": "Amjad Masad", "Ayita": "AYITA", "GUESS?, Inc": "Guess", "GUESS?, Inc.": "Guess", "NVE": "NVE Experience Agency, LLC", "Sequel Inc": "Sequel Marketing", "Franklin Pictures": "Franklin Pictures, Inc.", "Franklin Pictures, Inc": "Franklin Pictures, Inc.", "Brunello": "Brunelo" };
        const migrated = savedClients.map(c => ({ ...c, name: nameMap[c.name] || c.name }));
        const seen = new Set();
        const deduped = migrated.filter(c => { const k = c.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
        setClients(deduped);
      }
      const savedContacts = g(LS_KEYS.contacts);
      if (savedContacts && savedContacts.length > 0) setContacts(savedContacts);
      const savedVendors = g(LS_KEYS.vendors);
      if (savedVendors && Object.keys(savedVendors).length > 0) setProjectVendors(savedVendors);
      const savedWB = g(LS_KEYS.workback);
      if (savedWB && Object.keys(savedWB).length > 0) setProjectWorkback(savedWB);
      const savedROS = g(LS_KEYS.ros);
      if (savedROS && Object.keys(savedROS).length > 0) setProjectROS(savedROS);
      const savedTS = g(LS_KEYS.textSize);
      if (savedTS) setTextSize(savedTS);
    } catch (e) { console.warn("localStorage hydration failed:", e); }
  }, []);
  // ─── AUTO-SAVE TO LOCALSTORAGE (skip initial render) ────────────
  const saveSkipRef = useRef(true);
  const stampLS = () => { try { localStorage.setItem(LS_KEYS.updatedAt, new Date().toISOString()); } catch {} };
  useEffect(() => { if (saveSkipRef.current) return; try { localStorage.setItem(LS_KEYS.projects, JSON.stringify(projects)); stampLS(); } catch {} }, [projects]);
  useEffect(() => { if (saveSkipRef.current) return; try { localStorage.setItem(LS_KEYS.clients, JSON.stringify(clients)); stampLS(); } catch {} }, [clients]);
  useEffect(() => { if (saveSkipRef.current) return; try { localStorage.setItem(LS_KEYS.contacts, JSON.stringify(contacts)); stampLS(); } catch {} }, [contacts]);
  useEffect(() => { if (saveSkipRef.current) return; try { localStorage.setItem(LS_KEYS.vendors, JSON.stringify(projectVendors)); stampLS(); } catch {} }, [projectVendors]);
  useEffect(() => { if (saveSkipRef.current) return; try { localStorage.setItem(LS_KEYS.workback, JSON.stringify(projectWorkback)); stampLS(); } catch {} }, [projectWorkback]);
  useEffect(() => { if (saveSkipRef.current) return; try { localStorage.setItem(LS_KEYS.ros, JSON.stringify(projectROS)); stampLS(); } catch {} }, [projectROS]);
  useEffect(() => { if (saveSkipRef.current) return; try { localStorage.setItem(LS_KEYS.textSize, JSON.stringify(textSize)); } catch {} }, [textSize]);
  useEffect(() => { saveSkipRef.current = false; }, []);

  // Undo/Redo history
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const pushUndo = useCallback((label) => {
    undoStack.current.push({ label, projects: JSON.stringify(projects), clients: JSON.stringify(clients), contacts: JSON.stringify(contacts) });
    if (undoStack.current.length > 30) undoStack.current.shift();
    redoStack.current = [];
  }, [projects, clients, contacts]);
  const doUndo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const snap = undoStack.current.pop();
    redoStack.current.push({ label: snap.label, projects: JSON.stringify(projects), clients: JSON.stringify(clients), contacts: JSON.stringify(contacts) });
    saveSkipRef.current = true;
    setProjects(JSON.parse(snap.projects));
    setClients(JSON.parse(snap.clients));
    setContacts(JSON.parse(snap.contacts));
    setTimeout(() => { saveSkipRef.current = false; }, 100);
    setClipboardToast({ text: `↩ Undo: ${snap.label}`, x: window.innerWidth / 2, y: 60 }); setTimeout(() => setClipboardToast(null), 2000);
  }, [projects, clients, contacts]);
  const doRedo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const snap = redoStack.current.pop();
    undoStack.current.push({ label: snap.label, projects: JSON.stringify(projects), clients: JSON.stringify(clients), contacts: JSON.stringify(contacts) });
    saveSkipRef.current = true;
    setProjects(JSON.parse(snap.projects));
    setClients(JSON.parse(snap.clients));
    setContacts(JSON.parse(snap.contacts));
    setTimeout(() => { saveSkipRef.current = false; }, 100);
    setClipboardToast({ text: `↪ Redo: ${snap.label}`, x: window.innerWidth / 2, y: 60 }); setTimeout(() => setClipboardToast(null), 2000);
  }, [projects, clients, contacts]);

  // Keyboard shortcuts: Esc to close, Cmd+Z undo, Cmd+Y/Shift+Cmd+Z redo
  useEffect(() => {
    const handler = (e) => {
      // ESC closes modals (priority order)
      if (e.key === "Escape") {
        if (showSettings) { setShowSettings(false); e.preventDefault(); return; }
        if (docPreview) { setDocPreview(null); e.preventDefault(); return; }
        if (showAddProject) { setShowAddProject(false); e.preventDefault(); return; }
        if (showAddContact) { setShowAddContact(false); e.preventDefault(); return; }
        if (showAddClient) { setShowAddClient(false); e.preventDefault(); return; }
        if (showAddVendor) { setShowAddVendor(false); e.preventDefault(); return; }
        if (showPrintROS) { setShowPrintROS(false); e.preventDefault(); return; }
        if (showVersionHistory) { setShowVersionHistory(false); e.preventDefault(); return; }
        if (showActivityFeed) { setShowActivityFeed(false); e.preventDefault(); return; }
        if (assignContactPopover) { setAssignContactPopover(null); e.preventDefault(); return; }
        if (contactPopover) { setContactPopover(null); e.preventDefault(); return; }
        if (contextMenu) { setContextMenu(null); e.preventDefault(); return; }
      }
      // Cmd+S / Ctrl+S = Force save to Supabase
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        setForceSaveCounter(c => c + 1);
        return;
      }
      // Cmd+Z / Ctrl+Z = Undo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        doUndo();
        return;
      }
      // Cmd+Y or Cmd+Shift+Z = Redo
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        doRedo();
        return;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showSettings, showAddProject, showAddContact, showAddClient, showAddVendor, showPrintROS, showVersionHistory, showActivityFeed, assignContactPopover, contactPopover, contextMenu, docPreview, doUndo, doRedo]);
  const todoistFetch = useCallback(async (key) => {
    const k = key || todoistKey; if (!k) return;
    setTodoistLoading(true);
    // Helper: proxy all Todoist calls through /api/todoist to avoid CORS
    const tp = (endpoint, opts = {}) => fetch("/api/todoist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint, apiKey: k, method: opts.method || "GET", headers: opts.headers, body: opts.body })
    }).then(r => r.json());
    try {
      // Use Sync API for everything — REST endpoints return 410
      const syncData = await tp("/api/v1/sync", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "sync_token=*&resource_types=[\"items\",\"projects\",\"sections\",\"collaborators\",\"notes\"]"
      });
      const syncProjects = syncData.projects || [];
      const syncItems = (syncData.items || []).filter(i => !i.checked && !i.is_deleted);
      // Map Sync items to REST-like task format for UI compatibility
      const mappedTasks = syncItems.map(i => ({
        id: i.id,
        content: i.content,
        description: i.description || "",
        project_id: i.project_id,
        section_id: i.section_id,
        priority: i.priority || 1,
        due: i.due,
        order: i.child_order || i.item_order || 0,
        assignee_id: i.responsible_uid,
        labels: i.labels || [],
      }));
      // Map Sync projects to REST-like format
      const mappedProjects = syncProjects.filter(p => !p.is_deleted && !p.is_archived).map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        order: p.child_order || p.item_order || 0,
        workspace_id: p.workspace_id,
        shared: p.shared || false,
        inbox_project: p.inbox_project || false,
      }));
      setTodoistTasks(mappedTasks);
      setTodoistProjects(mappedProjects);
      // Store sections from Sync API
      const syncSections = (syncData.sections || []).filter(s => !s.is_deleted && !s.is_archived);
      if (syncSections.length > 0) {
        setTodoistSections(syncSections.map(s => ({ id: s.id, name: s.name, project_id: s.project_id, order: s.section_order || 0 })));
      }
      // Store collaborators from Sync API
      const syncCollabs = syncData.collaborators || [];
      if (syncCollabs.length > 0) {
        setTodoistCollaborators(syncCollabs.map(c => ({ id: c.id, name: c.full_name || c.email, email: c.email })));
      }
      // Store notes/comments grouped by task
      const syncNotes = (syncData.notes || []).filter(n => !n.is_deleted);
      if (syncNotes.length > 0) {
        const grouped = {};
        syncNotes.forEach(n => {
          if (!grouped[n.item_id]) grouped[n.item_id] = [];
          grouped[n.item_id].push({ id: n.id, content: n.content, posted_at: n.posted_at || n.posted, posted_uid: n.posted_uid });
        });
        // Sort each group by date
        Object.values(grouped).forEach(arr => arr.sort((a, b) => (a.posted_at || "").localeCompare(b.posted_at || "")));
        setTodoistComments(grouped);
      }
      console.log("Todoist loaded:", mappedProjects.length, "projects,", mappedTasks.length, "tasks,", syncSections.length, "sections,", syncCollabs.length, "collaborators,", syncNotes.length, "comments");
      // Extract workspace
      const adptvProj = syncProjects.find(p => p.name === "ADPTV CATCH ALL" || p.name?.toUpperCase() === "ADPTV" || p.name === "Team Inbox");
      if (adptvProj?.workspace_id) {
        setAdptvWorkspaceId(adptvProj.workspace_id);
        console.log("ADPTV workspace found:", adptvProj.workspace_id, "via:", adptvProj.name);
      } else {
        const teamProj = syncProjects.find(p => p.workspace_id && !p.inbox_project && p.shared);
        if (teamProj?.workspace_id) {
          setAdptvWorkspaceId(teamProj.workspace_id);
          console.log("ADPTV workspace found (fallback):", teamProj.workspace_id, "via:", teamProj.name);
        } else {
          const anyWs = syncProjects.find(p => p.workspace_id && p.workspace_id !== "0" && !p.inbox_project);
          if (anyWs?.workspace_id) {
            setAdptvWorkspaceId(anyWs.workspace_id);
            console.log("ADPTV workspace found (any):", anyWs.workspace_id, "via:", anyWs.name);
          } else {
            console.warn("No ADPTV workspace_id found in", syncProjects.length, "projects");
          }
        }
      }
    } catch (e) { console.error("Todoist:", e); }
    setTodoistLoading(false);
  }, [todoistKey]);
  const todoistProxy = useCallback((endpoint, opts = {}) => fetch("/api/todoist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, apiKey: todoistKey, method: opts.method || "GET", headers: opts.headers, body: opts.body })
  }).then(r => r.json()), [todoistKey]);

  // Sync API command helper — all writes go through here
  const todoistSyncCmd = useCallback(async (commands) => {
    const data = await todoistProxy("/api/v1/sync", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `commands=${encodeURIComponent(JSON.stringify(commands))}`
    });
    if (data.sync_status) {
      const errors = Object.values(data.sync_status).filter(s => s?.error);
      if (errors.length > 0) console.error("Todoist sync errors:", errors);
    }
    return data;
  }, [todoistProxy]);

  const todoistAdd = async () => {
    if (!todoistNewTask.trim() || !todoistKey) return;
    const tempId = "task_" + Date.now();
    await todoistSyncCmd([{ type: "item_add", temp_id: tempId, uuid: tempId, args: { content: todoistNewTask.trim() } }]);
    setTodoistNewTask("");
    await todoistFetch();
  };
  const todoistClose = async (id) => {
    const uuid = "close_" + Date.now();
    await todoistSyncCmd([{ type: "item_complete", uuid, args: { id } }]);
    setTodoistTasks(prev => prev.filter(t => t.id !== id));
  };
  const todoistDelete = async (id) => {
    const uuid = "del_" + Date.now();
    await todoistSyncCmd([{ type: "item_delete", uuid, args: { id } }]);
    setTodoistTasks(prev => prev.filter(t => t.id !== id));
  };
  const todoistCreateProject = async (projectCode) => {
    if (!todoistKey || !projectCode) { 
      setClipboardToast({ text: "Todoist: No API key or project code", x: window.innerWidth / 2, y: 60 });
      setTimeout(() => setClipboardToast(null), 3000);
      return null; 
    }
    try {
      const tempId = "proj_" + Date.now();
      const args = { name: projectCode };
      if (adptvWorkspaceId) args.workspace_id = adptvWorkspaceId;
      const data = await todoistSyncCmd([{ type: "project_add", temp_id: tempId, uuid: tempId, args }]);
      const newId = data.temp_id_mapping?.[tempId];
      if (newId) {
        console.log("Created Todoist project:", projectCode, "id:", newId, "workspace:", adptvWorkspaceId || "default");
        await todoistFetch();
        return newId;
      }
      console.error("Todoist project create failed:", data);
      setClipboardToast({ text: "Failed to create Todoist project — check console", x: window.innerWidth / 2, y: 60 });
      setTimeout(() => setClipboardToast(null), 4000);
    } catch (e) { 
      console.error("Todoist create:", e);
      setClipboardToast({ text: `Todoist error: ${e.message}`, x: window.innerWidth / 2, y: 60 });
      setTimeout(() => setClipboardToast(null), 4000);
    }
    return null;
  };
  const todoistAddTaskToProject = async (content, projectId, sectionId) => {
    if (!todoistKey || !content || !projectId) return;
    const tempId = "task_" + Date.now();
    const args = { content, project_id: projectId };
    if (sectionId) args.section_id = sectionId;
    await todoistSyncCmd([{ type: "item_add", temp_id: tempId, uuid: tempId, args }]);
    await todoistFetch();
  };

  // Sections and collaborators are now loaded by todoistFetch via Sync API
  // This is kept as a lightweight refresh for a single project
  const todoistFetchProjectDetails = async (projectId) => {
    // Sync already loads sections + collaborators, just re-fetch all data
    await todoistFetch();
  };

  // All sections already loaded by todoistFetch
  const todoistFetchAllSections = async () => {
    await todoistFetch();
  };

  // Section and task CRUD via Sync API
  const todoistCreateSection = async (name, projectId) => {
    if (!todoistKey || !name || !projectId) return;
    const tempId = "sec_" + Date.now();
    await todoistSyncCmd([{ type: "section_add", temp_id: tempId, uuid: tempId, args: { name, project_id: projectId } }]);
    await todoistFetch();
  };
  const todoistDeleteSection = async (sectionId, projectId) => {
    if (!todoistKey || !sectionId) return;
    const uuid = "secdel_" + Date.now();
    await todoistSyncCmd([{ type: "section_delete", uuid, args: { id: sectionId } }]);
    await todoistFetch();
  };
  const todoistUpdateTask = async (taskId, updates) => {
    if (!todoistKey || !taskId) return;
    const uuid = "upd_" + Date.now();
    await todoistSyncCmd([{ type: "item_update", uuid, args: { id: taskId, ...updates } }]);
    await todoistFetch();
  };
  const todoistAddComment = async (taskId, content) => {
    if (!todoistKey || !taskId || !content) return;
    const tempId = "note_" + Date.now();
    await todoistSyncCmd([{ type: "note_add", temp_id: tempId, uuid: tempId, args: { item_id: taskId, content } }]);
    await todoistFetch();
  };
  const todoistMoveTask = async (taskId, sectionId) => {
    if (!todoistKey || !taskId) return;
    const uuid = "move_" + Date.now();
    const args = { id: taskId };
    if (sectionId) { args.section_id = sectionId; } else { args.section_id = null; }
    await todoistSyncCmd([{ type: "item_move", uuid, args }]);
    await todoistFetch();
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
    const adr = get("ADR");
    const address = adr ? adr.split(";").filter(Boolean).join(", ") : "";
    const nameParts = fn.split(" ");
    return { name: fn, firstName: nameParts[0] || "", lastName: nameParts.slice(1).join(" ") || "", phone: tel, email, company: org, position: title, department: "", address, notes: "" };
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
      const text = ev.target.result.replace(/^\uFEFF/, ""); // Strip BOM
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return;
      // Parse header row
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
      const nameIdx = headers.findIndex(h => h === "name" || h === "full name" || h === "fullname" || h === "company name" || h === "contact name");
      const firstIdx = headers.findIndex(h => h === "first name" || h === "firstname" || h === "first");
      const lastIdx = headers.findIndex(h => h === "last name" || h === "lastname" || h === "last");
      const emailIdx = headers.findIndex(h => h === "email" || h === "e-mail" || h === "email address");
      const phoneIdx = headers.findIndex(h => h === "phone" || h === "telephone" || h === "phone number" || h === "mobile");
      const companyIdx = headers.findIndex(h => h === "company" || h === "organization" || h === "org");
      const positionIdx = headers.findIndex(h => h === "position" || h === "title" || h === "job title" || h === "role");
      const deptIdx = headers.findIndex(h => h === "department" || h === "dept");
      const addressIdx = headers.findIndex(h => h === "address" || h === "street" || h === "location" || h === "mailing address");
      const notesIdx = headers.findIndex(h => h === "notes" || h === "note" || h === "comments");
      const projectIdx = headers.findIndex(h => h.includes("project") || h.includes("client of"));
      const contactLinkIdx = headers.findIndex(h => h.includes("contact") && h.includes("link"));
      // Auto-detect CSV type: if "company name" is the name column, this is a client/company CSV
      const isClientCSV = headers.some(h => h === "company name" || h.includes("client of"));
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
          company: companyIdx >= 0 ? (cols[companyIdx] || "") : (isClientCSV ? fullName : ""),
          position: positionIdx >= 0 ? (cols[positionIdx] || "") : "",
          department: deptIdx >= 0 ? (cols[deptIdx] || "") : "",
          address: addressIdx >= 0 ? (cols[addressIdx] || "") : "",
          contactType: isClientCSV ? "Client" : "",
          notes: [
            notesIdx >= 0 ? (cols[notesIdx] || "") : "",
            projectIdx >= 0 && cols[projectIdx] ? `Projects: ${cols[projectIdx]}` : "",
            contactLinkIdx >= 0 && cols[contactLinkIdx] ? `Contacts: ${cols[contactLinkIdx]}` : "",
          ].filter(Boolean).join("\n"),
          source: "csv"
        });
      }
      setContacts(prev => {
        const existing = new Set(prev.map(c => c.name.toLowerCase()));
        const unique = newContacts.filter(c => !existing.has(c.name.toLowerCase()));
        if (unique.length > 0) {
          const label = isClientCSV ? "client" : "contact";
          setClipboardToast({ text: `Imported ${unique.length} ${label}${unique.length > 1 ? "s" : ""} from CSV`, x: window.innerWidth / 2, y: 60 });
          setTimeout(() => setClipboardToast(null), 3000);
        }
        return [...prev, ...unique];
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ─── CLIENTS CSV IMPORT (ALL_COMPANIES format) ─────────────────
  // ─── CSV EXPORT ─────────────────────────────────────────────
  const exportCSV = (rows, headers, filename) => {
    const esc = (v) => { const s = String(v ?? ""); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = [headers.map(esc).join(","), ...rows.map(r => r.map(esc).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  const exportPartners = () => {
    const headers = ["Name", "Type", "Resource Type", "Position", "Phone", "Email", "Address", "Company", "Client Association", "Notes"];
    const rows = contacts.map(c => [c.name, c.contactType || "", c.resourceType || "", c.position || "", c.phone || "", c.email || "", c.address || "", c.company || "", c.clientAssociation || "", c.notes || ""]);
    exportCSV(rows, headers, `ADPTV-Partners-${new Date().toISOString().slice(0, 10)}.csv`);
  };
  const exportClients = () => {
    const headers = ["Company Name", "Company Code", "Attributes", "Company Contact", "Contact Email", "Contact Phone", "Billing Contact", "Billing Email", "Billing Phone", "Address", "Website", "Notes"];
    const rows = clients.map(c => [c.name, c.code || "", (c.attributes || []).join("; "), c.contactName || c.companyContact || "", c.contactEmail || "", c.contactPhone || "", c.billingContact || "", c.billingEmail || "", c.billingPhone || "", c.address || "", c.website || "", c.notes || ""]);
    exportCSV(rows, headers, `ADPTV-Clients-${new Date().toISOString().slice(0, 10)}.csv`);
  };
  const emailExport = (type) => {
    const to = "clancy@weareadptv.com,billy@weareadptv.com";
    const subject = encodeURIComponent(`ADPTV ${type} Export - ${new Date().toLocaleDateString()}`);
    window.open(`mailto:${to}?subject=${subject}&body=${encodeURIComponent(`See attached ${type} export from the ADPTV Dashboard.`)}`);
    if (type === "Partners") exportPartners(); else exportClients();
  };

  const handleClientsCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result.replace(/^\uFEFF/, "");
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return;
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
      const headers = parseCSVRow(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, ""));
      const idx = (patterns) => headers.findIndex(h => patterns.some(p => h.includes(p)));
      const nameI = idx(["company name"]);
      const codeI = idx(["company code"]);
      const typeI = idx(["company type"]);
      const relI = idx(["relationship"]);
      const attrI = idx(["attributes"]);
      const locI = idx(["location"]);
      const contactsI = idx(["company contact"]);
      const webI = idx(["website"]);
      const billContactI = idx(["billing contact"]);
      const billPhoneI = idx(["phone (from billing"]);
      const billEmailI = idx(["email (from billing"]);
      const addrI = idx(["company address combined"]);
      const streetI = idx(["company address"]);
      const cityI = idx(["company city"]);
      const stateI = idx(["company state"]);
      const zipI = idx(["company zip"]);
      const countryI = idx(["company country"]);
      const clientProjI = idx(["client of project"]);
      const vendorProjI = idx(["vendor of project"]);
      const newClients = [];
      const newContacts = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVRow(lines[i]);
        const name = nameI >= 0 ? (cols[nameI] || "").trim().replace(/\s+COMPANY$/i, "") : "";
        if (!name) continue;
        // Filter: only clients (Customers / Clients or Customer relationship)
        const compType = typeI >= 0 ? (cols[typeI] || "") : "";
        const rel = relI >= 0 ? (cols[relI] || "") : "";
        const isClient = compType.toLowerCase().includes("client") || compType.toLowerCase().includes("customer") || rel.toLowerCase().includes("customer");
        if (!isClient) continue;
        const phone = (billPhoneI >= 0 ? (cols[billPhoneI] || "") : "").replace(/^'+/, "");
        const email = billEmailI >= 0 ? (cols[billEmailI] || "") : "";
        const billingContact = billContactI >= 0 ? (cols[billContactI] || "") : "";
        const website = webI >= 0 ? (cols[webI] || "") : "";
        const address = addrI >= 0 ? (cols[addrI] || "") : "";
        const street = streetI >= 0 ? (cols[streetI] || "") : "";
        const city = cityI >= 0 ? (cols[cityI] || "") : "";
        const state = stateI >= 0 ? (cols[stateI] || "") : "";
        const zip = zipI >= 0 ? (cols[zipI] || "") : "";
        const country = countryI >= 0 ? (cols[countryI] || "") : "";
        const code = codeI >= 0 ? (cols[codeI] || "") : "";
        const attrs = attrI >= 0 ? (cols[attrI] || "").split(",").map(a => a.trim()).filter(Boolean) : [];
        const location = locI >= 0 ? (cols[locI] || "") : "";
        const contactNames = contactsI >= 0 ? (cols[contactsI] || "").split(",").map(n => n.trim()).filter(Boolean) : [];
        const clientProjects = clientProjI >= 0 ? (cols[clientProjI] || "").split(",").map(p => p.trim()).filter(Boolean) : [];
        newClients.push({
          id: `cl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name, code, attributes: attrs,
          address: address || [street, city, state, zip, country].filter(Boolean).join(", "),
          city, state, zip, country,
          website, contactName: billingContact, contactEmail: email, contactPhone: phone,
          contactAddress: address || [street, city, state, zip, country].filter(Boolean).join(", "),
          billingContact, billingEmail: email, billingPhone: phone,
          billingAddress: address || [street, city, state, zip, country].filter(Boolean).join(", "),
          billingNameSame: true, billingEmailSame: true, billingPhoneSame: true, billingAddressSame: true,
          contactNames, projects: clientProjects,
          location, notes: "", source: "csv"
        });
        // Mirror billing contact to Global Partners
        if (billingContact) {
          newContacts.push({
            id: `ct_${Date.now()}_${Math.random().toString(36).substr(2, 6)}_b`,
            name: billingContact, firstName: billingContact.split(" ")[0] || "", lastName: billingContact.split(" ").slice(1).join(" ") || "",
            email, phone, company: name, position: "Billing Contact", contactType: "Client",
            department: "", address: "", resourceType: "", vendorName: name, clientAssociation: name, notes: `Billing contact for ${name}`, source: "csv"
          });
        }
        // Mirror other company contacts
        contactNames.forEach((cn, ci) => {
          if (cn && cn !== billingContact) {
            newContacts.push({
              id: `ct_${Date.now()}_${Math.random().toString(36).substr(2, 6)}_c${ci}`,
              name: cn, firstName: cn.split(" ")[0] || "", lastName: cn.split(" ").slice(1).join(" ") || "",
              email: "", phone: "", company: name, position: "Contact", contactType: "Client",
              department: "", address: "", resourceType: "", vendorName: name, clientAssociation: name, notes: `Contact for ${name}`, source: "csv"
            });
          }
        });
      }
      setClients(prev => {
        const existing = new Set(prev.map(c => c.name.toLowerCase()));
        const unique = newClients.filter(c => !existing.has(c.name.toLowerCase()));
        if (unique.length > 0) {
          setClipboardToast({ text: `Imported ${unique.length} client${unique.length > 1 ? "s" : ""} from CSV`, x: window.innerWidth / 2, y: 60 });
          setTimeout(() => setClipboardToast(null), 3000);
        } else if (newClients.length > 0) {
          setClipboardToast({ text: `All ${newClients.length} clients already exist`, x: window.innerWidth / 2, y: 60 });
          setTimeout(() => setClipboardToast(null), 3000);
        }
        return [...prev, ...unique];
      });
      // Also add contacts to Global Partners (deduplicated)
      if (newContacts.length > 0) {
        setContacts(prev => {
          const existing = new Set(prev.map(c => c.name.toLowerCase()));
          return [...prev, ...newContacts.filter(c => !existing.has(c.name.toLowerCase()))];
        });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ─── SAVE / EDIT CLIENT ────────────────────────────────────────
  const submitClient = () => {
    if (!clientForm.name) return;
    const form = { ...clientForm };
    if (form.billingNameSame) form.billingContact = form.contactName;
    if (form.billingEmailSame) form.billingEmail = form.contactEmail;
    if (form.billingPhoneSame) form.billingPhone = form.contactPhone;
    if (form.billingAddressSame) form.billingAddress = form.contactAddress;
    if (form.id) {
      setClients(prev => prev.map(c => c.id === form.id ? { ...form } : c));
      // Mirror: update matching Global Partners contacts
      setContacts(prev => prev.map(c => {
        if (c.company === form.name && c.position === "Billing Contact") {
          return { ...c, name: form.billingContact, email: form.billingEmail, phone: form.billingPhone, address: form.billingAddress };
        }
        if (c.company === form.name && c.position === "Client Contact") {
          return { ...c, name: form.contactName, email: form.contactEmail, phone: form.contactPhone, address: form.contactAddress };
        }
        return c;
      }));
    } else {
      const newClient = { ...form, id: `cl_${Date.now()}` };
      setClients(prev => [...prev, newClient]);
      // Auto-create client contact in Global Partners
      if (form.contactName) {
        const cc = {
          id: `ct_${Date.now()}_cc`, name: form.contactName,
          firstName: form.contactName.split(" ")[0] || "", lastName: form.contactName.split(" ").slice(1).join(" ") || "",
          email: form.contactEmail || "", phone: form.contactPhone || "",
          company: form.name, position: "Client Contact", contactType: "Client",
          department: "", address: form.contactAddress || "", resourceType: "", vendorName: form.name,
          notes: `Client contact for ${form.name}`, source: "client"
        };
        setContacts(prev => {
          if (prev.some(c => c.name.toLowerCase() === cc.name.toLowerCase() && c.company === form.name)) return prev;
          return [...prev, cc];
        });
      }
      // Auto-create billing contact in Global Partners (if different)
      if (form.billingContact && form.billingContact !== form.contactName) {
        const bc = {
          id: `ct_${Date.now()}_bc`, name: form.billingContact,
          firstName: form.billingContact.split(" ")[0] || "", lastName: form.billingContact.split(" ").slice(1).join(" ") || "",
          email: form.billingEmail || "", phone: form.billingPhone || "",
          company: form.name, position: "Billing Contact", contactType: "Client",
          department: "", address: form.billingAddress || "", resourceType: "", vendorName: form.name,
          notes: `Billing contact for ${form.name}`, source: "client"
        };
        setContacts(prev => {
          if (prev.some(c => c.name.toLowerCase() === bc.name.toLowerCase() && c.company === form.name)) return prev;
          return [...prev, bc];
        });
      }
    }
    setClientForm({ ...emptyClient });
    setShowAddClient(false);
  };

  const emptyContact = { name: "", vendorName: "", firstName: "", lastName: "", phone: "", email: "", company: "", position: "", department: "", address: "", resourceType: "", contactType: "", clientAssociation: "", notes: "", source: "manual" };
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

  // Project code generator: YY-CLIENT-PROJECT-LOCATION
  const generateProjectCode = (p) => {
    const clean = (s) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
    const yr = p.eventDates?.start ? p.eventDates.start.slice(2, 4) : new Date().getFullYear().toString().slice(2);
    const client = clean(p.client).slice(0, 8) || "CLIENT";
    const proj = clean(p.name).slice(0, 14) || "PROJECT";
    const loc = clean(p.location?.split(",")[0]).slice(0, 8) || "TBD";
    return `${yr}-${client}-${proj}-${loc}`;
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
    // Auto-create Drive folder if client + code are set
    if (newP.client && code) {
      setTimeout(() => ensureProjectDrive(newP), 500);
    }
  };

  const copyToClipboard = (text, label, e) => {
    navigator.clipboard.writeText(text);
    const rect = e?.target?.getBoundingClientRect();
    setClipboardToast({ text: `${label} copied!`, x: rect?.left || 100, y: rect?.top || 100 });
    setTimeout(() => setClipboardToast(null), 1800);
  };

  // ─── SAVE TO MAC CONTACTS (vCard) ──────────────────────────────────────
  const downloadVCard = (contact) => {
    const fn = contact.firstName || contact.name?.split(' ')[0] || '';
    const ln = contact.lastName || contact.name?.split(' ').slice(1).join(' ') || '';
    const fullName = [fn, ln].filter(Boolean).join(' ') || contact.name || 'Unknown';
    // Strip country code formatting for TEL field
    const rawPhone = (contact.phone || '').replace(/[^\d+]/g, '');
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${fullName}`,
      `N:${ln};${fn};;;`,
    ];
    if (contact.company) lines.push(`ORG:${contact.company}`);
    if (contact.position || contact.title) lines.push(`TITLE:${contact.position || contact.title}`);
    if (rawPhone) lines.push(`TEL;TYPE=WORK,VOICE:${rawPhone}`);
    if (contact.email) lines.push(`EMAIL;TYPE=WORK:${contact.email}`);
    if (contact.address) lines.push(`ADR;TYPE=WORK:;;${contact.address.replace(/,/g, ';')};;;;`);
    if (contact.notes) lines.push(`NOTE:${contact.notes}`);
    lines.push('END:VCARD');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fullName.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Drive vendor search — searches entire Google Drive
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveError, setDriveError] = useState(null);
  const [driveVendorCache, setDriveVendorCache] = useState(null);
  const [driveComplianceMap, setDriveComplianceMap] = useState({});

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
      setVendors(prev => [...prev, { id: `v_${Date.now()}`, name: dv.name, type: dv.type, email: dv.email, contact: dv.contact, phone: "", title: "", contactType: "Vendor", deptId: dv.dept, source: "drive", address: "", compliance: comp }]);
    }
    // Auto-add to global contacts if not already there
    const contactName = dv.contact || dv.name;
    setContacts(prev => {
      const contactExists = prev.find(c => c.name.toLowerCase() === contactName.toLowerCase() || (dv.email && c.email?.toLowerCase() === dv.email.toLowerCase()));
      if (contactExists) return prev;
      const names = contactName.split(" ");
      return [...prev, {
        id: `ct_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: contactName,
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        phone: '',
        email: dv.email || '',
        company: dv.name !== contactName ? dv.name : '',
        position: '',
        department: dv.dept || '',
        address: '',
        resourceType: dv.type || '',
        notes: [dv.type, 'Imported from Drive'].filter(Boolean).join(' · '),
        source: "vendor",
      }];
    });
    setDriveResults(null);
    setVendorSearch("");
    // Sync compliance from Drive to ensure global consistency
    setTimeout(syncDriveCompliance, 2000);
  };
  const CONTACT_TYPES = ["Agency", "Freelancer", "Subcontractor", "Supplier", "Vendor", "Venue"];
  const emptyVendorForm = { contactType: "", resourceType: "", firstName: "", lastName: "", phone: "", email: "", company: "", title: "", dept: DEPT_OPTIONS[0], address: "" };

  // Phone formatting: +1 (XXX) XXX-XXXX
  const formatPhone = (val) => {
    const digits = val.replace(/\D/g, '');
    // If starts with 1 and has 11 digits, treat as +1 country code
    let d = digits;
    let prefix = '+1 ';
    if (d.startsWith('1') && d.length > 10) d = d.slice(1);
    else if (d.length <= 10) { /* US number, add +1 */ }
    else { return val; } // foreign number, don't force format
    if (d.length === 0) return '';
    if (d.length <= 3) return prefix + '(' + d;
    if (d.length <= 6) return prefix + '(' + d.slice(0, 3) + ') ' + d.slice(3);
    return prefix + '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6, 10);
  };
  const [vendorForm, setVendorForm] = useState({ ...emptyVendorForm });
  const updateVF = (k, v) => setVendorForm(p => ({ ...p, [k]: v }));
  const submitVendor = () => {
    if (!vendorForm.company && !vendorForm.firstName) return;
    const name = vendorForm.company || `${vendorForm.firstName} ${vendorForm.lastName}`.trim();
    const contactName = `${vendorForm.firstName} ${vendorForm.lastName}`.trim() || name;
    const w9Done = w9ParsedData?.upload?.success ? { done: true, file: w9ParsedData.fileName, date: new Date().toISOString().split("T")[0], link: w9ParsedData.upload.file?.link } : { done: false, file: null, date: null };
    const w9Address = w9ParsedData ? [w9ParsedData.address, w9ParsedData.city, w9ParsedData.state, w9ParsedData.zip].filter(Boolean).join(', ') : '';
    const finalAddress = vendorForm.address || w9Address;

    if (editingVendorId) {
      // EDIT existing vendor
      const oldVendor = vendors.find(v => v.id === editingVendorId);
      setVendors(prev => prev.map(v => v.id !== editingVendorId ? v : {
        ...v, name, type: vendorForm.resourceType || v.type,
        email: vendorForm.email, contact: contactName,
        phone: vendorForm.phone, title: vendorForm.title, contactType: vendorForm.contactType,
        deptId: vendorForm.dept, address: finalAddress,
      }));
      // Sync changes to matching Global Partners
      if (oldVendor) {
        setContacts(prev => prev.map(c => {
          // Match by old vendor name, old contact name, or company
          const oldName = (oldVendor.name || '').toLowerCase();
          const oldContact = (oldVendor.contact || '').toLowerCase();
          const cName = (c.name || '').toLowerCase();
          const cCompany = (c.company || '').toLowerCase();
          const isMatch = cName === oldName || cName === oldContact || cCompany === oldName;
          if (!isMatch) return c;
          // Update the matching contact with new vendor info
          return {
            ...c,
            name: cName === oldContact ? contactName : (cName === oldName ? name : c.name),
            phone: vendorForm.phone || c.phone,
            email: vendorForm.email || c.email,
            company: vendorForm.company || c.company,
            position: vendorForm.title || c.position,
            address: finalAddress || c.address,
            department: vendorForm.dept || c.department,
            resourceType: vendorForm.resourceType || c.resourceType,
            vendorName: name,
          };
        }));
      }
      logActivity("vendor", `edited "${name}"`, project?.name);
      setEditingVendorId(null);
      setVendorForm({ ...emptyVendorForm });
      setW9ParsedData(null);
      setShowAddVendor(false);
      setTimeout(syncDriveCompliance, 2000);
      return;
    }

    // CREATE new vendor
    const newV = {
      id: `v_${Date.now()}`, name, type: vendorForm.resourceType || "Other",
      email: vendorForm.email, contact: contactName,
      phone: vendorForm.phone, title: vendorForm.title, contactType: vendorForm.contactType,
      deptId: vendorForm.dept, source: "manual",
      ein: w9ParsedData?.ein || '',
      address: finalAddress,
      compliance: { coi: { done: false, file: null, date: null }, w9: w9Done, invoice: { done: false, file: null, date: null }, banking: { done: false, file: null, date: null }, contract: { done: false, file: null, date: null } }
    };
    setVendors(prev => [...prev, newV]);
    // Auto-add vendor AND contact person to global contacts
    setContacts(prev => {
      const additions = [];
      // Add vendor/company as a contact
      const vendorExists = prev.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (!vendorExists) {
        additions.push({
          id: `ct_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name, firstName: '', lastName: '',
          phone: vendorForm.phone || '', email: vendorForm.email || '',
          company: vendorForm.company || '', position: '',
          department: vendorForm.dept || '', address: finalAddress,
          resourceType: vendorForm.resourceType || '',
          notes: [vendorForm.contactType, vendorForm.resourceType].filter(Boolean).join(' · '),
          source: "vendor",
        });
      }
      // Also add the contact person if different from vendor name
      if (contactName && contactName !== name) {
        const personExists = prev.find(c => c.name.toLowerCase() === contactName.toLowerCase());
        if (!personExists) {
          additions.push({
            id: `ct_${Date.now() + 1}_${Math.random().toString(36).substr(2, 4)}`,
            name: contactName, firstName: vendorForm.firstName || '', lastName: vendorForm.lastName || '',
            phone: vendorForm.phone || '', email: vendorForm.email || '',
            company: vendorForm.company || name, position: vendorForm.title || '',
            department: vendorForm.dept || '', address: finalAddress,
            resourceType: vendorForm.resourceType || '',
            notes: '', source: "vendor",
          });
        }
      }
      return additions.length ? [...prev, ...additions] : prev;
    });
    logActivity("vendor", `added "${name}"`, project?.name);
    setVendorForm({ ...emptyVendorForm });
    setW9ParsedData(null);
    setShowAddVendor(false);
    // Pre-create vendor folders in Google Drive (COI + W9)
    try {
      fetch('/api/drive/create-folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendorName: name }) });
    } catch (e) { console.error('Drive folder pre-creation failed:', e); }
    // Sync compliance from Drive — picks up any existing COI/W9 files for this vendor
    setTimeout(syncDriveCompliance, 2000);
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
          // Clean empty strings from arrays
          const cleaned = { ...data.settings };
          // Ensure all array fields are actually arrays (Supabase may have nulls)
          ['authorizedUsers', 'pendingUsers', 'statuses', 'projectTypes', 'departments', 'resourceTypes', 'projectRoles'].forEach(k => {
            if (!Array.isArray(cleaned[k])) delete cleaned[k]; // remove null so it doesn't overwrite default
          });
          if (!Array.isArray(cleaned.driveConnections)) delete cleaned.driveConnections;
          ['statuses'].forEach(k => {
            if (Array.isArray(cleaned[k])) cleaned[k] = cleaned[k].filter(Boolean);
          });
          ['projectTypes', 'departments', 'resourceTypes', 'projectRoles'].forEach(k => {
            if (Array.isArray(cleaned[k])) cleaned[k] = cleaned[k].filter(Boolean).sort();
          });
          setAppSettings(prev => ({ ...prev, ...cleaned }));
        }
      } catch (e) { console.error('Settings load failed:', e); }
    })();
  }, [user]);

  const saveSettings = async (newSettings) => {
    setSettingsSaving(true);
    // Clean empty strings from arrays before saving
    const cleaned = { ...newSettings };
    ['statuses'].forEach(k => {
      if (Array.isArray(cleaned[k])) cleaned[k] = cleaned[k].filter(Boolean);
    });
    ['projectTypes', 'departments', 'resourceTypes', 'projectRoles'].forEach(k => {
      if (Array.isArray(cleaned[k])) cleaned[k] = cleaned[k].filter(Boolean).sort();
    });
    try {
      const { data: existing } = await supabase.from('app_settings').select('id').limit(1).single();
      if (existing) {
        await supabase.from('app_settings').update({ settings: cleaned, updated_at: new Date().toISOString() }).eq('id', existing.id);
      }
      setAppSettings(cleaned);
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
          .select('state, updated_at')
          .eq('id', 'shared')
          .single();
        if (error && error.code !== 'PGRST116') { console.error('Load error:', error); }
        if (data?.state) {
          // Compare timestamps: only overwrite local data if Supabase is newer
          const lsTimestamp = localStorage.getItem(LS_KEYS.updatedAt);
          const sbTimestamp = data.updated_at;
          const lsDate = lsTimestamp ? new Date(lsTimestamp) : new Date(0);
          const sbDate = sbTimestamp ? new Date(sbTimestamp) : new Date(0);
          
          // If localStorage is newer than Supabase, skip the overwrite and push local to Supabase instead
          if (lsDate > sbDate && lsTimestamp) {
            console.log(`localStorage is newer (${lsTimestamp} > ${sbTimestamp}) — keeping local data, pushing to Supabase`);
            setDataLoaded(true);
            // Force-push localStorage state to Supabase so they're in sync
            // Read directly from localStorage since React state may not be hydrated yet
            setTimeout(async () => {
              try {
                const localState = {};
                ['projects', 'clients', 'contacts', 'vendors', 'workback', 'ros'].forEach(k => {
                  try { const v = localStorage.getItem(LS_KEYS[k]); if (v) localState[k === 'vendors' ? 'projectVendors' : k === 'workback' ? 'projectWorkback' : k === 'ros' ? 'projectROS' : k] = JSON.parse(v); } catch {}
                });
                if (Object.keys(localState).length > 0) {
                  const now = new Date().toISOString();
                  await supabase.from('shared_state').update({ state: localState, updated_at: now, updated_by: user.id }).eq('id', 'shared');
                  try { localStorage.setItem(LS_KEYS.updatedAt, now); } catch {}
                  console.log('Force-pushed localStorage to Supabase');
                  setSaveStatus("saved");
                }
              } catch (e) { console.warn('Force-push failed:', e); }
            }, 2000);
            syncDriveCompliance();
            return;
          }
          
          const s = data.state;
          // Sanitize projects: ensure all array fields are actually arrays
          if (s.projects && Array.isArray(s.projects)) {
            const clientNameMap = { "Amjad Asad": "Amjad Masad", "Ayita": "AYITA", "GUESS?, Inc": "Guess", "GUESS?, Inc.": "Guess", "NVE": "NVE Experience Agency, LLC", "Sequel Inc": "Sequel Marketing", "Franklin Pictures": "Franklin Pictures, Inc.", "Franklin Pictures, Inc": "Franklin Pictures, Inc.", "Brunello": "Brunelo" };
            setProjects(s.projects.map(p => ({
              ...p,
              client: clientNameMap[p.client] || p.client,
              producers: Array.isArray(p.producers) ? p.producers : [],
              managers: Array.isArray(p.managers) ? p.managers : [],
              staff: Array.isArray(p.staff) ? p.staff : [],
              pocs: Array.isArray(p.pocs) ? p.pocs : [],
              clientContacts: Array.isArray(p.clientContacts) ? p.clientContacts : [],
              billingContacts: Array.isArray(p.billingContacts) ? p.billingContacts : [],
              services: Array.isArray(p.services) ? p.services : [],
              subEvents: Array.isArray(p.subEvents) ? p.subEvents : [],
            })));
          }
          // Sanitize per-project maps: ensure each project's list is an array
          if (s.projectVendors && typeof s.projectVendors === 'object') {
            const safe = {};
            Object.keys(s.projectVendors).forEach(k => {
              safe[k] = Array.isArray(s.projectVendors[k]) ? s.projectVendors[k].map(v => ({
                ...v,
                compliance: v.compliance && typeof v.compliance === 'object' ? v.compliance : { coi: { done: false }, w9: { done: false }, invoice: { done: false }, banking: { done: false }, contract: { done: false } },
              })) : [];
            });
            setProjectVendors(safe);
          }
          if (s.projectWorkback && typeof s.projectWorkback === 'object') {
            const safe = {};
            Object.keys(s.projectWorkback).forEach(k => { safe[k] = Array.isArray(s.projectWorkback[k]) ? s.projectWorkback[k] : []; });
            setProjectWorkback(safe);
          }
          if (s.projectROS && typeof s.projectROS === 'object') {
            const safe = {};
            Object.keys(s.projectROS).forEach(k => {
              safe[k] = Array.isArray(s.projectROS[k]) ? s.projectROS[k].map(r => ({ ...r, vendors: Array.isArray(r.vendors) ? r.vendors : [] })) : [];
            });
            setProjectROS(safe);
          }
          if (s.rosDayDates) setRosDayDates(s.rosDayDates);
          if (s.contacts && Array.isArray(s.contacts)) setContacts(s.contacts);
          if (s.activityLog && Array.isArray(s.activityLog)) setActivityLog(s.activityLog);
          if (s.clients && Array.isArray(s.clients)) {
            // Migrate client names to match Drive folders
            const nameMap = { "Amjad Asad": "Amjad Masad", "Ayita": "AYITA", "GUESS?, Inc": "Guess", "GUESS?, Inc.": "Guess", "NVE": "NVE Experience Agency, LLC", "Sequel Inc": "Sequel Marketing", "Franklin Pictures": "Franklin Pictures, Inc.", "Franklin Pictures, Inc": "Franklin Pictures, Inc.", "Brunello": "Brunelo" };
            const migrated = s.clients.map(c => ({ ...c, name: nameMap[c.name] || c.name }));
            // Deduplicate by name (keep first occurrence)
            const seen = new Set();
            const deduped = migrated.filter(c => { const k = c.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
            setClients(deduped);
          }
        }
        setDataLoaded(true);
        // Sync compliance with Drive
        syncDriveCompliance();
      } catch (e) { console.error('Load failed:', e); setDataLoaded(true); }
    })();
  }, [user]);

  // Drive compliance sync — checks actual Drive folders and updates vendor compliance
  const syncDriveCompliance = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
      const res = await fetch('/api/drive/scan', { signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json();
      if (!data.success || !data.compliance) return;
      
      const driveCompliance = data.compliance; // { vendorName: { coi: {done, file, link}, w9: {done, file, link} } }
      
      // Store raw map so DOCS column can reference it directly for any contact
      setDriveComplianceMap(driveCompliance);
      
      setVendors(prev => prev.map(v => {
        const driveMatch = driveCompliance[v.name];
        if (!driveMatch) {
          // No folder in Drive for this vendor — clear any compliance that claims Drive docs
          const updated = { ...v.compliance };
          ['coi', 'w9'].forEach(key => {
            if (updated[key]?.done && updated[key]?.link) {
              updated[key] = { done: false };
            }
          });
          return { ...v, compliance: updated };
        }
        // Vendor has Drive folder — sync each doc type
        const updated = { ...v.compliance };
        ['coi', 'w9'].forEach(key => {
          if (driveMatch[key]?.done) {
            updated[key] = { done: true, file: driveMatch[key].file, link: driveMatch[key].link };
          } else {
            // Drive folder exists but empty — clear compliance
            if (updated[key]?.done && updated[key]?.link) {
              updated[key] = { done: false };
            }
          }
        });
        return { ...v, compliance: updated };
      }));
    } catch (e) {
      console.log('Drive sync skipped:', e.message);
    }
  };

  // Auto-sync Drive compliance every 60 seconds
  useEffect(() => {
    if (!user || !dataLoaded) return;
    const interval = setInterval(syncDriveCompliance, 60000);
    return () => clearInterval(interval);
  }, [user, dataLoaded]);

  const saveToSupabase = useCallback(async (state) => {
    if (!user) return;
    setSaveStatus("saving");
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('shared_state')
        .update({ state, updated_at: now, updated_by: user.id })
        .eq('id', 'shared');
      if (error) {
        console.error('Save error:', error);
        setSaveStatus("error");
        // Retry once after 3 seconds
        setTimeout(() => {
          if (pendingSaveRef.current) {
            console.log('Retrying save...');
            saveToSupabase(pendingSaveRef.current);
          }
        }, 3000);
      }
      else {
        setSaveStatus("saved");
        // Stamp localStorage so it matches Supabase
        try { localStorage.setItem(LS_KEYS.updatedAt, now); } catch {}
        pendingSaveRef.current = null;
      }
    } catch (e) {
      console.error('Save failed:', e);
      setSaveStatus("error");
      // Retry once after 3 seconds
      setTimeout(() => {
        if (pendingSaveRef.current) saveToSupabase(pendingSaveRef.current);
      }, 3000);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (!dataLoaded) return;
    const stateToSave = { projects, projectVendors, projectWorkback, projectROS, rosDayDates, contacts, activityLog, clients };
    pendingSaveRef.current = stateToSave;
    setSaveStatus("saving");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const delay = forceSaveCounter > 0 ? 50 : 800; // Immediate on Cmd+S
    saveTimeoutRef.current = setTimeout(() => {
      saveToSupabase(stateToSave);
    }, delay);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [projects, projectVendors, projectWorkback, projectROS, rosDayDates, contacts, activityLog, clients, dataLoaded, forceSaveCounter]);

  // Flush pending save on tab close / navigate away
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingSaveRef.current && user) {
        // Use sendBeacon for reliable save on tab close
        const payload = JSON.stringify({
          state: pendingSaveRef.current,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        });
        // Try sendBeacon first (most reliable for unload)
        const beaconUrl = `${window.location.origin}/api/save-state`;
        try { navigator.sendBeacon(beaconUrl, new Blob([payload], { type: 'application/json' })); } catch {}
        // Also try synchronous XHR as fallback
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', beaconUrl, false); // synchronous
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.send(payload);
        } catch {}
        pendingSaveRef.current = null;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  const _rawProject = projects.find(p => p.id === activeProjectId) || projects[0];
  const project = _rawProject ? {
    ..._rawProject,
    producers: Array.isArray(_rawProject.producers) ? _rawProject.producers : [],
    managers: Array.isArray(_rawProject.managers) ? _rawProject.managers : [],
    staff: Array.isArray(_rawProject.staff) ? _rawProject.staff : [],
    pocs: Array.isArray(_rawProject.pocs) ? _rawProject.pocs : [],
    clientContacts: Array.isArray(_rawProject.clientContacts) ? _rawProject.clientContacts : [],
    billingContacts: Array.isArray(_rawProject.billingContacts) ? _rawProject.billingContacts : [],
    services: Array.isArray(_rawProject.services) ? _rawProject.services : [],
    subEvents: Array.isArray(_rawProject.subEvents) ? _rawProject.subEvents : [],
    eventDates: _rawProject.eventDates || { start: "", end: "" },
    engagementDates: _rawProject.engagementDates || { start: "", end: "" },
  } : { id: "p1", name: "Loading...", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], services: [], subEvents: [], eventDates: { start: "", end: "" }, engagementDates: { start: "", end: "" } };
  // ─── PROJECT VENDOR SCAN — syncs project ADMIN/VENDORS folder into vendor tab ───
  const [projVendorScanDone, setProjVendorScanDone] = useState({});
  const syncProjectVendors = async (proj) => {
    if (!proj?.driveFolderId) return;
    // Skip if already scanned this project this session
    if (projVendorScanDone[proj.id]) return;
    try {
      const res = await fetch("/api/drive/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan-vendors", projectFolderId: proj.driveFolderId }),
      });
      const data = await res.json();
      if (!data.success || !data.vendors) return;
      
      console.log("Project vendor scan:", Object.keys(data.vendors).length, "vendors found in Drive");
      
      const projectDriveVendors = data.vendors; // { "Ticket Fairy": { docs: { invoice: {done,file,link}, w9: {...} }, fileCount, folderId } }
      
      setVendors(prev => {
        let updated = [...prev];
        
        for (const [vendorName, vendorData] of Object.entries(projectDriveVendors)) {
          const existingIdx = updated.findIndex(v => v.name?.toLowerCase() === vendorName.toLowerCase());
          
          if (existingIdx >= 0) {
            // Vendor already exists — merge project-specific docs (invoice, contract, banking)
            const v = updated[existingIdx];
            const comp = { ...v.compliance };
            
            // Project-specific docs: invoice, contract, banking
            ['invoice', 'contract', 'banking'].forEach(key => {
              if (vendorData.docs[key]?.done) {
                comp[key] = { done: true, file: vendorData.docs[key].file, link: vendorData.docs[key].link, source: 'project-drive' };
              }
            });
            // Global docs: w9, coi — only set if not already set from global scan
            ['w9', 'coi'].forEach(key => {
              if (vendorData.docs[key]?.done && !comp[key]?.done) {
                comp[key] = { done: true, file: vendorData.docs[key].file, link: vendorData.docs[key].link, source: 'project-drive' };
              }
            });
            
            updated[existingIdx] = { ...v, compliance: comp, driveFolderId: vendorData.folderId };
          } else {
            // Vendor NOT on tab yet — auto-add from Drive
            const comp = { coi: { done: false }, w9: { done: false }, invoice: { done: false }, banking: { done: false }, contract: { done: false } };
            ['invoice', 'contract', 'banking', 'w9', 'coi'].forEach(key => {
              if (vendorData.docs[key]?.done) {
                comp[key] = { done: true, file: vendorData.docs[key].file, link: vendorData.docs[key].link, source: 'project-drive' };
              }
            });
            updated.push({
              id: `v_drv_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
              name: vendorName,
              type: "Vendor",
              email: "",
              contact: "",
              phone: "",
              title: "",
              contactType: "Vendor",
              deptId: "",
              source: "drive",
              address: "",
              compliance: comp,
              driveFolderId: vendorData.folderId,
            });
            console.log("Auto-added vendor from Drive:", vendorName);
          }
        }
        return updated;
      });
      
      setProjVendorScanDone(prev => ({ ...prev, [proj.id]: true }));
    } catch (e) {
      console.error("Project vendor scan error:", e);
    }
  };

  // Auto-scan project vendors when Vendors tab is opened
  useEffect(() => {
    if (activeTab !== "vendors" || !project?.driveFolderId) return;
    syncProjectVendors(project);
  }, [activeTab, project?.id, project?.driveFolderId]);

  const updateProject = (key, val) => {
    setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, [key]: val } : p));
    if (["status", "location", "client", "name"].includes(key)) {
      logActivity("updated", `${key} → "${val}"`, project?.name);
    }
    // Auto-ensure Drive folder when client is assigned/changed
    if (key === "client" && val && project?.code && !project?.driveFolderId) {
      setTimeout(() => ensureProjectDrive({ ...project, client: val }), 500);
    }
  };
  const updateProject2 = (projId, key, val) => setProjects(prev => prev.map(p => p.id === projId ? { ...p, [key]: val } : p));

  // ─── DRIVE PROJECT FOLDER ────────────────────────────────────────
  const ensureProjectDrive = async (proj) => {
    if (!proj || !proj.client || !proj.code) return null;
    setProjDriveEnsuring(true);
    try {
      const res = await fetch("/api/drive/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ensure",
          clientName: proj.client,
          projectCode: proj.code,
          template: appSettings.folderTemplate,
        }),
      });
      const data = await res.json();
      if (data.success && data.folderId) {
        // Store the Drive folder ID on the project
        setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, driveFolderId: data.folderId, driveFolderLink: data.folderLink, drivePath: data.path } : p));
        console.log("Drive folder", data.created ? "CREATED" : "linked", data.path, data.folderId);
        return data;
      } else {
        console.error("Drive ensure failed:", data.error);
        return null;
      }
    } catch (e) {
      console.error("Drive ensure error:", e);
      return null;
    } finally {
      setProjDriveEnsuring(false);
    }
  };

  const driveBrowse = async (folderId, folderName, isRoot = false) => {
    setProjDriveLoading(true);
    try {
      const res = await fetch(`/api/drive/project?folderId=${folderId}`);
      const data = await res.json();
      if (data.success) {
        setProjDriveFiles(data.items || []);
        if (isRoot) {
          setProjDrivePath([{ id: folderId, name: folderName || project?.code || "Project" }]);
        } else {
          setProjDrivePath(prev => [...prev, { id: folderId, name: folderName }]);
        }
      }
    } catch (e) { console.error("Drive browse error:", e); }
    setProjDriveLoading(false);
  };

  const driveBrowseBreadcrumb = async (index) => {
    const target = projDrivePath[index];
    if (!target) return;
    setProjDriveLoading(true);
    try {
      const res = await fetch(`/api/drive/project?folderId=${target.id}`);
      const data = await res.json();
      if (data.success) {
        setProjDriveFiles(data.items || []);
        setProjDrivePath(prev => prev.slice(0, index + 1));
      }
    } catch (e) { console.error("Drive breadcrumb error:", e); }
    setProjDriveLoading(false);
  };

  const driveUploadFile = async (file) => {
    const currentFolder = projDrivePath[projDrivePath.length - 1];
    if (!currentFolder || !file) return;
    setProjDriveUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folderId", currentFolder.id);
      const res = await fetch("/api/drive/project", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        // Refresh current folder
        await driveBrowseBreadcrumb(projDrivePath.length - 1);
        setClipboardToast({ text: `Uploaded: ${data.file.name}`, x: window.innerWidth / 2, y: 60 });
        setTimeout(() => setClipboardToast(null), 3000);
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (e) { alert("Upload error: " + e.message); }
    setProjDriveUploading(false);
  };

  const driveFormatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const driveGetIcon = (item) => {
    if (item.isFolder) return "📁";
    const ext = item.name.split(".").pop()?.toLowerCase();
    const icons = { pdf: "📄", doc: "📝", docx: "📝", xls: "📊", xlsx: "📊", csv: "📊", ppt: "📎", pptx: "📎", jpg: "🖼️", jpeg: "🖼️", png: "🖼️", gif: "🖼️", mp4: "🎬", mov: "🎬", mp3: "🎵", wav: "🎵", zip: "🗜️", rar: "🗜️", txt: "📃" };
    return icons[ext] || "📄";
  };


  const todoistAutoLink = async (proj) => {
    if (!todoistKey || !proj) return;
    const projCode = proj.code || generateProjectCode(proj);
    if (!projCode) return;
    if (todoistAutoLinkRef.current[proj.id]) return;
    todoistAutoLinkRef.current[proj.id] = true;
    setTodoistAutoLinking(true);
    try {
      console.log("Auto-link: looking for", JSON.stringify(projCode), "in", todoistProjects.length, "projects:", todoistProjects.map(p => p.name));
      // Try exact match first, then case-insensitive, then trimmed
      const match = todoistProjects.find(p => p.name === projCode) 
        || todoistProjects.find(p => p.name?.toLowerCase() === projCode.toLowerCase())
        || todoistProjects.find(p => p.name?.trim().toLowerCase() === projCode.trim().toLowerCase());
      if (match) {
        console.log("Auto-link: MATCHED", match.name, "id:", match.id);
        updateProject("todoistProjectId", match.id);
        setClipboardToast({ text: `Linked to Todoist: ${match.name}`, x: window.innerWidth / 2, y: 60 });
        setTimeout(() => setClipboardToast(null), 3000);
        await todoistFetchProjectDetails(match.id);
      } else {
        console.log("Auto-link: no match for", projCode);
      }
    } catch (e) { console.error("Todoist auto-link:", e); }
    setTodoistAutoLinking(false);
    setTimeout(() => { delete todoistAutoLinkRef.current[proj.id]; }, 10000);
  };

  // Auto-link: when Todoist tab is opened for a project without a linked Todoist project
  useEffect(() => {
    if (activeTab !== "todoist" || !project || !todoistKey) return;
    if (todoistProjects.length === 0) {
      console.log("Auto-link useEffect: waiting for todoistProjects to load...");
      return;
    }
    if (project.todoistProjectId) {
      console.log("Auto-link useEffect: already linked to", project.todoistProjectId);
      todoistFetchProjectDetails(project.todoistProjectId);
      return;
    }
    console.log("Auto-link useEffect: attempting auto-link for", project.name, "code:", project.code);
    todoistAutoLink(project);
  }, [activeTab, project?.id, project?.todoistProjectId, todoistProjects.length, todoistKey]);

  // Load sections for all projects when master todoist tab opens
  useEffect(() => {
    if (glanceTab === "masterTodoist" && todoistKey && todoistProjects.length > 0 && todoistSections.length === 0) {
      todoistFetchAllSections();
    }
  }, [glanceTab, todoistKey, todoistProjects.length]);

  // Auto-browse Drive when Drive tab is opened
  useEffect(() => {
    if (activeTab !== "drive" || !project) return;
    if (project.driveFolderId) {
      // Already linked — browse it
      if (projDrivePath.length === 0 || projDrivePath[0]?.id !== project.driveFolderId) {
        driveBrowse(project.driveFolderId, project.code || project.name, true);
      }
    } else if (project.client && project.code && !projDriveEnsuring) {
      // Has client + code but no folder ID — try to ensure
      ensureProjectDrive(project).then(data => {
        if (data?.folderId) {
          driveBrowse(data.folderId, project.code || project.name, true);
        }
      });
    }
  }, [activeTab, project?.id, project?.driveFolderId]);

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
    
    // Immediately update UI optimistically (show uploading state)
    setVendors(prev => prev.map(v => v.id !== vendorId ? v : { ...v, compliance: { ...v.compliance, [compKey]: { done: true, file: fileName, date: new Date().toISOString().split("T")[0], uploading: true } } }));
    logActivity("vendor", `uploading ${compKey} for "${vendor?.name}"`, project?.name);
    
    // Upload to Google Drive via API
    if (typeof file !== 'string') {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('vendorName', vendor?.name || 'Unknown');
        formData.append('docType', compKey);
        formData.append('basePath', basePath || drivePath.replace(/\/[^/]+\/$/, ''));
        
        const res = await fetch('/api/drive/upload', { method: 'POST', body: formData });
        const data = await res.json();
        
        if (data.success) {
          // SUCCESS — update with Drive link
          setVendors(prev => prev.map(v => v.id !== vendorId ? v : { ...v, compliance: { ...v.compliance, [compKey]: { done: true, file: fileName, date: new Date().toISOString().split("T")[0], link: data.file?.link, uploading: false } } }));
          setUploadLog(prev => [{ id: Date.now(), vendorName: vendor?.name, compKey, fileName, drivePath, time: new Date().toLocaleTimeString(), folderCreated: data.folder?.created, vendorFolder: vendor?.name }, ...prev].slice(0, 20));
          logActivity("vendor", `✅ uploaded ${compKey} for "${vendor?.name}" to Drive`, project?.name);
          // Re-sync from Drive to ensure global consistency
          setTimeout(syncDriveCompliance, 3000);
          return;
        } else {
          // API returned error — REVERT the checkmark and show error
          const errMsg = data.error || 'Upload failed - unknown error';
          console.error('Drive upload API error:', errMsg, data);
          setVendors(prev => prev.map(v => v.id !== vendorId ? v : { ...v, compliance: { ...v.compliance, [compKey]: { done: false, file: null, date: null, uploading: false, error: errMsg } } }));
          setClipboardToast({ text: `❌ Drive upload failed: ${errMsg}`, x: window.innerWidth / 2, y: 60 });
          setTimeout(() => setClipboardToast(null), 5000);
          return;
        }
      } catch (err) {
        // Network error or crash — REVERT and show error
        console.error('Drive upload exception:', err);
        setVendors(prev => prev.map(v => v.id !== vendorId ? v : { ...v, compliance: { ...v.compliance, [compKey]: { done: false, file: null, date: null, uploading: false, error: err.message } } }));
        setClipboardToast({ text: `❌ Drive upload failed: ${err.message}`, x: window.innerWidth / 2, y: 60 });
        setTimeout(() => setClipboardToast(null), 5000);
        return;
      }
    }
    
    // Only reach here for string file names (manual entry, not actual file upload)
    setVendors(prev => prev.map(v => v.id !== vendorId ? v : { ...v, compliance: { ...v.compliance, [compKey]: { done: true, file: fileName, date: new Date().toISOString().split("T")[0], uploading: false } } }));
  };

  const handleClearCompliance = (vendorId, compKey) => {
    setVendors(prev => prev.map(v => v.id !== vendorId ? v : { ...v, compliance: { ...v.compliance, [compKey]: { done: false, file: null, date: null, link: null } } }));
    // Re-sync from Drive to confirm state
    setTimeout(syncDriveCompliance, 2000);
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
          address: [p.address, p.city, p.state, p.zip].filter(Boolean).join(', '),
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
    if (!canSeeProject(p.id)) return false;
    if (!showArchived && p.archived) return false;
    return p.name.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase());
  });
  const archivedCount = projects.filter(p => p.archived).length;

  const allTabs = [
    { id: "overview", label: "Overview", icon: "◉" },
    { id: "budget", label: "Budget", icon: "$" },
    { id: "todoist", label: "Todoist", icon: "✅" },
    { id: "workback", label: "Work Back", icon: "◄" },
    { id: "ros", label: "Run of Show", icon: "▶" },
    { id: "drive", label: "Drive", icon: "◫" },
    { id: "vendors", label: "Contractors/Vendors", icon: "⊕" },
    { id: "contacts", label: "Event Contacts", icon: "👤" },
  ];
  const tabs = allTabs.filter(t => canSeeSection(t.id === "contacts" ? "eventContacts" : t.id));

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
    <div style={{ height: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column", transition: "background 0.3s, color 0.3s", overflow: "hidden", ...(appSettings.branding?.dashboardBg ? { backgroundImage: `url(${appSettings.branding.dashboardBg})`, backgroundSize: "cover", backgroundPosition: "center" } : {}) }}>
      <style>{`
        :root {
          --bg: ${T.bg}; --bgSub: ${T.bgSub}; --bgCard: ${T.bgCard}; --bgInput: ${T.bgInput}; --bgHover: ${T.bgHover};
          --topBar: ${T.topBar}; --border: ${T.border}; --borderSub: ${T.borderSub}; --borderActive: ${T.borderActive};
          --text: ${T.text}; --textSub: ${T.textSub}; --textMuted: ${T.textMuted}; --textFaint: ${T.textFaint}; --textGhost: ${T.textGhost};
          --scrollThumb: ${T.scrollThumb}; --calCell: ${T.calCell}; --calLine: ${T.calLine}; --calBgEmpty: ${T.calBgEmpty};
          --filterScheme: ${T.filterScheme};
        }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: var(--scrollThumb); border-radius: 4px; }
        .pac-container { z-index: 100000 !important; }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 4px #4ecb71; } 50% { box-shadow: 0 0 12px #4ecb71; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        * { transition: background-color 0.25s, border-color 0.25s, color 0.15s; }
        div:hover > .resize-handle-line { opacity: 0.6 !important; }
        div:active > .resize-handle-line { opacity: 1 !important; background: #3da5db !important; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(${darkMode ? "0.6" : "0"}); cursor: pointer; }
      `}</style>

      {/* PREVIEW MODE BANNER */}
      {previewingAs && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: "8px 24px", background: "linear-gradient(90deg, #3da5db18, #3da5db08)", borderBottom: "2px solid #3da5db40", position: "sticky", top: 0, zIndex: 10000 }}>
          <span style={{ fontSize: 11, color: "#3da5db", fontWeight: 700, letterSpacing: 0.5 }}>👁 PREVIEWING AS</span>
          <span style={{ fontSize: 12, color: "#3da5db", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{previewingAs}</span>
          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "#3da5db15", color: "#3da5db", fontWeight: 700, textTransform: "uppercase" }}>{getUserPerms(previewingAs).role}</span>
          <span style={{ color: "var(--textGhost)", fontSize: 10 }}>·</span>
          <span style={{ fontSize: 10, color: "var(--textFaint)" }}>
            {getUserPerms(previewingAs).projectAccess === "all" ? "All projects" : `${(getUserPerms(previewingAs).projectAccess || []).length} projects`}
            {(getUserPerms(previewingAs).hiddenSections || []).length > 0 && ` · ${(getUserPerms(previewingAs).hiddenSections || []).length} sections hidden`}
          </span>
          <button onClick={() => setPreviewingAs(null)} style={{ padding: "4px 14px", background: "#3da5db", border: "none", borderRadius: 5, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: 0.3, marginLeft: 6 }}>
            ✕ Exit Preview
          </button>
        </div>
      )}

      {/* TOP BAR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: "1px solid var(--border)", background: "var(--topBar)", transition: "background 0.3s, border-color 0.3s", flexShrink: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Instrument Sans'", background: "linear-gradient(135deg, #ff6b4a, #ff4a6b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Adaptive by Design</span>
          <div style={{ width: 1, height: 20, background: "var(--border)" }} />
          <span style={{ fontSize: 11, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1 }}>COMMAND CENTER</span>
          <div style={{ width: 1, height: 16, background: "var(--border)" }} />
          <button onClick={() => setActiveTab("calendar")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, color: activeTab === "calendar" ? "#ff6b4a" : "var(--textFaint)", padding: "4px 10px", borderRadius: 5, transition: "all 0.15s", letterSpacing: 0.3 }}>
            📅 Adaptive at a Glance
          </button>
          {canSeeSection("globalContacts") && (
            <button onClick={() => setActiveTab("globalContacts")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, color: activeTab === "globalContacts" ? "#ff6b4a" : "var(--textFaint)", padding: "4px 10px", borderRadius: 5, transition: "all 0.15s", letterSpacing: 0.3 }}>
              👤 Global Partners {contacts.length > 0 && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 10, background: "var(--bgHover)", color: "var(--textFaint)", fontFamily: "'JetBrains Mono', monospace", marginLeft: 4 }}>{contacts.length}</span>}
            </button>
          )}
          {canSeeSection("globalContacts") && (
            <button onClick={() => setActiveTab("clients")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, color: activeTab === "clients" ? "#ff6b4a" : "var(--textFaint)", padding: "4px 10px", borderRadius: 5, transition: "all 0.15s", letterSpacing: 0.3 }}>
              🏢 Clients {clients.length > 0 && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 10, background: "var(--bgHover)", color: "var(--textFaint)", fontFamily: "'JetBrains Mono', monospace", marginLeft: 4 }}>{clients.length}</span>}
            </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Settings gear (admin only) */}
          {(canSeeSection("settings") || previewingAs) && isAdmin && (
            <button onClick={() => setShowSettings(true)} style={{ background: "none", border: "1px solid var(--borderSub)", borderRadius: 20, padding: "4px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.3s" }} title="Settings">
              <span style={{ fontSize: 12 }}>⚙️</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: "var(--textMuted)", letterSpacing: 0.5 }}>SETTINGS</span>
            </button>
          )}
          {/* Text Size Quick Control */}
          <div style={{ display: "flex", alignItems: "center", gap: 3, border: "1px solid var(--borderSub)", borderRadius: 20, padding: "3px 6px" }} title={`Text size: ${textSize}%`}>
            <button onClick={() => setTextSize(s => Math.max(75, s - 5))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "var(--textMuted)", padding: "2px 4px", fontWeight: 700, lineHeight: 1 }}>A−</button>
            <span style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, minWidth: 28, textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>{textSize}%</span>
            <button onClick={() => setTextSize(s => Math.min(130, s + 5))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--textMuted)", padding: "2px 4px", fontWeight: 700, lineHeight: 1 }}>A+</button>
          </div>
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
          <div style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }} title={`Click to force save\nLast saved: ${(() => { try { return localStorage.getItem(LS_KEYS.updatedAt) || "never"; } catch { return "unknown"; } })()}`} onClick={() => { const stateToSave = { projects, projectVendors, projectWorkback, projectROS, rosDayDates, contacts, activityLog, clients }; pendingSaveRef.current = stateToSave; saveToSupabase(stateToSave); }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: saveStatus === "saving" ? "#f5a623" : saveStatus === "error" ? "#ff4444" : "#4ecb71", animation: saveStatus === "saving" ? "pulse 0.8s ease infinite" : "glow 2s infinite", transition: "background 0.3s" }} /><span style={{ fontSize: 10, color: saveStatus === "saving" ? "#f5a623" : saveStatus === "error" ? "#ff4444" : "var(--textFaint)", fontFamily: "'JetBrains Mono', monospace", fontWeight: saveStatus === "saving" ? 700 : 400 }}>{saveStatus === "saving" ? "SAVING…" : saveStatus === "error" ? "⚠ SAVE ERROR — CLICK TO RETRY" : "✓ SYNCED"}</span></div>
          <span style={{ fontSize: 12, color: "var(--textFaint)", fontFamily: "'JetBrains Mono', monospace" }}>{time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
          {user && <span style={{ fontSize: 9, color: "var(--textGhost)", fontFamily: "'JetBrains Mono', monospace" }}>{user.email}</span>}
          {onLogout && <button onClick={onLogout} style={{ background: "none", border: "1px solid var(--borderSub)", borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: 9, color: "var(--textMuted)", fontWeight: 600, letterSpacing: 0.3 }}>LOGOUT</button>}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", zoom: textSize !== 100 ? textSize / 100 : undefined }}>

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
                      if (activeTab === "calendar" || activeTab === "globalContacts" || activeTab === "clients" ) setActiveTab("overview");
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
                    <div style={{ fontSize: 8, color: p.code ? "var(--textGhost)" : "var(--textFaint)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.3, marginBottom: 3, opacity: p.code ? 1 : 0.5 }}>{p.code || generateProjectCode(p)}</div>
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
            {activeTab !== "calendar" && activeTab !== "globalContacts" && activeTab !== "clients" && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1 }}>{project.client}</span>
                    {project.code && <span onClick={() => { const newCode = prompt("Edit project code:", project.code); if (newCode !== null) updateProject("code", newCode.toUpperCase()); }} style={{ fontSize: 9, color: "var(--textGhost)", fontFamily: "'JetBrains Mono', monospace", padding: "1px 6px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 3, letterSpacing: 0.3, cursor: "pointer" }} title="Click to edit project code">{project.code}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, fontFamily: "'Instrument Sans'" }}><EditableText value={project.name} onChange={v => updateProject("name", v)} fontSize={22} fontWeight={700} color="var(--text)" /></h1>
                    <select value={project.projectType || ""} onChange={e => updateProject("projectType", e.target.value)} style={{ padding: "3px 8px", borderRadius: 5, fontSize: 9, fontWeight: 700, cursor: "pointer", outline: "none", appearance: "auto", background: (PT_COLORS[project.projectType] || "var(--textMuted)") + "15", border: `1px solid ${(PT_COLORS[project.projectType] || "var(--textMuted)")}30`, color: PT_COLORS[project.projectType] || "var(--textMuted)", letterSpacing: 0.5 }}>
                      <option value="">No Type</option>
                      {[...new Set([...PROJECT_TYPES, ...(appSettings.projectTypes || [])])].filter(Boolean).sort().map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 3 }}>BUDGET</div><div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(project.budget)}</div></div>
              </div>
            )}
            {activeTab !== "calendar" && activeTab !== "globalContacts" && activeTab !== "clients" && (
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

            {/* ═══ ADAPTIVE AT A GLANCE (3 tabs) ═══ */}
            {activeTab === "calendar" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                {/* Sticky header */}
                <div style={{ position: "sticky", top: -20, zIndex: 20, background: "var(--bgBase)", paddingTop: 20, paddingBottom: 16, marginLeft: -28, marginRight: -28, paddingLeft: 28, paddingRight: 28, borderBottom: "1px solid var(--borderSub)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>ALL PROJECTS</div>
                      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Instrument Sans'" }}>Adaptive at a Glance</div>
                    </div>
                  </div>
                  {/* Sub-tabs */}
                  <div style={{ display: "flex", gap: 0, marginBottom: 0, borderBottom: "2px solid var(--borderSub)" }}>
                    {[{ key: "cal", label: "📅 Cal View" }, { key: "macro", label: "📋 Macro View" }, { key: "masterWB", label: "◄ Master Work Back" }, { key: "masterTodoist", label: "✅ Master Todoist" }].map(t => (
                      <button key={t.key} onClick={() => setGlanceTab(t.key)} style={{ background: "none", border: "none", borderBottom: glanceTab === t.key ? "2px solid #ff6b4a" : "2px solid transparent", marginBottom: -2, cursor: "pointer", fontSize: 12, fontWeight: 600, color: glanceTab === t.key ? "#ff6b4a" : "var(--textFaint)", padding: "8px 18px", transition: "all 0.15s", letterSpacing: 0.3 }}>{t.label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ paddingTop: 20 }}></div>

                {/* ── Cal View ── */}
                {glanceTab === "cal" && (
                  <MasterCalendar projects={projects} workback={workback} onSelectProject={(id) => { setActiveProjectId(id); setActiveTab("overview"); }} />
                )}

                {/* ── Macro View ── */}
                {glanceTab === "macro" && (
                  <div style={{ maxHeight: "calc(100vh - 320px)", overflowY: "auto", overflowX: "hidden" }}>
                    {/* Macro table */}
                    <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--borderSub)" }}>
                      <table style={{ width: "100%", minWidth: 1600, borderCollapse: "collapse", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid var(--borderSub)", background: "var(--bgSub)" }}>
                            {["Project", "Status", "Date(s)", "Client", "Project Type", "Location", "Producer(s)", "Manager(s)", "Services Needed", "Brief", "Project Code"].map(h => (
                              <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "var(--textFaint)", letterSpacing: 0.8, whiteSpace: "nowrap", background: "var(--bgSub)" }}>{h.toUpperCase()}</th>
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
                                <td onClick={() => { const newCode = prompt("Edit project code:", p.code || ""); if (newCode !== null) updateProject2(p.id, "code", newCode.toUpperCase()); }} style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--textGhost)", whiteSpace: "nowrap", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer" }} title="Click to edit">{p.code || "–"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── Master Work Back ── */}
                {glanceTab === "masterWB" && (() => {
                  const allWB = Object.entries(projectWorkback).flatMap(([pid, items]) => (Array.isArray(items) ? items : []).map(w => ({ ...w, _pid: pid, _pName: projects.find(p => p.id === pid)?.name || "Unknown" })));
                  const sorted = [...allWB].sort((a, b) => {
                    if (!a.date && !b.date) return 0;
                    if (!a.date) return 1;
                    if (!b.date) return -1;
                    return a.date.localeCompare(b.date);
                  });
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  const overdue = sorted.filter(w => w.date && w.status !== "Done" && new Date(w.date + "T23:59:59") < today).length;
                  const inProgress = sorted.filter(w => w.status === "In Progress").length;
                  const done = sorted.filter(w => w.status === "Done").length;
                  const total = sorted.length;

                  return (
                    <div style={{ maxHeight: "calc(100vh - 280px)", overflowY: "auto" }}>
                      {/* Summary bar */}
                      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, fontSize: 11 }}>
                          <span style={{ color: "var(--textFaint)", fontWeight: 600 }}>Total:</span>
                          <span style={{ fontWeight: 700, color: "var(--text)" }}>{total}</span>
                        </div>
                        {overdue > 0 && <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "#e854540a", border: "1px solid #e8545425", borderRadius: 8, fontSize: 11 }}>
                          <span style={{ color: "#e85454", fontWeight: 600 }}>Overdue:</span>
                          <span style={{ fontWeight: 700, color: "#e85454" }}>{overdue}</span>
                        </div>}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "#3da5db0a", border: "1px solid #3da5db25", borderRadius: 8, fontSize: 11 }}>
                          <span style={{ color: "#3da5db", fontWeight: 600 }}>In Progress:</span>
                          <span style={{ fontWeight: 700, color: "#3da5db" }}>{inProgress}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "#4ecb710a", border: "1px solid #4ecb7125", borderRadius: 8, fontSize: 11 }}>
                          <span style={{ color: "#4ecb71", fontWeight: 600 }}>Done:</span>
                          <span style={{ fontWeight: 700, color: "#4ecb71" }}>{done}</span>
                        </div>
                      </div>
                      {/* Table */}
                      <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, overflow: "hidden" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "100px 1.5fr 2fr 1.2fr 1fr 1fr", padding: "10px 16px", borderBottom: "1px solid var(--borderSub)", fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1 }}>
                          <span>DATE</span><span>PROJECT</span><span>TASK</span><span>DEPARTMENT(S)</span><span>RESPONSIBLE</span><span>STATUS</span>
                        </div>
                        {sorted.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "var(--textGhost)", fontSize: 12 }}>No work back items across any projects yet.</div>}
                        {sorted.map((wb) => {
                          const wbDeadlineStyle = (() => {
                            if (!wb.date || wb.status === "Done") return { borderLeft: "3px solid transparent", bg: wb.status === "Done" ? "var(--bgCard)" : "transparent" };
                            const dueDate = new Date(wb.date + "T23:59:59");
                            const daysUntil = Math.ceil((dueDate - today) / 86400000);
                            if (daysUntil < 0) return { borderLeft: "3px solid #e85454", bg: "#e854540a" };
                            if (daysUntil <= 7) return { borderLeft: "3px solid #f5a623", bg: "#f5a6230a" };
                            return { borderLeft: "3px solid #4ecb7130", bg: "transparent" };
                          })();
                          const overdueLabel = (() => {
                            if (!wb.date || wb.status === "Done") return null;
                            const dueDate = new Date(wb.date + "T23:59:59");
                            const daysUntil = Math.ceil((dueDate - today) / 86400000);
                            if (daysUntil < 0) return { text: `${Math.abs(daysUntil)}d overdue`, color: "#e85454" };
                            if (daysUntil === 0) return { text: "due today", color: "#f5a623" };
                            if (daysUntil <= 7) return { text: `${daysUntil}d left`, color: "#f5a623" };
                            return null;
                          })();
                          const wbSC = WB_STATUS_STYLES[wb.status] || { bg: "var(--bgCard)", text: "var(--textFaint)" };
                          return (
                            <div key={wb._pid + wb.id} style={{ display: "grid", gridTemplateColumns: "100px 1.5fr 2fr 1.2fr 1fr 1fr", padding: "8px 16px", borderBottom: "1px solid var(--calLine)", alignItems: "center", background: wbDeadlineStyle.bg, borderLeft: wbDeadlineStyle.borderLeft, cursor: "pointer", transition: "background 0.1s" }} onClick={() => { setActiveProjectId(wb._pid); setActiveTab("workback"); }} onMouseEnter={e => { if (!wbDeadlineStyle.bg || wbDeadlineStyle.bg === "transparent") e.currentTarget.style.background = "var(--bgHover)"; }} onMouseLeave={e => { e.currentTarget.style.background = wbDeadlineStyle.bg || "transparent"; }}>
                              <div>
                                <div style={{ fontSize: 11, color: "var(--textSub)", fontFamily: "'JetBrains Mono', monospace" }}>{wb.date ? (() => { const d = new Date(wb.date + "T12:00:00"); return `${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getDate().toString().padStart(2,"0")}`; })() : "–"}</div>
                                {overdueLabel && <div style={{ fontSize: 8, fontWeight: 700, color: overdueLabel.color, marginTop: 2 }}>{overdueLabel.text}</div>}
                              </div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: "#ff6b4a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{wb._pName}</div>
                              <div style={{ fontSize: 11, color: wb.status === "Done" ? "var(--textGhost)" : "var(--text)", fontWeight: 500, textDecoration: wb.status === "Done" ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{wb.task || "–"}</div>
                              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                                {(wb.depts || []).map((d, i) => (
                                  <span key={i} style={{ fontSize: 8, padding: "2px 6px", borderRadius: 3, background: (DEPT_COLORS[d] || "var(--textMuted)") + "18", color: DEPT_COLORS[d] || "var(--textMuted)", fontWeight: 600, whiteSpace: "nowrap" }}>{d}</span>
                                ))}
                              </div>
                              <div style={{ fontSize: 10, color: "var(--textSub)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{wb.owner || "–"}</div>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: wbSC.bg, color: wbSC.text, whiteSpace: "nowrap", display: "inline-block" }}>{wb.status || "Not Started"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* ── Master Todoist ── */}
                {glanceTab === "masterTodoist" && (() => {
                  const adptvProjects = todoistProjects.filter(p => !p.inbox_project && (adptvWorkspaceId ? p.workspace_id === adptvWorkspaceId : true));
                  const adptvTasks = todoistTasks.filter(t => adptvProjects.some(p => p.id === t.project_id));
                  const today = new Date().toISOString().split("T")[0];
                  const priColors = { 1: "var(--textGhost)", 2: "#3da5db", 3: "#dba94e", 4: "#ff6b4a" };
                  if (todoistProjects.length > 0 && adptvProjects.length === 0) {
                    console.warn("Master Todoist: 0 ADPTV projects from", todoistProjects.length, "total. adptvWorkspaceId:", adptvWorkspaceId, "Sample project:", JSON.stringify(todoistProjects[0]?.workspace_id), todoistProjects[0]?.name);
                  }

                  return (
                    <div style={{ maxHeight: "calc(100vh - 380px)", overflowY: "auto" }}>
                      {!todoistKey ? (
                        <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 12, padding: 40, textAlign: "center" }}>
                          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Connect Todoist</div>
                          <div style={{ fontSize: 13, color: "var(--textFaint)" }}>Set up your API key in Settings to see ADPTV tasks here.</div>
                        </div>
                      ) : todoistLoading ? (
                        <div style={{ textAlign: "center", padding: 40, color: "var(--textFaint)" }}>Loading tasks...</div>
                      ) : adptvProjects.length === 0 ? (
                        <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 12, padding: 40, textAlign: "center" }}>
                          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No ADPTV workspace projects found</div>
                          <div style={{ fontSize: 13, color: "var(--textFaint)" }}>Create Todoist projects from individual project tabs to see them here.</div>
                        </div>
                      ) : (
                        <div>
                          {adptvProjects.map(proj => {
                            let tasks = todoistTasks.filter(t => t.project_id === proj.id);
                            if (todoistFilter === "today") tasks = tasks.filter(t => t.due?.date === today);
                            else if (todoistFilter === "overdue") tasks = tasks.filter(t => t.due?.date && t.due.date < today);
                            const allProjectTasks = todoistTasks.filter(t => t.project_id === proj.id);
                            const projOverdue = allProjectTasks.filter(t => t.due?.date && t.due.date < today).length;
                            if ((todoistFilter === "today" || todoistFilter === "overdue") && tasks.length === 0) return null;
                            const projSections = todoistSections.filter(s => s.project_id === proj.id).sort((a, b) => (a.order || 0) - (b.order || 0));
                            const unsectioned = tasks.filter(t => !t.section_id);
                            const tasksBySection = {};
                            projSections.forEach(s => { tasksBySection[s.id] = tasks.filter(t => t.section_id === s.id); });

                            return (
                              <div key={proj.id} style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, marginBottom: 12, overflow: "hidden" }}>
                                <div style={{ padding: "10px 16px", borderBottom: tasks.length > 0 || todoistFilter === "all" ? "1px solid var(--borderSub)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bgCard)" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 12 }}>📁</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#ff6b4a" }}>{proj.name}</span>
                                    <span style={{ fontSize: 10, color: "var(--textFaint)" }}>{allProjectTasks.length} task{allProjectTasks.length !== 1 ? "s" : ""}</span>
                                    {projSections.length > 0 && <span style={{ fontSize: 10, color: "var(--textFaint)" }}>· {projSections.length} section{projSections.length !== 1 ? "s" : ""}</span>}
                                  </div>
                                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                    {projOverdue > 0 && <span style={{ fontSize: 9, padding: "2px 7px", background: "#e8545415", border: "1px solid #e8545420", borderRadius: 10, color: "#e85454", fontWeight: 700 }}>{projOverdue} overdue</span>}
                                    {(() => { const linked = projects.find(p => p.todoistProjectId === proj.id); return linked ? <button onClick={() => { setActiveProjectId(linked.id); setActiveTab("todoist"); }} style={{ fontSize: 9, padding: "2px 7px", background: "#3da5db15", border: "1px solid #3da5db20", borderRadius: 10, color: "#3da5db", fontWeight: 600, cursor: "pointer" }}>→ Open Project</button> : null; })()}
                                  </div>
                                </div>
                                {/* Inline add task */}
                                <div style={{ display: "flex", gap: 6, padding: "6px 16px", borderBottom: "1px solid var(--calLine)" }}>
                                  <input placeholder={`Add task to ${proj.name}...`} onKeyDown={e => { if (e.key === "Enter" && e.target.value.trim()) { todoistAddTaskToProject(e.target.value.trim(), proj.id); e.target.value = ""; } }} style={{ flex: 1, padding: "6px 10px", background: "transparent", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--text)", fontSize: 11, outline: "none" }} />
                                </div>
                                {/* Unsectioned tasks */}
                                {unsectioned.sort((a, b) => (a.order || 0) - (b.order || 0)).map(task => {
                                  const isOverdue = task.due?.date && task.due.date < today;
                                  const isToday = task.due?.date === today;
                                  const assignee = task.assignee_id ? (() => { const c = todoistCollaborators.find(x => x.id === task.assignee_id); return c ? c.name?.split(" ")[0] : ""; })() : "";
                                  return (
                                    <div key={task.id} style={{ padding: "8px 16px", borderBottom: "1px solid var(--calLine)", display: "flex", alignItems: "center", gap: 10, fontSize: 12, borderLeft: isOverdue ? "3px solid #e85454" : isToday ? "3px solid #f5a623" : "3px solid transparent" }}>
                                      <div onClick={() => todoistClose(task.id)} style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${priColors[task.priority] || "var(--textGhost)"}`, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={e => e.currentTarget.style.background = "#4ecb7140"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                        <span style={{ fontSize: 8, opacity: 0.3 }}>✓</span>
                                      </div>
                                      <span style={{ flex: 1, color: "var(--text)" }}>{task.content}</span>
                                      {assignee && <span style={{ fontSize: 9, color: "var(--textFaint)" }}>@{assignee}</span>}
                                      {task.due?.date && <span style={{ fontSize: 10, color: isOverdue ? "#e85454" : isToday ? "#f5a623" : "var(--textFaint)", fontWeight: isOverdue || isToday ? 700 : 400, fontFamily: "'JetBrains Mono', monospace" }}>{isToday ? "Today" : task.due.string || task.due.date}</span>}
                                      <button onClick={() => todoistDelete(task.id)} style={{ background: "none", border: "none", color: "var(--textGhost)", cursor: "pointer", fontSize: 12 }}>×</button>
                                    </div>
                                  );
                                })}
                                {/* Sectioned tasks */}
                                {projSections.map(section => {
                                  const sectionTasks = (tasksBySection[section.id] || []).sort((a, b) => (a.order || 0) - (b.order || 0));
                                  if ((todoistFilter === "today" || todoistFilter === "overdue") && sectionTasks.length === 0) return null;
                                  return (
                                    <div key={section.id}>
                                      <div style={{ padding: "6px 16px", fontSize: 9, color: "#ff6b4a", fontWeight: 700, letterSpacing: 0.5, borderBottom: "1px solid var(--calLine)", background: "#ff6b4a06" }}>
                                        {String.fromCharCode(9656)} {section.name.toUpperCase()} <span style={{ color: "var(--textFaint)", fontWeight: 400 }}>({sectionTasks.length})</span>
                                      </div>
                                      {sectionTasks.map(task => {
                                        const isOverdue = task.due?.date && task.due.date < today;
                                        const isToday = task.due?.date === today;
                                        const assignee = task.assignee_id ? (() => { const c = todoistCollaborators.find(x => x.id === task.assignee_id); return c ? c.name?.split(" ")[0] : ""; })() : "";
                                        return (
                                          <div key={task.id} style={{ padding: "8px 16px 8px 28px", borderBottom: "1px solid var(--calLine)", display: "flex", alignItems: "center", gap: 10, fontSize: 12, borderLeft: isOverdue ? "3px solid #e85454" : isToday ? "3px solid #f5a623" : "3px solid transparent" }}>
                                            <div onClick={() => todoistClose(task.id)} style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${priColors[task.priority] || "var(--textGhost)"}`, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={e => e.currentTarget.style.background = "#4ecb7140"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                              <span style={{ fontSize: 8, opacity: 0.3 }}>✓</span>
                                            </div>
                                            <span style={{ flex: 1, color: "var(--text)" }}>{task.content}</span>
                                            {assignee && <span style={{ fontSize: 9, color: "var(--textFaint)" }}>@{assignee}</span>}
                                            {task.due?.date && <span style={{ fontSize: 10, color: isOverdue ? "#e85454" : isToday ? "#f5a623" : "var(--textFaint)", fontWeight: isOverdue || isToday ? 700 : 400, fontFamily: "'JetBrains Mono', monospace" }}>{isToday ? "Today" : task.due.string || task.due.date}</span>}
                                            <button onClick={() => todoistDelete(task.id)} style={{ background: "none", border: "none", color: "var(--textGhost)", cursor: "pointer", fontSize: 12 }}>×</button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })}
                                {tasks.length === 0 && todoistFilter === "all" && <div style={{ padding: "12px 16px", fontSize: 11, color: "var(--textGhost)", textAlign: "center" }}>No tasks yet</div>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>
            )}

            {/* ═══ GLOBAL CONTACTS ═══ */}
            {activeTab === "globalContacts" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, position: "sticky", top: 0, background: "var(--bg)", zIndex: 6, paddingTop: 4, paddingBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>ALL CONTACTS</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Instrument Sans'" }}>Global Partners</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search contacts..." style={{ padding: "8px 14px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--textSub)", fontSize: 12, outline: "none", width: 240 }} />
                    <select value={contactFilterType} onChange={e => setContactFilterType(e.target.value)} style={{ padding: "8px 10px", background: "var(--bgCard)", border: `1px solid ${contactFilterType ? "#ff6b4a40" : "var(--borderSub)"}`, borderRadius: 7, color: contactFilterType ? "#ff6b4a" : "var(--textFaint)", fontSize: 11, outline: "none", cursor: "pointer", appearance: "auto" }}>
                      <option value="">All Types</option>
                      {[...new Set(contacts.map(c => c.contactType).filter(Boolean))].sort().map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={contactFilterResource} onChange={e => setContactFilterResource(e.target.value)} style={{ padding: "8px 10px", background: "var(--bgCard)", border: `1px solid ${contactFilterResource ? "#3da5db40" : "var(--borderSub)"}`, borderRadius: 7, color: contactFilterResource ? "#3da5db" : "var(--textFaint)", fontSize: 11, outline: "none", cursor: "pointer", appearance: "auto" }}>
                      <option value="">All Resources</option>
                      {[...new Set(contacts.map(c => c.resourceType).filter(Boolean))].sort().map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <label style={{ padding: "7px 16px", background: "#3da5db15", border: "1px solid #3da5db30", borderRadius: 7, color: "#3da5db", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>📇</span> Import vCard
                      <input type="file" accept=".vcf,.vcard" onChange={handleVCardUpload} style={{ display: "none" }} multiple />
                    </label>
                    <label style={{ padding: "7px 16px", background: "#4ecb7115", border: "1px solid #4ecb7130", borderRadius: 7, color: "#4ecb71", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>📊</span> Import CSV
                      <input type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: "none" }} />
                    </label>
                    <button onClick={() => emailExport("Partners")} style={{ padding: "7px 16px", background: "#9b6dff15", border: "1px solid #9b6dff30", borderRadius: 7, color: "#9b6dff", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>📤</span> Export CSV
                    </button>
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
                  <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10 }}>
                    {/* Bulk action bar */}
                    {selectedContacts.size > 0 && (
                      <div style={{ padding: "8px 16px", background: "#ff6b4a08", borderBottom: "1px solid var(--borderSub)", display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#ff6b4a" }}>{selectedContacts.size} selected</span>
                        <button onClick={() => { if (confirm(`Delete ${selectedContacts.size} selected contact(s)?`)) { pushUndo("Delete contacts"); setContacts(prev => prev.filter(c => !selectedContacts.has(c.id))); setSelectedContacts(new Set()); } }} style={{ padding: "4px 12px", background: "#e8545415", border: "1px solid #e8545430", borderRadius: 5, color: "#e85454", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>🗑 Delete Selected</button>
                        <button onClick={() => setSelectedContacts(new Set())} style={{ padding: "4px 12px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "var(--textFaint)", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>✕ Clear</button>
                      </div>
                    )}
                    <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 200px)" }}>
                    <div style={{ minWidth: 1420 }}>
                    <div style={{ display: "grid", gridTemplateColumns: colsToGrid(partnerColWidths), padding: "10px 16px", borderBottom: "1px solid var(--borderSub)", fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1, position: "sticky", top: 0, background: "var(--bgInput)", zIndex: 5, minWidth: 1400 }}>
                      {[["", ""], ["NAME", "name"], ["TYPE", "contactType"], ["RESOURCE TYPE", "resourceType"], ["POSITION", "position"], ["PHONE", "phone"], ["EMAIL", "email"], ["ADDRESS", "address"], ["COMPANY", "company"], ["ACTIONS", ""], ["DOCS", ""]].map(([label, sortKey], i) => (
                        <span key={i} style={{ position: "relative", userSelect: "none", cursor: sortKey ? "pointer" : "default", display: "flex", alignItems: "center", gap: 3 }} onClick={() => { if (!sortKey) return; setPartnerSort(prev => prev.col === sortKey ? { col: sortKey, dir: prev.dir === "asc" ? "desc" : "asc" } : { col: sortKey, dir: "asc" }); }}>
                          {i === 0 ? <input type="checkbox" checked={contacts.length > 0 && selectedContacts.size === contacts.filter(c => !contactSearch || c.name.toLowerCase().includes(contactSearch.toLowerCase()) || (c.email || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.company || "").toLowerCase().includes(contactSearch.toLowerCase())).length} onChange={(e) => { if (e.target.checked) { const visible = contacts.filter(c => !contactSearch || c.name.toLowerCase().includes(contactSearch.toLowerCase()) || (c.email || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.company || "").toLowerCase().includes(contactSearch.toLowerCase())); setSelectedContacts(new Set(visible.map(c => c.id))); } else { setSelectedContacts(new Set()); } }} style={{ cursor: "pointer" }} /> : <>{label}{partnerSort.col === sortKey && <span style={{ color: "#ff6b4a", fontSize: 8 }}>{partnerSort.dir === "asc" ? "▲" : "▼"}</span>}</>}
                          {i < partnerColWidths.length - 1 && renderResizeHandle(setPartnerColWidths, i)}
                        </span>
                      ))}
                    </div>
                    {contacts.filter(c => (!contactSearch || c.name.toLowerCase().includes(contactSearch.toLowerCase()) || (c.email || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.company || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.position || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.address || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.resourceType || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.contactType || "").toLowerCase().includes(contactSearch.toLowerCase())) && (!contactFilterType || c.contactType === contactFilterType) && (!contactFilterResource || c.resourceType === contactFilterResource)).sort((a, b) => { if (!partnerSort.col) return 0; const av = (a[partnerSort.col] || "").toString().toLowerCase(); const bv = (b[partnerSort.col] || "").toString().toLowerCase(); return partnerSort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av); }).map(c => (
                      <div key={c.id} style={{ display: "grid", gridTemplateColumns: colsToGrid(partnerColWidths), padding: "10px 16px", borderBottom: "1px solid var(--calLine)", alignItems: "center", fontSize: 12, background: selectedContacts.has(c.id) ? "#ff6b4a08" : "transparent", minWidth: 1400 }}>
                        <span><input type="checkbox" checked={selectedContacts.has(c.id)} onChange={(e) => { const next = new Set(selectedContacts); if (e.target.checked) next.add(c.id); else next.delete(c.id); setSelectedContacts(next); }} style={{ cursor: "pointer" }} /></span>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div onClick={(e) => viewContact(c, e)} style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #ff6b4a20, #ff4a6b20)", border: "1px solid #ff6b4a30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#ff6b4a", flexShrink: 0, cursor: "pointer" }}>
                            {c.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <div style={{ overflow: "hidden" }}>
                            <div style={{ fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                            {c.department && <div style={{ fontSize: 9, color: "var(--textFaint)" }}>{c.department}</div>}
                          </div>
                        </div>
                        <span style={{ fontSize: 9 }}>{c.contactType ? <span style={{ padding: "2px 7px", background: c.contactType === "Client" ? "#3da5db10" : c.contactType === "Vendor" ? "#4ecb7110" : "#9b6dff10", border: `1px solid ${c.contactType === "Client" ? "#3da5db20" : c.contactType === "Vendor" ? "#4ecb7120" : "#9b6dff20"}`, borderRadius: 3, fontSize: 9, fontWeight: 600, color: c.contactType === "Client" ? "#3da5db" : c.contactType === "Vendor" ? "#4ecb71" : "#9b6dff", whiteSpace: "nowrap" }}>{c.contactType}</span> : "—"}{(c.clientAssociation || clients.some(cl => cl.name.toLowerCase() === (c.company || "").toLowerCase())) && <span style={{ marginLeft: 3, fontSize: 8, color: "#3da5db" }} title={`Linked: ${c.clientAssociation || clients.find(cl => cl.name.toLowerCase() === (c.company || "").toLowerCase())?.name}`}>🔗</span>}</span>
                        <span style={{ color: "var(--textMuted)", fontSize: 10 }}>{c.resourceType ? <span style={{ padding: "2px 7px", background: "#3da5db10", border: "1px solid #3da5db20", borderRadius: 3, fontSize: 9, fontWeight: 600, color: "#3da5db", whiteSpace: "nowrap" }}>{c.resourceType}</span> : "—"}</span>
                        <span style={{ color: "var(--textMuted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.position || "—"}</span>
                        <span onClick={(e) => c.phone && copyToClipboard(c.phone, "Phone", e)} style={{ color: "var(--textMuted)", fontSize: 11, cursor: c.phone ? "pointer" : "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} onMouseEnter={e => { if (c.phone) e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={e => e.currentTarget.style.color = "var(--textMuted)"}>{c.phone || "—"} {c.phone && <span style={{ fontSize: 7, color: "var(--textGhost)" }}>⧉</span>}</span>
                        <span onClick={(e) => c.email && copyToClipboard(c.email, "Email", e)} style={{ color: "var(--textMuted)", fontSize: 11, cursor: c.email ? "pointer" : "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} onMouseEnter={e => { if (c.email) e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={e => e.currentTarget.style.color = "var(--textMuted)"}>{c.email || "—"} {c.email && <span style={{ fontSize: 7, color: "var(--textGhost)" }}>⧉</span>}</span>
                        <span onClick={(e) => c.address && copyToClipboard(c.address, "Address", e)} style={{ color: "var(--textMuted)", fontSize: 10, cursor: c.address ? "pointer" : "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} onMouseEnter={e => { if (c.address) e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={e => e.currentTarget.style.color = "var(--textMuted)"} title={c.address || ""}>{c.address || "—"} {c.address && <span style={{ fontSize: 7, color: "var(--textGhost)" }}>⧉</span>}</span>
                        <span style={{ color: "var(--textMuted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.company || "—"}</span>
                        <div style={{ display: "flex", gap: 4, alignItems: "center", position: "relative", flexWrap: "nowrap", overflow: "visible" }}>
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
                                    {(appSettings.projectRoles || ["Producer", "Manager", "Staff / Crew", "Client", "Point of Contact", "Billing", "Talent", "Artist", "Agent", "Venue Rep"]).slice().sort().map(r => (
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
                          <button onClick={() => { setContactForm({ ...c, clientAssociation: c.clientAssociation || (clients.find(cl => cl.name.toLowerCase() === (c.company || c.vendorName || "").toLowerCase())?.name || "") }); setShowAddContact(true); }} style={{ padding: "4px 10px", background: "var(--bgCard)", border: "1px solid var(--borderActive)", borderRadius: 5, color: "var(--textMuted)", cursor: "pointer", fontSize: 10, fontWeight: 600 }} title="Edit contact">✏ Edit</button>
                          <button onClick={() => downloadVCard(c)} style={{ padding: "4px 8px", background: "var(--bgCard)", border: "1px solid var(--borderActive)", borderRadius: 5, color: "var(--textMuted)", cursor: "pointer", fontSize: 10, fontWeight: 600 }} title="Save to Mac Contacts (.vcf)">📇</button>
                          <button onClick={() => { if (confirm(`Remove ${c.name}?`)) { pushUndo("Delete contact"); setContacts(prev => prev.filter(x => x.id !== c.id)); } }} style={{ padding: "4px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "#e85454", cursor: "pointer", fontSize: 10, fontWeight: 600 }} title="Delete contact">✕</button>
                        </div>
                        {/* DOCS column - functional upload buttons synced with vendor compliance */}
                        {(() => {
                          const contactVendorName = c.vendorName || c.company || c.name;
                          const matchVendor = vendors.find(v => {
                            const vn = v.name.toLowerCase();
                            return vn === (c.name || "").toLowerCase() || vn === (c.company || "").toLowerCase() || vn === (c.vendorName || "").toLowerCase();
                          });
                          const useVendorName = contactVendorName;
                          // Merge vendor compliance with Drive compliance map (fallback for contacts without vendor entries)
                          const vendorComp = matchVendor?.compliance || {};
                          const driveComp = driveComplianceMap[useVendorName] || driveComplianceMap[c.name] || driveComplianceMap[c.company] || {};
                          const comp = { ...vendorComp };
                          // Fill in from Drive map if vendor compliance is missing
                          ['coi', 'w9'].forEach(key => {
                            if (!comp[key]?.done && driveComp[key]?.done) {
                              comp[key] = { done: true, file: driveComp[key].file, link: driveComp[key].link };
                            }
                          });
                          const docBtns = [
                            { key: "coi", label: "COI", color: "#4ecb71", prefix: "ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/2026 COIs & Workers Comp" },
                            { key: "w9", label: "W9", color: "#3da5db", prefix: "ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/2026 W9s" },
                            { key: "banking", label: "BANK", color: "#dba94e", prefix: "ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/Banking" },
                          ];
                          const handleContactDocUpload = (docKey, prefix) => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = ".pdf,.doc,.docx,.jpg,.png,.xlsx";
                            input.onchange = (ev) => {
                              const f = ev.target.files[0];
                              if (!f) return;
                              // Find or auto-create a vendor entry for THIS contact
                              let vid = matchVendor?.id;
                              if (!vid) {
                                vid = `v_${Date.now()}`;
                                const newV = {
                                  id: vid, name: useVendorName, type: c.resourceType || "Other",
                                  email: c.email, contact: c.name, phone: c.phone, title: c.position,
                                  contactType: "", deptId: c.department, source: "contacts",
                                  ein: "", address: c.address || "",
                                  compliance: { coi: { done: false }, w9: { done: false }, invoice: { done: false }, banking: { done: false }, contract: { done: false } }
                                };
                                setVendors(prev => [...prev, newV]);
                              }
                              const drivePath = `${prefix}/${useVendorName}/`;
                              handleFileDrop(vid, docKey, f, drivePath, prefix);
                            };
                            input.click();
                          };
                          return (
                            <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                              {docBtns.map(d => {
                                const done = comp[d.key]?.done;
                                const uploading = comp[d.key]?.uploading;
                                return (
                                  <button key={d.key}
                                    onClick={() => done && comp[d.key]?.link ? window.open(comp[d.key].link, "_blank") : handleContactDocUpload(d.key, d.prefix)}
                                    title={done ? `${comp[d.key]?.file || d.label} — click to open` : `Upload ${d.label}`}
                                    style={{
                                      padding: "3px 7px", borderRadius: 4, fontSize: 8, fontWeight: 700, cursor: "pointer",
                                      background: done ? `${d.color}15` : "var(--bgCard)",
                                      border: `1px solid ${done ? d.color + "40" : "var(--borderSub)"}`,
                                      color: done ? d.color : "var(--textGhost)",
                                      whiteSpace: "nowrap", lineHeight: 1.4,
                                      opacity: uploading ? 0.5 : 1,
                                    }}>
                                    {uploading ? "⏳" : done ? "✓" : "+"} {d.label}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                    </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ CLIENTS ═══ */}
            {activeTab === "clients" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, position: "sticky", top: 0, background: "var(--bg)", zIndex: 6, paddingTop: 4, paddingBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>COMPANY DIRECTORY</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Instrument Sans'" }}>Clients</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Search clients..." style={{ padding: "8px 14px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--textSub)", fontSize: 12, outline: "none", width: 240 }} />
                    <select value={clientFilterAttr} onChange={e => setClientFilterAttr(e.target.value)} style={{ padding: "8px 10px", background: "var(--bgCard)", border: `1px solid ${clientFilterAttr ? "#9b6dff40" : "var(--borderSub)"}`, borderRadius: 7, color: clientFilterAttr ? "#9b6dff" : "var(--textFaint)", fontSize: 11, outline: "none", cursor: "pointer", appearance: "auto" }}>
                      <option value="">All Types</option>
                      {CLIENT_ATTRIBUTES.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <label style={{ padding: "7px 16px", background: "#4ecb7115", border: "1px solid #4ecb7130", borderRadius: 7, color: "#4ecb71", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>📊</span> Import CSV
                      <input type="file" accept=".csv" onChange={handleClientsCSVUpload} style={{ display: "none" }} />
                    </label>
                    <button onClick={() => emailExport("Clients")} style={{ padding: "7px 16px", background: "#9b6dff15", border: "1px solid #9b6dff30", borderRadius: 7, color: "#9b6dff", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>📤</span> Export CSV
                    </button>
                    <button onClick={() => { setClientForm({ ...emptyClient }); setShowAddClient(true); }} style={{ padding: "7px 16px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 7, color: "#ff6b4a", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14 }}>+</span> Add Client
                    </button>
                  </div>
                </div>

                {clients.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 60, color: "var(--textGhost)" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--textFaint)" }}>No clients yet</div>
                    <div style={{ fontSize: 13, marginBottom: 20 }}>Add clients manually or import from your Companies CSV</div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                      <label style={{ padding: "10px 20px", background: "#4ecb7115", border: "1px solid #4ecb7130", borderRadius: 8, color: "#4ecb71", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                        📊 Import CSV
                        <input type="file" accept=".csv" onChange={handleClientsCSVUpload} style={{ display: "none" }} />
                      </label>
                      <button onClick={() => { setClientForm({ ...emptyClient }); setShowAddClient(true); }} style={{ padding: "10px 20px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 8, color: "#ff6b4a", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>+ Add Manually</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10 }}>
                    {selectedClientIds.size > 0 && (
                      <div style={{ padding: "8px 16px", background: "#ff6b4a08", borderBottom: "1px solid var(--borderSub)", display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#ff6b4a" }}>{selectedClientIds.size} selected</span>
                        <button onClick={() => { if (confirm(`Delete ${selectedClientIds.size} selected client(s)?`)) { pushUndo("Delete clients"); setClients(prev => prev.filter(c => !selectedClientIds.has(c.id))); setSelectedClientIds(new Set()); } }} style={{ padding: "4px 12px", background: "#e8545415", border: "1px solid #e8545430", borderRadius: 5, color: "#e85454", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>🗑 Delete Selected</button>
                        <button onClick={() => setSelectedClientIds(new Set())} style={{ padding: "4px 12px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "var(--textFaint)", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>✕ Clear</button>
                      </div>
                    )}
                    <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 200px)" }}>
                    <div style={{ minWidth: 1200 }}>
                    <div style={{ display: "grid", gridTemplateColumns: colsToGrid(clientColWidths), padding: "10px 16px", borderBottom: "1px solid var(--borderSub)", fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1, position: "sticky", top: 0, background: "var(--bgInput)", zIndex: 5 }}>
                      {[["", ""], ["COMPANY NAME", "name"], ["CODE", "code"], ["ATTRIBUTES", "attributes"], ["CONTACT", "companyContact"], ["EMAIL", "billingEmail"], ["PHONE", "billingPhone"], ["BILLING CONTACT", "billingContact"], ["BILLING EMAIL", "billingEmail"], ["ACTIONS", ""]].map(([label, sortKey], i) => (
                        <span key={i} style={{ position: "relative", userSelect: "none", cursor: sortKey ? "pointer" : "default", display: "flex", alignItems: "center", gap: 3 }} onClick={() => { if (!sortKey) return; setClientSort(prev => prev.col === sortKey ? { col: sortKey, dir: prev.dir === "asc" ? "desc" : "asc" } : { col: sortKey, dir: "asc" }); }}>
                          {i === 0 ? <input type="checkbox" checked={clients.length > 0 && selectedClientIds.size === clients.filter(c => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase()) || (c.code || "").toLowerCase().includes(clientSearch.toLowerCase())).length} onChange={(e) => { if (e.target.checked) { const visible = clients.filter(c => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase()) || (c.code || "").toLowerCase().includes(clientSearch.toLowerCase())); setSelectedClientIds(new Set(visible.map(c => c.id))); } else { setSelectedClientIds(new Set()); } }} style={{ cursor: "pointer" }} /> : <>{label}{clientSort.col === sortKey && <span style={{ color: "#ff6b4a", fontSize: 8 }}>{clientSort.dir === "asc" ? "▲" : "▼"}</span>}</>}
                          {i < clientColWidths.length - 1 && renderResizeHandle(setClientColWidths, i)}
                        </span>
                      ))}
                    </div>
                    {clients.filter(c => (!clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase()) || (c.code || "").toLowerCase().includes(clientSearch.toLowerCase()) || (c.attributes || []).join(" ").toLowerCase().includes(clientSearch.toLowerCase()) || (c.billingContact || "").toLowerCase().includes(clientSearch.toLowerCase())) && (!clientFilterAttr || (c.attributes || []).includes(clientFilterAttr))).sort((a, b) => { if (!clientSort.col) return 0; const av = clientSort.col === "attributes" ? (a.attributes || []).join(", ").toLowerCase() : (a[clientSort.col] || "").toString().toLowerCase(); const bv = clientSort.col === "attributes" ? (b.attributes || []).join(", ").toLowerCase() : (b[clientSort.col] || "").toString().toLowerCase(); return clientSort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av); }).map(c => {
                      const linkedContacts = contacts.filter(ct => (ct.company || "").toLowerCase() === c.name.toLowerCase() || (ct.vendorName || "").toLowerCase() === c.name.toLowerCase() || (ct.clientAssociation || "").toLowerCase() === c.name.toLowerCase());
                      const isExpanded = expandedClientId === c.id;
                      return (
                      <React.Fragment key={c.id}>
                      <div onClick={() => setExpandedClientId(isExpanded ? null : c.id)} style={{ display: "grid", gridTemplateColumns: colsToGrid(clientColWidths), padding: "10px 16px", borderBottom: isExpanded ? "none" : "1px solid var(--calLine)", alignItems: "center", fontSize: 12, background: isExpanded ? "#3da5db08" : selectedClientIds.has(c.id) ? "#ff6b4a08" : "transparent", cursor: "pointer", borderLeft: isExpanded ? "3px solid #3da5db" : "3px solid transparent" }}>
                        <span onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedClientIds.has(c.id)} onChange={(e) => { const next = new Set(selectedClientIds); if (e.target.checked) next.add(c.id); else next.delete(c.id); setSelectedClientIds(next); }} style={{ cursor: "pointer" }} /></span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #3da5db20, #3da5db10)", border: "1px solid #3da5db30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#3da5db", flexShrink: 0 }}>
                            {c.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <div style={{ fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={c.name}>{c.name}</div>
                          {linkedContacts.length > 0 && <span style={{ fontSize: 9, padding: "1px 6px", background: "#3da5db15", border: "1px solid #3da5db25", borderRadius: 10, color: "#3da5db", fontWeight: 700, flexShrink: 0 }}>{linkedContacts.length} {isExpanded ? "▴" : "▾"}</span>}
                          {linkedContacts.length === 0 && (c.contactName || c.billingContact || (c.contactNames || []).length > 0) && <span style={{ fontSize: 9, padding: "1px 6px", background: "#ff6b4a10", border: "1px solid #ff6b4a20", borderRadius: 10, color: "#ff6b4a", fontWeight: 700, flexShrink: 0 }}>{(c.contactName ? 1 : 0) + (c.billingContact && c.billingContact !== c.contactName ? 1 : 0) + (c.contactNames || []).filter(n => n && n !== c.contactName && n !== c.billingContact).length} {isExpanded ? "▴" : "▾"}</span>}
                        </div>
                        <span style={{ color: "#ff6b4a", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600 }}>{c.code || "—"}</span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>{(c.attributes || []).slice(0, 2).map(a => <span key={a} style={{ padding: "1px 5px", background: "#9b6dff10", border: "1px solid #9b6dff20", borderRadius: 3, fontSize: 8, fontWeight: 600, color: "#9b6dff", whiteSpace: "nowrap" }}>{a}</span>)}{(c.attributes || []).length > 2 && <span style={{ fontSize: 8, color: "var(--textFaint)" }}>+{c.attributes.length - 2}</span>}</div>
                        <span style={{ color: "var(--textMuted)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.contactName}>{c.contactName || "—"}</span>
                        <span onClick={(e) => { e.stopPropagation(); (c.contactEmail) && copyToClipboard(c.contactEmail, "Email", e); }} style={{ color: "var(--textMuted)", fontSize: 10, cursor: c.contactEmail ? "pointer" : "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.contactEmail}>{c.contactEmail || "—"}</span>
                        <span onClick={(e) => { e.stopPropagation(); (c.contactPhone) && copyToClipboard(c.contactPhone, "Phone", e); }} style={{ color: "var(--textMuted)", fontSize: 10, cursor: c.contactPhone ? "pointer" : "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.contactPhone || "—"}</span>
                        <span style={{ color: "var(--textMuted)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.billingContact}>{c.billingContact || "—"}</span>
                        <span onClick={(e) => { e.stopPropagation(); c.billingEmail && copyToClipboard(c.billingEmail, "Billing Email", e); }} style={{ color: "var(--textMuted)", fontSize: 10, cursor: c.billingEmail ? "pointer" : "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.billingEmail}>{c.billingEmail || "—"}</span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setClientForm({ ...c }); setShowAddClient(true); }} style={{ padding: "4px 10px", background: "var(--bgCard)", border: "1px solid var(--borderActive)", borderRadius: 5, color: "var(--textMuted)", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>✏ Edit</button>
                          <button onClick={() => { if (confirm(`Remove ${c.name}?`)) { pushUndo("Delete client"); setClients(prev => prev.filter(x => x.id !== c.id)); } }} style={{ padding: "4px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "#e85454", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>✕</button>
                          <span style={{ fontSize: 12, color: isExpanded ? "#3da5db" : "var(--textGhost)", transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "none" }}>▸</span>
                        </div>
                      </div>
                      {isExpanded && (
                        <div style={{ borderBottom: "1px solid var(--calLine)", borderLeft: "3px solid #3da5db", background: "#3da5db05" }}>
                          <div style={{ padding: "10px 16px 6px 52px", fontSize: 9, color: "#3da5db", fontWeight: 700, letterSpacing: 1 }}>CONTACTS FOR {c.name.toUpperCase()}</div>
                          {(() => {
                            // Build combined list: client's own contacts + linked partners
                            const allContacts = [];
                            // Add client's primary contact if exists
                            if (c.contactName) allContacts.push({ id: "_primary_" + c.id, name: c.contactName, email: c.contactEmail, phone: c.contactPhone, position: "Client Contact", _source: "client" });
                            // Add billing contact if different from primary
                            if (c.billingContact && c.billingContact !== c.contactName) allContacts.push({ id: "_billing_" + c.id, name: c.billingContact, email: c.billingEmail, phone: c.billingPhone, position: "Billing Contact", _source: "client" });
                            // Add additional contact names from CSV
                            (c.contactNames || []).forEach((cn, ci) => {
                              if (cn && cn !== c.contactName && cn !== c.billingContact) allContacts.push({ id: "_cn_" + c.id + "_" + ci, name: cn, email: "", phone: "", position: "Contact", _source: "client" });
                            });
                            // Add linked Global Partners (deduplicate by name)
                            const existingNames = new Set(allContacts.map(x => x.name.toLowerCase()));
                            linkedContacts.forEach(ct => {
                              if (!existingNames.has(ct.name.toLowerCase())) {
                                allContacts.push({ ...ct, _source: "partner" });
                                existingNames.add(ct.name.toLowerCase());
                              } else {
                                // Merge: if partner has more data, update the existing entry
                                const existing = allContacts.find(x => x.name.toLowerCase() === ct.name.toLowerCase());
                                if (existing && !existing.email && ct.email) existing.email = ct.email;
                                if (existing && !existing.phone && ct.phone) existing.phone = ct.phone;
                                if (existing && ct.position && ct.position !== "Contact") existing.position = ct.position;
                                if (existing) existing._source = "merged";
                              }
                            });
                            return allContacts.length === 0 ? (
                              <div style={{ padding: "8px 16px 14px 52px", fontSize: 12, color: "var(--textFaint)" }}>No contacts for {c.name}. Add a contact or billing info via Edit.</div>
                            ) : (
                              <div style={{ padding: "0 16px 10px 52px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "200px 130px 200px 160px 80px", padding: "6px 0", fontSize: 8, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1, borderBottom: "1px solid var(--borderSub)" }}>
                                  <span>NAME</span><span>ROLE</span><span>EMAIL</span><span>PHONE</span><span></span>
                                </div>
                                {allContacts.map(ct => (
                                  <div key={ct.id} style={{ display: "grid", gridTemplateColumns: "200px 130px 200px 160px 80px", padding: "8px 0", fontSize: 11, alignItems: "center", borderBottom: "1px solid var(--calLine)" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: ct._source === "partner" || ct._source === "merged" ? "linear-gradient(135deg, #3da5db15, #3da5db10)" : "linear-gradient(135deg, #ff6b4a15, #ff4a6b15)", border: `1px solid ${ct._source === "partner" || ct._source === "merged" ? "#3da5db25" : "#ff6b4a25"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: ct._source === "partner" || ct._source === "merged" ? "#3da5db" : "#ff6b4a", flexShrink: 0 }}>{ct.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                                      <span style={{ fontWeight: 600, color: "var(--text)" }}>{ct.name}</span>
                                      {(ct._source === "partner" || ct._source === "merged") && <span style={{ fontSize: 7, color: "#3da5db" }} title="Linked in Global Partners">🔗</span>}
                                    </div>
                                    <span style={{ fontSize: 10, color: "var(--textMuted)" }}>{ct.position || "—"}</span>
                                    <span onClick={(e) => ct.email && copyToClipboard(ct.email, "Email", e)} style={{ color: ct.email ? "#3da5db" : "var(--textGhost)", fontSize: 10, cursor: ct.email ? "pointer" : "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={ct.email}>{ct.email || "—"}</span>
                                    <span onClick={(e) => ct.phone && copyToClipboard(ct.phone, "Phone", e)} style={{ color: ct.phone ? "var(--textMuted)" : "var(--textGhost)", fontSize: 10, cursor: ct.phone ? "pointer" : "default" }}>{ct.phone || "—"}</span>
                                    {ct._source !== "client" ? <button onClick={(e) => { e.stopPropagation(); setContactForm({ ...ct }); setShowAddContact(true); }} style={{ padding: "3px 8px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 4, color: "var(--textFaint)", cursor: "pointer", fontSize: 9, fontWeight: 600 }}>✏ Edit</button> : <span />}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                      </React.Fragment>
                      );
                    })}
                    </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ TODOIST (GLOBAL) ═══ */}
            {activeTab === "todoist" && !project && (
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


            {/* ═══ OVERVIEW ═══ */}
            {activeTab === "overview" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", gap: 12, marginBottom: 22 }}>
                  <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>STATUS</div>
                    <Dropdown value={project.status} options={[...new Set([...STATUSES, ...(appSettings.statuses || [])])].filter(Boolean)} onChange={v => updateProject("status", v)} colors={{...STATUS_COLORS, ...Object.fromEntries((appSettings.statuses || []).filter(s => !STATUS_COLORS[s]).map(s => [s, { bg: "#9b6dff10", text: "#9b6dff", dot: "#9b6dff" }]))}} width="100%" />
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
                      <div key={i} style={{ marginBottom: 12 }}><span style={{ fontSize: 9, color: "#ff6b4a", fontWeight: 700, letterSpacing: 0.8, marginRight: 8 }}>{f.q}</span>{f.key === "location" ? <AddressAutocomplete value={project[f.key]} onChange={v => updateProject(f.key, v)} showIcon={false} placeholder="Click to edit" inputStyle={{ padding: "2px 6px", background: "var(--bgInput)", border: "1px solid #ff6b4a40", borderRadius: 4, color: "var(--textSub)", fontSize: 12, fontFamily: "'DM Sans', sans-serif", outline: "none", width: "100%" }} /> : <EditableText value={project[f.key]} onChange={v => updateProject(f.key, v)} fontSize={12} color="var(--textSub)" multiline={f.multi} />}</div>
                    ))}
                    
                    {/* SERVICE NEEDS */}
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ fontSize: 9, color: "#ff6b4a", fontWeight: 700, letterSpacing: 0.8, marginRight: 8 }}>SERVICES</span>
                      <div style={{ marginTop: 4 }}>
                        <MultiDropdown values={project.services || []} options={SERVICE_OPTIONS} onChange={v => updateProject("services", v)} />
                      </div>
                    </div>

                    {/* CLIENT CONTACTS - auto-populate from Clients list if empty */}
                    {(() => {
                      let effectiveClientContacts = project.clientContacts || [];
                      if (effectiveClientContacts.length === 0 && project.client) {
                        const clientLower = project.client.trim().toLowerCase();
                        const matchedClient = clients.find(cl => cl.name?.trim().toLowerCase() === clientLower) || clients.find(cl => clientLower.includes(cl.name?.trim().toLowerCase()) || cl.name?.trim().toLowerCase().includes(clientLower));
                        if (matchedClient) {
                          effectiveClientContacts = [{
                            name: matchedClient.companyContact || matchedClient.contactName || matchedClient.billingContact || matchedClient.name,
                            phone: matchedClient.contactPhone || matchedClient.billingPhone || "",
                            email: matchedClient.contactEmail || matchedClient.billingEmail || "",
                            company: matchedClient.name,
                            position: "Client",
                            address: [matchedClient.address, matchedClient.city, matchedClient.state, matchedClient.zip].filter(Boolean).join(", "),
                            autoPopulated: true
                          }];
                        }
                      }
                      return <ContactListBlock label="CLIENT" searchLabel="🔍 Search Clients" items={effectiveClientContacts} contacts={clients.map(cl => ({ id: cl.id, name: cl.name, phone: cl.contactPhone || cl.billingPhone || "", email: cl.contactEmail || cl.billingEmail || "", company: cl.name, position: "Client", address: [cl.address, cl.city, cl.state, cl.zip].filter(Boolean).join(", ") }))} onViewContact={viewContact} copyToClipboard={copyToClipboard} showAddress onUpdateGlobalContact={updateGlobalContact} onUpdate={v => updateProject("clientContacts", v)} onSaveToGlobal={(poc, pi) => {
                      const exists = contacts.find(c => c.name.toLowerCase() === poc.name.toLowerCase());
                      if (!exists) { const names = poc.name.split(" "); setContacts(prev => [...prev, { id: `ct_${Date.now()}`, name: poc.name, firstName: names[0] || "", lastName: names.slice(1).join(" ") || "", phone: poc.phone, email: poc.email, company: project.client, position: "Client", department: "", address: poc.address || "", notes: `Client for ${project.name}`, source: "project" }]); }
                      const arr = [...(project.clientContacts || [])]; arr[pi] = { ...arr[pi], fromContacts: true }; updateProject("clientContacts", arr);
                    }} />;
                    })()}

                    {/* POINT OF CONTACT(S) */}
                    <ContactListBlock label="POINT OF CONTACT(S)" searchLabel="🔍 Search Partners" items={project.pocs || []} contacts={contacts} onViewContact={viewContact} copyToClipboard={copyToClipboard} showAddress onUpdateGlobalContact={updateGlobalContact} onUpdate={v => updateProject("pocs", v)} onSaveToGlobal={(poc, pi) => {
                      const exists = contacts.find(c => c.name.toLowerCase() === poc.name.toLowerCase());
                      if (!exists) { const names = poc.name.split(" "); setContacts(prev => [...prev, { id: `ct_${Date.now()}`, name: poc.name, firstName: names[0] || "", lastName: names.slice(1).join(" ") || "", phone: poc.phone, email: poc.email, company: project.client, position: "", department: "", address: poc.address || "", notes: `POC for ${project.name}`, source: "project" }]); }
                      const arr = [...(project.pocs || [])]; arr[pi] = { ...arr[pi], fromContacts: true }; updateProject("pocs", arr);
                    }} />

                    {/* BILLING CONTACT */}
                    <ContactListBlock label="BILLING CONTACT" searchLabel="🔍 Search Partners" items={project.billingContacts || []} contacts={contacts} onViewContact={viewContact} copyToClipboard={copyToClipboard} showAddress onUpdateGlobalContact={updateGlobalContact} onUpdate={v => updateProject("billingContacts", v)} onSaveToGlobal={(poc, pi) => {
                      const exists = contacts.find(c => c.name.toLowerCase() === poc.name.toLowerCase());
                      if (!exists) { const names = poc.name.split(" "); setContacts(prev => [...prev, { id: `ct_${Date.now()}`, name: poc.name, firstName: names[0] || "", lastName: names.slice(1).join(" ") || "", phone: poc.phone, email: poc.email, company: project.client, position: "Billing", department: "Finance", address: poc.address || "", notes: `Billing for ${project.name}`, source: "project" }]); }
                      const arr = [...(project.billingContacts || [])]; arr[pi] = { ...arr[pi], fromContacts: true }; updateProject("billingContacts", arr);
                    }} />
                  </div>
                  <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "18px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1 }}>BUDGET SNAPSHOT</div><a href="https://app.saturation.io/weareadptv" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#ff6b4a", textDecoration: "none", fontWeight: 600 }}>Open in Saturation →</a></div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
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
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
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

            {/* ═══ TODOIST (PER-PROJECT) ═══ */}
            {activeTab === "todoist" && project && (() => {
              const projCode = project.code || generateProjectCode(project);
              const linkedTodoistId = project.todoistProjectId;
              const linkedProject = linkedTodoistId ? todoistProjects.find(p => p.id === linkedTodoistId) : null;
              const projectTasks = linkedTodoistId ? todoistTasks.filter(t => t.project_id === linkedTodoistId) : [];
              const today = new Date().toISOString().split("T")[0];
              return (
                <div style={{ animation: "fadeUp 0.3s ease", maxWidth: 900 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>TASK MANAGEMENT</div>
                      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Instrument Sans'" }}>Todoist — {project.name}</div>
                    </div>
                    {linkedProject && <button onClick={async () => { await todoistFetch(); if (linkedTodoistId) await todoistFetchProjectDetails(linkedTodoistId); }} style={{ padding: "7px 16px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 7, color: "#ff6b4a", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>↻ Refresh</button>}
                  </div>

                  {!todoistKey ? (
                    <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 12, padding: 40, textAlign: "center" }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Connect Todoist First</div>
                      <div style={{ fontSize: 13, color: "var(--textFaint)", marginBottom: 20 }}>Your Todoist API key is configured in Settings.</div>
                    </div>
                  ) : !linkedProject ? (
                    <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 12, padding: 50, textAlign: "center" }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, fontFamily: "'Instrument Sans'" }}>No Todoist project linked</div>
                      <div style={{ fontSize: 13, color: "var(--textFaint)", marginBottom: 8, lineHeight: 1.6 }}>Create a Todoist project for this event to manage tasks.</div>
                      <div style={{ fontSize: 12, color: "var(--textMuted)", marginBottom: 24 }}>Project will be named: <span style={{ fontWeight: 700, color: "#ff6b4a", fontFamily: "'JetBrains Mono', monospace" }}>{projCode}</span></div>
                      <button onClick={async (e) => {
                        const btn = e.currentTarget;
                        btn.disabled = true;
                        btn.textContent = "⏳ Creating...";
                        console.log("Creating Todoist project:", projCode, "workspace:", adptvWorkspaceId);
                        const newId = await todoistCreateProject(projCode);
                        console.log("todoistCreateProject returned:", newId);
                        if (newId) {
                          updateProject("todoistProjectId", newId);
                          await todoistFetchProjectDetails(newId);
                          setClipboardToast({ text: `Created Todoist project: ${projCode}`, x: window.innerWidth / 2, y: 60 });
                          setTimeout(() => setClipboardToast(null), 3000);
                        } else {
                          btn.disabled = false;
                          btn.textContent = "🚀 Start Todoist Project";
                          if (!document.querySelector("[data-toast]")) {
                            setClipboardToast({ text: "Failed to create project — check console for details", x: window.innerWidth / 2, y: 60 });
                            setTimeout(() => setClipboardToast(null), 4000);
                          }
                        }
                      }} style={{ padding: "14px 32px", background: "#ff6b4a", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 14px rgba(255,107,74,0.3)", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>
                        🚀 Start Todoist Project
                      </button>
                      {todoistProjects.filter(p => !p.inbox_project).length > 0 && (
                        <div style={{ marginTop: 24, borderTop: "1px solid var(--borderSub)", paddingTop: 16 }}>
                          <div style={{ fontSize: 10, color: "var(--textFaint)", marginBottom: 8 }}>Or link to an existing Todoist project:</div>
                          <select onChange={e => { if (e.target.value) { updateProject("todoistProjectId", e.target.value); setClipboardToast({ text: "Linked to Todoist project", x: window.innerWidth / 2, y: 60 }); setTimeout(() => setClipboardToast(null), 3000); } }} style={{ padding: "8px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none", minWidth: 240 }}>
                            <option value="">Select existing project...</option>
                            {todoistProjects.filter(p => !p.inbox_project).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {/* Project info bar */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "10px 16px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8 }}>
                        <span style={{ fontSize: 14 }}>✅</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{linkedProject.name}</span>
                        <span style={{ fontSize: 10, color: "var(--textFaint)" }}>{projectTasks.length} task{projectTasks.length !== 1 ? "s" : ""}</span>
                        <div style={{ flex: 1 }} />
                        <button onClick={() => { updateProject("todoistProjectId", null); }} style={{ padding: "4px 10px", background: "transparent", border: "1px solid var(--borderSub)", borderRadius: 5, color: "var(--textFaint)", cursor: "pointer", fontSize: 9, fontWeight: 600 }}>Unlink</button>
                      </div>

                      {/* Add task */}
                      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                        <input placeholder={`Add task to ${linkedProject.name}...`} value={todoistNewTask} onChange={e => setTodoistNewTask(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && todoistNewTask.trim()) { todoistAddTaskToProject(todoistNewTask.trim(), linkedTodoistId); setTodoistNewTask(""); } }} style={{ flex: 1, padding: "10px 14px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none" }} />
                        <button onClick={() => { if (todoistNewTask.trim()) { todoistAddTaskToProject(todoistNewTask.trim(), linkedTodoistId); setTodoistNewTask(""); } }} disabled={!todoistNewTask.trim()} style={{ padding: "10px 20px", background: todoistNewTask.trim() ? "#ff6b4a" : "var(--bgInput)", border: "none", borderRadius: 8, color: todoistNewTask.trim() ? "#fff" : "var(--textGhost)", cursor: todoistNewTask.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 700 }}>+ Add</button>
                      </div>

                      {/* Summary stats - top */}
                      {projectTasks.length > 0 && (
                        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                          <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, padding: "10px 16px", flex: 1, textAlign: "center" }}>
                            <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>TASKS</div>
                            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{projectTasks.length}</div>
                          </div>
                          <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, padding: "10px 16px", flex: 1, textAlign: "center" }}>
                            <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>DUE TODAY</div>
                            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#ff6b4a" }}>{projectTasks.filter(t => t.due?.date === today).length}</div>
                          </div>
                          <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, padding: "10px 16px", flex: 1, textAlign: "center" }}>
                            <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>OVERDUE</div>
                            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: projectTasks.filter(t => t.due?.date && t.due.date < today).length > 0 ? "#ff4a6b" : "var(--text)" }}>{projectTasks.filter(t => t.due?.date && t.due.date < today).length}</div>
                          </div>
                          <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, padding: "10px 16px", flex: 1, textAlign: "center" }}>
                            <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>SECTIONS</div>
                            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{todoistSections.filter(s => s.project_id === linkedTodoistId).length}</div>
                          </div>
                        </div>
                      )}

                      {/* Task list */}
                      {todoistLoading ? (
                        <div style={{ textAlign: "center", padding: 40, color: "var(--textFaint)" }}>Loading tasks...</div>
                      ) : projectTasks.length === 0 ? (
                        <div style={{ textAlign: "center", padding: 40, background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 10, color: "var(--textGhost)" }}>
                          No tasks yet — add one above!
                        </div>
                      ) : (() => {
                        const projSections = todoistSections.filter(s => s.project_id === linkedTodoistId).sort((a, b) => (a.order || 0) - (b.order || 0));
                        const unsectioned = projectTasks.filter(t => !t.section_id).sort((a, b) => (a.order || 0) - (b.order || 0));
                        const priColors = { 1: "var(--textMuted)", 2: "#3da5db", 3: "#dba94e", 4: "#ff6b4a" };
                        const priLabels = { 1: "—", 2: "Low", 3: "Med", 4: "High" };
                        const renderTask = (task) => {
                          const isOverdue = task.due && task.due.date < today;
                          const isToday = task.due && task.due.date === today;
                          const assignee = task.assignee_id ? (() => { const c = todoistCollaborators.find(x => x.id === task.assignee_id); return c ? c.name?.split(" ")[0] : ""; })() : "";
                          const isEditing = todoistEditingTask === task.id;
                          const taskComments = todoistComments[task.id] || [];
                          return (
                            <div key={task.id}>
                              {/* Task row */}
                              <div style={{ display: "grid", gridTemplateColumns: "32px 1fr auto auto 100px 32px", padding: "10px 12px", borderBottom: isEditing ? "none" : "1px solid var(--calLine)", alignItems: "center", cursor: "pointer", background: isEditing ? "#ff6b4a08" : "transparent", transition: "background 0.15s" }}>
                                <div onClick={(e) => { e.stopPropagation(); todoistClose(task.id); }} style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${priColors[task.priority] || "var(--textGhost)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#4ecb7140"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                  <span style={{ fontSize: 10, opacity: 0.4 }}>✓</span>
                                </div>
                                <div onClick={() => setTodoistEditingTask(isEditing ? null : task.id)} style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{task.content}</div>
                                  {task.description && <div style={{ fontSize: 11, color: "var(--textMuted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.description}</div>}
                                </div>
                                {taskComments.length > 0 && <span style={{ fontSize: 9, color: "var(--textFaint)", padding: "2px 6px", background: "var(--bgInput)", borderRadius: 4, marginRight: 6 }}>{String.fromCharCode(128172)}{taskComments.length}</span>}
                                <div>{assignee && <span style={{ fontSize: 9, color: "var(--textFaint)", padding: "2px 6px", background: "var(--bgInput)", borderRadius: 4 }}>@{assignee}</span>}</div>
                                <div style={{ fontSize: 10, color: isOverdue ? "#ff4a6b" : isToday ? "#ff6b4a" : "var(--textMuted)", fontWeight: isOverdue || isToday ? 600 : 400, textAlign: "right" }}>
                                  {task.due ? (isToday ? "Today" : task.due.string || task.due.date) : ""}
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); todoistDelete(task.id); }} style={{ background: "none", border: "none", color: "var(--textGhost)", cursor: "pointer", fontSize: 13, padding: 4 }} title="Delete">×</button>
                              </div>

                              {/* Expanded edit panel */}
                              {isEditing && (
                                <div style={{ padding: "16px 20px", background: "#ff6b4a05", borderBottom: "1px solid var(--calLine)", animation: "fadeUp 0.15s ease" }}>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                                    {/* Due Date */}
                                    <div>
                                      <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>DUE DATE</div>
                                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                        <input type="date" defaultValue={task.due?.date || ""} onChange={(e) => {
                                          const val = e.target.value;
                                          if (val) todoistUpdateTask(task.id, { due: { date: val } });
                                          else todoistUpdateTask(task.id, { due: null });
                                        }} style={{ flex: 1, padding: "6px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--text)", fontSize: 12, outline: "none" }} />
                                        {task.due && <button onClick={() => todoistUpdateTask(task.id, { due: null })} style={{ padding: "4px 8px", background: "transparent", border: "1px solid var(--borderSub)", borderRadius: 4, color: "var(--textFaint)", cursor: "pointer", fontSize: 10 }}>Clear</button>}
                                      </div>
                                      {/* Quick date buttons */}
                                      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                                        {[
                                          { label: "Today", date: today },
                                          { label: "Tomorrow", date: new Date(Date.now() + 86400000).toISOString().split("T")[0] },
                                          { label: "+7d", date: new Date(Date.now() + 604800000).toISOString().split("T")[0] },
                                        ].map(q => (
                                          <button key={q.label} onClick={() => todoistUpdateTask(task.id, { due: { date: q.date } })} style={{ padding: "3px 8px", background: task.due?.date === q.date ? "#ff6b4a20" : "var(--bgCard)", border: `1px solid ${task.due?.date === q.date ? "#ff6b4a40" : "var(--borderSub)"}`, borderRadius: 4, color: task.due?.date === q.date ? "#ff6b4a" : "var(--textMuted)", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>{q.label}</button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Priority */}
                                    <div>
                                      <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>PRIORITY</div>
                                      <div style={{ display: "flex", gap: 4 }}>
                                        {[4, 3, 2, 1].map(p => (
                                          <button key={p} onClick={() => todoistUpdateTask(task.id, { priority: p })} style={{ flex: 1, padding: "6px 0", background: task.priority === p ? priColors[p] + "20" : "var(--bgCard)", border: `1px solid ${task.priority === p ? priColors[p] : "var(--borderSub)"}`, borderRadius: 6, color: task.priority === p ? priColors[p] : "var(--textMuted)", cursor: "pointer", fontSize: 11, fontWeight: 600, transition: "all 0.15s" }}>{priLabels[p]}</button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                                    {/* Assignee */}
                                    <div>
                                      <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>ASSIGNEE</div>
                                      <select value={task.assignee_id || ""} onChange={(e) => {
                                        const val = e.target.value;
                                        todoistUpdateTask(task.id, { responsible_uid: val ? val : null });
                                      }} style={{ width: "100%", padding: "6px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--text)", fontSize: 12, outline: "none" }}>
                                        <option value="">Unassigned</option>
                                        {todoistCollaborators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                      </select>
                                    </div>

                                    {/* Section */}
                                    <div>
                                      <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>SECTION</div>
                                      <select value={task.section_id || ""} onChange={(e) => {
                                        const val = e.target.value;
                                        todoistMoveTask(task.id, val || null);
                                      }} style={{ width: "100%", padding: "6px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--text)", fontSize: 12, outline: "none" }}>
                                        <option value="">No section</option>
                                        {projSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                      </select>
                                    </div>
                                  </div>

                                  {/* Description */}
                                  <div style={{ marginBottom: 14 }}>
                                    <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>DESCRIPTION</div>
                                    <textarea defaultValue={task.description || ""} placeholder="Add a description..." onBlur={(e) => {
                                      if (e.target.value !== (task.description || "")) todoistUpdateTask(task.id, { description: e.target.value });
                                    }} style={{ width: "100%", padding: "8px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--text)", fontSize: 12, outline: "none", resize: "vertical", minHeight: 40, fontFamily: "inherit" }} />
                                  </div>

                                  {/* Comments */}
                                  <div>
                                    <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 6 }}>COMMENTS {taskComments.length > 0 && `(${taskComments.length})`}</div>
                                    {taskComments.length > 0 && (
                                      <div style={{ marginBottom: 8, maxHeight: 200, overflowY: "auto" }}>
                                        {taskComments.map(c => {
                                          const author = c.posted_uid ? todoistCollaborators.find(x => x.id === c.posted_uid) : null;
                                          return (
                                            <div key={c.id} style={{ padding: "8px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, marginBottom: 4, fontSize: 12 }}>
                                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--textFaint)" }}>{author?.name?.split(" ")[0] || "Unknown"}</span>
                                                <span style={{ fontSize: 9, color: "var(--textGhost)" }}>{c.posted_at ? new Date(c.posted_at).toLocaleDateString() : ""}</span>
                                              </div>
                                              <div style={{ color: "var(--text)", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{c.content}</div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                    <div style={{ display: "flex", gap: 6 }}>
                                      <input placeholder="Add a comment..." value={todoistEditingTask === task.id ? todoistNewComment : ""} onChange={(e) => setTodoistNewComment(e.target.value)} onKeyDown={(e) => {
                                        if (e.key === "Enter" && todoistNewComment.trim()) { todoistAddComment(task.id, todoistNewComment.trim()); setTodoistNewComment(""); }
                                      }} style={{ flex: 1, padding: "7px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--text)", fontSize: 12, outline: "none" }} />
                                      <button onClick={() => { if (todoistNewComment.trim()) { todoistAddComment(task.id, todoistNewComment.trim()); setTodoistNewComment(""); } }} disabled={!todoistNewComment.trim()} style={{ padding: "7px 14px", background: todoistNewComment.trim() ? "#ff6b4a" : "var(--bgInput)", border: "none", borderRadius: 6, color: todoistNewComment.trim() ? "#fff" : "var(--textGhost)", cursor: todoistNewComment.trim() ? "pointer" : "default", fontSize: 11, fontWeight: 700 }}>Post</button>
                                    </div>
                                  </div>

                                  {/* Close edit panel */}
                                  <div style={{ textAlign: "right", marginTop: 10 }}>
                                    <button onClick={() => { setTodoistEditingTask(null); setTodoistNewComment(""); }} style={{ padding: "5px 14px", background: "transparent", border: "1px solid var(--borderSub)", borderRadius: 5, color: "var(--textFaint)", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>Done</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        };
                        return (
                          <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 10, overflow: "hidden" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "32px 1fr auto 100px 50px", padding: "8px 12px", borderBottom: "1px solid var(--borderSub)", fontSize: 8, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1 }}><span></span><span>TASK</span><span>ASSIGN</span><span>DUE</span><span></span></div>
                            {unsectioned.map(renderTask)}
                            {projSections.map(section => {
                              const sectionTasks = projectTasks.filter(t => t.section_id === section.id).sort((a, b) => (a.order || 0) - (b.order || 0));
                              return (
                                <div key={section.id}>
                                  <div style={{ padding: "6px 12px", fontSize: 9, color: "#ff6b4a", fontWeight: 700, letterSpacing: 0.5, borderBottom: "1px solid var(--calLine)", background: "#ff6b4a06" }}>
                                    {String.fromCharCode(9656)} {section.name.toUpperCase()} <span style={{ color: "var(--textFaint)", fontWeight: 400 }}>({sectionTasks.length})</span>
                                  </div>
                                  {sectionTasks.map(renderTask)}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ═══ WORK BACK ═══ */}
            {activeTab === "workback" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div><div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>PRE-PRODUCTION WORK BACK</div><div style={{ fontSize: 13, color: "var(--textMuted)" }}>Engagement: <span style={{ color: "var(--text)" }}>{fmtShort(project.engagementDates.start)}</span> → Event: <span style={{ color: "#ff6b4a" }}>{fmtShort(project.eventDates.start)}</span> → End: <span style={{ color: "var(--text)" }}>{fmtShort(project.engagementDates.end)}</span></div></div>
                  <button onClick={addWBRow} style={{ padding: "7px 14px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 7, color: "#ff6b4a", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>+ Add Row</button>
                </div>
                <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10 }}>
                  <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 280px)", minHeight: 300 }}>
                  <div style={{ minWidth: 1100 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 220px 200px 180px 36px", padding: "10px 16px", borderBottom: "1px solid var(--borderSub)", fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1 }}><span>DATE</span><span>TASK</span><span>DEPARTMENT(S)</span><span>RESPONSIBLE</span><span>STATUS</span><span></span></div>
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
                    <div key={wb.id} style={{ display: "grid", gridTemplateColumns: "100px 1fr 220px 200px 180px 36px", padding: "8px 16px", borderBottom: "1px solid var(--calLine)", alignItems: "center", background: wbDeadlineStyle.bg, borderLeft: wbDeadlineStyle.borderLeft }}>
                      <div style={{ position: "relative" }}>
                        <DatePicker value={wb.date} onChange={v => updateWB(wb.id, "date", v)} />
                        {overdueLabel && <div style={{ fontSize: 8, fontWeight: 700, color: overdueLabel.color, marginTop: 2 }}>{overdueLabel.text}</div>}
                      </div>
                      <EditableText value={wb.task} onChange={v => updateWB(wb.id, "task", v)} fontSize={12} color={wb.isEvent ? "#ff6b4a" : "var(--text)"} fontWeight={wb.isEvent ? 700 : 500} placeholder="Task name..." />
                      <MultiDropdown values={wb.depts} options={[...new Set([...DEPT_OPTIONS, ...(appSettings.departments || [])])].filter(Boolean)} onChange={v => updateWB(wb.id, "depts", v)} colorMap={DEPT_COLORS} />
                      <Dropdown value={wb.owner} options={eventContactNames} onChange={v => updateWB(wb.id, "owner", v)} width="100%" allowBlank blankLabel="—" />
                      <Dropdown value={wb.status} options={WB_STATUSES} onChange={v => updateWB(wb.id, "status", v)} colors={Object.fromEntries(WB_STATUSES.map(s => [s, { bg: WB_STATUS_STYLES[s].bg, text: WB_STATUS_STYLES[s].text, dot: WB_STATUS_STYLES[s].text }]))} width="100%" />
                      <button onClick={() => setWorkback(p => p.filter(w => w.id !== wb.id))} style={{ background: "none", border: "none", color: "var(--textGhost)", cursor: "pointer", fontSize: 14 }}>×</button>
                    </div>
                    );
                  })}
                </div>
                </div>
                </div>
              </div>
            )}

            {/* ═══ RUN OF SHOW ═══ */}
            {activeTab === "ros" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 20 }}>
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
                    <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10 }}>
                      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 280px)", minHeight: 200 }}>
                      <div style={{ minWidth: 1100 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "65px 1.6fr 0.7fr 1fr 0.9fr 0.7fr 0.7fr 1fr 30px", padding: "8px 12px", borderBottom: "1px solid var(--borderSub)", fontSize: 8, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1 }}><span>TIME</span><span>ITEM</span><span>DEPT</span><span>VENDORS</span><span>LOCATION</span><span>CONTACT</span><span>OWNER</span><span>NOTES</span><span></span></div>
                      {ros.filter(r => r.day === day).map(entry => {
                        const isS = entry.item.includes("🎬"); const isW = entry.item.includes("WRAP") || entry.item.includes("LUNCH");
                        return (
                          <div key={entry.id} style={{ display: "grid", gridTemplateColumns: "65px 1.6fr 0.7fr 1fr 0.9fr 0.7fr 0.7fr 1fr 30px", padding: "6px 12px", borderBottom: "1px solid var(--calLine)", alignItems: "center", background: isS ? "var(--bgCard)" : isW ? "var(--bgInput)" : "transparent" }}>
                            <EditableText value={entry.time} onChange={v => updateROS(entry.id, "time", v)} fontSize={10} color={isS ? "#ff6b4a" : "var(--textMuted)"} placeholder="Time" />
                            <EditableText value={entry.item} onChange={v => updateROS(entry.id, "item", v)} fontSize={11} color={isS ? "#ff6b4a" : "var(--textSub)"} fontWeight={isS ? 700 : 500} placeholder="Item..." />
                            <Dropdown value={entry.dept} options={[...new Set([...DEPT_OPTIONS, ...(appSettings.departments || [])])].filter(Boolean)} onChange={v => updateROS(entry.id, "dept", v)} width="100%" allowBlank blankLabel="—" />
                            <MultiDropdown values={entry.vendors} options={vendors.map(v => v.id)} onChange={v => updateROS(entry.id, "vendors", v)} colorMap={Object.fromEntries(vendors.map(v => [v.id, DEPT_COLORS[v.deptId] || "var(--textMuted)"]))} renderLabel={id => { const v = vendors.find(x => x.id === id); return v ? v.name.split(" ")[0] : id; }} />
                            <AddressAutocomplete value={entry.location} onChange={v => updateROS(entry.id, "location", v)} showIcon={false} placeholder="Location" inputStyle={{ padding: "2px 6px", background: "transparent", border: "1px solid transparent", borderRadius: 4, color: "var(--textMuted)", fontSize: 10, fontFamily: "'DM Sans', sans-serif", outline: "none", width: "100%" }} />
                            <Dropdown value={entry.contact} options={eventContactNames} onChange={v => updateROS(entry.id, "contact", v)} width="100%" allowBlank blankLabel="—" />
                            <Dropdown value={entry.owner} options={eventContactNames} onChange={v => updateROS(entry.id, "owner", v)} width="100%" allowBlank blankLabel="—" />
                            <EditableText value={entry.note} onChange={v => updateROS(entry.id, "note", v)} fontSize={10} color="var(--textFaint)" placeholder="Notes..." />
                            <button onClick={() => setROS(p => p.filter(r => r.id !== entry.id))} style={{ background: "none", border: "none", color: "var(--textGhost)", cursor: "pointer", fontSize: 12 }}>×</button>
                          </div>
                        );
                      })}
                    </div>
                    </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            {/* ═══ DRIVE ═══ */}
            {activeTab === "drive" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                {/* No client/code — show setup message */}
                {(!project.client || !project.code) ? (
                  <div style={{ textAlign: "center", padding: 60 }}>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>📁</div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>Set Up Project Drive</div>
                    <div style={{ fontSize: 13, color: "var(--textFaint)", marginBottom: 16 }}>
                      {!project.client && "Assign a client"}{!project.client && !project.code && " and "}{!project.code && "set a project code"} to auto-create the Drive folder.
                    </div>
                    <div style={{ fontSize: 10, color: "var(--textGhost)", fontFamily: "'JetBrains Mono', monospace" }}>
                      Path: ADPTV LLC → CLIENTS → [Client] → [Year] → [Project Code]
                    </div>
                  </div>
                ) : !project.driveFolderId && !projDriveEnsuring ? (
                  /* Has client + code but no folder yet */
                  <div style={{ textAlign: "center", padding: 60 }}>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>📁</div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>Create Drive Folder</div>
                    <div style={{ fontSize: 13, color: "var(--textFaint)", marginBottom: 16 }}>
                      Ready to create the project folder structure in Google Drive.
                    </div>
                    <div style={{ fontSize: 10, color: "var(--textGhost)", fontFamily: "'JetBrains Mono', monospace", marginBottom: 20 }}>
                      CLIENTS / {project.client} / 20{project.code?.slice(0, 2)} / {project.code}
                    </div>
                    <button onClick={() => ensureProjectDrive(project).then(data => { if (data?.folderId) driveBrowse(data.folderId, project.code, true); })} style={{ padding: "10px 24px", background: "#ff6b4a", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      📁 Create Folder Structure
                    </button>
                  </div>
                ) : projDriveEnsuring ? (
                  <div style={{ textAlign: "center", padding: 60, color: "var(--textFaint)" }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                    Creating folder structure...
                  </div>
                ) : (
                  /* File Browser */
                  <div>
                    {/* Header bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 16 }}>📁</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Project Files</span>
                        {project.driveFolderLink && (
                          <a href={project.driveFolderLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#3da5db", textDecoration: "none", fontWeight: 600, padding: "2px 8px", background: "#3da5db10", borderRadius: 4 }}>
                            Open in Drive →
                          </a>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input type="file" ref={projDriveFileRef} onChange={e => { if (e.target.files[0]) driveUploadFile(e.target.files[0]); e.target.value = ""; }} style={{ display: "none" }} />
                        <button onClick={() => projDriveFileRef.current?.click()} disabled={projDriveUploading} style={{ padding: "6px 14px", background: "#4ecb7110", border: "1px solid #4ecb7130", borderRadius: 6, color: "#4ecb71", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                          {projDriveUploading ? "⏳ Uploading..." : "⬆ Upload"}
                        </button>
                        <button onClick={() => driveBrowseBreadcrumb(projDrivePath.length - 1)} disabled={projDriveLoading} style={{ padding: "6px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--textMuted)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                          🔄 Refresh
                        </button>
                      </div>
                    </div>

                    {/* Breadcrumb */}
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 12, padding: "8px 12px", background: "var(--bgInput)", borderRadius: 8, border: "1px solid var(--borderSub)", flexWrap: "wrap" }}>
                      {projDrivePath.map((crumb, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span style={{ color: "var(--textGhost)", fontSize: 10 }}>›</span>}
                          <button onClick={() => driveBrowseBreadcrumb(i)} style={{ background: "none", border: "none", color: i === projDrivePath.length - 1 ? "var(--text)" : "#3da5db", fontSize: 11, fontWeight: i === projDrivePath.length - 1 ? 700 : 500, cursor: "pointer", padding: "2px 4px", borderRadius: 3 }}>
                            {crumb.name}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>

                    {/* File/folder list */}
                    {projDriveLoading ? (
                      <div style={{ textAlign: "center", padding: 40, color: "var(--textFaint)" }}>Loading...</div>
                    ) : projDriveFiles.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 40 }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>📂</div>
                        <div style={{ fontSize: 13, color: "var(--textFaint)" }}>Empty folder</div>
                        <button onClick={() => projDriveFileRef.current?.click()} style={{ marginTop: 12, padding: "8px 20px", background: "#4ecb7110", border: "1px solid #4ecb7130", borderRadius: 8, color: "#4ecb71", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          ⬆ Upload First File
                        </button>
                      </div>
                    ) : (
                      <div style={{ border: "1px solid var(--borderSub)", borderRadius: 10, overflow: "hidden" }}>
                        {/* Table header */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 140px 60px", padding: "8px 14px", background: "var(--bgSub)", borderBottom: "1px solid var(--borderSub)" }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--textGhost)", letterSpacing: 0.5 }}>NAME</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--textGhost)", letterSpacing: 0.5 }}>SIZE</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--textGhost)", letterSpacing: 0.5 }}>MODIFIED</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--textGhost)", letterSpacing: 0.5, textAlign: "right" }}>OPEN</span>
                        </div>
                        {projDriveFiles.map(item => (
                          <div key={item.id} onClick={() => { if (item.isFolder) driveBrowse(item.id, item.name); }} style={{ display: "grid", gridTemplateColumns: "1fr 100px 140px 60px", padding: "10px 14px", borderBottom: "1px solid var(--borderSub)", cursor: item.isFolder ? "pointer" : "default", transition: "background 0.15s" }}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--bgInput)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                              <span style={{ fontSize: 16, flexShrink: 0 }}>{driveGetIcon(item)}</span>
                              <span style={{ fontSize: 12, color: item.isFolder ? "var(--text)" : "var(--textSub)", fontWeight: item.isFolder ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                            </div>
                            <div style={{ fontSize: 10, color: "var(--textGhost)", display: "flex", alignItems: "center" }}>{item.isFolder ? "–" : driveFormatSize(item.size)}</div>
                            <div style={{ fontSize: 10, color: "var(--textGhost)", display: "flex", alignItems: "center" }}>{item.modified ? new Date(item.modified).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "–"}</div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                              {item.link && !item.isFolder && (
                                <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 10, color: "#3da5db", textDecoration: "none", fontWeight: 600, padding: "2px 8px", background: "#3da5db10", borderRadius: 4 }}>
                                  Open ↗
                                </a>
                              )}
                              {item.isFolder && <span style={{ fontSize: 10, color: "var(--textGhost)" }}>→</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Drive path info */}
                    {project.drivePath && (
                      <div style={{ marginTop: 12, fontSize: 9, color: "var(--textGhost)", fontFamily: "'JetBrains Mono', monospace" }}>
                        📂 {project.drivePath}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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
                          <div key={di} onClick={() => { if (!alreadyAdded) importFromDrive(dv); }} style={{ padding: "10px 12px", borderBottom: di < driveResults.length - 1 ? "1px solid var(--borderSub)" : "none", display: "flex", alignItems: "center", gap: 12, cursor: alreadyAdded ? "default" : "pointer", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = alreadyAdded ? "transparent" : "var(--bgHover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
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
                                {v.address && <span onClick={(e) => { e.stopPropagation(); copyToClipboard(v.address, "Address", e); }} style={{ cursor: "pointer", borderRadius: 4, padding: "2px 6px", transition: "background 0.15s", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgCard)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"} title={v.address}>📍 {v.address} <span style={{ fontSize: 8, color: "var(--textGhost)", marginLeft: 2 }}>⧉</span></span>}
                              </div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => {
                                  const names = (v.contact || "").split(" ");
                                  setVendorForm({ contactType: v.contactType || "", resourceType: v.type || "", firstName: names[0] || "", lastName: names.slice(1).join(" ") || "", phone: v.phone || "", email: v.email || "", company: v.name || "", title: v.title || "", dept: v.deptId || DEPT_OPTIONS[0], address: v.address || "" });
                                  setEditingVendorId(v.id);
                                  setShowAddVendor(true);
                                }} style={{ padding: "4px 10px", background: "var(--bgCard)", border: "1px solid var(--borderActive)", borderRadius: 5, color: "var(--textMuted)", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>✏ Edit</button>
                                <button onClick={() => downloadVCard({ name: v.contact || v.name, firstName: (v.contact || v.name || '').split(' ')[0], lastName: (v.contact || v.name || '').split(' ').slice(1).join(' '), phone: v.phone, email: v.email, company: v.name, position: v.title, address: v.address })} style={{ padding: "4px 8px", background: "var(--bgCard)", border: "1px solid var(--borderActive)", borderRadius: 5, color: "var(--textMuted)", cursor: "pointer", fontSize: 10, fontWeight: 600 }} title="Save to Mac Contacts (.vcf)">📇</button>
                                <button onClick={() => { if (confirm(`Remove ${v.name}?`)) setVendors(prev => prev.filter(x => x.id !== v.id)); }} style={{ padding: "4px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "#e85454", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>Remove</button>
                              </div>
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
                  const PROJECT_ROLES = (appSettings.projectRoles || ["Producer", "Manager", "Staff / Crew", "Client", "Point of Contact", "Billing", "Talent", "Artist", "Agent", "Venue Rep"]).slice().sort();
                  const ROLE_COLORS = { Producer: "#ff6b4a", Manager: "#ff6b4a", "Staff / Crew": "#ff6b4a", Client: "#3da5db", "Point of Contact": "#9b6dff", Billing: "#4ecb71", Talent: "#e85494", Artist: "#e85494", Agent: "#dba94e", "Venue Rep": "#4ecbe8" };

                  const teamPeople = [...project.producers.map(n => ({ name: n, role: "Producer", source: "producers" })), ...project.managers.map(n => ({ name: n, role: "Manager", source: "managers" })), ...(project.staff || []).map(n => ({ name: n, role: "Staff / Crew", source: "staff" }))];
                  const clientPeople = (project.clientContacts || []).filter(p => p.name).map(p => ({ ...p, role: p.role || "Client", source: "clientContacts", dept: p.dept || "" }));
                  const pocPeople = (project.pocs || []).filter(p => p.name).map(p => ({ ...p, role: p.role || "Point of Contact", source: "pocs", dept: p.dept || "" }));
                  const billingPeople = (project.billingContacts || []).filter(p => p.name).map(p => ({ ...p, role: p.role || "Billing", source: "billingContacts", dept: p.dept || "" }));
                  const allProjectPeople = [...teamPeople, ...clientPeople, ...pocPeople, ...billingPeople];
                  const filtered = contactSearch ? allProjectPeople.filter(p => p.name.toLowerCase().includes(contactSearch.toLowerCase()) || p.role.toLowerCase().includes(contactSearch.toLowerCase()) || (p.dept || "").toLowerCase().includes(contactSearch.toLowerCase())) : allProjectPeople;

                  const addPersonToProject = (contact, role, dept) => {
                    const entry = { name: contact.name || contact, phone: contact.phone || "", email: contact.email || "", address: contact.address || "", company: contact.company || "", dept: dept || "", role: role, fromContacts: !!contact.id };
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
                        <AddToProjectDropdown contacts={contacts} allProjectPeople={allProjectPeople} onAdd={(c, role, dept) => addPersonToProject(c, role, dept)} deptOptions={[...new Set([...DEPT_OPTIONS, ...(appSettings.departments || [])])].filter(Boolean)} projectRoles={appSettings.projectRoles} onCreateContact={(c) => {
                          setContacts(prev => {
                            if (prev.find(x => x.name.toLowerCase() === c.name.toLowerCase())) return prev;
                            return [...prev, { ...c, id: c.id || `ct_${Date.now()}_${Math.random().toString(36).substr(2, 4)}` }];
                          });
                        }} />
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
                                    {[...new Set([...DEPT_OPTIONS, ...(appSettings.departments || [])])].filter(Boolean).sort().map(d => <option key={d} value={d}>{d}</option>)}
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
                                    setContacts(prev => [...prev, { id: `ct_${Date.now()}`, name: person.name, firstName: names[0] || "", lastName: names.slice(1).join(" ") || "", phone: person.phone || "", email: person.email || "", company: project.client, position: person.role, department: person.dept || "", address: person.address || "", notes: `From ${project.name}`, source: "project" }]);
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
                  <div>Managers: {(project.managers || []).join(", ")}</div>
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
                              <td style={{ padding: "5px 8px", borderBottom: "1px solid #eee" }}>{(r.vendors || []).map(vid => vMap[vid] || vid).join(", ")}</td>
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
                {[["users", "👤 Users"], ["drive", "📁 Drive"], ["defaults", "📋 Defaults"], ["display", "🔤 Display"], ...(isOwner ? [["branding", "🎨 Branding"]] : [])].map(([key, label]) => (
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
                  {(appSettings.authorizedUsers || []).map((email, i) => {
                    const perms = getUserPerms(email);
                    const ownerEmails = ["billy@weareadptv.com", "clancy@weareadptv.com", "billysmith08@gmail.com"];
                    const isThisOwner = ownerEmails.includes(email);
                    const isExpanded = editingUserPerms === email;
                    return (
                      <div key={i} style={{ marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: isExpanded ? "var(--bgHover)" : "var(--bgInput)", borderRadius: isExpanded ? "6px 6px 0 0" : 6, border: `1px solid ${isExpanded ? "var(--borderActive)" : "var(--borderSub)"}`, borderBottom: isExpanded ? "none" : undefined }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 12, color: "var(--textSub)", fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>
                            {isThisOwner ? (
                              <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: "#ff6b4a15", color: "#ff6b4a", fontWeight: 700, letterSpacing: 0.5, flexShrink: 0 }}>OWNER</span>
                            ) : (
                              <select value={perms.role} onChange={e => {
                                const updated = { ...appSettings, userPermissions: { ...appSettings.userPermissions, [email]: { ...perms, role: e.target.value } } };
                                setAppSettings(updated); setSettingsDirty(true);
                              }} style={{ padding: "2px 6px", fontSize: 9, fontWeight: 700, borderRadius: 4, background: perms.role === "admin" ? "#ff6b4a10" : perms.role === "viewer" ? "#3da5db10" : "#4ecb7110", border: `1px solid ${perms.role === "admin" ? "#ff6b4a30" : perms.role === "viewer" ? "#3da5db30" : "#4ecb7130"}`, color: perms.role === "admin" ? "#ff6b4a" : perms.role === "viewer" ? "#3da5db" : "#4ecb71", cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.5, flexShrink: 0 }}>
                                {ROLE_OPTIONS.filter(r => r !== "owner").map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                            {!isThisOwner && (
                              <button onClick={() => { setPreviewingAs(email); setShowSettings(false); }} style={{ padding: "3px 8px", background: "none", border: "1px solid var(--borderSub)", borderRadius: 4, color: "#3da5db", cursor: "pointer", fontSize: 9, fontWeight: 600 }}>
                                👁 Preview
                              </button>
                            )}
                            {!isThisOwner && (
                              <button onClick={() => setEditingUserPerms(isExpanded ? null : email)} style={{ padding: "3px 8px", background: "none", border: `1px solid ${isExpanded ? "var(--borderActive)" : "var(--borderSub)"}`, borderRadius: 4, color: isExpanded ? "#dba94e" : "var(--textFaint)", cursor: "pointer", fontSize: 9, fontWeight: 600 }}>
                                {isExpanded ? "▾ Close" : "⚙ Access"}
                              </button>
                            )}
                            {!isThisOwner && (
                              <button onClick={() => { const updated = { ...appSettings, authorizedUsers: (appSettings.authorizedUsers || []).filter((_, j) => j !== i) }; setAppSettings(updated); setSettingsDirty(true); }} style={{ background: "none", border: "none", color: "#e85454", fontSize: 14, cursor: "pointer", padding: "2px 6px" }}>✕</button>
                            )}
                          </div>
                        </div>
                        {/* Expanded permissions panel */}
                        {isExpanded && !isThisOwner && (
                          <div style={{ padding: "14px 16px", background: "var(--bgInput)", border: "1px solid var(--borderActive)", borderTop: "1px dashed var(--borderSub)", borderRadius: "0 0 6px 6px" }}>
                            {/* Project Access */}
                            <div style={{ marginBottom: 20 }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: "#dba94e", letterSpacing: 0.8, marginBottom: 8 }}>PROJECT ACCESS</div>
                              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                                <button onClick={() => {
                                  setAppSettings(prev => ({ ...prev, userPermissions: { ...prev.userPermissions, [email]: { ...perms, projectAccess: "all" } } }));
                                  setSettingsDirty(true);
                                }} style={{ padding: "4px 10px", fontSize: 9, fontWeight: 600, borderRadius: 4, border: `1px solid ${perms.projectAccess === "all" ? "#4ecb7140" : "var(--borderSub)"}`, background: perms.projectAccess === "all" ? "#4ecb7112" : "transparent", color: perms.projectAccess === "all" ? "#4ecb71" : "var(--textFaint)", cursor: "pointer" }}>
                                  All Projects
                                </button>
                                <button onClick={() => {
                                  setAppSettings(prev => ({ ...prev, userPermissions: { ...prev.userPermissions, [email]: { ...perms, projectAccess: [] } } }));
                                  setSettingsDirty(true);
                                }} style={{ padding: "4px 10px", fontSize: 9, fontWeight: 600, borderRadius: 4, border: `1px solid ${perms.projectAccess !== "all" ? "#dba94e40" : "var(--borderSub)"}`, background: perms.projectAccess !== "all" ? "#dba94e12" : "transparent", color: perms.projectAccess !== "all" ? "#dba94e" : "var(--textFaint)", cursor: "pointer" }}>
                                  Specific Projects
                                </button>
                              </div>
                              {perms.projectAccess !== "all" && (
                                <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--borderSub)", borderRadius: 6, padding: "6px 8px" }}>
                                  {projects.filter(p => !p.archived).map(p => {
                                    const checked = (perms.projectAccess || []).includes(p.id);
                                    return (
                                      <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 4px", fontSize: 10, color: "var(--textSub)", cursor: "pointer", borderRadius: 3 }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgHover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                        <input type="checkbox" checked={checked} onChange={() => {
                                          const current = perms.projectAccess || [];
                                          const updated = checked ? current.filter(id => id !== p.id) : [...current, p.id];
                                          setAppSettings(prev => ({ ...prev, userPermissions: { ...prev.userPermissions, [email]: { ...perms, projectAccess: updated } } }));
                                          setSettingsDirty(true);
                                        }} style={{ accentColor: "#dba94e" }} />
                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                                        <span style={{ fontSize: 8, color: "var(--textGhost)", flexShrink: 0 }}>{p.client}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            {/* Section Access */}
                            <div>
                              <div style={{ fontSize: 9, fontWeight: 700, color: "#dba94e", letterSpacing: 0.8, marginBottom: 8 }}>SECTION VISIBILITY</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {SECTION_OPTIONS.map(s => {
                                  const hidden = (perms.hiddenSections || []).includes(s.key);
                                  return (
                                    <button key={s.key} onClick={() => {
                                      const current = perms.hiddenSections || [];
                                      const updated = hidden ? current.filter(k => k !== s.key) : [...current, s.key];
                                      setAppSettings(prev => ({ ...prev, userPermissions: { ...prev.userPermissions, [email]: { ...perms, hiddenSections: updated } } }));
                                      setSettingsDirty(true);
                                    }} style={{
                                      padding: "4px 8px", fontSize: 9, fontWeight: 600, borderRadius: 4, cursor: "pointer",
                                      background: hidden ? "#e8545410" : "#4ecb7112",
                                      border: `1px solid ${hidden ? "#e8545425" : "#4ecb7130"}`,
                                      color: hidden ? "#e85454" : "#4ecb71",
                                    }}>
                                      {hidden ? "✕" : "✓"} {s.label}
                                    </button>
                                  );
                                })}
                              </div>
                              <div style={{ fontSize: 8, color: "var(--textGhost)", marginTop: 6 }}>Green = visible · Red = hidden for this user</div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <input id="newUserEmail" type="email" placeholder="Add email address..." style={{ flex: 1, padding: "8px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--textSub)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: "none" }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = e.target.value.trim().toLowerCase();
                          if (v && v.includes("@") && !(appSettings.authorizedUsers || []).includes(v)) {
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
                      if (v && v.includes("@") && !(appSettings.authorizedUsers || []).includes(v)) {
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
                    {(appSettings.driveConnections || []).map((conn, i) => (
                      <div key={i} style={{ padding: "10px 12px", background: "var(--bgInput)", borderRadius: 6, border: "1px solid var(--borderSub)", marginBottom: 6 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          <input value={conn.name} onChange={(e) => { const updated = { ...appSettings }; updated.driveConnections = [...updated.driveConnections]; updated.driveConnections[i] = { ...conn, name: e.target.value }; setAppSettings(updated); setSettingsDirty(true); }} placeholder="Label (e.g. Vendors)" style={{ width: 120, padding: "6px 8px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 4, color: "var(--textSub)", fontSize: 12, fontWeight: 600, outline: "none" }} />
                          <input value={conn.folderId} onChange={(e) => { const updated = { ...appSettings }; updated.driveConnections = [...updated.driveConnections]; updated.driveConnections[i] = { ...conn, folderId: e.target.value }; setAppSettings(updated); setSettingsDirty(true); }} onPaste={(e) => { e.preventDefault(); const pasted = e.clipboardData.getData("text"); const id = extractDriveId(pasted); const updated = { ...appSettings }; updated.driveConnections = [...updated.driveConnections]; updated.driveConnections[i] = { ...conn, folderId: id }; setAppSettings(updated); setSettingsDirty(true); }} onBlur={(e) => { const id = extractDriveId(e.target.value); if (id !== e.target.value) { const updated = { ...appSettings }; updated.driveConnections = [...updated.driveConnections]; updated.driveConnections[i] = { ...conn, folderId: id }; setAppSettings(updated); setSettingsDirty(true); } }} placeholder="Paste Google Drive folder URL or ID" style={{ flex: 1, padding: "6px 8px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 4, color: "var(--textSub)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", outline: "none" }} />
                          {i > 0 && <button onClick={() => { const updated = { ...appSettings, driveConnections: (appSettings.driveConnections || []).filter((_, j) => j !== i) }; setAppSettings(updated); setSettingsDirty(true); }} style={{ background: "none", border: "none", color: "#e85454", fontSize: 14, cursor: "pointer" }}>✕</button>}
                        </div>
                        <div style={{ fontSize: 9, color: "var(--textGhost)" }}>From URL: drive.google.com/drive/folders/<strong style={{ color: "var(--textMuted)" }}>THIS_PART_IS_THE_ID</strong></div>
                      </div>
                    ))}
                    <button onClick={() => { setAppSettings(prev => ({ ...prev, driveConnections: [...prev.driveConnections, { name: "", folderId: "" }] })); setSettingsDirty(true); }} style={{ marginTop: 6, padding: "7px 14px", background: "#ff6b4a10", border: "1px solid #ff6b4a25", borderRadius: 6, color: "#ff6b4a", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ Add Folder</button>
                  </div>

                  {/* ── PROJECT FOLDER TEMPLATE ── */}
                  <div style={{ marginTop: 28, borderTop: "2px solid var(--borderSub)", paddingTop: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>📂 Project Folder Template</div>
                    <div style={{ fontSize: 10, color: "var(--textFaint)", marginBottom: 16 }}>
                      This structure is created inside each new project folder: CLIENTS → [Client] → [Year] → [Project Code] → <em>template below</em>
                    </div>

                    {/* Render template tree */}
                    {(() => {
                      const tmpl = appSettings.folderTemplate || [];

                      const renderTreeFixed = (items, depth, getTarget) => items.map((item, idx) => (
                        <div key={`${depth}-${idx}`} style={{ marginLeft: depth * 20 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                            <span style={{ fontSize: 14 }}>📁</span>
                            <input value={item.name} onChange={e => {
                              const update = JSON.parse(JSON.stringify(appSettings.folderTemplate));
                              const arr = getTarget(update);
                              arr[idx].name = e.target.value;
                              setAppSettings(prev => ({ ...prev, folderTemplate: update }));
                              setSettingsDirty(true);
                            }} style={{ flex: 1, padding: "4px 8px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 4, color: "var(--text)", fontSize: 12, fontWeight: 600, outline: "none", fontFamily: "'DM Sans', sans-serif" }} />
                            <button onClick={() => {
                              const update = JSON.parse(JSON.stringify(appSettings.folderTemplate));
                              const arr = getTarget(update);
                              arr[idx].children = arr[idx].children || [];
                              arr[idx].children.push({ name: "New Folder", children: [] });
                              setAppSettings(prev => ({ ...prev, folderTemplate: update }));
                              setSettingsDirty(true);
                            }} style={{ background: "none", border: "1px solid var(--borderSub)", borderRadius: 4, padding: "2px 6px", fontSize: 9, color: "var(--textMuted)", cursor: "pointer" }} title="Add subfolder">+ Sub</button>
                            <button onClick={() => {
                              if (!confirm(`Remove "${item.name}" and all its subfolders?`)) return;
                              const update = JSON.parse(JSON.stringify(appSettings.folderTemplate));
                              const arr = getTarget(update);
                              arr.splice(idx, 1);
                              setAppSettings(prev => ({ ...prev, folderTemplate: update }));
                              setSettingsDirty(true);
                            }} style={{ background: "none", border: "1px solid #e8545430", borderRadius: 4, padding: "2px 6px", fontSize: 9, color: "#e85454", cursor: "pointer" }} title="Remove folder">✕</button>
                          </div>
                          {item.children && item.children.length > 0 && renderTreeFixed(item.children, depth + 1, (root) => getTarget(root)[idx].children)}
                        </div>
                      ));

                      return (
                        <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: 14 }}>
                          {tmpl.length === 0 ? (
                            <div style={{ fontSize: 12, color: "var(--textFaint)", textAlign: "center", padding: 16 }}>No folders in template</div>
                          ) : renderTreeFixed(tmpl, 0, (root) => root)}
                          <button onClick={() => {
                            setAppSettings(prev => ({ ...prev, folderTemplate: [...(prev.folderTemplate || []), { name: "New Folder", children: [] }] }));
                            setSettingsDirty(true);
                          }} style={{ marginTop: 8, padding: "6px 14px", background: "#3da5db10", border: "1px solid #3da5db25", borderRadius: 6, color: "#3da5db", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ Add Top-Level Folder</button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* ── DATA PROTECTION ── */}
                  <div style={{ marginTop: 28, borderTop: "2px solid var(--borderSub)", paddingTop: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>🛡️ Data Protection</div>
                    <div style={{ fontSize: 10, color: "var(--textFaint)", marginBottom: 16 }}>Auto-backups run at 12 PM & 12 AM daily to Shared Drive → Internal → Command.Center</div>

                    {/* Backup path info */}
                    <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: 14, marginBottom: 20 }}>
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
                      {(appSettings.statuses || []).filter(Boolean).map((s, i) => (
                        <span key={s + i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, fontSize: 11, color: "var(--textSub)" }}>
                          {s}
                          <button onClick={() => { setAppSettings(prev => ({ ...prev, statuses: prev.statuses.filter(v => v !== s) })); setSettingsDirty(true); }} style={{ background: "none", border: "none", color: "var(--textGhost)", fontSize: 12, cursor: "pointer", padding: 0, lineHeight: 1 }}>✕</button>
                        </span>
                      ))}
                    </div>
                    <input placeholder="Add status + Enter" style={{ padding: "6px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "var(--textSub)", fontSize: 11, outline: "none", width: 200 }}
                      onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { const v = e.target.value.trim(); setAppSettings(prev => ({ ...prev, statuses: [...(prev.statuses || []).filter(Boolean), v] })); setSettingsDirty(true); e.target.value = ""; } }} />
                  </div>
                  {/* Project Types */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Project Types</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                      {(appSettings.projectTypes || []).filter(Boolean).map((t, i) => (
                        <span key={t + i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, fontSize: 11, color: "var(--textSub)" }}>
                          {t}
                          <button onClick={() => { setAppSettings(prev => ({ ...prev, projectTypes: prev.projectTypes.filter(v => v !== t) })); setSettingsDirty(true); }} style={{ background: "none", border: "none", color: "var(--textGhost)", fontSize: 12, cursor: "pointer", padding: 0, lineHeight: 1 }}>✕</button>
                        </span>
                      ))}
                    </div>
                    <input placeholder="Add project type + Enter" style={{ padding: "6px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "var(--textSub)", fontSize: 11, outline: "none", width: 200 }}
                      onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { const v = e.target.value.trim(); setAppSettings(prev => ({ ...prev, projectTypes: [...(prev.projectTypes || []).filter(Boolean), v] })); setSettingsDirty(true); e.target.value = ""; } }} />
                  </div>
                  {/* Departments */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Departments</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                      {(appSettings.departments || []).filter(Boolean).map((d, i) => (
                        <span key={d + i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, fontSize: 11, color: "var(--textSub)" }}>
                          {d}
                          <button onClick={() => { setAppSettings(prev => ({ ...prev, departments: prev.departments.filter(v => v !== d) })); setSettingsDirty(true); }} style={{ background: "none", border: "none", color: "var(--textGhost)", fontSize: 12, cursor: "pointer", padding: 0, lineHeight: 1 }}>✕</button>
                        </span>
                      ))}
                    </div>
                    <input placeholder="Add department + Enter" style={{ padding: "6px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "var(--textSub)", fontSize: 11, outline: "none", width: 200 }}
                      onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { const v = e.target.value.trim(); setAppSettings(prev => ({ ...prev, departments: [...(prev.departments || []).filter(Boolean), v] })); setSettingsDirty(true); e.target.value = ""; } }} />
                  </div>
                  {/* Resource Types */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Resource Types</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                      {(appSettings.resourceTypes || []).filter(Boolean).slice().sort().map((rt, i) => (
                        <span key={rt + i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, fontSize: 11, color: "var(--textSub)" }}>
                          {rt}
                          <button onClick={() => { setAppSettings(prev => ({ ...prev, resourceTypes: prev.resourceTypes.filter(v => v !== rt) })); setSettingsDirty(true); }} style={{ background: "none", border: "none", color: "var(--textGhost)", fontSize: 12, cursor: "pointer", padding: 0, lineHeight: 1 }}>✕</button>
                        </span>
                      ))}
                    </div>
                    <input placeholder="Add resource type + Enter" style={{ padding: "6px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "var(--textSub)", fontSize: 11, outline: "none", width: 200 }}
                      onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { const v = e.target.value.trim(); setAppSettings(prev => ({ ...prev, resourceTypes: [...(prev.resourceTypes || []).filter(Boolean), v] })); setSettingsDirty(true); e.target.value = ""; } }} />
                  </div>
                  {/* Project Roles */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Project Roles</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                      {(appSettings.projectRoles || []).filter(Boolean).map((r, i) => (
                        <span key={r + i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, fontSize: 11, color: "var(--textSub)" }}>
                          {r}
                          <button onClick={() => { setAppSettings(prev => ({ ...prev, projectRoles: prev.projectRoles.filter(v => v !== r) })); setSettingsDirty(true); }} style={{ background: "none", border: "none", color: "var(--textGhost)", fontSize: 12, cursor: "pointer", padding: 0, lineHeight: 1 }}>✕</button>
                        </span>
                      ))}
                    </div>
                    <input placeholder="Add role + Enter" style={{ padding: "6px 10px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "var(--textSub)", fontSize: 11, outline: "none", width: 200 }}
                      onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { const v = e.target.value.trim(); setAppSettings(prev => ({ ...prev, projectRoles: [...(prev.projectRoles || []).filter(Boolean), v] })); setSettingsDirty(true); e.target.value = ""; } }} />
                  </div>
                </div>
              )}

              {/* ── DISPLAY TAB ── */}
              {settingsTab === "display" && (
                <div>
                  <div style={{ fontSize: 11, color: "var(--textMuted)", marginBottom: 20, lineHeight: 1.5 }}>Adjust the text size across the dashboard. This setting is saved per browser and persists across sessions.</div>
                  
                  <div style={{ padding: "20px 24px", background: "var(--bgInput)", borderRadius: 10, border: "1px solid var(--borderSub)", marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Text Size</div>
                        <div style={{ fontSize: 11, color: "var(--textFaint)", marginTop: 2 }}>Current: {textSize}%</div>
                      </div>
                      <button onClick={() => setTextSize(100)} style={{ padding: "5px 12px", background: textSize === 100 ? "var(--bgCard)" : "#3da5db15", border: `1px solid ${textSize === 100 ? "var(--borderSub)" : "#3da5db30"}`, borderRadius: 6, color: textSize === 100 ? "var(--textGhost)" : "#3da5db", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Reset to 100%</button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 11, color: "var(--textFaint)", fontWeight: 600, minWidth: 28 }}>Aa</span>
                      <input type="range" min={75} max={130} step={5} value={textSize} onChange={e => setTextSize(Number(e.target.value))} style={{ flex: 1, accentColor: "#ff6b4a", cursor: "pointer" }} />
                      <span style={{ fontSize: 16, color: "var(--textFaint)", fontWeight: 600, minWidth: 28, textAlign: "right" }}>Aa</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                      {[75, 85, 100, 115, 130].map(s => (
                        <button key={s} onClick={() => setTextSize(s)} style={{ padding: "4px 10px", background: textSize === s ? "#ff6b4a20" : "var(--bgCard)", border: `1px solid ${textSize === s ? "#ff6b4a40" : "var(--borderSub)"}`, borderRadius: 5, color: textSize === s ? "#ff6b4a" : "var(--textMuted)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>{s}%</button>
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  <div style={{ padding: "16px 20px", background: "var(--bgInput)", borderRadius: 10, border: "1px solid var(--borderSub)" }}>
                    <div style={{ fontSize: 9 * textScale, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>PREVIEW</div>
                    <div style={{ fontSize: 18 * textScale, fontWeight: 700, marginBottom: 4, fontFamily: "'Instrument Sans'" }}>Project Title</div>
                    <div style={{ fontSize: 12 * textScale, color: "var(--textSub)", marginBottom: 8 }}>This is how body text will appear at {textSize}% zoom.</div>
                    <div style={{ fontSize: 9 * textScale, color: "var(--textFaint)", fontFamily: "'JetBrains Mono', monospace" }}>26-GUESS-COACH26-INDIO</div>
                  </div>

                  {/* Data persistence info */}
                  <div style={{ marginTop: 20, padding: "16px 20px", background: "#4ecb7108", borderRadius: 10, border: "1px solid #4ecb7125" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#4ecb71", marginBottom: 6 }}>💾 Auto-Save Active</div>
                    <div style={{ fontSize: 11, color: "var(--textMuted)", lineHeight: 1.5 }}>All data (projects, clients, contacts, vendors, work back, run of show) is automatically saved to your browser's local storage. Data persists across page refreshes and redeployments on the same browser.</div>
                  </div>
                </div>
              )}

              {/* ── BRANDING TAB ── */}
              {settingsTab === "branding" && isOwner && (
                <div>
                  <div style={{ fontSize: 11, color: "var(--textMuted)", marginBottom: 20, lineHeight: 1.5 }}>Customize the appearance of your Command Center. Only visible to owners (Billy &amp; Clancy).</div>

                  {/* Login Background */}
                  <div style={{ marginBottom: 24, padding: "16px 18px", background: "var(--bgInput)", borderRadius: 10, border: "1px solid var(--borderSub)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>Login Page Background</div>
                        <div style={{ fontSize: 9, color: "var(--textGhost)" }}>Recommended: 1920 × 1080px · JPG/PNG · Under 2MB</div>
                      </div>
                      {appSettings.branding?.loginBg && (
                        <button onClick={async () => {
                          await fetch("/api/branding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "loginBg", userEmail: user?.email }) });
                          setAppSettings(prev => ({ ...prev, branding: { ...prev.branding, loginBg: "" } }));
                        }} style={{ padding: "4px 10px", background: "#e8545412", border: "1px solid #e8545425", borderRadius: 5, color: "#e85454", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>✕ Remove</button>
                      )}
                    </div>
                    {appSettings.branding?.loginBg ? (
                      <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--borderSub)" }}>
                        <img src={appSettings.branding.loginBg} alt="Login BG" style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                        <div style={{ position: "absolute", bottom: 6, right: 6, fontSize: 8, padding: "2px 6px", background: "rgba(0,0,0,0.6)", color: "#fff", borderRadius: 4 }}>Current login background</div>
                      </div>
                    ) : (
                      <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 100, border: "2px dashed var(--borderSub)", borderRadius: 8, cursor: "pointer", color: "var(--textGhost)", fontSize: 11, gap: 4 }}>
                        <span style={{ fontSize: 20 }}>📷</span>
                        <span>Click to upload image</span>
                        <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={async (e) => {
                          const file = e.target.files[0]; if (!file) return;
                          if (file.size > 3 * 1024 * 1024) { alert("File too large. Please use an image under 3MB."); return; }
                          const fd = new FormData(); fd.append("file", file); fd.append("type", "loginBg"); fd.append("userEmail", user?.email);
                          try {
                            const res = await fetch("/api/branding/upload", { method: "POST", body: fd });
                            const data = await res.json();
                            if (data.url) { setAppSettings(prev => ({ ...prev, branding: { ...(prev.branding || {}), loginBg: data.url } })); }
                            else { alert(data.error || "Upload failed"); }
                          } catch (err) { alert("Upload error: " + err.message); }
                        }} />
                      </label>
                    )}
                  </div>

                  {/* Dashboard Background */}
                  <div style={{ marginBottom: 24, padding: "16px 18px", background: "var(--bgInput)", borderRadius: 10, border: "1px solid var(--borderSub)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>Dashboard Background</div>
                        <div style={{ fontSize: 9, color: "var(--textGhost)" }}>Recommended: 1920 × 1080px · JPG/PNG · Under 2MB · Subtle/dark images work best</div>
                      </div>
                      {appSettings.branding?.dashboardBg && (
                        <button onClick={async () => {
                          await fetch("/api/branding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "dashboardBg", userEmail: user?.email }) });
                          setAppSettings(prev => ({ ...prev, branding: { ...prev.branding, dashboardBg: "" } }));
                        }} style={{ padding: "4px 10px", background: "#e8545412", border: "1px solid #e8545425", borderRadius: 5, color: "#e85454", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>✕ Remove</button>
                      )}
                    </div>
                    {appSettings.branding?.dashboardBg ? (
                      <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--borderSub)" }}>
                        <img src={appSettings.branding.dashboardBg} alt="Dashboard BG" style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                        <div style={{ position: "absolute", bottom: 6, right: 6, fontSize: 8, padding: "2px 6px", background: "rgba(0,0,0,0.6)", color: "#fff", borderRadius: 4 }}>Current dashboard background</div>
                      </div>
                    ) : (
                      <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 100, border: "2px dashed var(--borderSub)", borderRadius: 8, cursor: "pointer", color: "var(--textGhost)", fontSize: 11, gap: 4 }}>
                        <span style={{ fontSize: 20 }}>🖼</span>
                        <span>Click to upload image (optional)</span>
                        <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={async (e) => {
                          const file = e.target.files[0]; if (!file) return;
                          if (file.size > 3 * 1024 * 1024) { alert("File too large. Please use an image under 3MB."); return; }
                          const fd = new FormData(); fd.append("file", file); fd.append("type", "dashboardBg"); fd.append("userEmail", user?.email);
                          try {
                            const res = await fetch("/api/branding/upload", { method: "POST", body: fd });
                            const data = await res.json();
                            if (data.url) { setAppSettings(prev => ({ ...prev, branding: { ...(prev.branding || {}), dashboardBg: data.url } })); }
                            else { alert(data.error || "Upload failed"); }
                          } catch (err) { alert("Upload error: " + err.message); }
                        }} />
                      </label>
                    )}
                  </div>

                  {/* Favicon Info */}
                  <div style={{ padding: "14px 16px", background: "#3da5db08", border: "1px solid #3da5db20", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#3da5db", marginBottom: 6 }}>💡 Browser Tab Icon (Favicon)</div>
                    <div style={{ fontSize: 10, color: "var(--textMuted)", lineHeight: 1.6 }}>
                      The tab icon is set via a file in the codebase. To change it, replace <code style={{ background: "var(--bgInput)", padding: "1px 4px", borderRadius: 3, fontSize: 9 }}>app/favicon.ico</code> with your own 32×32px .ico file and redeploy. You can generate one at <span style={{ color: "#ff6b4a" }}>favicon.io</span>.
                    </div>
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
                pushUndo(archiveConfirm.action === "archive" ? "Archive project" : "Delete project");
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
        const maxY = typeof window !== "undefined" ? window.innerHeight - 300 : 400;
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
              {c.address && (
                <div onClick={(e) => copyToClipboard(c.address, "Address", e)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer", fontSize: 12, color: "var(--textSub)", borderBottom: "1px solid var(--borderSub)" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text)"} onMouseLeave={e => e.currentTarget.style.color = "var(--textSub)"}>
                  <span style={{ fontSize: 13 }}>📍</span> <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.address}</span> <span style={{ fontSize: 8, color: "var(--textGhost)", marginLeft: "auto", flexShrink: 0 }}>Click to copy</span>
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
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { setContactForm({ ...c, clientAssociation: c.clientAssociation || (clients.find(cl => cl.name.toLowerCase() === (c.company || c.vendorName || "").toLowerCase())?.name || "") }); setShowAddContact(true); setContactPopover(null); }} style={{ padding: "5px 12px", background: "var(--bgCard)", border: "1px solid var(--borderActive)", borderRadius: 5, color: "var(--textMuted)", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>✏ Edit</button>
                <button onClick={() => downloadVCard(c)} style={{ padding: "5px 10px", background: "var(--bgCard)", border: "1px solid var(--borderActive)", borderRadius: 5, color: "var(--textMuted)", cursor: "pointer", fontSize: 10, fontWeight: 600 }} title="Save to Mac Contacts (.vcf)">📇 Save</button>
              </div>
              <button onClick={() => setContactPopover(null)} style={{ padding: "5px 12px", background: "none", border: "none", color: "var(--textFaint)", cursor: "pointer", fontSize: 10 }}>Close</button>
            </div>
          </div>
        );
      })()}

      {/* ═══ ADD / EDIT CONTACT MODAL ═══ */}
      {/* ═══ ADD/EDIT CLIENT MODAL ═══ */}
      {showAddClient && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeUp 0.2s ease", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) setShowAddClient(false); }}>
          <div style={{ background: "var(--bgInput)", borderRadius: 16, width: 620, maxHeight: "90vh", display: "flex", flexDirection: "column", border: "1px solid var(--borderActive)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "22px 30px 16px", borderBottom: "1px solid var(--borderSub)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Instrument Sans'" }}>{clientForm.id ? "Edit Client" : "Add Client"}</div>
              <button onClick={() => setShowAddClient(false)} style={{ background: "none", border: "none", color: "var(--textFaint)", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ padding: "24px 30px 28px", overflowY: "auto", flex: 1 }}>
              {/* Company Info */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 20 }}>
                <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 6 }}>COMPANY NAME *</label><input value={clientForm.name} onChange={e => updateCLF("name", e.target.value)} placeholder="e.g. Guess, GT's Living Foods..." style={{ width: "100%", padding: "10px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
                <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 6 }}>COMPANY CODE</label><input value={clientForm.code} onChange={e => updateCLF("code", e.target.value.toUpperCase())} placeholder="e.g. GUESS" style={{ width: "100%", padding: "10px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none", fontFamily: "'JetBrains Mono', monospace" }} /></div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 6 }}>ATTRIBUTES</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "10px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, minHeight: 40 }}>
                  {(clientForm.attributes || []).map(a => (
                    <span key={a} style={{ padding: "3px 10px", background: "#9b6dff15", border: "1px solid #9b6dff30", borderRadius: 5, fontSize: 10, fontWeight: 600, color: "#9b6dff", display: "flex", alignItems: "center", gap: 5 }}>
                      {a} <span onClick={() => updateCLF("attributes", clientForm.attributes.filter(x => x !== a))} style={{ cursor: "pointer", fontSize: 9, opacity: 0.7 }}>✕</span>
                    </span>
                  ))}
                  <select value="" onChange={e => { if (e.target.value && !(clientForm.attributes || []).includes(e.target.value)) updateCLF("attributes", [...(clientForm.attributes || []), e.target.value]); e.target.value = ""; }} style={{ background: "transparent", border: "none", color: "var(--textFaint)", fontSize: 10, outline: "none", cursor: "pointer" }}>
                    <option value="">+ Add...</option>
                    {CLIENT_ATTRIBUTES.filter(a => !(clientForm.attributes || []).includes(a)).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 6 }}>WEBSITE</label><input value={clientForm.website} onChange={e => updateCLF("website", e.target.value)} placeholder="https://..." style={{ width: "100%", padding: "10px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
                <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 6 }}>COMPANY ADDRESS</label><input value={clientForm.address} onChange={e => updateCLF("address", e.target.value)} placeholder="Full address..." style={{ width: "100%", padding: "10px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
              </div>

              {/* Client Contact Section */}
              <div style={{ borderTop: "1px solid var(--borderSub)", paddingTop: 18, marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: "#3da5db", fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>CLIENT CONTACT</div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 6 }}>CONTACT NAME</label>
                  <input value={clientForm.contactName} onChange={e => updateCLF("contactName", e.target.value)} placeholder="Jane Smith" style={{ width: "100%", padding: "10px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 6 }}>EMAIL</label><input value={clientForm.contactEmail} onChange={e => updateCLF("contactEmail", e.target.value)} placeholder="jane@company.com" style={{ width: "100%", padding: "10px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
                  <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 6 }}>PHONE</label><input value={clientForm.contactPhone} onChange={e => updateCLF("contactPhone", e.target.value)} placeholder="+1 (555) 123-4567" style={{ width: "100%", padding: "10px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 6 }}>ADDRESS</label>
                  <input value={clientForm.contactAddress} onChange={e => updateCLF("contactAddress", e.target.value)} placeholder="Contact address..." style={{ width: "100%", padding: "10px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none" }} />
                </div>
              </div>

              {/* Billing Section */}
              <div style={{ borderTop: "1px solid var(--borderSub)", paddingTop: 18, marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: "#dba94e", fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>BILLING INFORMATION</div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600 }}>BILLING CONTACT NAME</label>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "var(--textFaint)", cursor: "pointer", userSelect: "none" }}>
                      <input type="checkbox" checked={clientForm.billingNameSame} onChange={e => updateCLF("billingNameSame", e.target.checked)} /> Same as client contact
                    </label>
                  </div>
                  {!clientForm.billingNameSame && <input value={clientForm.billingContact} onChange={e => updateCLF("billingContact", e.target.value)} placeholder="Billing contact name..." style={{ width: "100%", padding: "10px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none" }} />}
                  {clientForm.billingNameSame && <div style={{ padding: "10px 14px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--textFaint)", fontSize: 12 }}>{clientForm.contactName || "—"}</div>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600 }}>BILLING EMAIL</label>
                      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "var(--textFaint)", cursor: "pointer", userSelect: "none" }}>
                        <input type="checkbox" checked={clientForm.billingEmailSame} onChange={e => updateCLF("billingEmailSame", e.target.checked)} /> Same
                      </label>
                    </div>
                    {!clientForm.billingEmailSame && <input value={clientForm.billingEmail} onChange={e => updateCLF("billingEmail", e.target.value)} placeholder="billing@company.com" style={{ width: "100%", padding: "10px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none" }} />}
                    {clientForm.billingEmailSame && <div style={{ padding: "10px 14px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--textFaint)", fontSize: 12 }}>{clientForm.contactEmail || "—"}</div>}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600 }}>BILLING PHONE</label>
                      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "var(--textFaint)", cursor: "pointer", userSelect: "none" }}>
                        <input type="checkbox" checked={clientForm.billingPhoneSame} onChange={e => updateCLF("billingPhoneSame", e.target.checked)} /> Same
                      </label>
                    </div>
                    {!clientForm.billingPhoneSame && <input value={clientForm.billingPhone} onChange={e => updateCLF("billingPhone", e.target.value)} placeholder="+1 (555) 123-4567" style={{ width: "100%", padding: "10px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none" }} />}
                    {clientForm.billingPhoneSame && <div style={{ padding: "10px 14px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--textFaint)", fontSize: 12 }}>{clientForm.contactPhone || "—"}</div>}
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600 }}>BILLING ADDRESS</label>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "var(--textFaint)", cursor: "pointer", userSelect: "none" }}>
                      <input type="checkbox" checked={clientForm.billingAddressSame} onChange={e => updateCLF("billingAddressSame", e.target.checked)} /> Same as client contact
                    </label>
                  </div>
                  {!clientForm.billingAddressSame && <input value={clientForm.billingAddress} onChange={e => updateCLF("billingAddress", e.target.value)} placeholder="Billing address..." style={{ width: "100%", padding: "10px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none" }} />}
                  {clientForm.billingAddressSame && <div style={{ padding: "10px 14px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--textFaint)", fontSize: 12 }}>{clientForm.contactAddress || "—"}</div>}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 6 }}>NOTES</label>
                <textarea value={clientForm.notes} onChange={e => updateCLF("notes", e.target.value)} placeholder="Any notes..." rows={3} style={{ width: "100%", padding: "10px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button onClick={() => setShowAddClient(false)} style={{ padding: "11px 22px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--textMuted)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
                <button onClick={submitClient} disabled={!clientForm.name} style={{ padding: "11px 26px", background: clientForm.name ? "#ff6b4a" : "var(--bgCard)", border: "none", borderRadius: 8, color: clientForm.name ? "#fff" : "var(--textGhost)", cursor: clientForm.name ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700 }}>{clientForm.id ? "Save Changes" : "Add Client"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddContact && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) setShowAddContact(false); }}>
          <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 16, width: 520, maxHeight: "85vh", display: "flex", flexDirection: "column", animation: "fadeUp 0.25s ease" }}>
            <div style={{ padding: "20px 28px 16px", borderBottom: "1px solid var(--borderSub)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Instrument Sans'" }}>{contactForm.id ? "Edit Contact" : "Add Contact"}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{ padding: "5px 12px", background: "#3da5db15", border: "1px solid #3da5db30", borderRadius: 6, color: "#3da5db", cursor: "pointer", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  📇 Import vCard
                  <input type="file" accept=".vcf,.vcard" onChange={(e) => { handleVCardUpload(e); setShowAddContact(false); }} style={{ display: "none" }} />
                </label>
                <button onClick={() => setShowAddContact(false)} style={{ background: "none", border: "none", color: "var(--textFaint)", cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>
            </div>
            <div style={{ padding: "20px 28px 24px", overflowY: "auto", flex: 1 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>VENDOR / COMPANY NAME</label>
                <input value={contactForm.vendorName || contactForm.company || ""} onChange={e => { updateCF("vendorName", e.target.value); updateCF("company", e.target.value); }} placeholder="e.g. GDRB, Collins Visual Media..." style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>FIRST NAME</label><input value={contactForm.firstName} onChange={e => updateCF("firstName", e.target.value)} style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
                <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>LAST NAME</label><input value={contactForm.lastName} onChange={e => updateCF("lastName", e.target.value)} style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>POSITION / TITLE</label><input value={contactForm.position} onChange={e => updateCF("position", e.target.value)} placeholder="Executive Producer, DP, PM..." style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
                <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>DEPARTMENT</label>
                  <select value={contactForm.department} onChange={e => updateCF("department", e.target.value)} style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none" }}>
                    <option value="">Select...</option>
                    {[...new Set([...DEPT_OPTIONS, ...(appSettings.departments || [])])].filter(Boolean).sort().map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>RESOURCE TYPE</label>
                  <select value={contactForm.resourceType || ""} onChange={e => updateCF("resourceType", e.target.value)} style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none" }}>
                    <option value="">Select...</option>
                    {(appSettings.resourceTypes || []).filter(Boolean).slice().sort().map(rt => <option key={rt} value={rt}>{rt}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>CONTACT TYPE</label>
                  <select value={contactForm.contactType || ""} onChange={e => updateCF("contactType", e.target.value)} style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none" }}>
                    <option value="">Select...</option>
                    <option value="Client">Client</option>
                    <option value="Vendor">Vendor</option>
                    <option value="Venue">Venue</option>
                    <option value="Talent">Talent</option>
                    <option value="Internal">Internal</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>CLIENT ASSOCIATION</label>
                {(() => {
                  const autoMatch = !contactForm.clientAssociation && contactForm.company ? clients.find(cl => cl.name.toLowerCase() === (contactForm.company || "").toLowerCase() || cl.name.toLowerCase() === (contactForm.vendorName || "").toLowerCase()) : null;
                  const effectiveValue = contactForm.clientAssociation || (autoMatch ? autoMatch.name : "");
                  return (
                    <>
                      <select value={effectiveValue} onChange={e => updateCF("clientAssociation", e.target.value)} style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: effectiveValue ? "1px solid #3da5db40" : "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none" }}>
                        <option value="">None — not linked to a client</option>
                        {clients.map(cl => <option key={cl.id} value={cl.name}>{cl.name}{cl.code ? ` (${cl.code})` : ""}</option>)}
                      </select>
                      {effectiveValue && (
                        <div style={{ marginTop: 4, fontSize: 9, color: "#3da5db", display: "flex", alignItems: "center", gap: 4 }}>
                          <span>🔗</span> {autoMatch && !contactForm.clientAssociation ? "Auto-matched" : "Linked"} to client: <span style={{ fontWeight: 700 }}>{effectiveValue}</span>
                          {autoMatch && !contactForm.clientAssociation && <button onClick={() => updateCF("clientAssociation", autoMatch.name)} style={{ background: "#3da5db15", border: "1px solid #3da5db30", borderRadius: 4, padding: "1px 6px", color: "#3da5db", fontSize: 8, fontWeight: 700, cursor: "pointer", marginLeft: 4 }}>Confirm</button>}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>PHONE</label><PhoneWithCode value={contactForm.phone} onChange={v => updateCF("phone", v)} /></div>
                <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>EMAIL</label><input value={contactForm.email} onChange={e => updateCF("email", e.target.value)} placeholder="name@company.com" style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>ADDRESS</label>
                <AddressAutocomplete value={contactForm.address} onChange={v => updateCF("address", v)} showIcon={false} placeholder="123 Main St, City, State ZIP" inputStyle={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>NOTES</label><textarea value={contactForm.notes} onChange={e => updateCF("notes", e.target.value)} placeholder="Any notes..." rows={3} style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit" }} /></div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                <button onClick={() => setShowAddContact(false)} style={{ padding: "9px 20px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--textMuted)", cursor: "pointer", fontSize: 12 }}>Cancel</button>
                <button onClick={() => {
                  const personName = `${contactForm.firstName} ${contactForm.lastName}`.trim();
                  const name = contactForm.vendorName || personName || contactForm.company;
                  if (!name) return;
                  const saveData = { ...contactForm, name, company: contactForm.vendorName || contactForm.company };
                  if (contactForm.id) {
                    setContacts(prev => prev.map(c => c.id === contactForm.id ? saveData : c));
                  } else {
                    setContacts(prev => [...prev, { ...saveData, id: `ct_${Date.now()}` }]);
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
          <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 16, width: 920, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", animation: "fadeUp 0.25s ease" }}>
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
                {generateProjectCode(newProjectForm) || "YY-CLIENT-PROJECT-LOC"}
              </div>
              <div style={{ fontSize: 9, color: "var(--textGhost)", marginTop: 4 }}>Format: YEAR-CLIENT-PROJECT-LOCATION</div>
            </div>

            <div style={{ padding: "28px 36px 32px" }}>
              {/* Row 1: Client + Project Name */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>CLIENT *</label>
                  <ClientSearchInput value={newProjectForm.client} onChange={v => updateNPF("client", v)} projects={projects} clients={clients} onAddNew={() => { setClientForm({ ...emptyClient }); setShowAddClient(true); }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>PROJECT NAME *</label>
                  <input value={newProjectForm.name} onChange={e => updateNPF("name", e.target.value)} placeholder="Air Max Campaign, Wrapped BTS..." style={{ width: "100%", padding: "11px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} />
                </div>
              </div>

              {/* Row 2: Location + Status + Project Type */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>LOCATION</label>
                  <AddressAutocomplete value={newProjectForm.location} onChange={v => updateNPF("location", v)} showIcon={false} placeholder="Los Angeles, Brooklyn, Bali..." inputStyle={{ width: "100%", padding: "11px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>STATUS</label>
                  <select value={newProjectForm.status} onChange={e => updateNPF("status", e.target.value)} style={{ width: "100%", padding: "11px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none" }}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>PROJECT TYPE</label>
                  <select value={newProjectForm.projectType || ""} onChange={e => updateNPF("projectType", e.target.value)} style={{ width: "100%", padding: "11px 14px", background: "var(--bgInput)", border: `1px solid ${(PT_COLORS[newProjectForm.projectType] || "var(--borderSub)")}40`, borderRadius: 7, color: PT_COLORS[newProjectForm.projectType] || "var(--text)", fontSize: 12, fontWeight: 600, outline: "none" }}>
                    <option value="">Select type...</option>
                    {[...new Set([...PROJECT_TYPES, ...(appSettings.projectTypes || [])])].filter(Boolean).sort().map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 3: Event dates */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 20, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>EVENT START</label>
                  <input type="date" value={newProjectForm.eventDates.start} onChange={e => updateNPF("eventDates", { ...newProjectForm.eventDates, start: e.target.value })} style={{ width: "100%", padding: "10px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>EVENT END</label>
                  <input type="date" value={newProjectForm.eventDates.end} onChange={e => updateNPF("eventDates", { ...newProjectForm.eventDates, end: e.target.value })} style={{ width: "100%", padding: "10px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>ENGAGEMENT START</label>
                  <input type="date" value={newProjectForm.engagementDates.start} onChange={e => updateNPF("engagementDates", { ...newProjectForm.engagementDates, start: e.target.value })} style={{ width: "100%", padding: "10px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>ENGAGEMENT END</label>
                  <input type="date" value={newProjectForm.engagementDates.end} onChange={e => updateNPF("engagementDates", { ...newProjectForm.engagementDates, end: e.target.value })} style={{ width: "100%", padding: "10px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none" }} />
                </div>
              </div>

              {/* Row 4: WHY */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>PROJECT BRIEF / WHY</label>
                <textarea value={newProjectForm.why} onChange={e => updateNPF("why", e.target.value)} rows={2} placeholder="Spring product launch — hero content for social + OLV" style={{ width: "100%", padding: "11px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none", resize: "vertical", fontFamily: "'DM Sans'" }} />
              </div>

              {/* Row 4b: SERVICES */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>SERVICE NEEDS</label>
                <MultiDropdown values={newProjectForm.services || []} options={SERVICE_OPTIONS} onChange={v => updateNPF("services", v)} />
              </div>

              {/* Row 5: Budget + Tour toggle */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>ESTIMATED BUDGET</label>
                  <input type="number" value={newProjectForm.budget || ""} onChange={e => updateNPF("budget", Number(e.target.value))} placeholder="0" style={{ width: "100%", padding: "11px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>PROJECT TYPE</label>
                  <div onClick={() => updateNPF("isTour", !newProjectForm.isTour)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: newProjectForm.isTour ? "#ff6b4a10" : "var(--bgInput)", border: `1px solid ${newProjectForm.isTour ? "#ff6b4a30" : "var(--borderSub)"}`, borderRadius: 7, cursor: "pointer", transition: "all 0.15s" }}>
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
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) { setShowAddVendor(false); setW9ParsedData(null); setEditingVendorId(null); } }}>
          <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 16, width: 620, maxHeight: "85vh", overflowY: "auto", animation: "fadeUp 0.25s ease" }}>
            {/* Header */}
            <div style={{ padding: "20px 28px 16px", borderBottom: "1px solid var(--borderSub)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Instrument Sans'" }}>{editingVendorId ? "Edit Vendor" : "Add New Vendor"}</div>
                <div style={{ fontSize: 11, color: "var(--textFaint)", marginTop: 2 }}>{editingVendorId ? "Update vendor/contractor details" : "Fill in contact details — compliance docs can be uploaded after"}</div>
              </div>
              <button onClick={() => { setShowAddVendor(false); setW9ParsedData(null); setEditingVendorId(null); }} style={{ background: "none", border: "none", color: "var(--textFaint)", cursor: "pointer", fontSize: 18, padding: "4px 8px" }}>✕</button>
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
                    {w9ParsedData.upload && !w9ParsedData.upload.success && (
                      <span style={{ fontSize: 9, padding: "2px 6px", background: "#e8545415", color: "#e85454", borderRadius: 4, fontWeight: 700, marginLeft: "auto" }} title={w9ParsedData.upload.error || ''}>✕ DRIVE UPLOAD FAILED</span>
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
                    {(appSettings.resourceTypes || []).filter(Boolean).slice().sort().map(rt => <option key={rt} value={rt}>{rt}</option>)}
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
                  <PhoneWithCode value={vendorForm.phone} onChange={v => updateVF("phone", v)} inputStyle={{ width: '100%', padding: '10px 12px', background: 'var(--bgInput)', border: '1px solid var(--borderSub)', borderRadius: 8, color: 'var(--text)', fontSize: 13, fontFamily: "'DM Sans'", outline: 'none' }} />
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

              {/* Row 5: Address */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSub)", display: "block", marginBottom: 6 }}>Address</label>
                <AddressAutocomplete value={vendorForm.address} onChange={v => updateVF("address", v)} showIcon={false} placeholder="123 Main St, City, State ZIP" inputStyle={{ width: "100%", padding: "10px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, fontFamily: "'DM Sans'", outline: "none" }} />
              </div>

              {/* Row 6: Department */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSub)", display: "block", marginBottom: 6 }}>Department</label>
                <select value={vendorForm.dept} onChange={e => updateVF("dept", e.target.value)} style={{ width: "100%", padding: "10px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, fontFamily: "'DM Sans'", appearance: "auto" }}>
                  {[...new Set([...DEPT_OPTIONS, ...(appSettings.departments || [])])].filter(Boolean).sort().map(d => <option key={d} value={d}>{d}</option>)}
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
                <button onClick={submitVendor} disabled={!vendorForm.company && !vendorForm.firstName} style={{ padding: "9px 24px", background: (!vendorForm.company && !vendorForm.firstName) ? "var(--borderSub)" : "#ff6b4a", border: "none", borderRadius: 8, color: (!vendorForm.company && !vendorForm.firstName) ? "var(--textFaint)" : "#fff", cursor: (!vendorForm.company && !vendorForm.firstName) ? "default" : "pointer", fontSize: 13, fontWeight: 700 }}>{editingVendorId ? "Save Changes" : "Add Vendor"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
