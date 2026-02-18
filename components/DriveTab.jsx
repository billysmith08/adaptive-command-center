"use client";
import React from "react";

function DriveTab({
  project,
  setProjects,
  projDriveEnsuring,
  projDrivePath,
  projDriveUploading,
  projDriveLoading,
  projDriveFiles,
  projDriveFileRef,
  isAdmin,
  driveAccessPanel,
  setDriveAccessPanel,
  driveShareEmail,
  setDriveShareEmail,
  driveShareRole,
  setDriveShareRole,
  driveShareLoading,
  drivePermissions,
  setRenameModal,
  driveBrowse,
  ensureProjectDrive,
  driveBrowseBreadcrumb,
  loadDrivePermissions,
  shareDriveAccess,
  revokeDriveAccess,
  driveGetIcon,
  driveFormatSize,
}) {
  return (
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
                    <div style={{ marginTop: 16 }}>
                      <button onClick={() => {
                        const input = prompt("Or paste a Google Drive folder URL or folder ID to link directly:");
                        if (!input) return;
                        let folderId = input.trim();
                        const urlMatch = folderId.match(/folders\/([a-zA-Z0-9_-]+)/);
                        if (urlMatch) folderId = urlMatch[1];
                        if (!folderId) return;
                        const folderLink = "https://drive.google.com/drive/folders/" + folderId;
                        setProjects(prev => prev.map(p => p.id === project.id ? { ...p, driveFolderId: folderId, driveFolderLink: folderLink, drivePath: "Linked folder" } : p));
                        driveBrowse(folderId, project.code || project.name, true);
                      }} style={{ padding: "8px 20px", background: "transparent", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--textFaint)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                        🔗 Link Existing Folder
                      </button>
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
                    <div style={{ marginTop: 12 }}>
                      <button onClick={() => {
                        const input = prompt("Paste Google Drive folder URL or folder ID:");
                        if (!input) return;
                        let folderId = input.trim();
                        const urlMatch = folderId.match(/folders\/([a-zA-Z0-9_-]+)/);
                        if (urlMatch) folderId = urlMatch[1];
                        if (!folderId) return;
                        const folderLink = "https://drive.google.com/drive/folders/" + folderId;
                        setProjects(prev => prev.map(p => p.id === project.id ? { ...p, driveFolderId: folderId, driveFolderLink: folderLink, drivePath: "Linked folder" } : p));
                        driveBrowse(folderId, project.code || project.name, true);
                      }} style={{ padding: "8px 20px", background: "transparent", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--textFaint)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                        🔗 Link Existing Folder
                      </button>
                    </div>
                  </div>
                ) : projDriveEnsuring ? (
                  <div style={{ textAlign: "center", padding: 60, color: "var(--textFaint)" }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                    Creating folder structure...
                  </div>
                ) : (
                  /* File Browser */
                  <div
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.outline = "2px dashed #4ecb71"; e.currentTarget.style.outlineOffset = "-2px"; }}
                    onDragLeave={e => { e.currentTarget.style.outline = "none"; }}
                    onDrop={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.outline = "none"; const f = e.dataTransfer.files[0]; if (f) { setRenameModal({ file: f, mode: 'drive', suggestedName: f.name, originalName: f.name, ext: f.name.includes('.') ? '.' + f.name.split('.').pop() : '', folderName: projDrivePath[projDrivePath.length - 1]?.name || '' }); } }}
                  >
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
                        {isAdmin && project.driveFolderId && (
                          <button onClick={() => { setDriveAccessPanel(!driveAccessPanel); if (!driveAccessPanel) loadDrivePermissions(); }} style={{ fontSize: 10, color: driveAccessPanel ? "#dba94e" : "var(--textFaint)", fontWeight: 600, padding: "2px 8px", background: driveAccessPanel ? "#dba94e10" : "var(--bgInput)", border: `1px solid ${driveAccessPanel ? "#dba94e30" : "var(--borderSub)"}`, borderRadius: 4, cursor: "pointer" }}>
                            🔐 Access
                          </button>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input type="file" ref={projDriveFileRef} onChange={e => { const f = e.target.files[0]; if (f) { setRenameModal({ file: f, mode: 'drive', suggestedName: f.name, originalName: f.name, ext: f.name.includes('.') ? '.' + f.name.split('.').pop() : '', folderName: projDrivePath[projDrivePath.length - 1]?.name || '' }); } e.target.value = ""; }} style={{ display: "none" }} />
                        <button onClick={() => projDriveFileRef.current?.click()} disabled={projDriveUploading} style={{ padding: "6px 14px", background: "#4ecb7110", border: "1px solid #4ecb7130", borderRadius: 6, color: "#4ecb71", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                          {projDriveUploading ? "⏳ Uploading..." : "⬆ Upload"}
                        </button>
                        <button onClick={() => driveBrowseBreadcrumb(projDrivePath.length - 1)} disabled={projDriveLoading} style={{ padding: "6px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--textMuted)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                          🔄 Refresh
                        </button>
                      </div>
                    </div>

                    {/* Drive Access Panel */}
                    {driveAccessPanel && isAdmin && (
                      <div style={{ marginBottom: 12, padding: 14, background: "var(--bgInput)", border: "1px solid #dba94e30", borderRadius: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#dba94e", letterSpacing: 0.3 }}>🔐 DRIVE ACCESS</div>
                          <span style={{ fontSize: 9, color: "var(--textGhost)" }}>Share this project's Drive folder with external collaborators</span>
                        </div>
                        {/* Add new */}
                        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                          <input value={driveShareEmail} onChange={e => setDriveShareEmail(e.target.value)} placeholder="email@example.com" onKeyDown={e => e.key === 'Enter' && shareDriveAccess()} style={{ flex: 1, padding: "6px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--text)", fontSize: 11 }} />
                          <select value={driveShareRole} onChange={e => setDriveShareRole(e.target.value)} style={{ padding: "6px 8px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--text)", fontSize: 10 }}>
                            <option value="reader">Viewer</option>
                            <option value="commenter">Commenter</option>
                            <option value="writer">Editor</option>
                          </select>
                          <button onClick={shareDriveAccess} disabled={driveShareLoading || !driveShareEmail} style={{ padding: "6px 14px", background: "#4ecb7110", border: "1px solid #4ecb7130", borderRadius: 6, color: "#4ecb71", fontSize: 10, fontWeight: 700, cursor: "pointer", opacity: driveShareLoading || !driveShareEmail ? 0.5 : 1 }}>
                            {driveShareLoading ? "..." : "+ Share"}
                          </button>
                        </div>
                        {/* Current permissions */}
                        {drivePermissions.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {drivePermissions.map((p, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px", background: "var(--bgCard)", borderRadius: 6, border: "1px solid var(--borderSub)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 10, color: "var(--text)", fontWeight: 600 }}>{p.name || p.email}</span>
                                  {p.name && <span style={{ fontSize: 9, color: "var(--textFaint)" }}>{p.email}</span>}
                                  <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: p.role === "owner" ? "#dba94e15" : p.role === "writer" ? "#4ecb7115" : "#3da5db15", color: p.role === "owner" ? "#dba94e" : p.role === "writer" ? "#4ecb71" : "#3da5db", fontWeight: 700 }}>{p.role}</span>
                                </div>
                                {p.role !== "owner" && p.role !== "organizer" && (
                                  <button onClick={() => revokeDriveAccess(p.email)} style={{ padding: "2px 6px", background: "#e8545408", border: "1px solid #e8545420", borderRadius: 4, color: "#e85454", cursor: "pointer", fontSize: 8, fontWeight: 700 }}>Revoke</button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: 10, color: "var(--textGhost)", textAlign: "center", padding: 6 }}>Loading permissions...</div>
                        )}
                      </div>
                    )}

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

                    {/* Drive folder path + relink */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 9, color: "var(--textGhost)", fontFamily: "'JetBrains Mono', monospace" }}>📁 {project.drivePath || ("CLIENTS/" + project.client + "/2026/" + project.code)}</span>
                      <button onClick={() => {
                        const input = prompt("Paste Google Drive folder URL or folder ID:\n\n(e.g. https://drive.google.com/drive/folders/1abc... or just the folder ID)", project.driveFolderId || "");
                        if (!input) return;
                        let folderId = input.trim();
                        const urlMatch = folderId.match(/folders\/([a-zA-Z0-9_-]+)/);
                        if (urlMatch) folderId = urlMatch[1];
                        if (!folderId) return;
                        const folderLink = "https://drive.google.com/drive/folders/" + folderId;
                        setProjects(prev => prev.map(p => p.id === project.id ? { ...p, driveFolderId: folderId, driveFolderLink: folderLink, drivePath: "Custom linked folder" } : p));
                        driveBrowse(folderId, project.code || project.name, true);
                      }} style={{ padding: "2px 8px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 4, color: "var(--textFaint)", cursor: "pointer", fontSize: 9, fontWeight: 600 }} title="Change Drive folder">✎ Relink</button>
                      <button onClick={() => {
                        setProjects(prev => prev.map(p => p.id === project.id ? { ...p, driveFolderId: undefined, driveFolderLink: undefined, drivePath: undefined } : p));
                      }} style={{ padding: "2px 8px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 4, color: "var(--textGhost)", cursor: "pointer", fontSize: 9, fontWeight: 600 }} title="Unlink Drive folder">✕ Unlink</button>
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
                      <div style={{ border: "1px solid var(--borderSub)", borderRadius: 10, overflow: "hidden", background: "var(--bgInput)" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 140px 60px", padding: "8px 14px", background: "var(--bgSub)", borderBottom: "1px solid var(--borderSub)" }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--textGhost)", letterSpacing: 0.5 }}>NAME</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--textGhost)", letterSpacing: 0.5 }}>SIZE</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--textGhost)", letterSpacing: 0.5 }}>MODIFIED</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--textGhost)", letterSpacing: 0.5, textAlign: "right" }}>OPEN</span>
                        </div>
                        {projDriveFiles.map(item => (
                          <div key={item.id} onClick={() => { if (item.isFolder) driveBrowse(item.id, item.name); }} style={{ display: "grid", gridTemplateColumns: "1fr 100px 140px 60px", padding: "10px 14px", borderBottom: "1px solid var(--borderSub)", cursor: item.isFolder ? "pointer" : "default", transition: "background 0.15s", background: "var(--bgCard)" }}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--bgHover)"}
                            onMouseLeave={e => e.currentTarget.style.background = "var(--bgCard)"}
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
  );
}

export default DriveTab;
