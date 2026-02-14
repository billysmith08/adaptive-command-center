import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { to, toName, from, projectName, message, projectId } = await request.json();

    if (!to || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 20px;">
        <div style="background: #1a1a1a; color: #fff; padding: 16px 20px; border-radius: 12px 12px 0 0;">
          <div style="font-size: 14px; font-weight: 700;">💬 You were mentioned in ${projectName}</div>
        </div>
        <div style="background: #f9f7f2; padding: 20px; border-radius: 0 0 12px 12px; border: 1px solid #e0ddd5;">
          <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: #ff6b4a20; border: 1px solid #ff6b4a40; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #ff6b4a; font-size: 14px; flex-shrink: 0;">${(from || '?').charAt(0).toUpperCase()}</div>
            <div>
              <div style="font-weight: 700; font-size: 13px; color: #1a1a1a;">${from}</div>
              <div style="font-size: 14px; color: #333; margin-top: 4px; line-height: 1.5; white-space: pre-wrap;">${message.replace(/@([\w\s.'-]+)/g, '<span style="color: #ff6b4a; font-weight: 600;">@$1</span>')}</div>
            </div>
          </div>
          <div style="text-align: center; margin-top: 16px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://adaptive-command-center.vercel.app'}/dashboard" style="display: inline-block; padding: 10px 24px; background: #ff6b4a; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 12px;">Open in Command Center</a>
          </div>
          <p style="font-size: 10px; color: #999; margin-top: 16px; text-align: center;">You received this because someone tagged you in a project chat · Manage in Settings</p>
        </div>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.NOTIFICATION_FROM_EMAIL || 'Command Center <noreply@weareadptv.com>',
        to,
        subject: `💬 ${from} mentioned you in ${projectName}`,
        html: htmlBody,
      }),
    });

    if (res.ok) {
      return NextResponse.json({ success: true });
    } else {
      const err = await res.text();
      console.error('Resend error:', err);
      return NextResponse.json({ error: 'Email send failed' }, { status: 500 });
    }
  } catch (err) {
    console.error('Mention notify error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
