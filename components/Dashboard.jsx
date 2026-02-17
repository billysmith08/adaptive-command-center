"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import FinanceTab from "./FinanceTab";
import VendorsTab from "./VendorsTab";
import SettingsModal from "./SettingsModal";
import OverviewTab from "./OverviewTab";
import DriveTab from "./DriveTab";
import GlobalContactsTab from "./GlobalContactsTab";
import ClientsTab from "./ClientsTab";
import MasterCalendar from "./MasterCalendar";
import { TodoistGlobal, TodoistProject } from "./TodoistView";
import {
  TIPTAP_STYLES, ToolbarBtn, ToolbarSep, RichTextEditor,
  AddressAutocomplete, PhoneWithCode,
  initProjects, initVendors, initWorkback, initROS,
  fmt, fmtShort, ProgressBar, SyncBadge, DeptTag,
  Dropdown, MultiDropdown, TagInput, EditableText,
  processAvatarImage, AvatarCropper,
  DatePicker, EditableBudget,
  AddToProjectDropdown, ClientSearchInput, PocPullDropdown,
  ContactListBlock, DocDropZone,
} from "./shared/UIComponents";

// ── APP VERSION ── bump this on every deploy
const APP_VERSION = "v94q";

// ─── ADAPTIVE AT A GLANCE ──────────────────────────────────────────────────────────

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────

export default function Dashboard({ user, onLogout }) {
  const supabase = createClient();
  const [dataLoaded, setDataLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("saved"); // saved, saving, error
  const [forceSaveCounter, setForceSaveCounter] = useState(0);
  const [updateAvailable, setUpdateAvailable] = useState(null); // null or { version, message, force }
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  // ─── LOCAL STORAGE PERSISTENCE (post-mount hydration for SSR safety) ──
  const LS_KEYS = { projects: "adptv_projects", clients: "adptv_clients", contacts: "adptv_contacts", vendors: "adptv_vendors", workback: "adptv_workback", progress: "adptv_progress", comments: "adptv_comments", ros: "adptv_ros", textSize: "adptv_textSize", updatedAt: "adptv_updated_at" };
  const lsHydrated = useRef(false);
  // Per-slice sync guards: { projects: timestamp, contacts: timestamp, ... }
  const remoteSyncTimes = useRef({});
  // Per-slice debounce timers
  const sliceTimers = useRef({});
  // Slice keys
  const SLICE_KEYS = ['projects', 'contacts', 'clients', 'projectVendors', 'projectWorkback', 'projectProgress', 'projectComments', 'projectROS', 'rosDayDates', 'activityLog'];
  
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
  const [activeProjectId, setActiveProjectId] = useState(() => {
    if (typeof window !== 'undefined') { try { return localStorage.getItem('adptv_activeProjectId') || "p1"; } catch {} } return "p1";
  });
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') { try { return localStorage.getItem('adptv_activeTab') || "calendar"; } catch {} } return "calendar";
  });
  const [glanceTab, setGlanceTab] = useState("cal");
  useEffect(() => { try { localStorage.setItem('adptv_activeTab', activeTab); } catch {} }, [activeTab]);
  useEffect(() => { try { localStorage.setItem('adptv_activeProjectId', activeProjectId); } catch {} }, [activeProjectId]);
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
  const [clientSort, setClientSort] = useState({ col: "name", dir: "asc" });
  const [partnerSort, setPartnerSort] = useState({ col: "name", dir: "asc" });
  const emptyClient = { name: "", code: "", attributes: [], address: "", city: "", state: "", zip: "", country: "", website: "", contactName: "", contactEmail: "", contactPhone: "", contactAddress: "", billingContact: "", billingEmail: "", billingPhone: "", billingAddress: "", billingNameSame: false, billingEmailSame: false, billingPhoneSame: false, billingAddressSame: false, contactNames: [], projects: [], notes: "" };
  const [clientForm, setClientForm] = useState({ ...emptyClient });
  const updateCLF = (k, v) => setClientForm(prev => ({ ...prev, [k]: v }));
  // Resizable column widths
  const defaultClientCols = [36, 190, 80, 130, 140, 170, 110, 150, 170, 140];
  const defaultPartnerCols = [36, 160, 120, 60, 100, 110, 130, 170, 140, 160, 200, 180];
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
  // ─── PER-PROJECT PROGRESS REPORT ──────────────────────────────
  const [projectProgress, setProjectProgress] = useState({});
  const progress = projectProgress[activeProjectId] || { rows: [], locations: [] };
  const setProgress = (updater) => {
    setProjectProgress(prev => ({
      ...prev,
      [activeProjectId]: typeof updater === 'function' ? updater(prev[activeProjectId] || { rows: [], locations: [] }) : updater
    }));
  };
  const [prFilters, setPrFilters] = useState({ task: "", dept: "", location: "", responsible: "", status: "", notes: "" });
  const [prSort, setPrSort] = useState({ col: null, dir: "asc" });
  const [prShowFilters, setPrShowFilters] = useState(false);

  // ─── UNDO / REDO SYSTEM ─────────────────────────────────────
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const lastSnapshotRef = useRef(null);
  const pushUndoSnapshot = () => {
    const snap = JSON.stringify({ wb: projectWorkback[activeProjectId] || [], pr: (projectProgress[activeProjectId] || { rows: [] }).rows || [] });
    if (snap !== lastSnapshotRef.current) {
      undoStackRef.current.push(snap);
      if (undoStackRef.current.length > 50) undoStackRef.current.shift();
      redoStackRef.current = [];
      lastSnapshotRef.current = snap;
    }
  };
  const handleUndo = () => {
    if (undoStackRef.current.length === 0) return;
    const currentSnap = JSON.stringify({ wb: projectWorkback[activeProjectId] || [], pr: (projectProgress[activeProjectId] || { rows: [] }).rows || [] });
    redoStackRef.current.push(currentSnap);
    const prev = JSON.parse(undoStackRef.current.pop());
    setProjectWorkback(p => ({ ...p, [activeProjectId]: prev.wb }));
    setProjectProgress(p => ({ ...p, [activeProjectId]: { ...(p[activeProjectId] || { rows: [], locations: [] }), rows: prev.pr } }));
    lastSnapshotRef.current = JSON.stringify(prev);
  };
  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return;
    const currentSnap = JSON.stringify({ wb: projectWorkback[activeProjectId] || [], pr: (projectProgress[activeProjectId] || { rows: [] }).rows || [] });
    undoStackRef.current.push(currentSnap);
    const next = JSON.parse(redoStackRef.current.pop());
    setProjectWorkback(p => ({ ...p, [activeProjectId]: next.wb }));
    setProjectProgress(p => ({ ...p, [activeProjectId]: { ...(p[activeProjectId] || { rows: [], locations: [] }), rows: next.pr } }));
    lastSnapshotRef.current = JSON.stringify(next);
  };
  // Global keyboard shortcuts: Cmd+Z, Cmd+Y/Cmd+Shift+Z
  useEffect(() => {
    const handler = (e) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if (isMod && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  // Table cell navigation: Enter → next row, Shift+Enter → prev row
  const handleTableKeyNav = (e, tableId, rowIndex, colIndex) => {
    if (e.key === "Enter" && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      const nextRow = document.querySelector(`[data-table="${tableId}"][data-row="${rowIndex + 1}"][data-col="${colIndex}"]`);
      if (nextRow) nextRow.focus();
    }
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      const prevRow = document.querySelector(`[data-table="${tableId}"][data-row="${rowIndex - 1}"][data-col="${colIndex}"]`);
      if (prevRow) prevRow.focus();
    }
    if (e.key === "ArrowDown" && e.target.tagName !== "SELECT") {
      const nextRow = document.querySelector(`[data-table="${tableId}"][data-row="${rowIndex + 1}"][data-col="${colIndex}"]`);
      if (nextRow) { e.preventDefault(); nextRow.focus(); }
    }
    if (e.key === "ArrowUp" && e.target.tagName !== "SELECT") {
      const prevRow = document.querySelector(`[data-table="${tableId}"][data-row="${rowIndex - 1}"][data-col="${colIndex}"]`);
      if (prevRow) { e.preventDefault(); prevRow.focus(); }
    }
  };
  // ─── PROJECT COMMENTS (COMMENT FEED) ──────────────────────────
  const [projectComments, setProjectComments] = useState({});
  const comments = projectComments[activeProjectId] || [];
  const addComment = (text) => {
    if (!text.trim()) return;
    // Parse @mentions from text
    const mentionRegex = /@([\w\s.'-]+?)(?=\s@|\s[^@]|$)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      const name = match[1].trim();
      // Match against project team members
      const proj = projects.find(p => p.id === activeProjectId);
      const teamEmails = getProjectTeamMembers(proj);
      const found = teamEmails.find(m => m.name.toLowerCase() === name.toLowerCase() || m.name.toLowerCase().startsWith(name.toLowerCase()));
      if (found) mentions.push({ name: found.name, email: found.email });
    }
    const c = { id: `cmt_${Date.now()}`, text, author: user?.name || user?.email || "Unknown", authorEmail: user?.email, timestamp: new Date().toISOString(), mentions: mentions.map(m => m.email) };
    setProjectComments(prev => ({ ...prev, [activeProjectId]: [...(prev[activeProjectId] || []), c] }));
    // Send instant email for @mentions
    if (mentions.length > 0) {
      const proj = projects.find(p => p.id === activeProjectId);
      mentions.forEach(m => {
        const recipientNotifs = getNotifPrefsForEmail(m.email);
        if (recipientNotifs?.frequency === "instant" || recipientNotifs?.frequency === "daily" || recipientNotifs?.frequency === "weekly") {
          // Fire instant notification API call
          fetch("/api/notify/mention", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to: m.email, toName: m.name, from: user?.name || user?.email, projectName: proj?.name || "Unknown", message: text, projectId: activeProjectId })
          }).catch(err => console.error("Mention notify failed:", err));
        }
      });
    }
  };
  // Get notification preferences for a specific email
  const getNotifPrefsForEmail = (email) => {
    const profiles = appSettings.userProfiles || {};
    const notifs = appSettings.notifications || {};
    // Check if this email has profile and notification settings
    if (profiles[email]) return notifs;
    return null;
  };
  // Get all team members for a project (for @mention autocomplete)
  const getProjectTeamMembers = (proj) => {
    if (!proj) return [];
    const members = [];
    const profiles = appSettings.userProfiles || {};
    const seen = new Set();
    // Add producers, managers, staff from project
    [...(proj.producers || []), ...(proj.managers || []), ...(proj.staff || [])].forEach(name => {
      if (!name || seen.has(name.toLowerCase())) return;
      seen.add(name.toLowerCase());
      // Try to find email from profiles
      const email = Object.keys(profiles).find(e => { const p = profiles[e]; return `${p.firstName || ""} ${p.lastName || ""}`.trim().toLowerCase() === name.toLowerCase(); }) || "";
      members.push({ name, email });
    });
    // Add POCs
    (proj.pocs || []).forEach(poc => {
      if (!poc.name || seen.has(poc.name.toLowerCase())) return;
      seen.add(poc.name.toLowerCase());
      members.push({ name: poc.name, email: poc.email || "" });
    });
    return members;
  };
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const deleteComment = (id) => setProjectComments(prev => ({ ...prev, [activeProjectId]: (prev[activeProjectId] || []).filter(c => c.id !== id) }));
  const [commentInput, setCommentInput] = useState("");
  const [notesCollapsed, setNotesCollapsed] = useState(false);
  const [showCommentPanel, setShowCommentPanel] = useState(false);
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
  useEffect(() => { setSelectedVendorIds(new Set()); setExpandedVendor(null); setPrFilters({ task: "", dept: "", location: "", responsible: "", status: "", notes: "" }); setPrSort({ col: null, dir: "asc" }); setCommentInput(""); setNotesCollapsed(false); }, [activeProjectId]);
  
  // ─── TEXT SIZE SETTING ──────────────────────────────────────────
  const [textSize, setTextSize] = useState(100); // percentage: 75-130
  const textScale = textSize / 100;
  
  
  const [search, setSearch] = useState("");
  const [sidebarStatusFilter, setSidebarStatusFilter] = useState("");
  const [sidebarDateFilter, setSidebarDateFilter] = useState(""); // "upcoming", "past", "this-month", "this-quarter", ""
  const [collapsedParents, setCollapsedParents] = useState(new Set());
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
    finCustomCols: [],
    userProfiles: {}, // { email: { firstName, lastName, phone, title, department, avatar, company } }
    folderTemplate: [
      { name: "ADMIN", children: [
        { name: "BUDGET", children: [
          { name: "Exports", children: [] },
        ]},
        { name: "CLIENT DOCS", children: [
          { name: "Sent to Client", children: [] },
          { name: "Received from Client", children: [] },
        ]},
        { name: "VENDORS", children: [] },
      ]},
      { name: "PRODUCTION", children: [] },
      { name: "REFERENCE", children: [] },
    ],
  });
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [folderAuditResult, setFolderAuditResult] = useState(null);
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
  const [driveAccessPanel, setDriveAccessPanel] = useState(false);
  const [drivePermissions, setDrivePermissions] = useState([]);
  const [driveShareEmail, setDriveShareEmail] = useState("");
  const [driveShareRole, setDriveShareRole] = useState("reader");
  const [driveShareLoading, setDriveShareLoading] = useState(false);
  const [finFilterMonth, setFinFilterMonth] = useState("all");
  const [finFilterStatus, setFinFilterStatus] = useState("all");
  const [finShowSubs, setFinShowSubs] = useState(false);
  const [expandedRetainers, setExpandedRetainers] = useState(new Set());
  const [macroFilterStatus, setMacroFilterStatus] = useState("all");
  const [macroFilterType, setMacroFilterType] = useState("all");
  const [macroFilterDateFrom, setMacroFilterDateFrom] = useState("");
  const [macroFilterDateTo, setMacroFilterDateTo] = useState("");
  const [macroExpandedParents, setMacroExpandedParents] = useState(new Set());
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileSetupForm, setProfileSetupForm] = useState({ firstName: "", lastName: "", title: "", company: "", phone: "", department: "", address: "", avatar: "" });
  const [presenceUsers, setPresenceUsers] = useState([]);
  const [appSettingsLoaded, setAppSettingsLoaded] = useState(false);
  const [avatarCropSrc, setAvatarCropSrc] = useState(null); // raw image to crop
  const [avatarCropCallback, setAvatarCropCallback] = useState(null); // fn(dataUrl) to call on save
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
    { key: "progress", label: "Progress Report" },
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
  // ─── CONTRACT GENERATION ────────────────────────────────────
  const [contractModal, setContractModal] = useState(null); // { vendor, contractType, fields, generating, error }
  const openContractModal = (vendor) => {
    const now = new Date();
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const dayNum = String(now.getDate());
    const monthName = months[now.getMonth()];
    const year2 = String(now.getFullYear()).slice(-2);
    const eventStart = project.eventDates?.start ? new Date(project.eventDates.start + "T12:00:00") : null;
    const eventEnd = project.eventDates?.end ? new Date(project.eventDates.end + "T12:00:00") : null;
    const eventDateStr = eventStart ? (eventEnd && eventEnd > eventStart ? `${eventStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${eventEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : eventStart.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })) : "";
    const engStart = project.engagementDates?.start || "";
    const engEnd = project.engagementDates?.end || "";
    const termStr = engStart && engEnd ? `${new Date(engStart + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} through ${new Date(engEnd + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : "";

    // Try to detect contractor vs vendor from vendor type/contactType
    const isContractor = (vendor.contactType || "").toLowerCase().includes("contractor") || (vendor.type || "").toLowerCase().includes("contractor") || (vendor.type || "").toLowerCase() === "individual";
    const contractType = isContractor ? "contractor" : "vendor";

    // Build auto-filled fields
    const baseFields = {
      EFFECTIVE_DAY: dayNum,
      EFFECTIVE_MONTH: monthName,
      EFFECTIVE_YEAR: year2,
    };

    const contractorFields = {
      ...baseFields,
      CONTRACTOR_NAME: vendor.name || "",
      CONTRACTOR_ENTITY_TYPE: vendor.ein ? "a limited liability company" : "an individual",
      CONTRACTOR_ADDRESS: vendor.address || "",
      CONTRACTOR_EXPERTISE: vendor.deptId || vendor.type || "",
      SOW_TERM: termStr,
      SOW_PROJECT: project.name || "",
      SOW_COMPENSATION: "",
      SOW_PAYMENT_TERMS: "Net 15 — upon completion of services",
      SOW_DELIVERABLES: "",
      SOW_TIMELINE: eventDateStr,
      SOW_EXECUTION_DATE: `${monthName} ${dayNum}, 20${year2}`,
      AGREEMENT_DATE: `${monthName} ${dayNum}, 20${year2}`,
    };

    const vendorFields = {
      ...baseFields,
      VENDOR_NAME: vendor.name || "",
      VENDOR_ENTITY_DESC: vendor.ein ? `a ${vendor.address?.includes("CA") ? "California" : ""} limited liability company`.trim() : "an individual",
      VENDOR_TITLE: vendor.deptId || vendor.type || "",
      CLIENT_NAME: project.client || "",
      EVENT_NAME: project.name || "",
      EVENT_DATES: eventDateStr,
      EVENT_TIME: "",
      VENUE_NAME: project.venue ? project.venue.split(",")[0].trim() : project.location ? project.location.split(",")[0].trim() : "",
      VENUE_ADDRESS: project.venueAddress || (project.venue && project.venue.includes(",") ? project.venue : project.location || ""),
      DOCUMENT_TYPE: "proposal",
      DOCUMENT_DATE: "",
      VENDOR_DELIVERABLES: "",
      PAYMENT_TERMS: "Net 15 — upon completion of the Event",
      TIMELINE: termStr || eventDateStr,
      INSURANCE_COVERAGE: "One Million Dollars ($1,000,000) per occurrence and Two Million Dollars ($2,000,000) in the aggregate",
    };

    // Check for saved draft on this vendor
    const draft = vendor.contractDraft;
    const useFields = contractType === "contractor" ? contractorFields : vendorFields;
    const mergedFields = draft ? { ...useFields, ...Object.fromEntries(Object.entries(draft).filter(([_, v]) => v && v.trim())) } : useFields;

    setContractModal({
      vendor,
      contractType,
      fields: mergedFields,
      generating: false,
      error: null,
      invoiceLink: draft?.invoiceLink || null,
      success: null,
      hasDraft: !!draft,
    });
  };

  const generateContract = async () => {
    if (!contractModal) return;
    const tplId = (appSettings.templateDocs || {})[contractModal.contractType]?.id || null;
    if (!tplId) {
      setContractModal(prev => ({ ...prev, error: `No ${contractModal.contractType} template linked. Go to Settings → Templates to link a Google Doc.` }));
      return;
    }
    setContractModal(prev => ({ ...prev, generating: true, error: null }));
    // Format currency fields before sending
    const fmtCurrency = (val) => { const n = parseFloat((val || '').toString().replace(/[^0-9.]/g, '')); return isNaN(n) ? val : '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    const fieldsToSend = { ...contractModal.fields };
    if (fieldsToSend.SOW_COMPENSATION && !/^\$/.test(fieldsToSend.SOW_COMPENSATION)) fieldsToSend.SOW_COMPENSATION = fmtCurrency(fieldsToSend.SOW_COMPENSATION);
    
    const doGenerate = async (retry = false) => {
      const tplId = (appSettings.templateDocs || {})[contractModal.contractType]?.id || null;
      const res = await fetch("/api/contracts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          contractType: contractModal.contractType,
          fields: fieldsToSend,
          projectFolderId: project.driveFolderId || null,
          vendorName: contractModal.vendor.name,
          projectCode: project.code || "",
          invoiceLink: contractModal.invoiceLink || null,
          templateId: tplId,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    };

    try {
      const data = await doGenerate();
      // Update vendor compliance to mark contract as done (doc created, PDF comes later)
      setVendors(prev => prev.map(v => v.id !== contractModal.vendor.id ? v : {
        ...v,
        compliance: { ...v.compliance, contract: { done: true, file: data.docName, date: new Date().toISOString().split("T")[0], link: data.docUrl } },
        contractDraft: undefined,
      }));
      logActivity("contract", `generated ${contractModal.contractType} agreement for "${contractModal.vendor.name}"`, project?.name);
      setContractModal(prev => ({ ...prev, generating: false, success: data }));
    } catch (e) {
      setContractModal(prev => ({ ...prev, generating: false, error: e.message }));
    }
  };

  const saveContractDraft = () => {
    if (!contractModal) return;
    const draftData = { ...contractModal.fields, _contractType: contractModal.contractType, _savedAt: new Date().toISOString(), invoiceLink: contractModal.invoiceLink };
    setVendors(prev => prev.map(v => v.id !== contractModal.vendor.id ? v : { ...v, contractDraft: draftData }));
    setContractModal(prev => ({ ...prev, hasDraft: true, error: null, draftSaved: true }));
    setTimeout(() => setContractModal(prev => prev ? ({ ...prev, draftSaved: false }) : null), 2000);
    logActivity("contract", `saved contract draft for "${contractModal.vendor.name}"`, project?.name);
  };

  const clearContractDraft = () => {
    if (!contractModal) return;
    setVendors(prev => prev.map(v => v.id !== contractModal.vendor.id ? v : { ...v, contractDraft: undefined }));
    setContractModal(prev => ({ ...prev, hasDraft: false }));
  };

  const [w9Scanning, setW9Scanning] = useState(false);
  const [w9ParsedData, setW9ParsedData] = useState(null);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorSearching, setVendorSearching] = useState(false);
  const [driveResults, setDriveResults] = useState(null);
  const [docPreview, setDocPreview] = useState(null); // { vendorName, docType, fileName, date, path }
  const [renameModal, setRenameModal] = useState(null); // { file, vendorId, compKey, drivePath, basePath, vendorName, suggestedName, originalName, ext, fromContacts }
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
      const savedPR = g(LS_KEYS.progress);
      if (savedPR && Object.keys(savedPR).length > 0) setProjectProgress(savedPR);
      const savedCMT = g(LS_KEYS.comments);
      if (savedCMT && Object.keys(savedCMT).length > 0) setProjectComments(savedCMT);
      const savedROS = g(LS_KEYS.ros);
      if (savedROS && Object.keys(savedROS).length > 0) setProjectROS(savedROS);
      const savedTS = g(LS_KEYS.textSize);
      if (savedTS) setTextSize(savedTS);
    } catch (e) { console.warn("localStorage hydration failed:", e); }
  }, []);
  // ─── AUTO-SAVE TO LOCALSTORAGE (skip initial render) ────────────
  const saveSkipRef = useRef(true);
  // localStorage is now write-through cache only — saveSlice() handles writing to both Supabase and localStorage.
  // These effects only handle textSize (UI-only, no Supabase) and the initial skip guard.
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
        if (contractModal) { setContractModal(null); e.preventDefault(); return; }
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
  }, [showSettings, showAddProject, showAddContact, showAddClient, showAddVendor, showPrintROS, showVersionHistory, showActivityFeed, assignContactPopover, contactPopover, contextMenu, docPreview, contractModal, doUndo, doRedo]);
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
        const existingMap = new Map(prev.map(c => [c.name.toLowerCase(), c]));
        const unique = [];
        let mergedCount = 0;
        const updated = prev.map(c => {
          const incoming = newContacts.find(nc => nc.name.toLowerCase() === c.name.toLowerCase());
          if (!incoming) return c;
          // Merge: only fill in fields that are currently empty
          let didMerge = false;
          const merged = { ...c };
          ['email', 'phone', 'company', 'position', 'department', 'address', 'notes'].forEach(field => {
            if ((!merged[field] || merged[field] === "—") && incoming[field]) {
              merged[field] = incoming[field];
              didMerge = true;
            }
          });
          if (!merged.firstName && incoming.firstName) { merged.firstName = incoming.firstName; didMerge = true; }
          if (!merged.lastName && incoming.lastName) { merged.lastName = incoming.lastName; didMerge = true; }
          if (didMerge) mergedCount++;
          return merged;
        });
        // Add truly new contacts
        newContacts.forEach(nc => {
          if (!existingMap.has(nc.name.toLowerCase())) unique.push(nc);
        });
        const label = isClientCSV ? "client" : "contact";
        const msgs = [];
        if (unique.length > 0) msgs.push(`${unique.length} new ${label}${unique.length > 1 ? "s" : ""}`);
        if (mergedCount > 0) msgs.push(`${mergedCount} updated`);
        if (msgs.length > 0) {
          setClipboardToast({ text: `CSV: ${msgs.join(", ")}`, x: window.innerWidth / 2, y: 60 });
          setTimeout(() => setClipboardToast(null), 3000);
        }
        return [...updated, ...unique];
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
      // Mirror: update matching Global Partners contacts, or create if missing
      setContacts(prev => {
        let updated = prev.map(c => {
          if (c.company === form.name && c.position === "Billing Contact") {
            return { ...c, name: form.billingContact, email: form.billingEmail, phone: form.billingPhone, address: form.billingAddress };
          }
          if (c.company === form.name && c.position === "Client Contact") {
            return { ...c, name: form.contactName, email: form.contactEmail, phone: form.contactPhone, address: form.contactAddress };
          }
          return c;
        });
        // Create if missing
        if (form.contactName && !updated.some(c => c.name.toLowerCase() === form.contactName.toLowerCase() && c.company === form.name)) {
          updated = [...updated, { id: `ct_${Date.now()}_cc`, name: form.contactName, firstName: form.contactName.split(" ")[0] || "", lastName: form.contactName.split(" ").slice(1).join(" ") || "", email: form.contactEmail || "", phone: form.contactPhone || "", company: form.name, position: "Client Contact", contactType: "Client", department: "", address: form.contactAddress || "", resourceType: "", vendorName: form.name, notes: "", source: "client" }];
        }
        if (form.billingContact && form.billingContact !== form.contactName && !updated.some(c => c.name.toLowerCase() === form.billingContact.toLowerCase() && c.company === form.name)) {
          updated = [...updated, { id: `ct_${Date.now()}_bc`, name: form.billingContact, firstName: form.billingContact.split(" ")[0] || "", lastName: form.billingContact.split(" ").slice(1).join(" ") || "", email: form.billingEmail || "", phone: form.billingPhone || "", company: form.name, position: "Billing Contact", contactType: "Client", department: "", address: form.billingAddress || "", resourceType: "", vendorName: form.name, notes: "", source: "client" }];
        }
        return updated;
      });
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
    const clean = (s) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const yr = p.eventDates?.start ? p.eventDates.start.slice(2, 4) : new Date().getFullYear().toString().slice(2);
    const mo = p.eventDates?.start ? p.eventDates.start.slice(5, 7) : String(new Date().getMonth() + 1).padStart(2, "0");
    // Use client's company code if available, otherwise abbreviate client name
    const clientObj = clients.find(cl => cl.name?.toLowerCase() === (p.client || "").toLowerCase());
    const clientCode = clean(clientObj?.code || p.client).slice(0, 10) || "CLIENT";
    const proj = clean(p.name).slice(0, 20) || "PROJECT";
    const loc = clean(p.location?.split(",")[0]).slice(0, 8) || "TBD";
    return `${yr}-${mo}-${clientCode}-${proj}-${loc}`;
  };

  const emptyProject = { name: "", client: "", location: "", venue: "", why: "", status: "Exploration", projectType: "Brand Event", producers: [], managers: [], staff: [], pocs: [], clientContacts: [], billingContacts: [], eventDates: { start: "", end: "" }, engagementDates: { start: "", end: "" }, budget: 0, spent: 0, services: [] };
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
    ["coi", "w9", "quote", "contract", "invoice"].forEach(k => {
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
      compliance: { coi: { done: false, file: null, date: null }, w9: w9Done, quote: { done: false, file: null, date: null }, invoice: { done: false, file: null, date: null }, contract: { done: false, file: null, date: null } }
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
    // Pre-create vendor folder in project's ADMIN/VENDORS/ on Google Drive
    if (project?.driveFolderId) {
      try {
        fetch('/api/drive/project', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create-vendor-folder', projectFolderId: project.driveFolderId, vendorName: name }) });
      } catch (e) { console.error('Vendor folder creation failed:', e); }
    }
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
        setAppSettingsLoaded(true);
      } catch (e) { console.error('Settings load failed:', e); setAppSettingsLoaded(true); }
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
        // Fetch ALL rows from shared_state
        const { data: allRows, error } = await supabase
          .from('shared_state')
          .select('id, state, updated_at');
        if (error && error.code !== 'PGRST116') { console.error('Load error:', error); }
        
        const rowMap = {};
        (allRows || []).forEach(r => { rowMap[r.id] = r; });
        
        // Check if we have individual slice rows or just the old 'shared' blob
        const hasSlices = SLICE_KEYS.some(k => rowMap[k]);
        const hasShared = rowMap['shared']?.state;
        
        // Mark all as remote so initial load doesn't trigger saves
        SLICE_KEYS.forEach(k => { remoteSyncTimes.current[k] = Date.now(); });
        
        if (hasSlices) {
          // ─── LOAD FROM INDIVIDUAL SLICE ROWS ────────────────────
          console.log('Loading from per-slice rows');
          const s = {};
          SLICE_KEYS.forEach(k => { s[k] = rowMap[k]?.state; });
          
          if (s.projects && Array.isArray(s.projects)) {
            const clientNameMap = { "Amjad Asad": "Amjad Masad", "Ayita": "AYITA", "GUESS?, Inc": "Guess", "GUESS?, Inc.": "Guess", "NVE": "NVE Experience Agency, LLC", "Sequel Inc": "Sequel Marketing", "Franklin Pictures": "Franklin Pictures, Inc.", "Franklin Pictures, Inc": "Franklin Pictures, Inc.", "Brunello": "Brunelo" };
            setProjects(s.projects.map(p => ({ ...p, client: clientNameMap[p.client] || p.client, producers: Array.isArray(p.producers) ? p.producers : [], managers: Array.isArray(p.managers) ? p.managers : [], staff: Array.isArray(p.staff) ? p.staff : [], pocs: Array.isArray(p.pocs) ? p.pocs : [], clientContacts: Array.isArray(p.clientContacts) ? p.clientContacts : [], billingContacts: Array.isArray(p.billingContacts) ? p.billingContacts : [], services: Array.isArray(p.services) ? p.services : [], subEvents: Array.isArray(p.subEvents) ? p.subEvents : [], contactOrder: Array.isArray(p.contactOrder) ? p.contactOrder : [], parentId: p.parentId || null })));
          }
          if (s.projectVendors && typeof s.projectVendors === 'object') {
            const safe = {};
            Object.keys(s.projectVendors).forEach(k => { safe[k] = Array.isArray(s.projectVendors[k]) ? s.projectVendors[k].map(v => ({ ...v, compliance: (() => { const c = v.compliance && typeof v.compliance === 'object' ? v.compliance : {}; return { coi: c.coi || { done: false }, w9: c.w9 || { done: false }, quote: c.quote || { done: false }, invoice: c.invoice || { done: false }, contract: c.contract || { done: false } }; })() })) : []; });
            setProjectVendors(safe);
          }
          if (s.projectWorkback && typeof s.projectWorkback === 'object') {
            const safe = {}; Object.keys(s.projectWorkback).forEach(k => { safe[k] = Array.isArray(s.projectWorkback[k]) ? s.projectWorkback[k] : []; }); setProjectWorkback(safe);
          }
          if (s.projectProgress && typeof s.projectProgress === 'object') {
            const safe = {}; Object.keys(s.projectProgress).forEach(k => { const v = s.projectProgress[k]; safe[k] = { rows: Array.isArray(v?.rows) ? v.rows : [], locations: Array.isArray(v?.locations) ? v.locations : [] }; }); setProjectProgress(safe);
          }
          if (s.projectComments && typeof s.projectComments === 'object') {
            const safe = {}; Object.keys(s.projectComments).forEach(k => { safe[k] = Array.isArray(s.projectComments[k]) ? s.projectComments[k] : []; }); setProjectComments(safe);
          }
          if (s.projectROS && typeof s.projectROS === 'object') {
            const safe = {}; Object.keys(s.projectROS).forEach(k => { safe[k] = Array.isArray(s.projectROS[k]) ? s.projectROS[k].map(r => ({ ...r, vendors: Array.isArray(r.vendors) ? r.vendors : [] })) : []; }); setProjectROS(safe);
          }
          if (s.rosDayDates) setRosDayDates(s.rosDayDates);
          if (s.contacts && Array.isArray(s.contacts)) setContacts(s.contacts);
          if (s.activityLog && Array.isArray(s.activityLog)) setActivityLog(s.activityLog);
          if (s.appSettings && typeof s.appSettings === 'object') setAppSettings(prev => ({ ...prev, ...s.appSettings }));
          if (s.clients && Array.isArray(s.clients)) {
            const nameMap = { "Amjad Asad": "Amjad Masad", "Ayita": "AYITA", "GUESS?, Inc": "Guess", "GUESS?, Inc.": "Guess", "NVE": "NVE Experience Agency, LLC", "Sequel Inc": "Sequel Marketing", "Franklin Pictures": "Franklin Pictures, Inc.", "Franklin Pictures, Inc": "Franklin Pictures, Inc.", "Brunello": "Brunelo" };
            const migrated = s.clients.map(c => ({ ...c, name: nameMap[c.name] || c.name }));
            const seen = new Set(); setClients(migrated.filter(c => { const k = c.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }));
          }
        } else if (hasShared) {
          // ─── MIGRATE FROM OLD 'shared' BLOB ────────────────────
          console.log('Migrating from shared blob to per-slice rows...');
          const s = rowMap['shared'].state;
          
          // Apply to React state (same sanitization as before)
          if (s.projects && Array.isArray(s.projects)) {
            const clientNameMap = { "Amjad Asad": "Amjad Masad", "Ayita": "AYITA", "GUESS?, Inc": "Guess", "GUESS?, Inc.": "Guess", "NVE": "NVE Experience Agency, LLC", "Sequel Inc": "Sequel Marketing", "Franklin Pictures": "Franklin Pictures, Inc.", "Franklin Pictures, Inc": "Franklin Pictures, Inc.", "Brunello": "Brunelo" };
            setProjects(s.projects.map(p => ({ ...p, client: clientNameMap[p.client] || p.client, producers: Array.isArray(p.producers) ? p.producers : [], managers: Array.isArray(p.managers) ? p.managers : [], staff: Array.isArray(p.staff) ? p.staff : [], pocs: Array.isArray(p.pocs) ? p.pocs : [], clientContacts: Array.isArray(p.clientContacts) ? p.clientContacts : [], billingContacts: Array.isArray(p.billingContacts) ? p.billingContacts : [], services: Array.isArray(p.services) ? p.services : [], subEvents: Array.isArray(p.subEvents) ? p.subEvents : [], contactOrder: Array.isArray(p.contactOrder) ? p.contactOrder : [], parentId: p.parentId || null })));
          }
          if (s.projectVendors && typeof s.projectVendors === 'object') {
            const safe = {};
            Object.keys(s.projectVendors).forEach(k => { safe[k] = Array.isArray(s.projectVendors[k]) ? s.projectVendors[k].map(v => ({ ...v, compliance: (() => { const c = v.compliance && typeof v.compliance === 'object' ? v.compliance : {}; return { coi: c.coi || { done: false }, w9: c.w9 || { done: false }, quote: c.quote || { done: false }, invoice: c.invoice || { done: false }, contract: c.contract || { done: false } }; })() })) : []; });
            setProjectVendors(safe);
          }
          if (s.projectWorkback) { const safe = {}; Object.keys(s.projectWorkback).forEach(k => { safe[k] = Array.isArray(s.projectWorkback[k]) ? s.projectWorkback[k] : []; }); setProjectWorkback(safe); }
          if (s.projectProgress) { const safe = {}; Object.keys(s.projectProgress).forEach(k => { const v = s.projectProgress[k]; safe[k] = { rows: Array.isArray(v?.rows) ? v.rows : [], locations: Array.isArray(v?.locations) ? v.locations : [] }; }); setProjectProgress(safe); }
          if (s.projectComments) { const safe = {}; Object.keys(s.projectComments).forEach(k => { safe[k] = Array.isArray(s.projectComments[k]) ? s.projectComments[k] : []; }); setProjectComments(safe); }
          if (s.projectROS) { const safe = {}; Object.keys(s.projectROS).forEach(k => { safe[k] = Array.isArray(s.projectROS[k]) ? s.projectROS[k].map(r => ({ ...r, vendors: Array.isArray(r.vendors) ? r.vendors : [] })) : []; }); setProjectROS(safe); }
          if (s.rosDayDates) setRosDayDates(s.rosDayDates);
          if (s.contacts && Array.isArray(s.contacts)) setContacts(s.contacts);
          if (s.activityLog && Array.isArray(s.activityLog)) setActivityLog(s.activityLog);
          if (s.clients && Array.isArray(s.clients)) {
          if (s.appSettings && typeof s.appSettings === 'object') setAppSettings(prev => ({ ...prev, ...s.appSettings }));
            const nameMap = { "Amjad Asad": "Amjad Masad", "Ayita": "AYITA", "GUESS?, Inc": "Guess", "GUESS?, Inc.": "Guess", "NVE": "NVE Experience Agency, LLC", "Sequel Inc": "Sequel Marketing", "Franklin Pictures": "Franklin Pictures, Inc.", "Franklin Pictures, Inc": "Franklin Pictures, Inc.", "Brunello": "Brunelo" };
            const migrated = s.clients.map(c => ({ ...c, name: nameMap[c.name] || c.name }));
            const seen = new Set(); setClients(migrated.filter(c => { const k = c.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }));
          }
          
          // Write individual slice rows to Supabase (migration)
          const now = new Date().toISOString();
          const sliceData = {
            projects: s.projects || [],
            contacts: s.contacts || [],
            clients: s.clients || [],
            projectVendors: s.projectVendors || {},
            projectWorkback: s.projectWorkback || {},
            projectProgress: s.projectProgress || {},
            projectComments: s.projectComments || {},
            projectROS: s.projectROS || {},
            rosDayDates: s.rosDayDates || {},
            activityLog: s.activityLog || [],
            appSettings: s.appSettings || { finCustomCols: [] },
          };
          const upserts = Object.entries(sliceData).map(([key, data]) => ({
            id: key, state: data, updated_at: now, updated_by: user.id
          }));
          const { error: migError } = await supabase.from('shared_state').upsert(upserts, { onConflict: 'id' });
          if (migError) console.error('Migration error:', migError);
          else console.log('Migration complete: split shared blob into', SLICE_KEYS.length, 'slice rows');
        }
        
        // ONE-TIME MERGE: Recover from localStorage
        try {
          const lsContacts = JSON.parse(localStorage.getItem(LS_KEYS.contacts) || "[]");
          const lsClients = JSON.parse(localStorage.getItem(LS_KEYS.clients) || "[]");
          const lsProjects = JSON.parse(localStorage.getItem(LS_KEYS.projects) || "[]");
          const src = hasSlices ? {} : (hasShared ? rowMap['shared'].state : {});
          const currentContacts = (hasSlices ? rowMap['contacts']?.state : src.contacts) || [];
          const currentClients = (hasSlices ? rowMap['clients']?.state : src.clients) || [];
          const currentProjects = (hasSlices ? rowMap['projects']?.state : src.projects) || [];
          const sbContactIds = new Set(currentContacts.map(c => c.id));
          const sbClientIds = new Set(currentClients.map(c => c.id || c.name));
          const sbProjectIds = new Set(currentProjects.map(p => p.id));
          const missingContacts = lsContacts.filter(c => c.id && !sbContactIds.has(c.id));
          const missingClients = lsClients.filter(c => !sbClientIds.has(c.id || c.name));
          const missingProjects = lsProjects.filter(p => p.id && !sbProjectIds.has(p.id));
          if (missingContacts.length > 0 || missingClients.length > 0 || missingProjects.length > 0) {
            console.log(`Recovery merge: +${missingContacts.length} contacts, +${missingClients.length} clients, +${missingProjects.length} projects`);
            if (missingContacts.length > 0) setContacts(prev => [...prev, ...missingContacts]);
            if (missingClients.length > 0) setClients(prev => [...prev, ...missingClients]);
            if (missingProjects.length > 0) setProjects(prev => [...prev, ...missingProjects.map(p => ({ ...p, producers: Array.isArray(p.producers) ? p.producers : [], managers: Array.isArray(p.managers) ? p.managers : [], staff: Array.isArray(p.staff) ? p.staff : [], pocs: Array.isArray(p.pocs) ? p.pocs : [], clientContacts: Array.isArray(p.clientContacts) ? p.clientContacts : [], billingContacts: Array.isArray(p.billingContacts) ? p.billingContacts : [], services: Array.isArray(p.services) ? p.services : [], subEvents: Array.isArray(p.subEvents) ? p.subEvents : [], parentId: p.parentId || null }))]);
            // Allow these merges to save (clear remote guard)
            ['contacts', 'clients', 'projects'].forEach(k => { remoteSyncTimes.current[k] = 0; });
          }
        } catch (e) { console.warn('Recovery merge failed:', e); }
        
        setDataLoaded(true);
        setLastSyncTime(Date.now());
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
      
      // Update vendors across ALL projects, not just active
      setProjectVendors(prevAll => {
        const updated = { ...prevAll };
        for (const projId of Object.keys(updated)) {
          updated[projId] = (updated[projId] || []).map(v => {
            const driveMatch = driveCompliance[v.name];
            if (!driveMatch) {
              const u = { ...v.compliance };
              ['coi', 'w9'].forEach(key => {
                if (u[key]?.done && u[key]?.link) u[key] = { done: false };
              });
              return { ...v, compliance: u };
            }
            const u = { ...v.compliance };
            ['coi', 'w9'].forEach(key => {
              if (driveMatch[key]?.done) {
                u[key] = { done: true, file: driveMatch[key].file, link: driveMatch[key].link };
              } else if (u[key]?.done && u[key]?.link) {
                u[key] = { done: false };
              }
            });
            return { ...v, compliance: u };
          });
        }
        return updated;
      });
    } catch (e) {
      console.log('Drive sync skipped:', e.message);
    }
  };

  // ─── ONE-TIME CLEANUP: dedup contacts + remove name=company ──
  useEffect(() => {
    if (!dataLoaded) return;
    setContacts(prev => {
      let changed = false;
      // 1. Remove contacts where person name = company name
      let cleaned = prev.filter(c => {
        if (!c.company || !c.name) return true;
        if (c.name.toLowerCase().trim() === c.company.toLowerCase().trim()) { changed = true; return false; }
        return true;
      });
      // 2. Dedup: same name + same company (case-insensitive) → keep the one with more data
      const seen = new Map();
      const deduped = [];
      cleaned.forEach(c => {
        const key = (c.name || "").toLowerCase().trim() + "|||" + (c.company || "").toLowerCase().trim();
        if (seen.has(key)) {
          // Compare: keep the one with more filled fields
          const existing = seen.get(key);
          const scoreExisting = [existing.email, existing.phone, existing.address, existing.position].filter(Boolean).length;
          const scoreNew = [c.email, c.phone, c.address, c.position].filter(Boolean).length;
          if (scoreNew > scoreExisting) {
            // Replace with richer record
            const idx = deduped.indexOf(existing);
            if (idx !== -1) deduped[idx] = { ...c, contactType: existing.contactType || c.contactType };
            seen.set(key, deduped[idx]);
          }
          changed = true;
        } else {
          seen.set(key, c);
          deduped.push(c);
        }
      });
      if (changed) console.log(`Cleanup: ${prev.length} → ${deduped.length} contacts (removed ${prev.length - deduped.length} dupes/invalid)`);
      return changed ? deduped : prev;
    });
  }, [dataLoaded]);

  // ─── ONE-TIME CLEANUP: dedup vendors per project ──
  useEffect(() => {
    if (!dataLoaded) return;
    setProjectVendors(prevAll => {
      let anyChanged = false;
      const updated = { ...prevAll };
      for (const projId of Object.keys(updated)) {
        const vList = updated[projId] || [];
        if (vList.length < 2) continue;
        const seen = new Map();
        const deduped = [];
        vList.forEach(v => {
          const key = (v.name || "").toLowerCase().trim();
          if (!key) { deduped.push(v); return; }
          if (seen.has(key)) {
            const existing = seen.get(key);
            const comp = { ...existing.compliance };
            ['coi', 'w9', 'quote', 'invoice', 'contract'].forEach(k => {
              if (v.compliance?.[k]?.done && !comp[k]?.done) comp[k] = v.compliance[k];
            });
            const idx = deduped.indexOf(existing);
            if (idx !== -1) deduped[idx] = { ...existing, compliance: comp, driveFolderId: existing.driveFolderId || v.driveFolderId };
            seen.set(key, deduped[idx]);
            anyChanged = true;
          } else {
            seen.set(key, v);
            deduped.push(v);
          }
        });
        if (deduped.length !== vList.length) {
          console.log(`Vendor dedup [${projId}]: ${vList.length} → ${deduped.length}`);
          updated[projId] = deduped;
        }
      }
      return anyChanged ? updated : prevAll;
    });
  }, [dataLoaded]);

  // ─── SYNC CLIENT CONTACTS → GLOBAL PARTNERS (once per session) ──
  const clientSyncDone = useRef(false);
  useEffect(() => {
    if (!dataLoaded || clients.length === 0 || clientSyncDone.current) return;
    clientSyncDone.current = true;
    // Load dismissed contacts (ones user manually deleted — never re-add)
    const dismissed = new Set(JSON.parse(localStorage.getItem("adptv_dismissed_contacts") || "[]"));
    setContacts(prev => {
      const existingNames = new Set(prev.map(c => c.name.toLowerCase().trim()));
      const toAdd = [];
      clients.forEach(cl => {
        const companyName = cl.name || "";
        const companyLower = companyName.toLowerCase().trim();
        const candidates = [];
        if (cl.contactName?.trim()) candidates.push({ name: cl.contactName, email: cl.contactEmail, phone: cl.contactPhone, address: cl.contactAddress, position: "Client Contact" });
        if (cl.billingContact?.trim() && cl.billingContact !== cl.contactName) candidates.push({ name: cl.billingContact, email: cl.billingEmail, phone: cl.billingPhone, address: cl.billingAddress, position: "Billing Contact" });
        (cl.contactNames || []).forEach(cn => {
          if (cn?.trim() && cn !== cl.contactName && cn !== cl.billingContact) candidates.push({ name: cn, email: "", phone: "", address: "", position: "Contact" });
        });
        candidates.forEach(ct => {
          const nameLower = ct.name.toLowerCase().trim();
          if (nameLower === companyLower) return; // skip name=company
          if (existingNames.has(nameLower)) return; // already exists
          const dismissKey = nameLower + "|||" + companyLower;
          if (dismissed.has(dismissKey)) return; // user deleted this before
          existingNames.add(nameLower);
          toAdd.push({
            id: `ct_cs_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
            name: ct.name, firstName: ct.name.split(" ")[0] || "", lastName: ct.name.split(" ").slice(1).join(" ") || "",
            email: ct.email || "", phone: ct.phone || "", company: companyName,
            position: ct.position, contactType: "Client", department: "", address: ct.address || "",
            resourceType: "", vendorName: companyName, notes: "", source: "client"
          });
        });
      });
      if (toAdd.length > 0) {
        console.log(`Client→Partner sync: adding ${toAdd.length} missing contacts to Global Partners`);
        return [...prev, ...toAdd];
      }
      return prev;
    });
  }, [dataLoaded, clients]);

  // Auto-sync Drive compliance every 60 seconds
  useEffect(() => {
    if (!user || !dataLoaded) return;
    const interval = setInterval(syncDriveCompliance, 60000);
    return () => clearInterval(interval);
  }, [user, dataLoaded]);

  // Sync vendor details → matching Global Partners contacts
  useEffect(() => {
    if (!vendors || vendors.length === 0) return;
    setContacts(prev => {
      let changed = false;
      const updated = prev.map(c => {
        const match = vendors.find(v => 
          v.name && c.name && (
            v.name.toLowerCase() === c.name.toLowerCase() ||
            v.name.toLowerCase() === (c.company || '').toLowerCase() ||
            (v.email && c.email && v.email.toLowerCase() === c.email.toLowerCase())
          )
        );
        if (!match) return c;
        const updates = {};
        if (match.phone && !c.phone) updates.phone = match.phone;
        if (match.email && !c.email) updates.email = match.email;
        if (match.address && !c.address) updates.address = match.address;
        if (match.contact && !c.firstName) { updates.firstName = (match.contact || '').split(' ')[0]; updates.lastName = (match.contact || '').split(' ').slice(1).join(' '); }
        if (match.type && !c.resourceType) updates.resourceType = match.type;
        if (match.title && !c.position) updates.position = match.title;
        if (match.name && !c.company) updates.company = match.name;
        if (match.deptId && !c.department) updates.department = match.deptId;
        if (Object.keys(updates).length === 0) return c;
        changed = true;
        return { ...c, ...updates };
      });
      return changed ? updated : prev;
    });
  }, [vendors]);

  // ─── PER-SLICE SAVE ──────────────────────────────────────────────
  const sanitizeProjectsArr = (arr) => arr.map(p => ({ ...p, producers: Array.isArray(p.producers) ? p.producers : [], managers: Array.isArray(p.managers) ? p.managers : [], staff: Array.isArray(p.staff) ? p.staff : [], pocs: Array.isArray(p.pocs) ? p.pocs : [], clientContacts: Array.isArray(p.clientContacts) ? p.clientContacts : [], billingContacts: Array.isArray(p.billingContacts) ? p.billingContacts : [], services: Array.isArray(p.services) ? p.services : [], subEvents: Array.isArray(p.subEvents) ? p.subEvents : [], parentId: p.parentId || null }));

  const saveSlice = useCallback(async (key, data) => {
    if (!user) return;
    setSaveStatus("saving");
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('shared_state')
        .upsert({ id: key, state: data, updated_at: now, updated_by: user.id }, { onConflict: 'id' });
      if (error) {
        console.error(`Save error (${key}):`, error);
        setSaveStatus("error");
      } else {
        setSaveStatus("saved");
        setLastSyncTime(Date.now());
        // Write-through: cache to localStorage as fallback
        const lsMap = { projects: LS_KEYS.projects, contacts: LS_KEYS.contacts, clients: LS_KEYS.clients, projectVendors: LS_KEYS.vendors, projectWorkback: LS_KEYS.workback, projectProgress: LS_KEYS.progress, projectComments: LS_KEYS.comments, projectROS: LS_KEYS.ros };
        if (lsMap[key]) { try { localStorage.setItem(lsMap[key], JSON.stringify(data)); localStorage.setItem(LS_KEYS.updatedAt, now); } catch {} }
      }
    } catch (e) {
      console.error(`Save failed (${key}):`, e);
      setSaveStatus("error");
    }
  }, [user, supabase]);

  // Helper: create an immediate-save effect for a slice (100ms micro-debounce for typing batching)
  const useSliceSave = (key, data) => {
    useEffect(() => {
      if (!dataLoaded) return;
      // Skip if this state change was caused by incoming remote data
      if (Date.now() - (remoteSyncTimes.current[key] || 0) < 1500) return;
      if (sliceTimers.current[key]) clearTimeout(sliceTimers.current[key]);
      const delay = forceSaveCounter > 0 ? 0 : 100; // 100ms micro-debounce (was 800ms)
      sliceTimers.current[key] = setTimeout(() => saveSlice(key, data), delay);
      return () => { if (sliceTimers.current[key]) clearTimeout(sliceTimers.current[key]); };
    }, [data, dataLoaded, forceSaveCounter]);
  };

  // Individual per-slice save effects
  useSliceSave('projects', projects);
  useSliceSave('contacts', contacts);
  useSliceSave('clients', clients);
  useSliceSave('projectVendors', projectVendors);
  useSliceSave('projectWorkback', projectWorkback);
  useSliceSave('projectProgress', projectProgress);
  useSliceSave('projectComments', projectComments);
  useSliceSave('projectROS', projectROS);
  useSliceSave('rosDayDates', rosDayDates);
  useSliceSave('activityLog', activityLog);

  // Flush all pending saves on tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!user) return;
      const now = new Date().toISOString();
      // Cancel pending timers and save immediately via sendBeacon
      SLICE_KEYS.forEach(key => {
        if (sliceTimers.current[key]) clearTimeout(sliceTimers.current[key]);
      });
      const slices = { projects, contacts, clients, projectVendors, projectWorkback, projectProgress, projectComments, projectROS, rosDayDates, activityLog };
      Object.entries(slices).forEach(([key, data]) => {
        try {
          const payload = JSON.stringify({ key, state: data, updated_at: now, updated_by: user.id });
          navigator.sendBeacon(`${window.location.origin}/api/save-state`, new Blob([payload], { type: 'application/json' }));
        } catch {}
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, projects, contacts, clients, projectVendors, projectWorkback, projectProgress, projectComments, projectROS, rosDayDates, activityLog]);

  // ─── REALTIME SYNC (per-slice with smart merge) ──────────────────
  // Merge arrays by ID: remote wins for existing items, local-only items preserved
  const mergeArrayById = useCallback((local, remote) => {
    if (!Array.isArray(remote)) return local;
    if (!Array.isArray(local) || local.length === 0) return remote;
    const remoteMap = new Map(remote.map(item => [item.id, item]));
    const merged = [...remote]; // start with all remote items
    // Add local items that don't exist in remote (locally created, save pending)
    local.forEach(item => {
      if (item.id && !remoteMap.has(item.id)) merged.push(item);
    });
    return merged;
  }, []);

  // Merge dict-of-arrays (projectVendors, projectWorkback, etc.)
  const mergeDictById = useCallback((local, remote) => {
    if (!remote || typeof remote !== 'object') return local;
    if (!local || typeof local !== 'object') return remote;
    const merged = { ...remote };
    // Preserve local project keys not in remote
    Object.keys(local).forEach(k => {
      if (!merged[k]) merged[k] = local[k];
      else if (Array.isArray(merged[k]) && Array.isArray(local[k])) {
        const remoteIds = new Set(merged[k].map(v => v.id));
        local[k].forEach(v => { if (v.id && !remoteIds.has(v.id)) merged[k].push(v); });
      }
    });
    return merged;
  }, []);

  const applyRemoteSlice = useCallback((key, data) => {
    remoteSyncTimes.current[key] = Date.now();
    if (key === 'projects' && Array.isArray(data)) setProjects(prev => mergeArrayById(prev, sanitizeProjectsArr(data)));
    else if (key === 'contacts' && Array.isArray(data)) setContacts(prev => mergeArrayById(prev, data));
    else if (key === 'clients' && Array.isArray(data)) setClients(prev => mergeArrayById(prev, data));
    else if (key === 'activityLog' && Array.isArray(data)) setActivityLog(data); // activity log: remote wins always
    else if (key === 'appSettings' && data && typeof data === 'object') setAppSettings(prev => ({ ...prev, ...data }));
    else if (key === 'projectVendors' && data) setProjectVendors(prev => mergeDictById(prev, data));
    else if (key === 'projectWorkback' && data) setProjectWorkback(prev => mergeDictById(prev, data));
    else if (key === 'projectProgress' && data) setProjectProgress(prev => mergeDictById(prev, data));
    else if (key === 'projectComments' && data) setProjectComments(prev => mergeDictById(prev, data));
    else if (key === 'projectROS' && data) setProjectROS(prev => mergeDictById(prev, data));
    else if (key === 'rosDayDates' && data) setRosDayDates(prev => ({ ...prev, ...data }));
    // Write-through to localStorage cache
    const lsMap = { projects: LS_KEYS.projects, contacts: LS_KEYS.contacts, clients: LS_KEYS.clients, projectVendors: LS_KEYS.vendors, projectWorkback: LS_KEYS.workback, projectProgress: LS_KEYS.progress, projectComments: LS_KEYS.comments, projectROS: LS_KEYS.ros };
    if (lsMap[key]) { try { localStorage.setItem(lsMap[key], JSON.stringify(data)); } catch {} }
    setLastSyncTime(Date.now());
  }, [mergeArrayById, mergeDictById]);

  useEffect(() => {
    if (!user || !supabase) return;
    // Listen to ALL rows in shared_state, route by id
    const channel = supabase.channel('shared-state-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_state' }, (payload) => {
        const updatedBy = payload.new?.updated_by;
        if (updatedBy === user.id) return;
        const key = payload.new?.id;
        if (!key || key === 'shared' || !SLICE_KEYS.includes(key)) return;
        console.log(`Realtime: ${key} updated by another user`);
        applyRemoteSlice(key, payload.new?.state);
        setClipboardToast({ text: `🔄 Synced ${key} from team`, x: window.innerWidth / 2, y: 60 });
        setTimeout(() => setClipboardToast(null), 2500);
      })
      .subscribe();
    // Polling fallback: check all slices every 3s (was 8s)
    const sliceTimestamps = {};
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase.from('shared_state').select('id, updated_at, updated_by').in('id', SLICE_KEYS);
        if (!data) return;
        const changed = data.filter(row => row.updated_by !== user.id && row.updated_at && (!sliceTimestamps[row.id] || new Date(row.updated_at) > new Date(sliceTimestamps[row.id])));
        if (changed.length === 0) return;
        // Fetch full state for changed slices
        const changedIds = changed.map(r => r.id);
        const { data: full } = await supabase.from('shared_state').select('id, state, updated_at').in('id', changedIds);
        if (!full) return;
        full.forEach(row => {
          applyRemoteSlice(row.id, row.state);
          sliceTimestamps[row.id] = row.updated_at;
        });
        if (full.length > 0) {
          setClipboardToast({ text: `🔄 Synced ${full.length} change${full.length > 1 ? 's' : ''} from team`, x: window.innerWidth / 2, y: 60 });
          setTimeout(() => setClipboardToast(null), 2500);
        }
      } catch (e) { console.warn('Sync poll error:', e); }
    }, 5000); // 5s polling (reduced from 3s to lower Vercel invocations)
    return () => { supabase.removeChannel(channel); clearInterval(pollInterval); };
  }, [user, supabase, applyRemoteSlice]);

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
    contactOrder: Array.isArray(_rawProject.contactOrder) ? _rawProject.contactOrder : [],
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
      
      setProjectVendors(prevAll => {
        const prev = prevAll[proj.id] || [];
        // Dedup existing list first (in case of prior race conditions)
        const deduped = [];
        const seenNames = new Set();
        for (const v of prev) {
          const key = (v.name || "").toLowerCase().trim();
          if (key && seenNames.has(key)) continue;
          seenNames.add(key);
          deduped.push(v);
        }
        let updated = [...deduped];
        
        for (const [vendorName, vendorData] of Object.entries(projectDriveVendors)) {
          const existingIdx = updated.findIndex(v => v.name?.toLowerCase() === vendorName.toLowerCase());
          
          if (existingIdx >= 0) {
            // Vendor already exists — merge project-specific docs (invoice, contract)
            const v = updated[existingIdx];
            const comp = { ...v.compliance };
            
            // Project-specific docs: invoice, quote, contract
            ['invoice', 'quote', 'contract'].forEach(key => {
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
            const comp = { coi: { done: false }, w9: { done: false }, quote: { done: false }, invoice: { done: false }, contract: { done: false } };
            ['invoice', 'quote', 'contract', 'w9', 'coi'].forEach(key => {
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
        return { ...prevAll, [proj.id]: updated };
      });
      
      setProjVendorScanDone(prev => ({ ...prev, [proj.id]: true }));
      
      // Sync discovered vendors to Global Partners (contacts) if not already there
      setContacts(prev => {
        let updated = [...prev];
        for (const [vendorName] of Object.entries(projectDriveVendors)) {
          const exists = updated.some(c => c.name?.toLowerCase() === vendorName.toLowerCase());
          if (!exists) {
            updated.push({
              id: `ct_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
              name: vendorName,
              firstName: vendorName.split(" ")[0] || "",
              lastName: vendorName.split(" ").slice(1).join(" ") || "",
              phone: "", email: "", company: vendorName,
              position: "Vendor", department: "",
              address: "", notes: `Auto-added from project Drive scan`,
              source: "drive",
            });
            console.log("Added vendor to Global Partners:", vendorName);
          }
        }
        return updated;
      });
    } catch (e) {
      console.error("Project vendor scan error:", e);
    }
  };

  // Auto-scan project vendors when Vendors tab is opened
  useEffect(() => {
    if (activeTab !== "vendors" || !project?.driveFolderId) return;
    syncProjectVendors(project);
  }, [activeTab, project?.id, project?.driveFolderId]);

  // On data load, scan ALL projects with Drive folders — staggered to avoid API overload
  useEffect(() => {
    if (!dataLoaded) return;
    let cancelled = false;
    const driveProjects = projects.filter(p => p.driveFolderId && !projVendorScanDone[p.id]);
    if (driveProjects.length === 0) return;
    (async () => {
      for (let i = 0; i < driveProjects.length; i++) {
        if (cancelled) break;
        syncProjectVendors(driveProjects[i]);
        // Stagger: 500ms between each scan to avoid hammering
        if (i < driveProjects.length - 1) await new Promise(r => setTimeout(r, 500));
      }
    })();
    return () => { cancelled = true; };
  }, [dataLoaded]);

  // ─── HOT UPDATE PROTECTION ──────────────────────────────────────
  // Checks Supabase for version mismatch every 30s. When an admin deploys,
  // they bump the version in Settings → all clients see a banner.
  useEffect(() => {
    if (!supabase || !dataLoaded) return;
    let cancelled = false;
    const checkVersion = async () => {
      try {
        const { data } = await supabase.from("command_data").select("data").eq("slice_type", "appMeta").maybeSingle();
        if (cancelled) return;
        if (data?.data) {
          const remote = data.data;
          if (remote.version && remote.version !== APP_VERSION) {
            setUpdateAvailable({
              version: remote.version,
              message: remote.message || "A new version is available.",
              force: remote.force || false,
              deployedAt: remote.deployedAt
            });
          } else {
            setUpdateAvailable(null);
            setUpdateDismissed(false);
          }
        }
      } catch (e) { console.warn("Version check failed:", e); }
    };
    checkVersion();
    const interval = setInterval(checkVersion, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [supabase, dataLoaded]);

  // Admin: push version to Supabase
  const pushAppVersion = async (message, force) => {
    if (!supabase) return;
    const payload = { version: APP_VERSION, message: message || "", force: !!force, deployedAt: new Date().toISOString() };
    const { data: existing } = await supabase.from("command_data").select("id").eq("slice_type", "appMeta").maybeSingle();
    if (existing) {
      await supabase.from("command_data").update({ data: payload, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("command_data").insert({ slice_type: "appMeta", data: payload, updated_at: new Date().toISOString() });
    }
    console.log("App version pushed:", APP_VERSION);
  };

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

  // ─── Drive Access / Permission functions ───
  const loadDrivePermissions = async () => {
    if (!project?.driveFolderId) return;
    try {
      const res = await fetch('/api/drive/project', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list-project-permissions', projectFolderId: project.driveFolderId }) });
      const data = await res.json();
      if (data.success) setDrivePermissions(data.permissions || []);
    } catch (e) { console.error('Load permissions:', e); }
  };
  const shareDriveAccess = async () => {
    if (!driveShareEmail || !project?.driveFolderId) return;
    setDriveShareLoading(true);
    try {
      const res = await fetch('/api/drive/project', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'share-project', projectFolderId: project.driveFolderId, email: driveShareEmail, role: driveShareRole, projectName: project.name }) });
      const data = await res.json();
      if (data.success) { setDriveShareEmail(""); loadDrivePermissions(); }
      else alert('Share failed: ' + (data.error || 'Unknown error'));
    } catch (e) { alert('Share failed: ' + e.message); }
    setDriveShareLoading(false);
  };
  const revokeDriveAccess = async (email) => {
    if (!confirm(`Revoke ${email}'s access to this project's Drive folder?`)) return;
    try {
      await fetch('/api/drive/project', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'revoke-project-access', projectFolderId: project.driveFolderId, email }) });
      loadDrivePermissions();
    } catch (e) { alert('Revoke failed: ' + e.message); }
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
    pushUndoSnapshot();
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
    pushUndoSnapshot();
    setWorkback(prev => [...prev, { id: `wb_${Date.now()}`, task: "", date: "", depts: [], status: "Not Started", owner: "" }]);
    logActivity("workback", "added new row", project?.name);
  };
  const addROSRow = (day) => { const existingDate = ros.find(r => r.day === day)?.dayDate || ""; setROS(prev => [...prev, { id: `r_${Date.now()}`, day, dayDate: existingDate, time: "", item: "", dept: "", vendors: [], location: "", contact: "", owner: "", note: "" }]); };

  // ─── File rename suggestion logic ───
  const suggestFileName = (compKey, vendorName, originalName, projectCode) => {
    const ext = originalName.includes('.') ? '.' + originalName.split('.').pop() : '.pdf';
    const clean = (vendorName || 'Unknown').replace(/[^a-zA-Z0-9 &'()-]/g, '').trim();
    const cleanUnder = clean.replace(/\s+/g, '_');
    const code = projectCode || 'PROJ';
    const baseName = originalName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9 _()-]/g, '').trim();
    switch (compKey) {
      case 'coi': return `${code}_${cleanUnder}_COI_V1_(${baseName})${ext}`;
      case 'w9': return `${code}_${cleanUnder}_W9_V1_(${baseName})${ext}`;
      case 'contract': return `${code}_${cleanUnder}_Contract_V1_(${baseName})${ext}`;
      case 'invoice': return `${code}_${cleanUnder}_Invoice_V1_(${baseName})${ext}`;
      case 'quote': return `${code}_${cleanUnder}_Quote_V1_(${baseName})${ext}`;
      default: return originalName;
    }
  };

  // Step 1: Show rename modal before uploading
  const handleFileDrop = (vendorId, compKey, file, drivePath, basePath) => {
    if (typeof file === 'string') { executeFileDrop(vendorId, compKey, file, drivePath, basePath); return; }
    const allVendorsList = Object.values(projectVendors).flat();
    const vendor = allVendorsList.find(v => v.id === vendorId);
    const vName = vendor?.name || 'Unknown';
    const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
    // Auto-detect next version for invoice/quote
    const existingComp = vendor?.compliance?.[compKey];
    const existingFiles = Array.isArray(existingComp?.files) ? existingComp.files : [];
    const nextVersion = (compKey === 'invoice' || compKey === 'quote') ? (existingComp?.done ? existingFiles.length + 1 : 1) : 1;
    const suggested = suggestFileName(compKey, vName, file.name, project?.code || '').replace(/_V1/, `_V${nextVersion}`);
    setRenameModal({ file, vendorId, compKey, drivePath, basePath, vendorName: vName, suggestedName: suggested, originalName: file.name, ext, version: String(nextVersion) });
  };

  // Step 2: Execute upload with (optionally renamed) file
  const executeFileDrop = async (vendorId, compKey, file, drivePath, basePath) => {
    const allVendorsList = Object.values(projectVendors).flat();
    const vendor = allVendorsList.find(v => v.id === vendorId);
    const fileName = typeof file === 'string' ? file : file.name;
    const isVersioned = compKey === 'invoice' || compKey === 'quote';
    const today = new Date().toISOString().split("T")[0];
    
    // For versioned docs, preserve existing files array
    const getUpdatedComp = (prev, link) => {
      const existing = prev || {};
      if (isVersioned) {
        const prevFiles = Array.isArray(existing.files) ? existing.files : [];
        // If there was a previous "current" file, push it to files array
        const allFiles = existing.done && existing.file ? [...prevFiles.filter(f => f.file !== existing.file), { file: existing.file, link: existing.link, date: existing.date, version: prevFiles.length + 1 }] : [...prevFiles];
        const newVersion = allFiles.length + 1;
        return { done: true, file: fileName, date: today, link: link || null, uploading: false, files: [...allFiles, { file: fileName, link: link || null, date: today, version: newVersion }] };
      }
      return { done: true, file: fileName, date: today, link: link || null, uploading: false };
    };
    
    // Immediately update UI optimistically (show uploading state)
    setVendors(prev => prev.map(v => v.id !== vendorId ? v : { ...v, compliance: { ...v.compliance, [compKey]: { ...getUpdatedComp(v.compliance[compKey], null), uploading: true } } }));
    logActivity("vendor", `uploading ${compKey} for "${vendor?.name}"`, project?.name);
    
    // Upload to Google Drive via API
    if (typeof file !== 'string') {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('vendorName', vendor?.name || 'Unknown');
        formData.append('docType', compKey);
        // Project-scoped upload: route to project's ADMIN/VENDORS/VendorName/[subfolder]
        const ckObj = COMP_KEYS.find(c => c.key === compKey);
        if (project?.driveFolderId && ckObj?.vendorSubfolder) {
          formData.append('projectFolderId', project.driveFolderId);
          formData.append('vendorSubfolder', ckObj.vendorSubfolder);
          formData.append('globalMirror', ckObj.globalMirror ? 'true' : 'false');
          if (ckObj.globalMirror && ckObj.drivePrefix) formData.append('globalBasePath', ckObj.drivePrefix);
        } else {
          formData.append('basePath', basePath || drivePath.replace(/\/[^/]+\/$/, ''));
        }
        
        const res = await fetch('/api/drive/upload', { method: 'POST', body: formData });
        const data = await res.json();
        
        if (data.success) {
          // SUCCESS — update with Drive link, preserve version history
          setVendors(prev => prev.map(v => {
            if (v.id !== vendorId) return v;
            const comp = { ...v.compliance };
            const existing = comp[compKey] || {};
            if (compKey === 'invoice' || compKey === 'quote') {
              // Update the files array — replace the last entry's link
              const files = Array.isArray(existing.files) ? [...existing.files] : [];
              if (files.length > 0) files[files.length - 1] = { ...files[files.length - 1], link: data.file?.link };
              comp[compKey] = { ...existing, done: true, file: fileName, date: new Date().toISOString().split("T")[0], link: data.file?.link, uploading: false, files };
            } else {
              comp[compKey] = { done: true, file: fileName, date: new Date().toISOString().split("T")[0], link: data.file?.link, uploading: false };
            }
            return { ...v, compliance: comp };
          }));
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
    ...vendors.map(v => v.name).filter(Boolean),
  ])].sort();
  const pctSpent = project.budget > 0 ? (project.spent / project.budget) * 100 : 0;
  const compTotal = vendors.length * 5;
  const compDone = vendors.reduce((s, v) => s + COMP_KEYS.filter(ck => v.compliance?.[ck.key]?.done).length, 0);
  const days = [...new Set(ros.map(r => r.day))].sort((a, b) => a - b);
  const filteredProjects = (() => {
    const today = new Date().toISOString().slice(0, 10);
    const thisMonthStart = today.slice(0, 7) + "-01";
    const thisMonthEnd = new Date(new Date(thisMonthStart).setMonth(new Date(thisMonthStart).getMonth() + 1) - 1).toISOString().slice(0, 10);
    const q = Math.floor(new Date().getMonth() / 3);
    const thisQStart = `${new Date().getFullYear()}-${String(q * 3 + 1).padStart(2, "0")}-01`;
    const thisQEnd = new Date(new Date(thisQStart).setMonth(new Date(thisQStart).getMonth() + 3) - 1).toISOString().slice(0, 10);
    const visible = projects.filter(p => {
      if (!canSeeProject(p.id)) return false;
      if (!showArchived && p.archived) return false;
      if (sidebarStatusFilter && p.status !== sidebarStatusFilter) return false;
      if (sidebarDateFilter) {
        const ed = p.eventDates?.start || "";
        if (!ed && sidebarDateFilter !== "no-date") return false;
        if (sidebarDateFilter === "upcoming" && ed < today) return false;
        if (sidebarDateFilter === "past" && ed >= today) return false;
        if (sidebarDateFilter === "this-month" && (ed < thisMonthStart || ed > thisMonthEnd)) return false;
        if (sidebarDateFilter === "this-quarter" && (ed < thisQStart || ed > thisQEnd)) return false;
        if (sidebarDateFilter === "no-date" && ed) return false;
      }
      return p.name.toLowerCase().includes(search.toLowerCase()) || (p.client || "").toLowerCase().includes(search.toLowerCase());
    });
    // Separate parents and children
    const parents = visible.filter(p => !p.parentId);
    const children = visible.filter(p => p.parentId);
    // Sort parents chronologically by event date (earliest first, no-date at end)
    parents.sort((a, b) => {
      const da = a.eventDates?.start || a.engagementDates?.start || "9999";
      const db = b.eventDates?.start || b.engagementDates?.start || "9999";
      return da.localeCompare(db);
    });
    // Build ordered list: parent, then its children (also sorted chronologically)
    const ordered = [];
    parents.forEach(parent => {
      ordered.push(parent);
      if (!collapsedParents.has(parent.id)) {
        const subs = children.filter(c => c.parentId === parent.id);
        subs.sort((a, b) => (a.eventDates?.start || "9999").localeCompare(b.eventDates?.start || "9999"));
        subs.forEach(c => ordered.push(c));
      }
    });
    // Add orphan children (parent not visible / deleted)
    children.filter(c => !parents.some(p => p.id === c.parentId)).forEach(c => ordered.push(c));
    return ordered;
  })();
  const archivedCount = projects.filter(p => p.archived).length;

  const allTabs = [
    { id: "overview", label: "Overview", icon: "◉" },
    { id: "budget", label: "Budget", icon: "$" },
    { id: "todoist", label: "Todoist", icon: "✅" },
    { id: "workback", label: "Work Back", icon: "◄" },
    { id: "progress", label: "Progress Report", icon: "☰" },
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

  // ─── PRESENCE via SUPABASE REALTIME (zero serverless calls) ─────
  useEffect(() => {
    if (!dataLoaded || !user?.email || !isUserAuthorized || !supabase) return;
    const myProfile = (appSettings.userProfiles || {})[user.email] || {};
    const presencePayload = {
      email: user.email,
      firstName: myProfile.firstName || user.name?.split(" ")[0] || "",
      lastName: myProfile.lastName || user.name?.split(" ").slice(1).join(" ") || "",
      avatar: myProfile.avatar || "",
      title: myProfile.title || "",
      onlineAt: new Date().toISOString(),
    };
    const channel = supabase.channel('cc-presence', { config: { presence: { key: user.email } } });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const others = [];
        Object.entries(state).forEach(([email, presences]) => {
          if (email === user.email) return;
          const p = presences[0]; // latest presence for this user
          if (p) others.push({ email, firstName: p.firstName || "", lastName: p.lastName || "", avatar: p.avatar || "", title: p.title || "", onlineAt: p.onlineAt });
        });
        setPresenceUsers(others);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(presencePayload);
        }
      });
    // Re-track when profile changes
    const retrack = async () => {
      const updated = (appSettings.userProfiles || {})[user.email] || {};
      await channel.track({
        email: user.email,
        firstName: updated.firstName || user.name?.split(" ")[0] || "",
        lastName: updated.lastName || user.name?.split(" ").slice(1).join(" ") || "",
        avatar: updated.avatar || "",
        title: updated.title || "",
        onlineAt: new Date().toISOString(),
      });
    };
    const profileJson = JSON.stringify(myProfile);
    const retrackTimer = setTimeout(retrack, 100); // ensure initial track
    return () => { clearTimeout(retrackTimer); supabase.removeChannel(channel); };
  }, [dataLoaded, user, isUserAuthorized, supabase, JSON.stringify((appSettings.userProfiles || {})[user?.email])]);

  // ─── FIRST-LOGIN PROFILE CHECK (waits for settings to load from Supabase) ──
  useEffect(() => {
    if (!dataLoaded || !appSettingsLoaded || !user?.email || !isUserAuthorized) return;
    // Only check once per browser session
    const sessionKey = `cc_profile_checked_${user.email}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
    const profile = (appSettings.userProfiles || {})[user.email];
    if (!profile || !profile.setupAt) {
      const existing = profile || {};
      setProfileSetupForm({
        firstName: existing.firstName || user?.name?.split(" ")[0] || "",
        lastName: existing.lastName || user?.name?.split(" ").slice(1).join(" ") || "",
        title: existing.title || "",
        company: existing.company || "",
        phone: existing.phone || "",
        department: existing.department || "",
        address: existing.address || "",
        avatar: existing.avatar || "",
      });
      setShowProfileSetup(true);
    }
  }, [dataLoaded, appSettingsLoaded, user, isUserAuthorized]);

  // ─── SAVE USER PROFILE ──────────────────────────────────────────
  const saveUserProfile = async (profileData) => {
    const updated = {
      ...appSettings,
      userProfiles: { ...(appSettings.userProfiles || {}), [user.email]: { ...profileData, email: user.email, setupAt: new Date().toISOString() } },
    };
    await saveSettings(updated);
    // Sync avatar to matching Global Partners contact
    if (profileData.avatar) {
      setContacts(prev => prev.map(c => {
        if (c.email && c.email.toLowerCase() === user.email.toLowerCase()) {
          return { ...c, avatar: profileData.avatar };
        }
        return c;
      }));
    }
    setShowProfileSetup(false);
  };

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

      {/* ═══ UPDATE AVAILABLE BANNER ═══ */}
      {updateAvailable && !updateDismissed && (
        <div style={{ padding: "10px 24px", background: updateAvailable.force ? "#e85454" : "#dba94e", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0, zIndex: 200, animation: "fadeUp 0.3s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>🔄</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Update Available — {updateAvailable.version}</div>
              <div style={{ fontSize: 10, opacity: 0.9 }}>{updateAvailable.message || "A new version has been deployed. Please save your work and refresh."}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={() => { setForceSaveCounter(c => c + 1); setTimeout(() => window.location.reload(), 1500); }} style={{ padding: "6px 16px", background: "#fff", border: "none", borderRadius: 6, color: updateAvailable.force ? "#e85454" : "#dba94e", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              💾 Save & Refresh
            </button>
            {!updateAvailable.force && (
              <button onClick={() => setUpdateDismissed(true)} style={{ padding: "6px 12px", background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                Later
              </button>
            )}
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: "1px solid var(--border)", background: "var(--topBar)", transition: "background 0.3s, border-color 0.3s", flexShrink: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {appSettings.branding?.logoDark || appSettings.branding?.logoLight ? (
            <img src={darkMode ? (appSettings.branding.logoDark || appSettings.branding.logoLight) : (appSettings.branding.logoLight || appSettings.branding.logoDark)} alt="Logo" style={{ height: 26, objectFit: "contain" }} />
          ) : (
            <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Instrument Sans'", background: "linear-gradient(135deg, #ff6b4a, #ff4a6b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Adaptive by Design</span>
          )}
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
          {isAdmin && (
            <button onClick={() => setActiveTab("finance")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, color: activeTab === "finance" ? "#4ecb71" : "var(--textFaint)", padding: "4px 10px", borderRadius: 5, transition: "all 0.15s", letterSpacing: 0.3 }}>
              💰 Finance
            </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* ── LIVE PRESENCE BUBBLES ── */}
          {presenceUsers.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              {presenceUsers.slice(0, 5).map((u, i) => {
                const initials = ((u.firstName || "")[0] || "") + ((u.lastName || "")[0] || u.email[0] || "");
                const colors = ["#ff6b4a", "#3da5db", "#9b6dff", "#4ecb71", "#dba94e"];
                const color = colors[i % colors.length];
                return (
                  <div key={u.email} style={{ position: "relative", marginLeft: i > 0 ? -6 : 0, zIndex: 5 - i }} title={`${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email}>
                    {u.avatar ? (
                      <img src={u.avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--bgCard)" }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${color}25`, border: "2px solid var(--bgCard)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color }}>{initials.toUpperCase()}</div>
                    )}
                    <div style={{ position: "absolute", bottom: -1, right: -1, width: 8, height: 8, borderRadius: "50%", background: "#4ecb71", border: "1.5px solid var(--bgCard)" }} />
                  </div>
                );
              })}
              {presenceUsers.length > 5 && (
                <div style={{ marginLeft: -6, width: 28, height: 28, borderRadius: "50%", background: "var(--bgHover)", border: "2px solid var(--bgCard)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "var(--textFaint)", zIndex: 0 }}>+{presenceUsers.length - 5}</div>
              )}
              <span style={{ marginLeft: 6, fontSize: 9, color: "var(--textFaint)", fontWeight: 600 }}>{presenceUsers.length} online</span>
            </div>
          )}
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
          <div style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }} title={`Click to force save\nLast synced: ${lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : "never"}`} onClick={() => { const slices = { projects, contacts, clients, projectVendors, projectWorkback, projectProgress, projectComments, projectROS, rosDayDates, activityLog }; Object.entries(slices).forEach(([key, data]) => saveSlice(key, data)); }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: saveStatus === "saving" ? "#f5a623" : saveStatus === "error" ? "#ff4444" : "#4ecb71", animation: saveStatus === "saving" ? "pulse 0.8s ease infinite" : "glow 2s infinite", transition: "background 0.3s" }} /><span style={{ fontSize: 10, color: saveStatus === "saving" ? "#f5a623" : saveStatus === "error" ? "#ff4444" : "var(--textFaint)", fontFamily: "'JetBrains Mono', monospace", fontWeight: saveStatus === "saving" ? 700 : 400 }}>{saveStatus === "saving" ? "SAVING…" : saveStatus === "error" ? "⚠ SAVE ERROR — CLICK TO RETRY" : "✓ LIVE"}</span></div>
          <span style={{ fontSize: 12, color: "var(--textFaint)", fontFamily: "'JetBrains Mono', monospace" }}>{time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
          {user && (() => {
            const myP = (appSettings.userProfiles || {})[user.email] || {};
            const ini = ((myP.firstName || user.name?.split(" ")[0] || "")[0] || "") + ((myP.lastName || user.name?.split(" ").slice(1).join(" ") || "")[0] || user.email[0] || "");
            return (
              <div onClick={() => { setSettingsTab("profile"); setShowSettings(true); }} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "2px 8px 2px 2px", borderRadius: 20, border: "1px solid transparent", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.borderColor = "var(--borderSub)"} onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"} title="Edit profile">
                {myP.avatar ? (
                  <img src={myP.avatar} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#ff6b4a20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#ff6b4a" }}>{ini.toUpperCase()}</div>
                )}
                <span style={{ fontSize: 9, color: "var(--textGhost)", fontFamily: "'JetBrains Mono', monospace" }}>{myP.firstName ? `${myP.firstName} ${myP.lastName || ""}`.trim() : user.email}</span>
              </div>
            );
          })()}
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
            <select value={sidebarStatusFilter} onChange={e => setSidebarStatusFilter(e.target.value)} style={{ width: "100%", padding: "6px 10px", background: sidebarStatusFilter ? "#ff6b4a10" : "var(--bgCard)", border: `1px solid ${sidebarStatusFilter ? "#ff6b4a30" : "var(--borderSub)"}`, borderRadius: 7, color: sidebarStatusFilter ? "#ff6b4a" : "var(--textFaint)", fontSize: 10, fontWeight: 600, outline: "none", marginBottom: 4, cursor: "pointer" }}>
              <option value="">All Statuses</option>
              {[...new Set(projects.map(p => p.status).filter(Boolean))].sort().map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              <select value={sidebarDateFilter} onChange={e => setSidebarDateFilter(e.target.value)} style={{ flex: 1, padding: "6px 10px", background: sidebarDateFilter ? "#3da5db10" : "var(--bgCard)", border: `1px solid ${sidebarDateFilter ? "#3da5db30" : "var(--borderSub)"}`, borderRadius: 7, color: sidebarDateFilter ? "#3da5db" : "var(--textFaint)", fontSize: 10, fontWeight: 600, outline: "none", cursor: "pointer" }}>
                <option value="">All Dates</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
                <option value="this-month">This Month</option>
                <option value="this-quarter">This Quarter</option>
                <option value="no-date">No Date</option>
              </select>
              <button onClick={() => { const parentIds = projects.filter(p => !p.parentId && projects.some(sp => sp.parentId === p.id)).map(p => p.id); if (collapsedParents.size >= parentIds.length) { setCollapsedParents(new Set()); } else { setCollapsedParents(new Set(parentIds)); } }} style={{ padding: "6px 8px", background: collapsedParents.size > 0 ? "#9b6dff10" : "var(--bgCard)", border: `1px solid ${collapsedParents.size > 0 ? "#9b6dff30" : "var(--borderSub)"}`, borderRadius: 7, color: collapsedParents.size > 0 ? "#9b6dff" : "var(--textFaint)", cursor: "pointer", fontSize: 9, fontWeight: 600, whiteSpace: "nowrap" }} title={collapsedParents.size > 0 ? "Expand all sub-projects" : "Collapse all sub-projects"}>
                {collapsedParents.size > 0 ? "▸ Subs" : "▾ Subs"}
              </button>
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
              const isSubProject = !!p.parentId;
              const hasSubProjects = projects.some(sp => sp.parentId === p.id && !sp.archived);
              return (
                <div key={p.id} style={{ position: "relative", overflow: "hidden", marginBottom: 2, borderRadius: 8, marginLeft: isSubProject ? 14 : 0 }}>
                  {/* Sub-project connector line */}
                  {isSubProject && <div style={{ position: "absolute", left: -8, top: 0, bottom: "50%", width: 8, borderLeft: "1px solid var(--borderSub)", borderBottom: "1px solid var(--borderSub)", borderRadius: "0 0 0 4px" }} />}
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
                      if (activeTab === "calendar" || activeTab === "globalContacts" || activeTab === "clients" || activeTab === "finance" ) setActiveTab("overview");
                    }}
                    style={{ padding: 12, borderRadius: 8, cursor: "pointer", background: p.archived ? "var(--bgCard)" : active ? "var(--bgHover)" : "transparent", border: active ? "1px solid var(--borderActive)" : "1px solid transparent", transition: swipe.offsetX === 0 ? "transform 0.25s ease" : "none", transform: `translateX(${swipe.offsetX}px)`, opacity: p.archived ? 0.55 : 1, position: "relative", zIndex: 1, userSelect: "none" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--textFaint)", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 4 }}>{isSubProject && <span style={{ fontSize: 7, padding: "1px 4px", borderRadius: 3, background: "#dba94e15", color: "#dba94e", border: "1px solid #dba94e25", fontWeight: 700 }}>SUB</span>}{p.client}{p.projectType && <span style={{ fontSize: 7, padding: "1px 4px", borderRadius: 3, background: ptc + "15", color: ptc, border: `1px solid ${ptc}25`, fontWeight: 700, letterSpacing: 0.5 }}>{p.projectType.toUpperCase()}</span>}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {p.archived && <span style={{ fontSize: 7, padding: "1px 4px", borderRadius: 3, background: "#9b6dff15", color: "#9b6dff", fontWeight: 700, letterSpacing: 0.5 }}>ARCHIVED</span>}
                        <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 3, background: sc.bg, color: sc.text }}><span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: sc.dot, marginRight: 4 }} />{p.status}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: active ? "var(--text)" : "var(--textSub)", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
                      {hasSubProjects && <span onClick={(e) => { e.stopPropagation(); setCollapsedParents(prev => { const next = new Set(prev); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); return next; }); }} style={{ fontSize: 14, color: collapsedParents.has(p.id) ? "var(--textFaint)" : "#ff6b4a", cursor: "pointer", padding: "2px 4px", borderRadius: 4, flexShrink: 0, background: collapsedParents.has(p.id) ? "transparent" : "#ff6b4a08", transition: "all 0.15s" }} title={collapsedParents.has(p.id) ? "Expand sub-projects" : "Collapse sub-projects"}>{collapsedParents.has(p.id) ? "▸" : "▾"}</span>}
                      <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
                        {isSubProject && (() => { const parent = projects.find(pp => pp.id === p.parentId); return parent ? <div style={{ fontSize: 8, color: "var(--textGhost)", fontWeight: 600, letterSpacing: 0.3, marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{parent.name} ›</div> : null; })()}
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 8, color: p.code ? "var(--textGhost)" : "var(--textFaint)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.3, marginBottom: 3, opacity: p.code ? 1 : 0.5 }}>{p.code || generateProjectCode(p)}</div>
                    {((p.engagementDates && p.engagementDates.start) || (p.eventDates && p.eventDates.start)) && <div style={{ fontSize: 9, color: "var(--textGhost)", marginBottom: 4 }}>
                      {!p.parentId && p.engagementDates && p.engagementDates.start && <div>📋 {fmtShort(p.engagementDates.start)}{p.engagementDates.end ? ` – ${fmtShort(p.engagementDates.end)}` : ""}</div>}
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
            {activeTab !== "calendar" && activeTab !== "globalContacts" && activeTab !== "clients" && activeTab !== "finance" && (
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
            {activeTab !== "calendar" && activeTab !== "globalContacts" && activeTab !== "clients" && activeTab !== "finance" && (
            <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "9px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: activeTab === t.id ? "var(--text)" : "var(--textFaint)", borderBottom: activeTab === t.id ? "2px solid #ff6b4a" : "2px solid transparent", fontFamily: "'DM Sans'", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10 }}>{t.icon}</span>{t.label}
                  {t.id === "vendors" && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 10, background: compDone < compTotal ? "var(--borderSub)" : "var(--bgCard)", color: compDone < compTotal ? "#e85454" : "#4ecb71", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{compDone}/{compTotal}</span>}
                  {t.id === "progress" && (() => { const pr = (projectProgress[activeProjectId]?.rows || []); const prDone = pr.filter(r => r.status === "Done").length; return pr.length > 0 ? <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 10, background: "var(--bgCard)", color: prDone === pr.length ? "#4ecb71" : "var(--textMuted)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{prDone}/{pr.length}</span> : null; })()}
                  {t.id === "contacts" && (() => { const ct = project.producers.length + project.managers.length + (project.staff?.length || 0) + (project.clientContacts || []).filter(p => p.name).length + (project.pocs || []).filter(p => p.name).length + (project.billingContacts || []).filter(p => p.name).length + vendors.filter(v => v.name).length; return ct > 0 ? <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 10, background: "var(--bgCard)", color: "var(--textMuted)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{ct}</span> : null; })()}
                </button>
              ))}
            </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 40px", ...(appSettings.branding?.dashboardBg ? { backgroundImage: `url(${appSettings.branding.dashboardBg})`, backgroundSize: `${appSettings.branding?.bgZoom || 100}%`, backgroundPosition: appSettings.branding?.bgPosition || "center center", backgroundRepeat: "no-repeat", backgroundAttachment: "local" } : {}) }}>

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
                {glanceTab === "macro" && (() => {
                  // Build filtered + grouped project list
                  const allStatuses = [...new Set(projects.map(p => p.status).filter(Boolean))].sort();
                  const allTypes = [...new Set(projects.map(p => p.projectType).filter(Boolean))].sort();
                  const filtered = projects.filter(p => {
                    if (p.status === "Archived") return false;
                    if (macroFilterStatus !== "all" && p.status !== macroFilterStatus) return false;
                    if (macroFilterType !== "all" && p.projectType !== macroFilterType) return false;
                    if (macroFilterDateFrom) {
                      const d = p.eventDates?.start || p.engagementDates?.start;
                      if (!d || d < macroFilterDateFrom) return false;
                    }
                    if (macroFilterDateTo) {
                      const d = p.eventDates?.start || p.engagementDates?.start;
                      if (!d || d > macroFilterDateTo) return false;
                    }
                    return true;
                  });
                  // Group: parents first sorted by date, subs under their parent
                  const parents = filtered.filter(p => !p.parentId).sort((a, b) => {
                    const da = a.eventDates?.start || a.engagementDates?.start || "9999";
                    const db = b.eventDates?.start || b.engagementDates?.start || "9999";
                    return da.localeCompare(db);
                  });
                  const subs = filtered.filter(p => p.parentId);
                  const macroRows = [];
                  parents.forEach(p => {
                    const childSubs = subs.filter(s => s.parentId === p.id).sort((a, b) => (a.eventDates?.start || "9999").localeCompare(b.eventDates?.start || "9999"));
                    macroRows.push({ ...p, _isMacroParent: childSubs.length > 0, _macroSubCount: childSubs.length });
                    childSubs.forEach(s => macroRows.push({ ...s, _isMacroSub: true }));
                  });
                  // Orphan subs whose parent was filtered out
                  subs.filter(s => !parents.some(p => p.id === s.parentId)).forEach(s => macroRows.push({ ...s, _isMacroSub: true }));
                  const anyFilters = macroFilterStatus !== "all" || macroFilterType !== "all" || macroFilterDateFrom || macroFilterDateTo;

                  return (
                  <div style={{ maxHeight: "calc(100vh - 320px)", overflowY: "auto", overflowX: "hidden" }}>
                    {/* Filters bar */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                      <select value={macroFilterStatus} onChange={e => setMacroFilterStatus(e.target.value)} style={{ padding: "6px 10px", background: macroFilterStatus !== "all" ? "#ff6b4a10" : "var(--bgInput)", border: `1px solid ${macroFilterStatus !== "all" ? "#ff6b4a30" : "var(--borderSub)"}`, borderRadius: 6, color: macroFilterStatus !== "all" ? "#ff6b4a" : "var(--textSub)", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                        <option value="all">All Statuses</option>
                        {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select value={macroFilterType} onChange={e => setMacroFilterType(e.target.value)} style={{ padding: "6px 10px", background: macroFilterType !== "all" ? "#3da5db10" : "var(--bgInput)", border: `1px solid ${macroFilterType !== "all" ? "#3da5db30" : "var(--borderSub)"}`, borderRadius: 6, color: macroFilterType !== "all" ? "#3da5db" : "var(--textSub)", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                        <option value="all">All Types</option>
                        {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600 }}>FROM</span>
                        <input type="date" value={macroFilterDateFrom} onChange={e => setMacroFilterDateFrom(e.target.value)} style={{ padding: "5px 8px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--textSub)", fontSize: 10, colorScheme: "var(--filterScheme)" }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600 }}>TO</span>
                        <input type="date" value={macroFilterDateTo} onChange={e => setMacroFilterDateTo(e.target.value)} style={{ padding: "5px 8px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--textSub)", fontSize: 10, colorScheme: "var(--filterScheme)" }} />
                      </div>
                      {anyFilters && <button onClick={() => { setMacroFilterStatus("all"); setMacroFilterType("all"); setMacroFilterDateFrom(""); setMacroFilterDateTo(""); }} style={{ padding: "5px 10px", background: "#e8545410", border: "1px solid #e8545430", borderRadius: 6, color: "#e85454", cursor: "pointer", fontSize: 9, fontWeight: 600 }}>✕ Clear</button>}
                      <span style={{ fontSize: 10, color: "var(--textFaint)", fontFamily: "'JetBrains Mono', monospace" }}>{macroRows.length} projects</span>
                    </div>
                    {/* Macro table */}
                    <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--borderSub)", background: "var(--bgInput)" }}>
                      <table style={{ width: "100%", minWidth: 1600, borderCollapse: "separate", borderSpacing: 0, fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid var(--borderSub)", background: "var(--bgSub)" }}>
                            {["Project", "Status", "Date(s)", "Client", "Project Type", "Location", "Producer(s)", "Manager(s)", "Services Needed", "Brief", "Project Code"].map(h => (
                              <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "var(--textFaint)", letterSpacing: 0.8, whiteSpace: "nowrap", background: "var(--bgSub)", borderBottom: "2px solid var(--borderSub)" }}>{h.toUpperCase()}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {macroRows.map(p => {
                            const sc = STATUS_COLORS[p.status] || { bg: "var(--bgCard)", text: "var(--textMuted)", dot: "var(--textFaint)" };
                            const ptc = PT_COLORS[p.projectType] || "var(--textMuted)";
                            const dateStr = (() => {
                              const s = p.eventDates?.start; const e = p.eventDates?.end;
                              if (!s) return "–";
                              const fmt2 = d => { const dt = new Date(d + "T12:00:00"); return `${dt.toLocaleDateString("en-US", { month: "short" })} ${dt.getDate()} '${dt.getFullYear().toString().slice(2)}`; };
                              return e && e !== s ? `${fmt2(s)} - ${fmt2(e)}` : fmt2(s);
                            })();
                            const parentName = p._isMacroSub ? projects.find(pp => pp.id === p.parentId)?.name : null;
                            const isParentWithSubs = p._isMacroParent;
                            const isExpanded = macroExpandedParents.has(p.id);
                            return (
                              <tr key={p.id} onClick={() => { setActiveProjectId(p.id); setActiveTab("overview"); }} style={{ borderBottom: "1px solid var(--calLine)", cursor: "pointer", transition: "background 0.1s", background: p._isMacroSub ? "#9b6dff06" : "transparent" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgHover)"} onMouseLeave={e => e.currentTarget.style.background = p._isMacroSub ? "#9b6dff06" : "transparent"}>
                                <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: p._isMacroSub ? 24 : 0 }}>
                                    {isParentWithSubs && (
                                      <span onClick={(e) => { e.stopPropagation(); setMacroExpandedParents(prev => { const next = new Set(prev); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); return next; }); }} style={{ fontSize: 14, cursor: "pointer", color: isExpanded ? "#ff6b4a" : "var(--textFaint)", transition: "transform 0.15s", display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "rotate(0)", width: 18, textAlign: "center" }}>▶</span>
                                    )}
                                    {p._isMacroSub && <span style={{ color: "#9b6dff", fontSize: 10 }}>↳</span>}
                                    <span>
                                      {parentName && <span style={{ color: "var(--textFaint)", fontWeight: 400, fontSize: 10 }}>{parentName} › </span>}
                                      {p.name}
                                    </span>
                                    {isParentWithSubs && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: "#dba94e15", color: "#dba94e", fontWeight: 700 }}>{p._macroSubCount} subs</span>}
                                    {p._isMacroSub && <span style={{ fontSize: 7, padding: "1px 4px", borderRadius: 3, background: "#9b6dff10", color: "#9b6dff", fontWeight: 700 }}>SUB</span>}
                                  </div>
                                </td>
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
                                <td onClick={(e) => { e.stopPropagation(); const newCode = prompt("Edit project code:", p.code || ""); if (newCode !== null) updateProject2(p.id, "code", newCode.toUpperCase()); }} style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--textGhost)", whiteSpace: "nowrap", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer" }} title="Click to edit">{p.code || "–"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  );
                })()}

                {/* ── Master Work Back ── */}
                {glanceTab === "masterWB" && (() => {
                  const allWB = Object.entries(projectWorkback).flatMap(([pid, items]) => (Array.isArray(items) ? items : []).filter(w => w.task && w.task.trim() !== "" && w.task !== "–").map(w => ({ ...w, _pid: pid, _pName: projects.find(p => p.id === pid)?.name || "Unknown" })));
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
                                    <React.Fragment key={section.id}>
                                      <div style={{ padding: "5px 16px", fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.3, borderBottom: "1px solid var(--calLine)", background: "var(--bgInput)" }}>
                                        {section.name} <span style={{ fontWeight: 400, opacity: 0.6 }}>· {sectionTasks.length}</span>
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
                                    </React.Fragment>
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
              <GlobalContactsTab
                contacts={contacts} setContacts={setContacts} vendors={vendors} setVendors={setVendors}
                projects={projects} clients={clients} appSettings={appSettings}
                copyToClipboard={copyToClipboard} updateProject2={updateProject2}
                setActiveProjectId={setActiveProjectId} setActiveTab={setActiveTab}
                setContactForm={setContactForm} setShowAddContact={setShowAddContact}
                setContactSearch={setContactSearch} setAssignContactPopover={setAssignContactPopover}
                assignContactPopover={assignContactPopover} setClipboardToast={setClipboardToast}
                setSelectedContacts={setSelectedContacts} setContactFilterType={setContactFilterType}
                setContactFilterResource={setContactFilterResource}
                contactSearch={contactSearch} contactFilterType={contactFilterType}
                contactFilterResource={contactFilterResource} selectedContacts={selectedContacts}
                partnerSort={partnerSort} setPartnerSort={setPartnerSort}
                partnerColWidths={partnerColWidths} setPartnerColWidths={setPartnerColWidths}
                DeptTag={DeptTag}
              />
            )}

            {/* ═══ CLIENTS ═══ */}
            {activeTab === "clients" && (
              <ClientsTab
                clients={clients} setClients={setClients} projects={projects} contacts={contacts}
                vendors={vendors} appSettings={appSettings} copyToClipboard={copyToClipboard}
                setShowAddClient={setShowAddClient} setClientForm={setClientForm}
                setActiveProjectId={setActiveProjectId} setActiveTab={setActiveTab}
                setContactForm={setContactForm} setShowAddContact={setShowAddContact}
                clientSearch={clientSearch} setClientSearch={setClientSearch}
                clientSort={clientSort} setClientSort={setClientSort}
                clientFilterAttr={clientFilterAttr} setClientFilterAttr={setClientFilterAttr}
                clientColWidths={clientColWidths} setClientColWidths={setClientColWidths}
                expandedClientId={expandedClientId} setExpandedClientId={setExpandedClientId}
                selectedClientIds={selectedClientIds} setSelectedClientIds={setSelectedClientIds}
                ClientSearchInput={ClientSearchInput}
              />
            )}

            {/* ═══ FINANCE (ADMIN-ONLY) ═══ */}
            {activeTab === "finance" && isAdmin && (
              <FinanceTab
                projects={projects} setProjects={setProjects} appSettings={appSettings}
                finFilterMonth={finFilterMonth} setFinFilterMonth={setFinFilterMonth}
                finFilterStatus={finFilterStatus} setFinFilterStatus={setFinFilterStatus}
                finShowSubs={finShowSubs} setFinShowSubs={setFinShowSubs}
                expandedRetainers={expandedRetainers} setExpandedRetainers={setExpandedRetainers}
                setActiveProjectId={setActiveProjectId} setActiveTab={setActiveTab}
                generateProjectCode={generateProjectCode}
              />
            )}

            {/* ═══ TODOIST (GLOBAL) ═══ */}
            {activeTab === "todoist" && !project && (
              <TodoistGlobal
                todoistKey={todoistKey} setTodoistKey={setTodoistKey}
                todoistTasks={todoistTasks} setTodoistTasks={setTodoistTasks}
                todoistProjects={todoistProjects} todoistLoading={todoistLoading}
                todoistNewTask={todoistNewTask} setTodoistNewTask={setTodoistNewTask}
                todoistFilter={todoistFilter} setTodoistFilter={setTodoistFilter}
                todoistEditingTask={todoistEditingTask} setTodoistEditingTask={setTodoistEditingTask}
                todoistComments={todoistComments} todoistNewComment={todoistNewComment} setTodoistNewComment={setTodoistNewComment}
                todoistCollaborators={todoistCollaborators} todoistSections={todoistSections}
                todoistFetch={todoistFetch} todoistAdd={todoistAdd} todoistClose={todoistClose}
                todoistDelete={todoistDelete} todoistUpdateTask={todoistUpdateTask} todoistAddComment={todoistAddComment}
              />
            )}



            {/* ═══ OVERVIEW ═══ */}
            {activeTab === "overview" && (
              <OverviewTab
                project={project} projects={projects} clients={clients} contacts={contacts} appSettings={appSettings}
                notesCollapsed={notesCollapsed} setNotesCollapsed={setNotesCollapsed} pctSpent={pctSpent} peopleOptions={peopleOptions}
                updateProject={updateProject} setActiveProjectId={setActiveProjectId} setActiveTab={setActiveTab}
                setProjects={setProjects} setContacts={setContacts}
                viewContact={viewContact} copyToClipboard={copyToClipboard} updateGlobalContact={updateGlobalContact}
                fmt={fmt} Dropdown={Dropdown} DatePicker={DatePicker} TagInput={TagInput} EditableText={EditableText}
                MultiDropdown={MultiDropdown} EditableBudget={EditableBudget} ProgressBar={ProgressBar}
                ContactListBlock={ContactListBlock} AddressAutocomplete={AddressAutocomplete} RichTextEditor={RichTextEditor}
                STATUSES={STATUSES} STATUS_COLORS={STATUS_COLORS} SERVICE_OPTIONS={SERVICE_OPTIONS}
                SUB_EVENT_STATUSES={SUB_EVENT_STATUSES} SUB_EVENT_STATUS_COLORS={SUB_EVENT_STATUS_COLORS}
              />
            )}

            {/* ═══ BUDGET (full Saturation embed) ═══ */}
            {activeTab === "budget" && (() => {
              const satUrl = project.saturationUrl;
              const embedUrl = satUrl ? (satUrl.includes("/budget") ? satUrl : satUrl.replace(/\/$/, "") + "/budget") : null;
              return (
                <div style={{ animation: "fadeUp 0.3s ease" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Saturation Budget</span>
                      {embedUrl && <a href={embedUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#ff6b4a", textDecoration: "none", fontWeight: 600 }}>Open in Saturation ↗</a>}
                    </div>
                    <button onClick={() => {
                      const url = prompt("Saturation project URL:", satUrl || `https://app.saturation.io/weareadptv/${(project.code || "").toLowerCase().replace(/\s+/g, "-")}/budget`);
                      if (url !== null) updateProject("saturationUrl", url.trim());
                    }} style={{ padding: "5px 12px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--textMuted)", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>
                      {satUrl ? "✏ Edit URL" : "🔗 Link Saturation"}
                    </button>
                  </div>
                  {embedUrl ? (
                    <div>
                      <a href={embedUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 32px", background: "linear-gradient(135deg, #1a1128 0%, #0d0d0d 100%)", border: "1px solid #3a2a5c40", borderRadius: 12, textDecoration: "none", cursor: "pointer", transition: "all 0.2s", marginBottom: 16 }} onMouseEnter={e => { e.currentTarget.style.borderColor = "#7c5cfc60"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(124,92,252,0.15)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#3a2a5c40"; e.currentTarget.style.boxShadow = "none"; }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <div style={{ width: 52, height: 52, borderRadius: 12, background: "linear-gradient(135deg, #7c5cfc 0%, #a855f7 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>📊</div>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e0f0", marginBottom: 4 }}>Open Budget in Saturation</div>
                            <div style={{ fontSize: 12, color: "#9b8ab8" }}>View and edit the full budget, actuals, cost tracking, and transactions</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <img src="https://app.saturation.io/favicon.ico" style={{ width: 18, height: 18, borderRadius: 3, opacity: 0.7 }} onError={e => e.target.style.display = "none"} />
                          <span style={{ fontSize: 13, color: "#7c5cfc", fontWeight: 700 }}>Open →</span>
                        </div>
                      </a>
                      <div style={{ padding: "16px 20px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, fontSize: 11, color: "var(--textFaint)", lineHeight: 1.6 }}>
                        <strong style={{ color: "var(--textMuted)" }}>Why a link instead of an embed?</strong> Saturation uses secure authentication that prevents embedding in other apps (third-party cookie restrictions). Clicking the button above opens your full Saturation workspace with all features available.
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: 60 }}>
                      <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Link Saturation to view the budget</div>
                      <div style={{ fontSize: 13, color: "var(--textFaint)", marginBottom: 20 }}>Paste the Saturation URL for this project to embed the live budget.</div>
                      <button onClick={() => {
                        const url = prompt("Paste the Saturation project URL:", `https://app.saturation.io/weareadptv/${(project.code || "").toLowerCase().replace(/\s+/g, "-")}/budget`);
                        if (url && url.trim()) updateProject("saturationUrl", url.trim());
                      }} style={{ display: "inline-flex", padding: "10px 20px", background: "#ff6b4a", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>🔗 Link Saturation Project</button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ═══ TODOIST (PER-PROJECT) ═══ */}
            {activeTab === "todoist" && project && (
              <TodoistProject
                project={project} updateProject={updateProject} generateProjectCode={generateProjectCode}
                setClipboardToast={setClipboardToast} adptvWorkspaceId={adptvWorkspaceId}
                todoistKey={todoistKey} todoistTasks={todoistTasks} setTodoistTasks={setTodoistTasks}
                todoistProjects={todoistProjects} setTodoistProjects={setTodoistProjects}
                todoistLoading={todoistLoading} todoistSections={todoistSections}
                todoistCollaborators={todoistCollaborators}
                todoistEditingTask={todoistEditingTask} setTodoistEditingTask={setTodoistEditingTask}
                todoistComments={todoistComments} todoistNewComment={todoistNewComment} setTodoistNewComment={setTodoistNewComment}
                todoistNewSection={todoistNewSection} setTodoistNewSection={setTodoistNewSection}
                todoistAddingSection={todoistAddingSection} setTodoistAddingSection={setTodoistAddingSection}
                todoistNewTaskSection={todoistNewTaskSection} setTodoistNewTaskSection={setTodoistNewTaskSection}
                todoistFetch={todoistFetch} todoistClose={todoistClose} todoistDelete={todoistDelete}
                todoistCreateProject={todoistCreateProject} todoistAddTaskToProject={todoistAddTaskToProject}
                todoistFetchProjectDetails={todoistFetchProjectDetails}
                todoistAddComment={todoistAddComment} todoistMoveTask={todoistMoveTask}
                todoistUpdateTask={todoistUpdateTask}
              />
            )}

            {/* ═══ WORK BACK ═══ */}
            {activeTab === "workback" && (() => {
              // Auto-populate 10 empty rows on first visit
              if (workback.length === 0) {
                const emptyWBRows = Array.from({ length: 10 }, (_, i) => ({ id: `wb_init_${i}`, task: "", date: "", depts: [], status: "Not Started", owner: "" }));
                setTimeout(() => setWorkback(emptyWBRows), 0);
              }
              return (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div><div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>PRE-PRODUCTION WORK BACK</div><div style={{ fontSize: 13, color: "var(--textMuted)" }}>Engagement: <span style={{ color: "var(--text)" }}>{fmtShort(project.engagementDates.start)}</span> → Event: <span style={{ color: "#ff6b4a" }}>{fmtShort(project.eventDates.start)}</span> → End: <span style={{ color: "var(--text)" }}>{fmtShort(project.engagementDates.end)}</span></div></div>
                  <button onClick={addWBRow} style={{ padding: "7px 14px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 7, color: "#ff6b4a", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>+ Add Row</button>
                </div>
                <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10 }}>
                  <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 280px)", minHeight: 300 }}>
                  <div style={{ minWidth: 1100 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 200px 180px 160px 36px", padding: "10px 16px", borderBottom: "1px solid var(--borderSub)", fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1 }}><span>DATE</span><span>TASK</span><span>DEPARTMENT(S)</span><span>RESPONSIBLE</span><span>STATUS</span><span></span></div>
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
                    <div key={wb.id} style={{ display: "grid", gridTemplateColumns: "140px 1fr 200px 180px 160px 36px", padding: "8px 16px", borderBottom: "1px solid var(--calLine)", alignItems: "center", background: wbDeadlineStyle.bg, borderLeft: wbDeadlineStyle.borderLeft }}>
                      <div style={{ position: "relative" }}>
                        <DatePicker value={wb.date} onChange={v => updateWB(wb.id, "date", v)} />
                        {overdueLabel && <div style={{ fontSize: 8, fontWeight: 700, color: overdueLabel.color, marginTop: 2 }}>{overdueLabel.text}</div>}
                      </div>
                      <EditableText value={wb.task} onChange={v => updateWB(wb.id, "task", v)} fontSize={12} color={wb.isEvent ? "#ff6b4a" : "var(--text)"} fontWeight={wb.isEvent ? 700 : 500} placeholder="Task name..." />
                      <MultiDropdown values={wb.depts} options={[...new Set([...DEPT_OPTIONS, ...(appSettings.departments || [])])].filter(Boolean).sort()} onChange={v => updateWB(wb.id, "depts", v)} colorMap={DEPT_COLORS} />
                      <Dropdown value={wb.owner} options={eventContactNames} onChange={v => updateWB(wb.id, "owner", v)} width="100%" allowBlank blankLabel="—" />
                      <Dropdown value={wb.status} options={WB_STATUSES} onChange={v => updateWB(wb.id, "status", v)} colors={Object.fromEntries(WB_STATUSES.map(s => [s, { bg: WB_STATUS_STYLES[s].bg, text: WB_STATUS_STYLES[s].text, dot: WB_STATUS_STYLES[s].text }]))} width="100%" />
                      <button onClick={() => { pushUndoSnapshot(); setWorkback(p => p.filter(w => w.id !== wb.id)); }} style={{ background: "none", border: "none", color: "var(--textGhost)", cursor: "pointer", fontSize: 14 }}>×</button>
                    </div>
                    );
                  })}
                </div>
                </div>
                </div>
              </div>
              );
            })()}

            {/* ═══ PROGRESS REPORT ═══ */}
            {activeTab === "progress" && (() => {
              // Auto-populate 20 empty rows on first visit
              if ((progress.rows || []).length === 0) {
                const emptyRows = Array.from({ length: 20 }, (_, i) => ({ id: `pr_init_${i}`, done: false, task: "", dept: "", location: "", responsible: "", status: "Not Started", notes: "" }));
                setTimeout(() => setProgress(prev => ({ ...prev, rows: emptyRows })), 0);
              }
              const prRows = progress.rows || [];
              const prLocs = progress.locations || [];
              const allDepts = [...new Set([...DEPT_OPTIONS, ...(appSettings.departments || [])])].filter(Boolean).sort();
              const eventContactNames = [...new Set([
                ...project.producers, ...project.managers, ...(project.staff || []),
                ...(project.clientContacts || []).filter(p => p.name).map(p => p.name),
                ...(project.pocs || []).filter(p => p.name).map(p => p.name),
                ...(project.billingContacts || []).filter(p => p.name).map(p => p.name),
                ...vendors.map(v => v.name).filter(Boolean),
              ])].sort();

              // Helpers
              const addPRRow = () => {
                pushUndoSnapshot();
                const newRow = { id: `pr_${Date.now()}`, done: false, task: "", dept: "", location: "", responsible: "", status: "Not Started", notes: "" };
                setProgress(prev => ({ ...prev, rows: [...(prev.rows || []), newRow] }));
              };
              const updatePRRow = (id, field, value) => {
                pushUndoSnapshot();
                setProgress(prev => ({
                  ...prev,
                  rows: (prev.rows || []).map(r => {
                    if (r.id !== id) return r;
                    const updated = { ...r, [field]: value };
                    if (field === "status" && value === "Done") updated.done = true;
                    if (field === "status" && value !== "Done") updated.done = false;
                    return updated;
                  })
                }));
              };
              const togglePRDone = (id) => {
                setProgress(prev => ({
                  ...prev,
                  rows: (prev.rows || []).map(r => {
                    if (r.id !== id) return r;
                    const newDone = !r.done;
                    return { ...r, done: newDone, status: newDone ? "Done" : (r.status === "Done" ? "Not Started" : r.status) };
                  })
                }));
              };
              const deletePRRow = (id) => { pushUndoSnapshot(); setProgress(prev => ({ ...prev, rows: (prev.rows || []).filter(r => r.id !== id) })); };
              const addPRLocation = () => {
                const name = prompt("Enter location name:");
                if (name && name.trim()) setProgress(prev => ({ ...prev, locations: [...(prev.locations || []), name.trim()].sort() }));
              };
              const removePRLocation = (idx) => setProgress(prev => ({ ...prev, locations: (prev.locations || []).filter((_, i) => i !== idx) }));

              // Filtering
              const filtered = prRows.filter(r => {
                for (const key of Object.keys(prFilters)) {
                  const fv = prFilters[key];
                  if (!fv) continue;
                  const rv = (r[key] || "").toLowerCase();
                  if (key === "task" || key === "notes") { if (!rv.includes(fv.toLowerCase())) return false; }
                  else { if (rv !== fv.toLowerCase()) return false; }
                }
                return true;
              });

              // Sorting
              const sorted = [...filtered];
              if (prSort.col) {
                sorted.sort((a, b) => {
                  let va, vb;
                  if (prSort.col === "status") { va = WB_STATUSES.indexOf(a.status); vb = WB_STATUSES.indexOf(b.status); }
                  else { va = (a[prSort.col] || "").toLowerCase(); vb = (b[prSort.col] || "").toLowerCase(); }
                  if (va < vb) return prSort.dir === "asc" ? -1 : 1;
                  if (va > vb) return prSort.dir === "asc" ? 1 : -1;
                  return 0;
                });
              }

              const hasActiveFilters = Object.values(prFilters).some(f => f);
              const done = filtered.filter(r => r.status === "Done").length;
              const inProg = filtered.filter(r => r.status === "In Progress").length;
              const atRisk = filtered.filter(r => r.status === "At Risk").length;
              const notStarted = filtered.filter(r => r.status === "Not Started").length;

              const prColDefs = [
                { key: "task", label: "TASK", type: "text" },
                { key: "dept", label: "DEPARTMENT", type: "select", options: allDepts },
                { key: "location", label: "LOCATION", type: "select", options: prLocs },
                { key: "responsible", label: "RESPONSIBLE", type: "select", options: eventContactNames },
                { key: "status", label: "STATUS", type: "select", options: WB_STATUSES },
                { key: "notes", label: "NOTES", type: "text" },
              ];

              const handlePRSort = (col) => {
                if (prSort.col === col) {
                  if (prSort.dir === "asc") setPrSort({ col, dir: "desc" });
                  else setPrSort({ col: null, dir: "asc" });
                } else setPrSort({ col, dir: "asc" });
              };

              return (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div><div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>PROGRESS REPORT</div><div style={{ fontSize: 12, color: "var(--textMuted)" }}>Track tasks, ownership, and status across all workstreams</div></div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setPrShowFilters(p => !p)} style={{ padding: "7px 14px", background: prShowFilters ? "#3da5db20" : "#3da5db10", border: `1px solid ${prShowFilters ? "#3da5db40" : "#3da5db25"}`, borderRadius: 7, color: "#3da5db", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>⊘ Filter</button>
                    <label style={{ padding: "7px 14px", background: "#9b6dff10", border: "1px solid #9b6dff25", borderRadius: 7, color: "#9b6dff", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 13 }}>📊</span> Import CSV
                      <input type="file" accept=".csv,.tsv" hidden onChange={e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => {
                          const text = ev.target.result;
                          const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
                          if (lines.length < 2) return;
                          const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
                          const colMap = {};
                          headers.forEach((h, i) => {
                            if (h.includes("task") || h.includes("item") || h.includes("name")) colMap.task = i;
                            if (h.includes("dept") || h.includes("department")) colMap.dept = i;
                            if (h.includes("location") || h.includes("loc")) colMap.location = i;
                            if (h.includes("responsible") || h.includes("owner") || h.includes("assigned")) colMap.responsible = i;
                            if (h.includes("status")) colMap.status = i;
                            if (h.includes("note")) colMap.notes = i;
                          });
                          if (colMap.task === undefined) { colMap.task = 0; }
                          pushUndoSnapshot();
                          const newRows = lines.slice(1).map(line => {
                            const cells = line.match(/(".*?"|[^",]+|(?<=,)(?=,))/g)?.map(c => c.replace(/^"|"$/g, "").trim()) || line.split(",").map(c => c.trim());
                            return {
                              id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                              done: false,
                              task: cells[colMap.task] || "",
                              dept: cells[colMap.dept] || "",
                              location: cells[colMap.location] || "",
                              responsible: cells[colMap.responsible] || "",
                              status: cells[colMap.status] || "Not Started",
                              notes: cells[colMap.notes] || "",
                            };
                          }).filter(r => r.task);
                          setProgress(prev => ({ ...prev, rows: [...(prev.rows || []).filter(r => r.task), ...newRows] }));
                          logActivity("progress", `imported ${newRows.length} tasks from CSV`, project?.name);
                        };
                        reader.readAsText(file);
                        e.target.value = "";
                      }} />
                    </label>
                    <button onClick={addPRRow} style={{ padding: "7px 14px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 7, color: "#ff6b4a", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>+ Add Row</button>
                  </div>
                </div>
                {/* Location config */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: "10px 10px 0 0", fontSize: 11, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 0.5 }}>LOCATIONS:</span>
                  {prLocs.map((l, i) => <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "#9b6dff15", border: "1px solid #9b6dff30", borderRadius: 12, fontSize: 10, color: "#9b6dff", fontWeight: 600 }}>{l} <span onClick={() => removePRLocation(i)} style={{ cursor: "pointer", opacity: 0.6, fontSize: 11 }}>×</span></span>)}
                  <button onClick={addPRLocation} style={{ padding: "2px 8px", background: "none", border: "1px dashed var(--borderSub)", borderRadius: 12, fontSize: 10, color: "var(--textFaint)", cursor: "pointer" }}>+ Add</button>
                  <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--textGhost)" }}>Define project locations → populates dropdown below</span>
                </div>
                {/* Active filters bar */}
                {hasActiveFilters && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", background: "#ff6b4a08", border: "1px solid var(--borderSub)", borderTop: "none", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 9, color: "#ff6b4a", fontWeight: 700 }}>FILTERS:</span>
                    {Object.entries(prFilters).filter(([,v]) => v).map(([k, v]) => (
                      <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 12, fontSize: 10, color: "#ff6b4a", fontWeight: 600 }}>
                        {prColDefs.find(c => c.key === k)?.label || k}: {v}
                        <span onClick={() => setPrFilters(p => ({ ...p, [k]: "" }))} style={{ cursor: "pointer", opacity: 0.6, fontSize: 11 }}>×</span>
                      </span>
                    ))}
                    <button onClick={() => setPrFilters({ task: "", dept: "", location: "", responsible: "", status: "", notes: "" })} style={{ padding: "2px 8px", background: "none", border: "1px solid #ff6b4a30", borderRadius: 12, fontSize: 9, color: "#ff6b4a", cursor: "pointer", fontWeight: 600, marginLeft: "auto" }}>Clear All</button>
                  </div>
                )}
                <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderTop: hasActiveFilters ? "none" : undefined, borderRadius: hasActiveFilters ? 0 : "0 0 10px 10px" }}>
                  <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 360px)", minHeight: 300 }}>
                    <div style={{ minWidth: 1050 }}>
                      {/* Column headers with sort + filter */}
                      <div style={{ display: "grid", gridTemplateColumns: "40px 1.6fr 1fr 1fr 1fr 0.8fr 1.5fr 36px", padding: "0 16px", borderBottom: "1px solid var(--borderSub)", position: "sticky", top: 0, background: "var(--bgInput)", zIndex: 2 }}>
                        <div style={{ padding: "8px 0" }} />
                        {prColDefs.map(col => {
                          const isSorted = prSort.col === col.key;
                          const arrow = isSorted ? (prSort.dir === "asc" ? "↑" : "↓") : "↕";
                          const hasFilter = prFilters[col.key] && prFilters[col.key] !== "";
                          return (
                            <div key={col.key} style={{ padding: "8px 0 6px", display: "flex", flexDirection: "column" }}>
                              <div onClick={() => handlePRSort(col.key)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: isSorted ? "#ff6b4a" : "var(--textFaint)", fontWeight: 700, letterSpacing: 1, cursor: "pointer", marginBottom: prShowFilters ? 4 : 0, userSelect: "none" }}>{col.label} <span style={{ fontSize: 8 }}>{arrow}</span></div>
                              {prShowFilters && (col.type === "text" ? (
                                <input value={prFilters[col.key]} onChange={e => setPrFilters(p => ({ ...p, [col.key]: e.target.value }))} placeholder="Filter..." style={{ fontSize: 10, padding: "3px 5px", borderRadius: 4, border: `1px solid ${hasFilter ? "#ff6b4a50" : "var(--borderSub)"}`, background: hasFilter ? "#ff6b4a08" : "var(--bgCard)", color: hasFilter ? "#ff6b4a" : "var(--textFaint)", outline: "none", width: "100%", fontFamily: "'DM Sans'" }} />
                              ) : (
                                <select value={prFilters[col.key]} onChange={e => setPrFilters(p => ({ ...p, [col.key]: e.target.value }))} style={{ fontSize: 10, padding: "3px 5px", borderRadius: 4, border: `1px solid ${hasFilter ? "#ff6b4a50" : "var(--borderSub)"}`, background: hasFilter ? "#ff6b4a08" : "var(--bgCard)", color: hasFilter ? "#ff6b4a" : "var(--textFaint)", outline: "none", width: "100%", fontFamily: "'DM Sans'", cursor: "pointer" }}>
                                  <option value="">All</option>
                                  {[...new Set([...col.options, ...prRows.map(r => r[col.key]).filter(Boolean)])].sort().map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              ))}
                            </div>
                          );
                        })}
                        <div style={{ padding: "8px 0" }} />
                      </div>
                      {/* Rows */}
                      {sorted.length === 0 && prRows.length > 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--textFaint)", fontSize: 13 }}>No tasks match the current filters</div>}
                      {sorted.length === 0 && prRows.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--textFaint)", fontSize: 13 }}><div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>☰</div><div style={{ fontWeight: 600, marginBottom: 6 }}>No progress tasks yet</div><div style={{ fontSize: 11, color: "var(--textGhost)" }}>Click "+ Add Row" to start tracking</div></div>}
                      {sorted.map(r => {
                        const sc = WB_STATUS_STYLES[r.status] || {};
                        return (
                          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "40px 1.6fr 1fr 1fr 1fr 0.8fr 1.5fr 36px", padding: "7px 16px", borderBottom: "1px solid var(--calLine)", alignItems: "center" }}>
                            <div onClick={() => togglePRDone(r.id)} style={{ width: 16, height: 16, border: `1.5px solid ${r.done ? "#4ecb71" : "var(--borderActive)"}`, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: r.done ? "#4ecb71" : "transparent", background: r.done ? "#4ecb7120" : "transparent", transition: "all 0.15s" }}>✓</div>
                            <EditableText value={r.task} onChange={v => updatePRRow(r.id, "task", v)} fontSize={12} color={r.done ? "var(--textFaint)" : "var(--text)"} fontWeight={500} placeholder="Task name..." style={r.done ? { textDecoration: "line-through" } : {}} />
                            <Dropdown value={r.dept} options={allDepts} onChange={v => updatePRRow(r.id, "dept", v)} width="100%" allowBlank blankLabel="—" />
                            <Dropdown value={r.location} options={prLocs} onChange={v => updatePRRow(r.id, "location", v)} width="100%" allowBlank blankLabel="—" />
                            <Dropdown value={r.responsible} options={eventContactNames} onChange={v => updatePRRow(r.id, "responsible", v)} width="100%" allowBlank blankLabel="—" />
                            <Dropdown value={r.status} options={WB_STATUSES} onChange={v => updatePRRow(r.id, "status", v)} colors={Object.fromEntries(WB_STATUSES.map(s => [s, { bg: WB_STATUS_STYLES[s].bg, text: WB_STATUS_STYLES[s].text, dot: WB_STATUS_STYLES[s].text }]))} width="100%" />
                            <EditableText value={r.notes} onChange={v => updatePRRow(r.id, "notes", v)} fontSize={11} color="var(--textFaint)" placeholder="Notes..." />
                            <button onClick={() => deletePRRow(r.id)} style={{ background: "none", border: "none", color: "var(--textGhost)", cursor: "pointer", fontSize: 14 }}>×</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Summary bar */}
                  <div style={{ display: "flex", gap: 16, padding: "10px 16px", borderTop: "1px solid var(--borderSub)", fontSize: 10, color: "var(--textFaint)", alignItems: "center" }}>
                    <span>{hasActiveFilters ? <span style={{ color: "#ff6b4a" }}>{filtered.length} of {prRows.length} shown</span> : `${prRows.length} tasks`}</span>
                    <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#4ecb71", marginRight: 4 }} />{done} done</span>
                    <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#3da5db", marginRight: 4 }} />{inProg} in progress</span>
                    <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#e85454", marginRight: 4 }} />{atRisk} at risk</span>
                    <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#8a8680", marginRight: 4 }} />{notStarted} not started</span>
                    <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{filtered.length > 0 ? Math.round(done / filtered.length * 100) : 0}% complete</span>
                  </div>
                </div>
              </div>
              );
            })()}

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
                            <Dropdown value={entry.dept} options={[...new Set([...DEPT_OPTIONS, ...(appSettings.departments || [])])].filter(Boolean).sort()} onChange={v => updateROS(entry.id, "dept", v)} width="100%" allowBlank blankLabel="—" />
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
              <DriveTab
                project={project} driveLinked={driveLinked} driveTree={driveTree}
                driveFolders={driveFolders} driveLoading={driveLoading}
                driveShareEmail={driveShareEmail} setDriveShareEmail={setDriveShareEmail}
                driveShareRole={driveShareRole} setDriveShareRole={setDriveShareRole}
                driveAccessPanel={driveAccessPanel} setDriveAccessPanel={setDriveAccessPanel}
                renameModal={renameModal} setRenameModal={setRenameModal}
                appSettings={appSettings} setProjects={setProjects}
                generateProjectCode={generateProjectCode} copyToClipboard={copyToClipboard}
                supabase={supabase} syncProjectVendors={syncProjectVendors}
              />
            )}

            {/* ═══ VENDORS (v3 style with drop zones) ═══ */}
            {activeTab === "vendors" && (
              <VendorsTab
                project={project} vendors={vendors} setVendors={setVendors} projectVendors={projectVendors}
                vendorSearch={vendorSearch} setVendorSearch={setVendorSearch} handleVendorSearchChange={handleVendorSearchChange}
                expandedVendor={expandedVendor} setExpandedVendor={setExpandedVendor}
                editingVendorId={editingVendorId} setEditingVendorId={setEditingVendorId}
                selectedVendorIds={selectedVendorIds} setSelectedVendorIds={setSelectedVendorIds}
                showAddVendor={showAddVendor} setShowAddVendor={setShowAddVendor}
                vendorForm={vendorForm} setVendorForm={setVendorForm}
                vendorLinkCopied={vendorLinkCopied} setVendorLinkCopied={setVendorLinkCopied}
                vendorSearching={vendorSearching} setVendorSearching={setVendorSearching}
                docPreview={docPreview} setDocPreview={setDocPreview}
                driveError={driveError} setDriveError={setDriveError}
                driveResults={driveResults} setDriveResults={setDriveResults}
                driveVendorCache={driveVendorCache} setDriveVendorCache={setDriveVendorCache}
                uploadLog={uploadLog} copyToClipboard={copyToClipboard}
                setActiveProjectId={setActiveProjectId} setActiveTab={setActiveTab}
                COMP_KEYS={COMP_KEYS} DEPT_OPTIONS={DEPT_OPTIONS} DeptTag={DeptTag} DocDropZone={DocDropZone}
                appSettings={appSettings} contacts={contacts} intakeUrlBase={intakeUrlBase}
                suggestFileName={suggestFileName} syncProjectVendors={syncProjectVendors} uploadVendorDoc={uploadVendorDoc}
              />
            )}

            {/* ═══ CONTACTS ═══ */}
            {activeTab === "contacts" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                {(() => {
                  const PROJECT_ROLES = (appSettings.projectRoles || ["Producer", "Manager", "Staff / Crew", "Client", "Point of Contact", "Billing", "Talent", "Artist", "Agent", "Venue Rep", "Vendor"]).slice().sort();
                  const ROLE_COLORS = { Producer: "#ff6b4a", Manager: "#ff6b4a", "Staff / Crew": "#ff6b4a", Client: "#3da5db", "Point of Contact": "#9b6dff", Billing: "#4ecb71", Talent: "#e85494", Artist: "#e85494", Agent: "#dba94e", "Venue Rep": "#4ecbe8", Vendor: "#e8a54e", Contractor: "#e8a54e" };

                  const teamPeople = [...project.producers.map(n => ({ name: n, role: "Producer", source: "producers" })), ...project.managers.map(n => ({ name: n, role: "Manager", source: "managers" })), ...(project.staff || []).map(n => ({ name: n, role: "Staff / Crew", source: "staff" }))];
                  const clientPeople = (project.clientContacts || []).filter(p => p.name).map(p => ({ ...p, role: p.role || "Client", source: "clientContacts", dept: p.dept || "" }));
                  const pocPeople = (project.pocs || []).filter(p => p.name).map(p => ({ ...p, role: p.role || "Point of Contact", source: "pocs", dept: p.dept || "" }));
                  const billingPeople = (project.billingContacts || []).filter(p => p.name).map(p => ({ ...p, role: p.role || "Billing", source: "billingContacts", dept: p.dept || "" }));
                  const vendorPeople = vendors.filter(v => v.name).map(v => ({ name: v.contact || v.name, role: v.type === "Contractor" ? "Contractor" : "Vendor", source: "vendors", dept: v.name !== (v.contact || v.name) ? v.name : "", phone: v.phone || "", email: v.email || "", company: v.name, vendorId: v.id })).sort((a, b) => a.name.localeCompare(b.name));
                  const rawPeople = [...teamPeople, ...clientPeople, ...pocPeople, ...billingPeople, ...vendorPeople];

                  // Stable key for each person
                  const pKey = (p) => `${p.source}::${p.name}`;

                  // Apply persisted contactOrder if it exists
                  const savedOrder = project.contactOrder || [];
                  let allProjectPeople;
                  if (savedOrder.length > 0) {
                    const orderMap = {};
                    savedOrder.forEach((k, i) => { orderMap[k] = i; });
                    const ordered = [];
                    const unordered = [];
                    rawPeople.forEach(p => {
                      if (orderMap[pKey(p)] !== undefined) ordered.push(p);
                      else unordered.push(p);
                    });
                    ordered.sort((a, b) => orderMap[pKey(a)] - orderMap[pKey(b)]);
                    allProjectPeople = [...ordered, ...unordered];
                  } else {
                    allProjectPeople = rawPeople;
                  }

                  const filtered = contactSearch ? allProjectPeople.filter(p => p.name.toLowerCase().includes(contactSearch.toLowerCase()) || p.role.toLowerCase().includes(contactSearch.toLowerCase()) || (p.dept || "").toLowerCase().includes(contactSearch.toLowerCase())) : allProjectPeople;

                  const moveContact = (idx, dir) => {
                    const target = idx + dir;
                    if (target < 0 || target >= allProjectPeople.length) return;
                    const newList = [...allProjectPeople];
                    [newList[idx], newList[target]] = [newList[target], newList[idx]];
                    updateProject("contactOrder", newList.map(p => pKey(p)));
                  };

                  const addPersonToProject = (contact, role, dept) => {
                    const entry = { name: contact.name || contact, phone: contact.phone || "", email: contact.email || "", address: contact.address || "", company: contact.company || "", dept: dept || "", role: role, fromContacts: !!contact.id };
                    if (role === "Producer") updateProject("producers", [...project.producers, entry.name]);
                    else if (role === "Manager") updateProject("managers", [...project.managers, entry.name]);
                    else if (role === "Staff / Crew") updateProject("staff", [...(project.staff || []), entry.name]);
                    else if (role === "Client") updateProject("clientContacts", [...(project.clientContacts || []), entry]);
                    else if (role === "Billing") updateProject("billingContacts", [...(project.billingContacts || []), entry]);
                    else if (role === "Vendor" || role === "Contractor") {
                      setVendors(prev => [...prev, { id: `v_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, name: entry.company || entry.name, type: role, email: entry.email, contact: entry.name, phone: entry.phone, title: "", contactType: role, deptId: "", source: "manual", address: entry.address || "", compliance: { coi: { done: false }, w9: { done: false }, quote: { done: false }, invoice: { done: false }, contract: { done: false } } }]);
                    }
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
                    else if (person.source === "vendors") setVendors(prev => prev.filter(v => v.id !== person.vendorId));
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
                        <AddToProjectDropdown contacts={contacts} allProjectPeople={allProjectPeople} onAdd={(c, role, dept) => addPersonToProject(c, role, dept)} deptOptions={[...new Set([...DEPT_OPTIONS, ...(appSettings.departments || [])])].filter(Boolean).sort()} projectRoles={appSettings.projectRoles} onCreateContact={(c) => {
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
                      <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "36px 2.2fr 1fr 0.8fr 1.2fr 1.8fr auto", padding: "10px 16px", borderBottom: "1px solid var(--borderSub)", fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1 }}>
                          <span>#</span><span>NAME</span><span>ROLE</span><span>DEPARTMENT</span><span>PHONE</span><span>EMAIL</span><span>ACTIONS</span>
                        </div>
                        {filtered.map((person, i) => {
                          const c = contacts.find(ct => ct.name?.toLowerCase().trim() === person.name?.toLowerCase().trim());
                          const inClients = clients.some(cl => (cl.contactName || "").toLowerCase().trim() === person.name?.toLowerCase().trim() || (cl.name || "").toLowerCase().trim() === person.name?.toLowerCase().trim() || (cl.contactNames || []).some(n => n?.toLowerCase().trim() === person.name?.toLowerCase().trim()));
                          const inGlobal = !!c || inClients;
                          const rc = ROLE_COLORS[person.role] || "var(--textMuted)";
                          const dc = DEPT_COLORS[person.dept] || null;
                          const isTeam = person.source === "producers" || person.source === "managers" || person.source === "staff";
                          const isVendor = person.source === "vendors";
                          const realIdx = allProjectPeople.indexOf(person);
                          return (
                            <div key={`ep-${i}`} style={{ display: "grid", gridTemplateColumns: "36px 2.2fr 1fr 0.8fr 1.2fr 1.8fr auto", padding: "10px 16px", borderBottom: "1px solid var(--calLine)", alignItems: "center", fontSize: 12 }}>
                              {/* # + ARROWS */}
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                                {!contactSearch && <button onClick={() => moveContact(realIdx, -1)} disabled={realIdx === 0} style={{ background: "none", border: "none", cursor: realIdx === 0 ? "default" : "pointer", color: realIdx === 0 ? "var(--borderSub)" : "var(--textFaint)", fontSize: 8, padding: 0, lineHeight: 1 }}>▲</button>}
                                <span style={{ fontSize: 9, fontWeight: 700, color: "var(--textGhost)", fontFamily: "'JetBrains Mono', monospace" }}>{i + 1}</span>
                                {!contactSearch && <button onClick={() => moveContact(realIdx, 1)} disabled={realIdx === allProjectPeople.length - 1} style={{ background: "none", border: "none", cursor: realIdx === allProjectPeople.length - 1 ? "default" : "pointer", color: realIdx === allProjectPeople.length - 1 ? "var(--borderSub)" : "var(--textFaint)", fontSize: 8, padding: 0, lineHeight: 1 }}>▼</button>}
                              </div>
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
                                ) : isVendor ? (
                                  <span style={{ fontSize: 9, color: "#e8a54e", fontWeight: 600 }}>{person.company || person.dept || "—"}</span>
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

      {/* ═══ SETTINGS / OVERLAYS ═══ */}
        <SettingsModal ctx={{
          user, supabase, onLogout, isAdmin, theme,
          showSettings, setShowSettings, settingsTab, setSettingsTab, settingsDirty, setSettingsDirty,
          appSettings, setAppSettings, appBranding,
          projects, setProjects, contacts, setContacts, vendors, setVendors, clients,
          users, currentUser,
          copyToClipboard, generateProjectCode, processAvatarImage,
          avatarCropSrc, setAvatarCropSrc, avatarCropCallback, setAvatarCropCallback,
          backupStatus, setBackupStatus, lastBackup, setLastBackup,
          driveDiag, setDriveDiag, driveDiagLoading, setDriveDiagLoading,
          driveTestSearch, setDriveTestSearch, driveLinked,
          folderAuditResult, setFolderAuditResult,
          editingUserPerms, setEditingUserPerms,
          showVersionHistory, setShowVersionHistory, versionHistory, setVersionHistory,
          todoistKey, todoistProjects,
          contractModal, setContractModal, renameModal, setRenameModal,
          pf, setPf, previewingAs, setPreviewingAs,
          profileSetupForm, setProfileSetupForm, showProfileSetup, setShowProfileSetup,
          w9ParsedData, setW9ParsedData, docPreview, setDocPreview,
          textSize, setTextSize,
          setActiveProjectId, setActiveTab, setArchiveConfirm,
          setClientForm, setClipboardToast, setContactForm, setContactPopover,
          setContextMenu, setEditingVendorId, setShowAddClient, setShowAddContact,
          setShowAddProject, setShowAddVendor, setSelectionRange, setSwipeState,
          archiveConfirm, clipboardToast, contactForm, contactPopover, contextMenu,
          vendorForm, clientForm, editingVendorId,
          showAddProject, showAddVendor, showAddContact, showAddClient,
          submitVendor, submitClient, saveStatus,
          APP_VERSION,
          PhoneWithCode, AvatarCropper, AddressAutocomplete,
          DEPT_OPTIONS, SERVICE_OPTIONS, PROJECT_TYPES, STATUSES,
          COMP_KEYS, COUNTRY_CODES,
        }} />

      {/* ═══ FLOATING COMMENT PANEL (SLIDE-OUT DRAWER) ═══ */}
      {activeProjectId && (
        <>
          {/* Toggle button */}
          {!showCommentPanel && activeTab !== "calendar" && activeTab !== "globalContacts" && activeTab !== "clients" && activeTab !== "finance" && (
            <button onClick={() => setShowCommentPanel(true)} style={{ position: "fixed", right: 24, bottom: 24, zIndex: 200, background: "#ff6b4a", border: "none", borderRadius: "50%", width: 56, height: 56, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, boxShadow: "0 4px 20px rgba(255,107,74,0.4)", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(255,107,74,0.5)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(255,107,74,0.4)"; }}>
              <span style={{ fontSize: 24, lineHeight: 1 }}>💬</span>
              {(projectComments[activeProjectId] || []).length > 0 && (
                <span style={{ position: "absolute", top: -4, right: -4, fontSize: 10, fontWeight: 800, color: "#fff", background: "#e85454", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", border: "2px solid var(--bg)" }}>{(projectComments[activeProjectId] || []).length}</span>
              )}
            </button>
          )}
          {/* Slide-out panel */}
          <div style={{ position: "fixed", right: showCommentPanel ? 0 : -380, top: 0, bottom: 0, width: 370, zIndex: 300, background: "var(--bg)", borderLeft: "1px solid var(--borderSub)", boxShadow: showCommentPanel ? "-8px 0 30px rgba(0,0,0,0.25)" : "none", transition: "right 0.3s cubic-bezier(0.4,0,0.2,1)", display: "flex", flexDirection: "column" }}>
            {/* Panel header */}
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--borderSub)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--topBar)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>💬</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Comments</div>
                  <div style={{ fontSize: 9, color: "var(--textFaint)" }}>{projects.find(p => p.id === activeProjectId)?.name || "Project"}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 10, background: "var(--bgHover)", color: "var(--textFaint)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{(projectComments[activeProjectId] || []).length}</span>
                <button onClick={() => setShowCommentPanel(false)} style={{ background: "none", border: "none", color: "var(--textFaint)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 4px" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text)"} onMouseLeave={e => e.currentTarget.style.color = "var(--textFaint)"}>×</button>
              </div>
            </div>
            {/* Comment list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
              {(() => {
                const cmts = projectComments[activeProjectId] || [];
                if (cmts.length === 0) return (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--textGhost)" }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--textFaint)", marginBottom: 4 }}>No comments yet</div>
                    <div style={{ fontSize: 10 }}>Start the conversation below</div>
                  </div>
                );
                return [...cmts].reverse().map((cmt, i) => {
                  const ts = new Date(cmt.timestamp);
                  const timeAgo = (() => { const diff = Date.now() - ts.getTime(); const mins = Math.floor(diff / 60000); if (mins < 1) return "just now"; if (mins < 60) return `${mins}m ago`; const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs}h ago`; const days = Math.floor(hrs / 24); if (days < 7) return `${days}d ago`; return ts.toLocaleDateString("en-US", { month: "short", day: "numeric" }); })();
                  const initials = (cmt.author || "?").split(/[\s@]+/)[0].charAt(0).toUpperCase();
                  return (
                    <div key={cmt.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--calLine)" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#3da5db15", border: "1px solid #3da5db25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#3da5db", flexShrink: 0 }}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{cmt.author}</span>
                          <span style={{ fontSize: 9, color: "var(--textGhost)" }}>{timeAgo}</span>
                          <button onClick={() => deleteComment(cmt.id)} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--textGhost)", cursor: "pointer", fontSize: 12, opacity: 0.4, padding: 2 }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.4}>×</button>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--textSub)", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{cmt.text.split(/(@[\w\s.'-]+)/g).map((part, pi) => part.startsWith("@") ? <span key={pi} style={{ color: "#ff6b4a", fontWeight: 600 }}>{part}</span> : part)}</div>
                      </div>
                    </div>
                  );
                });
              })()}
              {/* Progress report notes */}
              {(() => {
                const prog = projectProgress[activeProjectId] || { rows: [], locations: [] };
                const prNotes = (prog.rows || []).filter(r => r.notes && r.notes.trim()).map(r => ({ task: r.task, note: r.notes, status: r.status }));
                if (prNotes.length === 0) return null;
                return (
                  <div style={{ marginTop: 14, borderTop: "1px solid var(--borderSub)", paddingTop: 10 }}>
                    <div style={{ fontSize: 8, color: "var(--textGhost)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>FROM PROGRESS REPORT</div>
                    {prNotes.slice(0, 5).map((n, i) => (
                      <div key={i} style={{ display: "flex", gap: 6, padding: "4px 0", fontSize: 10 }}>
                        <span style={{ color: WB_STATUS_STYLES[n.status]?.text || "var(--textFaint)", fontSize: 8, fontWeight: 700, minWidth: 10 }}>●</span>
                        <span style={{ color: "var(--textMuted)", fontWeight: 600 }}>{n.task}:</span>
                        <span style={{ color: "var(--textFaint)" }}>{n.note}</span>
                      </div>
                    ))}
                    {prNotes.length > 5 && <div style={{ fontSize: 9, color: "var(--textGhost)", padding: "2px 0 0 16px" }}>+{prNotes.length - 5} more...</div>}
                  </div>
                );
              })()}
            </div>
            {/* Input area */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--borderSub)", background: "var(--topBar)", flexShrink: 0, position: "relative" }}>
              {/* @mention dropdown */}
              {showMentionDropdown && (() => {
                const proj = projects.find(p => p.id === activeProjectId);
                const team = getProjectTeamMembers(proj);
                const filtered = mentionQuery ? team.filter(m => m.name.toLowerCase().includes(mentionQuery.toLowerCase())) : team;
                if (filtered.length === 0) return null;
                return (
                  <div style={{ position: "absolute", bottom: "100%", left: 16, right: 16, background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, boxShadow: "0 -4px 20px rgba(0,0,0,0.15)", maxHeight: 160, overflowY: "auto", zIndex: 10 }}>
                    <div style={{ padding: "6px 10px", fontSize: 9, color: "var(--textGhost)", fontWeight: 700, letterSpacing: 0.5, borderBottom: "1px solid var(--borderSub)" }}>TAG A TEAM MEMBER</div>
                    {filtered.map((m, i) => (
                      <div key={m.name} onClick={() => {
                        // Replace @query with @Name
                        const before = commentInput.substring(0, mentionCursorPos - mentionQuery.length - 1);
                        const after = commentInput.substring(mentionCursorPos);
                        setCommentInput(before + "@" + m.name + " " + after);
                        setShowMentionDropdown(false);
                        setMentionQuery("");
                      }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgHover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"} style={{ padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, background: i === mentionIndex ? "var(--bgHover)" : "transparent" }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#3da5db15", border: "1px solid #3da5db25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#3da5db" }}>{m.name.charAt(0)}</div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{m.name}</div>
                          {m.email && <div style={{ fontSize: 9, color: "var(--textGhost)" }}>{m.email}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #ff6b4a20, #ff6b4a10)", border: "1px solid #ff6b4a30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#ff6b4a", flexShrink: 0 }}>{(user?.name || user?.email || "?").charAt(0).toUpperCase()}</div>
                <textarea value={commentInput} onChange={e => {
                  const val = e.target.value;
                  setCommentInput(val);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
                  // Detect @mention trigger
                  const pos = e.target.selectionStart;
                  const textBefore = val.substring(0, pos);
                  const atMatch = textBefore.match(/@(\w*)$/);
                  if (atMatch) {
                    setMentionQuery(atMatch[1]);
                    setMentionCursorPos(pos);
                    setShowMentionDropdown(true);
                    setMentionIndex(0);
                  } else {
                    setShowMentionDropdown(false);
                  }
                }} onKeyDown={e => {
                  if (showMentionDropdown) {
                    const proj = projects.find(p => p.id === activeProjectId);
                    const team = getProjectTeamMembers(proj);
                    const filtered = mentionQuery ? team.filter(m => m.name.toLowerCase().includes(mentionQuery.toLowerCase())) : team;
                    if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, filtered.length - 1)); return; }
                    if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); return; }
                    if ((e.key === "Enter" || e.key === "Tab") && filtered.length > 0) {
                      e.preventDefault();
                      const m = filtered[mentionIndex];
                      const before = commentInput.substring(0, mentionCursorPos - mentionQuery.length - 1);
                      const after = commentInput.substring(mentionCursorPos);
                      setCommentInput(before + "@" + m.name + " " + after);
                      setShowMentionDropdown(false);
                      setMentionQuery("");
                      return;
                    }
                    if (e.key === "Escape") { setShowMentionDropdown(false); return; }
                  }
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (commentInput.trim()) { addComment(commentInput); setCommentInput(""); e.target.style.height = "36px"; setShowMentionDropdown(false); } }
                }} placeholder="Add a comment... use @ to tag" rows={1} style={{ flex: 1, padding: "8px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 12, outline: "none", fontFamily: "'DM Sans'", resize: "none", lineHeight: 1.5, minHeight: 36, maxHeight: 100 }} />
                <button onClick={() => { if (commentInput.trim()) { addComment(commentInput); setCommentInput(""); setShowMentionDropdown(false); } }} disabled={!commentInput.trim()} style={{ padding: "8px 14px", background: commentInput.trim() ? "#ff6b4a" : "var(--bgCard)", border: "none", borderRadius: 8, color: commentInput.trim() ? "#fff" : "var(--textGhost)", cursor: commentInput.trim() ? "pointer" : "default", fontSize: 11, fontWeight: 700, flexShrink: 0, transition: "all 0.15s", height: 36 }}>Post</button>
              </div>
              <div style={{ fontSize: 9, color: "var(--textGhost)", marginTop: 4, textAlign: "center" }}>Type <strong>@</strong> to tag someone on this project</div>
            </div>
          </div>
          {/* Backdrop */}
          {showCommentPanel && <div onClick={() => setShowCommentPanel(false)} style={{ position: "fixed", inset: 0, zIndex: 299, background: "rgba(0,0,0,0.15)" }} />}
        </>
      )}

      {/* ═══ AVATAR CROPPER ═══ */}
      {avatarCropSrc && (
        <AvatarCropper
          imageSrc={avatarCropSrc}
          onSave={(dataUrl) => { if (avatarCropCallback) avatarCropCallback(dataUrl); setAvatarCropSrc(null); setAvatarCropCallback(null); }}
          onCancel={() => { setAvatarCropSrc(null); setAvatarCropCallback(null); }}
        />
      )}

    </div>
  );
}
