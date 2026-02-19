'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function GoogleCallbackPage() {
  const [status, setStatus] = useState('Signing in with Google...');
  const supabase = createClient();

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const idToken = params.get('id_token');

    if (!idToken) {
      setStatus('No credential received. Redirecting...');
      setTimeout(() => { window.location.href = '/login?error=no_token'; }, 1500);
      return;
    }

    supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    }).then(({ error }) => {
      if (error) {
        setStatus('Sign-in failed. Redirecting...');
        setTimeout(() => { window.location.href = '/login?error=auth'; }, 1500);
      } else {
        setStatus('Success! Redirecting...');
        window.location.href = '/dashboard';
      }
    });
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0b0b0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#ff6b4a', fontSize: 14, fontFamily: "'Inter', sans-serif" }}>{status}</div>
    </div>
  );
}
