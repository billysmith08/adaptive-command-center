import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: settingsData } = await supabase.from('app_settings').select('settings').limit(1).single();
    const { data: stateData } = await supabase.from('shared_state').select('state').eq('id', 'shared').single();

    const settings = settingsData?.settings || {};
    const state = stateData?.state || {};
    const notifications = settings.notifications || {};
    const userProfiles = settings.userProfiles || {};
    const digest = notifications.digest || {};
    const frequency = notifications.frequency || 'daily';

    if (!notifications.emailEnabled) {
      return Response.json({ message: 'Notifications disabled', sent: 0 });
    }

    // Weekly only sends on Mondays
    const today = new Date();
    if (frequency === 'weekly' && today.getDay() !== 1) {
      return Response.json({ message: 'Weekly mode — not Monday', sent: 0 });
    }

    // Instant mode doesn't use the cron (only @mentions)
    if (frequency === 'instant') {
      return Response.json({ message: 'Instant mode — cron skipped', sent: 0 });
    }

    today.setHours(0, 0, 0, 0);
    const projects = state.projects || [];
    const projectWorkback = state.projectWorkback || {};
    const lookbackDays = frequency === 'weekly' ? 7 : 1;
    const lookbackDate = new Date(today);
    lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

    const sections = [];

    // ── OVERDUE ITEMS ──
    if (digest.digestOverdue) {
      const items = [];
      Object.entries(projectWorkback).forEach(([pid, wbItems]) => {
        if (!Array.isArray(wbItems)) return;
        const project = projects.find(p => p.id === pid);
        wbItems.forEach(wb => {
          if (!wb.task || !wb.date || wb.status === 'Done') return;
          const dueDate = new Date(wb.date + 'T23:59:59');
          const daysOverdue = Math.ceil((today - dueDate) / 86400000);
          if (daysOverdue > 0) {
            items.push({ project: project?.name || '?', task: wb.task, days: daysOverdue, owner: wb.owner || '—' });
          }
        });
      });
      if (items.length > 0) {
        sections.push({
          title: `🔴 Overdue (${items.length})`,
          color: '#e85454',
          rows: items.sort((a, b) => b.days - a.days).slice(0, 15).map(i =>
            `<tr><td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f0ede5;">${i.project}</td><td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f0ede5;">${i.task}</td><td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f0ede5;color:#e85454;font-weight:700;">${i.days}d overdue</td><td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f0ede5;">${i.owner}</td></tr>`
          ),
          headers: ['Project', 'Task', 'Status', 'Owner'],
        });
      }
    }

    // ── DUE SOON ──
    if (digest.digestDueSoon) {
      const items = [];
      Object.entries(projectWorkback).forEach(([pid, wbItems]) => {
        if (!Array.isArray(wbItems)) return;
        const project = projects.find(p => p.id === pid);
        wbItems.forEach(wb => {
          if (!wb.task || !wb.date || wb.status === 'Done') return;
          const dueDate = new Date(wb.date + 'T23:59:59');
          const daysUntil = Math.ceil((dueDate - today) / 86400000);
          if (daysUntil >= 0 && daysUntil <= 2) {
            items.push({ project: project?.name || '?', task: wb.task, due: daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`, owner: wb.owner || '—' });
          }
        });
      });
      if (items.length > 0) {
        sections.push({
          title: `⏰ Due Soon (${items.length})`,
          color: '#f5a623',
          rows: items.map(i =>
            `<tr><td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f0ede5;">${i.project}</td><td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f0ede5;">${i.task}</td><td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f0ede5;color:#f5a623;font-weight:700;">${i.due}</td><td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f0ede5;">${i.owner}</td></tr>`
          ),
          headers: ['Project', 'Task', 'Due', 'Owner'],
        });
      }
    }

    // ── TODOIST SNAPSHOT ──
    if (digest.digestTodoist && (settings.todoistApiKey || state.todoistKey)) {
      try {
        const todoKey = settings.todoistApiKey || state.todoistKey;
        const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
          headers: { 'Authorization': `Bearer ${todoKey}` },
        });
        if (res.ok) {
          const tasks = await res.json();
          const openTasks = tasks.filter(t => !t.is_completed).slice(0, 10);
          if (openTasks.length > 0) {
            sections.push({
              title: `✅ Todoist (${openTasks.length} open)`,
              color: '#4ecb71',
              rows: openTasks.map(t =>
                `<tr><td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f0ede5;">${t.content}</td><td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f0ede5;color:${t.priority >= 3 ? '#e85454' : 'var(--textFaint)'};">${t.due?.date || '—'}</td><td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f0ede5;">P${t.priority}</td></tr>`
              ),
              headers: ['Task', 'Due', 'Priority'],
            });
          }
        }
      } catch (e) { console.error('Todoist fetch failed:', e); }
    }

    // ── VENDOR COMPLIANCE ──
    if (digest.digestCompliance) {
      const items = [];
      const vendors = state.vendors || [];
      vendors.forEach(v => {
        const missing = [];
        if (v.compliance) {
          if (!v.compliance.w9?.done) missing.push('W9');
          if (!v.compliance.coi?.done) missing.push('COI');
        }
        if (missing.length > 0) items.push({ name: v.name, missing: missing.join(', ') });
      });
      if (items.length > 0) {
        sections.push({
          title: `📄 Vendor Compliance (${items.length} gaps)`,
          color: '#9b6dff',
          rows: items.map(i =>
            `<tr><td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f0ede5;">${i.name}</td><td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f0ede5;color:#9b6dff;font-weight:600;">Missing: ${i.missing}</td></tr>`
          ),
          headers: ['Vendor', 'Status'],
        });
      }
    }

    // ── PROJECT STATUS CHANGES ──
    if (digest.digestStatusChanges) {
      const activityLog = state.activityLog || [];
      const recentChanges = activityLog.filter(a => {
        if (!a.timestamp) return false;
        const ts = new Date(a.timestamp);
        return ts >= lookbackDate && a.action?.includes('status');
      }).slice(0, 10);
      if (recentChanges.length > 0) {
        sections.push({
          title: `📊 Status Changes (${recentChanges.length})`,
          color: '#3da5db',
          rows: recentChanges.map(a =>
            `<tr><td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f0ede5;">${a.project || '—'}</td><td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f0ede5;">${a.detail || a.action || '—'}</td><td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f0ede5;">${a.user || '—'}</td></tr>`
          ),
          headers: ['Project', 'Change', 'By'],
        });
      }
    }

    // ── UNREAD @MENTIONS ──
    if (digest.digestMentions) {
      const projectComments = state.projectComments || {};
      const mentionItems = [];
      Object.entries(projectComments).forEach(([pid, cmts]) => {
        if (!Array.isArray(cmts)) return;
        const project = projects.find(p => p.id === pid);
        cmts.forEach(c => {
          if (!c.mentions || c.mentions.length === 0) return;
          const ts = new Date(c.timestamp);
          if (ts >= lookbackDate) {
            mentionItems.push({ project: project?.name || '?', from: c.author, text: c.text.substring(0, 80), time: ts.toLocaleString() });
          }
        });
      });
      if (mentionItems.length > 0) {
        sections.push({
          title: `💬 @Mentions (${mentionItems.length})`,
          color: '#ff6b4a',
          rows: mentionItems.map(i =>
            `<tr><td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f0ede5;">${i.project}</td><td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f0ede5;font-weight:600;">${i.from}</td><td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f0ede5;">${i.text}${i.text.length >= 80 ? '...' : ''}</td></tr>`
          ),
          headers: ['Project', 'From', 'Message'],
        });
      }
    }

    if (sections.length === 0) {
      return Response.json({ success: true, message: 'Nothing to report', emailsSent: 0 });
    }

    // Build HTML email
    const periodLabel = frequency === 'weekly' ? 'Weekly Summary' : 'Daily Digest';
    const dateLabel = frequency === 'weekly'
      ? `${lookbackDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const sectionsHtml = sections.map(s => `
      <div style="margin-bottom: 20px;">
        <h2 style="color: ${s.color}; font-size: 14px; margin: 0 0 8px; padding-bottom: 6px; border-bottom: 2px solid ${s.color}20;">${s.title}</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead><tr>${s.headers.map(h => `<th style="padding:6px 8px;font-size:10px;text-align:left;color:#999;font-weight:600;letter-spacing:0.5px;border-bottom:1px solid #e0ddd5;">${h}</th>`).join('')}</tr></thead>
          <tbody>${s.rows.join('')}</tbody>
        </table>
      </div>
    `).join('');

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">
        <div style="background: #1a1a1a; color: #fff; padding: 20px; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 18px;">📋 Command Center ${periodLabel}</h1>
          <p style="margin: 4px 0 0; font-size: 12px; color: #aaa;">${dateLabel}</p>
        </div>
        <div style="background: #f9f7f2; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e0ddd5;">
          ${sectionsHtml}
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://adaptive-command-center.vercel.app'}/dashboard" style="display: inline-block; padding: 10px 24px; background: #ff6b4a; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 12px;">Open Command Center</a>
          </div>
          <p style="font-size: 10px; color: #999; margin-top: 16px; text-align: center;">Manage notification preferences in Settings</p>
        </div>
      </div>
    `;

    let emailsSent = 0;
    const recipients = Object.keys(userProfiles).filter(Boolean);

    for (const email of recipients) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: process.env.NOTIFICATION_FROM_EMAIL || 'Command Center <noreply@weareadptv.com>',
            to: email,
            subject: `📋 Command Center ${periodLabel} — ${sections.map(s => s.title.split('(')[0].trim()).join(' · ')}`,
            html: htmlBody,
          }),
        });
        if (res.ok) emailsSent++;
      } catch (err) {
        console.error('Email send failed:', email, err);
      }
    }

    return Response.json({ success: true, sections: sections.length, emailsSent, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Notification cron error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
