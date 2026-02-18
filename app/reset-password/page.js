'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase automatically picks up the recovery token from the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    // Also check if already in recovery session
    setTimeout(() => setReady(true), 1500);
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
      setTimeout(() => { window.location.href = '/dashboard'; }, 2000);
    }
    setLoading(false);
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', background: '#1a1a2e', border: '1px solid #2a2a4a',
    borderRadius: 10, color: '#e0e0f0', fontSize: 14, fontFamily: "'DM Sans', sans-serif",
    outline: 'none', boxSizing: 'border-box',
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ background: '#16162a', borderRadius: 20, padding: '48px 40px', maxWidth: 420, width: '90%', textAlign: 'center', border: '1px solid #2a2a4a' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#10003;</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0f0', marginBottom: 8 }}>Password Updated</h2>
          <p style={{ fontSize: 13, color: '#6a6a7a', lineHeight: 1.6 }}>Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: '#16162a', borderRadius: 20, padding: '48px 40px', maxWidth: 420, width: '90%', border: '1px solid #2a2a4a' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: '#6a6a7a', fontWeight: 600, letterSpacing: 2, marginBottom: 8 }}>ADPTV COMMAND CENTER</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e0e0f0', margin: 0 }}>Set New Password</h1>
          <p style={{ fontSize: 12, color: '#6a6a7a', marginTop: 8 }}>Enter your new password below.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6a6a7a', display: 'block', marginBottom: 6, letterSpacing: 0.5 }}>NEW PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                minLength={6}
                style={{ ...inputStyle, paddingRight: 40 }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6a6a7a', cursor: 'pointer', fontSize: 13 }}>
                {showPass ? '&#128584;' : '&#128065;'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6a6a7a', display: 'block', marginBottom: 6, letterSpacing: 0.5 }}>CONFIRM PASSWORD</label>
            <input
              type={showPass ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              minLength={6}
              style={inputStyle}
            />
            {confirmPassword && password !== confirmPassword && (
              <div style={{ fontSize: 10, color: '#ff6b4a', marginTop: 4 }}>Passwords do not match</div>
            )}
          </div>

          {error && <div style={{ fontSize: 12, color: '#ff6b4a', marginBottom: 12, textAlign: 'center' }}>{error}</div>}

          <button
            type="submit"
            disabled={loading || !password || password !== confirmPassword}
            style={{
              width: '100%', padding: '13px', background: (!password || password !== confirmPassword) ? '#2a2a4a' : '#ff6b4a',
              border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: (!password || password !== confirmPassword) ? 'default' : 'pointer',
              fontFamily: "'DM Sans', sans-serif", opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/login" style={{ fontSize: 11, color: '#6a6a7a', textDecoration: 'none' }}>Back to login</a>
        </div>
      </div>
    </div>
  );
}
