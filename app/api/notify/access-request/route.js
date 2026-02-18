import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, name } = await request.json();
    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });

    const adminEmail = 'billy@weareadptv.com';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://commandcenter.adaptivebydesign.com';

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 20px;">
        <div style="background: #1a1a1a; color: #fff; padding: 16px 20px; border-radius: 12px 12px 0 0;">
          <div style="font-size: 14px; font-weight: 700;">🔐 New Access Request</div>
        </div>
        <div style="background: #f9f7f2; padding: 20px; border-radius: 0 0 12px 12px; border: 1px solid #e0ddd5;">
          <div style="font-size: 14px; color: #333; line-height: 1.6; margin-bottom: 16px;">
            <strong style="color: #ff6b4a;">${name || email}</strong> is requesting access to the ADPTV Command Center.
          </div>
          <div style="padding: 12px 16px; background: #fff; border: 1px solid #e0ddd5; border-radius: 8px; margin-bottom: 16px;">
            <div style="font-size: 11px; color: #999; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px;">EMAIL</div>
            <div style="font-size: 14px; color: #1a1a1a; font-weight: 600;">${email}</div>
          </div>
          <div style="text-align: center;">
            <a href="${appUrl}/dashboard" style="display: inline-block; padding: 12px 28px; background: #ff6b4a; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13px;">Review in Settings → Users</a>
          </div>
          <p style="font-size: 10px; color: #999; margin-top: 16px; text-align: center;">ADPTV Command Center · Access Management</p>
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
        to: adminEmail,
        subject: `🔐 Access Request: ${name || email} wants to join Command Center`,
        html: htmlBody,
      }),
    });

    if (res.ok) {
      return NextResponse.json({ success: true });
    } else {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: 500 });
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
