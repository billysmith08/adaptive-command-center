"use client";
import React from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// TodoistGlobal — Todoist overview (no project selected)
// ═══════════════════════════════════════════════════════════════════════════════

const TodoistGlobal = React.memo(function TodoistGlobal({
  todoistKey, setTodoistKey,
  todoistFetch,
  todoistNewTask, setTodoistNewTask,
  todoistAdd,
  todoistFilter, setTodoistFilter,
  todoistProjects, setTodoistProjects,
  todoistTasks, setTodoistTasks,
  todoistLoading,
  todoistClose,
  todoistDelete,
}) {
  return (
              <div style={{ animation: "fadeUp 0.3s ease", maxWidth: 900 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>TASK MANAGEMENT</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Instrument Sans'" }}>Todoist</div>
                  </div>
                  {todoistKey && <button onClick={() => todoistFetch()} style={{ padding: "7px 16px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 7, color: "#ff6b4a", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>↻ Refresh</button>}
                </div>

                {!todoistKey ? (
                  <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 12, padding: 32, textAlign: "center" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Connect Todoist</div>
                    <div style={{ fontSize: 13, color: "var(--textFaint)", marginBottom: 20, lineHeight: 1.6 }}>Enter your Todoist API token to sync tasks.<br />Find it at <span style={{ color: "#ff6b4a" }}>Todoist → Settings → Integrations → Developer</span></div>
                    <div style={{ display: "flex", gap: 8, maxWidth: 480, margin: "0 auto" }}>
                      <input placeholder="Paste your API token..." value={todoistKey} onChange={e => setTodoistKey(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && todoistKey) todoistFetch(todoistKey); }} style={{ flex: 1, padding: "10px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none", fontFamily: "'JetBrains Mono', monospace" }} />
                      <button onClick={() => todoistFetch(todoistKey)} disabled={!todoistKey} style={{ padding: "10px 20px", background: todoistKey ? "#ff6b4a" : "var(--bgInput)", border: "none", borderRadius: 8, color: todoistKey ? "#fff" : "var(--textGhost)", cursor: todoistKey ? "pointer" : "default", fontSize: 13, fontWeight: 700 }}>Connect</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Add task */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                      <input placeholder="Add a task..." value={todoistNewTask} onChange={e => setTodoistNewTask(e.target.value)} onKeyDown={e => { if (e.key === "Enter") todoistAdd(); }} style={{ flex: 1, padding: "10px 14px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none", fontFamily: "'DM Sans'" }} />
                      <button onClick={todoistAdd} disabled={!todoistNewTask.trim()} style={{ padding: "10px 20px", background: todoistNewTask.trim() ? "#ff6b4a" : "var(--bgInput)", border: "none", borderRadius: 8, color: todoistNewTask.trim() ? "#fff" : "var(--textGhost)", cursor: todoistNewTask.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 700 }}>+ Add</button>
                    </div>

                    {/* Filter bar */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                      {[{ id: "all", label: "All" }, { id: "today", label: "Today" }, { id: "overdue", label: "Overdue" }].map(f => (
                        <button key={f.id} onClick={() => setTodoistFilter(f.id)} style={{ padding: "5px 12px", background: todoistFilter === f.id ? "#ff6b4a15" : "var(--bgInput)", border: `1px solid ${todoistFilter === f.id ? "#ff6b4a30" : "var(--borderSub)"}`, borderRadius: 6, color: todoistFilter === f.id ? "#ff6b4a" : "var(--textMuted)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>{f.label}</button>
                      ))}
                      <div style={{ width: 1, background: "var(--border)", margin: "0 4px" }} />
                      {todoistProjects.filter(p => !p.inbox_project).map(p => (
                        <button key={p.id} onClick={() => setTodoistFilter(p.id)} style={{ padding: "5px 12px", background: todoistFilter === p.id ? `${p.color === "charcoal" ? "#808080" : p.color || "#808080"}20` : "var(--bgInput)", border: `1px solid ${todoistFilter === p.id ? (p.color === "charcoal" ? "#808080" : p.color || "#808080") + "40" : "var(--borderSub)"}`, borderRadius: 6, color: todoistFilter === p.id ? "#ff6b4a" : "var(--textMuted)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>{p.name}</button>
                      ))}
                    </div>

                    {/* Task list */}
                    {todoistLoading ? (
                      <div style={{ textAlign: "center", padding: 40, color: "var(--textFaint)" }}>Loading tasks...</div>
                    ) : (
                      <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 10, overflow: "hidden" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 120px 100px 50px", padding: "8px 12px", borderBottom: "1px solid var(--borderSub)", fontSize: 8, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1 }}><span></span><span>TASK</span><span>PROJECT</span><span>DUE</span><span></span></div>
                        {(() => {
                          const today = new Date().toISOString().split("T")[0];
                          let filtered = todoistTasks;
                          if (todoistFilter === "today") filtered = filtered.filter(t => t.due && t.due.date === today);
                          else if (todoistFilter === "overdue") filtered = filtered.filter(t => t.due && t.due.date < today);
                          else if (todoistFilter !== "all") filtered = filtered.filter(t => t.project_id === todoistFilter);
                          return filtered.length === 0 ? (
                            <div style={{ padding: 32, textAlign: "center", color: "var(--textGhost)" }}>
                              {todoistTasks.length === 0 ? "No tasks found. Add one above!" : "No tasks match this filter."}
                            </div>
                          ) : filtered.sort((a, b) => (a.order || 0) - (b.order || 0)).map(task => {
                            const proj = todoistProjects.find(p => p.id === task.project_id);
                            const isOverdue = task.due && task.due.date < today;
                            const isToday = task.due && task.due.date === today;
                            const priColors = { 1: "var(--textMuted)", 2: "#3da5db", 3: "#dba94e", 4: "#ff6b4a" };
                            return (
                              <div key={task.id} style={{ display: "grid", gridTemplateColumns: "32px 1fr 120px 100px 50px", padding: "8px 12px", borderBottom: "1px solid var(--calLine)", alignItems: "center" }}>
                                <div onClick={() => todoistClose(task.id)} style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${priColors[task.priority] || "var(--textGhost)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#4ecb7140"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                  <span style={{ fontSize: 10, opacity: 0.4 }}>✓</span>
                                </div>
                                <div>
                                  <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{task.content}</div>
                                  {task.description && <div style={{ fontSize: 11, color: "var(--textMuted)", marginTop: 2 }}>{task.description.slice(0, 80)}</div>}
                                </div>
                                <div style={{ fontSize: 10, color: "var(--textFaint)" }}>{proj ? proj.name : "Inbox"}</div>
                                <div style={{ fontSize: 10, color: isOverdue ? "#ff4a6b" : isToday ? "#ff6b4a" : "var(--textMuted)", fontWeight: isOverdue || isToday ? 600 : 400 }}>
                                  {task.due ? (isToday ? "Today" : task.due.string || task.due.date) : ""}
                                </div>
                                <button onClick={() => todoistDelete(task.id)} style={{ background: "none", border: "none", color: "var(--textGhost)", cursor: "pointer", fontSize: 13 }} title="Delete">×</button>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}

                    {/* Summary */}
                    <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                      <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, padding: "10px 16px", flex: 1 }}>
                        <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>TOTAL TASKS</div>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{todoistTasks.length}</div>
                      </div>
                      <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, padding: "10px 16px", flex: 1 }}>
                        <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>DUE TODAY</div>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#ff6b4a" }}>{todoistTasks.filter(t => t.due && t.due.date === new Date().toISOString().split("T")[0]).length}</div>
                      </div>
                      <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, padding: "10px 16px", flex: 1 }}>
                        <div style={{ fontSize: 9, color: "#ff4a6b", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>OVERDUE</div>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#ff4a6b" }}>{todoistTasks.filter(t => t.due && t.due.date < new Date().toISOString().split("T")[0]).length}</div>
                      </div>
                      <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, padding: "10px 16px", flex: 1 }}>
                        <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>PROJECTS</div>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{todoistProjects.length}</div>
                      </div>
                    </div>

                    {/* Disconnect */}
                    <div style={{ marginTop: 16, textAlign: "right" }}>
                      <button onClick={() => { setTodoistKey(""); setTodoistTasks([]); setTodoistProjects([]); }} style={{ padding: "5px 12px", background: "none", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--textGhost)", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>Disconnect Todoist</button>
                    </div>
                  </div>
                )}
              </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// TodoistPerProject — Todoist scoped to a specific project
// ═══════════════════════════════════════════════════════════════════════════════

const TodoistPerProject = React.memo(function TodoistPerProject({
  project,
  generateProjectCode,
  todoistKey,
  todoistProjects,
  todoistTasks,
  todoistFetch,
  todoistFetchProjectDetails,
  todoistCreateProject,
  updateProject,
  setClipboardToast,
  todoistNewTask, setTodoistNewTask,
  todoistAddTaskToProject,
  todoistLoading,
  todoistSections,
  todoistCollaborators,
  todoistComments,
  todoistEditingTask, setTodoistEditingTask,
  todoistNewComment, setTodoistNewComment,
  todoistClose,
  todoistDelete,
  todoistUpdateTask,
  todoistMoveTask,
  todoistAddComment,
  adptvWorkspaceId,
}) {
  const projCode = project.code || generateProjectCode(project);
  const linkedTodoistId = project.todoistProjectId;
  const linkedProject = linkedTodoistId ? todoistProjects.find(p => p.id === linkedTodoistId) : null;
  const projectTasks = linkedTodoistId ? todoistTasks.filter(t => t.project_id === linkedTodoistId) : [];
  const today = new Date().toISOString().split("T")[0];
  return (
                <div style={{ animation: "fadeUp 0.3s ease", maxWidth: 900 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>TASK MANAGEMENT</div>
                      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Instrument Sans'" }}>Todoist — {project.name}</div>
                    </div>
                    {linkedProject && <button onClick={async () => { await todoistFetch(); if (linkedTodoistId) await todoistFetchProjectDetails(linkedTodoistId); }} style={{ padding: "7px 16px", background: "#ff6b4a15", border: "1px solid #ff6b4a30", borderRadius: 7, color: "#ff6b4a", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>↻ Refresh</button>}
                  </div>

                  {!todoistKey ? (
                    <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 12, padding: 40, textAlign: "center" }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Connect Todoist First</div>
                      <div style={{ fontSize: 13, color: "var(--textFaint)", marginBottom: 20 }}>Your Todoist API key is configured in Settings.</div>
                    </div>
                  ) : !linkedProject ? (
                    <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 12, padding: 50, textAlign: "center" }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, fontFamily: "'Instrument Sans'" }}>No Todoist project linked</div>
                      <div style={{ fontSize: 13, color: "var(--textFaint)", marginBottom: 8, lineHeight: 1.6 }}>Create a Todoist project for this event to manage tasks.</div>
                      <div style={{ fontSize: 12, color: "var(--textMuted)", marginBottom: 24 }}>Project will be named: <span style={{ fontWeight: 700, color: "#ff6b4a", fontFamily: "'JetBrains Mono', monospace" }}>{projCode}</span></div>
                      <button onClick={async (e) => {
                        const btn = e.currentTarget;
                        btn.disabled = true;
                        btn.textContent = "⏳ Creating...";
                        console.log("Creating Todoist project:", projCode, "workspace:", adptvWorkspaceId);
                        const newId = await todoistCreateProject(projCode);
                        console.log("todoistCreateProject returned:", newId);
                        if (newId) {
                          updateProject("todoistProjectId", newId);
                          await todoistFetchProjectDetails(newId);
                          setClipboardToast({ text: `Created Todoist project: ${projCode}`, x: window.innerWidth / 2, y: 60 });
                          setTimeout(() => setClipboardToast(null), 3000);
                        } else {
                          btn.disabled = false;
                          btn.textContent = "🚀 Start Todoist Project";
                          if (!document.querySelector("[data-toast]")) {
                            setClipboardToast({ text: "Failed to create project — check console for details", x: window.innerWidth / 2, y: 60 });
                            setTimeout(() => setClipboardToast(null), 4000);
                          }
                        }
                      }} style={{ padding: "14px 32px", background: "#ff6b4a", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 14px rgba(255,107,74,0.3)", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>
                        🚀 Start Todoist Project
                      </button>
                      {todoistProjects.filter(p => !p.inbox_project).length > 0 && (
                        <div style={{ marginTop: 24, borderTop: "1px solid var(--borderSub)", paddingTop: 16 }}>
                          <div style={{ fontSize: 10, color: "var(--textFaint)", marginBottom: 8 }}>Or link to an existing Todoist project:</div>
                          <select onChange={e => { if (e.target.value) { updateProject("todoistProjectId", e.target.value); setClipboardToast({ text: "Linked to Todoist project", x: window.innerWidth / 2, y: 60 }); setTimeout(() => setClipboardToast(null), 3000); } }} style={{ padding: "8px 14px", background: "var(--bgInput)", border: "1px solid var(--borderSub)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none", minWidth: 240 }}>
                            <option value="">Select existing project...</option>
                            {todoistProjects.filter(p => !p.inbox_project).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {/* Project info bar */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "10px 16px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8 }}>
                        <span style={{ fontSize: 14 }}>✅</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{linkedProject.name}</span>
                        <span style={{ fontSize: 10, color: "var(--textFaint)" }}>{projectTasks.length} task{projectTasks.length !== 1 ? "s" : ""}</span>
                        <div style={{ flex: 1 }} />
                        <button onClick={() => { updateProject("todoistProjectId", null); }} style={{ padding: "4px 10px", background: "transparent", border: "1px solid var(--borderSub)", borderRadius: 5, color: "var(--textFaint)", cursor: "pointer", fontSize: 9, fontWeight: 600 }}>Unlink</button>
                      </div>

                      {/* Add task */}
                      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                        <input placeholder={`Add task to ${linkedProject.name}...`} value={todoistNewTask} onChange={e => setTodoistNewTask(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && todoistNewTask.trim()) { todoistAddTaskToProject(todoistNewTask.trim(), linkedTodoistId); setTodoistNewTask(""); } }} style={{ flex: 1, padding: "10px 14px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none" }} />
                        <button onClick={() => { if (todoistNewTask.trim()) { todoistAddTaskToProject(todoistNewTask.trim(), linkedTodoistId); setTodoistNewTask(""); } }} disabled={!todoistNewTask.trim()} style={{ padding: "10px 20px", background: todoistNewTask.trim() ? "#ff6b4a" : "var(--bgInput)", border: "none", borderRadius: 8, color: todoistNewTask.trim() ? "#fff" : "var(--textGhost)", cursor: todoistNewTask.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 700 }}>+ Add</button>
                      </div>

                      {/* Summary stats - top */}
                      {projectTasks.length > 0 && (
                        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                          <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, padding: "10px 16px", flex: 1, textAlign: "center" }}>
                            <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>TASKS</div>
                            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{projectTasks.length}</div>
                          </div>
                          <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, padding: "10px 16px", flex: 1, textAlign: "center" }}>
                            <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>DUE TODAY</div>
                            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#ff6b4a" }}>{projectTasks.filter(t => t.due?.date === today).length}</div>
                          </div>
                          <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, padding: "10px 16px", flex: 1, textAlign: "center" }}>
                            <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>OVERDUE</div>
                            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: projectTasks.filter(t => t.due?.date && t.due.date < today).length > 0 ? "#ff4a6b" : "var(--text)" }}>{projectTasks.filter(t => t.due?.date && t.due.date < today).length}</div>
                          </div>
                          <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 8, padding: "10px 16px", flex: 1, textAlign: "center" }}>
                            <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>SECTIONS</div>
                            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{todoistSections.filter(s => s.project_id === linkedTodoistId).length}</div>
                          </div>
                        </div>
                      )}

                      {/* Task list */}
                      {todoistLoading ? (
                        <div style={{ textAlign: "center", padding: 40, color: "var(--textFaint)" }}>Loading tasks...</div>
                      ) : projectTasks.length === 0 ? (
                        <div style={{ textAlign: "center", padding: 40, background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 10, color: "var(--textGhost)" }}>
                          No tasks yet — add one above!
                        </div>
                      ) : (() => {
                        const projSections = todoistSections.filter(s => s.project_id === linkedTodoistId).sort((a, b) => (a.order || 0) - (b.order || 0));
                        const unsectioned = projectTasks.filter(t => !t.section_id).sort((a, b) => (a.order || 0) - (b.order || 0));
                        const priColors = { 1: "var(--textMuted)", 2: "#3da5db", 3: "#dba94e", 4: "#ff6b4a" };
                        const priLabels = { 1: "—", 2: "Low", 3: "Med", 4: "High" };
                        const renderTask = (task) => {
                          const isOverdue = task.due && task.due.date < today;
                          const isToday = task.due && task.due.date === today;
                          const assignee = task.assignee_id ? (() => { const c = todoistCollaborators.find(x => x.id === task.assignee_id); return c ? c.name?.split(" ")[0] : ""; })() : "";
                          const isEditing = todoistEditingTask === task.id;
                          const taskComments = todoistComments[task.id] || [];
                          return (
                            <div key={task.id}>
                              {/* Task row */}
                              <div style={{ display: "grid", gridTemplateColumns: "32px 1fr auto auto 100px 32px", padding: "10px 12px", borderBottom: isEditing ? "none" : "1px solid var(--calLine)", alignItems: "center", cursor: "pointer", background: isEditing ? "#ff6b4a08" : "transparent", transition: "background 0.15s" }}>
                                <div onClick={(e) => { e.stopPropagation(); todoistClose(task.id); }} style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${priColors[task.priority] || "var(--textGhost)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#4ecb7140"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                  <span style={{ fontSize: 10, opacity: 0.4 }}>✓</span>
                                </div>
                                <div onClick={() => setTodoistEditingTask(isEditing ? null : task.id)} style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{task.content}</div>
                                  {task.description && <div style={{ fontSize: 11, color: "var(--textMuted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.description}</div>}
                                </div>
                                {taskComments.length > 0 && <span style={{ fontSize: 9, color: "var(--textFaint)", padding: "2px 6px", background: "var(--bgInput)", borderRadius: 4, marginRight: 6 }}>{String.fromCharCode(128172)}{taskComments.length}</span>}
                                <div>{assignee && <span style={{ fontSize: 9, color: "var(--textFaint)", padding: "2px 6px", background: "var(--bgInput)", borderRadius: 4 }}>@{assignee}</span>}</div>
                                <div style={{ fontSize: 10, color: isOverdue ? "#ff4a6b" : isToday ? "#ff6b4a" : "var(--textMuted)", fontWeight: isOverdue || isToday ? 600 : 400, textAlign: "right" }}>
                                  {task.due ? (isToday ? "Today" : task.due.string || task.due.date) : ""}
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); todoistDelete(task.id); }} style={{ background: "none", border: "none", color: "var(--textGhost)", cursor: "pointer", fontSize: 13, padding: 4 }} title="Delete">×</button>
                              </div>

                              {/* Expanded edit panel */}
                              {isEditing && (
                                <div style={{ padding: "16px 20px", background: "#ff6b4a05", borderBottom: "1px solid var(--calLine)", animation: "fadeUp 0.15s ease" }}>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                                    {/* Due Date */}
                                    <div>
                                      <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>DUE DATE</div>
                                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                        <input type="date" defaultValue={task.due?.date || ""} onChange={(e) => {
                                          const val = e.target.value;
                                          if (val) todoistUpdateTask(task.id, { due: { date: val } });
                                          else todoistUpdateTask(task.id, { due: null });
                                        }} style={{ flex: 1, padding: "6px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--text)", fontSize: 12, outline: "none" }} />
                                        {task.due && <button onClick={() => todoistUpdateTask(task.id, { due: null })} style={{ padding: "4px 8px", background: "transparent", border: "1px solid var(--borderSub)", borderRadius: 4, color: "var(--textFaint)", cursor: "pointer", fontSize: 10 }}>Clear</button>}
                                      </div>
                                      {/* Quick date buttons */}
                                      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                                        {[
                                          { label: "Today", date: today },
                                          { label: "Tomorrow", date: new Date(Date.now() + 86400000).toISOString().split("T")[0] },
                                          { label: "+7d", date: new Date(Date.now() + 604800000).toISOString().split("T")[0] },
                                        ].map(q => (
                                          <button key={q.label} onClick={() => todoistUpdateTask(task.id, { due: { date: q.date } })} style={{ padding: "3px 8px", background: task.due?.date === q.date ? "#ff6b4a20" : "var(--bgCard)", border: `1px solid ${task.due?.date === q.date ? "#ff6b4a40" : "var(--borderSub)"}`, borderRadius: 4, color: task.due?.date === q.date ? "#ff6b4a" : "var(--textMuted)", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>{q.label}</button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Priority */}
                                    <div>
                                      <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>PRIORITY</div>
                                      <div style={{ display: "flex", gap: 4 }}>
                                        {[4, 3, 2, 1].map(p => (
                                          <button key={p} onClick={() => todoistUpdateTask(task.id, { priority: p })} style={{ flex: 1, padding: "6px 0", background: task.priority === p ? priColors[p] + "20" : "var(--bgCard)", border: `1px solid ${task.priority === p ? priColors[p] : "var(--borderSub)"}`, borderRadius: 6, color: task.priority === p ? priColors[p] : "var(--textMuted)", cursor: "pointer", fontSize: 11, fontWeight: 600, transition: "all 0.15s" }}>{priLabels[p]}</button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                                    {/* Assignee */}
                                    <div>
                                      <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>ASSIGNEE</div>
                                      <select value={task.assignee_id || ""} onChange={(e) => {
                                        const val = e.target.value;
                                        todoistUpdateTask(task.id, { responsible_uid: val ? val : null });
                                      }} style={{ width: "100%", padding: "6px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--text)", fontSize: 12, outline: "none" }}>
                                        <option value="">Unassigned</option>
                                        {todoistCollaborators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                      </select>
                                    </div>

                                    {/* Section */}
                                    <div>
                                      <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>SECTION</div>
                                      <select value={task.section_id || ""} onChange={(e) => {
                                        const val = e.target.value;
                                        todoistMoveTask(task.id, val || null);
                                      }} style={{ width: "100%", padding: "6px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--text)", fontSize: 12, outline: "none" }}>
                                        <option value="">No section</option>
                                        {projSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                      </select>
                                    </div>
                                  </div>

                                  {/* Description */}
                                  <div style={{ marginBottom: 14 }}>
                                    <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>DESCRIPTION</div>
                                    <textarea defaultValue={task.description || ""} placeholder="Add a description..." onBlur={(e) => {
                                      if (e.target.value !== (task.description || "")) todoistUpdateTask(task.id, { description: e.target.value });
                                    }} style={{ width: "100%", padding: "8px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--text)", fontSize: 12, outline: "none", resize: "vertical", minHeight: 40, fontFamily: "inherit" }} />
                                  </div>

                                  {/* Comments */}
                                  <div>
                                    <div style={{ fontSize: 9, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 6 }}>COMMENTS {taskComments.length > 0 && `(${taskComments.length})`}</div>
                                    {taskComments.length > 0 && (
                                      <div style={{ marginBottom: 8, maxHeight: 200, overflowY: "auto" }}>
                                        {taskComments.map(c => {
                                          const author = c.posted_uid ? todoistCollaborators.find(x => x.id === c.posted_uid) : null;
                                          return (
                                            <div key={c.id} style={{ padding: "8px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, marginBottom: 4, fontSize: 12 }}>
                                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--textFaint)" }}>{author?.name?.split(" ")[0] || "Unknown"}</span>
                                                <span style={{ fontSize: 9, color: "var(--textGhost)" }}>{c.posted_at ? new Date(c.posted_at).toLocaleDateString() : ""}</span>
                                              </div>
                                              <div style={{ color: "var(--text)", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{c.content}</div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                    <div style={{ display: "flex", gap: 6 }}>
                                      <input placeholder="Add a comment..." value={todoistEditingTask === task.id ? todoistNewComment : ""} onChange={(e) => setTodoistNewComment(e.target.value)} onKeyDown={(e) => {
                                        if (e.key === "Enter" && todoistNewComment.trim()) { todoistAddComment(task.id, todoistNewComment.trim()); setTodoistNewComment(""); }
                                      }} style={{ flex: 1, padding: "7px 10px", background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 6, color: "var(--text)", fontSize: 12, outline: "none" }} />
                                      <button onClick={() => { if (todoistNewComment.trim()) { todoistAddComment(task.id, todoistNewComment.trim()); setTodoistNewComment(""); } }} disabled={!todoistNewComment.trim()} style={{ padding: "7px 14px", background: todoistNewComment.trim() ? "#ff6b4a" : "var(--bgInput)", border: "none", borderRadius: 6, color: todoistNewComment.trim() ? "#fff" : "var(--textGhost)", cursor: todoistNewComment.trim() ? "pointer" : "default", fontSize: 11, fontWeight: 700 }}>Post</button>
                                    </div>
                                  </div>

                                  {/* Close edit panel */}
                                  <div style={{ textAlign: "right", marginTop: 10 }}>
                                    <button onClick={() => { setTodoistEditingTask(null); setTodoistNewComment(""); }} style={{ padding: "5px 14px", background: "transparent", border: "1px solid var(--borderSub)", borderRadius: 5, color: "var(--textFaint)", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>Done</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        };
                        return (
                          <div style={{ background: "var(--bgCard)", border: "1px solid var(--borderSub)", borderRadius: 10, overflow: "hidden" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "32px 1fr auto 100px 50px", padding: "8px 12px", borderBottom: "1px solid var(--borderSub)", fontSize: 8, color: "var(--textFaint)", fontWeight: 700, letterSpacing: 1 }}><span></span><span>TASK</span><span>ASSIGN</span><span>DUE</span><span></span></div>
                            {unsectioned.map(renderTask)}
                            {projSections.map(section => {
                              const sectionTasks = projectTasks.filter(t => t.section_id === section.id).sort((a, b) => (a.order || 0) - (b.order || 0));
                              if (sectionTasks.length === 0) return null;
                              return (
                                <React.Fragment key={section.id}>
                                  <div style={{ padding: "5px 12px", fontSize: 10, color: "var(--textFaint)", fontWeight: 600, letterSpacing: 0.3, borderBottom: "1px solid var(--calLine)", background: "var(--bgInput)" }}>
                                    {section.name} <span style={{ fontWeight: 400, opacity: 0.6 }}>· {sectionTasks.length}</span>
                                  </div>
                                  {sectionTasks.map(renderTask)}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
  );
});

export { TodoistGlobal, TodoistPerProject };
