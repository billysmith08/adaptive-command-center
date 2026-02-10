'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('login'); // 'login' or 'reset'
  const [resetSent, setResetSent] = useState(false);

  const supabase = createClient();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = '/dashboard';
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard`,
    });

    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b0b0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <div style={{
        width: 380,
        padding: 40,
        background: '#111118',
        borderRadius: 16,
        border: '1px solid #1e1e28',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Logo / Title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#ff6b4a', letterSpacing: -0.5 }}>
            ▲ COMMAND CENTER
          </div>
          <div style={{ fontSize: 11, color: '#6a6a7a', marginTop: 6, letterSpacing: 1, fontWeight: 600 }}>
            ADAPTIVE BY DESIGN
          </div>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#6a6a7a', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@adaptivebydesign.com"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#0a0a10',
                  border: '1px solid #1e1e28',
                  borderRadius: 8,
                  color: '#e0e0e8',
                  fontSize: 14,
                  fontFamily: "'Inter', sans-serif",
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#ff6b4a40'}
                onBlur={e => e.target.style.borderColor = '#1e1e28'}
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#6a6a7a', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#0a0a10',
                  border: '1px solid #1e1e28',
                  borderRadius: 8,
                  color: '#e0e0e8',
                  fontSize: 14,
                  fontFamily: "'Inter', sans-serif",
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#ff6b4a40'}
                onBlur={e => e.target.style.borderColor = '#1e1e28'}
              />
            </div>

            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <span
                onClick={() => { setMode('reset'); setError(''); }}
                style={{ fontSize: 11, color: '#ff6b4a80', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = '#ff6b4a'}
                onMouseLeave={e => e.target.style.color = '#ff6b4a80'}
              >
                Forgot password?
              </span>
            </div>

            {error && (
              <div style={{ padding: '8px 12px', background: '#e8545412', border: '1px solid #e8545430', borderRadius: 6, color: '#e85454', fontSize: 12, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 0',
                background: loading ? '#ff6b4a60' : '#ff6b4a',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 0.5,
                cursor: loading ? 'wait' : 'pointer',
                fontFamily: "'Inter', sans-serif",
                transition: 'background 0.2s',
              }}
            >
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset}>
            {resetSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📧</div>
                <div style={{ color: '#4ecb71', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Check your email</div>
                <div style={{ color: '#6a6a7a', fontSize: 12 }}>We sent a password reset link to {email}</div>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setResetSent(false); }}
                  style={{ marginTop: 20, padding: '8px 20px', background: 'transparent', border: '1px solid #1e1e28', borderRadius: 6, color: '#e0e0e8', cursor: 'pointer', fontSize: 12, fontFamily: "'Inter', sans-serif" }}
                >
                  Back to login
                </button>
              </div>
            ) : (
              <>
                <div style={{ color: '#6a6a7a', fontSize: 12, marginBottom: 16 }}>
                  Enter your email and we'll send you a reset link.
                </div>
                <div style={{ marginBottom: 16 }}>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@adaptivebydesign.com"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#0a0a10',
                      border: '1px solid #1e1e28',
                      borderRadius: 8,
                      color: '#e0e0e8',
                      fontSize: 14,
                      fontFamily: "'Inter', sans-serif",
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {error && (
                  <div style={{ padding: '8px 12px', background: '#e8545412', border: '1px solid #e8545430', borderRadius: 6, color: '#e85454', fontSize: 12, marginBottom: 16 }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px 0', background: '#ff6b4a', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif", marginBottom: 12 }}>
                  {loading ? 'SENDING...' : 'SEND RESET LINK'}
                </button>
                <button type="button" onClick={() => { setMode('login'); setError(''); }} style={{ width: '100%', padding: '10px 0', background: 'transparent', border: '1px solid #1e1e28', borderRadius: 8, color: '#6a6a7a', fontSize: 12, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                  Back to login
                </button>
              </>
            )}
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 10, color: '#3a3a4a' }}>
          © 2026 Adaptive by Design
        </div>
      </div>
    </div>
  );
}
