"use client";
import React, { useState } from "react";
import ProjectTimeline from "./ProjectTimeline";
import {
  RichTextEditor,
  EditableText,
  Dropdown,
  MultiDropdown,
  TagInput,
  DatePicker,
  EditableBudget,
  ContactListBlock,
  AddressAutocomplete,
  ProgressBar,
  fmt,
  STATUSES,
  STATUS_COLORS,
  SERVICE_OPTIONS,
  SUB_EVENT_STATUSES,
  SUB_EVENT_STATUS_COLORS,
} from "./shared/UIComponents";

/**
 * OverviewTab — the Overview panel extracted from Dashboard.jsx
 *
 * Props:
 *   project, projects, contacts, clients, appSettings, peopleOptions,
 *   notesCollapsed, pctSpent,
 *   setActiveProjectId, setActiveTab, setProjects, setContacts, setNotesCollapsed,
 *   updateProject, viewContact, copyToClipboard, updateGlobalContact
 */
const OverviewTab = React.memo(function OverviewTab({
  project,
  projects,
  contacts,
  clients,
  appSettings,
  peopleOptions,
  notesCollapsed,
  pctSpent,
  activityLog,
  timelineCollapsed,
  setTimelineCollapsed,
  setActiveProjectId,
  setActiveTab,
  setProjects,
  setContacts,
  setNotesCollapsed,
  updateProject,
  viewContact,
  copyToClipboard,
  updateGlobalContact,
}) {
  return (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                {/* Sub-project breadcrumb */}
                {project.parentId && (() => {
                  const parent = projects.find(p => p.id === project.parentId);
                  return parent ? (
                    <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                      <span onClick={() => { setActiveProjectId(parent.id); }} style={{ color: "#ff6b4a", cursor: "pointer", fontWeight: 600 }} onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"} onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>{parent.name}</span>
                      <span style={{ color: "var(--textGhost)" }}>›</span>
                      <span style={{ color: "var(--textMuted)", fontWeight: 600 }}>{project.name}</span>
                      <span style={{ fontSize: 7, padding: "2px 6px", borderRadius: 4, background: "#dba94e15", color: "#dba94e", border: "1px solid #dba94e25", fontWeight: 700, letterSpacing: 0.5, marginLeft: 4 }}>SUB-PROJECT</span>
                    </div>
                  ) : null;
                })()}

                {/* Sub-projects list for parent projects */}
                {!project.parentId && (() => {
                  const subs = projects.filter(sp => sp.parentId === project.id && !sp.archived);
                  if (subs.length === 0) return null;
                  return (
                    <div style={{ marginBottom: 18, background: "var(--bgInput)", border: "1px solid #dba94e30", borderRadius: 10, padding: "14px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ fontSize: 9, color: "#dba94e", fontWeight: 700, letterSpacing: 1 }}>SUB-PROJECTS</div>
                          <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 10, background: "#dba94e15", color: "#dba94e", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{subs.length}</span>
                        </div>
                        <button onClick={() => {
                          const newId = "sub_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
                          const sub = { id: newId, parentId: project.id, name: "New Sub-Project", client: project.client || "", projectType: project.projectType || "", code: "", status: "Pre-Production", location: "", budget: 0, spent: 0, eventDates: { start: "", end: "" }, engagementDates: { start: "", end: "" }, brief: project.brief || { what: "", where: "", why: "" }, why: project.why || "", services: [...(project.services || [])], producers: [...(project.producers || [])], managers: [...(project.managers || [])], staff: [], pocs: [], clientContacts: [...(project.clientContacts || [])], billingContacts: [...(project.billingContacts || [])], notes: "", archived: false, isTour: project.isTour || false, subEvents: project.isTour ? [] : undefined };
                          setProjects(prev => [...prev, sub]); setActiveProjectId(newId); setActiveTab("overview");
                        }} style={{ padding: "4px 12px", background: "#dba94e15", border: "1px solid #dba94e30", borderRadius: 6, color: "#dba94e", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>+ Add Sub-Project</button>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {subs.map(sp => {
                          const ssc = STATUS_COLORS[sp.status] || { bg: "var(--bgCard)", text: "var(--textMuted)", dot: "var(--textFaint)" };
                          return (
                            <div key={sp.id} onClick={() => { setActiveProjectId(sp.id); setActiveTab("overview"); }} style={{ padding: "8px 14px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, cursor: "pointer", transition: "all 0.15s", minWidth: 140, flex: "0 1 auto" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "#dba94e50"; e.currentTarget.style.background = "var(--bgHover)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--borderSub)"; e.currentTarget.style.background = "var(--bgCard)"; }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{sp.name}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9 }}>
                                <span style={{ padding: "1px 5px", borderRadius: 3, background: ssc.bg, color: ssc.text, fontWeight: 600 }}><span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: ssc.dot, marginRight: 3 }} />{sp.status}</span>
                                {sp.eventDates?.start && <span style={{ color: "var(--textGhost)" }}>{new Date(sp.eventDates.start + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                                {sp.budget > 0 && <span style={{ color: "var(--textGhost)", fontFamily: "'JetBrains Mono', monospace" }}>${(sp.budget / 1000).toFixed(0)}k</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                <div style={{ display: "grid", gridTemplateColumns: project.parentId ? "1fr 1fr 1fr 1fr 1fr" : "1fr 1fr 1fr 1fr 1fr 1fr", gap: 12, marginBottom: 22 }}>
                  <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>STATUS</div>
                    <Dropdown value={project.status} options={[...new Set([...STATUSES, ...(appSettings.statuses || [])])].filter(Boolean).sort()} onChange={v => updateProject("status", v)} colors={{...STATUS_COLORS, ...Object.fromEntries((appSettings.statuses || []).filter(s => !STATUS_COLORS[s]).map(s => [s, { bg: "#9b6dff10", text: "#9b6dff", dot: "#9b6dff" }]))}} width="100%" />
                  </div>
                  <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>EVENT DATES</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><DatePicker value={project.eventDates.start} onChange={v => updateProject("eventDates", { ...project.eventDates, start: v })} /><DatePicker value={project.eventDates.end} onChange={v => updateProject("eventDates", { ...project.eventDates, end: v })} /></div>
                  </div>
                  {!project.parentId && <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>ENGAGEMENT DATES</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><DatePicker value={project.engagementDates.start} onChange={v => updateProject("engagementDates", { ...project.engagementDates, start: v })} /><DatePicker value={project.engagementDates.end} onChange={v => updateProject("engagementDates", { ...project.engagementDates, end: v })} /></div>
                  </div>}
                  <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "14px 16px" }}><div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>PRODUCER(S)</div><TagInput values={project.producers} options={peopleOptions} contacts={contacts} onViewContact={viewContact} onChange={v => updateProject("producers", v)} /></div>
                  <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "14px 16px" }}><div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>MANAGER(S)</div><TagInput values={project.managers} options={peopleOptions} contacts={contacts} onViewContact={viewContact} onChange={v => updateProject("managers", v)} /></div>
                  <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "14px 16px" }}><div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>STAFF / CREW</div><TagInput values={project.staff || []} options={peopleOptions} contacts={contacts} onViewContact={viewContact} onChange={v => updateProject("staff", v)} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "18px 20px" }}>
                    <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 14 }}>PROJECT BRIEF</div>
                    {[{ q: "WHAT", key: "name" }, { q: "WHERE", key: "location" }, { q: "WHY", key: "why", multi: true }].map((f, i) => (
                      <div key={i} style={{ marginBottom: 12 }}><span style={{ fontSize: 9, color: "#ff6b4a", fontWeight: 700, letterSpacing: 0.8, marginRight: 8 }}>{f.q}</span><EditableText value={project[f.key]} onChange={v => updateProject(f.key, v)} fontSize={12} color="var(--textSub)" multiline={f.multi} /></div>
                    ))}
                    {/* Venue address (Google autocomplete) */}
                    <div style={{ marginBottom: 12 }}><span style={{ fontSize: 9, color: "#ff6b4a", fontWeight: 700, letterSpacing: 0.8, marginRight: 8 }}>VENUE</span><AddressAutocomplete value={project.venue || ""} onChange={v => { updateProject("venue", v); if (v && v.includes(",")) updateProject("venueAddress", v); }} showIcon={false} placeholder="On-site address..." inputStyle={{ padding: "2px 6px", background: "var(--bgInput)", border: "1px solid #ff6b4a40", borderRadius: 4, color: "var(--textSub)", fontSize: 12, fontFamily: "'DM Sans', sans-serif", outline: "none", width: "100%" }} /></div>

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
                          const personName = (matchedClient.contactName && matchedClient.contactName.toLowerCase() !== matchedClient.name.toLowerCase()) ? matchedClient.contactName : "";
                          effectiveClientContacts = [{
                            name: personName || matchedClient.name,
                            phone: matchedClient.contactPhone || matchedClient.billingPhone || "",
                            email: matchedClient.contactEmail || matchedClient.billingEmail || "",
                            company: matchedClient.name,
                            position: personName ? "Client Contact" : "Client",
                            address: [matchedClient.address, matchedClient.city, matchedClient.state, matchedClient.zip].filter(Boolean).join(", "),
                            autoPopulated: true
                          }];
                        }
                      }
                      return <ContactListBlock label="CLIENT" searchLabel="🔍 Search Clients" items={effectiveClientContacts} contacts={clients.flatMap(cl => {
                        const result = [];
                        // Add the contact person (not the company name)
                        if (cl.contactName && cl.contactName.toLowerCase() !== cl.name.toLowerCase()) result.push({ id: cl.id + "_ct", name: cl.contactName, phone: cl.contactPhone || "", email: cl.contactEmail || "", company: cl.name, position: "Client Contact", address: [cl.address, cl.city, cl.state, cl.zip].filter(Boolean).join(", ") });
                        if (cl.billingContact && cl.billingContact !== cl.contactName && cl.billingContact.toLowerCase() !== cl.name.toLowerCase()) result.push({ id: cl.id + "_bl", name: cl.billingContact, phone: cl.billingPhone || "", email: cl.billingEmail || "", company: cl.name, position: "Billing Contact", address: [cl.address, cl.city, cl.state, cl.zip].filter(Boolean).join(", ") });
                        // Also add the company itself as fallback
                        result.push({ id: cl.id, name: cl.name, phone: cl.contactPhone || cl.billingPhone || "", email: cl.contactEmail || cl.billingEmail || "", company: cl.name, position: "Client", address: [cl.address, cl.city, cl.state, cl.zip].filter(Boolean).join(", ") });
                        return result;
                      })} onViewContact={viewContact} copyToClipboard={copyToClipboard} showAddress onUpdateGlobalContact={updateGlobalContact} onUpdate={v => updateProject("clientContacts", v)} onSaveToGlobal={(poc, pi) => {
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

                {/* ── NOTES & TIMELINE (2-column grid, same as Brief + Budget) ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 22 }}>
                  {/* PROJECT NOTES / UPDATES */}
                  <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10 }}>
                    <div onClick={() => setNotesCollapsed(p => !p)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", cursor: "pointer", userSelect: "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1 }}>PROJECT NOTES & UPDATES</span>
                        {project.notes && (() => { const pt = (project.notes || "").replace(/<[^>]*>/g, " ").trim(); return pt ? <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: "var(--bgCard)", color: "var(--textMuted)", fontFamily: "'JetBrains Mono', monospace" }}>{pt.split(/\s+/).length}w</span> : null; })()}
                      </div>
                      <span style={{ fontSize: 10, color: "var(--textGhost)", transition: "transform 0.2s", transform: notesCollapsed ? "rotate(0deg)" : "rotate(90deg)" }}>▶</span>
                    </div>
                    {!notesCollapsed && (
                      <div style={{ padding: "0 20px 18px", animation: "fadeUp 0.2s ease" }}>
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
                    )}
                  </div>

                  {/* PROJECT TIMELINE */}
                  <ProjectTimeline
                    activityLog={activityLog}
                    projectId={project.id}
                    collapsed={timelineCollapsed}
                    setCollapsed={setTimelineCollapsed}
                  />
                </div>

                {/* ── TOUR / SERIES SCHEDULE ── */}
                {/* ═══ TOUR SCHEDULE (parent projects with subs OR isTour, also visible from sub-projects) ═══ */}
                {(() => {
                  // When viewing a sub-project, show the parent's tour schedule
                  const scheduleOwner = project.parentId ? projects.find(p => p.id === project.parentId) || project : project;
                  const subs = projects.filter(sp => sp.parentId === scheduleOwner.id && !sp.archived).sort((a, b) => (a.eventDates?.start || "9999").localeCompare(b.eventDates?.start || "9999"));
                  const hasSubProjects = subs.length > 0;

                  // Only show if parent project (or sub viewing parent) has subs or tour dates
                  if (!hasSubProjects && !(scheduleOwner.subEvents?.length > 0) && !scheduleOwner.isTour) return null;

                  // Combine tour dates (subEvents) + sub-projects into unified schedule
                  const allDates = [];
                  // Tour sub-events (manual dates)
                  if (scheduleOwner.subEvents) {
                    [...scheduleOwner.subEvents].sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999")).forEach(se => {
                      allDates.push({ type: "tourDate", ...se });
                    });
                  }

                  const confirmed = (scheduleOwner.subEvents || []).filter(s => s.status === "Confirmed" || s.status === "On Sale").length;
                  const complete = (scheduleOwner.subEvents || []).filter(s => s.status === "Complete").length;
                  const holds = (scheduleOwner.subEvents || []).filter(s => s.status === "Hold").length;
                  const advancing = (scheduleOwner.subEvents || []).filter(s => s.status === "Advancing").length;
                  const totalDates = (scheduleOwner.subEvents || []).length + subs.length;

                  return (
                  <div style={{ marginTop: 22 }}>
                    <div style={{ background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 10, padding: "18px 20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1 }}>TOUR SCHEDULE</div>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#ff6b4a15", color: "#ff6b4a", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{totalDates} DATES</span>
                          {scheduleOwner.isTour && totalDates > 0 && (
                            <div style={{ display: "flex", gap: 8, fontSize: 9, color: "var(--textFaint)" }}>
                              <span><span style={{ color: "#4ecb71" }}>●</span> {confirmed} confirmed</span>
                              <span><span style={{ color: "#3da5db" }}>●</span> {advancing} advancing</span>
                              <span><span style={{ color: "#9b6dff" }}>●</span> {holds} holds</span>
                              <span><span style={{ color: "#c46832" }}>●</span> {complete} complete</span>
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => {
                            const newSE = { id: `se_${Date.now()}`, date: "", city: "", venue: "", status: "Hold", notes: "" };
                            setProjects(prev => prev.map(p => p.id === scheduleOwner.id ? { ...p, subEvents: [...(p.subEvents || []), newSE], isTour: true } : p));
                          }} style={{ padding: "6px 14px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 7, color: "#ff6b4a", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>+ Add Date</button>
                          <button onClick={() => {
                            const newId = "sub_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
                            const sub = { id: newId, parentId: scheduleOwner.id, name: "New Sub-Project", client: scheduleOwner.client || "", projectType: scheduleOwner.projectType || "", code: "", status: "Pre-Production", location: "", budget: 0, spent: 0, eventDates: { start: "", end: "" }, engagementDates: { start: "", end: "" }, brief: scheduleOwner.brief || { what: "", where: "", why: "" }, why: scheduleOwner.why || "", services: [...(scheduleOwner.services || [])], producers: [...(scheduleOwner.producers || [])], managers: [...(scheduleOwner.managers || [])], staff: [], pocs: [], clientContacts: [...(scheduleOwner.clientContacts || [])], billingContacts: [...(scheduleOwner.billingContacts || [])], notes: "", archived: false, isTour: false, subEvents: undefined };
                            setProjects(prev => [...prev, sub]); setActiveProjectId(newId); setActiveTab("overview");
                          }} style={{ padding: "6px 14px", background: "#dba94e15", border: "1px solid #dba94e30", borderRadius: 7, color: "#dba94e", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>+ Add Sub-Project</button>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "90px 1.2fr 1.8fr 110px 1fr 30px", padding: "8px 12px", borderBottom: "1px solid var(--borderSub)", fontSize: 8, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1 }}>
                        <span>DATE</span><span>CITY</span><span>VENUE / PROJECT</span><span>STATUS</span><span>NOTES</span><span></span>
                      </div>

                      <div style={{ maxHeight: 520, overflowY: "auto" }}>
                        {/* Sub-projects as schedule rows */}
                        {subs.map(sp => {
                          const ssc = STATUS_COLORS[sp.status] || { bg: "var(--bgCard)", text: "var(--textMuted)", dot: "var(--textFaint)" };
                          const spDate = sp.eventDates?.start;
                          const todayISO = new Date().toISOString().split("T")[0];
                          const isPast = spDate && spDate < todayISO;
                          const weekOut = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
                          const isUpcoming = spDate && !isPast && spDate <= weekOut;
                          const isCurrent = sp.id === project.id;
                          return (
                            <div key={sp.id} onClick={() => { setActiveProjectId(sp.id); setActiveTab("overview"); }} style={{ display: "grid", gridTemplateColumns: "90px 1.2fr 1.8fr 110px 1fr 30px", padding: "7px 12px", borderBottom: "1px solid var(--calLine)", alignItems: "center", background: isCurrent ? "#ff6b4a10" : isUpcoming ? "#dba94e08" : "#9b6dff06", cursor: "pointer", opacity: isPast && !isCurrent ? 0.65 : 1, borderLeft: isCurrent ? "3px solid #ff6b4a" : "3px solid transparent" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bgHover)"} onMouseLeave={e => e.currentTarget.style.background = isCurrent ? "#ff6b4a10" : isUpcoming ? "#dba94e08" : "#9b6dff06"}>
                              <span style={{ fontSize: 10, color: isUpcoming ? "#dba94e" : "var(--textSub)", fontFamily: "'JetBrains Mono', monospace" }}>{spDate ? new Date(spDate + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</span>
                              <span style={{ fontSize: 11, color: "var(--textSub)" }}>{sp.location || "—"}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 7, padding: "1px 5px", borderRadius: 3, background: "#9b6dff10", color: "#9b6dff", fontWeight: 700 }}>SUB</span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{sp.name}</span>
                              </div>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: ssc.bg, color: ssc.text, display: "inline-block", textAlign: "center" }}>{sp.status}</span>
                              <span style={{ fontSize: 10, color: "var(--textMuted)" }}>{sp.notes || "—"}</span>
                              <span style={{ fontSize: 10, color: "#3da5db", cursor: "pointer" }}>→</span>
                            </div>
                          );
                        })}

                        {/* Tour dates (subEvents) */}
                        {[...(scheduleOwner.subEvents || [])].sort((a, b) => (a.date || "9999") < (b.date || "9999") ? -1 : 1).map((se) => {
                          const sec = SUB_EVENT_STATUS_COLORS[se.status] || SUB_EVENT_STATUS_COLORS["Hold"];
                          const todayISO = new Date().toISOString().split("T")[0];
                          const isPast = se.date && se.date < todayISO;
                          const weekOut = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
                          const isUpcoming = se.date && !isPast && se.date <= weekOut;
                          const updateOwnerSubEvents = (newSubEvents) => setProjects(prev => prev.map(p => p.id === scheduleOwner.id ? { ...p, subEvents: newSubEvents } : p));
                          return (
                            <div key={se.id} style={{ display: "grid", gridTemplateColumns: "90px 1.2fr 1.8fr 110px 1fr 30px", padding: "7px 12px", borderBottom: "1px solid var(--calLine)", alignItems: "center", background: isUpcoming ? "#ff6b4a08" : isPast ? "var(--bgInput)" : "transparent", opacity: se.status === "Cancelled" ? 0.4 : isPast && se.status !== "Complete" ? 0.65 : 1 }}>
                              <input type="date" value={se.date || ""} onChange={e => {
                                updateOwnerSubEvents(scheduleOwner.subEvents.map(s => s.id === se.id ? { ...s, date: e.target.value } : s));
                              }} style={{ padding: "4px 6px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 5, color: isUpcoming ? "#ff6b4a" : "var(--textSub)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", outline: "none", colorScheme: "var(--filterScheme)" }} />
                              <EditableText value={se.city} onChange={v => {
                                updateOwnerSubEvents(scheduleOwner.subEvents.map(s => s.id === se.id ? { ...s, city: v } : s));
                              }} fontSize={11} color="var(--textSub)" placeholder="City, ST" />
                              <EditableText value={se.venue} onChange={v => {
                                updateOwnerSubEvents(scheduleOwner.subEvents.map(s => s.id === se.id ? { ...s, venue: v } : s));
                              }} fontSize={12} color="var(--text)" fontWeight={600} placeholder="Venue name" />
                              <select value={se.status} onChange={e => {
                                updateOwnerSubEvents(scheduleOwner.subEvents.map(s => s.id === se.id ? { ...s, status: e.target.value } : s));
                              }} style={{ padding: "4px 6px", background: sec.bg, border: `1px solid ${sec.dot}30`, borderRadius: 5, color: sec.text, fontSize: 10, fontWeight: 600, outline: "none", cursor: "pointer", width: "100%" }}>
                                {SUB_EVENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <EditableText value={se.notes} onChange={v => {
                                updateOwnerSubEvents(scheduleOwner.subEvents.map(s => s.id === se.id ? { ...s, notes: v } : s));
                              }} fontSize={10} color="var(--textMuted)" placeholder="Notes..." />
                              <button onClick={() => {
                                updateOwnerSubEvents(scheduleOwner.subEvents.filter(s => s.id !== se.id));
                              }} style={{ background: "none", border: "none", color: "var(--textGhost)", cursor: "pointer", fontSize: 14 }}>×</button>
                            </div>
                          );
                        })}
                        {totalDates === 0 && (
                          <div style={{ padding: "20px 12px", textAlign: "center", color: "var(--textGhost)", fontSize: 11 }}>No dates or sub-projects yet</div>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })()}

              </div>
  );
});

/**
 * BudgetTab — the Budget (full Saturation embed) panel extracted from Dashboard.jsx
 *
 * Props:
 *   project, updateProject
 */
const BudgetTab = React.memo(function BudgetTab({
  project,
  updateProject,
}) {
  const satUrl = project.saturationUrl;
  const sheetUrl = project.googleSheetUrl;
  const embedUrl = satUrl ? (satUrl.includes("/budget") ? satUrl : satUrl.replace(/\/$/, "") + "/budget") : null;

  const extractSheetId = (url) => {
    if (!url) return null;
    const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  };

  const sheetId = extractSheetId(sheetUrl);
  const hasSheet = !!(sheetUrl && sheetId);
  const hasSaturation = !!satUrl;

  // State A: Empty — neither URL set
  if (!hasSheet && !hasSaturation) {
    return (
      <div style={{ animation: "fadeUp 0.3s ease" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>Budget</div>
        <div style={{ display: "flex", gap: 16 }}>
          <div
            onClick={() => {
              const url = prompt("Paste a Google Sheets URL:");
              if (url && url.trim()) updateProject("googleSheetUrl", url.trim());
            }}
            style={{ flex: 1, padding: "36px 24px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 12, textAlign: "center", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#34a85380"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(52,168,83,0.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--borderSub)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Google Sheets</div>
            <div style={{ fontSize: 12, color: "var(--textFaint)" }}>Embed a live, editable spreadsheet</div>
          </div>
          <div
            onClick={() => {
              const url = prompt("Paste a Saturation project URL:", `https://app.saturation.io/weareadptv/${(project.code || "").toLowerCase().replace(/\s+/g, "-")}/budget`);
              if (url && url.trim()) updateProject("saturationUrl", url.trim());
            }}
            style={{ flex: 1, padding: "36px 24px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 12, textAlign: "center", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#7c5cfc60"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(124,92,252,0.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--borderSub)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>💰</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Saturation</div>
            <div style={{ fontSize: 12, color: "var(--textFaint)" }}>Link to your Saturation budget</div>
          </div>
        </div>
      </div>
    );
  }

  // State B: Google Sheet linked
  if (hasSheet) {
    const sheetEmbedUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit?usp=sharing&rm=minimal&embedded=true`;
    return (
      <div style={{ animation: "fadeUp 0.3s ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Google Sheets Budget</span>
            <a href={sheetUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#34a853", textDecoration: "none", fontWeight: 600 }}>Open in Sheets ↗</a>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => {
              const url = prompt("Google Sheets URL:", sheetUrl);
              if (url !== null) updateProject("googleSheetUrl", url.trim());
            }} style={{ padding: "5px 12px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--textMuted)", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>
              Edit URL
            </button>
            <button onClick={() => {
              const url = prompt("Paste a Saturation project URL:", `https://app.saturation.io/weareadptv/${(project.code || "").toLowerCase().replace(/\s+/g, "-")}/budget`);
              if (url && url.trim()) {
                updateProject("googleSheetUrl", "");
                updateProject("saturationUrl", url.trim());
              }
            }} style={{ padding: "5px 12px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--textMuted)", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>
              Switch to Saturation
            </button>
          </div>
        </div>
        <iframe
          src={sheetEmbedUrl}
          style={{ width: "100%", height: "calc(100vh - 220px)", border: "none", borderRadius: 12, background: "#fff" }}
          allow="clipboard-read; clipboard-write"
          title="Google Sheets Budget"
        />
        <div style={{ marginTop: 10, fontSize: 11, color: "var(--textFaint)", fontStyle: "italic" }}>
          Editing live — changes save directly to Google Sheets
        </div>
      </div>
    );
  }

  // State C: Saturation linked
  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Saturation Budget</span>
          {embedUrl && <a href={embedUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#ff6b4a", textDecoration: "none", fontWeight: 600 }}>Open in Saturation ↗</a>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => {
            const url = prompt("Saturation project URL:", satUrl || `https://app.saturation.io/weareadptv/${(project.code || "").toLowerCase().replace(/\s+/g, "-")}/budget`);
            if (url !== null) updateProject("saturationUrl", url.trim());
          }} style={{ padding: "5px 12px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--textMuted)", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>
            Edit URL
          </button>
          <button onClick={() => {
            const url = prompt("Paste a Google Sheets URL:");
            if (url && url.trim()) {
              updateProject("saturationUrl", "");
              updateProject("googleSheetUrl", url.trim());
            }
          }} style={{ padding: "5px 12px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--textMuted)", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>
            Switch to Google Sheets
          </button>
        </div>
      </div>
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
  );
});

export { OverviewTab, BudgetTab };
