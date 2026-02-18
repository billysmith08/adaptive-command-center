"use client";
import React from "react";

const GlobalContactsTab = React.memo(function GlobalContactsTab({
  // State
  contactSearch,
  setContactSearch,
  contactFilterType,
  setContactFilterType,
  contactFilterResource,
  setContactFilterResource,
  contacts,
  setContacts,
  selectedContacts,
  setSelectedContacts,
  partnerColWidths,
  setPartnerColWidths,
  partnerSort,
  setPartnerSort,
  assignContactPopover,
  setAssignContactPopover,
  projects,
  projectVendors,
  driveComplianceMap,
  activeProjectId,
  appSettings,
  clients,
  setContactForm,
  setShowAddContact,
  setActiveProjectId,
  setActiveTab,
  setClipboardToast,
  setVendors,
  // Callbacks
  handleVCardUpload,
  handleCSVUpload,
  emailExport,
  copyToClipboard,
  viewContact,
  downloadVCard,
  pushUndo,
  colsToGrid,
  renderResizeHandle,
  updateProject2,
  handleFileDrop,
  // Constants
  emptyContact,
}) {
  return (
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
                        <button onClick={() => { if (confirm(`Delete ${selectedContacts.size} selected contact(s)?`)) { pushUndo("Delete contacts"); const toDelete = contacts.filter(c => selectedContacts.has(c.id)); const dismissed = new Set(JSON.parse(localStorage.getItem("adptv_dismissed_contacts") || "[]")); toDelete.forEach(c => { if (c.company) dismissed.add(c.name.toLowerCase().trim() + "|||" + c.company.toLowerCase().trim()); }); localStorage.setItem("adptv_dismissed_contacts", JSON.stringify([...dismissed])); setContacts(prev => prev.filter(c => !selectedContacts.has(c.id))); setSelectedContacts(new Set()); } }} style={{ padding: "4px 12px", background: "#e8545415", border: "1px solid #e8545430", borderRadius: 5, color: "#e85454", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>🗑 Delete Selected</button>
                        <button onClick={() => setSelectedContacts(new Set())} style={{ padding: "4px 12px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "var(--textFaint)", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>✕ Clear</button>
                      </div>
                    )}
                    <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 200px)" }}>
                    <div style={{ minWidth: 1600 }}>
                    <div style={{ display: "grid", gridTemplateColumns: colsToGrid(partnerColWidths), padding: "10px 16px", borderBottom: "1px solid var(--borderSub)", fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1, position: "sticky", top: 0, background: "var(--bgInput)", zIndex: 5, minWidth: 1600 }}>
                      {[["", ""], ["NAME", "name"], ["COMPANY", "company"], ["TYPE", "contactType"], ["RESOURCE TYPE", "resourceType"], ["POSITION", "position"], ["PHONE", "phone"], ["EMAIL", "email"], ["ADDRESS", "address"], ["PROJECTS", ""], ["ACTIONS", ""], ["DOCS", ""]].map(([label, sortKey], i) => (
                        <span key={i} style={{ position: "relative", userSelect: "none", cursor: sortKey ? "pointer" : "default", display: "flex", alignItems: "center", gap: 3 }} onClick={() => { if (!sortKey) return; setPartnerSort(prev => prev.col === sortKey ? { col: sortKey, dir: prev.dir === "asc" ? "desc" : "asc" } : { col: sortKey, dir: "asc" }); }}>
                          {i === 0 ? <input type="checkbox" checked={contacts.length > 0 && selectedContacts.size === contacts.filter(c => !contactSearch || c.name.toLowerCase().includes(contactSearch.toLowerCase()) || (c.email || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.company || "").toLowerCase().includes(contactSearch.toLowerCase())).length} onChange={(e) => { if (e.target.checked) { const visible = contacts.filter(c => !contactSearch || c.name.toLowerCase().includes(contactSearch.toLowerCase()) || (c.email || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.company || "").toLowerCase().includes(contactSearch.toLowerCase())); setSelectedContacts(new Set(visible.map(c => c.id))); } else { setSelectedContacts(new Set()); } }} style={{ cursor: "pointer" }} /> : <>{label}{partnerSort.col === sortKey && <span style={{ color: "#ff6b4a", fontSize: 8 }}>{partnerSort.dir === "asc" ? "▲" : "▼"}</span>}</>}
                          {i < partnerColWidths.length - 1 && renderResizeHandle(setPartnerColWidths, i)}
                        </span>
                      ))}
                    </div>
                    {contacts.filter(c => (!contactSearch || c.name.toLowerCase().includes(contactSearch.toLowerCase()) || (c.email || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.company || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.position || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.address || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.resourceType || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.contactType || "").toLowerCase().includes(contactSearch.toLowerCase())) && (!contactFilterType || c.contactType === contactFilterType) && (!contactFilterResource || c.resourceType === contactFilterResource)).sort((a, b) => { if (!partnerSort.col) return 0; const av = (a[partnerSort.col] || "").toString().toLowerCase(); const bv = (b[partnerSort.col] || "").toString().toLowerCase(); return partnerSort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av); }).map(c => (
                      <div key={c.id} style={{ display: "grid", gridTemplateColumns: colsToGrid(partnerColWidths), padding: "10px 16px", borderBottom: "1px solid var(--calLine)", alignItems: "center", fontSize: 12, background: selectedContacts.has(c.id) ? "#ff6b4a08" : "transparent", minWidth: 1600 }}>
                        <span><input type="checkbox" checked={selectedContacts.has(c.id)} onChange={(e) => { const next = new Set(selectedContacts); if (e.target.checked) next.add(c.id); else next.delete(c.id); setSelectedContacts(next); }} style={{ cursor: "pointer" }} /></span>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {(() => {
                            // Check if contact has avatar or matches a user profile with avatar
                            const profileAvatar = c.avatar || (c.email && (appSettings.userProfiles || {})[c.email]?.avatar) || null;
                            return profileAvatar ? (
                              <img src={profileAvatar} alt="" onClick={(e) => viewContact(c, e)} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "1px solid #ff6b4a30", flexShrink: 0, cursor: "pointer" }} />
                            ) : (
                              <div onClick={(e) => viewContact(c, e)} style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #ff6b4a20, #ff4a6b20)", border: "1px solid #ff6b4a30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#ff6b4a", flexShrink: 0, cursor: "pointer" }}>
                                {c.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                              </div>
                            );
                          })()}
                          <div style={{ overflow: "hidden" }}>
                            <div style={{ fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                            {c.company && <div style={{ fontSize: 10, color: "var(--textFaint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.company}</div>}
                            {!c.company && c.department && <div style={{ fontSize: 9, color: "var(--textFaint)" }}>{c.department}</div>}
                          </div>
                        </div>
                        <span style={{ color: "var(--textMuted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.company || "—"}</span>
                        <span style={{ fontSize: 9 }}>{c.contactType ? <span style={{ padding: "2px 7px", background: c.contactType === "Client" ? "#3da5db10" : c.contactType === "Vendor" ? "#4ecb7110" : "#9b6dff10", border: `1px solid ${c.contactType === "Client" ? "#3da5db20" : c.contactType === "Vendor" ? "#4ecb7120" : "#9b6dff20"}`, borderRadius: 3, fontSize: 9, fontWeight: 600, color: c.contactType === "Client" ? "#3da5db" : c.contactType === "Vendor" ? "#4ecb71" : "#9b6dff", whiteSpace: "nowrap" }}>{c.contactType}</span> : "—"}{(c.clientAssociation || clients.some(cl => cl.name.toLowerCase() === (c.company || "").toLowerCase())) && <span style={{ marginLeft: 3, fontSize: 8, color: "#3da5db" }} title={`Linked: ${c.clientAssociation || clients.find(cl => cl.name.toLowerCase() === (c.company || "").toLowerCase())?.name}`}>🔗</span>}</span>
                        <span style={{ color: "var(--textMuted)", fontSize: 10 }}>{c.resourceType ? <span style={{ padding: "2px 7px", background: "#3da5db10", border: "1px solid #3da5db20", borderRadius: 3, fontSize: 9, fontWeight: 600, color: "#3da5db", whiteSpace: "nowrap" }}>{c.resourceType}</span> : "—"}</span>
                        <span style={{ color: "var(--textMuted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.position || "—"}</span>
                        <span onClick={(e) => c.phone && copyToClipboard(c.phone, "Phone", e)} style={{ color: "var(--textMuted)", fontSize: 11, cursor: c.phone ? "pointer" : "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} onMouseEnter={e => { if (c.phone) e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={e => e.currentTarget.style.color = "var(--textMuted)"}>{c.phone || "—"} {c.phone && <span style={{ fontSize: 7, color: "var(--textGhost)" }}>⧉</span>}</span>
                        <span onClick={(e) => c.email && copyToClipboard(c.email, "Email", e)} style={{ color: "var(--textMuted)", fontSize: 11, cursor: c.email ? "pointer" : "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} onMouseEnter={e => { if (c.email) e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={e => e.currentTarget.style.color = "var(--textMuted)"}>{c.email || "—"} {c.email && <span style={{ fontSize: 7, color: "var(--textGhost)" }}>⧉</span>}</span>
                        <span onClick={(e) => c.address && copyToClipboard(c.address, "Address", e)} style={{ color: "var(--textMuted)", fontSize: 10, cursor: c.address ? "pointer" : "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} onMouseEnter={e => { if (c.address) e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={e => e.currentTarget.style.color = "var(--textMuted)"} title={c.address || ""}>{c.address || "—"} {c.address && <span style={{ fontSize: 7, color: "var(--textGhost)" }}>⧉</span>}</span>
                        {/* PROJECTS cell */}
                        {(() => {
                          const cName = (c.name || "").trim();
                          const assignedProjects = !cName ? [] : projects.filter(p => {
                            if (p.archived) return false;
                            const people = [...(p.producers || []), ...(p.managers || []), ...(p.staff || [])];
                            const contactPeople = [...(p.pocs || []).map(x => (x.name || "").trim()), ...(p.clientContacts || []).map(x => (x.name || "").trim()), ...(p.billingContacts || []).map(x => (x.name || "").trim())];
                            if (people.includes(cName) || contactPeople.includes(cName)) return true;
                            return (projectVendors[p.id] || []).some(v => (v.contact || "").trim() === cName);
                          });
                          return assignedProjects.length === 0
                            ? <span style={{ fontSize: 10, color: "var(--textGhost)" }}>—</span>
                            : <div style={{ display: "flex", gap: 3, flexWrap: "wrap", overflow: "hidden" }}>{assignedProjects.slice(0, 3).map(p => <span key={p.id} onClick={(e) => { e.stopPropagation(); setActiveProjectId(p.id); setActiveTab("overview"); }} style={{ padding: "2px 6px", background: "#9b6dff10", border: "1px solid #9b6dff20", borderRadius: 3, fontSize: 8, fontWeight: 700, color: "#9b6dff", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 100 }} title={p.name}>{p.name}</span>)}{assignedProjects.length > 3 && <span style={{ fontSize: 8, color: "var(--textGhost)" }}>+{assignedProjects.length - 3}</span>}</div>;
                        })()}
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
                          <button onClick={() => { if (confirm(`Remove ${c.name}?`)) { pushUndo("Delete contact"); if (c.company) { const dismissed = new Set(JSON.parse(localStorage.getItem("adptv_dismissed_contacts") || "[]")); dismissed.add(c.name.toLowerCase().trim() + "|||" + c.company.toLowerCase().trim()); localStorage.setItem("adptv_dismissed_contacts", JSON.stringify([...dismissed])); } setContacts(prev => prev.filter(x => x.id !== c.id)); } }} style={{ padding: "4px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "#e85454", cursor: "pointer", fontSize: 10, fontWeight: 600 }} title="Delete contact">✕</button>
                        </div>
                        {(() => {
                          const contactVendorName = c.vendorName || c.company || c.name;
                          // Search ALL projects' vendors, not just active project
                          const allVendors = Object.values(projectVendors).flat();
                          const matchVendor = allVendors.find(v => {
                            const vn = v.name.toLowerCase();
                            return vn === (c.name || "").toLowerCase() || vn === (c.company || "").toLowerCase() || vn === (c.vendorName || "").toLowerCase();
                          });
                          const useVendorName = matchVendor?.name || contactVendorName;
                          // Merge vendor compliance with Drive compliance map (fallback for contacts without vendor entries)
                          const vendorComp = matchVendor?.compliance || {};
                          // Try multiple name variations against the Drive compliance map
                          const driveComp = driveComplianceMap[useVendorName] || driveComplianceMap[c.vendorName] || driveComplianceMap[c.company] || driveComplianceMap[c.name] || {};
                          const comp = { ...vendorComp };
                          // Fill in from Drive map if vendor compliance is missing
                          ['coi', 'w9', 'quote', 'invoice', 'contract'].forEach(key => {
                            if (!comp[key]?.done && driveComp[key]?.done) {
                              comp[key] = { done: true, file: driveComp[key].file, link: driveComp[key].link };
                            }
                          });
                          const docBtns = [
                            { key: "coi", label: "COI", color: "#4ecb71", prefix: "ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/2026 COIs & Workers Comp" },
                            { key: "w9", label: "W9", color: "#3da5db", prefix: "ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/2026 W9s" },
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
                                  compliance: { coi: { done: false }, w9: { done: false }, quote: { done: false }, invoice: { done: false }, contract: { done: false } }
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
  );
});

export default GlobalContactsTab;
