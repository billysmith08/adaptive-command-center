"use client";
import React from "react";

export default function VendorsTab({
  project, vendors, setVendors, projectVendors,
  vendorSearch, setVendorSearch, handleVendorSearchChange,
  expandedVendor, setExpandedVendor, editingVendorId, setEditingVendorId,
  selectedVendorIds, setSelectedVendorIds, showAddVendor, setShowAddVendor,
  vendorForm, setVendorForm, vendorLinkCopied, setVendorLinkCopied,
  vendorSearching, setVendorSearching,
  docPreview, setDocPreview, driveError, setDriveError,
  driveResults, setDriveResults, driveVendorCache, setDriveVendorCache,
  uploadLog, copyToClipboard,
  setActiveProjectId, setActiveTab,
  COMP_KEYS, DEPT_OPTIONS, DeptTag, DocDropZone,
  appSettings, contacts, intakeUrlBase,
  suggestFileName, syncProjectVendors, uploadVendorDoc,
}) {
  return (
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
            const docKeys = ["coi", "w9", "quote", "contract", "invoice"];
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
      {[...vendors].sort((a, b) => (a.name || "").localeCompare(b.name || "")).filter((v, i, arr) => arr.findIndex(x => x.name?.toLowerCase().trim() === v.name?.toLowerCase().trim()) === i).map((v, vi) => {
        const done = COMP_KEYS.filter(ck => v.compliance[ck.key]?.done).length;
        const isExp = expandedVendor === v.id;
        const isSelected = selectedVendorIds.has(v.id);
        return (
          <div key={v.id} style={{ background: "var(--bgInput)", border: isSelected ? "1px solid #3da5db40" : "1px solid var(--borderSub)", borderRadius: 12, animation: `fadeUp 0.25s ease ${vi * 0.04}s both`, transition: "border-color 0.15s", position: "relative" }}>
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
              <button onClick={() => setExpandedVendor(isExp ? null : v.id)} style={{ background: isExp ? "#ff6b4a10" : "var(--bgInput)", border: `1px solid ${isExp ? "#ff6b4a30" : "var(--borderSub)"}`, color: isExp ? "#ff6b4a" : "var(--textFaint)", cursor: "pointer", fontSize: 18, padding: "6px 10px", borderRadius: 6, transform: isExp ? "rotate(90deg)" : "rotate(0)", transition: "all 0.15s", lineHeight: 1 }} title={isExp ? "Collapse" : "Expand details"}>▶</button>
            </div>
            {isExp && (
              <div style={{ padding: "0 18px 16px", borderTop: "1px solid var(--border)", animation: "fadeUp 0.2s ease" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginTop: 14 }}>
                  {COMP_KEYS.map(ck => {
                    const info = v.compliance[ck.key] || { done: false, file: null, date: null, link: null };
                    const dp = `${ck.drivePrefix}/${v.name.replace(/[^a-zA-Z0-9 &'-]/g, '').trim()}/`;
                    const isVersionedDoc = ck.key === 'invoice' || ck.key === 'quote';
                    const versionFiles = isVersionedDoc && Array.isArray(info.files) ? info.files : [];
                    return (
                      <div key={ck.key} style={{ background: info.done ? "#4ecb7108" : "#e8545408", border: `1px solid ${info.done ? "#4ecb7130" : "#e8545420"}`, borderRadius: 8, padding: 12, transition: "border-color 0.2s" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: info.done ? "#4ecb71" : "#e85454", letterSpacing: 0.5, marginBottom: 6 }}>{ck.fullLabel}{isVersionedDoc && versionFiles.length > 0 ? ` (V${versionFiles.length})` : ""}</div>
                        {info.done ? <>
                          <div style={{ fontSize: 11, color: "var(--textSub)", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}><span>📄</span> {info.file || "Received"}</div>
                          <div style={{ fontSize: 9, color: "var(--textFaint)", marginBottom: 6 }}>Uploaded {info.date}</div>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            <button onClick={(e) => { e.stopPropagation(); const url = info.link || `https://drive.google.com/drive/search?q=${encodeURIComponent(info.file || ck.fullLabel)}`; window.open(url, '_blank'); }} style={{ padding: "3px 7px", background: "#3da5db10", border: "1px solid #3da5db25", borderRadius: 4, color: "#3da5db", cursor: "pointer", fontSize: 8, fontWeight: 600 }}>📂 Open</button>
                            <button onClick={(e) => { e.stopPropagation(); const input = document.createElement("input"); input.type = "file"; input.accept = ".pdf,.doc,.docx,.jpg,.png,.xlsx"; input.onchange = (ev) => { const f = ev.target.files[0]; if (f) handleFileDrop(v.id, ck.key, f, dp, ck.drivePrefix); }; input.click(); }} style={{ padding: "3px 7px", background: "#dba94e10", border: "1px solid #dba94e25", borderRadius: 4, color: "#dba94e", cursor: "pointer", fontSize: 8, fontWeight: 600 }}>{isVersionedDoc ? "📤 New Ver." : "🔄 Replace"}</button>
                            <button onClick={(e) => { e.stopPropagation(); handleClearCompliance(v.id, ck.key); }} style={{ padding: "3px 7px", background: "#e8545410", border: "1px solid #e8545425", borderRadius: 4, color: "#e85454", cursor: "pointer", fontSize: 8, fontWeight: 600 }}>✕ Clear</button>
                          </div>
                          {/* Version history */}
                          {isVersionedDoc && versionFiles.length > 1 && (
                            <div style={{ marginTop: 8, borderTop: "1px solid var(--borderSub)", paddingTop: 4 }}>
                              <div style={{ fontSize: 8, fontWeight: 700, color: "var(--textFaint)", letterSpacing: 0.3, marginBottom: 3 }}>VERSIONS</div>
                              {versionFiles.slice().reverse().map((f, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 0" }}>
                                  <span style={{ fontSize: 9, color: "var(--textMuted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{f.file}</span>
                                  {f.link && <button onClick={(e) => { e.stopPropagation(); window.open(f.link, '_blank'); }} style={{ padding: "1px 5px", background: "#3da5db10", border: "1px solid #3da5db20", borderRadius: 3, color: "#3da5db", cursor: "pointer", fontSize: 7, fontWeight: 700 }}>Open</button>}
                                </div>
                              ))}
                            </div>
                          )}
                        </> : <div style={{ fontSize: 11, color: "#6a4a4a" }}>Not received — drop above</div>}
                        <div style={{ fontSize: 8, color: "var(--textGhost)", fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>📁 .../{dp.split("/").slice(-3).join("/")}</div>
                      </div>
                    );
                  })}
                </div>
                {/* ── ASSIGNED TO PROJECTS ── */}
                {(() => {
                  const vendorProjects = Object.entries(projectVendors).filter(([pid, vList]) => Array.isArray(vList) && vList.some(pv => pv.name === v.name || pv.email === v.email)).map(([pid]) => projects.find(p => p.id === pid)).filter(Boolean);
                  if (vendorProjects.length === 0) return null;
                  return (
                    <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8 }}>
                      <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>ASSIGNED TO PROJECTS ({vendorProjects.length})</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {vendorProjects.map(p => (
                          <span key={p.id} onClick={(e) => { e.stopPropagation(); setActiveProjectId(p.id); setActiveTab("vendors"); }} style={{ padding: "3px 8px", background: "#3da5db10", border: "1px solid #3da5db25", borderRadius: 6, fontSize: 10, color: "#3da5db", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#3da5db20"} onMouseLeave={e => e.currentTarget.style.background = "#3da5db10"}>
                            {p.name}
                            <span style={{ fontSize: 8, padding: "0 3px", borderRadius: 3, background: p.status === "In-Production" ? "#4ecb7115" : p.status === "Wrap" ? "#8a868015" : "#dba94e15", color: p.status === "In-Production" ? "#4ecb71" : p.status === "Wrap" ? "#8a8680" : "#dba94e", fontWeight: 700 }}>{p.status}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--textFaint)" }}>
                    <span onClick={(e) => { e.stopPropagation(); copyToClipboard(v.phone || v.contact, "Phone", e); }} style={{ cursor: "pointer", borderRadius: 4, padding: "2px 6px", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgCard)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>📞 {v.contact}{v.phone ? ` · ${v.phone}` : ""} <span style={{ fontSize: 8, color: "var(--textGhost)", marginLeft: 2 }}>⧉</span></span>
                    <span onClick={(e) => { e.stopPropagation(); copyToClipboard(v.email, "Email", e); }} style={{ cursor: "pointer", borderRadius: 4, padding: "2px 6px", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgCard)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>📧 {v.email} <span style={{ fontSize: 8, color: "var(--textGhost)", marginLeft: 2 }}>⧉</span></span>
                    {v.title && <span>💼 {v.title}</span>}
                    {v.address && <span onClick={(e) => { e.stopPropagation(); copyToClipboard(v.address, "Address", e); }} style={{ cursor: "pointer", borderRadius: 4, padding: "2px 6px", transition: "background 0.15s", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgCard)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"} title={v.address}>📍 {v.address} <span style={{ fontSize: 8, color: "var(--textGhost)", marginLeft: 2 }}>⧉</span></span>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => openContractModal(v)} style={{ padding: "4px 10px", background: v.contractDraft ? "#3da5db10" : "#9b6dff10", border: `1px solid ${v.contractDraft ? "#3da5db25" : "#9b6dff25"}`, borderRadius: 5, color: v.contractDraft ? "#3da5db" : "#9b6dff", cursor: "pointer", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>{v.contractDraft ? "📝 Resume Draft" : "📝 Contract"}</button>
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
  );
}
