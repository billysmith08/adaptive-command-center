import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request) {
  // Verify cron secret (Vercel cron sends this)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Load app settings (notification prefs + projects data)
    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('settings')
      .limit(1)
      .single();

    const { data: stateData } = await supabase
      .from('dashboard_state')
      .select('state')
      .limit(1)
      .single();

    const settings = settingsData?.settings || {};
    const state = stateData?.state || {};
    const notifications = settings.notifications || {};
    const userProfiles = settings.userProfiles || {};

    if (!notifications.emailEnabled && !notifications.smsEnabled) {
      return Response.json({ message: 'Notifications disabled', sent: 0 });
    }

    const projects = state.projects || [];
    const projectWorkback = state.projectWorkback || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Collect alerts
    const alerts = [];

    // Check work back items
    Object.entries(projectWorkback).forEach(([pid, items]) => {
      if (!Array.isArray(items)) return;
      const project = projects.find(p => p.id === pid);
      items.forEach(wb => {
        if (!wb.task || !wb.date || wb.status === 'Done') return;
        const dueDate = new Date(wb.date + 'T23:59:59');
        const daysUntil = Math.ceil((dueDate - today) / 86400000);

        if (daysUntil < 0 && (notifications.email?.workbackOverdue || notifications.sms?.smsOverdue)) {
          alerts.push({
            type: 'overdue',
            severity: 'high',
            message: `OVERDUE: "${wb.task}" for ${project?.name || 'Unknown'} was due ${Math.abs(daysUntil)} day(s) ago`,
            project: project?.name,
            owner: wb.owner,
          });
        } else if (daysUntil >= 0 && daysUntil <= 2 && notifications.email?.workbackDue) {
          alerts.push({
            type: 'due_soon',
            severity: 'medium',
            message: `DUE ${daysUntil === 0 ? 'TODAY' : `in ${daysUntil}d`}: "${wb.task}" for ${project?.name || 'Unknown'}`,
            project: project?.name,
            owner: wb.owner,
          });
        }
      });
    });

    // Check vendor compliance (COI/W9 missing)
    if (notifications.email?.vendorCompliance || notifications.sms?.smsUrgent) {
      const vendors = state.vendors || [];
      vendors.forEach(v => {
        const missing = [];
        if (v.compliance) {
          if (!v.compliance.w9?.done) missing.push('W9');
          if (!v.compliance.coi?.done) missing.push('COI');
        }
        if (missing.length > 0) {
          alerts.push({
            type: 'compliance',
            severity: 'medium',
            message: `Vendor "${v.name}" missing: ${missing.join(', ')}`,
          });
        }
      });
    }

    let emailsSent = 0;
    let smsSent = 0;

    // Send email notifications
    if (notifications.emailEnabled && alerts.length > 0 && process.env.RESEND_API_KEY) {
      // Build digest email for each user with email notifications enabled
      const recipients = Object.entries(userProfiles)
        .filter(([email]) => email)
        .map(([email]) => email);

      if (recipients.length > 0) {
        const overdueAlerts = alerts.filter(a => a.type === 'overdue');
        const dueSoonAlerts = alerts.filter(a => a.type === 'due_soon');
        const complianceAlerts = alerts.filter(a => a.type === 'compliance');

        const htmlBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1a1a1a; color: #fff; padding: 20px; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; font-size: 20px;">📋 Command Center Daily Digest</h1>
              <p style="margin: 4px 0 0; font-size: 12px; color: #aaa;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div style="background: #f9f7f2; padding: 20px; border-radius: 0 0 12px 12px; border: 1px solid #e0ddd5;">
              ${overdueAlerts.length > 0 ? `
                <h2 style="color: #e85454; font-size: 14px; margin: 0 0 8px;">🔴 Overdue (${overdueAlerts.length})</h2>
                ${overdueAlerts.map(a => `<p style="font-size: 13px; margin: 4px 0; padding: 8px; background: #e854540a; border-left: 3px solid #e85454; border-radius: 4px;">${a.message}</p>`).join('')}
              ` : ''}
              ${dueSoonAlerts.length > 0 ? `
                <h2 style="color: #f5a623; font-size: 14px; margin: 16px 0 8px;">⚠️ Due Soon (${dueSoonAlerts.length})</h2>
                ${dueSoonAlerts.map(a => `<p style="font-size: 13px; margin: 4px 0; padding: 8px; background: #f5a6230a; border-left: 3px solid #f5a623; border-radius: 4px;">${a.message}</p>`).join('')}
              ` : ''}
              ${complianceAlerts.length > 0 ? `
                <h2 style="color: #9b6dff; font-size: 14px; margin: 16px 0 8px;">📄 Compliance (${complianceAlerts.length})</h2>
                ${complianceAlerts.map(a => `<p style="font-size: 13px; margin: 4px 0; padding: 8px; background: #9b6dff0a; border-left: 3px solid #9b6dff; border-radius: 4px;">${a.message}</p>`).join('')}
              ` : ''}
              <p style="font-size: 11px; color: #999; margin-top: 20px; text-align: center;">Sent from Command Center · Manage notifications in Settings</p>
            </div>
          </div>
        `;

        for (const email of recipients) {
          try {
            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: process.env.NOTIFICATION_FROM_EMAIL || 'Command Center <noreply@weareadptv.com>',
                to: email,
                subject: `📋 Command Center: ${overdueAlerts.length} overdue, ${dueSoonAlerts.length} due soon`,
                html: htmlBody,
              }),
            });
            if (res.ok) emailsSent++;
          } catch (err) {
            console.error('Email send failed:', email, err);
          }
        }
      }
    }

    // Send SMS for critical alerts
    if (notifications.smsEnabled && notifications.smsPhone && process.env.TWILIO_SID) {
      const urgentAlerts = alerts.filter(a => a.severity === 'high');
      if (urgentAlerts.length > 0) {
        const smsBody = `⚠️ Command Center: ${urgentAlerts.length} overdue item(s)\n${urgentAlerts.slice(0, 3).map(a => `• ${a.message}`).join('\n')}${urgentAlerts.length > 3 ? `\n... +${urgentAlerts.length - 3} more` : ''}`;
        
        try {
          const twilioAuth = Buffer.from(`${process.env.TWILIO_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
          const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_SID}/Messages.json`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${twilioAuth}`,
            },
            body: new URLSearchParams({
              From: process.env.TWILIO_PHONE,
              To: notifications.smsPhone,
              Body: smsBody,
            }),
          });
          if (res.ok) smsSent++;
        } catch (err) {
          console.error('SMS send failed:', err);
        }
      }
    }

    return Response.json({
      success: true,
      alerts: alerts.length,
      emailsSent,
      smsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Notification cron error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
