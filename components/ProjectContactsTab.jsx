"use client";
import React, { useState } from "react";

export default function ProjectContactsTab({
  project, projects, contacts, setContacts, vendors, setVendors, clients,
  appSettings, copyToClipboard,
  setContactSearch, setClipboardToast,
  ContactListBlock, AddToProjectDropdown, PhoneWithCode,
  onUpdatePeople, onViewContact, onSaveToGlobal, onUpdateGlobalContact,
  projectVendors,
}) {
  return (
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
  );
}
