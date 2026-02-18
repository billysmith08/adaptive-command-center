"use client";
import React, { useState, useRef } from "react";
import { PhoneWithCode, AddressAutocomplete, processAvatarImage } from "./shared/UIComponents";

const SettingsModal = React.memo(function SettingsModal({
  showSettings, setShowSettings,
  settingsDirty, setSettingsDirty,
  settingsTab, setSettingsTab,
  appSettings, setAppSettings,
  user,
  isAdmin, isOwner,
  settingsSaving,
  saveSettings,
  editingUserPerms, setEditingUserPerms,
  setPreviewingAs,
  textSize, setTextSize,
  textScale,
  driveDiag, setDriveDiag,
  driveDiagLoading, setDriveDiagLoading,
  driveTestSearch, setDriveTestSearch,
  backupStatus, setBackupStatus,
  lastBackup, setLastBackup,
  setVersionHistory,
  setShowVersionHistory,
  folderAuditResult, setFolderAuditResult,
  setClipboardToast,
  setAvatarCropSrc, setAvatarCropCallback,
  updateAvailable,
  projects,
  approveUser, denyUser,
  getUserPerms,
  extractDriveId,
  pushAppVersion,
  ROLE_OPTIONS,
  SECTION_OPTIONS,
  APP_VERSION,
}) {
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
                                          let updated;
                                          if (checked) {
                                            // Unchecking: remove this project and its sub-projects
                                            const childIds = projects.filter(c => c.parentId === p.id && !c.archived).map(c => c.id);
                                            updated = current.filter(id => id !== p.id && !childIds.includes(id));
                                          } else {
                                            // Checking: add this project and, if it's a parent, its sub-projects
                                            const childIds = projects.filter(c => c.parentId === p.id && !c.archived).map(c => c.id);
                                            updated = [...new Set([...current, p.id, ...childIds])];
                                          }
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
  );
});

export default SettingsModal;
