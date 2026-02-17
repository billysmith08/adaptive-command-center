"use client";
import React, { useState } from "react";

export default function GlobalContactsTab({
  contacts, setContacts, vendors, setVendors, projects, clients, appSettings,
  copyToClipboard, updateProject2,
  setActiveProjectId, setActiveTab,
  setContactForm, setShowAddContact, setContactSearch,
  setAssignContactPopover, assignContactPopover,
  setClipboardToast, setSelectedContacts,
  setContactFilterType, setContactFilterResource,
  contactSearch, contactFilterType, contactFilterResource, selectedContacts,
  partnerSort, setPartnerSort, partnerColWidths, setPartnerColWidths,
  DeptTag,
}) {
  return (
  <div style={{ animation: "fadeUp 0.3s ease" }}>
\n    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, position: "sticky", top: 0, background: "var(--bg)", zIndex: 6, paddingTop: 4, paddingBottom: 12 }}>
\n      <div>
\n        <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>ALL CONTACTS</div>
\n        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Instrument Sans'" }}>Global Partners</div>
\n      </div>
\n      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
\n        <input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search contacts..." style={{ padding: "8px 14px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--textSub)", fontSize: 12, outline: "none", width: 240 }} />
\n        <select value={contactFilterType} onChange={e => setContactFilterType(e.target.value)} style={{ padding: "8px 10px", background: "var(--bgCard)", border: `1px solid ${contactFilterType ? "#ff6b4a40" : "var(--borderSub)"}`, borderRadius: 7, color: contactFilterType ? "#ff6b4a" : "var(--textFaint)", fontSize: 11, outline: "none", cursor: "pointer", appearance: "auto" }}>
\n          <option value="">All Types</option>
\n          {[...new Set(contacts.map(c => c.contactType).filter(Boolean))].sort().map(t => <option key={t} value={t}>{t}</option>)}
\n        </select>
\n        <select value={contactFilterResource} onChange={e => setContactFilterResource(e.target.value)} style={{ padding: "8px 10px", background: "var(--bgCard)", border: `1px solid ${contactFilterResource ? "#3da5db40" : "var(--borderSub)"}`, borderRadius: 7, color: contactFilterResource ? "#3da5db" : "var(--textFaint)", fontSize: 11, outline: "none", cursor: "pointer", appearance: "auto" }}>
\n          <option value="">All Resources</option>
\n          {[...new Set(contacts.map(c => c.resourceType).filter(Boolean))].sort().map(t => <option key={t} value={t}>{t}</option>)}
\n        </select>
\n        <label style={{ padding: "7px 16px", background: "#3da5db15", border: "1px solid #3da5db30", borderRadius: 7, color: "#3da5db", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
\n          <span style={{ fontSize: 13 }}>📇</span> Import vCard
\n          <input type="file" accept=".vcf,.vcard" onChange={handleVCardUpload} style={{ display: "none" }} multiple />
\n        </label>
\n        <label style={{ padding: "7px 16px", background: "#4ecb7115", border: "1px solid #4ecb7130", borderRadius: 7, color: "#4ecb71", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
\n          <span style={{ fontSize: 13 }}>📊</span> Import CSV
\n          <input type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: "none" }} />
\n        </label>
\n        <button onClick={() => emailExport("Partners")} style={{ padding: "7px 16px", background: "#9b6dff15", border: "1px solid #9b6dff30", borderRadius: 7, color: "#9b6dff", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
\n          <span style={{ fontSize: 13 }}>📤</span> Export CSV
\n        </button>
\n        <button onClick={() => { setContactForm({ ...emptyContact }); setShowAddContact(true); }} style={{ padding: "7px 16px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 7, color: "#ff6b4a", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
\n          <span style={{ fontSize: 14 }}>+</span> Add Contact
\n        </button>
\n      </div>
\n    </div>
\n
\n    {contacts.length === 0 ? (
\n      <div style={{ textAlign: "center", padding: 60, color: "var(--textGhost)" }}>
\n        <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
\n        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--textFaint)" }}>No contacts yet</div>
\n        <div style={{ fontSize: 13, marginBottom: 20 }}>Add contacts manually or import vCards (.vcf) from your phone</div>
\n        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
\n          <label style={{ padding: "10px 20px", background: "#3da5db15", border: "1px solid #3da5db30", borderRadius: 8, color: "#3da5db", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
\n            📇 Import vCard
\n            <input type="file" accept=".vcf,.vcard" onChange={handleVCardUpload} style={{ display: "none" }} multiple />
\n          </label>
\n          <button onClick={() => { setContactForm({ ...emptyContact }); setShowAddContact(true); }} style={{ padding: "10px 20px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 8, color: "#ff6b4a", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>+ Add Manually</button>
\n        </div>
\n      </div>
\n    ) : (
\n      <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10 }}>
\n        {/* Bulk action bar */}
\n        {selectedContacts.size > 0 && (
\n          <div style={{ padding: "8px 16px", background: "#ff6b4a08", borderBottom: "1px solid var(--borderSub)", display: "flex", alignItems: "center", gap: 12 }}>
\n            <span style={{ fontSize: 11, fontWeight: 600, color: "#ff6b4a" }}>{selectedContacts.size} selected</span>
\n            <button onClick={() => { if (confirm(`Delete ${selectedContacts.size} selected contact(s)?`)) { pushUndo("Delete contacts"); const toDelete = contacts.filter(c => selectedContacts.has(c.id)); const dismissed = new Set(JSON.parse(localStorage.getItem("adptv_dismissed_contacts") || "[]")); toDelete.forEach(c => { if (c.company) dismissed.add(c.name.toLowerCase().trim() + "|||" + c.company.toLowerCase().trim()); }); localStorage.setItem("adptv_dismissed_contacts", JSON.stringify([...dismissed])); setContacts(prev => prev.filter(c => !selectedContacts.has(c.id))); setSelectedContacts(new Set()); } }} style={{ padding: "4px 12px", background: "#e8545415", border: "1px solid #e8545430", borderRadius: 5, color: "#e85454", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>🗑 Delete Selected</button>
\n            <button onClick={() => setSelectedContacts(new Set())} style={{ padding: "4px 12px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "var(--textFaint)", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>✕ Clear</button>
\n          </div>
\n        )}
\n        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 200px)" }}>
\n        <div style={{ minWidth: 1600 }}>
\n        <div style={{ display: "grid", gridTemplateColumns: colsToGrid(partnerColWidths), padding: "10px 16px", borderBottom: "1px solid var(--borderSub)", fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1, position: "sticky", top: 0, background: "var(--bgInput)", zIndex: 5, minWidth: 1600 }}>
\n          {[["", ""], ["NAME", "name"], ["COMPANY", "company"], ["TYPE", "contactType"], ["RESOURCE TYPE", "resourceType"], ["POSITION", "position"], ["PHONE", "phone"], ["EMAIL", "email"], ["ADDRESS", "address"], ["PROJECTS", ""], ["ACTIONS", ""], ["DOCS", ""]].map(([label, sortKey], i) => (
\n            <span key={i} style={{ position: "relative", userSelect: "none", cursor: sortKey ? "pointer" : "default", display: "flex", alignItems: "center", gap: 3 }} onClick={() => { if (!sortKey) return; setPartnerSort(prev => prev.col === sortKey ? { col: sortKey, dir: prev.dir === "asc" ? "desc" : "asc" } : { col: sortKey, dir: "asc" }); }}>
\n              {i === 0 ? <input type="checkbox" checked={contacts.length > 0 && selectedContacts.size === contacts.filter(c => !contactSearch || c.name.toLowerCase().includes(contactSearch.toLowerCase()) || (c.email || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.company || "").toLowerCase().includes(contactSearch.toLowerCase())).length} onChange={(e) => { if (e.target.checked) { const visible = contacts.filter(c => !contactSearch || c.name.toLowerCase().includes(contactSearch.toLowerCase()) || (c.email || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.company || "").toLowerCase().includes(contactSearch.toLowerCase())); setSelectedContacts(new Set(visible.map(c => c.id))); } else { setSelectedContacts(new Set()); } }} style={{ cursor: "pointer" }} /> : <>{label}{partnerSort.col === sortKey && <span style={{ color: "#ff6b4a", fontSize: 8 }}>{partnerSort.dir === "asc" ? "▲" : "▼"}</span>}</>}
\n              {i < partnerColWidths.length - 1 && renderResizeHandle(setPartnerColWidths, i)}
\n            </span>
\n          ))}
\n        </div>
\n        {contacts.filter(c => (!contactSearch || c.name.toLowerCase().includes(contactSearch.toLowerCase()) || (c.email || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.company || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.position || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.address || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.resourceType || "").toLowerCase().includes(contactSearch.toLowerCase()) || (c.contactType || "").toLowerCase().includes(contactSearch.toLowerCase())) && (!contactFilterType || c.contactType === contactFilterType) && (!contactFilterResource || c.resourceType === contactFilterResource)).sort((a, b) => { if (!partnerSort.col) return 0; const av = (a[partnerSort.col] || "").toString().toLowerCase(); const bv = (b[partnerSort.col] || "").toString().toLowerCase(); return partnerSort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av); }).map(c => (
\n          <div key={c.id} style={{ display: "grid", gridTemplateColumns: colsToGrid(partnerColWidths), padding: "10px 16px", borderBottom: "1px solid var(--calLine)", alignItems: "center", fontSize: 12, background: selectedContacts.has(c.id) ? "#ff6b4a08" : "transparent", minWidth: 1600 }}>
\n            <span><input type="checkbox" checked={selectedContacts.has(c.id)} onChange={(e) => { const next = new Set(selectedContacts); if (e.target.checked) next.add(c.id); else next.delete(c.id); setSelectedContacts(next); }} style={{ cursor: "pointer" }} /></span>
\n            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
\n              {(() => {
\n                // Check if contact has avatar or matches a user profile with avatar
\n                const profileAvatar = c.avatar || (c.email && (appSettings.userProfiles || {})[c.email]?.avatar) || null;
\n                return profileAvatar ? (
\n                  <img src={profileAvatar} alt="" onClick={(e) => viewContact(c, e)} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "1px solid #ff6b4a30", flexShrink: 0, cursor: "pointer" }} />
\n                ) : (
\n                  <div onClick={(e) => viewContact(c, e)} style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #ff6b4a20, #ff4a6b20)", border: "1px solid #ff6b4a30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#ff6b4a", flexShrink: 0, cursor: "pointer" }}>
\n                    {c.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
\n                  </div>
\n                );
\n              })()}
\n              <div style={{ overflow: "hidden" }}>
\n                <div style={{ fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
\n                {c.company && <div style={{ fontSize: 10, color: "var(--textFaint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.company}</div>}
\n                {!c.company && c.department && <div style={{ fontSize: 9, color: "var(--textFaint)" }}>{c.department}</div>}
\n              </div>
\n            </div>
\n            <span style={{ color: "var(--textMuted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.company || "—"}</span>
\n            <span style={{ fontSize: 9 }}>{c.contactType ? <span style={{ padding: "2px 7px", background: c.contactType === "Client" ? "#3da5db10" : c.contactType === "Vendor" ? "#4ecb7110" : "#9b6dff10", border: `1px solid ${c.contactType === "Client" ? "#3da5db20" : c.contactType === "Vendor" ? "#4ecb7120" : "#9b6dff20"}`, borderRadius: 3, fontSize: 9, fontWeight: 600, color: c.contactType === "Client" ? "#3da5db" : c.contactType === "Vendor" ? "#4ecb71" : "#9b6dff", whiteSpace: "nowrap" }}>{c.contactType}</span> : "—"}{(c.clientAssociation || clients.some(cl => cl.name.toLowerCase() === (c.company || "").toLowerCase())) && <span style={{ marginLeft: 3, fontSize: 8, color: "#3da5db" }} title={`Linked: ${c.clientAssociation || clients.find(cl => cl.name.toLowerCase() === (c.company || "").toLowerCase())?.name}`}>🔗</span>}</span>
\n            <span style={{ color: "var(--textMuted)", fontSize: 10 }}>{c.resourceType ? <span style={{ padding: "2px 7px", background: "#3da5db10", border: "1px solid #3da5db20", borderRadius: 3, fontSize: 9, fontWeight: 600, color: "#3da5db", whiteSpace: "nowrap" }}>{c.resourceType}</span> : "—"}</span>
\n            <span style={{ color: "var(--textMuted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.position || "—"}</span>
\n            <span onClick={(e) => c.phone && copyToClipboard(c.phone, "Phone", e)} style={{ color: "var(--textMuted)", fontSize: 11, cursor: c.phone ? "pointer" : "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} onMouseEnter={e => { if (c.phone) e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={e => e.currentTarget.style.color = "var(--textMuted)"}>{c.phone || "—"} {c.phone && <span style={{ fontSize: 7, color: "var(--textGhost)" }}>⧉</span>}</span>
\n            <span onClick={(e) => c.email && copyToClipboard(c.email, "Email", e)} style={{ color: "var(--textMuted)", fontSize: 11, cursor: c.email ? "pointer" : "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} onMouseEnter={e => { if (c.email) e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={e => e.currentTarget.style.color = "var(--textMuted)"}>{c.email || "—"} {c.email && <span style={{ fontSize: 7, color: "var(--textGhost)" }}>⧉</span>}</span>
\n            <span onClick={(e) => c.address && copyToClipboard(c.address, "Address", e)} style={{ color: "var(--textMuted)", fontSize: 10, cursor: c.address ? "pointer" : "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} onMouseEnter={e => { if (c.address) e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={e => e.currentTarget.style.color = "var(--textMuted)"} title={c.address || ""}>{c.address || "—"} {c.address && <span style={{ fontSize: 7, color: "var(--textGhost)" }}>⧉</span>}</span>
\n            {/* PROJECTS cell */}
\n            {(() => {
\n              const cName = (c.name || "").trim();
\n              const assignedProjects = !cName ? [] : projects.filter(p => {
\n                if (p.archived) return false;
\n                const people = [...(p.producers || []), ...(p.managers || []), ...(p.staff || [])];
\n                const contactPeople = [...(p.pocs || []).map(x => (x.name || "").trim()), ...(p.clientContacts || []).map(x => (x.name || "").trim()), ...(p.billingContacts || []).map(x => (x.name || "").trim())];
\n                if (people.includes(cName) || contactPeople.includes(cName)) return true;
\n                return (projectVendors[p.id] || []).some(v => (v.contact || "").trim() === cName);
\n              });
\n              return assignedProjects.length === 0
\n                ? <span style={{ fontSize: 10, color: "var(--textGhost)" }}>—</span>
\n                : <div style={{ display: "flex", gap: 3, flexWrap: "wrap", overflow: "hidden" }}>{assignedProjects.slice(0, 3).map(p => <span key={p.id} onClick={(e) => { e.stopPropagation(); setActiveProjectId(p.id); setActiveTab("overview"); }} style={{ padding: "2px 6px", background: "#9b6dff10", border: "1px solid #9b6dff20", borderRadius: 3, fontSize: 8, fontWeight: 700, color: "#9b6dff", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 100 }} title={p.name}>{p.name}</span>)}{assignedProjects.length > 3 && <span style={{ fontSize: 8, color: "var(--textGhost)" }}>+{assignedProjects.length - 3}</span>}</div>;
\n            })()}
\n            <div style={{ display: "flex", gap: 4, alignItems: "center", position: "relative", flexWrap: "nowrap", overflow: "visible" }}>
\n              <div style={{ position: "relative" }}>
\n                <button onClick={() => setAssignContactPopover(assignContactPopover?.contactId === c.id ? null : { contactId: c.id, selectedProject: activeProjectId, selectedRole: "Point of Contact" })} style={{ padding: "4px 10px", background: assignContactPopover?.contactId === c.id ? "#9b6dff25" : "#9b6dff10", border: "1px solid #9b6dff30", borderRadius: 5, color: "#9b6dff", cursor: "pointer", fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>+ Project</button>
\n                {assignContactPopover?.contactId === c.id && (
\n                  <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "var(--bgHover)", border: "1px solid var(--borderActive)", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.7)", zIndex: 80, width: 280, overflow: "hidden" }}>
\n                    <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--borderSub)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
\n                      <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 0.8 }}>ASSIGN TO PROJECT</div>
\n                      <button onClick={() => setAssignContactPopover(null)} style={{ background: "none", border: "none", color: "var(--textFaint)", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "0 2px" }}>✕</button>
\n                    </div>
\n                    <div style={{ padding: "0 14px 10px" }}>
\n                      <select value={assignContactPopover.selectedProject} onChange={e => setAssignContactPopover(prev => ({ ...prev, selectedProject: e.target.value }))} style={{ width: "100%", padding: "6px 8px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "var(--textSub)", fontSize: 11, outline: "none" }}>
\n                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
\n                      </select>
\n                    </div>
\n                    <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--borderSub)" }}>
\n                      <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 0.8, marginBottom: 6 }}>ROLE</div>
\n                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
\n                        {(appSettings.projectRoles || ["Producer", "Manager", "Staff / Crew", "Client", "Point of Contact", "Billing", "Talent", "Artist", "Agent", "Venue Rep"]).slice().sort().map(r => (
\n                          <button key={r} onClick={() => setAssignContactPopover(prev => ({ ...prev, selectedRole: r }))} style={{ padding: "3px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, cursor: "pointer", background: assignContactPopover.selectedRole === r ? "#9b6dff20" : "var(--bgInput)", border: `1px solid ${assignContactPopover.selectedRole === r ? "#9b6dff40" : "var(--borderSub)"}`, color: assignContactPopover.selectedRole === r ? "#9b6dff" : "var(--textFaint)" }}>{r}</button>
\n                        ))}
\n                      </div>
\n                    </div>
\n                    <div style={{ padding: "10px 14px" }}>
\n                      <button onClick={() => {
\n                        const targetProject = projects.find(p => p.id === assignContactPopover.selectedProject);
\n                        if (!targetProject) return;
\n                        const role = assignContactPopover.selectedRole;
\n                        const entry = { name: c.name, phone: c.phone || "", email: c.email || "", address: "", fromContacts: true, role };
\n                        const projIdx = projects.findIndex(p => p.id === assignContactPopover.selectedProject);
\n                        if (projIdx < 0) return;
\n                        // Check duplicates
\n                        const allPeople = [...targetProject.producers, ...targetProject.managers, ...(targetProject.staff || []), ...(targetProject.pocs || []).map(p => p.name), ...(targetProject.clientContacts || []).map(p => p.name), ...(targetProject.billingContacts || []).map(p => p.name)];
\n                        if (allPeople.includes(c.name)) { alert(`${c.name} is already on ${targetProject.name}.`); return; }
\n                        // Add based on role
\n                        if (role === "Producer") updateProject2(assignContactPopover.selectedProject, "producers", [...targetProject.producers, c.name]);
\n                        else if (role === "Manager") updateProject2(assignContactPopover.selectedProject, "managers", [...targetProject.managers, c.name]);
\n                        else if (role === "Staff / Crew") updateProject2(assignContactPopover.selectedProject, "staff", [...(targetProject.staff || []), c.name]);
\n                        else if (role === "Client") updateProject2(assignContactPopover.selectedProject, "clientContacts", [...(targetProject.clientContacts || []), entry]);
\n                        else if (role === "Billing") updateProject2(assignContactPopover.selectedProject, "billingContacts", [...(targetProject.billingContacts || []), entry]);
\n                        else updateProject2(assignContactPopover.selectedProject, "pocs", [...(targetProject.pocs || []), entry]);
\n                        setClipboardToast({ text: `${c.name} added to ${targetProject.name} as ${role}!`, x: window.innerWidth / 2, y: 60 }); setTimeout(() => setClipboardToast(null), 2200);
\n                        setAssignContactPopover(null);
\n                      }} style={{ width: "100%", padding: "8px", background: "#9b6dff", border: "none", borderRadius: 6, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 11 }}>
\n                        Add to {projects.find(p => p.id === assignContactPopover.selectedProject)?.name?.slice(0, 20) || "Project"}
\n                      </button>
\n                    </div>
\n                  </div>
\n                )}
\n              </div>
\n              <button onClick={() => { setContactForm({ ...c, clientAssociation: c.clientAssociation || (clients.find(cl => cl.name.toLowerCase() === (c.company || c.vendorName || "").toLowerCase())?.name || "") }); setShowAddContact(true); }} style={{ padding: "4px 10px", background: "var(--bgCard)", border: "1px solid var(--borderActive)", borderRadius: 5, color: "var(--textMuted)", cursor: "pointer", fontSize: 10, fontWeight: 600 }} title="Edit contact">✏ Edit</button>
\n              <button onClick={() => downloadVCard(c)} style={{ padding: "4px 8px", background: "var(--bgCard)", border: "1px solid var(--borderActive)", borderRadius: 5, color: "var(--textMuted)", cursor: "pointer", fontSize: 10, fontWeight: 600 }} title="Save to Mac Contacts (.vcf)">📇</button>
\n              <button onClick={() => { if (confirm(`Remove ${c.name}?`)) { pushUndo("Delete contact"); if (c.company) { const dismissed = new Set(JSON.parse(localStorage.getItem("adptv_dismissed_contacts") || "[]")); dismissed.add(c.name.toLowerCase().trim() + "|||" + c.company.toLowerCase().trim()); localStorage.setItem("adptv_dismissed_contacts", JSON.stringify([...dismissed])); } setContacts(prev => prev.filter(x => x.id !== c.id)); } }} style={{ padding: "4px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 5, color: "#e85454", cursor: "pointer", fontSize: 10, fontWeight: 600 }} title="Delete contact">✕</button>
\n            </div>
\n            {(() => {
\n              const contactVendorName = c.vendorName || c.company || c.name;
\n              // Search ALL projects' vendors, not just active project
\n              const allVendors = Object.values(projectVendors).flat();
\n              const matchVendor = allVendors.find(v => {
\n                const vn = v.name.toLowerCase();
\n                return vn === (c.name || "").toLowerCase() || vn === (c.company || "").toLowerCase() || vn === (c.vendorName || "").toLowerCase();
\n              });
\n              const useVendorName = matchVendor?.name || contactVendorName;
\n              // Merge vendor compliance with Drive compliance map (fallback for contacts without vendor entries)
\n              const vendorComp = matchVendor?.compliance || {};
\n              // Try multiple name variations against the Drive compliance map
\n              const driveComp = driveComplianceMap[useVendorName] || driveComplianceMap[c.vendorName] || driveComplianceMap[c.company] || driveComplianceMap[c.name] || {};
\n              const comp = { ...vendorComp };
\n              // Fill in from Drive map if vendor compliance is missing
\n              ['coi', 'w9', 'quote', 'invoice', 'contract'].forEach(key => {
\n                if (!comp[key]?.done && driveComp[key]?.done) {
\n                  comp[key] = { done: true, file: driveComp[key].file, link: driveComp[key].link };
\n                }
\n              });
\n              const docBtns = [
\n                { key: "coi", label: "COI", color: "#4ecb71", prefix: "ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/2026 COIs & Workers Comp" },
\n                { key: "w9", label: "W9", color: "#3da5db", prefix: "ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/2026 W9s" },
\n              ];
\n              const handleContactDocUpload = (docKey, prefix) => {
\n                const input = document.createElement("input");
\n                input.type = "file";
\n                input.accept = ".pdf,.doc,.docx,.jpg,.png,.xlsx";
\n                input.onchange = (ev) => {
\n                  const f = ev.target.files[0];
\n                  if (!f) return;
\n                  // Find or auto-create a vendor entry for THIS contact
\n                  let vid = matchVendor?.id;
\n                  if (!vid) {
\n                    vid = `v_${Date.now()}`;
\n                    const newV = {
\n                      id: vid, name: useVendorName, type: c.resourceType || "Other",
\n                      email: c.email, contact: c.name, phone: c.phone, title: c.position,
\n                      contactType: "", deptId: c.department, source: "contacts",
\n                      ein: "", address: c.address || "",
\n                      compliance: { coi: { done: false }, w9: { done: false }, quote: { done: false }, invoice: { done: false }, contract: { done: false } }
\n                    };
\n                    setVendors(prev => [...prev, newV]);
\n                  }
\n                  const drivePath = `${prefix}/${useVendorName}/`;
\n                  handleFileDrop(vid, docKey, f, drivePath, prefix);
\n                };
\n                input.click();
\n              };
\n              return (
\n                <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
\n                  {docBtns.map(d => {
\n                    const done = comp[d.key]?.done;
\n                    const uploading = comp[d.key]?.uploading;
\n                    return (
\n                      <button key={d.key}
\n                        onClick={() => done && comp[d.key]?.link ? window.open(comp[d.key].link, "_blank") : handleContactDocUpload(d.key, d.prefix)}
\n                        title={done ? `${comp[d.key]?.file || d.label} — click to open` : `Upload ${d.label}`}
\n                        style={{
\n                          padding: "3px 7px", borderRadius: 4, fontSize: 8, fontWeight: 700, cursor: "pointer",
\n                          background: done ? `${d.color}15` : "var(--bgCard)",
\n                          border: `1px solid ${done ? d.color + "40" : "var(--borderSub)"}`,
\n                          color: done ? d.color : "var(--textGhost)",
\n                          whiteSpace: "nowrap", lineHeight: 1.4,
\n                          opacity: uploading ? 0.5 : 1,
\n                        }}>
\n                        {uploading ? "⏳" : done ? "✓" : "+"} {d.label}
\n                      </button>
\n                    );
\n                  })}
\n                </div>
\n              );
\n            })()}
\n          </div>
\n        ))}
\n        </div>
\n        </div>
\n      </div>
\n    )}
\n  </div>
\n  );
}
