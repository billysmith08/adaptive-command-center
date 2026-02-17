"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Color from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";


export const TIPTAP_STYLES = `
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

export function ToolbarBtn({ active, onClick, children, title }) {
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

export function ToolbarSep() {
  return <div style={{ width: 1, height: 18, background: "var(--borderSub)", margin: "0 4px" }} />;
}

export function RichTextEditor({ content, onChange, placeholder }) {
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
  { key: "coi", label: "COI", fullLabel: "Certificate of Insurance", vendorSubfolder: "COI", globalMirror: true, drivePrefix: "ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/2026 COIs & Workers Comp" },
  { key: "w9", label: "W9", fullLabel: "W-9 Tax Form", vendorSubfolder: "W9", globalMirror: true, drivePrefix: "ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/2026 W9s" },
  { key: "quote", label: "QTE", fullLabel: "Quote", vendorSubfolder: "Quotes", globalMirror: false, drivePrefix: "" },
  { key: "invoice", label: "INV", fullLabel: "Invoice", vendorSubfolder: "Invoices", globalMirror: false, drivePrefix: "" },
  { key: "contract", label: "CTR", fullLabel: "Contract", vendorSubfolder: "Agreement", globalMirror: false, drivePrefix: "" },
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

export function AddressAutocomplete({ value, onChange, copyToClipboard, inputStyle, wrapperStyle, showIcon = true, placeholder }) {
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

export function PhoneWithCode({ value, onChange, placeholder, inputStyle, compact }) {
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

export const initProjects = () => [
  { id: "p1", code: "", name: "Adaptive Rebrand", client: "Adaptive", status: "In-Production", projectType: "Internal", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2025-12-31", end: "" }, engagementDates: { start: "", end: "" }, location: "", why: "", budget: 0, spent: 0 },
  { id: "p2", code: "", name: "Cloonee Retainer", client: "Cloonee Touring LLC", status: "In-Production", projectType: "Touring", isTour: true, isRetainer: true, producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "2026-01-01", end: "2026-12-31" }, engagementDates: { start: "2026-01-01", end: "2026-12-31" }, location: "Multi-City", why: "Tour Direction, Production Direction", budget: 0, spent: 0, services: ["Tour Direction", "Production Direction"], subEvents: [] },
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

export const initVendors = () => [];

export const initWorkback = () => [];

export const initROS = () => [
  { id: "r1", day: 1, dayDate: "", time: "5:00 AM", item: "Crew Call — Basecamp", dept: "", vendors: [], location: "", contact: "", owner: "", note: "" },
  { id: "r2", day: 1, dayDate: "", time: "6:00 AM", item: "Setup & Build", dept: "", vendors: [], location: "", contact: "", owner: "", note: "" },
  { id: "r3", day: 1, dayDate: "", time: "8:00 AM", item: "Doors / Start", dept: "", vendors: [], location: "", contact: "", owner: "", note: "" },
  { id: "r4", day: 1, dayDate: "", time: "12:00 PM", item: "LUNCH", dept: "", vendors: [], location: "", contact: "", owner: "", note: "" },
  { id: "r5", day: 1, dayDate: "", time: "5:00 PM", item: "WRAP", dept: "", vendors: [], location: "", contact: "", owner: "", note: "" },
];

// ─── UTILS ───────────────────────────────────────────────────────────────────

export function fmt(n) { return "$" + n.toLocaleString("en-US"); }
export function fmtShort(d) { if (!d) return "—"; return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }); }

export function ProgressBar({ pct, h = 5, color }) {
  const c = color || (pct > 90 ? "#e85454" : pct > 70 ? "#dba94e" : "#4ecb71");
  return <div style={{ flex: 1, height: h, background: "var(--bgInput)", borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: c, borderRadius: 3, transition: "width 0.8s ease" }} /></div>;
}

export function SyncBadge({ source }) {
  const m = { saturation: { c: "#ff6b4a", l: "SAT" }, airtable: { c: "#18bfff", l: "AT" }, both: { c: "#4ecb71", l: "SYNCED" }, manual: { c: "#9b6dff", l: "NEW" }, drive: { c: "#dba94e", l: "DRIVE" } }[source] || { c: "var(--textMuted)", l: "?" };
  return <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.8, padding: "2px 5px", borderRadius: 3, background: m.c + "15", color: m.c, border: `1px solid ${m.c}30`, fontFamily: "'JetBrains Mono', monospace" }}>{m.l}</span>;
}

export function DeptTag({ dept, small }) {
  const c = DEPT_COLORS[dept] || "var(--textMuted)";
  return <span style={{ fontSize: small ? 9 : 10, fontWeight: 600, letterSpacing: 0.5, padding: small ? "1px 5px" : "2px 7px", borderRadius: 3, background: c + "15", color: c, border: `1px solid ${c}25` }}>{dept}</span>;
}

// ─── REUSABLE INPUTS ─────────────────────────────────────────────────────────

export function Dropdown({ value, options, onChange, colors, width, allowBlank, blankLabel }) {
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

export function MultiDropdown({ values, options, onChange, colorMap, renderLabel }) {
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

export function TagInput({ values, options, onChange, contacts, onViewContact }) {
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

export function EditableText({ value, onChange, fontSize, color, fontWeight, multiline, placeholder }) {
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

export function processAvatarImage(file, size = 200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      // Center-crop to square
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.readAsDataURL(file);
  });
}

export function AvatarCropper({ imageSrc, onSave, onCancel }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [drag, setDrag] = useState(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const CROP_SIZE = 200;

  useEffect(() => {
    const img = new Image();
    img.onload = () => { imgRef.current = img; setLoaded(true); };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (!loaded || !imgRef.current) return;
    const img = imgRef.current;
    // Fit image to cover the crop area initially
    const scale = Math.max(CROP_SIZE / img.width, CROP_SIZE / img.height);
    setZoom(scale);
    setPos({ x: (CROP_SIZE - img.width * scale) / 2, y: (CROP_SIZE - img.height * scale) / 2 });
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !imgRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);
    // Draw image
    ctx.save();
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(imgRef.current, pos.x, pos.y, imgRef.current.width * zoom, imgRef.current.height * zoom);
    ctx.restore();
    // Draw circular border
    ctx.strokeStyle = "#ff6b4a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
  }, [pos, zoom, loaded]);

  const handleMouseDown = (e) => { e.preventDefault(); setDrag({ startX: e.clientX - pos.x, startY: e.clientY - pos.y }); };
  const handleMouseMove = (e) => { if (!drag) return; setPos({ x: e.clientX - drag.startX, y: e.clientY - drag.startY }); };
  const handleMouseUp = () => setDrag(null);
  const handleWheel = (e) => { e.preventDefault(); const delta = e.deltaY > 0 ? -0.05 : 0.05; setZoom(z => Math.max(0.1, Math.min(5, z + delta))); };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) { const t = e.touches[0]; setDrag({ startX: t.clientX - pos.x, startY: t.clientY - pos.y }); }
  };
  const handleTouchMove = (e) => { if (!drag || e.touches.length !== 1) return; e.preventDefault(); const t = e.touches[0]; setPos({ x: t.clientX - drag.startX, y: t.clientY - drag.startY }); };

  const doSave = () => {
    const output = document.createElement("canvas");
    output.width = CROP_SIZE; output.height = CROP_SIZE;
    const ctx = output.getContext("2d");
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(imgRef.current, pos.x, pos.y, imgRef.current.width * zoom, imgRef.current.height * zoom);
    onSave(output.toDataURL("image/jpeg", 0.85));
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center" }} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--bgCard)", border: "1px solid var(--borderActive)", borderRadius: 16, padding: 28, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Position your photo</div>
        <div style={{ fontSize: 11, color: "var(--textFaint)", marginBottom: 16 }}>Drag to move · scroll to zoom</div>
        <div style={{ display: "inline-block", borderRadius: "50%", overflow: "hidden", cursor: drag ? "grabbing" : "grab", marginBottom: 16, border: "3px solid var(--borderActive)", boxShadow: "0 0 0 4px var(--bgCard), 0 0 20px rgba(0,0,0,0.3)" }}>
          <canvas ref={canvasRef} width={CROP_SIZE} height={CROP_SIZE} onMouseDown={handleMouseDown} onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleMouseUp} style={{ display: "block", touchAction: "none" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 10, color: "var(--textFaint)" }}>−</span>
          <input type="range" min="0.1" max="3" step="0.05" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} style={{ width: 140, accentColor: "#ff6b4a" }} />
          <span style={{ fontSize: 10, color: "var(--textFaint)" }}>+</span>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onCancel} style={{ padding: "8px 20px", background: "transparent", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--textMuted)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button>
          <button onClick={doSave} style={{ padding: "8px 24px", background: "#ff6b4a", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

export function DatePicker({ value, onChange }) {
  return <input type="date" value={value || ""} onChange={e => onChange(e.target.value)} style={{ padding: "5px 8px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--textSub)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: "none", cursor: "pointer", colorScheme: "var(--filterScheme)" }} />;
}

export function EditableBudget({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));
  useEffect(() => { setVal(String(value)); }, [value]);
  if (editing) return <input autoFocus value={val} onChange={e => setVal(e.target.value.replace(/[^0-9]/g, ""))}
    onBlur={() => { onSave(Number(val) || 0); setEditing(false); }}
    onKeyDown={e => { if (e.key === "Enter") { onSave(Number(val) || 0); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
    style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", background: "var(--bgInput)", border: "1px solid #ff6b4a40", borderRadius: 6, color: "var(--text)", padding: "2px 8px", width: 160, outline: "none" }} />;
  return <div onClick={() => { setVal(String(value)); setEditing(true); }} style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><span>{"$" + value.toLocaleString("en-US")}</span><span style={{ fontSize: 11, color: "var(--textFaint)", opacity: 0, transition: "opacity 0.2s" }} ref={el => { if (el) { el.parentNode.onmouseenter = () => el.style.opacity = 1; el.parentNode.onmouseleave = () => el.style.opacity = 0; }}}>✏</span></div>;
}

export function AddToProjectDropdown({ contacts, allProjectPeople, onAdd, deptOptions, onCreateContact, projectRoles: propsRoles }) {
  const PROJECT_ROLES = (propsRoles || ["Producer", "Manager", "Staff / Crew", "Client", "Point of Contact", "Billing", "Talent", "Artist", "Agent", "Venue Rep", "Vendor"]).slice().sort();
  const ROLE_COLORS = { Producer: "#ff6b4a", Manager: "#ff6b4a", "Staff / Crew": "#ff6b4a", Client: "#3da5db", "Point of Contact": "#9b6dff", Billing: "#4ecb71", Talent: "#e85494", Artist: "#e85494", Agent: "#dba94e", "Venue Rep": "#4ecbe8", Vendor: "#e8a54e", Contractor: "#e8a54e" };
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

export function ClientSearchInput({ value, onChange, projects, clients, onAddNew }) {
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

export function PocPullDropdown({ contacts, existingPocs, onSelect, searchLabel }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const filtered = (contacts || []).filter(c => {
    const q = query.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.company || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
  });
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

export function ContactListBlock({ label, items, contacts, onUpdate, onSaveToGlobal, onViewContact, copyToClipboard, showAddress, onUpdateGlobalContact, searchLabel }) {
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
            onUpdate([...(items || []), { name: c.name, phone: c.phone || "", email: c.email || "", address: c.address || c.notes?.match(/(?:Home|Office|Address):\s*([^\n·]+)/i)?.[1]?.trim() || "", fromContacts: true }]);
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

export function DocDropZone({ vendor, compKey, compInfo: rawCompInfo, onFileDrop, onPreview, onClear }) {
  const compInfo = rawCompInfo || { done: false, file: null, date: null, link: null };
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

  // Smart position: use fixed positioning to escape overflow containers
  const getTooltipPosition = () => {
    if (!boxRef.current) return { top: 0, left: 0, arrowTop: false };
    const rect = boxRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    if (rect.top < 200) return { top: rect.bottom + 8, left: centerX, arrowTop: true };
    return { bottom: window.innerHeight - rect.top + 8, left: centerX, arrowTop: false };
  };
  const tp = showTooltip ? getTooltipPosition() : {};

  return (
    <div ref={boxRef} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onClick={handleClick} onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}
      style={{ position: "relative", width: 52, height: 52, borderRadius: 8, background: justUploaded ? "#4ecb7110" : dragOver ? "#4ecb7108" : isDone ? "#4ecb7108" : "var(--bgCard)", border: `1.5px dashed ${justUploaded ? "#4ecb7180" : dragOver ? "#4ecb7160" : isDone ? "#4ecb7140" : "var(--borderSub)"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.25s", transform: dragOver ? "scale(1.08)" : "scale(1)" }}>
      {justUploaded ? <><span style={{ fontSize: 16 }}>✓</span><span style={{ fontSize: 7, color: "#4ecb71", fontWeight: 700, marginTop: 2 }}>SAVED</span></> : isDone ? <><span style={{ fontSize: 13, lineHeight: 1 }}>📄</span><span style={{ fontSize: 7, color: "#4ecb71", fontWeight: 700, marginTop: 2 }}>{(compKey.key === "invoice" || compKey.key === "quote") && compInfo.files?.length > 0 ? `V${compInfo.files.length}` : "✓"}</span></> : <><span style={{ fontSize: 14, opacity: dragOver ? 1 : 0.5 }}>{dragOver ? "📥" : "+"}</span><span style={{ fontSize: 7, color: dragOver ? "#4ecb71" : "var(--textGhost)", fontWeight: 600, marginTop: 1 }}>{compKey.label}</span></>}
      {showTooltip && <div onClick={e => e.stopPropagation()} style={{ position: "fixed", ...(tp.arrowTop ? { top: tp.top } : { bottom: tp.bottom }), left: tp.left, transform: "translateX(-50%)", background: "var(--bgCard)", border: "1px solid var(--borderActive)", borderRadius: 10, padding: "12px 14px", minWidth: 230, maxWidth: 280, zIndex: 10000, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
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
              {(compKey.key === "invoice" || compKey.key === "quote") ? "📤 New Version" : "🔄 Replace"}
            </button>
            {onClear && (
              <button onClick={(e) => { e.stopPropagation(); onClear(vendor.id, compKey.key); setShowTooltip(false); }} style={{ padding: "4px 8px", background: "#e8545410", border: "1px solid #e8545425", borderRadius: 5, color: "#e85454", cursor: "pointer", fontSize: 9, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                ✕ Clear
              </button>
            )}
          </div>
          
          {/* Version history for invoice/quote */}
          {(compKey.key === "invoice" || compKey.key === "quote") && compInfo.files?.length > 0 && (
            <div style={{ marginTop: 8, borderTop: "1px solid var(--borderSub)", paddingTop: 6 }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: "var(--textFaint)", letterSpacing: 0.5, marginBottom: 4 }}>VERSION HISTORY ({compInfo.files.length})</div>
              {compInfo.files.slice().reverse().map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 0", fontSize: 9 }}>
                  <span style={{ color: "var(--textMuted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{f.file}</span>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ color: "var(--textGhost)", fontSize: 8 }}>{f.date}</span>
                    {f.link && <button onClick={(e) => { e.stopPropagation(); window.open(f.link, '_blank'); }} style={{ padding: "1px 4px", background: "#3da5db10", border: "1px solid #3da5db20", borderRadius: 3, color: "#3da5db", cursor: "pointer", fontSize: 7, fontWeight: 700 }}>Open</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
          
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
