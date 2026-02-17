"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";

export default function SettingsModal({ ctx }) {
  // Destructure everything from ctx
  const {
    user, supabase, onLogout, isAdmin, theme,
    showSettings, setShowSettings, settingsTab, setSettingsTab, settingsDirty, setSettingsDirty,
    appSettings, setAppSettings, appBranding,
    projects, setProjects, contacts, setContacts, vendors, setVendors, clients,
    users, currentUser,
    copyToClipboard, generateProjectCode, processAvatarImage,
    // State + setters used in settings
    avatarCropSrc, setAvatarCropSrc, avatarCropCallback, setAvatarCropCallback,
    backupStatus, setBackupStatus, lastBackup, setLastBackup,
    driveDiag, setDriveDiag, driveDiagLoading, setDriveDiagLoading,
    driveTestSearch, setDriveTestSearch, driveLinked,
    folderAuditResult, setFolderAuditResult,
    editingUserPerms, setEditingUserPerms,
    showVersionHistory, setShowVersionHistory, versionHistory, setVersionHistory,
    todoistKey, todoistProjects: todoistProjectsProp,
    contractModal, setContractModal, renameModal, setRenameModal,
    pf, setPf, previewingAs, setPreviewingAs,
    profileSetupForm, setProfileSetupForm, showProfileSetup, setShowProfileSetup,
    w9ParsedData, setW9ParsedData, docPreview, setDocPreview,
    textSize, setTextSize,
    // Additional references
    setActiveProjectId, setActiveTab, setArchiveConfirm,
    setClientForm, setClipboardToast, setContactForm, setContactPopover,
    setContextMenu, setEditingVendorId, setShowAddClient, setShowAddContact,
    setShowAddProject, setShowAddVendor, setSelectionRange, setSwipeState,
    // State reads for modals/overlays
    archiveConfirm, clipboardToast, contactForm, contactPopover, contextMenu,
    vendorForm, clientForm, editingVendorId,
    showAddProject, showAddVendor, showAddContact, showAddClient,
    submitVendor, submitClient, saveStatus,
    APP_VERSION,
    PhoneWithCode, AvatarCropper, AddressAutocomplete,
    DEPT_OPTIONS, SERVICE_OPTIONS, PROJECT_TYPES, STATUSES,
    COMP_KEYS, COUNTRY_CODES,
  } = ctx;

  return (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => { if (!settingsDirty) setShowSettings(false); }}>
    <div onClick={e => e.stopPropagation()} style={{ background: "var(--bgCard)", border: "1px solid var(--borderActive)", borderRadius: 16, width: 780, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
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
          {[["profile", "🪪 Profile"], ...(isAdmin ? [["users", "👤 Users"], ["drive", "📁 Drive"], ["defaults", "📋 Defaults"], ["templates", "📝 Templates"], ["display", "🔤 Display"], ["notifications", "🔔 Notifications"]] : []), ...(isOwner ? [["branding", "🎨 Branding"]] : [])].map(([key, label]) => (
            <button key={key} onClick={() => setSettingsTab(key)} style={{ padding: "8px 16px", background: "none", border: "none", borderBottom: settingsTab === key ? "2px solid #ff6b4a" : "2px solid transparent", color: settingsTab === key ? "#ff6b4a" : "var(--textMuted)", fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: 0.3 }}>{label}</button>
          ))}
        </div>
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24, minHeight: 0 }}>

        {/* ── PROFILE TAB ── */}
        {settingsTab === "profile" && (() => {
          const myProfile = (appSettings.userProfiles || {})[user?.email] || {};
          const updateProfile = (field, val) => {
            const updated = { ...appSettings, userProfiles: { ...(appSettings.userProfiles || {}), [user.email]: { ...(appSettings.userProfiles || {})[user.email] || {}, [field]: val, email: user.email } } };
            setAppSettings(updated);
            setSettingsDirty(true);
          };
          const handleAvatarUpload = (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 5000000) { alert("Image must be under 5MB"); return; }
            const reader = new FileReader();
            reader.onload = (ev) => { setAvatarCropSrc(ev.target.result); setAvatarCropCallback(() => (dataUrl) => updateProfile("avatar", dataUrl)); };
            reader.readAsDataURL(file);
            e.target.value = ""; // reset so same file can be re-selected
          };
          const initials = ((myProfile.firstName || user?.name?.split(" ")[0] || "")[0] || "") + ((myProfile.lastName || user?.name?.split(" ").slice(1).join(" ") || "")[0] || "");
          const fld = (label, key, placeholder, type) => (
            <div key={key}>
              <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4, letterSpacing: 0.3 }}>{label}</label>
              <input value={myProfile[key] || ""} onChange={e => updateProfile(key, e.target.value)} placeholder={placeholder || ""} type={type || "text"} style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} />
            </div>
          );
          return (
            <div>
              <div style={{ fontSize: 11, color: "var(--textMuted)", marginBottom: 16, lineHeight: 1.5 }}>Your profile is visible to other team members in Command Center.</div>
              {/* Avatar */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <div style={{ position: "relative" }}>
                  {myProfile.avatar ? (
                    <img src={myProfile.avatar} alt="" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--borderActive)" }} />
                  ) : (
                    <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#ff6b4a20", border: "2px solid #ff6b4a40", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#ff6b4a" }}>{initials.toUpperCase() || "?"}</div>
                  )}
                  <label style={{ position: "absolute", bottom: -2, right: -2, width: 26, height: 26, borderRadius: "50%", background: "var(--bgCard)", border: "1px solid var(--borderActive)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 12 }} title="Upload photo">
                    📷
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
                  </label>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{myProfile.firstName || myProfile.lastName ? `${myProfile.firstName || ""} ${myProfile.lastName || ""}`.trim() : user?.name || "Set up your profile"}</div>
                  <div style={{ fontSize: 11, color: "var(--textFaint)", fontFamily: "'JetBrains Mono', monospace" }}>{user?.email}</div>
                  {myProfile.title && <div style={{ fontSize: 10, color: "var(--textMuted)", marginTop: 2 }}>{myProfile.title}{myProfile.company ? ` · ${myProfile.company}` : ""}</div>}
                </div>
              </div>
              {/* Fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                {fld("FIRST NAME", "firstName", "Billy")}
                {fld("LAST NAME", "lastName", "Smith")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                {fld("TITLE / POSITION", "title", "Executive Producer")}
                {fld("COMPANY", "company", "WE ARE ADPTV")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                {fld("PHONE", "phone", "(555) 123-4567", "tel")}
                {fld("DEPARTMENT", "department", "Production")}
              </div>
              <div style={{ marginBottom: 16 }}>
                {fld("ADDRESS", "address", "123 Main St, Miami FL")}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4, letterSpacing: 0.3 }}>BIO / NOTES</label>
                <textarea value={myProfile.bio || ""} onChange={e => updateProfile("bio", e.target.value)} placeholder="Short bio..." rows={2} style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
          );
        })()}

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

                // Recursive sort helper
                const sortTemplateAlpha = (items) => {
                  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
                  return sorted.map(item => ({
                    ...item,
                    children: item.children ? sortTemplateAlpha(item.children) : [],
                  }));
                };

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
                    <button onClick={() => {
                      setAppSettings(prev => ({ ...prev, folderTemplate: sortTemplateAlpha(prev.folderTemplate || []) }));
                      setSettingsDirty(true);
                    }} style={{ marginTop: 8, marginLeft: 8, padding: "6px 14px", background: "#4ecb7115", border: "1px solid #4ecb7130", borderRadius: 6, color: "#4ecb71", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>↕ Sort A→Z</button>
                  </div>
                );
              })()}
            </div>

            {/* ── AUDIT EXISTING PROJECTS ── */}
            <div style={{ marginTop: 20, padding: 16, background: "var(--bgCard)", borderRadius: 10, border: "1px solid var(--borderSub)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>🔍 Audit Existing Project Folders</div>
                  <div style={{ fontSize: 10, color: "var(--textFaint)" }}>Check all projects in Drive have the required folder structure</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={async () => {
                      setClipboardToast({ text: "Auditing project folders...", x: window.innerWidth / 2, y: 60 });
                      try {
                        const res = await fetch("/api/drive/project", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "audit-folders", dryRun: true }),
                        });
                        const data = await res.json();
                        if (!data.success) throw new Error(data.error || "Audit failed");
                        setFolderAuditResult(data);
                        setClipboardToast({ text: `Audit complete: ${data.compliant} OK, ${data.needsFix} need fixes`, x: window.innerWidth / 2, y: 60 });
                        setTimeout(() => setClipboardToast(null), 4000);
                      } catch (err) {
                        setClipboardToast({ text: `Audit error: ${err.message}`, x: window.innerWidth / 2, y: 60 });
                        setTimeout(() => setClipboardToast(null), 4000);
                      }
                    }}
                    style={{ padding: "6px 14px", background: "#3da5db10", border: "1px solid #3da5db25", borderRadius: 6, color: "#3da5db", fontSize: 10, fontWeight: 600, cursor: "pointer" }}
                  >Check (Dry Run)</button>
                  <button
                    onClick={async () => {
                      if (!confirm("This will CREATE all missing folders in every project. Continue?")) return;
                      setClipboardToast({ text: "Fixing project folders...", x: window.innerWidth / 2, y: 60 });
                      try {
                        const res = await fetch("/api/drive/project", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "audit-folders", dryRun: false }),
                        });
                        const data = await res.json();
                        if (!data.success) throw new Error(data.error || "Fix failed");
                        setFolderAuditResult(data);
                        const created = data.needsFix;
                        setClipboardToast({ text: `Done! Fixed ${created} project${created !== 1 ? "s" : ""}`, x: window.innerWidth / 2, y: 60 });
                        setTimeout(() => setClipboardToast(null), 4000);
                      } catch (err) {
                        setClipboardToast({ text: `Fix error: ${err.message}`, x: window.innerWidth / 2, y: 60 });
                        setTimeout(() => setClipboardToast(null), 4000);
                      }
                    }}
                    style={{ padding: "6px 14px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 6, color: "#ff6b4a", fontSize: 10, fontWeight: 600, cursor: "pointer" }}
                  >Fix All Missing</button>
                </div>
              </div>
              {typeof folderAuditResult !== "undefined" && folderAuditResult && (() => {
                const r = folderAuditResult;
                const renderAuditItem = (item, depth = 0) => {
                  const color = item.status === "exists" ? "#4ecb71" : item.status === "created" ? "#3da5db" : "#ff6b4a";
                  const icon = item.status === "exists" ? "✓" : item.status === "created" ? "+" : "✗";
                  return (
                    <div key={item.name}>
                      <div style={{ paddingLeft: depth * 16, fontSize: 10, color, display: "flex", alignItems: "center", gap: 4, lineHeight: "18px" }}>
                        <span style={{ fontFamily: "'JetBrains Mono'", fontWeight: 700, width: 12 }}>{icon}</span>
                        <span>{item.name}</span>
                      </div>
                      {(item.children || []).map(c => renderAuditItem(c, depth + 1))}
                    </div>
                  );
                };
                return (
                  <div style={{ maxHeight: 300, overflowY: "auto", marginTop: 8 }}>
                    <div style={{ fontSize: 10, color: "var(--textFaint)", marginBottom: 6 }}>{r.dryRun ? "DRY RUN — " : ""}Total: {r.totalProjects} | ✓ {r.compliant} OK | {r.dryRun ? "✗" : "+"} {r.needsFix} {r.dryRun ? "need fixes" : "fixed"}</div>
                    {r.projects.filter(p => p.needsFix).map(p => (
                      <div key={p.projectId} style={{ marginBottom: 8, padding: "6px 8px", background: "var(--bgInput)", borderRadius: 6, border: "1px solid var(--borderSub)" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{p.client} / {p.year} / {p.project}</div>
                        {p.audit.map(a => renderAuditItem(a, 0))}
                      </div>
                    ))}
                    {r.projects.filter(p => p.needsFix).length === 0 && <div style={{ fontSize: 11, color: "#4ecb71", fontWeight: 600 }}>All projects have the required folder structure! ✓</div>}
                  </div>
                );
              })()}
            </div>

            {/* ── DATA PROTECTION ── */}
            <div style={{ marginTop: 28, borderTop: "2px solid var(--borderSub)", paddingTop: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>🛡️ Data Protection</div>
              <div style={{ fontSize: 10, color: "var(--textFaint)", marginBottom: 16 }}>Auto-backup runs daily (8AM UTC) to Shared Drive → Internal → Command.Center</div>

              {/* Backup path info */}
              <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: 14, marginBottom: 20 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--textGhost)", letterSpacing: 0.5, marginBottom: 6 }}>AUTOMATIC BACKUP LOCATION</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--textSub)" }}>
                  📁 Shared Drive → Internal → <strong>Command.Center</strong> → Backups → <em>YYYY-MM</em>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--textSub)", marginTop: 4 }}>
                  👥 Shared Drive → Internal → <strong>Command.Center</strong> → Contacts → <em>*.vcf</em>
                </div>
                <div style={{ fontSize: 9, color: "var(--textGhost)", marginTop: 8 }}>Runs daily via Vercel Cron (8AM UTC). Upgrade to Pro for hourly. Contacts sync as vCards with each backup.</div>
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
                {(appSettings.statuses || []).filter(Boolean).sort().map((s, i) => (
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
                {(appSettings.projectTypes || []).filter(Boolean).sort().map((t, i) => (
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
                {(appSettings.departments || []).filter(Boolean).sort().map((d, i) => (
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
                {(appSettings.projectRoles || []).filter(Boolean).sort().map((r, i) => (
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
        {/* ── TEMPLATES TAB ── */}
        {settingsTab === "templates" && (
            <div>
              <div style={{ fontSize: 11, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>TEMPLATE DOCUMENTS</div>
              <div style={{ fontSize: 11, color: "var(--textMuted)", marginBottom: 20, lineHeight: 1.7 }}>
                Link your Google Doc templates below. Each template should contain <code style={{ background: "var(--bgInput)", padding: "1px 4px", borderRadius: 3, fontSize: 10 }}>{"{{PLACEHOLDER}}"}</code> markers that get replaced when generating contracts.
              </div>

              {["vendor", "contractor"].map(type => {
                const tplDocs = appSettings.templateDocs || {};
                const tpl = tplDocs[type] || {};
                const extractId = (url) => {
                  if (!url) return null;
                  if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) return url;
                  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                  return m ? m[1] : null;
                };
                const placeholders = type === "vendor"
                  ? ["EFFECTIVE_DAY", "EFFECTIVE_MONTH", "EFFECTIVE_YEAR", "VENDOR_NAME", "VENDOR_ENTITY_DESC", "VENDOR_TITLE", "CLIENT_NAME", "EVENT_NAME", "EVENT_DATES", "EVENT_TIME", "VENUE_NAME", "VENUE_ADDRESS", "DOCUMENT_TYPE", "DOCUMENT_DATE", "VENDOR_DELIVERABLES", "PAYMENT_TERMS", "TIMELINE", "INSURANCE_COVERAGE"]
                  : ["EFFECTIVE_DAY", "EFFECTIVE_MONTH", "EFFECTIVE_YEAR", "CONTRACTOR_NAME", "CONTRACTOR_ENTITY_TYPE", "CONTRACTOR_ADDRESS", "CONTRACTOR_EXPERTISE", "SOW_TERM", "SOW_PROJECT", "SOW_COMPENSATION", "SOW_PAYMENT_TERMS", "SOW_DELIVERABLES", "SOW_TIMELINE", "SOW_EXECUTION_DATE", "AGREEMENT_DATE"];

                return (
                  <div key={type} style={{ background: "var(--bgInput)", border: `1px solid ${tpl.id ? "#4ecb7130" : "var(--borderSub)"}`, borderRadius: 8, padding: "12px 16px", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 14 }}>{type === "contractor" ? "👤" : "🏢"}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{type === "contractor" ? "Contractor Agreement" : "Vendor Agreement"}</span>
                      {tpl.id && <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 3, background: "#4ecb7120", color: "#4ecb71", fontWeight: 700 }}>LINKED</span>}
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                      <input
                        value={tpl.url || ""}
                        onChange={e => {
                          const url = e.target.value;
                          const id = extractId(url);
                          setAppSettings(prev => ({ ...prev, templateDocs: { ...prev.templateDocs, [type]: { url, id } } }));
                          setSettingsDirty(true);
                        }}
                        placeholder="Paste Google Doc URL..."
                        style={{ flex: 1, padding: "6px 10px", background: "var(--bgCard)", border: `1px solid ${tpl.id ? "#4ecb7130" : "var(--borderSub)"}`, borderRadius: 6, color: "var(--text)", fontSize: 10, fontFamily: "'DM Sans', sans-serif", outline: "none", minWidth: 0 }}
                      />
                      {tpl.id && (
                        <button onClick={() => window.open(`https://docs.google.com/document/d/${tpl.id}/edit`, "_blank")} style={{ padding: "7px 12px", background: "#3da5db10", border: "1px solid #3da5db25", borderRadius: 6, color: "#3da5db", cursor: "pointer", fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>
                          Open ↗
                        </button>
                      )}
                    </div>

                    {tpl.id && (
                      <div style={{ fontSize: 8, color: "var(--textFaint)", fontFamily: "'JetBrains Mono', monospace", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        ID: {tpl.id}
                      </div>
                    )}

                    <details style={{ marginTop: 2 }}>
                      <summary style={{ fontSize: 9, color: "var(--textMuted)", cursor: "pointer", userSelect: "none" }}>
                        Placeholders ({placeholders.length})
                      </summary>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 6 }}>
                        {placeholders.map(p => (
                          <code key={p} onClick={() => { navigator.clipboard.writeText(`{{${p}}}`); }} style={{ fontSize: 8, padding: "1px 4px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 2, color: "var(--textSub)", cursor: "pointer", lineHeight: 1.4 }} title="Click to copy">{`{{${p}}}`}</code>
                        ))}
                      </div>
                    </details>
                  </div>
                );
              })}

              <div style={{ marginTop: 10, padding: "10px 14px", background: "var(--bgInput)", borderRadius: 6, border: "1px solid var(--borderSub)" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--textFaint)", letterSpacing: 0.5, marginBottom: 6 }}>HOW TO SET UP</div>
                <div style={{ fontSize: 9, color: "var(--textMuted)", lineHeight: 1.8 }}>
                  1. Create your contract template in <strong>Google Docs</strong> with your branding and formatting<br/>
                  2. Add <code style={{ background: "var(--bgCard)", padding: "1px 4px", borderRadius: 3 }}>{"{{PLACEHOLDER}}"}</code> markers where fields should be filled (e.g. <code style={{ background: "var(--bgCard)", padding: "1px 4px", borderRadius: 3 }}>{"{{VENDOR_NAME}}"}</code>)<br/>
                  3. Make sure the doc is on your shared drive (<strong>ADPTV LLC</strong>)<br/>
                  4. Paste the Google Doc URL above and save
                </div>
              </div>

              {!(appSettings.templateDocs?.vendor?.id) && !(appSettings.templateDocs?.contractor?.id) && (
                <div style={{ marginTop: 12, padding: "12px 16px", background: "#f5a62310", border: "1px solid #f5a62325", borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: "#f5a623", fontWeight: 600 }}>⚠️ No templates linked</div>
                  <div style={{ fontSize: 10, color: "var(--textMuted)", marginTop: 4 }}>Contract generation requires at least one linked template. Create a Google Doc on the shared drive and paste its URL above.</div>
                </div>
              )}
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
              <div style={{ fontSize: 12, fontWeight: 700, color: "#4ecb71", marginBottom: 6 }}>⚡ Live Sync Active</div>
              <div style={{ fontSize: 11, color: "var(--textMuted)", lineHeight: 1.5 }}>All data saves to Supabase immediately (~100ms). Changes from other team members sync in real-time via Supabase Realtime + 3s polling fallback. Browser localStorage is used as a fast-load cache only — Supabase is always the source of truth.</div>
            </div>

            {/* Version & Update Management */}
            <div style={{ marginTop: 20, padding: "16px 20px", background: "var(--bgInput)", borderRadius: 10, border: "1px solid var(--borderSub)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>🔄 App Version & Updates</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: "var(--textMuted)" }}>Current version:</span>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#4ecb71", padding: "2px 8px", background: "#4ecb7110", borderRadius: 4 }}>{APP_VERSION}</span>
                {updateAvailable && <span style={{ fontSize: 10, color: "#dba94e", fontWeight: 600 }}>⚠ Remote: {updateAvailable.version}</span>}
              </div>
              {isAdmin && (
                <div>
                  <div style={{ fontSize: 10, color: "var(--textFaint)", marginBottom: 6 }}>After deploying a new build, push the version so all users get notified to refresh:</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => {
                      const msg = prompt("Update message for users (optional):", "New features and bug fixes available.");
                      if (msg === null) return;
                      pushAppVersion(msg, false);
                      setClipboardToast({ text: `Version ${APP_VERSION} pushed — users will see a banner`, x: window.innerWidth / 2, y: 60 });
                    }} style={{ padding: "8px 16px", background: "#dba94e15", border: "1px solid #dba94e30", borderRadius: 8, color: "#dba94e", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      📢 Push Update (Soft)
                    </button>
                    <button onClick={() => {
                      if (!confirm("Force update will block users until they refresh. Continue?")) return;
                      const msg = prompt("Update message:", "Critical update — please refresh now.");
                      if (msg === null) return;
                      pushAppVersion(msg, true);
                      setClipboardToast({ text: `Force update pushed — users must refresh`, x: window.innerWidth / 2, y: 60 });
                    }} style={{ padding: "8px 16px", background: "#e8545415", border: "1px solid #e8545430", borderRadius: 8, color: "#e85454", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      🚨 Force Update
                    </button>
                  </div>
                  <div style={{ fontSize: 9, color: "var(--textGhost)", marginTop: 8, lineHeight: 1.5 }}>
                    <strong>Soft:</strong> Yellow banner, user can dismiss and refresh later.<br/>
                    <strong>Force:</strong> Red banner, user cannot dismiss — must refresh.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── BRANDING TAB ── */}
        {settingsTab === "branding" && isOwner && (
          <div>
            <div style={{ fontSize: 11, color: "var(--textMuted)", marginBottom: 20, lineHeight: 1.5 }}>Customize the appearance of your Command Center. Only visible to owners (Billy &amp; Clancy).</div>

            {/* Company Logo */}
            <div style={{ marginBottom: 24, padding: "16px 18px", background: "var(--bgInput)", borderRadius: 10, border: "1px solid var(--borderSub)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>Company Logo</div>
                  <div style={{ fontSize: 9, color: "var(--textGhost)" }}>Replaces "Adaptive by Design" in header · PNG with transparency recommended · Upload separate dark &amp; light versions</div>
                </div>
                {(appSettings.branding?.logoDark || appSettings.branding?.logoLight) && (
                  <button onClick={async () => {
                    setAppSettings(prev => ({ ...prev, branding: { ...prev.branding, logoDark: "", logoLight: "" } }));
                  }} style={{ padding: "4px 10px", background: "#e8545412", border: "1px solid #e8545425", borderRadius: 5, color: "#e85454", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>✕ Remove Both</button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Dark mode logo */}
                <div>
                  <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 700, marginBottom: 6 }}>DARK MODE (light logo on dark bg)</div>
                  {appSettings.branding?.logoDark ? (
                    <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--borderSub)", background: "#1e1e1c", padding: 12, display: "flex", alignItems: "center", justifyContent: "center", height: 60 }}>
                      <img src={appSettings.branding.logoDark} alt="Logo Dark" style={{ maxHeight: 40, maxWidth: "100%", objectFit: "contain" }} />
                      <button onClick={() => setAppSettings(prev => ({ ...prev, branding: { ...prev.branding, logoDark: "" } }))} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.5)", border: "none", color: "#e85454", fontSize: 10, cursor: "pointer", borderRadius: 4, padding: "2px 5px" }}>✕</button>
                    </div>
                  ) : (
                    <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 60, border: "2px dashed var(--borderSub)", borderRadius: 8, cursor: "pointer", color: "var(--textGhost)", fontSize: 10, gap: 2, background: "#1e1e1c" }}>
                      <span>📷 Upload dark mode logo</span>
                      <input type="file" accept="image/png,image/svg+xml,image/webp" style={{ display: "none" }} onChange={async (e) => {
                        const file = e.target.files[0]; if (!file) return;
                        if (file.size > 2 * 1024 * 1024) { alert("File too large. Under 2MB."); return; }
                        const reader = new FileReader(); reader.onload = () => setAppSettings(prev => ({ ...prev, branding: { ...(prev.branding || {}), logoDark: reader.result } })); reader.readAsDataURL(file);
                      }} />
                    </label>
                  )}
                </div>
                {/* Light mode logo */}
                <div>
                  <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 700, marginBottom: 6 }}>LIGHT MODE (dark logo on light bg)</div>
                  {appSettings.branding?.logoLight ? (
                    <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--borderSub)", background: "#f5f0ea", padding: 12, display: "flex", alignItems: "center", justifyContent: "center", height: 60 }}>
                      <img src={appSettings.branding.logoLight} alt="Logo Light" style={{ maxHeight: 40, maxWidth: "100%", objectFit: "contain" }} />
                      <button onClick={() => setAppSettings(prev => ({ ...prev, branding: { ...prev.branding, logoLight: "" } }))} style={{ position: "absolute", top: 4, right: 4, background: "rgba(255,255,255,0.5)", border: "none", color: "#e85454", fontSize: 10, cursor: "pointer", borderRadius: 4, padding: "2px 5px" }}>✕</button>
                    </div>
                  ) : (
                    <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 60, border: "2px dashed var(--borderSub)", borderRadius: 8, cursor: "pointer", color: "var(--textGhost)", fontSize: 10, gap: 2, background: "#f5f0ea" }}>
                      <span>📷 Upload light mode logo</span>
                      <input type="file" accept="image/png,image/svg+xml,image/webp" style={{ display: "none" }} onChange={async (e) => {
                        const file = e.target.files[0]; if (!file) return;
                        if (file.size > 2 * 1024 * 1024) { alert("File too large. Under 2MB."); return; }
                        const reader = new FileReader(); reader.onload = () => setAppSettings(prev => ({ ...prev, branding: { ...(prev.branding || {}), logoLight: reader.result } })); reader.readAsDataURL(file);
                      }} />
                    </label>
                  )}
                </div>
              </div>
            </div>

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
                <>
                <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--borderSub)" }}>
                  <img src={appSettings.branding.dashboardBg} alt="Dashboard BG" style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                  <div style={{ position: "absolute", bottom: 6, right: 6, fontSize: 8, padding: "2px 6px", background: "rgba(0,0,0,0.6)", color: "#fff", borderRadius: 4 }}>Current dashboard background</div>
                </div>
                {/* Zoom & Position Controls */}
                <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--textFaint)", minWidth: 40 }}>ZOOM</label>
                    <input type="range" min="50" max="250" step="5" value={appSettings.branding?.bgZoom || 100} onChange={e => {
                      const val = parseInt(e.target.value);
                      setAppSettings(prev => ({ ...prev, branding: { ...(prev.branding || {}), bgZoom: val } }));
                      setSettingsDirty(true);
                    }} style={{ flex: 1, cursor: "pointer", accentColor: "#ff6b4a" }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text)", fontFamily: "'JetBrains Mono', monospace", minWidth: 36, textAlign: "right" }}>{appSettings.branding?.bgZoom || 100}%</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--textFaint)", minWidth: 40 }}>ALIGN</label>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {[["top left", "↖"], ["top center", "↑"], ["top right", "↗"], ["center left", "←"], ["center center", "•"], ["center right", "→"], ["bottom left", "↙"], ["bottom center", "↓"], ["bottom right", "↘"]].map(([pos, icon]) => (
                        <button key={pos} onClick={() => { setAppSettings(prev => ({ ...prev, branding: { ...(prev.branding || {}), bgPosition: pos } })); setSettingsDirty(true); }} style={{ width: 26, height: 26, borderRadius: 4, border: `1px solid ${(appSettings.branding?.bgPosition || "center center") === pos ? "#ff6b4a" : "var(--borderSub)"}`, background: (appSettings.branding?.bgPosition || "center center") === pos ? "#ff6b4a18" : "var(--bgInput)", color: (appSettings.branding?.bgPosition || "center center") === pos ? "#ff6b4a" : "var(--textGhost)", cursor: "pointer", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>{icon}</button>
                      ))}
                    </div>
                  </div>
                </div>
                </>
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

        {/* ═══ NOTIFICATIONS TAB ═══ */}
        {settingsTab === "notifications" && (
          <div style={{ padding: "0 6px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Email Notifications</div>
            <div style={{ fontSize: 10, color: "var(--textMuted)", marginBottom: 16, lineHeight: 1.5 }}>Get notified about deadlines, @mentions, vendor compliance, and project updates. Sends to: <strong>{user?.email}</strong></div>

            {/* Master toggle */}
            <div style={{ marginBottom: 16, padding: "14px 16px", background: "var(--bgInput)", borderRadius: 10, border: "1px solid var(--borderSub)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>📧 Email Notifications</div>
                  <div style={{ fontSize: 9, color: "var(--textGhost)", marginTop: 2 }}>Enable to receive email notifications from Command Center</div>
                </div>
                <button onClick={() => { setAppSettings(prev => ({ ...prev, notifications: { ...(prev.notifications || {}), emailEnabled: !(prev.notifications?.emailEnabled) } })); setSettingsDirty(true); }} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--borderSub)", background: appSettings.notifications?.emailEnabled ? "#4ecb7118" : "var(--bgCard)", color: appSettings.notifications?.emailEnabled ? "#4ecb71" : "var(--textMuted)", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>
                  {appSettings.notifications?.emailEnabled ? "✓ Enabled" : "Enable"}
                </button>
              </div>
            </div>

            {appSettings.notifications?.emailEnabled && (
              <>
              {/* Frequency selector */}
              <div style={{ marginBottom: 16, padding: "14px 16px", background: "var(--bgInput)", borderRadius: 10, border: "1px solid var(--borderSub)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--textFaint)", letterSpacing: 0.5, marginBottom: 10 }}>FREQUENCY</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { key: "instant", label: "Instant", desc: "@mentions only", icon: "⚡" },
                    { key: "daily", label: "Daily Digest", desc: "9 AM every morning", icon: "📋" },
                    { key: "weekly", label: "Weekly Summary", desc: "Monday 9 AM", icon: "📊" },
                  ].map(f => {
                    const freq = appSettings.notifications?.frequency || "daily";
                    const isActive = freq === f.key;
                    return (
                      <button key={f.key} onClick={() => { setAppSettings(prev => ({ ...prev, notifications: { ...(prev.notifications || {}), frequency: f.key } })); setSettingsDirty(true); }} style={{ flex: 1, padding: "10px 8px", borderRadius: 8, border: `1px solid ${isActive ? "#ff6b4a" : "var(--borderSub)"}`, background: isActive ? "#ff6b4a10" : "var(--bgCard)", cursor: "pointer", textAlign: "center" }}>
                        <div style={{ fontSize: 14, marginBottom: 4 }}>{f.icon}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? "#ff6b4a" : "var(--text)" }}>{f.label}</div>
                        <div style={{ fontSize: 9, color: "var(--textGhost)", marginTop: 2 }}>{f.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* @mention notifications (always on if email enabled) */}
              <div style={{ marginBottom: 16, padding: "14px 16px", background: "var(--bgInput)", borderRadius: 10, border: "1px solid var(--borderSub)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>💬</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)" }}>Chat @Mentions</div>
                    <div style={{ fontSize: 9, color: "var(--textGhost)" }}>When someone tags you in a project chat, you'll get an email immediately regardless of frequency setting</div>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, color: "#4ecb71", background: "#4ecb7112", padding: "3px 8px", borderRadius: 4 }}>Always On</span>
                </div>
              </div>

              {/* Digest sections (for daily/weekly) */}
              {(appSettings.notifications?.frequency || "daily") !== "instant" && (
                <div style={{ marginBottom: 16, padding: "14px 16px", background: "var(--bgInput)", borderRadius: 10, border: "1px solid var(--borderSub)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--textFaint)", letterSpacing: 0.5, marginBottom: 10 }}>
                    {(appSettings.notifications?.frequency || "daily") === "weekly" ? "WEEKLY SUMMARY" : "DAILY DIGEST"} — INCLUDE THESE SECTIONS
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { key: "digestOverdue", label: "Overdue work back items", icon: "🔴", desc: "Items past their due date" },
                      { key: "digestDueSoon", label: "Due today / tomorrow", icon: "⏰", desc: "Items due within 48 hours" },
                      { key: "digestTodoist", label: "Todoist task snapshot", icon: "✅", desc: "Your open tasks from Todoist" },
                      { key: "digestCompliance", label: "Vendor compliance gaps", icon: "📄", desc: "Missing W9s and COIs" },
                      { key: "digestStatusChanges", label: "Project status changes", icon: "📊", desc: "Projects that changed status" },
                      { key: "digestMentions", label: "Unread @mentions", icon: "💬", desc: "Chat messages you were tagged in" },
                    ].map(n => (
                      <label key={n.key} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "6px 8px", borderRadius: 6, background: (appSettings.notifications?.digest || {})[n.key] ? "#ff6b4a06" : "transparent" }}>
                        <input type="checkbox" checked={!!(appSettings.notifications?.digest || {})[n.key]} onChange={() => {
                          setAppSettings(prev => ({ ...prev, notifications: { ...(prev.notifications || {}), digest: { ...(prev.notifications?.digest || {}), [n.key]: !(prev.notifications?.digest || {})[n.key] } } }));
                          setSettingsDirty(true);
                        }} style={{ cursor: "pointer", accentColor: "#ff6b4a" }} />
                        <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{n.icon}</span>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{n.label}</div>
                          <div style={{ fontSize: 9, color: "var(--textGhost)" }}>{n.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              </>
            )}

            {/* Setup info */}
            <div style={{ padding: "14px 16px", background: "#3da5db08", border: "1px solid #3da5db20", borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#3da5db", marginBottom: 6 }}>💡 Setup</div>
              <div style={{ fontSize: 10, color: "var(--textMuted)", lineHeight: 1.8 }}>
                <strong>1.</strong> Sign up free at <span style={{ color: "#ff6b4a" }}>resend.com</span> and get your API key<br />
                <strong>2.</strong> Add <code style={{ background: "var(--bgInput)", padding: "1px 4px", borderRadius: 3, fontSize: 9 }}>RESEND_API_KEY</code> to your Vercel environment variables<br />
                <strong>3.</strong> Verify your sending domain in the Resend dashboard<br />
                <strong>4.</strong> Cron runs daily at 9 AM ET via <code style={{ background: "var(--bgInput)", padding: "1px 4px", borderRadius: 3, fontSize: 9 }}>/api/cron/notify</code>
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
      <button onClick={() => { const src = projects.find(x => x.id === contextMenu.projectId); if (src && !src.parentId) { const newId = "sub_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); const sub = { id: newId, parentId: src.id, name: "New Sub-Project", client: src.client || "", projectType: src.projectType || "", code: "", status: "Pre-Production", location: "", budget: 0, spent: 0, eventDates: { start: "", end: "" }, engagementDates: { start: "", end: "" }, brief: src.brief || { what: "", where: "", why: "" }, why: src.why || "", services: [...(src.services || [])], producers: [...(src.producers || [])], managers: [...(src.managers || [])], staff: [], pocs: [], clientContacts: [...(src.clientContacts || [])], billingContacts: [...(src.billingContacts || [])], notes: "", archived: false, isTour: src.isTour || false, subEvents: src.isTour ? [] : undefined }; setProjects(prev => [...prev, sub]); setActiveProjectId(newId); setActiveTab("overview"); setClipboardToast({ text: `Sub-project created under "${src.name}"`, x: window.innerWidth / 2, y: 60 }); } else if (src?.parentId) { alert("Cannot nest sub-projects further."); } setContextMenu(null); }} style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "none", borderRadius: 4, color: "#dba94e", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }} onMouseEnter={e => e.currentTarget.style.background = "#dba94e12"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>📂 Add Sub-Project</button>
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

{/* ═══ FIRST-LOGIN PROFILE SETUP MODAL ═══ */}
{showProfileSetup && (() => {
  const pf = profileSetupForm;
  const setPf = (updater) => setProfileSetupForm(typeof updater === "function" ? updater : () => updater);
  const handleAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5000000) { alert("Image must be under 5MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setAvatarCropSrc(ev.target.result); setAvatarCropCallback(() => (dataUrl) => setProfileSetupForm(p => ({ ...p, avatar: dataUrl }))); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  const initials = ((pf.firstName || "")[0] || "") + ((pf.lastName || "")[0] || "");
  const canSave = pf.firstName && pf.lastName;
  const fieldStyle = { width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderActive)", borderRadius: 16, width: 480, maxHeight: "85vh", display: "flex", flexDirection: "column", animation: "fadeUp 0.3s ease", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ padding: "28px 28px 20px", textAlign: "center", borderBottom: "1px solid var(--borderSub)" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", fontFamily: "'Instrument Sans'" }}>Welcome to Command Center</div>
          <div style={{ fontSize: 12, color: "var(--textMuted)", marginTop: 6, lineHeight: 1.5 }}>Set up your profile so your team knows who you are. This only takes a moment.</div>
        </div>
        <div style={{ padding: "20px 28px 24px", overflowY: "auto", flex: 1 }}>
          {/* Avatar */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <div style={{ position: "relative" }}>
              {pf.avatar ? (
                <img src={pf.avatar} alt="" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid #ff6b4a40" }} />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#ff6b4a20", border: "3px solid #ff6b4a30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#ff6b4a" }}>{initials.toUpperCase() || "?"}</div>
              )}
              <label style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: "50%", background: "var(--bgCard)", border: "1px solid var(--borderActive)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13 }} title="Upload photo">
                📷
                <input type="file" accept="image/*" onChange={handleAvatar} style={{ display: "none" }} />
              </label>
            </div>
          </div>
          {/* Fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>FIRST NAME *</label><input value={pf.firstName} onChange={e => setPf(p => ({ ...p, firstName: e.target.value }))} style={fieldStyle} /></div>
            <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>LAST NAME *</label><input value={pf.lastName} onChange={e => setPf(p => ({ ...p, lastName: e.target.value }))} style={fieldStyle} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>TITLE / POSITION</label><input value={pf.title} onChange={e => setPf(p => ({ ...p, title: e.target.value }))} placeholder="Executive Producer" style={fieldStyle} /></div>
            <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>COMPANY</label><input value={pf.company} onChange={e => setPf(p => ({ ...p, company: e.target.value }))} placeholder="WE ARE ADPTV" style={fieldStyle} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>PHONE</label><input value={pf.phone} onChange={e => setPf(p => ({ ...p, phone: e.target.value }))} placeholder="(555) 123-4567" type="tel" style={fieldStyle} /></div>
            <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>DEPARTMENT</label><input value={pf.department} onChange={e => setPf(p => ({ ...p, department: e.target.value }))} placeholder="Production" style={fieldStyle} /></div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>ADDRESS</label>
            <input value={pf.address} onChange={e => setPf(p => ({ ...p, address: e.target.value }))} placeholder="123 Main St, Miami FL" style={fieldStyle} />
          </div>
        </div>
        <div style={{ padding: "16px 28px 24px", display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid var(--borderSub)" }}>
          <button onClick={() => setShowProfileSetup(false)} style={{ padding: "10px 20px", background: "transparent", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--textMuted)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Skip for now</button>
          <button disabled={!canSave} onClick={() => saveUserProfile(pf)} style={{ padding: "10px 28px", background: canSave ? "#ff6b4a" : "#ff6b4a40", border: "none", borderRadius: 8, color: "#fff", cursor: canSave ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700, opacity: canSave ? 1 : 0.5 }}>Save Profile</button>
        </div>
      </div>
    </div>
  );
})()}

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
        {/* CLIENT / PARTNER TOGGLE */}
        <div style={{ display: "flex", marginBottom: 20, background: "var(--bgCard)", borderRadius: 8, border: "1px solid var(--borderSub)", overflow: "hidden" }}>
          {["Client", "Partner"].map(opt => {
            const isActive = opt === "Client" ? (contactForm.contactType === "Client") : (contactForm.contactType !== "Client");
            const color = opt === "Client" ? "#3da5db" : "#ff6b4a";
            return <button key={opt} onClick={() => updateCF("contactType", opt === "Client" ? "Client" : "Vendor")} style={{ flex: 1, padding: "10px 0", background: isActive ? `${color}15` : "transparent", border: "none", borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent", color: isActive ? color : "var(--textFaint)", fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5, transition: "all 0.15s" }}>{opt === "Client" ? "👤 Client Contact" : "🤝 Partner / Vendor"}</button>;
          })}
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>VENDOR / COMPANY NAME</label>
          <input value={contactForm.vendorName || contactForm.company || ""} onChange={e => { updateCF("vendorName", e.target.value); updateCF("company", e.target.value); }} placeholder="e.g. GDRB, Collins Visual Media..." style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
          <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>FIRST NAME</label><input value={contactForm.firstName} onChange={e => updateCF("firstName", e.target.value)} style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
          <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>LAST NAME</label><input value={contactForm.lastName} onChange={e => updateCF("lastName", e.target.value)} style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: contactForm.contactType === "Client" ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 20 }}>
          <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>POSITION / TITLE</label><input value={contactForm.position} onChange={e => updateCF("position", e.target.value)} placeholder="Executive Producer, DP, PM..." style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} /></div>
          {contactForm.contactType !== "Client" && <div><label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, display: "block", marginBottom: 4 }}>DEPARTMENT</label>
            <select value={contactForm.department} onChange={e => updateCF("department", e.target.value)} style={{ width: "100%", padding: "9px 12px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none" }}>
              <option value="">Select...</option>
              {[...new Set([...DEPT_OPTIONS, ...(appSettings.departments || [])])].filter(Boolean).sort().map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>}
        </div>
        {contactForm.contactType !== "Client" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
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
              <option value="Vendor">Partner / Vendor</option>
              <option value="Venue">Venue</option>
              <option value="Talent">Talent</option>
              <option value="Internal">Internal</option>
            </select>
          </div>
        </div>}
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
            const isClient = contactForm.contactType === "Client";
            const name = isClient ? (personName || contactForm.vendorName || contactForm.company) : (contactForm.vendorName || personName || contactForm.company);
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 28, marginBottom: 26 }}>
          <div>
            <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>CLIENT *</label>
            <ClientSearchInput value={newProjectForm.client} onChange={v => updateNPF("client", v)} projects={projects} clients={clients} onAddNew={() => { setClientForm({ ...emptyClient }); setShowAddClient(true); }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>PROJECT NAME *</label>
            <input value={newProjectForm.name} onChange={e => updateNPF("name", e.target.value)} placeholder="Air Max Campaign, Wrapped BTS..." style={{ width: "100%", padding: "11px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} />
          </div>
        </div>

        {/* Row 2: Location + Venue */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 28, marginBottom: 26 }}>
          <div>
            <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>LOCATION <span style={{ color: "var(--textGhost)", fontWeight: 400 }}>(for code)</span></label>
            <input value={newProjectForm.location} onChange={e => updateNPF("location", e.target.value)} placeholder="LA, MIA, Tulum..." style={{ width: "100%", padding: "11px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>VENUE ADDRESS <span style={{ color: "var(--textGhost)", fontWeight: 400 }}>(on-site)</span></label>
            <AddressAutocomplete value={newProjectForm.venue || ""} onChange={v => updateNPF("venue", v)} showIcon={false} placeholder="Search venue address..." inputStyle={{ width: "100%", padding: "11px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 13, outline: "none" }} />
          </div>
        </div>

        {/* Row 3: Status + Project Type */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, marginBottom: 26 }}>
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

        {/* Row 4: Event dates */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 28, marginBottom: 26 }}>
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

        {/* Row 5: WHY */}
        <div style={{ marginBottom: 26 }}>
          <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>PROJECT BRIEF / WHY</label>
          <textarea value={newProjectForm.why} onChange={e => updateNPF("why", e.target.value)} rows={2} placeholder="Spring product launch — hero content for social + OLV" style={{ width: "100%", padding: "11px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none", resize: "vertical", fontFamily: "'DM Sans'" }} />
        </div>

        {/* Row 6: SERVICES */}
        <div style={{ marginBottom: 26 }}>
          <label style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>SERVICE NEEDS</label>
          <MultiDropdown values={newProjectForm.services || []} options={SERVICE_OPTIONS} onChange={v => updateNPF("services", v)} />
        </div>

        {/* Row 5: Budget + Tour toggle */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, marginBottom: 28 }}>
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

{/* ═══ CONTRACT GENERATION MODAL ═══ */}
{contractModal && (() => {
  const ct = contractModal.contractType;
  const f = contractModal.fields;
  const updateField = (key, val) => setContractModal(prev => ({ ...prev, fields: { ...prev.fields, [key]: val } }));
  const formatCurrency = (val) => {
    const num = parseFloat(val.replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return val;
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const switchType = (newType) => {
    const v = contractModal.vendor;
    // Re-initialize fields for the new type
    const now = new Date();
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const base = { EFFECTIVE_DAY: f.EFFECTIVE_DAY, EFFECTIVE_MONTH: f.EFFECTIVE_MONTH, EFFECTIVE_YEAR: f.EFFECTIVE_YEAR };
    if (newType === "contractor") {
      const eventStart = project.eventDates?.start ? new Date(project.eventDates.start + "T12:00:00") : null;
      const eventEnd = project.eventDates?.end ? new Date(project.eventDates.end + "T12:00:00") : null;
      const eventDateStr = eventStart ? (eventEnd && eventEnd > eventStart ? `${eventStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${eventEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : eventStart.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })) : "";
      const engStart = project.engagementDates?.start || "";
      const engEnd = project.engagementDates?.end || "";
      const termStr = engStart && engEnd ? `${new Date(engStart + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} through ${new Date(engEnd + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : "";
      setContractModal(prev => ({ ...prev, contractType: "contractor", fields: {
        ...base, CONTRACTOR_NAME: v.name, CONTRACTOR_ENTITY_TYPE: v.ein ? "a limited liability company" : "an individual",
        CONTRACTOR_ADDRESS: v.address || "", CONTRACTOR_EXPERTISE: v.deptId || v.type || "",
        SOW_TERM: termStr, SOW_PROJECT: project.name || "", SOW_COMPENSATION: "",
        SOW_PAYMENT_TERMS: "Net 15 — upon completion of services", SOW_DELIVERABLES: "", SOW_TIMELINE: eventDateStr,
        SOW_EXECUTION_DATE: `${base.EFFECTIVE_MONTH} ${base.EFFECTIVE_DAY}, 20${base.EFFECTIVE_YEAR}`,
        AGREEMENT_DATE: `${base.EFFECTIVE_MONTH} ${base.EFFECTIVE_DAY}, 20${base.EFFECTIVE_YEAR}`,
      }}));
    } else {
      const eventStart = project.eventDates?.start ? new Date(project.eventDates.start + "T12:00:00") : null;
      const eventEnd = project.eventDates?.end ? new Date(project.eventDates.end + "T12:00:00") : null;
      const eventDateStr = eventStart ? (eventEnd && eventEnd > eventStart ? `${eventStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${eventEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : eventStart.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })) : "";
      const engStart = project.engagementDates?.start || "";
      const engEnd = project.engagementDates?.end || "";
      const termStr = engStart && engEnd ? `${new Date(engStart + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} through ${new Date(engEnd + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : "";
      setContractModal(prev => ({ ...prev, contractType: "vendor", fields: {
        ...base, VENDOR_NAME: v.name, VENDOR_ENTITY_DESC: v.ein ? "a limited liability company" : "an individual",
        VENDOR_TITLE: v.deptId || v.type || "", CLIENT_NAME: project.client || "",
        EVENT_NAME: project.name || "", EVENT_DATES: eventDateStr, EVENT_TIME: "",
        VENUE_NAME: project.venue ? project.venue.split(",")[0].trim() : project.location ? project.location.split(",")[0].trim() : "",
        VENUE_ADDRESS: project.venueAddress || (project.venue && project.venue.includes(",") ? project.venue : project.location || ""),
        DOCUMENT_TYPE: "proposal", DOCUMENT_DATE: "", VENDOR_DELIVERABLES: "",
        PAYMENT_TERMS: "Net 15 — upon completion of the Event", TIMELINE: termStr || eventDateStr,
        INSURANCE_COVERAGE: "One Million Dollars ($1,000,000) per occurrence and Two Million Dollars ($2,000,000) in the aggregate",
      }}));
    }
  };

  // Field definitions for each contract type
  const contractorFieldDefs = [
    { section: "Counterparty", fields: [
      { key: "CONTRACTOR_NAME", label: "Contractor Name", auto: true },
      { key: "CONTRACTOR_ENTITY_TYPE", label: "Entity Type", placeholder: "a California LLC / an individual" },
      { key: "CONTRACTOR_ADDRESS", label: "Address", auto: !!contractModal.vendor.address },
      { key: "CONTRACTOR_EXPERTISE", label: "Field of Expertise", auto: !!contractModal.vendor.deptId },
    ]},
    { section: "Statement of Work (Exhibit A)", fields: [
      { key: "SOW_TERM", label: "Term", auto: !!(project.engagementDates?.start) },
      { key: "SOW_PROJECT", label: "Project / Service Description", auto: true },
      { key: "SOW_COMPENSATION", label: "Compensation / Fee", placeholder: "$0,000.00", required: true, currency: true },
      { key: "SOW_PAYMENT_TERMS", label: "Payment Terms", auto: true },
      { key: "SOW_DELIVERABLES", label: "Deliverables", placeholder: "Describe scope of work...", required: true, multiline: true },
      { key: "SOW_TIMELINE", label: "Timeline", auto: !!(project.eventDates?.start) },
    ]},
  ];

  const vendorFieldDefs = [
    { section: "Counterparty", fields: [
      { key: "VENDOR_NAME", label: "Vendor Name", auto: true },
      { key: "VENDOR_ENTITY_DESC", label: "Entity Description", placeholder: "a California LLC" },
      { key: "VENDOR_TITLE", label: "Vendor Role / Title", auto: !!contractModal.vendor.deptId },
    ]},
    { section: "Document Reference", fields: [
      { key: "DOCUMENT_TYPE", label: "Document Type", select: [
        { value: "proposal", label: "Proposal" },
        { value: "quote", label: "Quote" },
        { value: "invoice", label: "Invoice" },
        { value: "budget", label: "Budget" },
      ]},
      { key: "DOCUMENT_DATE", label: "Document Date", placeholder: "March 1, 2026" },
    ]},
    { section: "Event Details (Exhibit A)", fields: [
      { key: "CLIENT_NAME", label: "Client Name", auto: !!project.client },
      { key: "EVENT_NAME", label: "Event Name", auto: true },
      { key: "EVENT_DATES", label: "Event Date(s)", auto: !!(project.eventDates?.start) },
      { key: "EVENT_TIME", label: "Event Time", placeholder: "10:00 AM – 6:00 PM" },
      { key: "VENUE_NAME", label: "Venue", auto: !!(project.venue || project.location) },
      { key: "VENUE_ADDRESS", label: "Venue Address", auto: !!(project.venueAddress || (project.venue && project.venue.includes(",")) || project.location) },
      { key: "VENDOR_DELIVERABLES", label: "Vendor Deliverables", placeholder: "Describe scope of services...", required: true, multiline: true },
      { key: "PAYMENT_TERMS", label: "Payment Terms", auto: true },
      { key: "TIMELINE", label: "Timeline", auto: !!(project.engagementDates?.start || project.eventDates?.start) },
    ]},
    { section: "Insurance", fields: [
      { key: "INSURANCE_COVERAGE", label: "Coverage Level", select: [
        { value: "One Million Dollars ($1,000,000) per occurrence and Two Million Dollars ($2,000,000) in the aggregate", label: "Standard — $1M / $2M" },
        { value: "Five Million Dollars ($5,000,000) per occurrence and Ten Million Dollars ($10,000,000) in the aggregate", label: "High Risk — $5M / $10M" },
      ]},
    ]},
  ];

  const fieldDefs = ct === "contractor" ? contractorFieldDefs : vendorFieldDefs;
  const filledCount = Object.values(f).filter(v => v && v.trim()).length;
  const totalCount = Object.keys(f).length;


  return (
  <div style={{ position: "fixed", inset: 0, zIndex: 10001, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) setContractModal(null); }}>
    <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 16, width: 680, maxWidth: "94vw", maxHeight: "90vh", display: "flex", flexDirection: "column", animation: "fadeUp 0.2s ease", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--borderSub)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>GENERATE CONTRACT</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>📝 {contractModal.vendor.name}</div>
          <div style={{ fontSize: 11, color: "var(--textMuted)", marginTop: 4 }}>{project.name} · {project.client}</div>
        </div>
        <button onClick={() => setContractModal(null)} style={{ background: "none", border: "none", color: "var(--textFaint)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "4px" }}>✕</button>
      </div>

      {/* Contract Type Toggle */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--borderSub)", display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 0.5 }}>TYPE:</span>
        <div style={{ display: "flex", gap: 0, background: "var(--bgCard)", borderRadius: 8, border: "1px solid var(--borderSub)", overflow: "hidden" }}>
          <button onClick={() => switchType("contractor")} style={{ padding: "8px 20px", background: ct === "contractor" ? "#ff6b4a" : "transparent", border: "none", color: ct === "contractor" ? "#fff" : "var(--textFaint)", cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all 0.15s" }}>👤 Contractor</button>
          <button onClick={() => switchType("vendor")} style={{ padding: "8px 20px", background: ct === "vendor" ? "#9b6dff" : "transparent", border: "none", color: ct === "vendor" ? "#fff" : "var(--textFaint)", cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all 0.15s" }}>🏢 Vendor</button>
        </div>
        <span style={{ fontSize: 10, color: "var(--textGhost)", marginLeft: "auto" }}>
          <span style={{ color: filledCount === totalCount ? "#4ecb71" : "#dba94e", fontWeight: 700 }}>{filledCount}/{totalCount}</span> fields filled
        </span>
      </div>

      {/* Scrollable Fields */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>
        {/* Effective Date (always shown) */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>EFFECTIVE DATE</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 9, color: "var(--textGhost)", display: "block", marginBottom: 3 }}>Day</label>
              <input value={f.EFFECTIVE_DAY} onChange={e => updateField("EFFECTIVE_DAY", e.target.value)} style={{ width: "100%", padding: "8px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--text)", fontSize: 12, outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 9, color: "var(--textGhost)", display: "block", marginBottom: 3 }}>Month</label>
              <input value={f.EFFECTIVE_MONTH} onChange={e => updateField("EFFECTIVE_MONTH", e.target.value)} style={{ width: "100%", padding: "8px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--text)", fontSize: 12, outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 9, color: "var(--textGhost)", display: "block", marginBottom: 3 }}>Year (2-digit)</label>
              <input value={f.EFFECTIVE_YEAR} onChange={e => updateField("EFFECTIVE_YEAR", e.target.value)} style={{ width: "100%", padding: "8px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--text)", fontSize: 12, outline: "none" }} />
            </div>
          </div>
        </div>

        {/* Dynamic sections */}
        {fieldDefs.map(section => (
          <div key={section.section} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>{section.section.toUpperCase()}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {section.fields.map(fd => (
                <div key={fd.key}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <label style={{ fontSize: 10, color: "var(--textMuted)", fontWeight: 600 }}>{fd.label}</label>
                    {fd.auto && f[fd.key] && <span style={{ fontSize: 7, padding: "1px 5px", borderRadius: 3, background: "#4ecb7115", color: "#4ecb71", fontWeight: 700, border: "1px solid #4ecb7125" }}>AUTO-FILLED</span>}
                    {fd.required && !f[fd.key] && <span style={{ fontSize: 7, padding: "1px 5px", borderRadius: 3, background: "#e8545415", color: "#e85454", fontWeight: 700, border: "1px solid #e8545425" }}>REQUIRED</span>}
                  </div>
                  {fd.multiline ? (
                    <textarea value={f[fd.key] || ""} onChange={e => updateField(fd.key, e.target.value)} rows={3} placeholder={fd.placeholder || ""} style={{ width: "100%", padding: "8px 10px", background: f[fd.key] ? "var(--bgCard)" : "#e854540a", border: `1px solid ${f[fd.key] ? "var(--borderSub)" : "#e8545420"}`, borderRadius: 6, color: "var(--text)", fontSize: 12, outline: "none", resize: "vertical", fontFamily: "'DM Sans'" }} />
                  ) : fd.select ? (
                    <select value={f[fd.key] || fd.select[0]?.value || ""} onChange={e => updateField(fd.key, e.target.value)} style={{ width: "100%", padding: "8px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--text)", fontSize: 12, outline: "none", fontFamily: "'DM Sans'", cursor: "pointer", appearance: "auto" }}>
                      {fd.select.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  ) : (
                    <input value={f[fd.key] || ""} onChange={e => updateField(fd.key, e.target.value)} onBlur={fd.currency ? (e => { const formatted = formatCurrency(e.target.value); if (formatted !== e.target.value) updateField(fd.key, formatted); }) : undefined} placeholder={fd.placeholder || ""} style={{ width: "100%", padding: "8px 10px", background: f[fd.key] ? "var(--bgCard)" : "#e854540a", border: `1px solid ${f[fd.key] ? "var(--borderSub)" : "#e8545420"}`, borderRadius: 6, color: "var(--text)", fontSize: 12, outline: "none" }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Exhibit B — Invoice picker for vendor contracts */}
        {ct === "vendor" && (() => {
          const inv = contractModal.vendor.compliance?.invoice;
          const versionFiles = (inv && Array.isArray(inv.files)) ? inv.files : [];
          const hasAny = inv?.done || versionFiles.length > 0;
          // Build selectable list: current + all versions
          const invoiceOptions = [];
          if (versionFiles.length > 0) {
            versionFiles.forEach((vf, i) => { invoiceOptions.push({ label: vf.file || `Invoice V${vf.version || i + 1}`, link: vf.link, date: vf.date, version: vf.version || i + 1 }); });
          } else if (inv?.done && inv?.file) {
            invoiceOptions.push({ label: inv.file, link: inv.link, date: inv.date, version: 1 });
          }
          return (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>EXHIBIT B — INVOICE / PROPOSAL</div>
            {hasAny ? (
              <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--borderSub)", fontSize: 10, color: "var(--textMuted)", fontWeight: 600 }}>
                  Select which invoice to attach as Exhibit B:
                </div>
                {/* No invoice option */}
                <div onClick={() => setContractModal(prev => ({ ...prev, invoiceLink: null }))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--borderSub)", background: !contractModal.invoiceLink ? "#ff6b4a08" : "transparent", transition: "background 0.15s" }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${!contractModal.invoiceLink ? "#ff6b4a" : "var(--borderActive)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {!contractModal.invoiceLink && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff6b4a" }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--textMuted)" }}>No invoice — generate contract only</div>
                    <div style={{ fontSize: 9, color: "var(--textGhost)" }}>PDF will contain only the agreement</div>
                  </div>
                </div>
                {/* Invoice versions */}
                {invoiceOptions.map((opt, idx) => (
                  <div key={idx} onClick={() => setContractModal(prev => ({ ...prev, invoiceLink: opt.link }))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: idx < invoiceOptions.length - 1 ? "1px solid var(--borderSub)" : "none", background: contractModal.invoiceLink === opt.link ? "#4ecb7108" : "transparent", transition: "background 0.15s" }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${contractModal.invoiceLink === opt.link ? "#4ecb71" : "var(--borderActive)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {contractModal.invoiceLink === opt.link && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ecb71" }} />}
                    </div>
                    <span style={{ fontSize: 16 }}>📄</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {opt.label}
                        <span style={{ fontSize: 8, marginLeft: 6, padding: "1px 5px", borderRadius: 3, background: "#9b6dff15", color: "#9b6dff", fontWeight: 700 }}>V{opt.version}</span>
                      </div>
                      <div style={{ fontSize: 9, color: "var(--textFaint)" }}>Uploaded {opt.date}</div>
                    </div>
                    {opt.link && <button onClick={(e) => { e.stopPropagation(); window.open(opt.link, "_blank"); }} style={{ padding: "3px 7px", background: "#3da5db10", border: "1px solid #3da5db20", borderRadius: 4, color: "#3da5db", cursor: "pointer", fontSize: 8, fontWeight: 600 }}>Preview</button>}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "12px 14px", background: "#dba94e08", border: "1px solid #dba94e20", borderRadius: 8, fontSize: 11, color: "#dba94e" }}>
                ⚠️ No invoices uploaded for this vendor yet. You can generate the contract without an invoice and attach one later, or upload an invoice in the vendor's compliance docs first.
              </div>
            )}
          </div>
          );
        })()}
      </div>

      {/* Footer */}
      {contractModal.success ? (
        <div style={{ padding: "20px 24px", borderTop: "1px solid var(--borderSub)", background: "#4ecb7108" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#4ecb71" }}>Contract Generated</div>
              <div style={{ fontSize: 10, color: "var(--textFaint)" }}>Saved to {contractModal.success.folderPath || "Google Drive"}</div>
            </div>
          </div>

          {/* Step 1: Review Google Doc */}
          <div style={{ marginBottom: 12, padding: "12px 16px", background: "var(--bgCard)", borderRadius: 8, border: "1px solid #3da5db25" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#3da5db", letterSpacing: 0.8, marginBottom: 8 }}>STEP 1 — REVIEW DOCUMENT</div>
            <button onClick={() => { window.open(contractModal.success.docUrl, "_blank"); }} style={{ padding: "10px 20px", background: "#3da5db", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center" }}>
              📝 Open in Google Docs
            </button>
            <div style={{ fontSize: 9, color: "var(--textFaint)", marginTop: 6, textAlign: "center" }}>Review and make any edits before exporting to PDF</div>
          </div>

          {/* Step 2: Export PDF */}
          <div style={{ padding: "12px 16px", background: "var(--bgCard)", borderRadius: 8, border: `1px solid ${contractModal.success.pdfUrl ? "#4ecb7125" : "var(--borderSub)"}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: contractModal.success.pdfUrl ? "#4ecb71" : "var(--textFaint)", letterSpacing: 0.8, marginBottom: 8 }}>STEP 2 — EXPORT PDF{contractModal.success.pdfUrl ? " ✓" : ""}</div>
            {contractModal.success.pdfUrl ? (
              <button onClick={() => { window.open(contractModal.success.pdfUrl, "_blank"); }} style={{ padding: "10px 20px", background: contractModal.success.hasInvoiceMerged ? "#9b6dff15" : "#ff6b4a15", border: `1px solid ${contractModal.success.hasInvoiceMerged ? "#9b6dff30" : "#ff6b4a30"}`, borderRadius: 8, color: contractModal.success.hasInvoiceMerged ? "#9b6dff" : "#ff6b4a", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center" }}>
                📄 {contractModal.success.hasInvoiceMerged ? "Open Combined PDF (contract + invoice)" : "Open PDF"}
              </button>
            ) : (
              <button onClick={async () => {
                setContractModal(prev => ({ ...prev, success: { ...prev.success, exportingPdf: true } }));
                try {
                  const res = await fetch("/api/contracts/generate", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "export-pdf",
                      docId: contractModal.success.docId,
                      docName: contractModal.success.docName,
                      invoiceLink: contractModal.invoiceLink || null,
                      contractType: contractModal.contractType,
                      targetFolderId: contractModal.success.targetFolderId,
                    }),
                  });
                  const data = await res.json();
                  if (data.error) throw new Error(data.error);
                  // Update compliance with PDF link
                  setVendors(prev => prev.map(v => v.id !== contractModal.vendor.id ? v : {
                    ...v, compliance: { ...v.compliance, contract: { ...v.compliance?.contract, file: data.pdfName, link: data.pdfUrl } }
                  }));
                  setContractModal(prev => ({ ...prev, success: { ...prev.success, pdfUrl: data.pdfUrl, pdfName: data.pdfName, hasInvoiceMerged: data.hasInvoiceMerged, exportingPdf: false } }));
                } catch (e) {
                  setContractModal(prev => ({ ...prev, error: e.message, success: { ...prev.success, exportingPdf: false } }));
                }
              }} disabled={contractModal.success.exportingPdf} style={{ padding: "10px 20px", background: contractModal.success.exportingPdf ? "var(--borderActive)" : "#ff6b4a", border: "none", borderRadius: 8, color: "#fff", cursor: contractModal.success.exportingPdf ? "wait" : "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center" }}>
                {contractModal.success.exportingPdf ? <><span style={{ animation: "pulse 1s ease infinite" }}>⟳</span> Exporting PDF...</> : <>📄 Export to PDF</>}
              </button>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
            <div style={{ fontSize: 9, color: "var(--textGhost)" }}>
              💡 To send for signature: Open the Google Doc → File → eSignature → add signer's email
            </div>
            <button onClick={() => setContractModal(null)} style={{ padding: "8px 16px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--textMuted)", cursor: "pointer", fontSize: 11, whiteSpace: "nowrap" }}>Done</button>
          </div>
        </div>
      ) : (
      <div style={{ padding: "16px 24px", borderTop: "1px solid var(--borderSub)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 10, color: "var(--textGhost)" }}>
            Saved to ADMIN/VENDORS/{contractModal.vendor.name}/Agreement/
          </div>
          {contractModal.hasDraft && <span style={{ fontSize: 8, padding: "1px 6px", borderRadius: 3, background: "#3da5db15", color: "#3da5db", fontWeight: 700, border: "1px solid #3da5db25" }}>DRAFT</span>}
          {contractModal.draftSaved && <span style={{ fontSize: 9, color: "#4ecb71", fontWeight: 600, animation: "fadeInUp 0.3s ease" }}>✓ Draft saved</span>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setContractModal(null)} style={{ padding: "9px 18px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--textMuted)", cursor: "pointer", fontSize: 12 }}>Cancel</button>
          <button onClick={saveContractDraft} disabled={contractModal.generating} style={{ padding: "9px 18px", background: "var(--bgCard)", border: "1px solid #3da5db30", borderRadius: 8, color: "#3da5db", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            💾 Save Draft
          </button>
          <button onClick={generateContract} disabled={contractModal.generating} style={{ padding: "9px 24px", background: contractModal.generating ? "var(--borderActive)" : ct === "contractor" ? "#ff6b4a" : "#9b6dff", border: "none", borderRadius: 8, color: "#fff", cursor: contractModal.generating ? "wait" : "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            {contractModal.generating ? <><span style={{ animation: "pulse 1s ease infinite" }}>⟳</span> Generating...</> : <>📝 Generate Contract</>}
          </button>
        </div>
      </div>
      )}
      {contractModal.error && (
        <div style={{ padding: "10px 24px", background: "#e8545410", borderTop: "1px solid #e8545425", fontSize: 11, color: "#e85454" }}>
          ⚠️ {contractModal.error}
        </div>
      )}
    </div>
  </div>
  );
})()}

{/* ═══ FILE RENAME MODAL ═══ */}
{renameModal && (() => {
  const DOC_LABELS = { coi: 'Certificate of Insurance', w9: 'W-9 Tax Form', contract: 'Contract', quote: 'Quote', invoice: 'Invoice' };
  const isDrive = renameModal.mode === 'drive';
  const isVersioned = !isDrive && (renameModal.compKey === 'invoice' || renameModal.compKey === 'quote');
  const versionLabel = renameModal.compKey === 'quote' ? 'Quote' : 'Invoice';
  return (
  <div style={{ position: "fixed", inset: 0, zIndex: 10001, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) setRenameModal(null); }}>
    <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 16, width: 480, maxWidth: "92vw", animation: "fadeUp 0.2s ease", overflow: "hidden" }}>
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--borderSub)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>RENAME BEFORE UPLOAD</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{isDrive ? `📁 Upload to ${renameModal.folderName || 'Drive'}` : `📄 ${DOC_LABELS[renameModal.compKey] || renameModal.compKey?.toUpperCase()}`}</div>
        </div>
        <button onClick={() => setRenameModal(null)} style={{ background: "none", border: "none", color: "var(--textFaint)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "4px" }}>✕</button>
      </div>
      <div style={{ padding: "20px 24px" }}>
        {!isDrive && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 6 }}>VENDOR / CONTRACTOR</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{renameModal.vendorName}</div>
        </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 6 }}>ORIGINAL FILE</div>
          <div style={{ fontSize: 11, color: "var(--textMuted)", fontFamily: "'JetBrains Mono', monospace", padding: "8px 12px", background: "var(--bgCard)", borderRadius: 6, border: "1px solid var(--borderSub)", wordBreak: "break-all" }}>{renameModal.originalName}</div>
        </div>
        {isVersioned && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 6 }}>PROJECT CODE</div>
            <input value={renameModal.projectCode || project?.code || ''} onChange={e => setRenameModal(prev => ({ ...prev, projectCode: e.target.value, suggestedName: `${e.target.value}_${prev.vendorName.replace(/[^a-zA-Z0-9 &'()-]/g, '').replace(/\s+/g, '_').trim()}_${versionLabel}_V${prev.version || '1'}${prev.ext}` }))} style={{ width: "100%", padding: "8px 12px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--text)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: "none" }} placeholder="e.g. 26-GT-BLOOM" />
          </div>
        )}
        {isVersioned && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 6 }}>VERSION</div>
            <input type="number" min="1" value={renameModal.version || '1'} onChange={e => { const v = e.target.value; setRenameModal(prev => ({ ...prev, version: v, suggestedName: `${prev.projectCode || project?.code || 'PROJ'}_${prev.vendorName.replace(/[^a-zA-Z0-9 &'()-]/g, '').replace(/\s+/g, '_').trim()}_${versionLabel}_V${v}${prev.ext}` })); }} style={{ width: 80, padding: "8px 12px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--text)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: "none" }} />
          </div>
        )}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 6 }}>FILE NAME</div>
          <input value={renameModal.suggestedName} onChange={e => setRenameModal(prev => ({ ...prev, suggestedName: e.target.value }))} style={{ width: "100%", padding: "10px 14px", background: "var(--bgCard)", border: "1px solid var(--borderActive)", borderRadius: 8, color: "var(--text)", fontSize: 13, fontWeight: 600, outline: "none" }} onFocus={e => { const val = e.target.value; const dotIdx = val.lastIndexOf('.'); if (dotIdx > 0) e.target.setSelectionRange(0, dotIdx); }} autoFocus onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('rename-modal-upload-btn')?.click(); } }} />
        </div>
        <div style={{ fontSize: 9, color: "var(--textGhost)", marginBottom: 20 }}>
          {isDrive ? "Rename the file before uploading to Drive" : isVersioned ? `Format: ProjectCode_Vendor_Name_${versionLabel}_V#.ext` : `Format: ${renameModal.compKey === 'coi' ? 'COI' : renameModal.compKey === 'w9' ? 'W9' : renameModal.compKey === 'quote' ? 'Quote' : 'Contract'} - Vendor Name.ext`}
        </div>
      </div>
      <div style={{ padding: "16px 24px", borderTop: "1px solid var(--borderSub)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button onClick={() => setRenameModal(null)} style={{ padding: "8px 20px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--textFaint)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button>
        <button id="rename-modal-upload-btn" onClick={() => {
          const newName = renameModal.suggestedName.trim();
          if (!newName) return;
          const renamedFile = new File([renameModal.file], newName, { type: renameModal.file.type });
          if (isDrive) {
            driveUploadFile(renamedFile);
          } else {
            executeFileDrop(renameModal.vendorId, renameModal.compKey, renamedFile, renameModal.drivePath, renameModal.basePath);
          }
          setRenameModal(null);
        }} style={{ padding: "8px 24px", background: "#ff6b4a", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
          Upload
        </button>
      </div>
    </div>
  </div>
  );
})()}

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
  );
}
