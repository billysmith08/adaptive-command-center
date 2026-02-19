"use client";
import React from "react";

const ClientsTab = React.memo(function ClientsTab({
  isMobile,
  clientSearch,
  setClientSearch,
  clientFilterAttr,
  setClientFilterAttr,
  CLIENT_ATTRIBUTES,
  handleClientsCSVUpload,
  emailExport,
  emptyClient,
  setClientForm,
  setShowAddClient,
  clients,
  setClients,
  selectedClientIds,
  setSelectedClientIds,
  pushUndo,
  clientColWidths,
  setClientColWidths,
  colsToGrid,
  renderResizeHandle,
  clientSort,
  setClientSort,
  contacts,
  expandedClientId,
  setExpandedClientId,
  copyToClipboard,
  setContactForm,
  setShowAddContact,
  projects,
  setActiveProjectId,
  setActiveTab,
}) {
  return (
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
                          <div style={{ overflow: "hidden" }}>
                            <div style={{ fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={c.name}>{c.name}</div>
                            {(c.contactName || linkedContacts[0]?.name) && <div style={{ fontSize: 10, color: "var(--textFaint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.contactName || linkedContacts[0]?.name}</div>}
                          </div>
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
                            const companyNameLower = c.name.toLowerCase();
                            // Add client's primary contact if exists (skip if name = company name)
                            if (c.contactName && c.contactName.toLowerCase() !== companyNameLower) allContacts.push({ id: "_primary_" + c.id, name: c.contactName, email: c.contactEmail, phone: c.contactPhone, position: "Client Contact", _source: "client" });
                            // Add billing contact if different from primary (skip if name = company name)
                            if (c.billingContact && c.billingContact !== c.contactName && c.billingContact.toLowerCase() !== companyNameLower) allContacts.push({ id: "_billing_" + c.id, name: c.billingContact, email: c.billingEmail, phone: c.billingPhone, position: "Billing Contact", _source: "client" });
                            // Add additional contact names from CSV (skip if name = company name)
                            (c.contactNames || []).forEach((cn, ci) => {
                              if (cn && cn !== c.contactName && cn !== c.billingContact && cn.toLowerCase() !== companyNameLower) allContacts.push({ id: "_cn_" + c.id + "_" + ci, name: cn, email: "", phone: "", position: "Contact", _source: "client" });
                            });
                            // Add linked Global Partners (deduplicate by name, skip if name = company name)
                            const existingNames = new Set(allContacts.map(x => x.name.toLowerCase()));
                            linkedContacts.forEach(ct => {
                              if (ct.name.toLowerCase() === companyNameLower) return;
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
                          {/* ── PROJECTS FOR THIS CLIENT ── */}
                          {(() => {
                            const clientProjects = projects.filter(p => p.client && p.client.toLowerCase() === c.name.toLowerCase());
                            if (clientProjects.length === 0) return null;
                            return (
                              <div style={{ padding: "8px 16px 10px 52px" }}>
                                <div style={{ fontSize: 9, color: "#ff6b4a", fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>PROJECTS ({clientProjects.length})</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                  {clientProjects.sort((a, b) => (a.eventDates?.start || "").localeCompare(b.eventDates?.start || "")).map(p => (
                                    <span key={p.id} onClick={(e) => { e.stopPropagation(); setActiveProjectId(p.id); setActiveTab("overview"); }} style={{ padding: "3px 8px", background: "#ff6b4a08", border: "1px solid #ff6b4a20", borderRadius: 6, fontSize: 10, color: "#ff6b4a", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#ff6b4a18"} onMouseLeave={e => e.currentTarget.style.background = "#ff6b4a08"}>
                                      {p.name}
                                      <span style={{ fontSize: 8, padding: "0 3px", borderRadius: 3, background: p.status === "In-Production" ? "#4ecb7115" : p.status === "Wrap" ? "#8a868015" : p.status === "Exploration" ? "#dba94e15" : "#3da5db15", color: p.status === "In-Production" ? "#4ecb71" : p.status === "Wrap" ? "#8a8680" : p.status === "Exploration" ? "#dba94e" : "#3da5db", fontWeight: 700 }}>{p.status}</span>
                                      {p.eventDates?.start && <span style={{ fontSize: 8, color: "var(--textGhost)" }}>{p.eventDates.start.slice(5)}</span>}
                                    </span>
                                  ))}
                                </div>
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
  );
});

export default ClientsTab;
